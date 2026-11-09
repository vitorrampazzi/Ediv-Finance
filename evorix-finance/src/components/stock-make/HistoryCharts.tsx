import { useId, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  groupDividends,
  formatHistoricalDividend,
  type StockHistory,
} from "../../lib/stockHistory";
import { usePriceSeries, type BasisChoice } from "../../hooks/usePriceSeries";
import { decimal, quoteMoney, saoPauloDay } from "../../lib/liveQuotes";
import {
  basisDescriptions,
  basisLabels,
  coverageText,
  dateText,
  markerTitle,
  monthText,
  periodFor,
  rowTooltip,
  selectSeries,
  seriesPeriods,
  seriesPlot,
  seriesSummary,
  unavailableMessages,
  type PlotRow,
  type PriceBasis,
  type PriceGranularity,
  type SeriesMarker,
  type SeriesPeriod,
} from "../../lib/priceSeries";
import {
  axisProps,
  brl,
  gridProps,
  num,
  pct,
  useHistory,
  useStockData,
  useStockMarket,
} from "./data";
import { ChartTip, Legend, Seg } from "./ui";

const TEAL = "var(--fmk-teal)",
  AMBER = "var(--fmk-amber)";
const tickDay = (time: number) =>
  dateText(new Date(time).toISOString().slice(0, 10));
const tickMonth = (time: number) =>
  monthText(new Date(time).toISOString().slice(0, 7));
const tooltipBox = { maxWidth: "100%" };
const bases: readonly PriceBasis[] = ["adjusted", "nominal"];
const granularities: readonly PriceGranularity[] = ["daily", "monthly"];
const granularityLabels: Record<PriceGranularity, string> = {
  daily: "Diário",
  monthly: "Mensal",
};
const markerReasons = {
  gap: "há pregões sem fechamento entre o último ponto e a cotação",
  base_mismatch:
    "a série ajustada não está na mesma base do preço de mercado nesse ponto",
} as const;

