import { apiRequest } from "../lib/api";
import { quoteSymbols, refreshBounds } from "../lib/liveQuotes";
import type { LiveHistory } from "../lib/stockHistory";
import { usePolledResource } from "./useLiveQuotes";

// Daily closes change once a day: ask at most hourly while the page is open.
const loadHistory = async (key: string, signal: AbortSignal) => {
  const body = await apiRequest<Partial<LiveHistory>>(
    "/api/market/history/" + encodeURIComponent(key) + "?range=3mo",
    { signal },
  );
  return {
    data: {
      symbol: typeof body.symbol === "string" ? body.symbol.toUpperCase() : "",
      available: body.available === true,
      reason: typeof body.reason === "string" ? body.reason : null,
      stale: body.stale === true,
      points: Array.isArray(body.points) ? body.points : [],
    } satisfies LiveHistory,
    refreshMs: refreshBounds.max,
  };
};

export function useLiveHistory(ticker: string, enabled: boolean) {
  const [symbol] = quoteSymbols([ticker]);
  const key = enabled && symbol ? symbol : null;
  const { data, loading, failed } = usePolledResource(
    key,
    loadHistory,
    900_000,
  );
  const current = data && data.symbol === key ? data : null;
  return { data: current, loading: loading && !current, failed };
}
