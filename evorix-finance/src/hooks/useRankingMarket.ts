import { useAuth } from "../context/authContext";
import { apiRequest } from "../lib/api";
import { refreshMs } from "../lib/liveQuotes";
import { parseRankingMarket, type RankingMarket } from "../lib/marketData";
import { createPolledStore, type PolledStore } from "../lib/polledStore";
import { usePolledStore } from "./usePolledStore";

const load = async (signal: AbortSignal) => {
  const data = parseRankingMarket(
    await apiRequest<unknown>("/api/rankings/market", { signal }),
  );
  return { data, refreshMs: refreshMs(data.market) };
};

// One store per account, shared by the ranking, the company page and the
// home highlights: they always show the same price and margin, from one
// request per cycle. Another account starts from a store of its own.
let current: { owner: string; store: PolledStore<RankingMarket> } | null = null;
function storeFor(owner: string) {
  if (current?.owner !== owner)
    current = { owner, store: createPolledStore({ load, retryMs: 120_000 }) };
  return current.store;
}

export function useRankingMarket(enabled: boolean) {
  const { user } = useAuth();
  return usePolledStore(enabled && user ? storeFor(user.id) : null);
}
