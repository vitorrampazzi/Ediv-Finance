import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BookOpen,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketAssets } from "../hooks/useMarketAssets";
import { RankingHighlights } from "../components/RankingHighlights";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { useAuth } from "../context/authContext";
import { authLink } from "../lib/authDestination";
import { RankingPreview } from "../components/RankingPreview";
import { GettingStarted } from "../components/GettingStarted";
import { useRegistrationAvailability } from "../hooks/useRegistrationAvailability";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function Home() {
  const { user } = useAuth();
  const registration = useRegistrationAvailability();
  const awaitingRegistration = registration.current?.available === false;
  const { assets, loading, error, requestedAt } = useMarketAssets({
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
                : "Crie sua conta gratuita para conhecer o ranking, estudar os módulos de pesquisa e organizar sua carteira."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={
                  user
                    ? "/ranking"
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
                <BarChart3 size={17} aria-hidden="true" /> Ver mercado
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
              acessar o ranking, a trilha completa e organizar sua carteira.
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
                  Uma amostra dos ativos com maior volume disponível no
                  provedor.
                </p>
              </div>
              <Link
                to="/mercado"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-evo-border px-3 text-sm text-evo-textMain hover:bg-evo-card"
              >
                Explorar ativos <ArrowRight size={15} />
              </Link>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-5 flex items-center gap-2 rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
              >
                <CircleAlert size={17} />
                {error}
              </p>
            )}
            {loading && (
              <p role="status" className="mt-5 text-sm text-evo-textSec">
                Carregando ativos do mercado…
              </p>
            )}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {assets.map((asset) => {
                const variation =
                  asset.changePercent === null
                    ? null
                    : Number(asset.changePercent);
                return (
                  <article
                    key={asset.symbol}
                    className="rounded-xl border border-evo-border bg-evo-card p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{asset.symbol}</h3>
                        <p className="mt-1 line-clamp-1 text-xs text-evo-textSec">
                          {asset.name}
                        </p>
                      </div>
                      <span className="rounded bg-evo-bgMain px-2 py-1 text-[10px] text-evo-textSec">
                        B3
                      </span>
                    </div>
                    <p className="mt-5 font-numbers text-2xl font-semibold">
                      {currency.format(Number(asset.price))}
                    </p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-sm font-medium ${variation === null ? "text-evo-textSec" : variation >= 0 ? "text-evo-green" : "text-evo-red"}`}
                    >
                      {variation === null ? (
                        "Variação indisponível"
                      ) : (
                        <>
                          {variation >= 0 ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                          {variation > 0 ? "+" : ""}
                          {variation.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %
                        </>
                      )}
                    </p>
                    <p className="mt-4 border-t border-evo-border pt-3 text-[11px] text-evo-textSec">
                      {asset.sector || "B3"}
                    </p>
                  </article>
                );
              })}
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
