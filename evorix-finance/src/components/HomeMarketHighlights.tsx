import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useMarketAssets } from "../hooks/useMarketAssets";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const percentage = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function HomeMarketHighlights() {
  const { user } = useAuth();
  const { assets, loading, error, retry } = useMarketAssets({
    search: "",
    sortBy: "change",
    page: 1,
    limit: 3,
  });
  const gainers = assets.filter(
    (asset) =>
      asset.changePercent !== null &&
      Number.isFinite(Number(asset.changePercent)) &&
      Number(asset.changePercent) > 0 &&
      Number.isFinite(Number(asset.price)) &&
      Number(asset.price) > 0,
  );

  if (loading) {
    return (
      <div className="mt-6" aria-busy="true">
        <p role="status" className="text-sm text-evo-textSec">
          Buscando as maiores altas da sessão…
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-evo-border bg-evo-card p-4 sm:p-5"
            >
              <div className="space-y-3 animate-pulse motion-reduce:animate-none">
                <div className="h-4 w-20 rounded bg-evo-border/40" />
                <div className="h-3 w-3/4 rounded bg-evo-border/30" />
                <div className="hidden h-8 w-28 rounded bg-evo-border/40 sm:block" />
                <div className="hidden h-4 w-24 rounded bg-evo-border/30 sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || gainers.length === 0) {
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-evo-border pt-4">
        <p role="status" className="text-sm text-evo-textSec">
          {error
            ? "As altas do mercado estão indisponíveis neste momento."
            : "Não há ações com variação positiva nos dados disponíveis."}
        </p>
        {error && (
          <button type="button" onClick={retry} className="action-secondary">
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <ul
      aria-label="Ações com maiores altas disponíveis"
      className="mt-4 grid border-t border-evo-border sm:mt-6 sm:grid-cols-3"
    >
      {gainers.map((asset) => (
        <li
          key={asset.symbol}
          className="min-w-0 border-b border-evo-border sm:border-b-0 sm:border-r sm:last:border-r-0"
        >
          <Link
            to={`${user ? "/app/analises" : "/mercado"}?busca=${encodeURIComponent(asset.symbol)}`}
            className="group relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-4 transition-colors hover:bg-evo-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evo-accent sm:flex sm:flex-col sm:items-stretch sm:p-5"
            aria-label={`Ver análise de ${asset.symbol}, ${asset.name}`}
          >
            <div className="col-start-1 row-start-1 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight">
                {asset.symbol}
              </h3>
              <ArrowUpRight
                size={19}
                className="hidden shrink-0 text-evo-green sm:block"
                aria-hidden="true"
              />
            </div>
            <p
              className="col-start-1 row-start-2 mt-1 truncate text-xs text-evo-textSec sm:line-clamp-2 sm:whitespace-normal sm:text-sm"
              title={asset.name}
            >
              {asset.name}
            </p>
            <div className="col-start-2 row-span-2 row-start-1 text-right sm:mt-auto sm:pt-5 sm:text-left">
              <p className="sr-only text-xs text-evo-textSec sm:not-sr-only">
                Variação da sessão
              </p>
              <p className="font-numbers text-lg font-medium text-evo-green sm:mt-1 sm:text-3xl">
                {percentage.format(Number(asset.changePercent))}%
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-2 sm:mt-4 sm:justify-between sm:border-t sm:border-evo-border sm:pt-3">
                <p className="font-numbers text-xs text-evo-textMain sm:text-sm">
                  <span className="sr-only">Cotação informada: </span>
                  {money.format(Number(asset.price))}
                </p>
                <span className="hidden items-center gap-1 text-xs text-evo-textSec group-hover:text-evo-accent sm:inline-flex">
                  Ver ação <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
