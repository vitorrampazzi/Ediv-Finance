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
  historyPeriods,
  mergeLiveHistory,
  pricePlot,
  selectPrices,
  type HistoryExtension,
  type HistoryPeriod,
  type StockHistory,
} from "../../lib/stockHistory";
import { useLiveHistory } from "../../hooks/useLiveHistory";
import { firstOpenDate } from "../../lib/liveQuotes";
import {
  axisProps,
  brl,
  gridProps,
  num,
  pct,
  useHistory,
  useStockData,
} from "./data";
import { ChartTip, Legend, Seg } from "./ui";

const TEAL = "var(--fmk-teal)",
  AMBER = "var(--fmk-amber)",
  LILAC = "var(--fmk-lilac)";
const dateText = (date: string | null) =>
  date ? date.split("-").reverse().join("/") : "Não informada";
const tickDate = (time: number) =>
  dateText(new Date(time).toISOString().slice(0, 10));
const tooltipBox = { maxWidth: "100%" };
const reasons: Record<Exclude<HistoryExtension, "extended">, string> = {
  loading: "Consultando os fechamentos mais recentes na brapi.dev…",
  unavailable: "Não foi possível consultar os fechamentos da brapi.dev agora.",
  provider_error:
    "Não foi possível consultar os fechamentos da brapi.dev agora.",
  no_token: "A atualização diária pela brapi.dev ainda não está ativa.",
  not_covered: "A brapi.dev não cobre os fechamentos diários desta ação.",
  budget:
    "Limite diário de consultas à brapi.dev atingido; o gráfico será atualizado mais tarde.",
  range_not_in_plan:
    "O período de fechamentos não está disponível no plano atual da brapi.dev.",
  empty: "A brapi.dev não enviou fechamentos válidos.",
  no_new_points:
    "Ainda não há fechamentos da brapi.dev posteriores a essa data.",
  no_overlap:
    "Sem datas em comum para conferir os fechamentos da brapi.dev, por isso o gráfico não foi estendido.",
  mismatch:
    "Os fechamentos da brapi.dev não conferem com o histórico nas datas em comum (diferença acima de 0,5%), por isso o gráfico não foi estendido.",
};

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

export function HistoricalPriceChart({ history }: { history: StockHistory }) {
  const { company } = useStockData();
  const live = useLiveHistory(history.ticker, history.prices.length > 0);
  // Packaged closes plus later brapi.dev closes, only when the junction agrees.
  const merged = useMemo(
    () =>
      mergeLiveHistory(history.prices, live.data, {
        openSession: firstOpenDate(),
      }),
    [history.prices, live.data],
  );
  const extension: HistoryExtension = live.loading
    ? "loading"
    : merged.extension;
  const [period, setPeriod] = useState<HistoryPeriod>("1A");
  const [on, setOn] = useState<Record<string, boolean>>({
    price: true,
    ceiling: true,
    reference: true,
  });
  const prices = useMemo(
    () => selectPrices(merged.prices, period),
    [merged.prices, period],
  );
  const data = useMemo(
    () => pricePlot(prices, company.price, company.teto),
    [prices, company.price, company.teto],
  );
  const first = prices[0]?.close,
    last = prices.at(-1)?.close;
  const change = prices.length > 1 && first && last ? last / first - 1 : null;
  const amounts = [
    ...(on.price ? prices.map((p) => p.close) : []),
    ...(on.ceiling && company.teto !== null ? [company.teto] : []),
    ...(on.reference && company.price !== null ? [company.price] : []),
  ];
  const low = amounts.length ? Math.min(...amounts) : 0,
    high = amounts.length ? Math.max(...amounts) : 1;
  const padding = Math.max((high - low) * 0.08, Math.abs(high) * 0.02, 0.01);
  const items = [
    { key: "price", label: "Cotação", color: TEAL },
    {
      key: "ceiling",
      label: "Preço-teto",
      color: AMBER,
      dash: "6 4",
    },
    {
      key: "reference",
      label: "Referência",
      color: LILAC,
      dash: "2 3",
    },
  ];
  return (
    <div className="fmk-chart-layout grid gap-10 lg:grid-cols-[1fr_300px]">
      <figure data-history-chart="price" data-history-ticker={history.ticker}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Legend
            items={items}
            active={on}
            onToggle={(key) =>
              setOn((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
          <Seg
            label="Período do gráfico de cotação"
            options={historyPeriods}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <div>
          <ResponsiveContainer height={380}>
            <ComposedChart
              accessibilityLayer
              title="Cotação histórica em reais por ação"
              data={data}
              margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                {...axisProps}
                minTickGap={56}
                tickFormatter={tickDate}
              />
              <YAxis
                orientation="right"
                domain={[low - padding, high + padding]}
                {...axisProps}
                axisLine={false}
                width={48}
                tickFormatter={(v) => num(v, 0)}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                wrapperStyle={tooltipBox}
                cursor={{ stroke: "var(--fmk-dim)", strokeDasharray: "3 3" }}
                content={
                  <ChartTip
                    fmt={brl}
                    title={(_, point) =>
                      dateText(String(point.date)) +
                      (merged.snapshotEnd &&
                      String(point.date) > merged.snapshotEnd
                        ? " · fechamento brapi.dev"
                        : "")
                    }
                  />
                }
              />
              {on.price && (
                <Area
                  dataKey="price"
                  name="Cotação"
                  type="linear"
                  connectNulls={false}
                  stroke={TEAL}
                  strokeWidth={1.6}
                  fill={TEAL}
                  fillOpacity={0.07}
                  dot={prices.length === 1}
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
                  isAnimationActive={false}
                />
              )}
              {on.reference && company.price !== null && (
                <Line
                  dataKey="reference"
                  name="Referência"
                  stroke={LILAC}
                  strokeWidth={1.4}
                  strokeDasharray="2 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {!on.price && !on.ceiling && !on.reference && (
          <p role="status" className="text-sm text-fmk-sub">
            Séries ocultas. Ative uma legenda para exibir o gráfico.
          </p>
        )}
        {merged.snapshotEnd && (
          <p
            className="mt-3 min-h-10 text-xs leading-5 text-fmk-sub"
            data-history-extension={extension}
          >
            Histórico até {dateText(merged.snapshotEnd)}
            {extension === "extended" && merged.liveEnd
              ? ` + fechamentos diários da brapi.dev até ${dateText(merged.liveEnd).slice(0, 5)}` +
                (live.data?.stale || live.failed
                  ? ", da última consulta válida (defasados)."
                  : ".")
              : `. ${reasons[extension === "extended" ? "empty" : extension]}`}
          </p>
        )}
      </figure>
      <aside className="space-y-6 lg:border-l lg:border-fmk-line lg:pl-8">
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            No período · {period}
          </h3>
          <dl className="mt-3 divide-y divide-fmk-line-soft text-sm">
            {[
              ["Variação entre fechamentos", pct(change, 1, true)],
              ["Mínima", brl(Math.min(...prices.map((point) => point.close)))],
              ["Máxima", brl(Math.max(...prices.map((point) => point.close)))],
              ["Último fechamento", brl(last)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2">
                <dt className="text-fmk-sub">{label}</dt>
                <dd className="text-right font-fmk-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Referências
          </h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt>Preço-teto</dt>
              <dd className="font-fmk-mono text-fmk-amber">
                {brl(company.teto)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Preço de referência</dt>
              <dd className="font-fmk-mono text-fmk-lilac">
                {brl(company.price)}
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
