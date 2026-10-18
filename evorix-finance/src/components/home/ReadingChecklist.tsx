import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./public-sections.css";

const readingPoints = [
  ["Tese", "O que sustentaria o cenário."],
  ["Prazo", "Quando a estimativa será avaliada."],
  ["Data", "A referência dos dados publicados."],
  ["Riscos", "O que pode mudar o resultado."],
] as const;

export function ReadingChecklist() {
  return (
    <section
      className="ph-section ph-checklist"
      aria-labelledby="ph-checklist-title"
    >
      <div className="ph-container ph-checklist-layout" data-ph-reveal>
        <div>
          <p className="edition-label">Antes de decidir</p>
          <h2
            id="ph-checklist-title"
            className="display-title ph-section-title"
          >
            Confira o que está por trás do cenário.
          </h2>
          <p className="ph-section-description">
            Potencial de valorização é uma estimativa, não uma promessa.
          </p>
          <Link className="ph-inline-link" to="/metodologia">
            Ler a metodologia <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div>
          <dl className="ph-checklist-points">
            {readingPoints.map(([title, explanation]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{explanation}</dd>
              </div>
            ))}
          </dl>
          <p className="ph-checklist-footnote">
            A Escola do Dividendo reúne pesquisas e aulas. Não é corretora e não executa
            ordens.
          </p>
        </div>
      </div>
    </section>
  );
}
