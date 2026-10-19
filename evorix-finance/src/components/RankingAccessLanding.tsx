import { BookOpen } from "lucide-react";
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
    ? location.pathname + location.search + location.hash
    : "/ranking";
  return (
    <section
      className={
        compact
          ? "space-y-5"
          : "mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 md:py-12"
      }
    >
      <header className="section-masthead">
        <div className="flex items-start justify-between gap-4 sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="edition-label">Pesquisa de ações</p>
            {compact ? (
              <h2 className="display-title mt-3 text-2xl sm:text-3xl">
                A pesquisa por empresa
              </h2>
            ) : (
              <h1 className="display-title mt-3 text-3xl sm:text-4xl">
                Ranking de previsões
              </h1>
            )}
            <p className="mt-3 max-w-2xl text-sm leading-6 text-evo-textSec">
              Compare os cenários e abra uma empresa para ler a tese, os riscos
              e os dados que sustentam a previsão.
            </p>
            <ResearchAvailability />
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <OrbitCoins variant="ranking" size="sm" />
          </div>
        </div>
      </header>
      <AccountGate
        title="Entre para consultar as pesquisas"
        description="Use sua conta ou crie uma. O acesso é liberado depois de confirmar seu e-mail."
        next={destination}
        compact
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
