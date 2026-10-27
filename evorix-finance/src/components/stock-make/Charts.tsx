import {
  HistoricalPriceChart,
  HistoricalDividendChart,
  HistoryFeedback,
} from "./HistoryCharts";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  brl,
  num,
  pct,
  useStockData,
  useHistory,
  performanceHistory,
  results,
  cagrSeries,
  perfPeriods,
  perfSeriesMeta,
  dividendAnnouncementMonths,
  axisProps,
  gridProps,
} from "./data";
import { ChartTip, Legend, Seg, type LegendItem } from "./ui";
import { dividendColumns, type DividendColumnKey } from "./data";

const TEAL = "var(--fmk-teal)";
const AMBER = "var(--fmk-amber)";
const STEEL = "var(--fmk-steel)";

const chartLabels: Partial<Record<DividendColumnKey, string>> = {
  referencePrice: "Cotação",
  ceilingPrice: "Teto",
  projectedGrossDividendPerShare: "DPA proj.",
  estimatedEps: "LPA est.",
  estimatedNetIncome: "Lucro est.",
  earningsCagr5Years: "CAGR 5a",
  netDebtToEbitda: "Dív./EBITDA",
  projectedPE: "P/L proj.",
  averagePE10Years: "P/L 10a",
};
const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function PublicationChart({
  id,
  title,
  keys,
  unit,
  height,
}: {
  id: string;
  title: string;
  keys: DividendColumnKey[];
  unit: string;
  height: number;
}) {
  const { number, value } = useStockData();
  const rows = keys.map((key, index) => {
    const amount = number(key);
    return {
      key,
      label: dividendColumns.find((column) => column.key === key)!.label,
      short: chartLabels[key],
      amount:
        amount === null || !Number.isFinite(amount)
          ? null
          : key === "earningsCagr5Years"
            ? amount * 100
            : amount,
      formatted: value(key),
      color: index === 0 ? TEAL : AMBER,
    };
  });
  const data = rows.filter((row) => row.amount !== null);
  return (
    <figure className="fmk-publication-chart" data-publication-chart={id}>
      <div style={{ height }}>
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              title={title}
              data={data}
              margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="short" {...axisProps} interval={0} />
              <YAxis
                {...axisProps}
                axisLine={false}
                width={52}
                domain={[
                  (minimum: number) => Math.min(0, minimum),
                  (maximum: number) => Math.max(0, maximum) || 1,
                ]}
                tickFormatter={(amount: number) => compactNumber.format(amount)}
              />
              <ReferenceLine y={0} stroke="var(--fmk-line)" />
              <Tooltip
                cursor={{ fill: "var(--fmk-line-soft)" }}
                position={{ x: 0, y: 0 }}
                wrapperStyle={{ maxWidth: "100%" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as
                    (typeof rows)[number] | undefined;
                  return active && row ? (
                    <div
                      role="tooltip"
                      className="max-w-xs rounded-md border border-fmk-line bg-fmk-raised px-3 py-2 text-xs text-fmk-ink"
                      style={{
                        maxWidth: "min(260px, calc(100vw - 32px))",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {row.label}: {row.formatted} · {unit}
                    </div>
                  ) : null;
                }}
              />
              <Bar
                dataKey="amount"
                name={unit}
                maxBarSize={88}
                isAnimationActive={false}
              >
                {data.map((row) => (
                  <Cell key={row.key} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartUnavailable title={`${title}: dados indisponíveis`} />
        )}
      </div>
      <figcaption className="sr-only">
        {title} · {unit}
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>
            {title} · {unit}
          </caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-chart-field={row.key}>
                <th scope="row">{row.label}</th>
                <td data-chart-value={row.key} data-exact-value={row.formatted}>
                  {row.formatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const Hatch = ({ id, color = TEAL }: { id: string; color?: string }) => (
  <defs>
    <pattern
      id={id}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="6" height="6" fill={color} fillOpacity="0.1" />
      <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="2.4" />
    </pattern>
  </defs>
);

function useToggle(keys: string[]) {
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(keys.map((k) => [k, true])),
  );
  return [on, (k: string) => setOn((s) => ({ ...s, [k]: !s[k] }))] as const;
}

/* Historical areas/bars use only the separately approved AGF endpoint. */
export function PriceChart() {
  const history = useHistory();
  if (history.data?.prices.length)
    return (
      <HistoricalPriceChart key={history.data.ticker} history={history.data} />
    );
  return (
    <>
      <HistoryFeedback empty="Sem histórico disponível." />
      {!history.loading && (
        <PublicationChart
          id="price"
          title="Cotação e preço-teto"
          keys={["referencePrice", "ceilingPrice"]}
          unit="R$ por ação"
          height={380}
        />
      )}
    </>
  );
}
export function DividendChart() {
  const history = useHistory();
  if (history.data?.dividends.length)
    return (
      <HistoricalDividendChart
        key={history.data.ticker}
        history={history.data}
      />
    );
  return (
    <>
      <HistoryFeedback empty="Sem histórico disponível." />
      {!history.loading && (
        <PublicationChart
          id="dividends"
          title="Dividendo e lucro por ação"
          keys={["projectedGrossDividendPerShare", "estimatedEps"]}
          unit="R$ por ação"
          height={340}
        />
      )}
    </>
  );
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export function DividendCalendar() {
  const { raw, value } = useStockData();
  const months = dividendAnnouncementMonths(raw("announcementMonths"));
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-fmk-serif text-xl">Calendário de proventos</h3>
        <span className="flex items-center gap-1.5 text-xs text-fmk-sub">
          <span className="hatch size-3 rounded-sm border border-dashed border-fmk-teal" />
          Mês habitual de anúncio
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="grid grid-cols-[44px_repeat(12,1fr)] gap-1.5 pb-1.5 font-fmk-mono text-[10px] text-fmk-dim">
            <span />
            {MONTHS.map((m, i) => (
              <span key={i} className="text-center">
                {m}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[44px_repeat(12,1fr)] items-center gap-1.5 py-[3px]">
            <span className="font-fmk-mono text-[10px] text-fmk-sub">
              Meses
            </span>
            {MONTH_FULL.map((m, i) => (
              <span
                key={m}
                data-month={i + 1}
                data-announced={months?.includes(i + 1) || false}
                aria-label={
                  m +
                  ": " +
                  (months?.includes(i + 1)
                    ? "habitual informado"
                    : "sem indicação")
                }
                className={`h-7 rounded-sm ${months?.includes(i + 1) ? "hatch border border-dashed border-fmk-teal" : "bg-fmk-line-soft"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-fmk-sub">
        Meses habituais: {value("announcementMonths")}
      </p>
    </div>
  );
}

/* ───────────── Rentabilidade ───────────── */
export function PerformanceChart() {
  const { company } = useStockData();
  const [period, setPeriod] = useState("1A");
  const [on, toggle] = useToggle(perfSeriesMeta.map((s) => s.key));
  const data = performanceHistory;
  const ends = data.at(-1);
  const items: LegendItem[] = perfSeriesMeta.map((s) => ({
    ...s,
    label: s.key === "acao" ? company.ticker : s.label,
    value: ends
      ? pct(ends[s.key as keyof typeof ends] as number, 1, true)
      : "Não informado",
  }));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {data.length > 0 && (
          <Legend disabled items={items} active={on} onToggle={toggle} />
        )}
        <Seg
          disabled
          label="Período de rentabilidade"
          options={perfPeriods}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <div className="w-full">
        {data.length ? (
          <ResponsiveContainer height={360}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="label"
                {...axisProps}
                minTickGap={56}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation="right"
                {...axisProps}
                axisLine={false}
                width={52}
                tickFormatter={(v) => `${num(v, 0)}%`}
              />
              <ReferenceLine y={0} stroke="#3a4448" />
              <Tooltip
                cursor={{ stroke: "#5b6762", strokeDasharray: "3 3" }}
                content={
                  <ChartTip
                    fmt={(v) => pct(v, 2, true)}
                    title={(_, p) => String(p.full)}
                  />
                }
              />
              {perfSeriesMeta.map(
                (s) =>
                  on[s.key] && (
                    <Line
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={s.key === "acao" ? 2 : 1.4}
                      strokeDasharray={s.dash}
                      dot={false}
                      activeDot={{ r: 3.5 }}
                    />
                  ),
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <PublicationChart
            id="valuation"
            title="P/L e média histórica"
            keys={["projectedPE", "averagePE10Years"]}
            unit="vezes"
            height={360}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────── Resultados ───────────── */
const Panel = ({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-fmk-line pt-6">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-fmk-serif text-xl">{title}</h3>
        <p className="mt-0.5 text-xs text-fmk-dim">{sub}</p>
      </div>
    </div>
    {children}
  </div>
);

export function ResultsCharts() {
  const { cagrLucro, value } = useStockData();
  const [on, toggle] = useToggle(["receita", "lucro", "ebitda"]);
  const evo: LegendItem[] = [
    { key: "receita", label: "Receita líquida", color: STEEL },
    { key: "lucro", label: "Lucro líquido", color: TEAL },
    { key: "ebitda", label: "EBITDA", color: AMBER, dash: "5 4" },
  ];
  const [lpaOn, lpaToggle] = useToggle(["lpaR", "lpaE"]);
  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
      <Panel
        title="Lucro por ação"
        sub="R$ por ação · estimativa da publicação"
      >
        {results.length > 0 && (
          <Legend
            disabled
            items={[
              { key: "lpaR", label: "Realizado", color: TEAL },
              { key: "lpaE", label: "Estimado", color: TEAL, hatch: true },
            ]}
            active={lpaOn}
            onToggle={lpaToggle}
          />
        )}
        <div className="mt-2">
          {results.length ? (
            <ResponsiveContainer height={260}>
              <BarChart
                data={results}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="24%"
              >
                <Hatch id="hatch-lpa" />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => num(v, 1)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={<ChartTip fmt={(v) => brl(v)} />}
                />
                {lpaOn.lpaR && (
                  <Bar
                    dataKey="lpaR"
                    name="Realizado"
                    stackId="a"
                    fill={TEAL}
                  />
                )}
                {lpaOn.lpaE && (
                  <Bar
                    dataKey="lpaE"
                    name="Estimado"
                    stackId="a"
                    fill="url(#hatch-lpa)"
                    stroke={TEAL}
                    strokeDasharray="3 2"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="eps"
              title="Lucro por ação estimado"
              keys={["estimatedEps"]}
              unit="R$ por ação"
              height={260}
            />
          )}
        </div>
      </Panel>

      <Panel
        title="Lucro líquido estimado"
        sub="R$ totais · estimativa da publicação"
      >
        {results.length > 0 && (
          <Legend disabled items={evo} active={on} onToggle={toggle} />
        )}
        <div className="mt-2">
          {results.length ? (
            <ResponsiveContainer height={260}>
              <LineChart
                data={results}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => num(v, 0)}
                />
                <Tooltip
                  cursor={{ stroke: "#5b6762", strokeDasharray: "3 3" }}
                  content={<ChartTip fmt={(v) => `R$ ${num(v, 2)} bi`} />}
                />
                {evo.map(
                  (s) =>
                    on[s.key] && (
                      <Line
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={1.7}
                        strokeDasharray={s.dash}
                        dot={{ r: 2.5, fill: "#0e1113", strokeWidth: 1.5 }}
                      />
                    ),
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="profit"
              title="Lucro líquido estimado"
              keys={["estimatedNetIncome"]}
              unit="R$"
              height={260}
            />
          )}
        </div>
      </Panel>

      <Panel
        title="Crescimento do lucro (CAGR)"
        sub="Taxa composta informada em cinco anos"
      >
        <div className="flex items-baseline gap-3">
          <span className="font-fmk-serif text-5xl text-fmk-teal">
            {pct(cagrLucro, 1)}
          </span>
          <span className="text-sm text-fmk-sub">
            ao ano · período de cinco anos da fonte
          </span>
        </div>
        <div className="mt-2">
          {cagrSeries.length ? (
            <ResponsiveContainer height={190}>
              <LineChart
                data={cagrSeries}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={36}
                  domain={[90, "dataMax + 5"]}
                />
                <Tooltip content={<ChartTip fmt={(v) => num(v, 1)} />} />
                <Line
                  dataKey="trend"
                  name="Trajetória a taxa constante"
                  stroke="#7f8f99"
                  strokeDasharray="4 4"
                  strokeWidth={1.2}
                  dot={false}
                />
                <Line
                  dataKey="real"
                  name="Lucro (índice)"
                  stroke={TEAL}
                  strokeWidth={1.8}
                  dot={{ r: 2.5, fill: "#0e1113", strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="cagr"
              title="Crescimento composto do lucro"
              keys={["earningsCagr5Years"]}
              unit="% ao ano"
              height={190}
            />
          )}
        </div>
      </Panel>

      <Panel title="Endividamento" sub="Dívida líquida / EBITDA, em vezes">
        <div className="flex items-baseline gap-3">
          <span className="font-fmk-serif text-5xl">
            {value("netDebtToEbitda")}
          </span>
          <span className="text-sm text-fmk-sub">
            dado informado na pesquisa
          </span>
        </div>
        <div className="mt-2">
          {results.length ? (
            <ResponsiveContainer height={190}>
              <BarChart
                data={results.filter((r) => r.divEbitda != null)}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={36}
                  domain={[0, 3]}
                  tickFormatter={(v) => `${v}x`}
                />

                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={<ChartTip fmt={(v) => `${num(v, 1)}x`} />}
                />
                <Bar dataKey="divEbitda" name="Dív. líq./EBITDA">
                  {results
                    .filter((r) => r.divEbitda != null)
                    .map((r) => (
                      <Cell
                        key={r.period}
                        fill={(r.divEbitda ?? 0) > 2 ? AMBER : STEEL}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="debt"
              title="Dívida líquida / EBITDA"
              keys={["netDebtToEbitda"]}
              unit="vezes"
              height={190}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function ChartUnavailable({ title }: { title: string }) {
  return (
    <div
      className="fmk-chart-empty grid h-full min-h-0 place-content-center border-y border-fmk-line-soft px-5 text-center"
      role="status"
    >
      <p className="font-fmk-serif text-xl text-fmk-sub">{title}</p>
    </div>
  );
}
