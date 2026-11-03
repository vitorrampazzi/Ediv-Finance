import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, ApiError } from "../lib/api";
import { rankingDemoEntries } from "../lib/rankingDemo";
import { useAuth } from "../context/authContext";
import { CompanyLogo } from "./CompanyLogo";
import type { Entry } from "../lib/ranking";
import {
  formatDividendValue,
  type DividendFormat,
} from "../../dividend-analysis.mjs";

type Publication = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  entries: Entry[];
};

// Campo ausente aparece como travessão, nunca como número estimado.
const shown = (value: string | null | undefined, format: DividendFormat) => {
  const text = formatDividendValue(value ?? null, format);
  return text === "Não informado" ? "—" : text;
};

function kpis(entry: Entry, demo: boolean): [string, string][] {
  const analysis = entry.dividendAnalysis;
  if (analysis)
    return [
      ["Cotação de referência", shown(analysis.referencePrice, "currency")],
      ["Preço teto", shown(analysis.ceilingPrice, "currency")],
      ["Margem de segurança", shown(analysis.safetyMargin, "percentInteger")],
    ];
  return [
    [
      demo ? "Potencial simulado" : "Potencial informado",
      entry.expectedReturnPercent === null
        ? "—"
        : Number(entry.expectedReturnPercent).toLocaleString("pt-BR") + "%",
    ],
    ["Preço-alvo", shown(entry.targetPrice, "currency")],
    ["Horizonte", entry.horizonMonths ? entry.horizonMonths + " meses" : "—"],
  ];
}

export function RankingHighlights() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <MemberRankingHighlights key={user.id} />;
}

function MemberRankingHighlights() {
  const { refreshSession } = useAuth();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const showingDemo = Boolean(publication && !publication.entries.length);
  const entries: Entry[] = showingDemo
    ? rankingDemoEntries
    : publication?.entries || [];
  useEffect(() => {
    const controller = new AbortController();
    const request = () =>
      apiRequest<Publication>("/api/rankings", { signal: controller.signal });
    request()
      .catch(async (reason) => {
        if (
          controller.signal.aborted ||
          !(reason instanceof ApiError && reason.status === 401)
        )
          throw reason;
        try {
          await refreshSession();
        } catch {
          throw new Error(
            "Não foi possível verificar sua sessão. Atualize a página e entre novamente.",
          );
        }
        // A valid session gets one more attempt; an expired one leaves this page.
        return request();
      })
      .then((data) => {
        if (!controller.signal.aborted) setPublication(data);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error && !(reason instanceof ApiError)
            ? reason.message
            : "A publicação não pôde ser carregada agora.",
        );
      });
    return () => controller.abort();
  }, [refreshSession, revision]);

  return (
    <section className="mx-auto max-w-7xl py-5 sm:px-5 sm:pb-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="edition-label">Pesquisa de empresas</p>
          <h2 className="display-title mt-2 text-2xl sm:text-3xl">
            {showingDemo ? "Pesquisa de exemplo" : "Publicação mais recente"}
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
          <button
            type="button"
            className="ml-2 inline-flex min-h-11 items-center text-evo-accent underline"
            onClick={() => {
              setError("");
              setPublication(null);
              setRevision((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
          <Link
            className="ml-4 inline-flex min-h-11 items-center text-evo-accent underline"
            to="/app/ranking"
          >
            Abrir o Ranking de Ações
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
              ? "Demonstração · dados fictícios"
              : "Ranking de Ações"}
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
                className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-evo-border py-4 transition-colors hover:bg-evo-bgSec focus-visible:outline focus-visible:outline-2 focus-visible:outline-evo-accent lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] lg:gap-x-6 lg:py-5"
              >
                <div className="company-identity min-w-0">
                  <CompanyLogo ticker={entry.ticker} demo={showingDemo} />
                  <div className="company-identity-copy">
                    <h3 className="font-semibold group-hover:text-evo-accent">
                      {entry.ticker}
                    </h3>
                    <p className="mt-1 truncate text-xs text-evo-textSec">
                      {entry.companyName}
                    </p>
                    {entry.dividendAnalysis && (
                      <p className="mt-0.5 text-xs text-evo-textSec">
                        Pesquisa de dividendos
                      </p>
                    )}
                  </div>
                </div>
                <dl className="col-span-2 row-start-2 grid grid-cols-3 items-end gap-x-3 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:gap-x-6">
                  {kpis(entry, showingDemo).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[0.6875rem] leading-4 text-evo-textSec sm:text-xs">
                        {label}
                      </dt>
                      <dd className="mt-1 font-numbers text-base sm:text-lg">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <span className="col-start-2 row-start-1 text-xs text-evo-accent sm:text-sm lg:col-start-3">
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
