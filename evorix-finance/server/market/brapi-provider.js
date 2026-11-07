import { companyLogoUrl } from "../../company-logo.mjs";
import { saoPauloDate } from "./market-session.js";
import { historyRanges, isValidTicker, seriesRanges } from "./validation.js";

// brapi.dev adapter: the only module that knows brapi URLs and payloads. It
// returns normalized objects (decimal text or null, never 0 for a missing
// value). Another provider can replace it with the same four methods.

const origin = "https://brapi.dev";
export const brapiPaths = Object.freeze({
  catalog: "/api/quote/list",
  quote: "/api/v2/stocks/quote",
  history: "/api/v2/stocks/historical",
});
const timeoutsMs = Object.freeze({
  catalog: 12_000,
  quote: 7_000,
  history: 10_000,
});
const defaultRetryAfterMs = 60_000;
const maximumRetryAfterMs = 24 * 60 * 60_000;
const catalogSymbol = /^[A-Z0-9][A-Z0-9.-]{0,15}$/;

export class ProviderError extends Error {
  constructor(code, { status = null, retryAfterMs = null } = {}) {
    super(`Market provider ${code}${status ? ` ${status}` : ""}`);
    this.name = "ProviderError";
    // network | http | invalid
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

export function decimalText(value, digits) {
  const number = finiteNumber(value);
  return number === null ? null : number.toFixed(digits);
}

// A traded price must be positive; 0 or garbage means "no price", not R$ 0.
export function priceText(value) {
  const number = finiteNumber(value);
  return number === null || number < 0.00000001 || number >= 1e12
    ? null
    : number.toFixed(8);
}

export function integerText(value) {
  const number = finiteNumber(value);
  return number === null || Math.abs(number) >= 1e21
    ? null
    : Math.round(number).toFixed(0);
}

function shortText(value, maximum = 120) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

function isoTime(value) {
  const number = finiteNumber(value);
  const ms =
    number !== null
      ? number < 1e11
        ? number * 1000
        : number
      : typeof value === "string"
        ? Date.parse(value)
        : NaN;
  return Number.isFinite(ms) && Math.abs(ms) <= 8.64e15
    ? new Date(ms).toISOString()
    : null;
}

export function parseRetryAfter(header, nowMs) {
  let ms = null;
  if (typeof header === "string" && header.trim()) {
    const text = header.trim();
    if (/^\d+$/.test(text)) ms = Number(text) * 1000;
    else {
      const at = Date.parse(text);
      if (Number.isFinite(at)) ms = at - nowMs;
    }
  }
  if (ms === null || !Number.isFinite(ms)) return defaultRetryAfterMs;
  return Math.min(maximumRetryAfterMs, Math.max(1000, ms));
}

export function normalizeCatalog(payload) {
  if (!payload || !Array.isArray(payload.stocks))
    throw new ProviderError("invalid");
  const items = [];
  const seen = new Set();
  for (const asset of payload.stocks) {
    const symbol =
      typeof asset?.stock === "string" ? asset.stock.trim().toUpperCase() : "";
    if (!catalogSymbol.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    items.push({
      symbol,
      name: shortText(asset.name) || symbol,
      logoUrl: companyLogoUrl(symbol, asset.logo),
      price: priceText(asset.close),
      // In the list, `change` is the daily change in percent.
      changePercent: decimalText(asset.change, 4),
      volume: integerText(asset.volume),
      marketCap: integerText(asset.market_cap),
      sector: shortText(asset.sector),
      subSector: shortText(asset.subsector),
      type: shortText(asset.type, 40),
      subType: shortText(asset.subType, 40),
    });
  }
  return {
    items,
    availableSectors: Array.isArray(payload.availableSectors)
      ? payload.availableSectors
          .filter((sector) => typeof sector === "string")
          .slice(0, 100)
      : [],
  };
}

function resultFor(payload, symbol) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return (
    results.find(
      (result) =>
        result &&
        (result.symbol === symbol || result.requestedSymbol === symbol),
    ) || null
  );
}

export function normalizeQuote(payload, symbol) {
  const data = resultFor(payload, symbol)?.data;
  if (!data || typeof data !== "object") throw new ProviderError("invalid");
  const price = priceText(data.regularMarketPrice);
  if (price === null) throw new ProviderError("invalid");
  return {
    symbol,
    name: shortText(data.longName) || shortText(data.shortName) || symbol,
    logoUrl: companyLogoUrl(symbol, data.logourl),
    currency:
      typeof data.currency === "string" && /^[A-Z]{3}$/.test(data.currency)
        ? data.currency
        : "BRL",
    price,
    change: decimalText(data.regularMarketChange, 8),
    changePercent: decimalText(data.regularMarketChangePercent, 4),
    open: priceText(data.regularMarketOpen),
    previousClose: priceText(data.regularMarketPreviousClose),
    dayHigh: priceText(data.regularMarketDayHigh),
    dayLow: priceText(data.regularMarketDayLow),
    volume: integerText(data.regularMarketVolume),
    quoteTime: isoTime(data.regularMarketTime),
  };
}

// brapi sends newest first with `date` in unix seconds. Return oldest first,
// one point per São Paulo calendar day (the latest timestamp wins), and drop
// points without a close instead of inventing one.
export function normalizeHistory(payload, symbol) {
  const prices = resultFor(payload, symbol)?.data?.historicalDataPrice;
  if (!Array.isArray(prices)) throw new ProviderError("invalid");
  const byDate = new Map();
  for (const raw of prices) {
    const time = isoTime(raw?.date);
    const close = priceText(raw?.close);
    if (time === null || close === null) continue;
    const ms = Date.parse(time);
    const date = saoPauloDate(ms);
    const previous = byDate.get(date);
    if (previous && previous.ms >= ms) continue;
    byDate.set(date, {
      ms,
      point: {
        date,
        close,
        adjustedClose: priceText(raw.adjustedClose),
        volume: integerText(raw.volume),
      },
    });
  }
  return [...byDate.values()]
    .map((entry) => entry.point)
    .sort((left, right) => (left.date < right.date ? -1 : 1));
}

function seriesNumber(value) {
  return priceText(value) === null ? null : Number(value);
}

// Chart series in a compact form that is cached as is: oldest first, one row
// per São Paulo date, `[date, adjustedClose, rawClose]` with numbers or null.
// brapi `close` is adjusted for stock events only, so it is never kept: it is
// neither the traded price nor the fully adjusted one.
export function normalizeSeries(payload, symbol) {
  const prices = resultFor(payload, symbol)?.data?.historicalDataPrice;
  if (!Array.isArray(prices)) throw new ProviderError("invalid");
  const byDate = new Map();
  for (const raw of prices) {
    const time = isoTime(raw?.date);
    if (time === null) continue;
    const adjusted = seriesNumber(raw.adjustedClose);
    const traded = seriesNumber(raw.rawClose);
    if (adjusted === null && traded === null) continue;
    const ms = Date.parse(time);
    const date = saoPauloDate(ms);
    const previous = byDate.get(date);
    if (previous && previous.ms >= ms) continue;
    byDate.set(date, { ms, row: [date, adjusted, traded] });
  }
  return [...byDate.values()]
    .map((entry) => entry.row)
    .sort((left, right) => (left[0] < right[0] ? -1 : 1));
}

function defaultLog(entry) {
  console.info(JSON.stringify(entry));
}

export function createBrapiProvider({
  token = null,
  fetchImpl = globalThis.fetch,
  log = defaultLog,
  now = Date.now,
} = {}) {
  async function request(kind, params) {
    const path = brapiPaths[kind];
    const url = new URL(path, origin);
    for (const [name, value] of Object.entries(params))
      url.searchParams.set(name, value);
    // The token goes only in this header: never in the URL, logs or responses.
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const started = now();
    let status = null;
    let outcome = "ok";
    let errorCode = null;
    try {
      let response;
      try {
        response = await fetchImpl(url.href, {
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(timeoutsMs[kind]),
        });
      } catch (error) {
        outcome = "network_error";
        errorCode = String(error?.cause?.code || error?.name || "Error").slice(
          0,
          40,
        );
        throw new ProviderError("network");
      }
      status = response.status;
      if (!response.ok) {
        outcome = "http_error";
        // Release the connection; the error body is never read or forwarded.
        response.body?.cancel?.().catch(() => {});
        throw new ProviderError("http", {
          status,
          retryAfterMs:
            status === 429
              ? parseRetryAfter(response.headers?.get?.("retry-after"), now())
              : null,
        });
      }
      try {
        return await response.json();
      } catch (error) {
        // A body cut by the timeout is a network failure, not a bad payload.
        if (error?.name === "AbortError" || error?.name === "TimeoutError") {
          outcome = "network_error";
          errorCode = error.name;
          throw new ProviderError("network");
        }
        outcome = "invalid";
        throw new ProviderError("invalid", { status });
      }
    } finally {
      log({
        event: "brapi_call",
        endpoint: path,
        status,
        outcome,
        ...(errorCode ? { errorCode } : {}),
        durationMs: Math.max(0, now() - started),
        authenticated: Boolean(token),
      });
    }
  }

  function assertTicker(symbol) {
    // Second guard: no upstream URL is ever built from unvalidated input.
    if (!isValidTicker(symbol)) throw new ProviderError("invalid");
  }

  return {
    name: "brapi.dev",
    async catalog() {
      return normalizeCatalog(
        await request("catalog", {
          limit: "2000",
          sortBy: "volume",
          sortOrder: "desc",
        }),
      );
    },
    async quote(symbol) {
      assertTicker(symbol);
      return normalizeQuote(
        await request("quote", { symbols: symbol }),
        symbol,
      );
    },
    async history(symbol, range) {
      assertTicker(symbol);
      if (!historyRanges.includes(range)) throw new ProviderError("invalid");
      return normalizeHistory(
        await request("history", { symbols: symbol, range, interval: "1d" }),
        symbol,
      );
    },
    // Longest daily series of the plan; `includeRaw` adds the traded price
    // (Pro plan or demonstration ticker).
    async series(symbol, { range, includeRaw = false } = {}) {
      assertTicker(symbol);
      if (!seriesRanges.includes(range)) throw new ProviderError("invalid");
      return normalizeSeries(
        await request("history", {
          symbols: symbol,
          range,
          interval: "1d",
          ...(includeRaw === true ? { includeRaw: "true" } : {}),
        }),
        symbol,
      );
    },
  };
}
