import { useId, useState } from "react";
import { Inbox, RefreshCw, Search, ArrowUpRight } from "lucide-react";
import {
  normalizeSupportSearch,
  supportDate,
  supportStatuses,
  supportSubject,
} from "../../lib/support";
import type { SupportThread } from "../../lib/support";
import { SupportStatus } from "./SupportStatus";

export function ConversationInbox({
  threads,
  selected,
  loading,
  error,
  busy,
  teamView,
  onSelect,
  onRefresh,
}: {
  threads: SupportThread[];
  selected: string;
  loading: boolean;
  error: string;
  busy: boolean;
  teamView: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const searchId = useId();
  const statusId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const terms = normalizeSupportSearch(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const filtered = threads.filter((thread) => {
    const text = normalizeSupportSearch(
      thread.subject + " " + (teamView ? thread.name || "" : ""),
    );
    return (
      (!status || thread.status === status) &&
      terms.every((term) => text.includes(term))
    );
  });
  return (
    <aside
      className="min-w-0 space-y-4 border border-evo-border bg-evo-bgSec/40 p-4 sm:p-5"
      aria-label={
        teamView ? "Fila de atendimentos" : "Lista de minhas conversas"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {teamView ? "Fila da equipe" : "Minhas conversas"}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy || loading}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs text-evo-textSec underline underline-offset-4"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Atualizar
        </button>
      </div>
      <div>
        <label
          htmlFor={searchId}
          className="mb-2 block text-xs text-evo-textSec"
        >
          {teamView ? "Buscar assunto ou aluno" : "Buscar conversa"}
        </label>
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-evo-textSec"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={160}
            className="field pl-9"
            placeholder={teamView ? "Assunto ou nome" : "Digite o assunto"}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={statusId}
          className="mb-2 block text-xs text-evo-textSec"
        >
          Filtrar por situação
        </label>
        <select
          id={statusId}
          className="field"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as situações</option>
          {Object.entries(supportStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div role="alert" className="notice-error">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 min-h-11 text-sm underline"
            disabled={busy}
            onClick={onRefresh}
          >
            Tentar carregar novamente
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="py-8 text-sm text-evo-textSec">
          Carregando suas conversas…
        </p>
      ) : !threads.length && !error ? (
        <div className="py-8 text-sm text-evo-textSec">
          <Inbox size={30} strokeWidth={1.3} aria-hidden="true" />
          <p className="mt-3 font-medium text-evo-textMain">
            {teamView
              ? "Nenhum atendimento recebido"
              : "Sua primeira conversa começa aqui"}
          </p>
          <p className="mt-2 leading-relaxed">
            {teamView
              ? "As perguntas dos alunos aparecerão nesta fila."
              : "Envie uma pergunta pelo formulário e acompanhe o retorno neste espaço."}
          </p>
        </div>
      ) : !filtered.length && !error ? (
        <div className="py-6 text-sm text-evo-textSec">
          <p>Nenhuma conversa corresponde aos filtros.</p>
          <button
            type="button"
            className="mt-2 min-h-11 underline"
            onClick={() => {
              setQuery("");
              setStatus("");
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul
          className="max-h-[34rem] space-y-2 overflow-y-auto"
          aria-label={
            teamView ? "Atendimentos disponíveis" : "Conversas disponíveis"
          }
        >
          {filtered.map((thread) => {
            const { title, topic } = supportSubject(thread.subject);
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={thread.id === selected}
                  onClick={() => onSelect(thread.id)}
                  className={
                    "w-full min-w-0 border-l-2 px-3 py-4 text-left transition-colors disabled:cursor-wait " +
                    (thread.id === selected
                      ? "border-evo-accent bg-evo-primary/20"
                      : "border-transparent bg-evo-bgMain/50 hover:bg-evo-bgMain")
                  }
                >
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">
                      {title}
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-evo-textSec"
                      aria-hidden="true"
                    />
                  </div>
                  {teamView && (
                    <p className="mt-2 break-words text-xs text-evo-textSec [overflow-wrap:anywhere]">
                      {thread.name || "Aluno"}
                    </p>
                  )}
                  {topic && (
                    <p className="mt-2 text-xs text-evo-textSec">
                      {topic.title}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <SupportStatus status={thread.status} />
                    <span className="text-[11px] text-evo-textSec">
                      {supportDate(thread.updated_at)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && threads.length > 0 && (
        <p
          className="border-t border-evo-border pt-3 text-xs leading-relaxed text-evo-textSec"
          role="status"
        >
          {filtered.length} de {threads.length} conversas exibidas.
          {threads.length === 100 &&
            " A busca considera as 100 conversas mais recentes."}
        </p>
      )}
    </aside>
  );
}
