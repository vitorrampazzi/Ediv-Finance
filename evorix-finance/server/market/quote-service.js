import { companyLogoUrl } from "../../company-logo.mjs";
import {
  cacheTtlMs,
  publicMarket,
  saoPauloDate,
  tradingSessionDate,
} from "./market-session.js";
import { brapiPlans, demoSeries } from "./plans.js";
import { demoTickers, isValidTicker } from "./validation.js";

// Quote service behind /api/market. It owns caching, deduplication, the 429
// cooldown, retries, the per-ticker queue and the daily budget; the provider
// only fetches and normalizes. Every dependency is injected so unit tests run
// without MySQL, network or the real clock. Rules: docs/COTACOES.md and
// docs/MARGEM-E-HISTORICO.md (canonical quote, chart series).

const source = "brapi.dev";
const cooldownKey = "brapi:cooldown";
const catalogKey = "market:catalog";
const maxAttempts = 2;
const transientBackoffMs = 60_000;
const rejectedCatalogMs = 15 * 60_000;
const maxMemoryEntries = 3000;

export class QuoteServiceError extends Error {
  constructor(code, reason = null, status = null) {
    super(`Quote service ${code}`);
    this.name = "QuoteServiceError";
    // cooldown | budget | queue | recent_failure
    this.code = code;
    this.reason = reason;
    // HTTP status of the refusal behind a recent_failure, when there was one.
    this.status = status;
  }
}

const eightDecimals = /^\d+\.\d{8}$/;

