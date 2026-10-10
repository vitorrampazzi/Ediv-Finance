import { ArrowRight, BarChart3, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { RankingHighlights } from "../components/RankingHighlights";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { useAuth } from "../context/authContext";
import { authLink } from "../lib/authDestination";
import { RankingPreview } from "../components/RankingPreview";
import { GettingStarted } from "../components/GettingStarted";
import { useRegistrationAvailability } from "../hooks/useRegistrationAvailability";

export function Home() {
  const { user } = useAuth();
  const registration = useRegistrationAvailability();
  const awaitingRegistration = registration.current?.available === false;

  return (
    <div className="min-h-screen bg-evo-bgMain text-evo-textMain">
      <SiteHeader />

      <main id="conteudo">
        <section className="home-editorial mx-auto grid max-w-7xl items-center gap-9 px-5 py-10 md:grid-cols-[1.2fr_.8fr] md:gap-12 md:px-8 md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
              <Sparkles size={14} aria-hidden="true" /> Escola do dividendo
            </span>
            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-[1.07] tracking-[-.045em] sm:text-5xl lg:text-6xl">
              Aprenda sobre ações e dividendos.
              <span className="block mt-2 font-normal text-evo-textSec">
                Entenda cada cenário.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-evo-textSec">
              {awaitingRegistration && !user
                ? "Explore as ações e a primeira aula enquanto preparamos a abertura dos cadastros."
                : "Pesquisas de ações, contexto das empresas e aulas para entender o mercado de dividendos."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={
                  user
                    ? "/app/ranking"
                    : awaitingRegistration
                      ? "/aprender"
                      : authLink("cadastro", "/ranking")
                }
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-evo-primary px-5 font-semibold text-white hover:bg-evo-primaryHover"
              >
                {user
                  ? "Abrir ranking"
                  : awaitingRegistration
                    ? "Começar pela primeira aula"
                    : "Criar conta grátis"}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link
                to={user ? "/app/aprender" : "/aprender"}
                className="inline-flex min-h-12 items-center gap-2 px-3 text-sm font-medium text-evo-textSec hover:text-evo-textMain"
              >
                <BookOpen size={17} aria-hidden="true" /> Conhecer as aulas
              </Link>
            </div>
            {!user && !awaitingRegistration && (
              <p className="mt-4 text-xs text-evo-textSec">
                Conta gratuita para acessar as pesquisas. Primeira aula aberta.
              </p>
            )}
            {awaitingRegistration && !user && (
              <p className="mt-3 text-xs text-evo-textSec">
                Novos cadastros em preparação. Já tem conta confirmada?{" "}
                <Link className="text-evo-accent underline" to="/entrar">
                  Entrar
                </Link>
              </p>
            )}
          </div>
          <RankingPreview />
        </section>

        <RankingHighlights />
        <section
          id="mercado"
          className="scroll-mt-6 border-y border-evo-border bg-evo-bgSec/70"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 md:px-8 md:py-8">
            <div className="flex min-w-0 items-start gap-4">
              <BarChart3
                size={23}
                className="mt-1 shrink-0 text-evo-accent"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  Conheça as ações do mercado
                </h2>
                <p className="mt-2 text-sm text-evo-textSec">
                  Consulte cotações e indicadores na área de análises.
                </p>
              </div>
            </div>
            <Link
              to={user ? "/app/analises" : "/mercado"}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-evo-border px-4 text-sm font-medium text-evo-textMain hover:bg-evo-card"
            >
              Explorar análises <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <GettingStarted compact />
      </main>

      <SiteFooter showRegistrationLink={false} />
    </div>
  );
}
