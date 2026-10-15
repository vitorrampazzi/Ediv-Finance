import type { CSSProperties } from "react";
import { ArrowRight, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { publicHomeTerms } from "../../lib/publicHomeTerms";
import "./public-sections.css";

export function LearningTerms() {
  return (
    <section
      id="termos-do-mercado"
      className="ph-section ph-terms"
      aria-labelledby="ph-terms-title"
    >
      <div className="ph-container">
        <header className="ph-section-heading" data-ph-reveal>
          <div>
            <p className="edition-label">Palavras da pesquisa</p>
            <h2 id="ph-terms-title" className="display-title ph-section-title">
              Quatro termos para começar.
            </h2>
            <p className="ph-section-description">
              Toque no termo para ler a definição.
            </p>
          </div>
          <Link className="ph-inline-link" to="/glossario">
            Abrir glossário <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <div className="ph-terms-grid">
          {publicHomeTerms.map((term, index) => (
            <details
              className="ph-term"
              key={term.id}
              data-ph-reveal
              style={{ "--ph-delay": `${index * 60}ms` } as CSSProperties}
            >
              <summary className="ph-term-summary">
                <span className="ph-term-turn">
                  <span className="ph-term-front">
                    <span className="ph-term-number" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <strong className="display-title">{term.term}</strong>
                    <span className="ph-term-hint">{term.hint}</span>
                    <span className="ph-term-control">
                      Ver definição <RotateCw size={14} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="ph-term-back" aria-hidden="true">
                    <strong>{term.term}</strong>
                    <span>{term.definition}</span>
                    <span className="ph-term-control">
                      Voltar <RotateCw size={14} />
                    </span>
                  </span>
                </span>
              </summary>
              <p className="ph-term-definition">{term.definition}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
