import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  Headphones,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/authContext";
import { useSupportConversations } from "../hooks/useSupportConversations";
import { useSupportInformation } from "../hooks/useSupportInformation";
import { helpTopics } from "../lib/supportHelp";
import { userCan } from "../lib/permissions";
import { ConversationInbox } from "../components/support/ConversationInbox";
import { ConversationPanel } from "../components/support/ConversationPanel";
import { SupportHelpCenter } from "../components/support/SupportHelpCenter";

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
  const { user } = useAuth();
  const staff = teamView && userCan(user, "support:manage");
  const support = useSupportConversations(teamView);
  const { info } = useSupportInformation();
  const [params] = useSearchParams();
  const initialTopic = helpTopics.find(
    (topic) => topic.id === params.get("topic"),
  );
  const [topicId, setTopicId] = useState<string>(() => initialTopic?.id || "");
  const [subject, setSubject] = useState(
    () => initialTopic?.suggestedSubject || "",
  );
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const topic = helpTopics.find((item) => item.id === topicId);
  const subjectLimit = 160 - (topic ? topic.title.length + 3 : 0);
  const counts = support.threads.reduce(
    (result, thread) => {
      if (thread.status === "ANSWERED") result.answered++;
      else if (thread.status === "IN_PROGRESS") result.progress++;
      else result.waiting++;
      return result;
    },
    { waiting: 0, progress: 0, answered: 0 },
  );
  const prepareTopic = (id: string) => {
    const nextTopic = helpTopics.find((item) => item.id === id);
    if (!nextTopic) return;
    setTopicId(nextTopic.id);
    if (!subject.trim() || subject === topic?.suggestedSubject)
      setSubject(nextTopic.suggestedSubject);
    setFormError("");
  };
  const focusForm = (id?: string) => {
    if (support.busy) return;
    if (id) prepareTopic(id);
    subjectRef.current?.focus({ preventScroll: true });
    formRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="border-b border-evo-border pb-7">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-evo-accent">
          <Headphones size={16} aria-hidden="true" />
          {staff ? "Área da equipe" : "Central de ajuda"}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {staff ? "Atendimentos da equipe" : "Dúvidas e suporte"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-evo-textSec">
              {staff
                ? "Leia o contexto de cada pergunta, acompanhe a fila e ajude os alunos a entender as pesquisas e as aulas."
                : "Entenda as ferramentas, encontre uma resposta rápida e converse com a equipe quando precisar de mais contexto."}
            </p>
            {!teamView && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="action"
                  disabled={support.busy}
                  onClick={() => focusForm()}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  Enviar uma pergunta
                </button>
                <a
                  href="#suas-conversas"
                  className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-evo-textSec underline underline-offset-4"
                >
                  Acompanhar minhas conversas
                  <ArrowDown size={15} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
          <aside
            className="min-w-0 border-l-2 border-evo-accent/40 pl-5 text-sm"
            aria-label="Como funciona o atendimento"
          >
            <p className="inline-flex items-center gap-2 font-medium">
              <ShieldCheck
                size={17}
                className="text-evo-accent"
                aria-hidden="true"
              />
              {staff ? "Atendimento com contexto" : "Sua conversa é privada"}
            </p>
            <p className="mt-2 leading-relaxed text-evo-textSec">
              {staff
                ? "Cada resposta é identificada como equipe Ediv. O aluno acompanha as atualizações na mesma conversa."
                : "Você e a equipe autorizada têm acesso às mensagens. Envie perguntas a qualquer hora e acompanhe o retorno aqui."}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
              {info?.hours
                ? "Horário de resposta: " + info.hours
                : "As respostas seguem a disponibilidade da equipe. O horário de atendimento ainda será informado."}
            </p>
          </aside>
        </div>
      </header>

      {!teamView && <SupportHelpCenter onContact={(id) => focusForm(id)} />}

      {!teamView && (
        <section
          ref={formRef}
          id="nova-conversa"
          aria-labelledby="new-conversation-title"
          className="scroll-mt-24 border-t border-evo-border pt-7"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-evo-accent">
                Converse com a equipe
              </p>
              <h2
                id="new-conversation-title"
                className="mt-2 text-2xl font-semibold"
              >
                O que você quer entender?
              </h2>
              <p className="mt-3 text-sm leading-7 text-evo-textSec">
                Escolha um tema e explique sua dúvida. Se ela for sobre uma
                empresa ou aula, informe o código da ação ou o título do
                conteúdo.
              </p>
              {topicId === "tecnico" && (
                <p className="mt-4 border-l-2 border-evo-border pl-4 text-sm leading-relaxed text-evo-textSec">
                  Para localizar uma falha, conte a página, seu dispositivo,
                  navegador, o horário aproximado e os passos que você seguiu.
                </p>
              )}
              <p className="mt-5 text-xs leading-relaxed text-evo-textSec">
                Já existe uma conversa sobre esse assunto? Continue nela para
                manter o contexto das respostas.
              </p>
            </div>
            <form
              className="min-w-0 space-y-4 border border-evo-border bg-evo-bgSec/40 p-4 sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                const cleanSubject = subject.trim();
                if (
                  cleanSubject.length < 3 ||
                  cleanSubject.length > subjectLimit ||
                  body.trim().length < 2
                ) {
                  setFormError(
                    "Confira o assunto (3 a " +
                      subjectLimit +
                      " caracteres) e escreva sua mensagem.",
                  );
                  return;
                }
                setFormError("");
                void support
                  .create(
                    (topic ? "[" + topic.title + "] " : "") + cleanSubject,
                    body.trim(),
                  )
                  .then((id) => {
                    if (!id) return;
                    setSubject("");
                    setBody("");
                    setTopicId("");
                    workspaceRef.current?.scrollIntoView({
                      block: "start",
                      behavior: "auto",
                    });
                  });
              }}
            >
              <label className="block text-sm font-medium">
                Tema da dúvida
                <select
                  className="field mt-2"
                  disabled={support.busy}
                  value={topicId}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) prepareTopic(value);
                    else setTopicId("");
                  }}
                >
                  <option value="">Outras dúvidas</option>
                  {helpTopics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Assunto
                <input
                  ref={subjectRef}
                  className="field mt-2"
                  required
                  minLength={3}
                  maxLength={subjectLimit}
                  disabled={support.busy}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Resuma sua dúvida em uma frase"
                />
              </label>
              {subject.length > subjectLimit && (
                <p role="alert" className="text-xs text-evo-red">
                  Reduza o assunto para até {subjectLimit} caracteres neste
                  tema.
                </p>
              )}
              <label className="block text-sm font-medium">
                Sua mensagem
                <textarea
                  className="field mt-2 min-h-36 py-3"
                  required
                  minLength={2}
                  maxLength={3000}
                  disabled={support.busy}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Conte o que você estava estudando e o que ficou em dúvida."
                />
              </label>
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-evo-textSec">
                <span className="max-w-sm">
                  Não envie senhas, CPF, links de confirmação ou dados
                  bancários.
                </span>
                <span>{body.length}/3.000</span>
              </div>
              {(formError || support.createError) && (
                <p role="alert" className="notice-error">
                  {formError || support.createError}
                </p>
              )}
              <button
                className="action w-full sm:w-auto"
                disabled={
                  support.busy ||
                  subject.trim().length < 3 ||
                  subject.trim().length > subjectLimit ||
                  body.trim().length < 2
                }
              >
                <Send size={15} aria-hidden="true" />
                Enviar pergunta
              </button>
            </form>
          </div>
        </section>
      )}

      <section
        ref={workspaceRef}
        id="suas-conversas"
        aria-labelledby="conversations-title"
        className="scroll-mt-24 space-y-5 border-t border-evo-border pt-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-evo-accent">
              {staff
                ? "Organização dos atendimentos"
                : "Histórico e acompanhamento"}
            </p>
            <h2
              id="conversations-title"
              className="mt-2 text-2xl font-semibold"
            >
              {staff ? "Fila de dúvidas" : "Continue de onde parou"}
            </h2>
          </div>
          {!support.loading && !support.listError && (
            <dl
              className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-evo-textSec"
              aria-label="Situação das conversas carregadas"
            >
              {[
                ["Aguardando equipe", counts.waiting],
                ["Em atendimento", counts.progress],
                ["Respondidas", counts.answered],
              ].map(([label, count]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-evo-textMain">
                    {count}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {support.actionError && (
          <p role="alert" className="notice-error">
            {support.actionError}
          </p>
        )}
        {support.announcement && (
          <p role="status" className="notice-success">
            {support.announcement}
          </p>
        )}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)]">
          <ConversationInbox
            threads={support.threads}
            selected={support.selected}
            loading={support.loading}
            error={support.listError}
            busy={support.busy}
            teamView={staff}
            onSelect={(id) => {
              support.select(id);
              if (window.matchMedia("(max-width: 1023px)").matches) {
                panelRef.current?.focus({ preventScroll: true });
                panelRef.current?.scrollIntoView({
                  block: "start",
                  behavior: "auto",
                });
              }
            }}
            onRefresh={() => void support.refreshList()}
          />
          <ConversationPanel
            panelRef={panelRef}
            conversation={support.visible}
            selected={support.selected}
            loading={support.detailLoading}
            error={support.detailError}
            busy={support.busy}
            staff={staff}
            userId={user?.id}
            onReply={support.sendReply}
            onRefresh={() => void support.refreshConversation()}
            onRevoke={() => void support.revokeSharing()}
          />
        </div>
      </section>
    </div>
  );
}
