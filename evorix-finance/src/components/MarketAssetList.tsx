import { ArrowDown, ArrowUp } from "lucide-react";
import type { MarketAsset } from "../hooks/useMarketAssets";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type MarketAssetListProps = {
  assets: MarketAsset[];
  loading?: boolean;
  headingLevel?: 2 | 3;
};

export function MarketAssetList({
  assets,
  loading = false,
  headingLevel = 2,
}: MarketAssetListProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <div aria-busy={loading}>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[minmax(0,1.3fr)_minmax(8rem,.8fr)_minmax(7rem,.6fr)_minmax(8rem,.8fr)] gap-5 border-b border-evo-border pb-3 text-[11px] font-medium uppercase tracking-[.13em] text-evo-textSec md:grid"
      >
        <span>Ação / setor</span>
        <span className="text-right">Preço informado</span>
        <span className="text-right">Variação</span>
        <span className="text-right">Volume informado</span>
      </div>
      <ul
        aria-label="Ações encontradas"
        className="divide-y divide-evo-border border-b border-evo-border"
      >
        {assets.map((asset) => {
          const percentage =
            asset.changePercent === null ? null : Number(asset.changePercent);

          return (
            <li
              key={asset.symbol}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-5 transition-colors hover:bg-evo-bgSec/30 md:grid-cols-[minmax(0,1.3fr)_minmax(8rem,.8fr)_minmax(7rem,.6fr)_minmax(8rem,.8fr)] md:gap-x-5 md:py-6"
            >
              <div className="col-start-1 row-start-1 min-w-0">
                <Heading className="text-base font-semibold tracking-tight text-evo-textMain">
                  {asset.symbol}
                </Heading>
                <p
                  className="mt-1 truncate text-xs text-evo-textSec"
                  title={asset.name}
                >
                  {asset.name}
                </p>
                <p className="mt-1 hidden text-xs text-evo-textSec md:block">
                  {asset.sector || asset.subType || "B3"}
                </p>
              </div>
              <p className="col-start-2 row-start-1 text-right">
                <span className="sr-only">Preço informado: </span>
                <strong className="font-numbers text-base font-medium text-evo-textMain sm:text-lg">
                  {money.format(Number(asset.price))}
                </strong>
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
              <p className="col-start-1 row-start-2 text-[11px] text-evo-textSec md:col-start-4 md:row-start-1 md:text-right md:text-xs">
                <span className="md:hidden">Volume </span>
                <span className="sr-only hidden md:inline">
                  Volume informado:{" "}
                </span>
                {asset.volume !== null
                  ? Number(asset.volume).toLocaleString("pt-BR")
                  : "indisponível"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
