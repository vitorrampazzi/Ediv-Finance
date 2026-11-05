import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";
import {
  chunkSymbols,
  defaultRefreshMs,
  markStale,
  parseMarket,
  parseQuote,
  quoteSymbols,
  refreshBounds,
  refreshMs,
  type LiveQuote,
  type MarketState,
} from "../lib/liveQuotes";

type Loaded<T> = { data: T; refreshMs: number };
type Loader<T> = (key: string, signal: AbortSignal) => Promise<Loaded<T>>;
type PollState<T> = {
  // Key of the last settled request; data may belong to an earlier key.
  key: string | null;
  data: T | null;
  failed: boolean;
};

// Polls while the tab is visible, at the interval the last answer asked for.
// A failed refresh keeps the previous data (flagged as failed) and never
// clears the screen; only the first load of a key reports `loading`.
export function usePolledResource<T>(
  key: string | null,
  load: Loader<T>,
  retryMs: number,
) {
  const [state, setState] = useState<PollState<T>>({
    key: null,
    data: null,
    failed: false,
  });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dueAt = 0;
    let running = false;
    let interval = defaultRefreshMs;
    const schedule = (delay: number) => {
      dueAt = Date.now() + delay;
      clearTimeout(timer);
      timer = setTimeout(tick, delay);
    };
    const run = async () => {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        const result = await load(key, controller.signal);
        if (controller.signal.aborted) return;
        interval = result.refreshMs;
        setState({ key, data: result.data, failed: false });
        schedule(interval);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setState((previous) => ({ ...previous, key, failed: true }));
        // The server's Retry-After wins; otherwise retry sooner than usual.
        const wait =
          reason instanceof ApiError && reason.retryAfterMs
            ? reason.retryAfterMs
            : Math.min(interval, retryMs);
        schedule(
          Math.min(refreshBounds.max, Math.max(refreshBounds.min, wait)),
        );
      } finally {
        running = false;
      }
    };
    // A hidden tab lets the timer lapse; becoming visible catches up if due.
    function tick() {
      if (controller.signal.aborted || document.hidden) return;
      if (Date.now() < dueAt) schedule(dueAt - Date.now());
      else void run();
    }
    const onVisibility = () => {
      if (!document.hidden && Date.now() >= dueAt) void run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, load, retryMs]);
  const settled = key !== null && state.key === key;
  return {
    data: key ? state.data : null,
    loading: key !== null && !settled,
    failed: settled && state.failed,
  };
}

type QuoteSet = {
  quotes: Record<string, LiveQuote>;
  market: MarketState | null;
};

const loadQuotes: Loader<QuoteSet> = async (key, signal) => {
  const quotes: Record<string, LiveQuote> = {};
  let market: MarketState | null = null;
  // One request per chunk of the set; normally the whole set fits in one.
  for (const chunk of chunkSymbols(key.split(","))) {
    const body = await apiRequest<{ quotes?: unknown[]; market?: unknown }>(
      "/api/market/quotes?symbols=" + encodeURIComponent(chunk.join(",")),
      { signal },
    );
    for (const item of Array.isArray(body.quotes) ? body.quotes : []) {
      const quote = parseQuote(item);
      if (quote && chunk.includes(quote.symbol)) quotes[quote.symbol] = quote;
    }
    market ??= parseMarket(body.market);
  }
  return { data: { quotes, market }, refreshMs: refreshMs(market) };
};

export type LiveQuoteView = {
  quote: LiveQuote | null;
  loading: boolean;
};

// Shared quotes for a list of tickers (ranking). Invalid tickers are skipped
// and read as unavailable; they are never sent to the server.
export function useLiveQuotes(symbols: readonly string[]) {
  const list = quoteSymbols(symbols);
  const key = list.length ? list.join(",") : null;
  const { data, loading, failed } = usePolledResource(key, loadQuotes, 120_000);
  const quoteFor = useCallback(
    (symbol: string): LiveQuoteView => {
      const upper = symbol.toUpperCase();
      const quote = data?.quotes[upper] ?? null;
      // Before the first answer for this ticker the line stays reserved, blank.
      if (!quote && loading) return { quote: null, loading: true };
      return {
        quote: quote && failed ? markStale(quote) : quote,
        loading: false,
      };
    },
    [data, loading, failed],
  );
  return useMemo(
    () => ({ quoteFor, market: data?.market ?? null, loading, failed }),
    [quoteFor, data, loading, failed],
  );
}
export type LiveQuotes = ReturnType<typeof useLiveQuotes>;

type SingleQuote = { quote: LiveQuote | null; market: MarketState | null };
const loadQuote: Loader<SingleQuote> = async (key, signal) => {
  const body = await apiRequest<{ quote?: unknown; market?: unknown }>(
    "/api/market/quote/" + encodeURIComponent(key),
    { signal },
  );
  const quote = parseQuote(body.quote);
  const market = parseMarket(body.market);
  return {
    data: { quote: quote?.symbol === key ? quote : null, market },
    refreshMs: refreshMs(market),
  };
};

// Detailed quote of one company page.
export function useLiveQuote(ticker: string) {
  const [symbol] = quoteSymbols([ticker]);
  const key = symbol ?? null;
  const { data, loading, failed } = usePolledResource(key, loadQuote, 120_000);
  const current = data?.quote?.symbol === key ? data.quote : null;
  return {
    quote: current && failed ? markStale(current) : current,
    market: data?.market ?? null,
    loading: loading && !current,
    // Without any valid answer the block says the quote is unavailable.
    failed,
    supported: key !== null,
  };
}
