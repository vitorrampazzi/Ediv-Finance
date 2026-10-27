import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { parseStockHistory, type StockHistory } from "../lib/stockHistory";

export function useStockHistory(ticker: string, enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    ticker: string;
    attempt: number;
    data: StockHistory | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiRequest<unknown>(`/api/rankings/history/${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
    })
      .then((input) => {
        const data = parseStockHistory(input, ticker);
        if (!controller.signal.aborted)
          setState({ ticker, attempt, data, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            ticker,
            attempt,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Histórico indisponível.",
          });
      });
    return () => controller.abort();
  }, [ticker, enabled, attempt]);
  const current =
    enabled && state?.ticker === ticker && state.attempt === attempt
      ? state
      : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: enabled && current === null,
    retry: () => setAttempt((value) => value + 1),
  };
}
export type StockHistoryState = ReturnType<typeof useStockHistory>;
