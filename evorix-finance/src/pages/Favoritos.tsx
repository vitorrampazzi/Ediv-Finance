import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Clock3, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { OrbitCoins } from "../components/OrbitCoins";
import { useFavoritos } from "../hooks/useFavoritos";
import { useMarketQuotes } from "../hooks/useMarketQuotes";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const Favoritos = () => {
  const { favoritos, toggleFavorito, error: favoriteError } = useFavoritos();
  const { quotes, loading, error: quoteError } = useMarketQuotes(favoritos);
  const quoteBySymbol = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol, quote])),
    [quotes],
  );
  const dailyMoves = quotes.flatMap((quote) => {
    const change =
      quote.changePercent === null ? null : Number(quote.changePercent);
    return change !== null && Number.isFinite(change) && !quote.unavailable
      ? [{ symbol: quote.symbol, change }]
      : [];
  });
  const rising = dailyMoves.filter((quote) => quote.change > 0).length;
  const falling = dailyMoves.filter((quote) => quote.change < 0).length;
  const biggestMove = dailyMoves.reduce<(typeof dailyMoves)[number] | null>(
    (largest, quote) =>
      !largest || Math.abs(quote.change) > Math.abs(largest.change)
        ? quote
        : largest,
    null,
  );

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-start justify-between gap-5 border-b border-evo-border pb-8 sm:pb-10">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-evo-accent">
            Sua lista pessoal
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-evo-textMain sm:text-5xl">
            Favoritos. Seu radar.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-evo-textSec">
            Os ativos que você escolheu acompanhar, lado a lado. Veja os preços
            e as variações disponíveis sem perder de vista o que importa para
            você.
          </p>
        </div>
        <div className="shrink-0 opacity-80">
          <OrbitCoins variant="favorites" size="sm" />
        </div>
      </header>
      {(favoriteError || quoteError) && (
        <p
          role="alert"
          className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
        >
          {favoriteError || quoteError}
        </p>
      )}

      {favoritos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-b border-evo-border py-10 sm:py-16">
          <Star size={40} className="text-evo-textSec" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">Nenhum favorito ainda</h2>
          <p className="max-w-sm text-sm text-evo-textSec">
            Abra a lista de cotações e use a estrela para adicionar ativos à sua
            lista.
          </p>
          <Link
            to="/app/analises"
            className="mt-2 inline-flex min-h-10 items-center gap-1.5 font-medium text-evo-accent"
          >
            Ver cotações <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {loading && (
            <p role="status" className="text-sm text-evo-textSec">
              Buscando cotações…
            </p>
          )}
          <div>
            <dl className="grid grid-cols-3 gap-x-3 border-b border-evo-border pb-6 sm:gap-x-8">
              <div>
                <dt className="text-xs text-evo-textSec">Ativos salvos</dt>
                <dd className="mt-2 font-numbers text-2xl font-medium sm:text-4xl">
                  {favoritos.length}
                </dd>
              </div>
              <div className="border-l border-evo-border pl-3 sm:pl-8">
                <dt className="text-xs text-evo-textSec">Em alta na cotação</dt>
                <dd className="mt-2 font-numbers text-2xl font-medium text-evo-green sm:text-4xl">
                  {loading ? "—" : rising}
                </dd>
              </div>
              <div className="border-l border-evo-border pl-3 sm:pl-8">
                <dt className="text-xs text-evo-textSec">
                  Em queda na cotação
                </dt>
                <dd className="mt-2 font-numbers text-2xl font-medium text-evo-red sm:text-4xl">
                  {loading ? "—" : falling}
                </dd>
              </div>
            </dl>
            {!loading && biggestMove && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-evo-textSec">
                <strong className="font-medium text-evo-textMain">
                  {biggestMove.symbol}
                </strong>{" "}
                tem a maior oscilação percentual entre as cotações recebidas,
                considerando altas e quedas:{" "}
                <span
                  className={`font-numbers ${biggestMove.change >= 0 ? "text-evo-green" : "text-evo-red"}`}
                >
                  {biggestMove.change > 0 ? "+" : ""}
                  {biggestMove.change.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>{" "}
                na última variação informada. Isso descreve o preço do ativo;
                não é o retorno da sua carteira.
              </p>
            )}
            {!loading && dailyMoves.length < favoritos.length && (
              <p className="mt-2 text-xs text-evo-textSec">
                Variação disponível para {dailyMoves.length} de{" "}
                {favoritos.length} ativos. Valores indisponíveis não entram na
                contagem de altas e quedas.
              </p>
            )}
          </div>
          <div aria-busy={loading}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Sua lista de acompanhamento
              </h2>
              <Link
                to="/app/analises"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-evo-accent"
              >
                Encontrar ativos <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1.2fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)_minmax(10rem,1fr)_3rem] gap-5 border-b border-evo-border pb-3 text-[11px] font-medium uppercase tracking-[.13em] text-evo-textSec md:grid"
            >
              <span>Ativo</span>
              <span className="text-right">Preço informado</span>
              <span className="text-right">Variação informada</span>
              <span className="text-right">Horário informado</span>
              <span className="sr-only">Remover favorito</span>
            </div>
            <ul
              aria-label="Seus ativos favoritos"
              className="divide-y divide-evo-border border-b border-evo-border"
            >
              {favoritos.map((ticker, index) => {
                const quote = quoteBySymbol.get(ticker);
                const rawPercentage =
                  quote?.changePercent === null ||
                  quote?.changePercent === undefined
                    ? null
                    : Number(quote.changePercent);
                const percentage =
                  rawPercentage !== null &&
                  Number.isFinite(rawPercentage) &&
                  !quote?.unavailable
                    ? rawPercentage
                    : null;
                return (
                  <li
                    key={ticker}
                    className="favorite-card-enter grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-x-3 gap-y-3 py-5 transition-colors hover:bg-evo-bgSec/30 md:grid-cols-[minmax(0,1.2fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)_minmax(10rem,1fr)_3rem] md:gap-x-5 md:py-6"
                    style={{ animationDelay: `${Math.min(index, 8) * 65}ms` }}
                  >
                    <div className="col-start-1 row-start-1 min-w-0">
                      <h3 className="text-base font-semibold tracking-tight">
                        {ticker}
                      </h3>
                      <p
                        className="mt-1 truncate text-xs text-evo-textSec"
                        title={quote?.name}
                      >
                        {quote?.name || "Cotação não disponível"}
                      </p>
                    </div>
                    <p className="col-start-2 row-start-1 text-right font-numbers text-base font-medium sm:text-lg">
                      <span className="sr-only">Preço informado: </span>
                      {quote?.price ? money.format(Number(quote.price)) : "—"}
                    </p>
                    <p
                      className={`col-start-2 row-start-2 flex items-center justify-end gap-1 whitespace-nowrap font-numbers text-xs font-medium md:col-start-3 md:row-start-1 md:text-sm ${percentage === null ? "text-evo-textSec" : percentage >= 0 ? "text-evo-green" : "text-evo-red"}`}
                    >
                      <span className="sr-only">Variação informada: </span>
                      {percentage === null ? (
                        "Indisponível"
                      ) : (
                        <>
                          {percentage >= 0 ? (
                            <ArrowUp size={14} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={14} aria-hidden="true" />
                          )}
                          {percentage > 0 ? "+" : ""}
                          {percentage.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %
                        </>
                      )}
                    </p>
                    <p className="col-start-1 row-start-2 text-[11px] leading-relaxed text-evo-textSec md:col-start-4 md:row-start-1 md:text-right">
                      <Clock3
                        size={12}
                        className="mr-1 inline"
                        aria-hidden="true"
                      />
                      {quote?.marketTime
                        ? new Date(quote.marketTime).toLocaleString("pt-BR")
                        : quote?.checkedAt
                          ? `Consulta ao provedor ${new Date(quote.checkedAt).toLocaleString("pt-BR")}`
                          : "Horário indisponível"}
                    </p>
                    <div className="col-start-3 row-start-1 flex justify-end md:col-start-5">
                      <button
                        type="button"
                        aria-label={`Remover ${ticker} dos favoritos`}
                        aria-pressed="true"
                        onClick={() => void toggleFavorito(ticker)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-yellow-400 transition-transform duration-200 hover:rotate-12 hover:bg-evo-bgSec active:scale-90"
                        title="Remover dos favoritos"
                      >
                        <Star
                          size={19}
                          fill="currentColor"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs leading-relaxed text-evo-textSec">
            Fonte: brapi.dev. Conteúdo informativo, sem recomendação de
            investimento.
          </p>
        </>
      )}
    </section>
  );
};
