import { ApiError, apiRequest } from "../lib/api";
import { quoteSymbols, refreshBounds } from "../lib/liveQuotes";
import {
  parsePriceSeries,
  uncoveredSeries,
  type PriceBasis,
  type PriceGranularity,
  type PriceSeries,
} from "../lib/priceSeries";
import { createPolledStore, keyedStores } from "../lib/polledStore";
import { usePolledStore } from "./usePolledStore";

// "auto" asks for the adjusted series first, the documented default, and
// follows the server's default basis when the adjusted one does not exist.
export type BasisChoice = PriceBasis | "auto";

async function request(
  ticker: string,
  basis: PriceBasis,
  granularity: PriceGranularity,
  signal: AbortSignal,
) {
  try {
    return parsePriceSeries(
      await apiRequest<unknown>(
        `/api/rankings/price-series/${encodeURIComponent(ticker)}?basis=${basis}&granularity=${granularity}`,
        { signal },
      ),
      { ticker, basis, granularity },
    );
  } catch (reason) {
    // Only snapshot and published companies have a series: 404 is a state,
    // not a failure to retry.
    if (reason instanceof ApiError && reason.status === 404)
      return uncoveredSeries({ ticker, basis, granularity });
    throw reason;
  }
}

const seriesStore = keyedStores<PriceSeries>((key) => {
  const [ticker, choice, granularity] = key.split("|") as [
    string,
    BasisChoice,
    PriceGranularity,
  ];
  return createPolledStore({
    retryMs: 900_000,
    load: async (signal) => {
      let series = await request(
        ticker,
        choice === "auto" ? "adjusted" : choice,
        granularity,
        signal,
      );
      if (
        choice === "auto" &&
        series.basis === "adjusted" &&
        !series.availableBases.includes("adjusted") &&
        series.defaultBasis === "nominal" &&
        series.availableBases.includes("nominal")
      )
        series = await request(ticker, "nominal", granularity, signal);
      // Daily closes change once a day; the server caches for an hour.
      return { data: series, refreshMs: refreshBounds.max };
    },
  });
});

export function usePriceSeries(
  ticker: string,
  basis: BasisChoice,
  granularity: PriceGranularity,
) {
  const [symbol] = quoteSymbols([ticker]);
  const store = symbol
    ? seriesStore(`${symbol}|${basis}|${granularity}`)
    : null;
  const snapshot = usePolledStore(store);
  return { ...snapshot, supported: Boolean(symbol), retry: store?.refresh };
}
