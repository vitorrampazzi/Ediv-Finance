import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { useAuth } from "../context/authContext";

type Publication = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  entries: {
    ticker: string;
    companyName: string;
    expectedReturnPercent: string;
    horizonMonths: number | null;
  }[];
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
  const entries = showingDemo ? rankingDemoEntries : publication?.entries || [];
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
          <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
            Nossa sala de estudos
          </p>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            Sua próxima pesquisa
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-evo-textSec">
            {showingDemo ? (
              "Explore cenários e módulos de pesquisa com empresas de exemplo."
            ) : (
              <>
                Conheça os cenários da publicação mais recente.
              </>
            )}
          </p>
        </div>
        <Link
          className="action"
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
          <div className="mt-3 grid gap-2 sm:grid-cols-3 sm:gap-4">
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
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-xl border border-evo-border bg-evo-card p-4 hover:border-evo-accent/40 sm:block sm:p-5"
              >
                <h3 className="col-start-1 row-start-1 font-bold">{entry.ticker}</h3>
                <p className="col-start-1 row-start-2 mt-1 truncate text-xs text-evo-textSec sm:whitespace-normal">
                  {entry.companyName}
                </p>
                <p className="col-span-2 mt-3 text-xs text-evo-textSec sm:mt-5">
                  {showingDemo
                    ? "Potencial simulado para demonstração"
                    : "Potencial informado pelo autor"}
                </p>
                <p className="col-start-2 row-start-1 text-right font-numbers text-xl sm:mt-1 sm:text-left">
                  {Number(entry.expectedReturnPercent).toLocaleString("pt-BR")}%
                </p>
                <p className="col-start-2 row-start-2 mt-1 text-right text-xs text-evo-textSec sm:mt-2 sm:text-left">
                  {entry.horizonMonths
                    ? entry.horizonMonths + " meses"
                    : "Prazo não informado"}
                </p>
                <span className="col-span-2 mt-3 block text-sm text-evo-accent sm:mt-4">
                  {showingDemo
                    ? "Conhecer os módulos da pesquisa →"
                    : "Ler tese e riscos →"}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
