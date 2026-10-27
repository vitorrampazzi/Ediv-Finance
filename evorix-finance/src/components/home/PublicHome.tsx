import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { authLink } from "../../lib/authDestination";
import { PublicHeroBrand } from "./PublicHeroBrand";
import { TeachingJourney } from "./TeachingJourney";
import { ResearchSample } from "./ResearchSample";
import { PublicQuestions } from "./PublicQuestions";
import { usePublicHomeMotion } from "./usePublicHomeMotion";
import "./public-home.css";

function StartAction({
  awaitingRegistration,
}: {
  awaitingRegistration: boolean;
}) {
  return (
    <div className="ph-start">
      <div className="ph-actions">
        <Link
          className="ph-primary"
          to={awaitingRegistration ? "/aprender" : authLink("cadastro", "/app")}
        >
          {awaitingRegistration
            ? "Começar pela primeira aula"
            : "Criar conta grátis"}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link
          className="ph-text-link"
          to={awaitingRegistration ? "/entrar" : "/aprender"}
        >
          {!awaitingRegistration && <BookOpen size={17} aria-hidden="true" />}
          {awaitingRegistration ? "Entrar" : "Explorar as aulas"}
        </Link>
      </div>
      <p className="ph-access-note">
        {awaitingRegistration
          ? "Novos cadastros em preparação"
          : "Conta gratuita · Primeira aula aberta."}
      </p>
    </div>
  );
}

export function PublicHome({
  awaitingRegistration = false,
}: {
  awaitingRegistration?: boolean;
}) {
  const root = usePublicHomeMotion();
  return (
    <div ref={root} className="ph-home">
      <section className="ph-hero" aria-labelledby="ph-home-title">
        <div className="ph-container ph-hero-layout">
          <div className="ph-hero-copy">
            <p className="edition-label ph-hero-eyebrow ph-hero-entry">
              Escola do Dividendo
            </p>
            <h1 id="ph-home-title" className="display-title ph-hero-title">
              <span>Entenda as empresas</span>{" "}
              <span className="ph-hero-title-accent">por trás</span>{" "}
              <span>dos dividendos.</span>
            </h1>
            <p className="ph-hero-description ph-hero-entry">
              Pesquisas de ações e aulas para estudar com mais critério.
            </p>
            <div className="ph-hero-entry">
              <StartAction awaitingRegistration={awaitingRegistration} />
            </div>
          </div>
          <div className="ph-hero-brand-entry">
            <PublicHeroBrand />
          </div>
        </div>
        <nav className="ph-container ph-page-index" aria-label="Nesta página">
          <a href="#caderno-de-exemplo">Pesquisas de ações</a>
          <a href="#como-a-ediv-ensina">Educação em dividendos</a>
        </nav>
      </section>
      <ResearchSample />
      <TeachingJourney />
      <PublicQuestions />
      <section
        className="ph-section ph-final"
        aria-labelledby="ph-final-title"
        data-ph-reveal
      >
        <div className="ph-container ph-final-layout">
          <div>
            <p className="edition-label">Seu próximo estudo</p>
            <h2 id="ph-final-title" className="display-title">
              Comece por uma empresa.
              <br />
              Ou pela primeira aula.
            </h2>
            <p>Pesquisas, conceitos e exercícios no mesmo lugar.</p>
          </div>
          <StartAction awaitingRegistration={awaitingRegistration} />
        </div>
      </section>
    </div>
  );
}
