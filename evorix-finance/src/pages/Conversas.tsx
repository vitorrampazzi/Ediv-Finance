import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Card } from "../components/Card";
import { apiRequest, ApiError } from "../lib/api";
import { formatMoney } from "../lib/finance";
import { useAuth } from "../context/authContext";
import { userCan } from "../lib/permissions";
type Thread = {
  id: string;
  subject: string;
  status: string;
  share_portfolio: boolean;
  user_id: string;
  updated_at: string;
  name?: string;
};
type Conversation = {
  thread: Thread;
  messages: {
    id: string;
    is_staff: boolean;
    body: string;
    created_at: string;
  }[];
  portfolio:
    | null
    | { ticker: string; side: string; quantity: string; unit_price: string }[];
};
const statuses: Record<string, string> = {
  RECEIVED: "Recebida",
  IN_PROGRESS: "Em atendimento",
  ANSWERED: "Respondida",
};
export function Conversas({ teamView = false }: { teamView?: boolean }) {
  const { user } = useAuth();
  return (
    <MemberConversations
      teamView={teamView}
      key={user?.id + ":" + user?.role + ":" + teamView}
    />
  );
}
function MemberConversations({ teamView }: { teamView: boolean }) {
  const { user, refreshSession } = useAuth();
  const staff = teamView && userCan(user, "support:manage");
  const apiBase = teamView ? "/api/support/team" : "/api/support";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("ANSWERED");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const list = async () => {
    const data = await apiRequest<{ threads: Thread[]; canManage: boolean }>(
      apiBase,
    );
    setThreads(data.threads);
  };
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ threads: Thread[]; canManage: boolean }>(apiBase, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setThreads(data.threads);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
        if (
          !controller.signal.aborted &&
          reason instanceof ApiError &&
          (reason.status === 401 || reason.status === 403)
        )
          void refreshSession().catch(() => {});
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [apiBase, refreshSession]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    apiRequest<Conversation>(apiBase + "/" + selected, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setConversation(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
        if (
          !controller.signal.aborted &&
          reason instanceof ApiError &&
          (reason.status === 401 || reason.status === 403)
        )
          void refreshSession().catch(() => {});
      });
    return () => controller.abort();
  }, [apiBase, selected, refreshSession]);
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (reason) {
      if (
        reason instanceof ApiError &&
        (reason.status === 401 || reason.status === 403)
      )
        void refreshSession().catch(() => {});
      setError(
        reason instanceof Error ? reason.message : "Não foi possível concluir.",
      );
    } finally {
      setBusy(false);
    }
  };
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void act(async () => {
      const result = await apiRequest<{ id: string }>("/api/support", {
        method: "POST",
        body: JSON.stringify({ subject, body, sharePortfolio: false }),
      });
      setSubject("");
      setBody("");
      setConversation(null);
      setSelected(result.id);
      await list();
    });
  };
  const visible = conversation?.thread.id === selected ? conversation : null;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {staff ? "Atendimentos da equipe" : "Conversas com a equipe"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-evo-textSec">
          {staff
            ? "Você pode responder às dúvidas e acompanhar os atendimentos dos alunos. "
            : "Você pode deixar perguntas a qualquer hora. "}
          A equipe responde conforme a disponibilidade; o horário de atendimento
          ainda será informado. Este canal não representa assinatura ativa nem
          aconselhamento automático por IA.
        </p>
      </header>
      {error && (
        <p role="alert" className="notice-error">
          {error}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-5">
          {!teamView && (
            <Card glow="none">
              <h2 className="font-semibold">Nova conversa</h2>
              <form onSubmit={create} className="mt-4 space-y-4">
                <label className="block text-sm">
                  Assunto
                  <input
                    className="field mt-1"
                    required
                    minLength={3}
                    maxLength={160}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Sua mensagem
                  <textarea
                    className="field mt-1 min-h-28 py-3"
                    required
                    minLength={2}
                    maxLength={3000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <p className="text-xs text-evo-textSec">
                  Não envie senhas, CPF ou dados bancários.
                </p>
                <button className="action" disabled={busy}>
                  Enviar pergunta
                </button>
              </form>
            </Card>
          )}
          <Card glow="none">
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">
                {staff ? "Fila da equipe" : "Minhas conversas"}
              </h2>
              <button
                className="min-h-11 text-xs underline"
                disabled={busy}
                onClick={() => void act(list)}
              >
                Atualizar
              </button>
            </div>
            {loading ? (
              <p role="status" className="text-sm">
                Carregando…
              </p>
            ) : !threads.length ? (
              <p className="mt-3 text-sm text-evo-textSec">Nenhuma conversa.</p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-2 overflow-auto">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      className={
                        "w-full rounded-lg border p-3 text-left text-sm " +
                        (selected === t.id
                          ? "border-evo-accent"
                          : "border-evo-border")
                      }
                      onClick={() => {
                        setSelected(t.id);
                        setReply("");
                        setError("");
                      }}
                    >
                      <span className="block font-semibold">{t.subject}</span>
                      <span className="mt-1 block text-xs text-evo-textSec">
                        {statuses[t.status]}
                        {staff ? " · " + t.name : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card glow="none">
          {!selected ? (
            <p className="text-sm text-evo-textSec">
              Selecione uma conversa para acompanhar as respostas.
            </p>
          ) : !visible ? (
            <p role="status" className="text-sm">
              Carregando conversa…
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg font-semibold">
                  {visible.thread.subject}
                </h2>
                <span className="rounded-full border border-evo-border px-3 py-1 text-xs">
                  {statuses[visible.thread.status]}
                </span>
              </div>
              {visible.thread.user_id === user?.id &&
                visible.thread.share_portfolio && (
                  <label className="mt-4 flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={Boolean(visible.thread.share_portfolio)}
                      onChange={(e) => {
                        const value = e.target.checked;
                        void act(async () => {
                          await apiRequest(
                            "/api/support/" + selected + "/consent",
                            {
                              method: "PATCH",
                              body: JSON.stringify({ sharePortfolio: value }),
                            },
                          );
                          setConversation((current) =>
                            current
                              ? {
                                  ...current,
                                  thread: {
                                    ...current.thread,
                                    share_portfolio: value,
                                  },
                                  portfolio: null,
                                }
                              : null,
                          );
                        });
                      }}
                    />
                    Acesso autorizado a registros de versões anteriores.
                    Desmarque para revogar.
                  </label>
                )}
              <ol
                className="my-5 max-h-[32rem] space-y-3 overflow-auto"
                aria-label="Mensagens da conversa"
              >
                {visible.messages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-evo-border bg-evo-bgMain p-4"
                  >
                    <p className="text-xs font-semibold text-evo-accent">
                      {m.is_staff ? "Equipe Ediv" : "Titular da conta"} ·{" "}
                      {new Date(
                        m.created_at.replace(" ", "T") + "Z",
                      ).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {m.body}
                    </p>
                  </li>
                ))}
              </ol>
              {staff && visible.portfolio && (
                <details className="mb-5 rounded-lg border border-evo-border p-3 text-xs">
                  <summary className="min-h-9 cursor-pointer">
                    Operações compartilhadas pelo titular (
                    {visible.portfolio.length})
                  </summary>
                  <ul className="max-h-56 overflow-auto">
                    {visible.portfolio.map((p, i) => (
                      <li className="mt-2" key={i}>
                        {p.ticker} · {p.side} · {p.quantity} ·{" "}
                        {formatMoney(p.unit_price)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(async () => {
                    await apiRequest(apiBase + "/" + selected + "/messages", {
                      method: "POST",
                      body: JSON.stringify({
                        body: reply,
                        ...(staff ? { status } : {}),
                      }),
                    });
                    setReply("");
                    setConversation(
                      await apiRequest<Conversation>(apiBase + "/" + selected),
                    );
                    await list();
                  });
                }}
              >
                <label className="block text-sm">
                  {staff ? "Resposta da equipe" : "Continuar conversa"}
                  <textarea
                    className="field mt-2 min-h-28 py-3"
                    required
                    minLength={2}
                    maxLength={3000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                {staff && (
                  <label className="block text-sm">
                    Situação após responder
                    <select
                      className="field mt-1"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="IN_PROGRESS">Em atendimento</option>
                      <option value="ANSWERED">Respondida</option>
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-3">
                  <button className="action" disabled={busy}>
                    {staff ? "Enviar resposta da equipe" : "Enviar mensagem"}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 px-3 text-sm underline"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        setConversation(
                          await apiRequest<Conversation>(
                            apiBase + "/" + selected,
                          ),
                        );
                      })
                    }
                  >
                    Buscar novas respostas
                  </button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
