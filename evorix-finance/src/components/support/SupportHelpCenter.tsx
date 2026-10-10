import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  helpTopics,
  normalizeHelpSearch,
  supportAnswers,
} from "../../lib/supportHelp";
import type { HelpTopicId } from "../../lib/supportHelp";
import { authLink } from "../../lib/authDestination";

const topicIcons: Record<HelpTopicId, LucideIcon> = {
  pesquisa: ChartNoAxesCombined,
  dividendos: GraduationCap,
  conta: ShieldCheck,
  tecnico: Wrench,
  sugestao: Lightbulb,
};

const principalAnswerIds = new Set([
  "ler-ranking",
  "potencial-valorizacao",
  "dividend-yield",
  "confirmacao-email",
  "acompanhar-conversa",
]);

const usefulLinks: {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Ranking",
    description: "Cenários e cadernos de empresas",
    to: "/app/ranking",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Análises",
    description: "Ativos e informações de mercado",
    to: "/app/analises",
    icon: Search,
  },
  {
    title: "Escola de dividendos",
    description: "Aulas e exercícios",
    to: "/app/aprender",
    icon: GraduationCap,
  },
  {
    title: "Glossário",
    description: "Termos em linguagem simples",
    to: "/glossario",
    icon: BookOpen,
  },
  {
    title: "Conta e segurança",
    description: "Senha, sessões e seus dados",
    to: "/app/configuracoes",
    icon: Settings2,
  },
  {
    title: "Meu perfil",
    description: "Informações da sua conta",
    to: "/app/perfil",
    icon: ShieldCheck,
  },
];

function helpDestination(to: string, publicView: boolean): string {
  if (!publicView) return to;
  if (to.startsWith("/app/ranking"))
    return to.replace("/app/ranking", "/ranking");
  if (to.startsWith("/app/analises"))
    return to.replace("/app/analises", "/mercado");
  if (to.startsWith("/app/aprender"))
    return to.replace("/app/aprender", "/aprender");
  if (to.startsWith("/app/")) return authLink("entrar", to);
  return to;
}

