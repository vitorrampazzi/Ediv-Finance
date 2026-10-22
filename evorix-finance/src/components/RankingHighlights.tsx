import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { useAuth } from "../context/authContext";
import { CompanyLogo } from "./CompanyLogo";
import type { Entry } from "../lib/ranking";
import { formatDividendValue } from "../../dividend-analysis.mjs";

type Publication = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  entries: Entry[];
};

export function RankingHighlights() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <MemberRankingHighlights key={user.id} />;
}

function MemberRankingHighlights() {
  const { refreshSession } = useAuth();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [error, setError] = useState("");
  const showingDemo = Boolean(publication && !publication.entries.length);
  const entries: Entry[] = showingDemo
    ? rankingDemoEntries
    : publication?.entries || [];
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Publication>("/api/rankings", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setPublication(data);
      })
      .catch(async (reason) => {
        if (
          !controller.signal.aborted &&
          reason instanceof ApiError &&
          reason.status === 401
        ) {
          try {
            await refreshSession();
          } catch {
            if (!controller.signal.aborted)
              setError(
                "Não foi possível verificar sua sessão. Atualize a página e entre novamente.",
              );
          }
          return;
        }
        if (!controller.signal.aborted)
          setError("A publicação não pôde ser carregada agora.");
      });
    return () => controller.abort();
  }, [refreshSession]);

  return (
    <section className="mx-auto max-w-7xl py-5 sm:px-5 sm:pb-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="edition-label">Pesquisa de empresas</p>
          <h2 className="display-title mt-2 text-2xl sm:text-3xl">
            {showingDemo ? "Caderno de exemplo" : "Publicação mais recente"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-evo-textSec">
            {showingDemo ? (
              "Abra uma empresa de exemplo para conhecer o formato da pesquisa."
            ) : entries.some((entry) => entry.dividendAnalysis) ? (
              "Consulte as análises de dividendos e a referência da planilha de cada empresa."
            ) : (
              <>Leia a tese e confira o prazo de cada cenário.</>
            )}
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center text-sm text-evo-accent underline underline-offset-4"
          to={showingDemo ? "/app/ranking?visual=demo" : "/app/ranking"}
        >
          {showingDemo ? "Explorar demonstração" : "Abrir ranking completo"}
        </Link>
      </div>
      {error ? (
        <div role="status" className="mt-5 text-sm text-evo-textSec">
          {error}
          <Link
            className="ml-2 inline-flex min-h-11 items-center text-evo-accent underline"
            to="/app/ranking?visual=demo"
          >
            Ver exemplo com dados fictícios
          </Link>
        </div>
      ) : !publication ? (
        <p role="status" className="mt-5 text-sm text-evo-textSec">
          Carregando publicação…
        </p>
      ) : (
        <>
          <p className="mt-5 text-xs text-evo-textSec">
            {showingDemo ? "Demonstração · dados fictícios" : publication.title}{" "}
            {!showingDemo &&
              publication.updatedAt &&
              "· " +
                new Date(
                  publication.updatedAt.replace(" ", "T") +
                    (publication.updatedAt.endsWith("Z") ? "" : "Z"),
                ).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-3 border-t border-evo-border">
            {entries.slice(0, 3).map((entry) => (
              <Link
                key={entry.ticker}
                to={
                  "/app/ranking/acao/" +
                  encodeURIComponent(entry.ticker) +
                  "?visual=" +
                  (showingDemo ? "demo" : "real") +
                  (!showingDemo && publication.id
                    ? "&publication=" + encodeURIComponent(publication.id)
                    : "")
                }
                className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-evo-border py-4 transition-colors hover:bg-evo-bgSec focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-6 sm:py-5"
              >
                <div className="company-identity col-start-1 row-span-2 row-start-1">
                  <CompanyLogo ticker={entry.ticker} demo={showingDemo} />
                  <div className="company-identity-copy">
                    <h3 className="font-semibold group-hover:text-evo-accent">
                      {entry.ticker}
                    </h3>
                    <p className="mt-1 truncate text-xs text-evo-textSec">
                      {entry.companyName}
                    </p>
                  </div>
                </div>
                <p className="col-start-2 row-start-1 text-right font-numbers text-xl">
                  <span className="mb-1 block font-sans text-xs text-evo-textSec">
                    {entry.dividendAnalysis
                      ? "Margem de segurança"
                      : showingDemo
                        ? "Potencial simulado"
                        : "Potencial informado"}
                  </span>
                  {entry.dividendAnalysis
                    ? formatDividendValue(
                        entry.dividendAnalysis.safetyMargin,
                        "percentInteger",
                      )
                    : entry.expectedReturnPercent === null
                      ? "Não informado"
                      : Number(entry.expectedReturnPercent).toLocaleString(
                          "pt-BR",
                        ) + "%"}
                </p>
                <p className="col-start-2 row-start-2 mt-1 text-right text-xs text-evo-textSec">
                  {entry.dividendAnalysis
                    ? "Referência: " +
                      formatDividendValue(
                        entry.dividendAnalysis.updatedOn,
                        "date",
                      )
                    : entry.horizonMonths
                      ? entry.horizonMonths + " meses"
                      : "Prazo não informado"}
                </p>
                <span className="col-span-2 mt-2 text-xs text-evo-accent sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:text-sm">
                  {showingDemo ? "Abrir exemplo" : "Ler pesquisa"}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
