import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import "./navigation-chrome.css";

const typeLabels: Record<string, string> = {
  research: "Pesquisa",
  research_published: "Pesquisa",
  course: "Curso",
  course_published: "Curso",
  lesson: "Aula",
  lesson_published: "Aula",
};

function notificationDate(value: string) {
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function NotificationsMenu() {
  const { data, busy, error, authenticated, refresh, loadMore, mark, retry } =
    useNotifications();
  const { key: routeKey } = useLocation();
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const open = authenticated && menuRoute === routeKey;
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

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

  if (!authenticated) return null;
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
        <Bell size={20} aria-hidden="true" />
        {Boolean(data?.unreadCount) && (
          <span
            aria-hidden="true"
            className="ediv-notification-count absolute right-0 top-0 rounded-full px-1.5 text-[10px]"
          >
            {Math.min(data?.unreadCount || 0, 99)}
            {(data?.unreadCount || 0) > 99 ? "+" : ""}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            id="ediv-notifications"
            aria-label="Notificações"
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
            <h2 className="font-semibold">Notificações</h2>
            <p className="text-xs text-evo-textSec">
              Novas publicações de pesquisas, cursos e aulas.
            </p>
            {error && (
              <div role="alert" className="notice-error">
                <p>{error}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={retry}
                  className="min-h-11 underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {busy && (
              <p role="status" className="text-xs text-evo-textSec">
                Atualizando notificações…
              </p>
            )}
            {!data && !busy && !error && (
              <p role="status" className="text-sm">
                Carregando…
              </p>
            )}
            {data && !data.notifications.length && (
              <div className="ediv-notification-empty">
                <CheckCheck size={24} strokeWidth={1.5} aria-hidden="true" />
                <p className="font-medium">Tudo em dia.</p>
                <p className="text-sm text-evo-textSec">
                  Novas publicações aparecem por aqui.
                </p>
              </div>
            )}
            {data && data.notifications.length > 0 && (
              <>
                <button
                  type="button"
                  className="min-h-11 text-xs underline"
                  disabled={busy || !data.unreadCount}
                  onClick={() => mark()}
                >
                  Marcar todas como lidas
                </button>
                <ul className="space-y-2">
                  {data.notifications.map((item) => {
                    const date = notificationDate(item.createdAt);
                    return (
                      <li
                        key={item.id}
                        className={`ediv-notification-item p-3 text-sm ${item.read ? "" : "is-unread"}`}
                      >
                        <p className="text-xs text-evo-textSec">
                          {typeLabels[item.type] || item.type}
                        </p>
                        <Link
                          className="ediv-chrome-link block min-h-11 break-words text-evo-accent"
                          to={
                            item.href.startsWith("/") &&
                            !item.href.startsWith("//")
                              ? item.href
                              : "/app"
                          }
                          onClick={() => {
                            if (!item.read) mark(item.id);
                            setMenuRoute(null);
                          }}
                        >
                          {item.title}
                          {!item.read && (
                            <span className="ediv-notification-new">Nova</span>
                          )}
                        </Link>
                        <p className="mt-1 break-words text-sm text-evo-textSec">
                          {item.description}
                        </p>
                        {item.favoriteTickers.length > 0 && (
                          <p className="mt-1 text-xs">
                            Empresas citadas nesta atualização:{" "}
                            {item.favoriteTickers.join(", ")}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-evo-textSec">
                          {date ? (
                            <time dateTime={date.toISOString()}>
                              {date.toLocaleString("pt-BR")}
                            </time>
                          ) : (
                            "Data indisponível"
                          )}
                        </p>
                        {!item.read && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => mark(item.id)}
                            aria-label={`Marcar como lida: ${item.title}`}
                            className="min-h-11 text-xs underline"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {data?.nextCursor && (
              <button
                type="button"
                disabled={busy}
                onClick={loadMore}
                className="min-h-11 w-full text-sm underline"
              >
                Carregar mais notificações
              </button>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
