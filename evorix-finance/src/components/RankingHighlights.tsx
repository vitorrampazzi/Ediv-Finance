import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { useAuth } from "../context/authContext";
import { RankingAccessLanding } from "./RankingAccessLanding";

type Publication = {
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
  if (loading)
    return (
      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8">
        <p role="status" className="text-sm text-evo-textSec">
          Verificando acesso ao ranking…
        </p>
      </section>
    );
  if (!user)
    return (
      <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8">
        <RankingAccessLanding compact />
      </section>
    );
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
    <section className="mx-auto max-w-7xl px-5 pb-14 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-evo-accent">
            Nossa sala de estudos
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            Previsões para você compreender
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-evo-textSec">
            {showingDemo ? (
              "Conheça o formato da pesquisa com empresas e números fictícios. A primeira análise real da equipe ainda está em preparação."
            ) : (
              <>
                O ranking reúne os cenários publicados pela equipe. Leia os
                argumentos e os riscos de cada análise antes de interpretar os
                números.
              </>
            )}
          </p>
        </div>
        <Link
          className="action"
          to={showingDemo ? "/ranking?visual=demo" : "/ranking"}
        >
          {showingDemo ? "Explorar demonstração" : "Abrir ranking completo"}
        </Link>
      </div>
      {error ? (
        <div role="status" className="mt-5 text-sm text-evo-textSec">
          {error}
          <Link
            className="ml-2 inline-flex min-h-11 items-center text-evo-accent underline"
            to="/ranking?visual=demo"
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
            {showingDemo
              ? "Demonstração · empresas, preços e cenários fictícios"
              : publication.title}{" "}
            {!showingDemo &&
              publication.updatedAt &&
              "· " +
                new Date(
                  publication.updatedAt.replace(" ", "T") +
                    (publication.updatedAt.endsWith("Z") ? "" : "Z"),
                ).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {entries.slice(0, 3).map((entry) => (
              <Link
                key={entry.ticker}
                to={showingDemo ? "/ranking?visual=demo" : "/ranking"}
                className="rounded-xl border border-evo-border bg-evo-card p-5 hover:border-evo-accent/40"
              >
                <h3 className="font-bold">{entry.ticker}</h3>
                {showingDemo && (
                  <span className="mt-2 inline-block rounded-md bg-evo-accent/10 px-2 py-1 text-[11px] font-semibold text-evo-accent">
                    Empresa fictícia
                  </span>
                )}
                <p className="mt-1 text-xs text-evo-textSec">
                  {entry.companyName}
                </p>
                <p className="mt-5 text-xs text-evo-textSec">
                  {showingDemo
                    ? "Potencial simulado para demonstração"
                    : "Potencial informado pelo autor"}
                </p>
                <p className="mt-1 font-numbers text-xl">
                  {Number(entry.expectedReturnPercent).toLocaleString("pt-BR")}%
                </p>
                <p className="mt-2 text-xs text-evo-textSec">
                  {entry.horizonMonths
                    ? entry.horizonMonths + " meses"
                    : "Prazo não informado"}{" "}
                  · {showingDemo ? "exemplo visual" : "cenário sem garantia"}
                </p>
                <span className="mt-4 block text-xs text-evo-accent">
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
