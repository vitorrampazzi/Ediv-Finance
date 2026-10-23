import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { DividendRankingTable } from "../DividendResearch";
import type { DividendTableEntry } from "../DividendResearch";
import "./public-sections.css";

type PublicRanking = {
  id: string | null;
  title: string;
  updatedAt: string | null;
  totalEntries: number;
  entries: DividendTableEntry[];
};

export function ResearchSample() {
  const [publication, setPublication] = useState<PublicRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(10);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<PublicRanking>("/api/rankings/public", {
      signal: controller.signal,
      credentials: "omit",
    })
      .then((data) => {
        if (!controller.signal.aborted) setPublication(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o ranking.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const retry = () => {
    setLoading(true);
    setError("");
    setPublication(null);
    setLimit(10);
    setRevision((value) => value + 1);
  };
  const entries = publication?.entries.slice(0, limit) || [];
  const showMore = () => {
    setLimit((value) => value + 10);
    requestAnimationFrame(() =>
      results.current
        ?.querySelector<HTMLElement>(`tbody tr:nth-child(${limit + 1}) a`)
        ?.focus({ preventScroll: true }),
    );
  };
  return (
    <section
      id="caderno-de-exemplo"
      className="ph-section ph-sample ph-public-ranking"
      aria-labelledby="ph-sample-title"
    >
      <div className="ph-container">
        <header className="ph-section-heading">
          <div>
            <p className="edition-label">Pesquisas publicadas</p>
            <h2 id="ph-sample-title" className="display-title ph-section-title">
              Ranking de ações
            </h2>
            <p className="ph-section-description">
              Conheça as empresas da publicação mais recente. A posição e a
              ordem seguem a pesquisa da Escola do Dividendo.
            </p>
          </div>
          <Link className="ph-inline-link" to="/app/ranking">
            Abrir ranking completo <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>
        {loading ? (
          <p role="status" className="ph-ranking-state">
            Carregando ranking publicado…
          </p>
        ) : error ? (
          <div className="ph-ranking-state">
            <p role="alert">{error}</p>
            <button type="button" className="ph-inline-link" onClick={retry}>
              Tentar carregar ranking novamente
            </button>
          </div>
        ) : !publication?.entries.length ? (
          <p className="ph-ranking-state">
            O ranking ainda não tem uma publicação disponível.
          </p>
        ) : (
          <>
            <div className="ph-ranking-publication">
              <h3>{publication.title}</h3>
              <p>
                Dados da pesquisa publicada. Abra uma empresa para acessar sua
                análise na área da conta.
              </p>
            </div>
            <div ref={results} id="public-ranking-results">
              <DividendRankingTable
                entries={entries}
                showRank
                researchLink={(ticker) =>
                  "/app/ranking/acao/" +
                  encodeURIComponent(ticker) +
                  (publication.id
                    ? "?publication=" + encodeURIComponent(publication.id)
                    : "")
                }
              />
            </div>
            <div className="ph-ranking-controls">
              <p id="public-ranking-count" role="status" aria-live="polite">
                {entries.length} de {publication.totalEntries} ações exibidas
              </p>
              {entries.length < publication.entries.length && (
                <button
                  type="button"
                  className="ph-primary"
                  onClick={showMore}
                  aria-controls="public-ranking-results"
                  aria-describedby="public-ranking-count"
                >
                  Ver mais ações
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
