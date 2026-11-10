import { ArrowRight, BookA, BookOpen, ChartNoAxesCombined } from "lucide-react";
import { Link } from "react-router-dom";
import "./home-area-cards.css";

/** The three areas of the school, at the start of both homes. */
export function HomeAreaCards({
  member = false,
  className = "",
}: {
  // Signed in: the ranking and the lessons open inside the account.
  member?: boolean;
  className?: string;
}) {
  const areas = [
    {
      key: "ranking",
      title: "Ranking de Ações",
      text: "Compare as empresas pesquisadas e abra a análise de cada uma.",
      to: member ? "/app/ranking" : "/ranking",
      Icon: ChartNoAxesCombined,
    },
    {
      key: "aulas",
      title: "Aulas",
      text: "Estude dividendos em aulas curtas, com exercícios.",
      to: member ? "/app/aprender" : "/aprender",
      Icon: BookOpen,
    },
    {
      key: "glossario",
      title: "Glossário",
      text: "Consulte os termos das pesquisas em linguagem simples.",
      to: "/glossario",
      Icon: BookA,
    },
  ];
  return (
    <nav
      aria-label="Áreas da Escola do Dividendo"
      className={`home-areas ${className}`.trim()}
    >
      <ul className="home-areas-list">
        {areas.map(({ key, title, text, to, Icon }, index) => (
          <li
            key={key}
            className={`home-area${index === 0 ? " home-area--primary" : ""}`}
          >
            <Link className="home-area-link" to={to} data-home-area={key}>
              <span className="home-area-icon" aria-hidden="true">
                <Icon size={index === 0 ? 24 : 21} />
              </span>
              <span className="home-area-copy">
                <span className="home-area-title">{title}</span>
                <span className="home-area-text">{text}</span>
              </span>
              <ArrowRight
                className="home-area-arrow"
                size={18}
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
