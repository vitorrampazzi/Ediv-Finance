import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { authLink } from "../../lib/authDestination";
import { CompanyLogo } from "../CompanyLogo";
import {
  dividendColumns,
  formatDividendValue,
} from "../../../dividend-analysis.mjs";
import "./public-sections.css";
import "./public-home.css";

const metrics = [
  "estimatedGrossDividendYield",
  "projectedPE",
  "safetyMargin",
] as const;
type PublicRanking = {
  id: string | null;
  title: string;
  entries: {
    rank: number;
    ticker: string;
    companyName: string;
    dividendAnalysis: Record<(typeof metrics)[number], string | null>;
  }[];
};

export function ResearchSample({
  showAccessActions = true,
}: {
  showAccessActions?: boolean;
}) {
  const [publication, setPublication] = useState<PublicRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<PublicRanking>("/api/rankings/public", {
      signal: controller.signal,
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
    setRevision((value) => value + 1);
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
            <h2 id="ph-sample-title" className="display-title ph-section-title">
              Pesquisas de ações
            </h2>
            <p className="ph-section-description">
              As três primeiras empresas da publicação mais recente, na ordem da
              pesquisa da Escola do Dividendo.
            </p>
          </div>
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
              <h3>Ranking de Ações</h3>
              <p>
                Estimativas da pesquisa publicada, sem cotação ao vivo. Margem
                de segurança não representa retorno garantido.
              </p>
            </div>
            <ol
              id="public-ranking-results"
              className="ph-ranking-preview"
              aria-label="Prévia do ranking publicado"
            >
              {publication.entries.slice(0, 3).map((entry) => (
                <li key={entry.ticker} className="ph-ranking-company">
                  <h3>
                    <Link
                      className="ph-ranking-company-link"
                      to={
                        "/app/ranking/acao/" +
                        encodeURIComponent(entry.ticker) +
                        (publication.id
                          ? "?publication=" + encodeURIComponent(publication.id)
                          : "")
                      }
                    >
                      <CompanyLogo ticker={entry.ticker} />
                      <span>
                        <strong>{entry.companyName}</strong>
                        <span>{entry.ticker}</span>
                      </span>
                      <span className="sr-only">
                        {" "}
                        · Entrar para acessar a análise completa
                      </span>
                    </Link>
                  </h3>
                  <dl>
                    {metrics.map((key) => {
                      const column = dividendColumns.find(
                        (item) => item.key === key,
                      )!;
                      return (
                        <div key={key} data-field={key}>
                          <dt>{column.label}</dt>
                          <dd className="font-numbers">
                            {formatDividendValue(
                              entry.dividendAnalysis[key],
                              column.format,
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ol>
          </>
        )}
        {showAccessActions && (
          <div
            className="ph-ranking-unlock"
            aria-labelledby="ph-ranking-unlock-title"
          >
            <div>
              <h3 id="ph-ranking-unlock-title" className="display-title">
                Desbloqueie o ranking completo de ações
              </h3>
              <p>
                Crie sua conta gratuita e tenha acesso a todas as empresas
                analisadas, indicadores, gráficos e insights para aprofundar
                seus estudos sobre investimentos.
              </p>
            </div>
            <div className="ph-ranking-unlock-actions">
              <Link
                className="ph-primary"
                to={authLink("cadastro", "/app/ranking")}
              >
                Criar conta gratuita
              </Link>
              <Link
                className="ph-inline-link"
                to={authLink("entrar", "/app/ranking")}
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
