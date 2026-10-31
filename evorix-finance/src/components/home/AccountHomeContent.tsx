import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { RankingHighlights } from "../RankingHighlights";
import { useAuth } from "../../context/authContext";
import { authLink } from "../../lib/authDestination";
import { RankingPreview } from "../RankingPreview";
import { PublicHeroBrand } from "./PublicHeroBrand";
import { usePublicHomeMotion } from "./usePublicHomeMotion";
import { GettingStarted } from "../GettingStarted";

function MemberHomeBrand() {
  const root = usePublicHomeMotion();
  return (
    <div ref={root} className="member-home-brand-entry">
      <PublicHeroBrand />
    </div>
  );
}

export function HomeContent({
  member = false,
  awaitingRegistration = false,
}: {
  member?: boolean;
  awaitingRegistration?: boolean;
}) {
  const { user } = useAuth();
  const firstName = user?.name.trim().split(/\s+/)[0];
  return (
    <>
      <section
        className={`home-editorial ediv-member-intro mx-auto grid max-w-7xl items-center gap-7 md:grid-cols-[1.15fr_.85fr] md:gap-12 ${member ? "py-3 md:py-8" : "px-4 py-7 sm:px-5 md:px-8 md:py-12"}`}
      >
        <div>
          <span className="edition-label">
            {member && firstName ? `Olá, ${firstName}` : "Escola do dividendo"}
          </span>
          <h1
            className={`display-title mt-4 max-w-2xl ${member ? "text-[2.4rem] sm:text-5xl xl:text-6xl" : "text-[clamp(2.15rem,10.2vw,2.5rem)] sm:text-5xl lg:text-[4.5rem]"}`}
          >
            {member
              ? "Sua mesa de pesquisa."
              : "Entenda de onde vêm os dividendos."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-evo-textSec sm:mt-5 sm:text-base">
            {awaitingRegistration && !user
              ? "Conheça o ranking e a primeira aula enquanto preparamos a abertura dos cadastros."
              : member
                ? "Abra a pesquisa de uma empresa ou continue suas aulas."
                : "Na Escola do Dividendo, você lê pesquisas de ações e estuda as empresas que distribuem lucros."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
            <Link
              to={
                user
                  ? member
                    ? "/app/ranking"
                    : "/app"
                  : awaitingRegistration
                    ? "/aprender"
                    : authLink("cadastro", "/app")
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-evo-primary px-4 text-sm font-semibold text-white hover:bg-evo-primaryHover sm:px-5 sm:text-base"
            >
              {user
                ? member
                  ? "Abrir pesquisas"
                  : "Ir para meu início"
                : awaitingRegistration
                  ? "Começar pela primeira aula"
                  : "Criar conta grátis"}{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              to={user ? "/app/aprender" : "/aprender"}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-medium text-evo-textSec hover:text-evo-textMain sm:px-3"
            >
              <BookOpen size={17} aria-hidden="true" /> Conhecer as aulas
            </Link>
          </div>
          {!user && !awaitingRegistration && (
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              Conta gratuita · Primeira aula aberta.
            </p>
          )}
          {awaitingRegistration && !user && (
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              Novos cadastros em preparação. Já tem conta confirmada?{" "}
              <Link className="text-evo-accent underline" to="/entrar">
                Entrar
              </Link>
            </p>
          )}
        </div>
        {member ? <MemberHomeBrand /> : <RankingPreview />}
      </section>

      <RankingHighlights />
      <GettingStarted compact />
    </>
  );
}
