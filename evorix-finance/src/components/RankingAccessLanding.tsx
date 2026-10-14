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
      <div className="rounded-2xl border border-evo-border bg-evo-card p-4 sm:p-8">
        <div className="mobile-page-heading flex items-start justify-between gap-3 sm:gap-4 sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
              Pesquisa para contas gratuitas
            </p>
            {compact ? (
              <h2 className="mt-3 text-2xl font-bold">
                Uma pesquisa mais completa começa aqui
              </h2>
            ) : (
              <h1 className="mt-3 text-2xl font-bold sm:text-4xl">
                Ranking de previsões
              </h1>
            )}
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-evo-textSec">
              Previsões, teses e dados das empresas, disponíveis com sua conta gratuita.
            </p>
            <ResearchAvailability />
          </div>
          <div className="shrink-0 self-start sm:self-center">
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
              className="grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border border-evo-border bg-evo-bgMain p-3 sm:block sm:p-4"
            >
              <Icon size={21} className="text-evo-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold sm:mt-3">{title}</h3>
              <p className="mt-2 hidden text-xs leading-relaxed text-evo-textSec sm:block">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <AccountGate
        title="Libere o ranking com sua conta gratuita"
        description="Crie a conta e confirme seu e-mail para começar."
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
        </div>
      )}
    </section>
  );
}
