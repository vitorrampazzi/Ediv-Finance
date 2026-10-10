import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  Minus,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { PortfolioInsights } from "../lib/portfolioInsights";
import { formatPercent } from "../lib/portfolioInsights";
import { formatMoney, units } from "../lib/finance";
import { typeLabels } from "../lib/portfolio";

const allocationColors = [
  "#7cbdb7",
  "#96a6bb",
  "#c7baa1",
  "#9696b7",
  "#739697",
  "#b9c3cd",
];
function signedMoney(value: string) {
  return (units(value) > 0n ? "+" : "") + formatMoney(value);
}

export function PortfolioPulse({
  insights,
  loading,
  failed = false,
  refreshing = false,
  onRefresh,
  compact = false,
}: {
  insights?: PortfolioInsights;
  loading: boolean;
  failed?: boolean;
  refreshing?: boolean;
  onRefresh: () => void;
  compact?: boolean;
}) {
  if (loading)
    return (
      <section className="border-y border-evo-border py-10" aria-busy="true">
        <p role="status" className="text-evo-textSec">
          Organizando a leitura da sua carteira…
        </p>
        <div
          className="mt-6 h-12 w-2/3 max-w-md animate-pulse bg-evo-border/30"
          aria-hidden="true"
        />
      </section>
    );
  if (failed || !insights)
    return (
      <section className="border-y border-evo-border py-8">
        <h2 className="text-xl font-semibold">
          Seus números precisam estar completos
        </h2>
        <p className="mt-2 text-sm text-evo-textSec">
          Não foi possível calcular a leitura da carteira agora.
        </p>
        <button
          className="action-secondary mt-4"
          onClick={onRefresh}
          disabled={refreshing}
        >
          Tentar novamente
        </button>
      </section>
    );
  if (insights.status === "EMPTY")
    return (
      <section className="portfolio-empty border-y border-evo-border py-10 sm:py-14">
        <p className="text-xs uppercase tracking-[.2em] text-evo-accent">
          Uma leitura que é sua
        </p>
        <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Sua primeira operação começa a contar uma história.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-evo-textSec">
          Informe uma compra ou importe seus registros para acompanhar custo,
          variação e concentração.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="action" to="/app/carteira#operation-form">
            Registrar investimento <ArrowRight size={16} />
          </Link>
          <Link className="action-secondary" to="/app/aprender#carteira">
            Entender minha carteira
          </Link>
        </div>
        {(units(insights.realizedPnl) !== 0n ||
          units(insights.receivedIncome) !== 0n) && (
          <p className="mt-6 text-sm text-evo-textSec">
            Mesmo sem posições abertas, seus registros guardam{" "}
            {formatMoney(insights.realizedPnl)} em resultado de vendas e{" "}
            {formatMoney(insights.receivedIncome)} em proventos recebidos.
          </p>
        )}
      </section>
    );
  const positive =
    insights.unrealizedPnl !== null && units(insights.unrealizedPnl) >= 0n;
  const hasResult = insights.unrealizedPnl !== null;
  const unchanged = hasResult && units(insights.unrealizedPnl!) === 0n;
  const partial = insights.status === "PARTIAL";
  const concentration = insights.concentration;
  const contributions = insights.positions
    .filter((p) => p.unrealizedPnl !== null && units(p.unrealizedPnl) !== 0n)
    .sort((a, b) => {
      const aValue = units(a.unrealizedPnl!);
      const bValue = units(b.unrealizedPnl!);
      const aAbs = aValue < 0n ? -aValue : aValue;
      const bAbs = bValue < 0n ? -bValue : bValue;
      return aAbs === bAbs
        ? a.ticker.localeCompare(b.ticker)
        : aAbs > bAbs
          ? -1
          : 1;
    })
    .slice(0, 4);

  return (
    <section aria-label="Leitura da sua carteira" className="space-y-8">
      <div
        className={`portfolio-pulse border-y border-evo-border py-7 ${compact ? "" : "sm:py-10"}`}
      >
        <div className="grid gap-8 xl:grid-cols-[1.2fr_.8fr] xl:gap-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[.18em] text-evo-textSec">
                {partial
                  ? "Valor estimado da parte cotada"
                  : "Valor de mercado estimado"}
              </p>
              <button
                type="button"
                disabled={refreshing}
                onClick={onRefresh}
                aria-label="Atualizar carteira e cotações"
                className="inline-flex min-h-10 items-center gap-2 text-xs text-evo-textSec hover:text-evo-textMain disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />{" "}
                Atualizar
              </button>
            </div>
            <p className="portfolio-value mt-4 font-numbers font-semibold tracking-tight">
              {insights.quotedMarketValue !== null
                ? formatMoney(insights.quotedMarketValue)
                : "Sem cotação"}
            </p>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <strong
                className={`inline-flex items-center gap-1.5 text-lg font-medium ${hasResult && !unchanged ? (positive ? "text-evo-green" : "text-evo-red") : "text-evo-textSec"}`}
              >
                {hasResult ? (
                  <>
                    {unchanged ? (
                      <Minus size={20} />
                    ) : positive ? (
                      <ArrowUpRight size={20} />
                    ) : (
                      <ArrowDownRight size={20} />
                    )}
                    {signedMoney(insights.unrealizedPnl!)}{" "}
                    <span className="text-sm">
                      ({formatPercent(insights.unrealizedPnlPercent, true)})
                    </span>
                  </>
                ) : (
                  "Variação indisponível"
                )}
              </strong>
              <span className="text-xs text-evo-textSec">
                em relação ao custo das posições cotadas
              </span>
            </div>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-evo-textSec">
              Resultado das posições abertas, antes de venda e impostos. Não
              representa a variação do dia nem inclui proventos ou o resultado
              de vendas anteriores.
            </p>
          </div>
          <div className="border-t border-evo-border pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <p className="text-xs font-medium uppercase tracking-[.18em] text-evo-accent">
              O que seus registros mostram
            </p>
            <h2 className="mt-4 text-xl font-medium leading-snug sm:text-2xl">
              {hasResult
                ? positive
                  ? units(insights.unrealizedPnl!) === 0n
                    ? "A parte cotada está no mesmo valor do custo."
                    : "A parte cotada está acima do custo registrado."
                  : "A parte cotada está abaixo do custo registrado."
                : "Faltam preços para comparar valor e custo."}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-evo-textSec">
              {concentration && concentration.weightPercent !== null ? (
                <>
                  <strong className="font-medium text-evo-textMain">
                    {concentration.ticker}
                  </strong>{" "}
                  representa {formatPercent(concentration.weightPercent)} do
                  custo das posições abertas. Esse peso ajuda a entender quanto
                  um único ativo pode influenciar seus registros.
                </>
              ) : (
                "O custo das posições ainda não permite calcular a distribuição."
              )}
            </p>
            <Link
              to="/app/aprender#risco"
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm text-evo-accent underline"
            >
              <BookOpen size={15} /> Entender concentração e risco
            </Link>
          </div>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-evo-border pt-5 lg:grid-cols-4">
          {[
            {
              label: "Custo das posições abertas",
              value: formatMoney(insights.openCostBasis),
              detail: "Todas as posições registradas",
            },
            {
              label: "Resultado realizado em vendas",
              value: formatMoney(insights.realizedPnl),
              detail: "Antes de impostos",
            },
            {
              label: "Proventos recebidos",
              value: formatMoney(insights.receivedIncome),
              detail: "Eventos marcados como recebidos",
            },
            {
              label: "Cobertura de cotações",
              value: `${insights.coverage.pricedPositionCount}/${insights.coverage.totalPositionCount} posições`,
              detail:
                insights.coverage.costPercent === null
                  ? "Proporção do custo indisponível"
                  : `${formatPercent(insights.coverage.costPercent)} do custo registrado`,
            },
          ].map((item) => (
            <div className="min-w-0" key={item.label}>
              <dt className="text-xs leading-relaxed text-evo-textSec">
                {item.label}
              </dt>
              <dd className="mt-2 break-words font-numbers text-sm font-medium sm:text-base">
                {item.value}
              </dd>
              <dd className="mt-1 text-[11px] text-evo-textSec">
                {item.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {!compact && (
        <div className="grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="allocation-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="allocation-heading" className="text-xl font-semibold">
                Onde seu custo está distribuído
              </h2>
              <span className="text-xs text-evo-textSec">Por classe</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
              Inclui as posições sem preço. A distribuição usa custo registrado,
              não valor de mercado.
            </p>
            <div
              className="mt-6 flex h-3 w-full overflow-hidden bg-evo-border/30"
              aria-hidden="true"
            >
              {insights.allocation.map((item, index) => (
                <span
                  key={item.assetType}
                  style={{
                    width: `${Math.max(0, Math.min(100, Number(item.weightPercent)))}%`,
                    backgroundColor:
                      allocationColors[index % allocationColors.length],
                  }}
                />
              ))}
            </div>
            <dl className="mt-4 divide-y divide-evo-border">
              {insights.allocation.map((item, index) => (
                <div
                  className="flex items-center justify-between gap-4 py-4"
                  key={item.assetType}
                >
                  <dt className="inline-flex items-center gap-3 text-sm">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{
                        backgroundColor:
                          allocationColors[index % allocationColors.length],
                      }}
                      aria-hidden="true"
                    />
                    {typeLabels[item.assetType] || item.assetType}
                  </dt>
                  <dd className="text-right">
                    <span className="font-numbers text-sm">
                      {formatPercent(item.weightPercent)}
                    </span>
                    <span className="ml-3 text-xs text-evo-textSec">
                      {formatMoney(item.costBasis)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="contributors-heading">
            <h2 id="contributors-heading" className="text-xl font-semibold">
              O que explica a variação
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-evo-textSec">
              Maiores contribuições em reais frente ao custo, entre as posições
              cotadas.
            </p>
            {contributions.length ? (
              <ol className="mt-4 divide-y divide-evo-border">
                {contributions.map((item) => (
                  <li
                    key={item.ticker}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.ticker}</p>
                      <p className="mt-1 truncate text-xs text-evo-textSec">
                        {item.assetName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-numbers text-sm ${units(item.unrealizedPnl!) >= 0n ? "text-evo-green" : "text-evo-red"}`}
                      >
                        {signedMoney(item.unrealizedPnl!)}
                      </p>
                      <p className="mt-1 text-xs text-evo-textSec">
                        {formatPercent(item.unrealizedPnlPercent, true)} frente
                        ao custo
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 text-sm text-evo-textSec">
                {insights.coverage.pricedPositionCount > 0
                  ? "As posições cotadas estão no mesmo valor do custo registrado."
                  : "As contribuições aparecerão quando houver preços disponíveis."}
              </p>
            )}
            <Link
              to="/app/carteira"
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm text-evo-accent"
            >
              Ver todas as posições <ArrowRight size={15} />
            </Link>
          </section>
        </div>
      )}
      {insights.coverage.unpricedTickers.length > 0 && (
        <div className="flex items-start gap-3 border-l-2 border-evo-border pl-4 text-xs leading-relaxed text-evo-textSec">
          <CircleHelp size={17} className="mt-0.5 shrink-0" />
          <p>
            Sem preço disponível: {insights.coverage.unpricedTickers.join(", ")}
            . Essas posições ficam fora da estimativa de mercado e da variação.
          </p>
        </div>
      )}
    </section>
  );
}
