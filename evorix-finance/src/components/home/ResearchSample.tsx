import { LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { authLink } from "../../lib/authDestination";
import { trackEvent } from "../../lib/analytics";
import { CompanyLogo } from "../CompanyLogo";
import {
  publicMetrics as metrics,
  usePublicRanking,
} from "../../hooks/usePublicRanking";
import { marketView } from "../../lib/marketData";
import {
  dividendColumns,
  formatDividendValue,
} from "../../../dividend-analysis.mjs";
import "./public-sections.css";
import "./public-home.css";

export function ResearchSample({
  showAccessActions = true,
  lockedPreview = false,
}: {
  showAccessActions?: boolean;
  lockedPreview?: boolean;
}) {
  const { publication, loading, error, retry, stale } = usePublicRanking();
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
          <p
            role="status"
            className={`ph-ranking-state ph-ranking-loading${lockedPreview ? " ph-ranking-loading-locked" : ""}`}
          >
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
                DY e P/L da pesquisa publicada; a margem de segurança acompanha
                a cotação da brapi.dev. Margem de segurança não
                representa retorno garantido.
              </p>
            </div>
            <ol
              id="public-ranking-results"
              className="ph-ranking-preview"
              aria-label="Prévia do ranking publicado"
            >
              {publication.entries.slice(0, 3).map((entry, index) => (
                <li key={entry.ticker} className="ph-ranking-company">
                  <h3>
                    <Link
                      className="ph-ranking-company-link"
                      to={"/ranking/acao/" + encodeURIComponent(entry.ticker)}
                      onClick={() =>
                        trackEvent("click_stock_card", {
                          list_location: "ranking_preview",
                          list_position: index + 1,
                        })
                      }
                    >
                      <CompanyLogo ticker={entry.ticker} />
                      <span>
                        <strong>{entry.companyName}</strong>
                        <span>{entry.ticker}</span>
                      </span>
                      <span className="sr-only">
                        {" "}
                        · Ver a pesquisa da empresa
                      </span>
                    </Link>
                  </h3>
                  <dl>
                    {metrics.map((key) => {
                      const column = dividendColumns.find(
                        (item) => item.key === key,
                      )!;
                      // The margin follows the quote of the same answer.
                      const margin =
                        key === "safetyMargin"
                          ? marketView(
                              entry.market,
                              { margin: entry.dividendAnalysis.safetyMargin },
                              {
                                loading: false,
                                failed: stale,
                                publishedAt: publication.updatedAt,
                                showCeiling: false,
                              },
                            ).margin
                          : null;
                      return (
                        <div
                          key={key}
                          data-field={key}
                          data-market-state={margin?.state}
                        >
                          <dt>{column.label}</dt>
                          <dd className="font-numbers" title={margin?.title}>
                            {margin
                              ? margin.text
                              : formatDividendValue(
                                  entry.dividendAnalysis[key],
                                  column.format,
                                )}
                            {margin?.qualifier && (
                              <small className="ph-ranking-qualifier">
                                {margin.qualifier}
                              </small>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ol>
            {lockedPreview && publication.entries.length >= 3 && <LockedRows />}
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
                onClick={() =>
                  trackEvent("click_signup", {
                    cta_location: "ranking_preview",
                  })
                }
              >
                Criar conta gratuita
              </Link>
              <Link
                className="ph-inline-link"
                to={authLink("entrar", "/app/ranking")}
                onClick={() =>
                  trackEvent("click_login", { cta_location: "ranking_preview" })
                }
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

// Placeholder rows only: the public API sends just the first companies, so
// nothing real sits under the blur and the full ranking size stays private.
function LockedRows() {
  return (
    <div className="ph-ranking-locked">
      <ol className="ph-ranking-locked-rows" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <i className="ph-ranking-locked-logo" />
            <i className="ph-ranking-locked-name" />
            <i />
            <i />
            <i />
          </li>
        ))}
      </ol>
      <p className="ph-ranking-locked-note">
        <LockKeyhole size={16} aria-hidden="true" />
        Mais empresas na pesquisa completa
      </p>
    </div>
  );
}
