import { companyLogoUrl } from "../../company-logo.mjs";
import { cacheTtlMs, publicMarket, saoPauloDate } from "./market-session.js";
import { brapiPlans } from "./plans.js";
import { demoTickers, isValidTicker } from "./validation.js";

// Quote service behind /api/market. It owns caching, deduplication, the 429
// cooldown, retries, the per-ticker queue and the daily budget; the provider
// only fetches and normalizes. Every dependency is injected so unit tests run
// without MySQL, network or the real clock. Rules: docs/COTACOES.md.

const source = "brapi.dev";
const cooldownKey = "brapi:cooldown";
const catalogKey = "market:catalog";
const maxAttempts = 2;
const transientBackoffMs = 60_000;
const rejectedCatalogMs = 15 * 60_000;
const maxMemoryEntries = 3000;

export class QuoteServiceError extends Error {
  constructor(code, reason = null) {
    super(`Quote service ${code}`);
    this.name = "QuoteServiceError";
    // cooldown | budget | queue | recent_failure
    this.code = code;
    this.reason = reason;
  }
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

// 401, 403, 404 or an unusable payload: the detailed quote is not obtainable
// now, so the summary from the general list is the better answer.
function isRejection(error) {
  if (!error) return false;
  if (error.code === "recent_failure") return error.reason === "rejected";
  if (error.code === "invalid") return true;
  return error.code === "http" && error.status !== 429 && error.status < 500;
}

function validValue(kind, value) {
  if (kind === "catalog") return Array.isArray(value?.items);
  if (kind === "quote")
    return typeof value?.symbol === "string" && typeof value.price === "string";
  return Array.isArray(value);
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
      throw new QuoteServiceError("recent_failure", block.reason);
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
              : { until: now() + rejectedMs, reason: "rejected" },
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

  function fullQuote(result) {
    const value = result.entry.value;
    return {
      symbol: value.symbol,
      name: value.name,
      logoUrl: value.logoUrl,
      currency: value.currency,
      price: value.price,
      change: value.change,
      changePercent: value.changePercent,
      previousClose: value.previousClose,
      dayHigh: value.dayHigh,
      dayLow: value.dayLow,
      volume: value.volume,
      quoteTime: value.quoteTime,
      marketTime: value.quoteTime,
      checkedAt: result.entry.checkedAt,
      freshness: result.freshness,
      stale: result.freshness === "stale",
      unavailable: false,
      detail: "full",
      delayMinutes,
      source,
    };
  }

  function catalog() {
    return load(catalogKey, "catalog", () => provider.catalog());
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
    if ((hasToken || demo) && known) {
      const full = await load(`market:quote:${symbol}`, "quote", () =>
        provider.quote(symbol),
      );
      const preferSummary =
        full.error?.code === "budget" || isRejection(full.error);
      if (full.entry && (full.freshness === "delayed" || !preferSummary))
        return { quote: fullQuote(full), market: publicMarket(now()) };
    }
    return { quote: summaryQuote(symbol, listed), market: publicMarket(now()) };
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
    history,
    catalog,
    market: () => publicMarket(now()),
    delayMinutes,
  };
}
