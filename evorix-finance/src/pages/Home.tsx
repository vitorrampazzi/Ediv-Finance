import { ArrowRight, BarChart3, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketAssets } from "../hooks/useMarketAssets";
import { MarketAssetList } from "../components/MarketAssetList";
import { PageState } from "../components/PageState";
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
  const { assets, loading, error, requestedAt, retry } = useMarketAssets({
    search: "",
    type: "stock",
    sortBy: "volume",
    page: 1,
    limit: 8,
  });

  return (
    <div className="min-h-screen bg-evo-bgMain text-evo-textMain">
      <SiteHeader />

      <main id="conteudo">
        <section className="home-editorial mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.2fr_.8fr] md:px-8 md:pb-24 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
              <Sparkles size={14} aria-hidden="true" /> Escola do dividendo ·
              Beta
            </span>
            <h1 className="mt-7 max-w-2xl text-4xl font-bold leading-[1.07] tracking-[-.045em] sm:text-5xl lg:text-6xl">
              Aprenda sobre ações e dividendos.
              <span className="block mt-2 font-normal text-evo-textSec">
                Entenda cada cenário.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-evo-textSec">
              Aprenda a interpretar cenários e entender os riscos.{" "}
              {awaitingRegistration && !user
                ? "Explore o mercado, a primeira aula e o glossário enquanto preparamos a abertura dos cadastros."
                : "Crie sua conta gratuita para explorar previsões, conhecer as empresas por trás das ações e aprender sobre dividendos."}
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
                to="/mercado"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm text-evo-textSec hover:text-evo-textMain"
              >
                <BarChart3 size={17} aria-hidden="true" /> Análises de ações
              </Link>
              <Link
                to="/aprender"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-evo-border px-5 font-semibold text-evo-textMain hover:bg-evo-card"
              >
                <BookOpen size={17} aria-hidden="true" /> Aprender
              </Link>
            </div>
            <p className="mt-4 text-xs text-evo-textSec">
              Mercado, primeira aula e glossário abertos. Conta gratuita para
              acessar as pesquisas por empresa e a escola de dividendos.
            </p>
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
          <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
                  Mercado brasileiro
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Ações mais negociadas
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-evo-textSec">
                  Uma amostra das ações com maior volume disponível no provedor.
                </p>
              </div>
              <Link
                to="/mercado"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain hover:bg-evo-card"
              >
                Explorar ações <ArrowRight size={15} />
              </Link>
            </div>
            {error && (
              <div className="mt-5">
                <PageState
                  kind="error"
                  title="Os dados de mercado estão indisponíveis"
                  description={error}
                  actionLabel="Tentar novamente"
                  onAction={retry}
                />
              </div>
            )}
            {loading && (
              <p role="status" className="mt-5 text-sm text-evo-textSec">
                Carregando ações do mercado…
              </p>
            )}
            <div className="mt-6">
              <MarketAssetList
                assets={assets}
                loading={loading}
                headingLevel={3}
              />
              {!loading && assets.length === 0 && !error && (
                <PageState
                  kind="empty"
                  title="Nenhuma ação disponível no momento"
                  description="Você pode carregar novamente ou explorar as aulas e a pesquisa da equipe."
                  actionLabel="Carregar novamente"
                  onAction={retry}
                />
              )}
            </div>
            {requestedAt && (
              <p className="mt-4 text-xs text-evo-textSec">
                Consulta ao provedor:{" "}
                {new Date(requestedAt).toLocaleString("pt-BR")}. O horário é da
                consulta, não necessariamente da negociação.
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
              Fonte: brapi.dev. Conteúdo informativo, sem recomendação de compra
              ou venda.
            </p>
          </div>
        </section>
        <GettingStarted />
      </main>

      <SiteFooter />
    </div>
  );
}