export function HistoryFeedback({ empty }: { empty: string }) {
  const { loading, error, retry } = useHistory();
  return (
    <div className="mb-4 text-sm text-fmk-sub">
      <p role="status">
        {loading
          ? "Carregando histórico desta empresa…"
          : error
            ? `Não foi possível carregar o gráfico. ${error}`
            : empty}
      </p>
      {error && (
        <button
          type="button"
          onClick={retry}
          className="mt-2 min-h-8 rounded border border-fmk-line px-3 text-fmk-ink"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// Tooltip of one row: São Paulo date, value, basis, status and source.
function SeriesTip({
  active,
  payload,
  series,
  marker,
  ceiling,
}: {
  active?: boolean;
  payload?: { payload?: PlotRow }[];
  series: { basis: PriceBasis; granularity: PriceGranularity };
  marker: SeriesMarker | null;
  ceiling: boolean;
}) {
  const row = active ? payload?.find((item) => item.payload)?.payload : null;
  if (!row) return null;
  const { title, lines } = rowTooltip(row, series, { ceiling, marker });
  return (
    <div
      role="tooltip"
      data-series-tooltip={row.kind}
      className="min-w-40 rounded-md border border-fmk-line bg-fmk-raised px-3 py-2.5 text-xs shadow-none"
      style={{ maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      <div className="mb-2 border-b border-fmk-line pb-1.5 font-fmk-mono text-[11px] text-fmk-sub">
        {title}
      </div>
      <dl className="space-y-1.5">
        {lines.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-5"
          >
            <dt className="text-fmk-sub">{label}</dt>
            <dd className="text-right font-fmk-mono text-fmk-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// A month without its last session in the series: hollow, dashed, amber.
function IncompleteDot(props: {
  cx?: number;
  cy?: number;
  payload?: PlotRow;
  single?: boolean;
}) {
  if (props.cx == null || props.cy == null || props.payload?.kind !== "point")
    return null;
  if (props.payload.status === "incomplete")
    return (
      <circle
        data-incomplete-point={props.payload.month ?? props.payload.date ?? ""}
        cx={props.cx}
        cy={props.cy}
        r={4.5}
        fill="var(--fmk-bg)"
        stroke={AMBER}
        strokeWidth={2}
        strokeDasharray="2 2"
      />
    );
  return props.single ? (
    <circle cx={props.cx} cy={props.cy} r={3} fill={TEAL} />
  ) : null;
}

// The latest quote: a diamond of its own, always the nominal market price.
function MarkerDot(props: { cx?: number; cy?: number; active?: boolean }) {
  if (props.cx == null || props.cy == null) return null;
  const size = props.active ? 7 : 6;
  return (
    <path
      data-latest-marker={props.active ? "active" : ""}
      d={`M${props.cx} ${props.cy - size} L${props.cx + size} ${props.cy} L${props.cx} ${props.cy + size} L${props.cx - size} ${props.cy} Z`}
      fill="var(--fmk-bg)"
      stroke={TEAL}
      strokeWidth={2}
    />
  );
}

// Price history of /api/rankings/price-series. The adjustments are the
// provider's; the latest quote is the market price shown in the ranking.
export function PriceSeriesChart() {
  const { company } = useStockData();
  const { view } = useStockMarket();
  const [granularity, setGranularity] = useState<PriceGranularity>("daily");
  const [choice, setChoice] = useState<BasisChoice>("auto");
  const [period, setPeriod] = useState<SeriesPeriod>("1A");
  const [on, setOn] = useState<Record<string, boolean>>({
    price: true,
    ceiling: true,
    latest: true,
  });
  const series = usePriceSeries(company.ticker, choice, granularity);
  const data = series.data;
  const basis: PriceBasis =
    data?.basis ?? (choice === "auto" ? "adjusted" : choice);
  const shownPeriod = periodFor(granularity, period);
  const points = useMemo(
    () => (data ? selectSeries(data.points, shownPeriod) : []),
    [data, shownPeriod],
  );
  // Same price as the ranking and the margin; the dashed line belongs to the
  // series' own quote, so it is kept only for a quote of the same day.
  const marker = useMemo<SeriesMarker | null>(() => {
    const latest = data?.latestQuote ?? null;
    const live = view.price.state === "market" || view.price.state === "stale";
    const price = live
      ? decimal(view.price.value)
      : latest
        ? decimal(latest.price)
        : null;
    if (price === null) return null;
    const checkedAt = live
      ? (view.quote?.checkedAt ?? null)
      : (latest?.checkedAt ?? null);
    const sameDay =
      !live ||
      Boolean(
        latest?.checkedAt &&
        checkedAt &&
        saoPauloDay(latest.checkedAt) === saoPauloDay(checkedAt),
      );
    return {
      price,
      checkedAt,
      stale: live
        ? view.price.state === "stale"
        : latest?.freshness === "stale",
      connect: Boolean(latest?.connect) && sameDay,
    };
  }, [data, view]);
  const rows = useMemo(
    () =>
      seriesPlot(points, {
        ceiling: company.teto,
        marker: on.latest ? marker : null,
      }),
    [points, company.teto, marker, on.latest],
  );
  const summary = seriesSummary(points);
  const amounts = [
    ...(on.price ? points.map((point) => point.close) : []),
    ...(on.ceiling && company.teto !== null ? [company.teto] : []),
    ...(on.latest && marker ? [marker.price] : []),
  ];
  const low = amounts.length ? Math.min(...amounts) : 0,
    high = amounts.length ? Math.max(...amounts) : 1;
  const padding = Math.max((high - low) * 0.08, Math.abs(high) * 0.02, 0.01);
  const incomplete = points.filter((point) => point.status === "incomplete");
  const gaps = rows.filter((row) => row.kind === "gap").length;
  const state = !series.supported
    ? "invalid"
    : series.loading
      ? "loading"
      : !data
        ? "error"
        : points.length
          ? "ready"
          : "unavailable";
  const reason = data?.unavailableReason ?? "empty";
  const research = "da pesquisa";
  const items = [
    {
      key: "price",
      label: `Fechamento · ${basisLabels[basis].toLocaleLowerCase("pt-BR")}`,
      color: TEAL,
    },
    { key: "ceiling", label: "Preço-teto", color: AMBER, dash: "6 4" },
    ...(marker
      ? [
          {
            key: "latest",
            label: "Cotação mais recente",
            color: TEAL,
            marker: true,
          },
        ]
      : []),
  ];
  return (
    <div className="fmk-chart-layout grid min-w-0 gap-10 lg:grid-cols-[1fr_300px] [&>*]:min-w-0">
      <figure
        data-price-chart={state}
        data-ticker={company.ticker}
        data-basis={data ? data.basis : undefined}
        data-granularity={granularity}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Seg
              label="Intervalo do gráfico de cotação"
              options={granularities}
              labels={granularityLabels}
              value={granularity}
              disabled={!series.supported}
              onChange={setGranularity}
            />
            <Seg
              label="Base do preço no gráfico"
              options={bases}
              labels={basisLabels}
              value={basis}
              disabled={!data}
              disabledOptions={bases.filter(
                (item) => !data?.availableBases.includes(item),
              )}
              hint={(item) =>
                data?.availableBases.includes(item)
                  ? basisDescriptions[item]
                  : `${basisLabels[item]}: série indisponível para esta ação.`
              }
              onChange={setChoice}
            />
          </div>
          <Seg
            label="Período do gráfico de cotação"
            options={seriesPeriods[granularity]}
            value={shownPeriod}
            disabled={state !== "ready"}
            onChange={setPeriod}
          />
        </div>
        {state === "ready" && data && (
          <p
            className="mb-3 text-xs leading-5 text-fmk-sub"
            data-price-basis={data.basis}
          >
            {basisDescriptions[data.basis]}
          </p>
        )}
        {state === "ready" ? (
          <>
            <div className="mb-4">
              <Legend
                items={items}
                active={on}
                onToggle={(key) =>
                  setOn((prev) => ({ ...prev, [key]: !prev[key] }))
                }
              />
            </div>
            <div>
              <ResponsiveContainer height={380}>
                <ComposedChart
                  accessibilityLayer
                  title={`Cotação histórica em reais por ação, ${basisLabels[basis].toLocaleLowerCase("pt-BR")}`}
                  data={rows}
                  margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="time"
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
                    {...axisProps}
                    minTickGap={56}
                    tickFormatter={
                      granularity === "monthly" ? tickMonth : tickDay
                    }
                  />
                  <YAxis
                    orientation="right"
                    // Prices are positive: the padding never goes below zero.
                    domain={[Math.max(0, low - padding), high + padding]}
                    {...axisProps}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => num(v, 0)}
                  />
                  <Tooltip
                    position={{ x: 0, y: 0 }}
                    wrapperStyle={tooltipBox}
                    cursor={{
                      stroke: "var(--fmk-dim)",
                      strokeDasharray: "3 3",
                    }}
                    content={
                      <SeriesTip
                        series={{ basis, granularity }}
                        marker={marker}
                        ceiling={on.ceiling && company.teto !== null}
                      />
                    }
                  />
                  {on.price && (
                    <Area
                      dataKey="price"
                      name="Fechamento"
                      type="linear"
                      connectNulls={false}
                      stroke={TEAL}
                      strokeWidth={1.6}
                      fill={TEAL}
                      fillOpacity={0.07}
                      dot={(props) => (
                        <IncompleteDot
                          {...props}
                          single={points.length === 1}
                        />
                      )}
                      activeDot={{
                        r: 4,
                        fill: TEAL,
                        stroke: "var(--fmk-bg)",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  )}
                  {on.ceiling && company.teto !== null && (
                    <Line
                      dataKey="ceiling"
                      name="Preço-teto"
                      stroke={AMBER}
                      strokeWidth={1.4}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {on.latest && marker?.connect && (
                    <Line
                      dataKey="connector"
                      name="Ligação à cotação mais recente"
                      className="price-series-connector"
                      stroke={TEAL}
                      strokeWidth={1.4}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                  {on.latest && marker && (
                    <Line
                      dataKey="latest"
                      name="Cotação mais recente"
                      stroke="none"
                      dot={(props) => <MarkerDot {...props} />}
                      activeDot={(props) => <MarkerDot {...props} active />}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {!on.price && !on.ceiling && !on.latest && (
              <p role="status" className="text-sm text-fmk-sub">
                Séries ocultas. Ative uma legenda para exibir o gráfico.
              </p>
            )}
          </>
        ) : (
          <div
            className="fmk-chart-empty grid h-[380px] place-content-center gap-3 border-y border-fmk-line-soft px-5 text-center text-sm text-fmk-sub"
            data-unavailable-reason={state === "unavailable" ? reason : state}
          >
            <p role="status" className="font-fmk-serif text-xl">
              {state === "loading"
                ? "Carregando o histórico de preços…"
                : state === "invalid"
                  ? unavailableMessages.invalid
                  : state === "error"
                    ? `${unavailableMessages.error} ${series.error ?? ""}`.trim()
                    : unavailableMessages[reason]}
            </p>
            {state === "error" && series.retry && (
              <button
                type="button"
                onClick={series.retry}
                className="mx-auto min-h-8 rounded border border-fmk-line px-3 text-fmk-ink"
              >
                Tentar novamente
              </button>
            )}
            {state === "unavailable" && marker && (
              <p data-marker-note="alone">
                {markerTitle(marker)}: {quoteMoney(marker.price)}.
              </p>
            )}
          </div>
        )}
        {state === "ready" && (
          <div className="mt-3 space-y-1.5 text-xs leading-5 text-fmk-sub">
            {on.latest && marker && (
              <p
                data-marker-note={marker.connect ? "connected" : "alone"}
                title={markerTitle(marker)}
              >
                ◆ {markerTitle(marker)}: {quoteMoney(marker.price)}.{" "}
                {marker.connect
                  ? "A linha tracejada liga o último fechamento à cotação."
                  : `Sem linha até o último fechamento: ${
                      data?.latestQuote?.reason
                        ? markerReasons[data.latestQuote.reason]
                        : "a cotação não é do pregão seguinte ao último ponto"
                    }.`}
              </p>
            )}
            {incomplete.length > 0 && (
              <p data-incomplete-note>
                Pontos tracejados: meses sem o último pregão na série, com o
                último fechamento disponível (
                {incomplete
                  .map(
                    (point) =>
                      `${monthText(point.month)}: dados até ${dateText(point.date).slice(0, 5)}`,
                  )
                  .join("; ")}
                ).
              </p>
            )}
            {gaps > 0 && (
              <p data-gap-note>
                O traço é interrompido onde faltam pregões da B3 nesta série.
              </p>
            )}
            {data && coverageText(data.coverage) && (
              <p data-coverage>{coverageText(data.coverage)}</p>
            )}
            {data?.coverage.notes.map((note) => (
              <p key={note.text} data-coverage-note={note.code ?? ""}>
                {note.text}
              </p>
            ))}
          </div>
        )}
      </figure>
      <aside className="space-y-6 lg:border-l lg:border-fmk-line lg:pl-8">
        {summary && (
          <div>
            <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
              No período · {shownPeriod} ·{" "}
              {basisLabels[basis].toLocaleLowerCase("pt-BR")}
            </h3>
            <dl className="mt-3 divide-y divide-fmk-line-soft text-sm">
              {[
                ["Variação entre fechamentos", pct(summary.change, 1, true)],
                ["Mínima", brl(summary.min)],
                ["Máxima", brl(summary.max)],
                ["Último fechamento", brl(summary.last)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2">
                  <dt className="text-fmk-sub">{label}</dt>
                  <dd className="text-right font-fmk-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Referências
          </h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>
                Preço-teto{" "}
                <span className="block text-xs text-fmk-sub">{research}</span>
              </dt>
              <dd className="font-fmk-mono text-fmk-amber">
                {brl(company.teto)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>
                Cotação mais recente{" "}
                <span className="block text-xs text-fmk-sub">
                  preço nominal de mercado
                </span>
              </dt>
              <dd className="font-fmk-mono">
                {marker ? quoteMoney(marker.price) : "Não informada"}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

export function HistoricalDividendChart({
  history,
}: {
  history: StockHistory;
}) {
  const [mode, setMode] = useState<"Anual" | "Mensal">("Anual");
  const [range, setRange] = useState<"5A" | "Máx">("Máx");
  const [on, setOn] = useState<Record<string, boolean>>({
    past: true,
    future: true,
  });
  const data = useMemo(
    () => groupDividends(history, mode, range),
    [history, mode, range],
  );
  const pattern = useId().replaceAll(":", "");
  return (
    <div className="fmk-chart-layout">
      <figure
        data-history-chart="dividends"
        data-history-ticker={history.ticker}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Legend
            items={[
              { key: "past", label: "Histórico", color: TEAL },
              {
                key: "future",
                label: "Agendados",
                color: TEAL,
                hatch: true,
              },
            ]}
            active={on}
            onToggle={(key) =>
              setOn((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <Seg
              label="Visualização"
              options={["Anual", "Mensal"] as const}
              value={mode}
              onChange={setMode}
            />
            <Seg
              label="Intervalo dos eventos"
              options={["5A", "Máx"] as const}
              value={range}
              onChange={setRange}
            />
          </div>
        </div>
        <div>
          {data.length ? (
            <ResponsiveContainer height={340}>
              <BarChart
                accessibilityLayer
                title="Proventos por período em reais por ação"
                data={data}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="22%"
              >
                <defs>
                  <pattern
                    id={pattern}
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="6" height="6" fill={TEAL} fillOpacity="0.1" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke={TEAL}
                      strokeWidth="2.4"
                    />
                  </pattern>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} minTickGap={32} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => num(v, 1)}
                />
                <Tooltip
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={tooltipBox}
                  cursor={{ fill: "var(--fmk-line-soft)" }}
                  content={
                    <ChartTip
                      fmt={formatHistoricalDividend}
                      title={(label) => `Data de pagamento: ${label}`}
                    />
                  }
                />
                {on.past && (
                  <Bar
                    dataKey="past"
                    name="Histórico"
                    stackId="a"
                    fill={TEAL}
                    isAnimationActive={false}
                  />
                )}
                {on.future && (
                  <Bar
                    dataKey="future"
                    name="Agendados"
                    stackId="a"
                    fill={`url(#${pattern})`}
                    stroke={TEAL}
                    strokeDasharray="3 2"
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="fmk-chart-empty grid h-[340px] place-content-center px-5 text-center text-fmk-sub"
              role="status"
            >
              Sem valores com data de pagamento agrupável neste intervalo.
            </div>
          )}
        </div>
        {!on.past && !on.future && (
          <p role="status" className="text-sm text-fmk-sub">
            Séries ocultas. Ative uma legenda para exibir o gráfico.
          </p>
        )}
      </figure>
    </div>
  );
}
