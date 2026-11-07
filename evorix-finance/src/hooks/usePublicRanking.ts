import { apiRequest } from "../lib/api";
import { refreshMs } from "../lib/liveQuotes";
import {
  parsePublicRanking,
  publicationInstant,
  type PublicRanking,
} from "../lib/marketData";
import { createPolledStore } from "../lib/polledStore";
import { usePolledStore } from "./usePolledStore";

export { publicMetrics } from "../lib/marketData";
export type { PublicEntry, PublicRanking } from "../lib/marketData";

// The home, the /ranking landing and the public company pages read the same
// answer: its quotes and margins refresh at the interval the server gives.
const store = createPolledStore<PublicRanking>({
  retryMs: 120_000,
  load: async (signal) => {
    const data = parsePublicRanking(
      await apiRequest<unknown>("/api/rankings/public", { signal }),
    );
    return { data, refreshMs: refreshMs(data.market) };
  },
});

export function usePublicRanking() {
  const snapshot = usePolledStore(store);
  return {
    publication: snapshot.data,
    loading: snapshot.loading,
    // Only a first load can fail on screen; later failures keep the numbers.
    error:
      snapshot.data || snapshot.loading || !snapshot.failed
        ? ""
        : snapshot.error || "Não foi possível carregar o ranking.",
    // The latest refresh failed: quotes and margins on screen are stale.
    stale: Boolean(snapshot.data) && snapshot.failed,
    retry: store.refresh,
  };
}

// Publication dates arrive as UTC, either ISO or MySQL "YYYY-MM-DD HH:MM:SS".
export function publicationDate(value: string | null) {
  const time = publicationInstant(value);
  return time === null
    ? null
    : new Date(time).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
}
