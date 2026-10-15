import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { useAuth } from "../context/authContext";
import "./navigation-chrome.css";
type Data = {
  unreadCount: number;
  notifications: {
    id: string;
    title: string;
    createdAt: string;
    read: boolean;
    favoriteTickers: string[];
    href: string;
  }[];
};
export function NotificationsMenu() {
  const { refreshSession } = useAuth();
  const { key: routeKey } = useLocation();
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const open = menuRoute === routeKey;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Data>("/api/notifications", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        if (err instanceof ApiError && err.status === 401)
          void refreshSession().catch(() => {});
      });
    return () => controller.abort();
  }, [open, revision, refreshSession]);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setMenuRoute(null);
        trigger.current?.focus();
      } else if (!ref.current?.contains(event.target as Node)) {
        setMenuRoute(null);
      }
    };
    const closeOnBack = () => setMenuRoute(null);
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    document.addEventListener("focusin", close);
    window.addEventListener("popstate", closeOnBack);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("focusin", close);
      window.removeEventListener("popstate", closeOnBack);
    };
  }, [open]);
  async function mark(id?: string) {
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/notifications/" + (id ? "read" : "read-all"), {
        method: "POST",
        ...(id ? { body: JSON.stringify({ publicationId: id }) } : {}),
      });
      setRevision((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao marcar notificação.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="relative" ref={ref}>
      <button
        ref={trigger}
        type="button"
        aria-label={
          "Notificações" +
          (data?.unreadCount ? " · " + data.unreadCount + " não lidas" : "")
        }
        aria-expanded={open}
        aria-controls="ediv-notifications"
        onClick={() => setMenuRoute(open ? null : routeKey)}
        className="ediv-chrome-icon relative min-h-11 min-w-11 p-3"
      >
        <Bell size={20} />
        {Boolean(data?.unreadCount) && (
          <span className="ediv-notification-count absolute right-0 top-0 rounded-full px-1.5 text-[10px]">
            {Math.min(data?.unreadCount || 0, 99)}
            {(data?.unreadCount || 0) > 99 ? "+" : ""}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            id="ediv-notifications"
            aria-label="Notificações de pesquisas"
            initial={{
              opacity: 0,
              y: reducedMotion ? 0 : -5,
              scale: reducedMotion ? 1 : 0.97,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -5,
              scale: reducedMotion ? 1 : 0.97,
            }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: reducedMotion ? 0.12 : 0.25,
            }}
            className="ediv-chrome-popover ediv-notifications-popover fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-10rem-env(safe-area-inset-bottom))] overflow-y-auto space-y-3 p-4 md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-[22rem]"
          >
            <h2 className="font-semibold">Notificações de pesquisas</h2>
            <p className="text-xs text-evo-textSec">
              Últimas publicações desde seu cadastro.
            </p>
            {error && (
              <p role="alert" className="notice-error">
                {error}
              </p>
            )}
            {!data ? (
              <p role="status" className="text-sm">
                Carregando…
              </p>
            ) : !data.notifications.length ? (
              <div className="ediv-notification-empty">
                <CheckCheck size={24} strokeWidth={1.5} aria-hidden="true" />
                <p className="font-medium">Tudo em dia.</p>
                <p className="text-sm text-evo-textSec">
                  Novas pesquisas aparecem por aqui.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="min-h-11 text-xs underline"
                  disabled={busy || !data.unreadCount}
                  onClick={() => void mark()}
                >
                  Marcar todas como lidas
                </button>
                <ul className="max-h-80 space-y-2 overflow-auto">
                  {data.notifications.map((item) => (
                    <li
                      key={item.id}
                      className={`ediv-notification-item p-3 text-sm ${item.read ? "" : "is-unread"}`}
                    >
                      <Link
                        className="ediv-chrome-link block min-h-11 break-words text-evo-accent"
                        to={item.href}
                        onClick={() => {
                          setMenuRoute(null);
                          void mark(item.id);
                        }}
                      >
                        {item.title}
                        {!item.read && (
                          <span className="ediv-notification-new">Nova</span>
                        )}
                      </Link>
                      {item.favoriteTickers.length > 0 && (
                        <p className="mt-1 text-xs">
                          Empresas citadas nesta atualização:{" "}
                          {item.favoriteTickers.join(", ")}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-evo-textSec">
                        {new Date(
                          item.createdAt.replace(" ", "T") + "Z",
                        ).toLocaleString("pt-BR")}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
