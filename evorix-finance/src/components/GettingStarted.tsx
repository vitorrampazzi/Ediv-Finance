import { BookOpen, ChartNoAxesCombined, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { authLink } from "../lib/authDestination";
import { learningChapters, learningCourses } from "../lib/learningCatalog";

// Traço fino no estilo das ilustrações da home; cores por currentColor para os dois temas.
function ResearchArt() {
  return (
    <svg
      viewBox="0 0 128 112"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="h-auto w-full self-start text-evo-border"
    >
      <path d="M20 8H82L102 28V104H20V8Z" stroke="currentColor" />
      <path d="M82 8V28H102" stroke="currentColor" />
      <path
        d="M32 30H64M32 40H56"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g className="text-evo-accent">
        <path
          d="M32 90V78M46 90V68M60 90V72M74 90V58"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M30 56L48 50L62 54L88 40"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="88" cy="40" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

function LessonArt() {
  return (
    <svg
      viewBox="0 0 128 112"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="h-auto w-full self-start text-evo-border"
    >
      <path
        d="M64 30C52 22 34 20 14 24V94C34 90 52 92 64 100"
        stroke="currentColor"
      />
      <path
        d="M64 30C76 22 94 20 114 24V94C94 90 76 92 64 100V30Z"
        stroke="currentColor"
      />
      <path
        d="M24 40H50M24 50H46M24 60H52"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g className="text-evo-accent">
        <circle cx="89" cy="52" r="15" stroke="currentColor" />
        <path
          d="M89 44V60M84 48.5C84 46 86 45 89 45C92 45 94 46.5 94 48.5C94 54 84 50 84 55.5C84 57.5 86 59 89 59C92 59 94 58 94 56"
          stroke="currentColor"
          strokeLinecap="round"
        />
        <path
          d="M76 82H102"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const questions = [
  [
    "Preciso pagar para começar?",
    "Não. A conta gratuita dá acesso às pesquisas e às aulas. A assessoria será um serviço separado e ainda está em preparação.",
  ],
  [
    "O ranking já tem a pesquisa do corretor?",
    "As pesquisas publicadas aparecem no ranking. Quando a lista está em demonstração, as empresas e os valores são fictícios.",
  ],
  [
    "O que encontro na Escola do Dividendo?",
    "Ranking com pesquisas por empresa e aulas sobre dividendos. No ranking, abra uma empresa para ler os detalhes da pesquisa.",
  ],
  [
    "Por que preciso confirmar meu e-mail?",
    "Você precisa confirmar o endereço antes de entrar. Procure o link na caixa de entrada ou no spam. Se ele não chegar, solicite o reenvio na tela de acesso.",
  ],
  [
    "Posso excluir minha conta e meus dados?",
    "Sim. Nas configurações da conta você pode exportar seus registros, alterar a senha, encerrar sessões e solicitar a exclusão da conta.",
  ],
];

type GettingStartedProps = {
  compact?: boolean;
};

export function GettingStarted({ compact = false }: GettingStartedProps) {
  const { user } = useAuth();

  if (compact) {
    return (
      <section
        id="como-funciona"
        aria-labelledby="getting-started-heading"
        className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:px-8 md:py-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="edition-label">Na Escola do Dividendo</p>
            <h2
              id="getting-started-heading"
              className="mt-2 text-xl font-semibold sm:text-2xl"
            >
              Por onde começar
            </h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-textSec transition-colors hover:text-evo-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
            to={user ? "/app/conversas" : "/suporte"}
          >
            Central de ajuda
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ol className="mt-5 grid gap-x-8 border-t border-evo-border sm:mt-6 md:grid-cols-2">
          {[
            {
              Art: ResearchArt,
              title: "Leia a pesquisa",
              detail: "Premissas, cenário e riscos",
              text: "No ranking, abra a empresa para ler as premissas e os riscos do cenário.",
              action: "Ranking de Ações",
              to: user ? "/app/ranking" : "/ranking",
            },
            {
              Art: LessonArt,
              title: "Estude dividendos",
              detail: `${learningCourses.length} cursos · ${learningChapters.length} aulas`,
              text: "Escolha uma aula e responda ao exercício para registrar sua conclusão.",
              action: "Aulas e exercícios",
              to: user ? "/app/aprender" : "/aprender",
            },
          ].map(({ Art, title, detail, text, action, to }) => (
            <li
              key={title}
              className="border-b border-evo-border md:border-b-0"
            >
              <Link
                className="group grid h-full grid-cols-[minmax(0,1fr)_5.5rem] gap-x-4 py-5 transition-colors hover:bg-evo-bgSec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent sm:grid-cols-[minmax(0,1fr)_8rem] sm:gap-x-6 sm:px-3 sm:py-7"
                to={to}
              >
                <div className="min-w-0">
                  <p className="text-xs text-evo-textSec">{detail}</p>
                  <h3 className="mt-2 text-xl font-semibold transition-colors group-hover:text-evo-accent sm:text-2xl">
                    {title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-evo-textSec">
                    {text}
                  </p>
                  <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-accent">
                    {action}
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </div>
                <Art />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      id="como-funciona"
      className="mx-auto max-w-7xl space-y-12 px-5 py-12 md:px-8 md:py-16"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
          Na Escola do Dividendo
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Por onde começar</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
          Comece pela pesquisa de uma empresa ou por uma aula sobre dividendos.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              Icon: ChartNoAxesCombined,
              title: "Leia a pesquisa",
              text: "No ranking, abra uma empresa para consultar o cenário e as premissas da pesquisa.",
              to: user ? "/app/ranking" : authLink("cadastro", "/app/ranking"),
              action: user ? "Abrir ranking" : "Criar conta grátis",
            },
            {
              Icon: BookOpen,
              title: "Estude dividendos",
              text: "Leia uma aula sobre a distribuição de lucros e responda ao exercício para registrar sua conclusão.",
              to: user ? "/app/aprender" : "/aprender",
              action: "Entrar na escola",
            },
          ].map(({ Icon, title, text, to, action }) => (
            <article
              key={title}
              className="flex flex-col rounded-xl border border-evo-border bg-evo-card p-5"
            >
              <Icon className="text-evo-accent" size={24} aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-evo-textSec">
                {text}
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-accent"
                to={to}
              >
                {action}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
        <div>
          <h2 className="text-2xl font-bold">Antes de começar</h2>
          <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
            Encontrou um erro ou não conseguiu acessar a conta? Escreva para a
            equipe pela central de ajuda.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-evo-accent underline"
            to="/suporte"
          >
            Falar com a equipe
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="space-y-3">
          {questions.map(([question, answer]) => (
            <details
              key={question}
              className="rounded-xl border border-evo-border bg-evo-card p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
