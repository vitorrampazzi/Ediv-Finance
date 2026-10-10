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
    "Não. A conta gratuita libera o ranking, os cadernos de pesquisa e a trilha educativa nesta versão. A assessoria é um serviço separado, ainda em preparação.",
  ],
  [
    "O ranking já tem a pesquisa do corretor?",
    "Enquanto a primeira pesquisa não for publicada, o ranking apresenta uma demonstração com empresas e valores fictícios. A situação aparece na página; exemplos não devem orientar decisões de investimento.",
  ],
  [
    "A Ediv conecta minha corretora ou movimenta meu dinheiro?",
    "Não. A Ediv é uma plataforma de pesquisa e educação. Você estuda empresas, cenários e dividendos; não executamos ordens nem acessamos sua conta na corretora.",
  ],
  [
    "Por que preciso confirmar meu e-mail?",
    "A confirmação protege o acesso à conta e permite recuperar sua senha. Depois do cadastro, confira a caixa de entrada e o spam. Você pode reenviar o link se precisar.",
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
        className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h2 id="getting-started-heading" className="text-xl font-bold">
            Como aproveitar a Ediv
          </h2>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-evo-textSec transition-colors hover:text-evo-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
            to="/suporte"
          >
            Dúvidas? Central de ajuda
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-evo-textSec">
          Combine a pesquisa das empresas com os fundamentos dos dividendos.
          Siga este percurso para comparar cenários e entender os números com
          mais contexto.
        </p>
        <ol className="mt-5 grid gap-5 border-t border-evo-border pt-5 md:grid-cols-3 md:gap-8">
          {[
            {
              Icon: ChartNoAxesCombined,
              title: "Explore a pesquisa",
              text: "Leia a tese, o preço-alvo e o horizonte de cada cenário. Abra a empresa para conferir as premissas e os riscos da pesquisa.",
              action: "Conhecer o ranking",
              to: user ? "/app/ranking" : "/ranking",
            },
            {
              Icon: Building2,
              title: "Conheça as empresas",
              text: "Compare cotações e indicadores e relacione os números ao setor e ao negócio da empresa. Vá além da variação de preço da sessão.",
              action: "Explorar as ações",
              to: user ? "/app/analises" : "/mercado",
            },
            {
              Icon: BookOpen,
              title: "Aprenda sobre dividendos",
              text: "Comece pelos fundamentos dos dividendos. Use as aulas, o glossário e os exercícios para interpretar os termos que aparecem nas análises.",
              action: "Começar a aprender",
              to: user ? "/app/aprender" : "/aprender",
            },
          ].map(({ Icon, title, text, action, to }, index) => (
            <li key={title}>
              <Link
                className="group flex gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent"
                to={to}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-evo-border text-evo-accent">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold transition-colors group-hover:text-evo-accent">
                    <span className="text-evo-textSec">{index + 1}.</span>
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-evo-textSec">
                    {text}
                  </p>
                  <span className="mt-3 inline-flex min-h-9 items-center gap-2 text-sm font-medium text-evo-accent">
                    {action} <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
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
          Seu primeiro passo
        </p>
        <h2 className="mt-2 text-2xl font-bold">Comece pelo conhecimento</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-evo-textSec">
          Explore no seu ritmo. Entenda os conceitos, conheça o formato da
          pesquisa e conheça o negócio por trás de cada ação.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              Icon: ChartNoAxesCombined,
              title: "1. Explore as previsões",
              text: "Leia os cenários do ranking, o horizonte e as premissas. Abra uma empresa para entender a tese da pesquisa.",
              to: user ? "/app/ranking" : authLink("cadastro", "/app/ranking"),
              action: user ? "Abrir ranking" : "Criar conta grátis",
            },
            {
              Icon: Building2,
              title: "2. Conheça as empresas",
              text: "Explore as cotações e indicadores disponíveis. Relacione os números à história, ao setor e aos riscos do negócio.",
              to: user ? "/app/analises" : "/mercado",
              action: "Explorar análises",
            },
            {
              Icon: BookOpen,
              title: "3. Entenda os dividendos",
              text: "Estude como empresas geram caixa, distribuem resultados e sustentam seus pagamentos. Continue pelas aulas e exercícios.",
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
            Estamos em versão beta. Sua experiência e suas dúvidas ajudam a
            equipe a melhorar a plataforma.
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