export function SupportHelpCenter({
  onContact,
  publicView = false,
}: {
  onContact?: (topicId: string) => void;
  publicView?: boolean;
}) {
  const searchId = useId();
  const headingId = useId();
  const answersId = useId();
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<HelpTopicId | "">("");
  const [showAll, setShowAll] = useState(false);
  const terms = normalizeHelpSearch(query).split(/\s+/).filter(Boolean);
  const hasFilters = Boolean(activeTopic || terms.length);
  const matchingAnswers = supportAnswers.filter((answer) => {
    if (activeTopic && answer.topicId !== activeTopic) return false;
    const topic = helpTopics.find((item) => item.id === answer.topicId);
    const searchable = normalizeHelpSearch(
      [answer.question, ...answer.paragraphs, topic?.title || ""].join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
  const visibleAnswers =
    showAll || hasFilters
      ? matchingAnswers
      : matchingAnswers.filter((answer) => principalAnswerIds.has(answer.id));
  const selectedTopic = helpTopics.find((topic) => topic.id === activeTopic);

  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-7">
      <div className="page-intro grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-evo-accent">
            <CircleHelp size={16} aria-hidden="true" /> Respostas e caminhos
          </div>
          <h2 id={headingId} className="text-xl font-semibold">
            Como podemos ajudar?
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-evo-textSec">
            Encontre uma explicação, vá direto à ferramenta ou leve sua dúvida à
            equipe.
          </p>
        </div>
        <div className="min-w-0">
          <label htmlFor={searchId} className="mb-2 block text-sm font-medium">
            Buscar uma dúvida
          </label>
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-evo-textSec"
              size={18}
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: senha, dividendos, preço-alvo"
              className="field pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none"
              maxLength={160}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-0 flex min-h-11 w-11 items-center justify-center rounded-r-lg text-evo-textSec hover:text-white"
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Categorias de ajuda"
      >
        {helpTopics.map((topic) => {
          const Icon = topicIcons[topic.id];
          const active = activeTopic === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveTopic(active ? "" : topic.id)}
              className={`group min-w-0 rounded-xl border p-4 text-left transition-colors ${active ? "border-evo-accent/60 bg-evo-primary/20" : "border-evo-border bg-evo-bgSec/40 hover:border-evo-accent/40 hover:bg-evo-bgSec"}`}
            >
              <Icon
                size={20}
                className="mb-3 text-evo-accent"
                aria-hidden="true"
              />
              <span className="block text-sm font-semibold leading-snug">
                {topic.title}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-evo-textSec">
                {topic.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">
              {selectedTopic?.title || "Perguntas frequentes"}
            </h3>
            <p
              role="status"
              aria-live="polite"
              className="text-xs text-evo-textSec"
            >
              {visibleAnswers.length}{" "}
              {hasFilters
                ? visibleAnswers.length === 1
                  ? "resposta encontrada"
                  : "respostas encontradas"
                : showAll
                  ? "respostas disponíveis"
                  : "perguntas principais"}
            </p>
          </div>
          {visibleAnswers.length ? (
            <div
              id={answersId}
              className="divide-y divide-evo-border border-y border-evo-border"
            >
              {visibleAnswers.map((answer) => (
                <details key={answer.id} className="group min-w-0 py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">{answer.question}</span>
                    <ChevronDown
                      size={17}
                      className="shrink-0 text-evo-textSec transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="space-y-3 pb-5 pr-4 text-sm leading-relaxed text-evo-textSec">
                    {answer.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                      {answer.link && (
                        <Link
                          to={helpDestination(answer.link.to, publicView)}
                          className="inline-flex min-h-11 items-center gap-1.5 font-medium text-evo-accent underline underline-offset-4 hover:text-white"
                        >
                          {answer.link.label}
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </Link>
                      )}
                      {onContact && (
                        <button
                          type="button"
                          onClick={() => onContact(answer.topicId)}
                          className="min-h-11 font-medium text-evo-textMain underline underline-offset-4 hover:text-evo-accent"
                        >
                          Perguntar à equipe
                        </button>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-evo-border p-6">
              <h4 className="font-medium">Não encontramos essa dúvida</h4>
              <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
                Tente uma palavra mais curta, escolha outra categoria ou conte à
                equipe o que você precisa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveTopic("");
                  setShowAll(true);
                }}
                className="action-secondary mt-4"
              >
                Ver todas as respostas
              </button>
            </div>
          )}
          {hasFilters && visibleAnswers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveTopic("");
                setShowAll(true);
              }}
              className="mt-3 min-h-11 text-sm text-evo-textSec underline underline-offset-4 hover:text-white"
            >
              Limpar filtros e ver tudo
            </button>
          )}
          {!hasFilters && (
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls={answersId}
              onClick={() => setShowAll((expanded) => !expanded)}
              className="action-secondary mt-4"
            >
              {showAll
                ? "Mostrar perguntas principais"
                : `Ver todas as ${supportAnswers.length} respostas`}
              <ChevronDown
                size={16}
                className={`shrink-0 ${showAll ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        <aside className="min-w-0 space-y-5" aria-label="Atalhos de ajuda">
          <div className="rounded-xl border border-evo-border bg-evo-bgSec/40 p-5">
            <h3 className="font-semibold">Vá direto ao que precisa</h3>
            <div className="mt-3 divide-y divide-evo-border/70">
              {usefulLinks
                .filter(
                  (link) =>
                    !publicView ||
                    !["/app/configuracoes", "/app/perfil"].includes(link.to),
                )
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={helpDestination(link.to, publicView)}
                      className="group flex min-h-16 items-center gap-3 py-3"
                    >
                      <Icon
                        size={18}
                        className="shrink-0 text-evo-accent"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium group-hover:text-evo-accent">
                          {link.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-evo-textSec">
                          {link.description}
                        </span>
                      </span>
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-evo-textSec"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              {publicView && (
                <Link
                  to="/recuperar-senha"
                  className="group flex min-h-16 items-center gap-3 py-3"
                >
                  <ShieldCheck
                    size={18}
                    className="shrink-0 text-evo-accent"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium group-hover:text-evo-accent">
                      Recuperar acesso
                    </span>
                    <span className="mt-0.5 block text-xs text-evo-textSec">
                      Esqueceu sua senha?
                    </span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-evo-textSec"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          </div>
          {onContact && (
            <div className="border-l-2 border-evo-accent/60 pl-5">
              <MessageCircle
                size={22}
                className="mb-3 text-evo-accent"
                aria-hidden="true"
              />
              <h3 className="font-semibold">Sua dúvida merece contexto</h3>
              <p className="mt-2 text-sm leading-relaxed text-evo-textSec">
                Não encontrou a resposta?{" "}
                {publicView
                  ? "Entre na sua conta para abrir uma conversa e acompanhar o retorno."
                  : "Abra uma conversa e explique o que você quer entender. Você acompanha o retorno por aqui."}
              </p>
              <button
                type="button"
                onClick={() => onContact(activeTopic || "pesquisa")}
                className="action-secondary mt-4 w-full"
              >
                Falar com a equipe
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
              <p className="mt-3 text-xs leading-relaxed text-evo-textSec">
                Envie perguntas a qualquer hora. O atendimento segue a
                disponibilidade da equipe.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
