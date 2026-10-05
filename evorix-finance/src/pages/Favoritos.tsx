import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Clock3, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-xl border border-evo-border bg-evo-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-evo-accent/5"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-yellow-400">
            Sua lista pessoal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-evo-textMain">
            Favoritos
          </h1>
          <p className="mt-1 text-sm text-evo-textSec">
            Acompanhe os preços mais recentes disponíveis para seus ativos
            marcados.
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-end sm:self-center">
          <OrbitCoins variant="favorites" size="sm" />
        </div>
      </div>
      {(favoriteError || quoteError) && (
        <p
          role="alert"
          className="rounded-lg border border-evo-red/20 bg-evo-red/5 p-3 text-sm text-evo-red"
        >
          {favoriteError || quoteError}
        </p>
      )}

      {favoritos.length === 0 ? (
        <Card
          glow="none"
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
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
        </Card>
      ) : (
        <>
          {loading && (
            <p role="status" className="text-sm text-evo-textSec">
              Buscando cotações…
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {favoritos.map((ticker, index) => {
              const quote = quoteBySymbol.get(ticker);
              const percentage =
                quote?.changePercent === null ||
                quote?.changePercent === undefined
                  ? null
                  : Number(quote.changePercent);
              return (
                <Card
                  key={ticker}
                  glow="none"
                  className="favorite-card-enter relative flex flex-col gap-4 transition-transform duration-200 hover:-translate-y-1"
                  style={{ animationDelay: `${Math.min(index, 8) * 65}ms` }}
                >
                  <button
                    type="button"
                    aria-label={`Remover ${ticker} dos favoritos`}
                    aria-pressed="true"
                    onClick={() => void toggleFavorito(ticker)}
                    className="absolute right-4 top-4 rounded p-1 text-yellow-400 transition-transform duration-200 hover:rotate-12 hover:scale-125 active:scale-90"
                    title="Remover dos favoritos"
                  >
                    <Star size={19} fill="currentColor" />
                  </button>
                  <div>
                    <h2 className="font-bold">{ticker}</h2>
                    <p className="mt-1 max-w-[85%] truncate text-xs text-evo-textSec">
                      {quote?.name || "Cotação não disponível"}
                    </p>
                  </div>
                  <div>
                    <p className="font-numbers text-2xl font-semibold">
                      {quote?.price ? money.format(Number(quote.price)) : "—"}
                    </p>
                    <p
                      className={`mt-1 flex items-center gap-1 text-sm font-medium ${percentage === null ? "text-evo-textSec" : percentage >= 0 ? "text-evo-green" : "text-evo-red"}`}
                    >
                      {percentage === null ? (
                        "Sem variação disponível"
                      ) : (
                        <>
                          {percentage >= 0 ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                          {percentage > 0 ? "+" : ""}
                          {percentage.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % no dia
                        </>
                      )}
                    </p>
                  </div>
                  <p className="mt-auto border-t border-evo-border pt-3 text-[11px] text-evo-textSec">
                    <Clock3 size={12} className="mr-1 inline" />
                    {quote?.marketTime
                      ? new Date(quote.marketTime).toLocaleString("pt-BR")
                      : quote?.checkedAt
                        ? `Consulta ao provedor ${new Date(quote.checkedAt).toLocaleString("pt-BR")}`
                        : "Horário indisponível"}
                    {quote?.stale ? " · último preço disponível" : ""}
                  </p>
                </Card>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-evo-textSec">
            Fonte: brapi.dev. Cotações podem ter atraso ou indisponibilidade;
            não são recomendações de investimento.
          </p>
        </>
      )}
    </div>
  );
};
