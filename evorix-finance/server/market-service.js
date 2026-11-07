import { config } from "./config.js";
import {
  dailyClosesStore,
  latestPublicationTickers,
  readDailyCloses,
} from "./market-closes.js";
import { readCache, reserveProviderCall, saveCache } from "./provider-cache.js";
import {
  hasStockHistory,
  stockHistory,
  stockHistoryTickers,
} from "./stock-history.js";
import { createBrapiProvider } from "./market/brapi-provider.js";
import { createDailyCloses } from "./market/daily-closes.js";
import { agfNominalTail, buildPriceSeries } from "./market/price-series.js";
import { createQuoteService } from "./market/quote-service.js";

// One quote service per process, shared by /api/market and /api/rankings so
// they reuse the same memory cache. Contracts: docs/COTACOES.md and
// docs/MARGEM-E-HISTORICO.md.

function log(entry) {
  console.info(JSON.stringify(entry));
}

const dailyCloses = createDailyCloses({
  store: dailyClosesStore,
  tickers: async () => [
    ...new Set([
      ...stockHistoryTickers(),
      ...(await latestPublicationTickers()),
    ]),
  ],
  log,
});

export const quoteService = createQuoteService({
  provider: createBrapiProvider({ token: config.brapiApiKey }),
  store: {
    read: readCache,
    write: saveCache,
    reserveCall: reserveProviderCall,
  },
  hasToken: Boolean(config.brapiApiKey),
  plan: config.brapiPlan,
  dailyBudget: config.brapiDailyBudget,
  isCovered: hasStockHistory,
  // The list read that makes a session's closes due waits for the writes, at
  // most 2.5 s (daily-closes.js); every other read returns at once.
  onCatalog: (entry) => dailyCloses.afterCatalog(entry),
});

// The AGF snapshot never changes while the process lives.
const agfTails = new Map();
function agfTail(ticker) {
  if (!hasStockHistory(ticker)) return null;
  if (!agfTails.has(ticker))
    agfTails.set(ticker, agfNominalTail(stockHistory(ticker)?.prices));
  return agfTails.get(ticker);
}

/**
 * Snapshot history of GET /api/rankings/history with only the nominal tail of
 * the AGF prices: the older values were adjusted by an undocumented method and
 * are never served. Dividends and source stay as approved.
 */
export function servedStockHistory(ticker) {
  const history = stockHistory(ticker);
  if (!history) return null;
  return {
    ...history,
    prices: history.prices.slice(agfTail(ticker)?.excluded ?? 0),
  };
}

// The series is rebuilt on every request; log a conflict once an hour.
const conflictLogTimes = new Map();
function seriesLog(entry) {
  const now = Date.now();
  const key = `${entry.event}:${entry.ticker}`;
  if (now - (conflictLogTimes.get(key) ?? -Infinity) < 60 * 60_000) return;
  conflictLogTimes.set(key, now);
  if (conflictLogTimes.size > 500)
    conflictLogTimes.delete(conflictLogTimes.keys().next().value);
  log(entry);
}

/** Body of GET /api/rankings/price-series/:ticker. */
export async function priceSeries(ticker, { basis, granularity }) {
  const { quotes, listed } = await quoteService.canonicalQuotes([ticker]);
  const [brapi, escola] = await Promise.all([
    quoteService.series(ticker, listed),
    readDailyCloses(ticker).catch((error) => {
      log({
        event: "market_closes_read_error",
        code: String(error?.code || error?.name || "Error").slice(0, 40),
      });
      return [];
    }),
  ]);
  return buildPriceSeries({
    ticker,
    basis,
    granularity,
    brapi,
    escola,
    agf: agfTail(ticker),
    quote: quotes.get(ticker) ?? null,
    now: Date.now(),
    log: seriesLog,
  });
}
