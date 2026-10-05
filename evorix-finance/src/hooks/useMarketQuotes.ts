import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
export type MarketQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: string | null;
  change: string | null;
  changePercent: string | null;
  marketTime: string | null;
  checkedAt?: string | null;
  source: string;
  stale?: boolean;
  unavailable?: boolean;
};
export function useMarketQuotes(symbols: string[]) {
  const key = [...new Set(symbols.map((s) => s.toUpperCase()))].join(",");
  const [state, setState] = useState<{
    key: string;
    quotes: MarketQuote[];
    error: string;
  }>({ key: "", quotes: [], error: "" });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const list = key.split(",");
    const batches = Array.from({ length: Math.ceil(list.length / 8) }, (_, i) =>
      list.slice(i * 8, i * 8 + 8),
    );
    let cursor = 0;
    let failure = "";
    const result: MarketQuote[] = [];
    const work = async () => {
      while (
        cursor < batches.length &&
        !controller.signal.aborted &&
        !failure
      ) {
        const batch = batches[cursor++];
        try {
          const data = await apiRequest<{ quotes: MarketQuote[] }>(
            "/api/market/quotes?symbols=" + encodeURIComponent(batch.join(",")),
            { signal: controller.signal },
          );
          result.push(...data.quotes);
        } catch (reason) {
          failure =
            reason instanceof Error
              ? reason.message
              : "Cotações indisponíveis.";
        }
      }
    };
    Promise.all([work(), work()])
      .then(() => {
        if (!controller.signal.aborted)
          setState({ key, quotes: result, error: failure });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setState({
            key,
            quotes: result,
            error:
              reason instanceof Error
                ? reason.message
                : "Cotações indisponíveis.",
          });
      });
    return () => controller.abort();
  }, [key]);
  return {
    quotes: state.key === key ? state.quotes : [],
    loading: Boolean(key) && state.key !== key,
    error: state.key === key ? state.error : "",
  };
}
