import {
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AccountGate } from "./AccountGate";
import { OrbitCoins } from "./OrbitCoins";
import { ResearchAvailability } from "./ResearchAvailability";

export function RankingAccessLanding({
  compact = false,
}: {
  compact?: boolean;
}) {
  const location = useLocation();
  const destination = location.pathname.includes("ranking")
    ? location.pathname + location.search
    : "/ranking";
  return (
    <section
      className={
        compact
          ? "space-y-5"
          : "mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 md:py-12"
      }
    >
      <div className="rounded-2xl border border-evo-border bg-evo-card p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              Pesquisa para contas gratuitas
            </p>
            {compact ? (
              <h2 className="mt-3 text-2xl font-bold">
                Uma pesquisa mais completa começa aqui
              </h2>
            ) : (
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                Entenda os cenários por trás das ações
              </h1>
            )}
            <p className="mt-4 max-w-3xl leading-relaxed text-evo-textSec">
              Explore o ranking da Ediv, conheça as premissas de cada previsão e
              consulte os dados que ajudam a entender o negócio. O acesso ao
              ranking é exclusivo para quem criar uma conta gratuita e entrar.
            </p>
            <ResearchAvailability />
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <OrbitCoins variant="ranking" size={compact ? "sm" : "hero"} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              Icon: ChartNoAxesCombined,
              title: "Cenários e previsões",
              text: "Potencial informado, preço-alvo, horizonte, tese e riscos reunidos em cada análise.",
            },
            {
              Icon: Building2,
              title: "Dados da empresa",
              text: "Balanço, DRE, fluxo de caixa, informações da empresa, dívida líquida e estatísticas.",
            },
            {
              Icon: FileText,
              title: "Contexto da pesquisa",
              text: "Consulte fontes, datas e versões anteriores quando a equipe publicar suas análises.",
            },
          ].map(({ Icon, title, text }) => (
            <div
              key={title}
              className="rounded-xl border border-evo-border bg-evo-bgMain p-4"
            >
              <Icon size={21} className="text-evo-accent" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <AccountGate
        title="Libere o ranking com sua conta gratuita"
        description="Cadastre-se, confirme seu e-mail e entre para acessar o ranking, os módulos da pesquisa e as ferramentas de aprendizado."
        next={destination}
      />
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-evo-accent underline"
            to="/aprender#ranking"
          >
            <BookOpen size={16} aria-hidden="true" /> Como interpretar uma
            previsão
          </Link>
          <p className="max-w-xl text-xs leading-relaxed text-evo-textSec">
            Previsões dependem de premissas e não garantem retorno. A ordem do
            ranking não representa probabilidade de lucro.
          </p>
        </div>
      )}
    </section>
  );
}