// price − previous close, exact on the 8-decimal texts made by priceText().
export function priceDifference(price, previous) {
  if (
    typeof price !== "string" ||
    typeof previous !== "string" ||
    !eightDecimals.test(price) ||
    !eightDecimals.test(previous)
  )
    return null;
  const units =
    BigInt(price.replace(".", "")) - BigInt(previous.replace(".", ""));
  const negative = units < 0n;
  const digits = String(negative ? -units : units).padStart(9, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -8)}.${digits.slice(-8)}`;
}

export function unavailableQuote(
  symbol,
  { checkedAt = null, delayMinutes = null } = {},
) {
  return {
    symbol,
    name: symbol,
    logoUrl: companyLogoUrl(symbol),
    currency: "BRL",
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    dayHigh: null,
    dayLow: null,
    volume: null,
    quoteTime: null,
    marketTime: null,
    checkedAt,
    freshness: "unavailable",
    stale: false,
    unavailable: true,
    detail: "summary",
    delayMinutes,
    source,
  };
}

function isTransient(error) {
  return (
    error?.code === "network" || (error?.code === "http" && error.status >= 500)
  );
}

function validValue(kind, value) {
  if (kind === "catalog") return Array.isArray(value?.items);
  if (kind === "quote")
    return typeof value?.symbol === "string" && typeof value.price === "string";
  if (kind === "series")
    return (
      Array.isArray(value) && (value.length === 0 || Array.isArray(value[0]))
    );
  return Array.isArray(value);
}

// Why the brapi chart series is missing, in the contract's words.
function seriesFailure(error) {
  if (error?.code === "budget") return "budget";
  if (
    (error?.code === "http" || error?.code === "recent_failure") &&
    error.status === 404
  )
    return "not_covered";
  return "provider_error";
}

function defaultLog(entry) {
  console.info(JSON.stringify(entry));
}

export function createQuoteService({
  provider,
  store,
  hasToken = false,
  plan = "free",
  dailyBudget = 450,
  isCovered = () => false,
  now = Date.now,
  log = defaultLog,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
  retryDelayMs = 500,
  maxQueue = 25,
  maxQueueWaitMs = 15_000,
  // Called after every general-list read that has data (consolidation of the
  // daily closes). When it returns a promise, the read waits for it, at most
  // onCatalogWaitMs; it never fails the request. null means nothing to wait.
  onCatalog = null,
  onCatalogWaitMs = 3_000,
}) {
  const limits = brapiPlans[plan] || brapiPlans.free;
  // Without a token brapi declares neither a delay nor a plan.
  const delayMinutes = hasToken ? limits.delayMinutes : null;
  const allowedRanges = hasToken
    ? limits.historyRanges
    : brapiPlans.free.historyRanges;
  const memory = new Map();
  const inFlight = new Map();
  const blocked = new Map();
  const catalogIndex = new WeakMap();
  const storeFailureTimes = new Map();
  let cooldownUntil = 0;
  let exhaustedDay = null;
  let queueTail = Promise.resolve();
  let queued = 0;

  function remember(key, entry) {
    memory.delete(key);
    memory.set(key, entry);
    if (memory.size > maxMemoryEntries)
      memory.delete(memory.keys().next().value);
  }

  function storeFailure(operation, error) {
    const time = now();
    if (time - (storeFailureTimes.get(operation) ?? -Infinity) < 60_000) return;
    storeFailureTimes.set(operation, time);
    log({
      event: "market_cache_error",
      operation,
      code: String(error?.code || error?.name || "Error").slice(0, 40),
    });
  }

  // The shared cache is an optimization: if MySQL fails, memory keeps working.
  async function readShared(key) {
    try {
      return await store.read(key);
    } catch (error) {
      storeFailure("read", error);
      return null;
    }
  }

  async function writeShared(key, payload, ttlMs) {
    try {
      await store.write(key, payload, ttlMs);
    } catch (error) {
      storeFailure("write", error);
    }
  }

  // Per-ticker calls must fit the daily budget; the general list only counts.
  async function reserve(kind) {
    const day = saoPauloDate(now());
    if (kind === "perTicker" && (dailyBudget <= 0 || exhaustedDay === day))
      return false;
    try {
      const allowed = await store.reserveCall(
        `brapi:usage:${day}`,
        kind,
        dailyBudget,
      );
      if (kind === "catalog") return true;
      if (!allowed) exhaustedDay = day;
      return Boolean(allowed);
    } catch (error) {
      storeFailure("usage", error);
      // Without the shared counter the ceiling cannot be honored: fail closed.
      return kind === "catalog";
    }
  }

  async function assertNoCooldown() {
    if (now() < cooldownUntil) throw new QuoteServiceError("cooldown");
    const shared = await readShared(cooldownKey);
    const until = Date.parse(shared?.data?.until);
    if (shared?.fresh && Number.isFinite(until) && until > now()) {
      cooldownUntil = until;
      throw new QuoteServiceError("cooldown");
    }
  }

  async function startCooldown(ms) {
    const until = now() + ms;
    if (until <= cooldownUntil) return;
    cooldownUntil = until;
    await writeShared(
      cooldownKey,
      { until: new Date(until).toISOString() },
      ms,
    );
  }

  // Concurrency 1 for per-ticker calls in this instance, with a bounded wait.
  function enqueue(task) {
    if (queued >= maxQueue)
      return Promise.reject(new QuoteServiceError("queue"));
    queued++;
    const enqueuedAt = now();
    const run = queueTail.then(() => {
      queued--;
      if (now() - enqueuedAt > maxQueueWaitMs)
        throw new QuoteServiceError("queue");
      return task();
    });
    queueTail = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async function callProvider(key, kind, fetcher) {
    const block = blocked.get(key);
    if (block && block.until > now())
      throw new QuoteServiceError(
        "recent_failure",
        block.reason,
        block.status ?? null,
      );
    await assertNoCooldown();
    const perTicker = kind !== "catalog";
    const run = async () => {
      for (let attempt = 1; ; attempt++) {
        if (now() < cooldownUntil) throw new QuoteServiceError("cooldown");
        let counting = null;
        if (perTicker) {
          if (!(await reserve("perTicker")))
            throw new QuoteServiceError("budget");
        } else counting = reserve("catalog");
        try {
          return await fetcher();
        } catch (error) {
          if (error?.code === "http" && error.status === 429) {
            await startCooldown(error.retryAfterMs ?? 60_000);
            throw error;
          }
          if (isTransient(error) && attempt < maxAttempts) {
            await sleep(
              retryDelayMs * 2 ** (attempt - 1) * (0.75 + random() / 2),
            );
            continue;
          }
          // A refused ticker waits for the next cache cycle; the shared list
          // is retried at least every 15 min so one bad answer cannot last a night.
          const rejectedMs = perTicker
            ? cacheTtlMs(kind, now())
            : Math.min(cacheTtlMs(kind, now()), rejectedCatalogMs);
          blocked.set(
            key,
            isTransient(error)
              ? { until: now() + transientBackoffMs, reason: "transient" }
              : {
                  until: now() + rejectedMs,
                  reason: "rejected",
                  status: error?.status ?? null,
                },
          );
          throw error;
        } finally {
          if (counting) await counting;
        }
      }
    };
    // Without a token brapi announces x-brapi-concurrency-limit: 1, so the
    // general list joins the same queue; with a token only per-ticker calls do.
    return perTicker || !hasToken ? enqueue(run) : run();
  }

  function knownUnavailable(key) {
    const block = blocked.get(key);
    return now() < cooldownUntil || (block && block.until > now());
  }

  // Memory -> shared cache -> provider. Simultaneous callers share one promise.
  // A failure returns the last valid entry as "stale", or "unavailable".
  function load(key, kind, fetcher) {
    const cached = memory.get(key);
    if (cached && cached.expiresAt > now())
      return Promise.resolve({
        entry: cached,
        freshness: "delayed",
        error: null,
      });
    const pending = inFlight.get(key);
    if (pending) return pending;
    const work = (async () => {
      let fallback = cached || null;
      // While blocked, skip re-reading a large shared row on every request.
      const shared =
        fallback && knownUnavailable(key) ? null : await readShared(key);
      if (
        shared?.data &&
        typeof shared.data.checkedAt === "string" &&
        validValue(kind, shared.data.value)
      ) {
        const entry = {
          value: shared.data.value,
          checkedAt: shared.data.checkedAt,
          expiresAt: shared.fresh ? Number(shared.expiresAt) || now() : 0,
        };
        if (shared.fresh && entry.expiresAt > now()) {
          remember(key, entry);
          return { entry, freshness: "delayed", error: null };
        }
        if (!fallback || entry.checkedAt > fallback.checkedAt) fallback = entry;
      }
      try {
        const value = await callProvider(key, kind, fetcher);
        const checkedMs = now();
        const ttlMs = cacheTtlMs(kind, checkedMs);
        const entry = {
          value,
          checkedAt: new Date(checkedMs).toISOString(),
          expiresAt: checkedMs + ttlMs,
        };
        remember(key, entry);
        await writeShared(key, { value, checkedAt: entry.checkedAt }, ttlMs);
        blocked.delete(key);
        return { entry, freshness: "delayed", error: null };
      } catch (error) {
        if (fallback) {
          remember(key, { ...fallback, expiresAt: 0 });
          return { entry: fallback, freshness: "stale", error };
        }
        return { entry: null, freshness: "unavailable", error };
      }
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, work);
    return work;
  }

  function catalogItem(entry, symbol) {
    if (!entry) return null;
    let index = catalogIndex.get(entry.value);
    if (!index) {
      index = new Map(entry.value.items.map((item) => [item.symbol, item]));
      catalogIndex.set(entry.value, index);
    }
    return index.get(symbol) || null;
  }

  function summaryQuote(symbol, listed) {
    const item = catalogItem(listed.entry, symbol);
    const checkedAt = listed.entry?.checkedAt ?? null;
    if (!item || item.price === null)
      return unavailableQuote(symbol, { checkedAt, delayMinutes });
    return {
      symbol,
      name: item.name,
      logoUrl: item.logoUrl,
      currency: "BRL",
      price: item.price,
      change: null,
      changePercent: item.changePercent,
      previousClose: null,
      dayHigh: null,
      dayLow: null,
      volume: item.volume,
      quoteTime: null,
      marketTime: null,
      checkedAt,
      freshness: listed.freshness,
      stale: listed.freshness === "stale",
      unavailable: false,
      detail: "summary",
      delayMinutes,
      source,
    };
  }

  // The v2 quote only describes the trading session; its price is not used.
  function sessionData(entry) {
    const value = entry.value;
    return {
      open: value.open ?? null,
      dayHigh: value.dayHigh ?? null,
      dayLow: value.dayLow ?? null,
      previousClose: value.previousClose ?? null,
      quoteTime: value.quoteTime ?? null,
      checkedAt: entry.checkedAt,
    };
  }

  // Canonical quote (docs/MARGEM-E-HISTORICO.md): price, change %, volume,
  // checkedAt and freshness always come from the general list, and the v2
  // quote only fills `session`. The R$ change is the listed price minus the
  // session's previous close, and only when the session quote time is in the
  // current B3 session and the listed price was read in that same session.
  function canonicalQuote(base, session) {
    const current = tradingSessionDate(now());
    const sameSession =
      session !== null &&
      typeof session.quoteTime === "string" &&
      saoPauloDate(Date.parse(session.quoteTime)) === current &&
      typeof base.checkedAt === "string" &&
      tradingSessionDate(Date.parse(base.checkedAt)) === current;
    return {
      ...base,
      change: sameSession
        ? priceDifference(base.price, session.previousClose)
        : null,
      detail: session ? "full" : "summary",
      session,
    };
  }

  // Waits for the hook's work when it returns some, never longer than
  // onCatalogWaitMs and never with an error reaching the request.
  async function settleCatalogHook(result) {
    if (!onCatalog || !result.entry) return;
    const failed = (error) =>
      log({
        event: "market_catalog_hook_error",
        code: String(error?.code || error?.name || "Error").slice(0, 40),
      });
    let pending;
    try {
      pending = onCatalog(result.entry, result.freshness);
    } catch (error) {
      failed(error);
      return;
    }
    if (!pending || typeof pending.then !== "function") return;
    const timedOut = Symbol("timeout");
    let timer;
    const deadline = new Promise((resolve) => {
      timer = setTimeout(() => resolve(timedOut), onCatalogWaitMs);
    });
    try {
      if ((await Promise.race([pending, deadline])) === timedOut)
        failed({ code: "TIMEOUT" });
    } catch (error) {
      failed(error);
    } finally {
      clearTimeout(timer);
    }
  }

  async function catalog() {
    const result = await load(catalogKey, "catalog", () => provider.catalog());
    await settleCatalogHook(result);
    return result;
  }

  // One general-list call answers every ticker and every visitor in the TTL.
  async function quotes(symbols) {
    const list = [...new Set(symbols)].filter(isValidTicker);
    if (!list.length) return { quotes: [], market: publicMarket(now()) };
    const listed = await catalog();
    return {
      quotes: list.map((symbol) => summaryQuote(symbol, listed)),
      market: publicMarket(now()),
    };
  }

  async function quote(symbol) {
    if (!isValidTicker(symbol)) throw new TypeError("Invalid ticker");
    const listed = await catalog();
    const demo = demoTickers.has(symbol);
    // Do not spend the budget on tickers the general list does not know.
    const known =
      demo ||
      isCovered(symbol) ||
      !listed.entry ||
      catalogItem(listed.entry, symbol) !== null;
    let base = summaryQuote(symbol, listed);
    let session = null;
    if ((hasToken || demo) && known) {
      const full = await load(`market:quote:${symbol}`, "quote", () =>
        provider.quote(symbol),
      );
      // The last valid v2 answer still describes its own session (it carries
      // its quote time and checkedAt); it never replaces the listed price.
      if (full.entry) {
        session = sessionData(full.entry);
        if (base.unavailable)
          base = {
            ...base,
            name: full.entry.value.name ?? base.name,
            logoUrl: full.entry.value.logoUrl ?? base.logoUrl,
          };
      }
    }
    return {
      quote: canonicalQuote(base, session),
      market: publicMarket(now()),
    };
  }

  // One general-list read for many tickers (ranking routes): canonical quotes
  // without a session, so no per-ticker call is ever made here.
  async function canonicalQuotes(symbols) {
    const listed = await catalog();
    const checkedAt = listed.entry?.checkedAt ?? null;
    const result = new Map();
    for (const symbol of symbols) {
      if (typeof symbol !== "string" || result.has(symbol)) continue;
      const base = isValidTicker(symbol)
        ? summaryQuote(symbol, listed)
        : unavailableQuote(symbol, { checkedAt, delayMinutes });
      result.set(symbol, canonicalQuote(base, null));
    }
    return {
      quotes: result,
      checkedAt,
      freshness: listed.freshness,
      market: publicMarket(now()),
      listed,
    };
  }

  // brapi daily series for the chart: the plan's longest range, with the raw
  // price for demonstration tickers and the Pro plan. Compact rows
  // `[date, adjustedClose, rawClose]` are what the cache keeps.
  async function series(symbol, listed = null) {
    if (!isValidTicker(symbol)) throw new TypeError("Invalid ticker");
    const demo = demoTickers.has(symbol);
    const options = demo
      ? demoSeries
      : hasToken
        ? { range: limits.seriesRange, includeRaw: limits.includeRaw }
        : null;
    const base = {
      points: null,
      checkedAt: null,
      freshness: "unavailable",
      reason: null,
      range: options?.range ?? null,
      includeRaw: options?.includeRaw === true,
    };
    if (!options) return { ...base, reason: "no_token" };
    // Do not spend the budget on a ticker the loaded general list lacks.
    if (!demo && listed?.entry && catalogItem(listed.entry, symbol) === null)
      return { ...base, reason: "not_covered" };
    const result = await load(
      `market:series:${symbol}:${options.range}${base.includeRaw ? ":raw" : ""}`,
      "series",
      () => provider.series(symbol, options),
    );
    if (result.entry)
      return {
        ...base,
        points: result.entry.value,
        checkedAt: result.entry.checkedAt,
        freshness: result.freshness,
      };
    return { ...base, reason: seriesFailure(result.error) };
  }

  async function history(symbol, range) {
    const base = {
      symbol,
      available: false,
      reason: null,
      interval: "1d",
      range,
      points: [],
      checkedAt: null,
      source,
      stale: false,
    };
    if (!isValidTicker(symbol)) throw new TypeError("Invalid ticker");
    const demo = demoTickers.has(symbol);
    if (!demo && !isCovered(symbol)) return { ...base, reason: "not_covered" };
    if (!hasToken && !demo) return { ...base, reason: "no_token" };
    if (!allowedRanges.includes(range))
      return { ...base, reason: "range_not_in_plan" };
    const result = await load(
      `market:history:${symbol}:${range}`,
      "history",
      () => provider.history(symbol, range),
    );
    if (result.entry)
      return {
        ...base,
        available: true,
        points: result.entry.value,
        checkedAt: result.entry.checkedAt,
        stale: result.freshness === "stale",
      };
    return {
      ...base,
      reason: result.error?.code === "budget" ? "budget" : "provider_error",
    };
  }

  return {
    quotes,
    quote,
    canonicalQuotes,
    history,
    series,
    catalog,
    market: () => publicMarket(now()),
    delayMinutes,
  };
}
