import { ArrowDown, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { authLink } from "../../lib/authDestination";
import { HomeMarketHighlights } from "../HomeMarketHighlights";
import { PublicHeroPanel } from "./PublicHeroPanel";
import { TeachingJourney } from "./TeachingJourney";
import { ResearchSample } from "./ResearchSample";
import { ReadingChecklist } from "./ReadingChecklist";
import { LearningTerms } from "./LearningTerms";
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
          {awaitingRegistration ? "Entrar" : "Conhecer as aulas"}
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
            <p className="edition-label ph-hero-entry">Escola do dividendo</p>
            <h1 id="ph-home-title" className="display-title ph-hero-title">
              <span>Entenda de onde</span> <span>vêm os dividendos.</span>
            </h1>
            <p className="ph-hero-description ph-hero-entry">
              Leia pesquisas de ações. Estude o negócio, os resultados e a
              distribuição de lucros.
            </p>
            <div className="ph-hero-entry">
              <StartAction awaitingRegistration={awaitingRegistration} />
            </div>
            <a
              className="ph-hero-scroll ph-text-link"
              href="#como-a-ediv-ensina"
            >
              Veja como a Ediv ensina <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="ph-hero-panel-entry">
            <PublicHeroPanel />
          </div>
        </div>
        <nav className="ph-container ph-page-index" aria-label="Nesta página">
          <a href="#como-a-ediv-ensina">
            <span>01</span> O estudo
          </a>
          <a href="#caderno-de-exemplo">
            <span>02</span> A pesquisa
          </a>
          <a href="#mercado">
            <span>03</span> O mercado
          </a>
          <a href="#termos-do-mercado">
            <span>04</span> Os termos
          </a>
        </nav>
      </section>
      <TeachingJourney />
      <ResearchSample />
      <section
        id="mercado"
        className="ph-section ph-market"
        aria-labelledby="ph-market-title"
        data-ph-reveal
      >
        <div className="ph-container">
          <div className="ph-section-heading">
            <div>
              <p className="edition-label">Mercado</p>
              <h2 id="ph-market-title" className="display-title">
                Ações em destaque
              </h2>
              <p>Maiores altas percentuais da sessão disponível.</p>
            </div>
            <Link className="ph-text-link" to="/mercado">
              Explorar análises <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="ph-market-data">
            <HomeMarketHighlights />
          </div>
          <p className="ph-source">Fonte: brapi.dev · Ações brasileiras.</p>
        </div>
      </section>
      <ReadingChecklist />
      <LearningTerms />
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
