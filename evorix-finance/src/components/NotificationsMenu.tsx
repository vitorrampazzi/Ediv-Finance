import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { useAuth } from "../context/authContext";
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
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("mousedown", close);
    };
  }, []);
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
        type="button"
        aria-label={
          "Notificações" +
          (data?.unreadCount ? " · " + data.unreadCount + " não lidas" : "")
        }
        aria-expanded={open}
        aria-controls="ediv-notifications"
        onClick={() => setOpen((value) => !value)}
        className="relative min-h-11 min-w-11 rounded-lg p-3"
      >
        <Bell size={20} />
        {Boolean(data?.unreadCount) && (
          <span className="absolute right-0 top-0 rounded-full bg-evo-primary px-1.5 text-[10px] text-white">
            {Math.min(data?.unreadCount || 0, 99)}
            {(data?.unreadCount || 0) > 99 ? "+" : ""}
          </span>
        )}
      </button>
      {open && (
        <section
          id="ediv-notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3 rounded-xl border border-evo-border bg-evo-card p-4 shadow-xl"
        >
          <h2 className="font-semibold">Notificações de pesquisas</h2>
          <p className="text-xs text-evo-textSec">
            Publicações desde seu cadastro. Exibimos as 20 mais recentes.
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
            <p className="text-sm text-evo-textSec">
              Nenhuma publicação nova desde seu cadastro.
            </p>
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
                    className="rounded-lg border border-evo-border p-3 text-sm"
                  >
                    <Link
                      className="block break-words text-evo-accent"
                      to={item.href}
                      onClick={() => {
                        setOpen(false);
                        void mark(item.id);
                      }}
                    >
                      {item.title} · {item.read ? "Lida" : "Nova"}
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
        </section>
      )}
    </div>
  );
}
