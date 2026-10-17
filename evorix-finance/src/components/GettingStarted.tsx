import {
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { authLink } from "../lib/authDestination";

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
    "O que encontro na Ediv?",
    "Pesquisas por empresa, dados de ações e aulas sobre dividendos. No ranking, abra uma empresa para ler os detalhes da pesquisa.",
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
            <p className="edition-label">Na Ediv</p>
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
        <ol className="mt-5 space-y-1 border-t border-evo-border pt-3 sm:mt-6">
          {[
            {
              title: "Leia a pesquisa",
              text: "No ranking, abra a empresa para ler as premissas e os riscos do cenário.",
              action: "Ranking de previsões",
              to: user ? "/app/ranking" : "/ranking",
            },
            {
              title: "Compare as ações",
              text: "Consulte as cotações e os indicadores disponíveis nas análises.",
              action: "Análises de ações",
              to: user ? "/app/analises" : "/mercado",
            },
            {
              title: "Estude dividendos",
              text: "Escolha uma aula e responda ao exercício para registrar sua conclusão.",
              action: "Aulas e exercícios",
              to: user ? "/app/aprender" : "/aprender",
            },
          ].map(({ title, text, action, to }) => (
            <li key={title}>
              <Link
                className="group grid min-h-11 grid-cols-[minmax(0,1fr)_1rem] items-start gap-x-3 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent sm:grid-cols-[minmax(0,.75fr)_minmax(0,1fr)_1rem] sm:items-center sm:gap-x-6"
                to={to}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold transition-colors group-hover:text-evo-accent sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-evo-textSec sm:text-sm">
                    {action}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-evo-textSec sm:hidden">
                    {text}
                  </p>
                </div>
                <p className="hidden text-sm leading-relaxed text-evo-textSec sm:block">
                  {text}
                </p>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="mt-1 text-evo-accent sm:mt-0"
                />
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
          Na Ediv
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Por onde começar</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
          Comece pela pesquisa de uma empresa ou por uma aula sobre dividendos.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              Icon: ChartNoAxesCombined,
              title: "Leia a pesquisa",
              text: "No ranking, abra uma empresa para consultar o cenário e as premissas da pesquisa.",
              to: user ? "/app/ranking" : authLink("cadastro", "/app/ranking"),
              action: user ? "Abrir ranking" : "Criar conta grátis",
            },
            {
              Icon: Building2,
              title: "Compare as ações",
              text: "Consulte as cotações e os indicadores disponíveis nas análises.",
              to: user ? "/app/analises" : "/mercado",
              action: "Explorar análises",
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
