import { ArrowRight, BarChart3, BookOpen, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { RankingHighlights } from "../components/RankingHighlights";
import { useAuth } from "../context/authContext";
import { authLink } from "../lib/authDestination";
import { RankingPreview } from "../components/RankingPreview";
import { GettingStarted } from "../components/GettingStarted";
import { HomeMarketHighlights } from "../components/HomeMarketHighlights";
import { useRegistrationAvailability } from "../hooks/useRegistrationAvailability";
import { SessionStatus } from "../components/SessionStatus";

export function Home() {
  const { user, loading, sessionError } = useAuth();
  const registration = useRegistrationAvailability();
  const awaitingRegistration = registration.current?.available === false;
  if (loading || (!user && sessionError)) return <SessionStatus embedded />;
  if (user) return <Navigate to="/app" replace />;
  return <HomeContent awaitingRegistration={awaitingRegistration} />;
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
        className={`home-editorial mx-auto grid max-w-7xl items-center gap-5 md:grid-cols-[1.2fr_.8fr] md:gap-10 ${member ? "py-2 md:py-8" : "px-4 py-6 sm:px-5 md:px-8 md:py-10"}`}
      >
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
            <Sparkles size={14} aria-hidden="true" />{" "}
            {member && firstName
              ? `Olá, ${firstName}`
              : "Escola do dividendo"}
          </span>
          <h1
            className={`mt-3 max-w-2xl font-bold leading-[1.12] tracking-[-.035em] sm:mt-5 sm:leading-[1.07] ${member ? "text-[1.75rem] sm:text-4xl xl:text-5xl" : "text-[2rem] sm:text-5xl lg:text-6xl"}`}
          >
            {member
              ? "Sua escola de ações e dividendos."
              : "Aprenda sobre ações e dividendos."}
            <span className="mt-2 hidden font-normal text-evo-textSec sm:block">
              {member ? "Pesquise. Compare. Aprenda." : "Entenda cada cenário."}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-evo-textSec sm:mt-5 sm:text-base">
            {awaitingRegistration && !user
              ? "Explore as ações e a primeira aula enquanto preparamos a abertura dos cadastros."
              : member
                ? "Pesquise empresas, compare cenários e avance nas aulas sobre dividendos."
                : "Pesquisas de ações, contexto das empresas e aulas para entender o mercado de dividendos."}
          </p>
          <div className="mt-5 grid gap-1 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-evo-primary px-5 text-sm font-semibold text-white hover:bg-evo-primaryHover sm:text-base"
            >
              {user
                ? member
                  ? "Explorar o ranking"
                  : "Ir para meu início"
                : awaitingRegistration
                  ? "Começar pela primeira aula"
                  : "Criar conta grátis"}{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              to={user ? "/app/aprender" : "/aprender"}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-medium text-evo-textSec hover:text-evo-textMain"
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
        <RankingPreview />
      </section>

      <RankingHighlights />
      <section
        id="mercado"
        className="scroll-mt-24 border-y border-evo-border bg-evo-bgSec"
      >
        <div
          className={`mx-auto max-w-7xl py-6 md:py-8 ${member ? "px-4 md:px-6" : "px-4 sm:px-5 md:px-8"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <BarChart3
                size={23}
                className="mt-1 hidden shrink-0 text-evo-accent sm:block"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  Ações em destaque
                </h2>
                <p className="mt-1 text-sm text-evo-textSec">
                  Maiores altas percentuais da sessão disponível.
                </p>
              </div>
            </div>
            <Link
              to={user ? "/app/analises" : "/mercado"}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-evo-accent sm:rounded-lg sm:border sm:border-evo-border sm:px-4 sm:text-evo-textMain sm:hover:bg-evo-card"
            >
              Explorar análises <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <HomeMarketHighlights />
          <p className="mt-4 text-xs text-evo-textSec">
            Fonte: brapi.dev · Ações brasileiras.
          </p>
        </div>
      </section>
      <GettingStarted compact />
    </>
  );
}
