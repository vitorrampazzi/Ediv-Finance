import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/authContext";
import { ApiError, apiRequest } from "../lib/api";

export type Notification = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  favoriteTickers: string[];
  href: string;
  sourceId: string;
};
type Data = {
  notifications: Notification[];
  unreadCount: number;
  nextCursor: string | null;
};
type Action =
  | { kind: "refresh" }
  | { kind: "more"; cursor: string }
  | { kind: "read"; id?: string };
type State = {
  accountId?: string;
  data: Data | null;
  busy: boolean;
  error: string;
  failed: Action | null;
};
const empty: State = { data: null, busy: false, error: "", failed: null };

export function useNotifications() {
  const { user, loading, refreshSession } = useAuth();
  const accountId = !loading ? user?.id : undefined;
  const [state, setState] = useState<State>(empty);
  const commands = useRef<{
    refresh: () => void;
    more: () => void;
    mark: (id?: string) => void;
    retry: () => void;
  } | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let current: State = { ...empty, accountId };
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let blockedUntil = 0;
    let suspended = false;
    const pending: Action[] = [];
    let activeAction: Action | null = null;
    let retryPending: Action | null = null;

    function sameAction(a: Action | null, b: Action) {
      return (
        a?.kind === b.kind &&
        (a.kind !== "read" || (b.kind === "read" && a.id === b.id)) &&
        (a.kind !== "more" || (b.kind === "more" && a.cursor === b.cursor))
      );
    }
    function enqueue(action: Action) {
      if (
        !sameAction(activeAction, action) &&
        !sameAction(retryPending, action) &&
        !pending.some((item) => sameAction(item, action))
      )
        pending.push(action);
    }

    function update(values: Partial<State>) {
      if (disposed) return;
      current = { ...current, ...values };
      setState(current);
    }
    function schedule(delay = 60_000) {
      clearTimeout(timer);
      if (disposed || suspended || document.visibilityState !== "visible")
        return;
      timer = setTimeout(
        () => void run(retryPending ?? pending.shift() ?? { kind: "refresh" }),
        Math.min(2_147_483_647, Math.max(delay, blockedUntil - Date.now())),
      );
    }
    async function run(action: Action) {
      if (disposed) return;
      if (suspended || document.visibilityState !== "visible") {
        if (action.kind !== "refresh") enqueue(action);
        return;
      }
      if (controller) {
        enqueue(action);
        return;
      }
      if (Date.now() < blockedUntil) {
        enqueue(action);
        schedule(0);
        return;
      }
      if (retryPending && !sameAction(retryPending, action)) {
        enqueue(action);
        action = retryPending;
      }
      if (action.kind === "more") {
        const cursor = current.data?.nextCursor;
        if (!cursor) {
          retryPending = null;
          schedule(pending.length ? 0 : 60_000);
          return;
        }
        action = { kind: "more", cursor };
      }
      clearTimeout(timer);
      const request = new AbortController();
      controller = request;
      activeAction = action;
      update({ busy: true });
      try {
        if (action.kind === "read") {
          await apiRequest(
            "/api/notifications/" + (action.id ? "read" : "read-all"),
            {
              method: "POST",
              signal: request.signal,
              ...(action.id
                ? { body: JSON.stringify({ notificationId: action.id }) }
                : {}),
            },
          );
          if (request.signal.aborted) return;
          const data = current.data;
          if (data) {
            const wasUnread = data.notifications.some(
              (item) => item.id === action.id && !item.read,
            );
            update({
              data: {
                ...data,
                notifications: data.notifications.map((item) =>
                  !action.id || item.id === action.id
                    ? { ...item, read: true }
                    : item,
                ),
                unreadCount: action.id
                  ? Math.max(0, data.unreadCount - (wasUnread ? 1 : 0))
                  : 0,
              },
            });
          }
          enqueue({ kind: "refresh" });
        } else {
          const result = await apiRequest<Data>(
            "/api/notifications" +
              (action.kind === "more"
                ? "?cursor=" + encodeURIComponent(action.cursor)
                : ""),
            {
              signal: request.signal,
              cache: "no-store",
            },
          );
          if (request.signal.aborted) return;
          const previous = current.data;
          const items = new Map(
            previous?.notifications.map((item) => [item.id, item]),
          );
          const overlaps = result.notifications.some((item) =>
            items.has(item.id),
          );
          for (const item of result.notifications) {
            items.set(item.id, {
              ...item,
              read: item.read || Boolean(items.get(item.id)?.read),
            });
          }
          update({
            data: {
              notifications: [...items.values()].sort(
                (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
              ),
              unreadCount: result.unreadCount,
              nextCursor:
                action.kind === "refresh" && overlaps && previous
                  ? previous.nextCursor
                  : result.nextCursor,
            },
          });
        }
        failures = 0;
        blockedUntil = 0;
        retryPending = null;
        if (sameAction(current.failed, action))
          update({ error: "", failed: null });
      } catch (reason) {
        if (request.signal.aborted) return;
        failures += 1;
        const delay = Math.max(
          Math.min(300_000, 5000 * 2 ** Math.min(failures - 1, 6)),
          reason instanceof ApiError ? (reason.retryAfterMs ?? 0) : 0,
        );
        blockedUntil = Date.now() + delay;
        retryPending = action;
        const message =
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar as notificações.";
        update({
          error:
            message +
            " Tente novamente após " +
            new Date(blockedUntil).toLocaleTimeString("pt-BR") +
            ".",
          failed: action,
        });
        if (reason instanceof ApiError && reason.status === 401) {
          suspended = true;
          void refreshSession().catch(() => {});
        } else if (
          reason instanceof ApiError &&
          reason.status >= 400 &&
          reason.status < 500 &&
          reason.status !== 429
        ) {
          suspended = true;
        }
      } finally {
        controller = null;
        activeAction = null;
        update({ busy: false });
        schedule(pending.length || retryPending ? 0 : 60_000);
      }
    }
    const actions = {
      refresh: () => void run({ kind: "refresh" }),
      more: () => {
        const cursor = current.data?.nextCursor;
        if (cursor) void run({ kind: "more", cursor });
      },
      mark: (id?: string) => void run({ kind: "read", id }),
      retry: () => {
        suspended = false;
        void run(current.failed ?? { kind: "refresh" });
      },
    };
    commands.current = actions;
    const visibilityChanged = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") actions.refresh();
      else if (activeAction?.kind !== "read") controller?.abort();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    void run({ kind: "refresh" });
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (commands.current === actions) commands.current = null;
    };
  }, [accountId, refreshSession]);

  const refresh = useCallback(() => commands.current?.refresh(), []);
  const loadMore = useCallback(() => commands.current?.more(), []);
  const mark = useCallback((id?: string) => commands.current?.mark(id), []);
  const retry = useCallback(() => commands.current?.retry(), []);
  return {
    ...(state.accountId === accountId ? state : empty),
    authenticated: Boolean(accountId),
    refresh,
    loadMore,
    mark,
    retry,
  };
}
