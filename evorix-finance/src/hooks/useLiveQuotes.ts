import { apiRequest } from "../lib/api";
import {
  markStale,
  parseMarket,
  parseQuote,
  quoteSymbols,
  refreshMs,
  type LiveQuote,
  type MarketState,
} from "../lib/liveQuotes";
import { createPolledStore, keyedStores } from "../lib/polledStore";
import { usePolledStore } from "./usePolledStore";

type SingleQuote = { quote: LiveQuote | null; market: MarketState | null };

// Detailed quote of one company page: the canonical price plus the session
// data of the v2 quote. Polled at the interval the server asks for.
const quoteStore = keyedStores<SingleQuote>((ticker) =>
  createPolledStore({
    retryMs: 120_000,
    load: async (signal) => {
      const body = await apiRequest<{ quote?: unknown; market?: unknown }>(
        "/api/market/quote/" + encodeURIComponent(ticker),
        { signal },
      );
      const quote = parseQuote(body.quote);
      const market = parseMarket(body.market);
      return {
        data: { quote: quote?.symbol === ticker ? quote : null, market },
        refreshMs: refreshMs(market),
      };
    },
  }),
);

// Invalid tickers are never sent to the server and read as unavailable.
export function useLiveQuote(ticker: string) {
  const [symbol] = quoteSymbols([ticker]);
  const snapshot = usePolledStore(symbol ? quoteStore(symbol) : null);
  const current =
    symbol && snapshot.data?.quote?.symbol === symbol
      ? snapshot.data.quote
      : null;
  return {
    quote: current && snapshot.failed ? markStale(current) : current,
    loading: snapshot.loading && !current,
    failed: snapshot.failed,
    supported: Boolean(symbol),
  };
}
