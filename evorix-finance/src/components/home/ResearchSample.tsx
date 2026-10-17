import type { CSSProperties } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { rankingDemoEntries } from "../../lib/rankingDemo";
import { CompanyLogo } from "../CompanyLogo";
import "./public-sections.css";

export function ResearchSample() {
  return (
    <section
      id="caderno-de-exemplo"
      className="ph-section ph-sample"
      aria-labelledby="ph-sample-title"
    >
      <div className="ph-container">
        <header className="ph-section-heading" data-ph-reveal>
          <div>
            <p className="edition-label">Caderno de exemplo</p>
            <h2 id="ph-sample-title" className="display-title ph-section-title">
              Três empresas, três cenários.
            </h2>
            <p className="ph-section-description">
              Abra uma linha para conhecer a tese e os riscos do cenário.
            </p>
          </div>
          <Link className="ph-inline-link" to="/ranking">
            Conhecer o ranking <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <p className="ph-sample-label">Demonstração · dados fictícios</p>
        <div className="ph-sample-list">
          {rankingDemoEntries.slice(0, 3).map((entry, index) => (
            <details
              key={entry.ticker}
              className="ph-sample-row"
              data-ph-reveal
              style={{ "--ph-delay": `${index * 60}ms` } as CSSProperties}
            >
              <summary className="ph-sample-summary">
                <span className="ph-sample-position" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="research-sample-identity">
                  <CompanyLogo ticker={entry.ticker} demo size="sm" />
                  <span className="ph-sample-company">
                    <strong>{entry.companyName}</strong>
                    <span>
                      {entry.ticker} · {entry.sector}
                    </span>
                  </span>
                </span>
                <span className="ph-sample-potential">
                  <span>Potencial simulado</span>
                  <strong>
                    {Number(entry.expectedReturnPercent).toLocaleString(
                      "pt-BR",
                    )}
                    %
                  </strong>
                </span>
                <span className="ph-sample-horizon">
                  <span>Prazo</span>
                  <strong>{entry.horizonMonths} meses</strong>
                </span>
                <ChevronDown
                  className="ph-sample-arrow"
                  size={18}
                  aria-hidden="true"
                />
              </summary>
              <div className="ph-sample-expand">
                <div className="ph-sample-copy">
                  <div>
                    <h3>Tese do exemplo</h3>
                    <p>{entry.thesis}</p>
                  </div>
                  <div>
                    <h3>Riscos do exemplo</h3>
                    <p>{entry.risks}</p>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
