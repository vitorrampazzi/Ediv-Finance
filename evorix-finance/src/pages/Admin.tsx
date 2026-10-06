import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, Search, RefreshCw, X } from "lucide-react";
import { useAuth } from "../context/authContext";
import { apiRequest, ApiError } from "../lib/api";
import { roleLabels } from "../lib/permissions";
import type { AuthUser } from "../context/AuthProvider";

type Role = AuthUser["role"];
interface Account extends Omit<AuthUser, "permissions"> {
  blocked: boolean;
}
interface UserList {
  users: Account[];
  total: number;
  page: number;
  pageSize: number;
}
interface Summary {
  total: number;
  verified: number;
  blocked: number;
  admins: number;
  analysts: number;
}
interface AccessState {
  role: Role;
  blocked: boolean;
}
interface AuditEvent {
  id: string;
  action: string;
  actor_name: string | null;
  target_name: string | null;
  created_at: string;
  before_state: AccessState | string | null;
  after_state: AccessState | string | null;
}
interface AuditList {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}
const input =
  "min-h-11 w-full rounded-lg border border-evo-border bg-evo-bgMain px-3 py-2 text-sm";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-evo-border px-4 py-2 text-sm disabled:opacity-50";
const date = (value: string) =>
  new Date(
    value.includes("T") ? value : value.replace(" ", "T") + "Z",
  ).toLocaleString("pt-BR");
