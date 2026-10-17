import { ArrowDown, ArrowUp } from "lucide-react";
import type { MarketAsset } from "../hooks/useMarketAssets";
import { CompanyLogo } from "./CompanyLogo";
import "./market-list.css";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 2,
});
const rowClass =
  "market-asset-row grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(7rem,.8fr)_minmax(6rem,.6fr)_minmax(7rem,.8fr)] md:gap-x-5 md:py-5";

function readNumber(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type MarketAssetListProps = {
  assets: MarketAsset[];
  loading?: boolean;
  headingLevel?: 2 | 3;
  metric?: "volume" | "marketCap";
};

export function MarketAssetList({
  assets,
  loading = false,
  headingLevel = 2,
  metric = "volume",
}: MarketAssetListProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const metricLabel = metric === "marketCap" ? "Valor de mercado" : "Volume";

  return (
    <div aria-busy={loading} className="market-asset-list">
      <div
        aria-hidden="true"
        className="market-list-heading hidden grid-cols-[minmax(0,1.3fr)_minmax(7rem,.8fr)_minmax(6rem,.6fr)_minmax(7rem,.8fr)] gap-5 border-b border-evo-border pb-3 text-xs font-medium text-evo-textSec md:grid"
      >
        <span>Ação / setor</span>
        <span className="text-right">Preço</span>
        <span className="text-right">Variação</span>
        <span className="text-right">{metricLabel}</span>
      </div>
      {loading ? (
        <div
          aria-hidden="true"
          className="divide-y divide-evo-border border-b border-evo-border"
        >
          {Array.from({ length: 24 }, (_, index) => (
            <div
              key={index}
              className={`${rowClass} motion-safe:animate-pulse`}
            >
              <div className="col-start-1 row-start-1 space-y-2">
                <div className="h-5 w-16 rounded bg-evo-border/60" />
                <div className="h-3 w-32 max-w-full rounded bg-evo-border/40" />
                <div className="hidden h-3 w-20 rounded bg-evo-border/30 md:block" />
              </div>
              <div className="col-start-2 row-start-1 ml-auto h-5 w-20 rounded bg-evo-border/50" />
              <div className="col-start-2 row-start-2 ml-auto h-3 w-14 rounded bg-evo-border/40 md:col-start-3 md:row-start-1" />
              <div className="col-start-1 row-start-2 h-3 w-24 rounded bg-evo-border/30 md:col-start-4 md:row-start-1 md:ml-auto" />
            </div>
          ))}
        </div>
      ) : (
        <ul
          aria-label="Ações encontradas"
          className="divide-y divide-evo-border border-b border-evo-border"
        >
          {assets.map((asset) => {
            const percentage = readNumber(asset.changePercent);
            const price = readNumber(asset.price);
            const metricValue = readNumber(asset[metric]);
            const formattedMetric =
              metricValue === null
                ? "Indisponível"
                : metric === "marketCap"
                  ? compactMoney.format(metricValue)
                  : metricValue.toLocaleString("pt-BR");

            return (
              <li key={asset.symbol} className={rowClass}>
                <div className="company-identity col-start-1 row-start-1 min-w-0">
                  <CompanyLogo ticker={asset.symbol} logoUrl={asset.logoUrl} />
                  <div className="company-identity-copy">
                    <Heading className="text-[1.0625rem] font-semibold tracking-tight text-evo-textMain">
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
                </div>
                <p className="col-start-2 row-start-1 text-right">
                  <span className="sr-only">Preço informado: </span>
                  <strong
                    className={`font-numbers font-medium ${price === null ? "text-xs text-evo-textSec" : "text-base text-evo-textMain sm:text-lg"}`}
                  >
                    {price === null ? "Indisponível" : money.format(price)}
                  </strong>
                </p>
                <p
                  className={`market-asset-change col-start-2 row-start-2 flex items-center justify-end gap-1 whitespace-nowrap font-numbers text-xs font-medium md:col-start-3 md:row-start-1 md:text-sm ${percentage === null ? "text-evo-textSec" : percentage >= 0 ? "text-evo-green" : "text-evo-red"}`}
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
                <p
                  className="col-start-1 row-start-2 text-[11px] text-evo-textSec md:col-start-4 md:row-start-1 md:text-right md:text-xs"
                  title={
                    metricValue !== null && metric === "marketCap"
                      ? money.format(metricValue)
                      : undefined
                  }
                >
                  <span className="md:hidden">{metricLabel} </span>
                  <span className="sr-only hidden md:inline">
                    {metricLabel}:{" "}
                  </span>
                  <span className="font-numbers">{formattedMetric}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
