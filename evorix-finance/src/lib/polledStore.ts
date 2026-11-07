// One shared, polled copy of a market resource (docs/MARGEM-E-HISTORICO.md):
// every screen reading the same store sees the same answer, and there is one
// request per cycle however many screens subscribe. It asks again at the
// interval the last answer gave, waits while the tab is hidden and catches up
// when the tab is visible again. A failed refresh keeps the last data, flagged
// as failed; only the very first request reports `loading`. Pure enough for
// Node: the clock, the timers and the page visibility are injected.

export type PolledSnapshot<T> = {
  data: T | null;
  // No answer yet and a request is due or running: the only loading state.
  loading: boolean;
  // The latest request failed; `data`, when present, is the last valid answer.
  failed: boolean;
  error: string | null;
};
export type PolledLoad<T> = (
  signal: AbortSignal,
) => Promise<{ data: T; refreshMs: number }>;
export type PolledEnvironment = {
  now: () => number;
  setTimer: (run: () => void, delay: number) => unknown;
  clearTimer: (timer: unknown) => void;
  hidden: () => boolean;
  onVisibility: (listener: () => void) => () => void;
};
export type PolledStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PolledSnapshot<T>;
  // Ask now (retry button); keeps the data on screen while it runs.
  refresh: () => void;
  // Forget the data (another account): the next subscriber starts over.
  reset: () => void;
};

export const pollBounds = { min: 60_000, max: 3_600_000 } as const;
const clamp = (value: number) =>
  Math.min(pollBounds.max, Math.max(pollBounds.min, value));

export const initialSnapshot: PolledSnapshot<never> = Object.freeze({
  data: null,
  loading: true,
  failed: false,
  error: null,
});

const browser: PolledEnvironment = {
  now: () => Date.now(),
  setTimer: (run, delay) => setTimeout(run, delay),
  clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
  hidden: () => typeof document !== "undefined" && document.hidden,
  onVisibility: (listener) => {
    if (typeof document === "undefined") return () => {};
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
};

const failure = (reason: unknown) =>
  reason instanceof Error && reason.message
    ? reason.message
    : "Não foi possível consultar agora.";
// ApiError carries the server's Retry-After; any error with the field works.
const retryAfter = (reason: unknown) => {
  const value = (reason as { retryAfterMs?: unknown } | null)?.retryAfterMs;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
};

export function createPolledStore<T>({
  load,
  retryMs,
  environment = browser,
}: {
  load: PolledLoad<T>;
  // Wait after a failure, unless the server sent Retry-After.
  retryMs: number;
  environment?: PolledEnvironment;
}): PolledStore<T> {
  let snapshot: PolledSnapshot<T> = initialSnapshot;
  const listeners = new Set<() => void>();
  let timer: unknown = null;
  let dueAt = 0;
  let interval: number = pollBounds.max;
  let request: AbortController | null = null;
  // reset() makes any answer still on its way irrelevant.
  let generation = 0;
  let stopVisibility: (() => void) | null = null;

  const emit = (next: PolledSnapshot<T>) => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };
  const clear = () => {
    if (timer !== null) environment.clearTimer(timer);
    timer = null;
  };
  const active = () => listeners.size > 0 && !environment.hidden();
  // Hidden tabs and screens without readers let the cycle lapse.
  const schedule = () => {
    clear();
    if (!active()) return;
    timer = environment.setTimer(tick, Math.max(0, dueAt - environment.now()));
  };
  function tick() {
    clear();
    if (!active()) return;
    if (environment.now() >= dueAt) void run();
    else schedule();
  }
  async function run() {
    if (request) return;
    const current = generation;
    const controller = new AbortController();
    request = controller;
    if (snapshot.data === null && !snapshot.loading)
      emit({ ...snapshot, loading: true });
    try {
      const result = await load(controller.signal);
      if (current !== generation) return;
      interval = clamp(result.refreshMs);
      dueAt = environment.now() + interval;
      emit({ data: result.data, loading: false, failed: false, error: null });
    } catch (reason) {
      if (current !== generation) return;
      dueAt =
        environment.now() +
        clamp(retryAfter(reason) ?? Math.min(interval, retryMs));
      emit({
        data: snapshot.data,
        loading: false,
        failed: true,
        error: failure(reason),
      });
    } finally {
      if (request === controller) request = null;
      if (current === generation) schedule();
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        stopVisibility = environment.onVisibility(tick);
        tick();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size) return;
        // A request already running still lands, so the next screen has it.
        clear();
        stopVisibility?.();
        stopVisibility = null;
      };
    },
    refresh() {
      dueAt = 0;
      clear();
      void run();
    },
    reset() {
      generation += 1;
      request?.abort();
      request = null;
      clear();
      dueAt = 0;
      interval = pollBounds.max;
      emit(initialSnapshot);
      tick();
    },
  };
}

// One store per key (a ticker, a series), created on first use. The oldest
// keys are forgotten past the limit; a screen still reading one keeps it.
export function keyedStores<T>(
  create: (key: string) => PolledStore<T>,
  limit = 24,
) {
  const stores = new Map<string, PolledStore<T>>();
  return (key: string) => {
    let store = stores.get(key);
    if (!store) {
      store = create(key);
      stores.set(key, store);
      if (stores.size > limit) stores.delete(stores.keys().next().value!);
    }
    return store;
  };
}