const actions: Record<string, string> = {
  ROLE_CHANGED: "Perfil alterado",
  ACCOUNT_BLOCKED: "Conta bloqueada",
  ACCOUNT_UNBLOCKED: "Conta desbloqueada",
  ADMIN_BOOTSTRAPPED: "Primeiro Administrador configurado",
  LEGACY_STAFF_IMPORTED: "Acesso anterior migrado",
};
function describe(raw: AccessState | string | null) {
  const state: AccessState | null =
    typeof raw === "string" ? JSON.parse(raw) : raw;
  return state
    ? `${roleLabels[state.role]} · ${state.blocked ? "bloqueada" : "ativa"}`
    : "—";
}
function Pages({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p>
        {total} registro(s) · página {page} de {pages}
      </p>
      <div className="flex gap-2">
        <button
          className={button}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <button
          className={button}
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
function AccessEditor({
  account,
  onCancel,
  onSaved,
}: {
  account: Account;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { refreshSession } = useAuth();
  const [role, setRole] = useState<Role>(account.role);
  const [blocked, setBlocked] = useState(account.blocked);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const changed = role !== account.role || blocked !== account.blocked;
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ message: string }>(
        `/api/admin/users/${account.id}/access`,
        { method: "PATCH", body: JSON.stringify({ role, blocked }) },
      );
      onSaved(result.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o acesso.",
      );
      if (err instanceof ApiError && (err.status === 401 || err.status === 403))
        void refreshSession().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="access-heading"
      className="space-y-4 rounded-xl border border-evo-accent/50 bg-evo-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="access-heading"
            ref={heading}
            tabIndex={-1}
            className="text-lg font-semibold"
          >
            Acesso de {account.name}
          </h2>
          <p className="break-all text-sm text-evo-textSec">{account.email}</p>
        </div>
        <button
          aria-label="Fechar edição de acesso"
          className={button}
          disabled={busy}
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </div>
      {!review ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReview(true);
          }}
          className="space-y-4"
        >
          <label className="block text-sm">
            Perfil
            <select
              className={input + " mt-1"}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(Object.keys(roleLabels) as Role[]).map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value !== "USER" && !account.emailVerified}
                >
                  {roleLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-evo-textSec">
            Usuário usa os recursos pessoais. Analista publica pesquisas e
            responde atendimentos. Administrador também gerencia contas e
            acessos.
          </p>
          {!account.emailVerified && (
            <p className="text-sm text-evo-textSec">
              Essa conta precisa confirmar o e-mail antes de receber acesso à
              equipe.
            </p>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
            />{" "}
            Bloquear acesso desta conta
          </label>
          <button className={button} disabled={!changed}>
            Revisar alteração
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            De{" "}
            <strong>
              {describe({ role: account.role, blocked: account.blocked })}
            </strong>{" "}
            para <strong>{describe({ role, blocked })}</strong>.
          </p>
          <p className="text-sm text-evo-textSec">
            As sessões dessa conta serão encerradas. O titular precisará entrar
            novamente; uma conta bloqueada não poderá acessar os recursos
            privados.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={button + " bg-evo-primary text-white"}
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Salvando…" : "Confirmar alteração"}
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => setReview(false)}
            >
              Voltar à edição
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
    </section>
  );
}
export function AdminPage() {
  const { user, refreshSession } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Account | null>(null);
  const [message, setMessage] = useState("");
  const [snapshot, setSnapshot] = useState<{
    key: string;
    summary?: Summary;
    list?: UserList;
    error?: string;
  } | null>(null);
  const [audit, setAudit] = useState<{
    key: string;
    data?: AuditList;
    error?: string;
  } | null>(null);
  const params = new URLSearchParams({ page: String(page), q: query });
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  const requestPath = "/api/admin/users?" + params.toString();
  const key = `${user?.id}:${revision}:${requestPath}`;
  const auditKey = `${user?.id}:${revision}:${auditPage}`;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiRequest<Summary>("/api/admin/summary", { signal: controller.signal }),
      apiRequest<UserList>(requestPath, { signal: controller.signal }),
    ])
      .then(([summary, list]) => {
        if (!controller.signal.aborted) setSnapshot({ key, summary, list });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSnapshot({
          key,
          error:
            err instanceof Error
              ? err.message
              : "Não foi possível carregar os usuários.",
        });
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        )
          void refreshSession().catch(() => {});
      });
    return () => controller.abort();
  }, [requestPath, key, refreshSession]);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<AuditList>(`/api/admin/audit?page=${auditPage}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setAudit({ key: auditKey, data });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setAudit({
          key: auditKey,
          error:
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o histórico.",
        });
      });
    return () => controller.abort();
  }, [auditPage, auditKey]);
  const current = snapshot?.key === key ? snapshot : null;
  const history = audit?.key === auditKey ? audit : null;
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm text-evo-accent">
            <ShieldCheck size={18} /> Área administrativa
          </p>
          <h1 className="text-2xl font-bold">Contas e permissões</h1>
          <p className="mt-2 max-w-2xl text-sm text-evo-textSec">
            Gerencie os acessos da equipe e dos usuários. Alterações de acesso
            ficam registradas no histórico.
          </p>
        </div>
        <button
          className={button}
          onClick={() => {
            setRevision((value) => value + 1);
            setSelected(null);
          }}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>
      {message && (
        <p role="status" className="notice-success">
          {message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(
          [
            ["total", "Contas"],
            ["verified", "E-mails confirmados"],
            ["analysts", "Analistas ativos"],
            ["admins", "Administradores ativos"],
            ["blocked", "Contas bloqueadas"],
          ] as const
        ).map(([field, label]) => (
          <div
            key={field}
            className="rounded-xl border border-evo-border bg-evo-card p-4"
          >
            <p className="text-xs text-evo-textSec">{label}</p>
            <p className="mt-2 font-numbers text-2xl font-semibold">
              {current?.summary?.[field] ?? "—"}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className={button} to="/app/ranking">
          Preparar pesquisa
        </Link>
        <Link className={button} to="/app/atendimentos">
          Atendimentos
        </Link>
      </div>
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users size={20} /> Usuários
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="relative">
            <span className="sr-only">Buscar por nome ou e-mail</span>
            <Search size={17} className="absolute top-3 left-3" />
            <input
              className={input + " pl-10"}
              value={search}
              maxLength={120}
              placeholder="Nome ou e-mail"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar perfil"
            className={input}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
              setSelected(null);
            }}
          >
            <option value="">Todos os perfis</option>
            {(Object.keys(roleLabels) as Role[]).map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar situação"
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
              setSelected(null);
            }}
          >
            <option value="">Todas as situações</option>
            <option value="active">Ativas e confirmadas</option>
            <option value="pending">E-mail pendente</option>
            <option value="blocked">Bloqueadas</option>
          </select>
        </div>
        {selected && (
          <AccessEditor
            key={selected.id}
            account={selected}
            onCancel={() => setSelected(null)}
            onSaved={(value) => {
              setMessage(value);
              setSelected(null);
              setRevision((value) => value + 1);
            }}
          />
        )}
        {!current ? (
          <p role="status">Carregando usuários…</p>
        ) : current.error ? (
          <p role="alert" className="notice-error">
            {current.error}
          </p>
        ) : (
          current.list && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {current.list.users.map((account) => (
                  <article
                    key={account.id}
                    className="min-w-0 space-y-3 rounded-xl border border-evo-border bg-evo-card p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">{account.name}</h3>
                      <span className="text-xs text-evo-accent">
                        {roleLabels[account.role]}
                        {account.id === user?.id ? " · Sua conta" : ""}
                      </span>
                    </div>
                    <p className="break-all text-sm text-evo-textSec">
                      {account.email}
                    </p>
                    <p className="text-xs text-evo-textSec">
                      {account.blocked
                        ? "Bloqueada"
                        : account.emailVerified
                          ? "Ativa · E-mail confirmado"
                          : "Aguardando confirmação do e-mail"}
                      <br />
                      Cadastro: {date(account.createdAt)}
                    </p>
                    <button
                      className={button}
                      disabled={account.id === user?.id}
                      onClick={() => {
                        setSelected(account);
                        setMessage("");
                      }}
                    >
                      {account.id === user?.id
                        ? "Seu acesso está protegido"
                        : "Gerenciar acesso"}
                    </button>
                  </article>
                ))}
              </div>
              {!current.list.users.length && (
                <p className="rounded-xl border border-evo-border p-5 text-sm">
                  Nenhuma conta corresponde aos filtros.
                </p>
              )}
              <Pages
                {...current.list}
                onPage={(value) => {
                  setPage(value);
                  setSelected(null);
                }}
              />
            </>
          )
        )}
      </section>
      <section className="space-y-4 border-t border-evo-border pt-6">
        <h2 className="text-lg font-semibold">Histórico de acessos</h2>
        <p className="text-xs text-evo-textSec">
          Registra quem alterou o perfil ou bloqueio e quando. Dados de contas
          excluídas deixam de ser identificados aqui.
        </p>
        {!history ? (
          <p role="status">Carregando histórico…</p>
        ) : history.error ? (
          <p role="alert" className="notice-error">
            {history.error}
          </p>
        ) : (
          history.data && (
            <>
              <div className="space-y-3">
                {history.data.events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-xl border border-evo-border bg-evo-card p-4 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">
                        {actions[event.action] || event.action}
                      </h3>
                      <time className="text-xs text-evo-textSec">
                        {date(event.created_at)}
                      </time>
                    </div>
                    <p className="mt-2">
                      Conta: {event.target_name || "Conta excluída"} ·
                      Responsável:{" "}
                      {event.actor_name ||
                        "Configuração inicial / conta excluída"}
                    </p>
                    <p className="mt-1 text-xs text-evo-textSec">
                      {describe(event.before_state)} →{" "}
                      {describe(event.after_state)}
                    </p>
                  </article>
                ))}
              </div>
              {!history.data.events.length && (
                <p className="text-sm text-evo-textSec">
                  Nenhuma alteração registrada.
                </p>
              )}
              <Pages {...history.data} onPage={setAuditPage} />
            </>
          )
        )}
      </section>
    </section>
  );
}
