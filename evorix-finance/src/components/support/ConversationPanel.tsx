import { useState } from "react";
import type { RefObject } from "react";
import {
  ArrowDownLeft,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { supportDate, supportSubject } from "../../lib/support";
import type { SupportConversation } from "../../lib/support";
import { formatMoney } from "../../lib/finance";
import { SupportStatus } from "./SupportStatus";

export function ConversationPanel({
  conversation,
  selected,
  loading,
  error,
  busy,
  staff,
  userId,
  onReply,
  onRefresh,
  onRevoke,
  panelRef,
}: {
  conversation: SupportConversation | null;
  selected: string;
  loading: boolean;
  error: string;
  busy: boolean;
  staff: boolean;
  userId?: string;
  onReply: (body: string, status: string) => Promise<boolean>;
  onRefresh: () => void;
  onRevoke: () => void;
  panelRef?: RefObject<HTMLElement | null>;
}) {
  const [drafts, setDrafts] = useState<
    Record<string, { body: string; status: string }>
  >({});
  const reply = drafts[selected]?.body || "";
  const status = drafts[selected]?.status || "ANSWERED";
  const updateDraft = (changes: Partial<{ body: string; status: string }>) => {
    setDrafts((current) => ({
      ...current,
      [selected]: {
        body: current[selected]?.body || "",
        status: current[selected]?.status || "ANSWERED",
        ...changes,
      },
    }));
  };
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className="min-w-0 scroll-mt-24 border border-evo-border bg-evo-card/45 p-4 sm:p-6"
      aria-label="Conversa selecionada"
      aria-busy={loading}
    >
      {!selected ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-2 text-center">
          <MessageCircle
            size={42}
            strokeWidth={1.1}
            className="text-evo-accent"
            aria-hidden="true"
          />
          <h3 className="mt-5 text-xl font-semibold">
            {staff
              ? "Cada pergunta tem uma história"
              : "Um espaço para suas dúvidas"}
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-evo-textSec">
            {staff
              ? "Selecione um atendimento para ler o contexto e responder ao aluno."
              : "Selecione uma conversa para retomar o assunto. Perguntas e respostas ficam juntas, do começo ao fim."}
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-xs text-evo-textSec">
            <ArrowDownLeft size={14} aria-hidden="true" />
            Escolha um assunto na lista
          </span>
        </div>
      ) : loading ? (
        <p role="status" className="min-h-60 py-10 text-sm text-evo-textSec">
          Carregando conversa…
        </p>
      ) : error ? (
        <div role="alert" className="notice-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="mt-3 action-secondary"
          >
            Tentar abrir novamente
          </button>
        </div>
      ) : !conversation ? (
        <div className="py-10 text-sm text-evo-textSec">
          <p>A conversa não está disponível agora.</p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="mt-3 action-secondary"
          >
            Atualizar conversa
          </button>
        </div>
      ) : (
        <>
          <header className="space-y-3 border-b border-evo-border pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-evo-textSec">
                {supportSubject(conversation.thread.subject).topic?.title ||
                  "Conversa com a equipe"}
              </p>
              <SupportStatus status={conversation.thread.status} />
            </div>
            <h3 className="break-words text-xl font-semibold [overflow-wrap:anywhere]">
              {supportSubject(conversation.thread.subject).title}
            </h3>
            <p className="text-xs text-evo-textSec">
              Atualizada em {supportDate(conversation.thread.updated_at)}
            </p>
          </header>
          {conversation.thread.user_id === userId &&
            conversation.thread.share_portfolio && (
              <div className="mt-4 border border-evo-border p-3 text-xs">
                <p>Acesso autorizado a registros de versões anteriores.</p>
                <button
                  type="button"
                  disabled={busy}
                  className="mt-2 min-h-11 underline"
                  onClick={onRevoke}
                >
                  Revogar acesso aos registros
                </button>
              </div>
            )}
          <ol
            className="my-6 max-h-[34rem] space-y-5 overflow-y-auto"
            aria-label="Mensagens da conversa"
          >
            {conversation.messages.map((message) => (
              <li
                key={message.id}
                className={
                  "min-w-0 " +
                  (message.is_staff ? "mr-3 sm:mr-10" : "ml-3 sm:ml-10")
                }
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-evo-textSec">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {message.is_staff && (
                      <ShieldCheck
                        size={13}
                        className="text-evo-accent"
                        aria-hidden="true"
                      />
                    )}
                    {message.is_staff
                      ? "Equipe Ediv"
                      : staff
                        ? "Aluno"
                        : "Você"}
                  </span>
                  <span>{supportDate(message.created_at)}</span>
                </div>
                <div
                  className={
                    "border px-4 py-3 " +
                    (message.is_staff
                      ? "border-evo-accent/25 bg-evo-primary/15"
                      : "border-evo-border bg-evo-bgMain/55")
                  }
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">
                    {message.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {staff && conversation.portfolio && (
            <details className="mb-5 border border-evo-border p-3 text-xs">
              <summary className="min-h-9 cursor-pointer">
                Operações compartilhadas pelo titular (
                {conversation.portfolio.length})
              </summary>
              <ul className="max-h-56 overflow-auto">
                {conversation.portfolio.map((operation, index) => (
                  <li className="mt-2 break-words" key={index}>
                    {operation.ticker} · {operation.side} · {operation.quantity}{" "}
                    · {formatMoney(operation.unit_price)}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <form
            className="space-y-4 border-t border-evo-border pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              const threadId = selected;
              void onReply(reply.trim(), status).then((saved) => {
                if (saved)
                  setDrafts((current) => ({
                    ...current,
                    [threadId]: {
                      body: "",
                      status: current[threadId]?.status || "ANSWERED",
                    },
                  }));
              });
            }}
          >
            <label className="block text-sm font-medium">
              {staff ? "Resposta da equipe" : "Continuar conversa"}
              <textarea
                className="field mt-2 min-h-28 py-3"
                required
                minLength={2}
                maxLength={3000}
                disabled={busy}
                value={reply}
                onChange={(e) => updateDraft({ body: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-evo-textSec">
              <span>Não inclua senhas ou dados bancários.</span>
              <span>{reply.length}/3.000</span>
            </div>
            {staff && (
              <label className="block text-sm">
                Situação após responder
                <select
                  className="field mt-2"
                  value={status}
                  disabled={busy}
                  onChange={(e) => updateDraft({ status: e.target.value })}
                >
                  <option value="IN_PROGRESS">Em atendimento</option>
                  <option value="ANSWERED">Respondida</option>
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="action"
                disabled={busy || reply.trim().length < 2}
              >
                <Send size={15} aria-hidden="true" />
                {staff ? "Enviar resposta da equipe" : "Enviar mensagem"}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 text-sm text-evo-textSec underline underline-offset-4"
                disabled={busy}
                onClick={onRefresh}
              >
                <RefreshCw size={14} aria-hidden="true" />
                Buscar novas respostas
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
