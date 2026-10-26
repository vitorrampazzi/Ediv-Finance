import { useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  dividendsAnnual,
  dividendsMonthly,
  priceHistory,
  performanceHistory,
  results,
  cagrSeries,
  periodKeys,
  perfPeriods,
  perfSeriesMeta,
  dividendAnnouncementMonths,
  axisProps,
  gridProps,
} from "./data";
import { ChartTip, Legend, Seg, Tag, type LegendItem } from "./ui";
import { Tooltip as AccessibleTooltip } from "../Tooltip";
import { dividendColumns, type DividendColumnKey } from "./data";

const TEAL = "var(--fmk-teal)";
const AMBER = "var(--fmk-amber)";
const LILAC = "var(--fmk-lilac)";
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
  methodology,
  height,
}: {
  id: string;
  title: string;
  keys: DividendColumnKey[];
  unit: string;
  methodology: string;
  height: number;
}) {
  const { number, value, company } = useStockData();
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
      <div style={{ height }} aria-hidden={data.length ? true : undefined}>
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer={false}
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
      <figcaption className="mt-3 text-xs leading-relaxed text-fmk-sub">
        <strong className="font-medium text-fmk-ink">
          {title} · {unit}.
        </strong>{" "}
        {methodology} Fonte: planilha da pesquisa · {company.ticker} ·{" "}
        {company.updated}.
      </figcaption>
      <table className="mt-3 w-full table-fixed text-xs">
        <caption className="sr-only">
          {title}: valores e legenda. Use Tab para consultar as dicas.
        </caption>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              data-chart-field={row.key}
              className="border-b border-fmk-line-soft"
            >
              <th
                scope="row"
                className="w-[56%] py-2 pr-3 text-left font-normal"
              >
                <AccessibleTooltip
                  content={`${row.label}: ${row.formatted}. Unidade: ${unit}. ${methodology}`}
                >
                  <button
                    type="button"
                    className="min-h-6 text-left text-fmk-sub"
                  >
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-block size-2"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.label}
                  </button>
                </AccessibleTooltip>
              </th>
              <td
                data-chart-value={row.key}
                data-exact-value={row.formatted}
                className="py-2 text-right font-fmk-mono text-fmk-ink"
                style={{ overflowWrap: "anywhere" }}
              >
                {row.formatted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

/* ───────────── Cotação ───────────── */
export function PriceChart() {
  const { company } = useStockData();
  const [period, setPeriod] = useState("1A");
  const [on, toggle] = useToggle(["price", "teto", "justo"]);
  const data = priceHistory;
  const first = data[0]?.price ?? null;
  const last = data.at(-1)?.price ?? null;
  const lo = data.length ? Math.min(...data.map((d) => d.price)) : null;
  const hi = data.length ? Math.max(...data.map((d) => d.price)) : null;
  const chg =
    first !== null && first > 0 && last !== null ? last / first - 1 : null;
  const vis = [
    on.price && "price",
    on.teto && "teto",
    on.justo && "justo",
  ].filter(Boolean) as ("price" | "teto" | "justo")[];
  const all = data.flatMap((d) => vis.map((k) => d[k]));
  const dMin = Math.floor(Math.min(...all) - 1);
  const dMax = Math.ceil(Math.max(...all) + 1);

  const items: LegendItem[] = [
    { key: "price", label: "Cotação", color: TEAL },
    { key: "teto", label: "Preço-teto", color: AMBER, dash: "6 4" },
    {
      key: "justo",
      label: "Referência adicional indisponível",
      color: LILAC,
      dash: "2 3",
    },
  ];

  return (
    <div className="fmk-chart-layout grid gap-10 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {data.length > 0 && (
            <Legend disabled items={items} active={on} onToggle={toggle} />
          )}
          <Seg
            disabled
            label="Período do gráfico de cotação"
            options={periodKeys}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <p className="mb-3 text-xs text-fmk-dim">
          Períodos desativados: não há série histórica na planilha. Abaixo,
          comparação das referências publicadas.
        </p>
        <div className="w-full">
          {data.length ? (
            <ResponsiveContainer height={380}>
              <ComposedChart
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
                  domain={[dMin, dMax]}
                  {...axisProps}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => num(v, 0)}
                />
                <Tooltip
                  cursor={{ stroke: "#5b6762", strokeDasharray: "3 3" }}
                  content={
                    <ChartTip
                      fmt={(v) => brl(v)}
                      title={(_, p) => String(p.full)}
                    />
                  }
                />
                {on.price && (
                  <Area
                    dataKey="price"
                    name="Cotação"
                    stroke={TEAL}
                    strokeWidth={1.6}
                    fill={TEAL}
                    fillOpacity={0.07}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: TEAL,
                      stroke: "#0e1113",
                      strokeWidth: 2,
                    }}
                  />
                )}
                {on.teto && (
                  <Line
                    dataKey="teto"
                    name="Preço-teto"
                    stroke={AMBER}
                    strokeWidth={1.4}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                )}
                {on.justo && (
                  <Line
                    dataKey="justo"
                    name="P/L médio × LPA proj."
                    stroke={LILAC}
                    strokeWidth={1.4}
                    strokeDasharray="2 3"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="price"
              title="Cotação e preço-teto"
              keys={["referencePrice", "ceilingPrice"]}
              unit="R$ por ação"
              methodology="Comparação das referências da publicação; não é cotação ao vivo nem evolução temporal."
              height={380}
            />
          )}
        </div>
        <p className="mt-3 text-xs text-fmk-dim">
          Valores em reais por ação. Fonte: planilha da publicação ·{" "}
          {company.updated}.
        </p>
      </div>

      <aside className="space-y-6 lg:border-l lg:border-fmk-line lg:pl-8">
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Histórico · indisponível
          </h3>
          <dl className="mt-3 divide-y divide-fmk-line-soft text-sm">
            {[
              [
                "Variação",
                pct(chg, 1, true),
                chg === null
                  ? "text-fmk-dim"
                  : chg >= 0
                    ? "text-fmk-up"
                    : "text-fmk-down",
              ],
              ["Mínima", brl(lo), ""],
              ["Máxima", brl(hi), ""],
              ["Último", brl(last), ""],
            ].map(([k, v, c]) => (
              <div key={k} className="flex justify-between py-2">
                <dt className="text-fmk-sub">{k}</dt>
                <dd className={`font-fmk-mono ${c}`}>
                  {k === "Variação" && chg !== null
                    ? `${chg >= 0 ? "▲" : "▼"} ${v}`
                    : v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Referências de preço
          </h3>
          <ul className="mt-3 space-y-4 text-sm">
            <li>
              <div className="flex justify-between">
                <span>Preço-teto</span>
                <span className="font-fmk-mono text-fmk-amber">
                  {brl(company.teto)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fmk-dim">
                Preço teto da planilha. Premissa histórica de yield de 6,81% do
                Tesouro IPCA+ 2037 com juros semestrais, não taxa atual de
                mercado.
              </p>
            </li>
            <li>
              <div className="flex justify-between">
                <span>Cotação de referência</span>
                <span className="font-fmk-mono text-fmk-lilac">
                  {brl(company.price)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fmk-dim">
                Cotação na data da pesquisa: {company.updated}. Sem preço justo
                ou cotação ao vivo presumidos.
              </p>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* ───────────── Proventos ───────────── */
export function DividendChart() {
  const { company, value } = useStockData();
  const [mode, setMode] = useState<"Anual" | "Mensal">("Anual");
  const [range, setRange] = useState<"5A" | "Máx">("Máx");
  const [on, toggle] = useToggle(["realizado", "projetado", "anterior"]);
  const annual = range === "5A" ? dividendsAnnual.slice(-6) : dividendsAnnual;
  const data: Record<string, string | number>[] =
    mode === "Anual" ? annual : dividendsMonthly;

  const items: LegendItem[] = [
    { key: "realizado", label: "Realizado", color: TEAL },
    { key: "projetado", label: "Projetado", color: TEAL, hatch: true },
    ...(mode === "Mensal"
      ? [{ key: "anterior", label: "Período anterior", color: "#7f8f99" }]
      : []),
  ];

  return (
    <div className="fmk-chart-layout grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {data.length > 0 && (
            <Legend disabled items={items} active={on} onToggle={toggle} />
          )}
          <div className="flex gap-2">
            <Seg
              disabled
              label="Visualização"
              options={["Anual", "Mensal"] as const}
              value={mode}
              onChange={setMode}
            />
            {mode === "Anual" && (
              <Seg
                disabled
                label="Intervalo"
                options={["5A", "Máx"] as const}
                value={range}
                onChange={setRange}
              />
            )}
          </div>
        </div>
        <p className="mb-3 text-xs text-fmk-dim">
          Períodos desativados: a planilha não contém pagamentos históricos.
          Abaixo, projeções consolidadas por ação.
        </p>
        <div className="w-full">
          {data.length ? (
            <ResponsiveContainer height={340}>
              <BarChart
                data={data}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="22%"
              >
                <Hatch id="hatch-div" />
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => num(v, 1)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={
                    <ChartTip
                      fmt={(v) => brl(v)}
                      title={(l) =>
                        mode === "Anual" ? `Proventos ${l}` : String(l)
                      }
                    />
                  }
                />
                {on.realizado && (
                  <Bar
                    dataKey="realizado"
                    name="Realizado"
                    stackId="a"
                    fill={TEAL}
                    radius={[0, 0, 0, 0]}
                  />
                )}
                {on.projetado && (
                  <Bar
                    dataKey="projetado"
                    name="Projetado"
                    stackId="a"
                    fill="url(#hatch-div)"
                    stroke={TEAL}
                    strokeDasharray="3 2"
                  />
                )}
                {mode === "Mensal" && on.anterior && (
                  <Bar
                    dataKey="anterior"
                    name="Período anterior"
                    stackId="b"
                    fill="#4a565d"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <PublicationChart
              id="dividends"
              title="Dividendo e lucro por ação"
              keys={["projectedGrossDividendPerShare", "estimatedEps"]}
              unit="R$ por ação"
              methodology="Dividendo bruto projetado e lucro por ação estimado; não são pagamentos realizados."
              height={340}
            />
          )}
        </div>
        <p className="mt-3 text-xs text-fmk-dim">
          Proventos brutos por ação, em reais. Projeção da pesquisa:{" "}
          {value("projectedGrossDividendPerShare")}. Fonte: {company.updated}.
        </p>
      </div>

      <div>
        <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
          Histórico
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-fmk-line text-left font-fmk-mono text-[10px] uppercase tracking-wider text-fmk-dim">
                <th className="py-2 font-normal">Período</th>
                <th className="py-2 text-right font-normal">Provento/ação</th>
                <th className="py-2 text-right font-normal">DY</th>
                <th className="py-2 pl-4 font-normal">Dado</th>
              </tr>
            </thead>
            <tbody>
              {dividendsAnnual.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-fmk-sub">
                    Histórico não informado nesta publicação.
                  </td>
                </tr>
              )}
              {[...dividendsAnnual].reverse().map((r) => (
                <tr key={r.period} className="border-b border-fmk-line-soft">
                  <td className="py-2.5 font-fmk-mono">{r.period}</td>
                  <td className="py-2.5 text-right font-fmk-mono">
                    {brl(r.realizado + r.projetado)}
                  </td>
                  <td className="py-2.5 text-right font-fmk-mono text-fmk-sub">
                    {pct(r.dy)}
                  </td>
                  <td className="py-2.5 pl-4">
                    <Tag
                      kind={
                        r.status === "projetado" ? "projetado" : "realizado"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-fmk-dim">
          DY bruto estimado da pesquisa: {value("estimatedGrossDividendYield")}.
          Não convertido em histórico realizado.
        </p>
      </div>
    </div>
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
              Fonte
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
      <p className="mt-4 text-sm leading-relaxed text-fmk-sub">
        Meses habituais da fonte:{" "}
        <strong className="font-medium text-fmk-ink">
          {value("announcementMonths")}
        </strong>
        .{" "}
        {months
          ? "Indicação de anúncios, sem confirmar pagamentos ou um próximo evento."
          : "Nenhum mês foi presumido a partir da frequência."}
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
            methodology="P/L projetado frente ao P/L médio de dez anos informado na fonte. A média resume o passado; não é uma curva anual nem retorno acumulado."
            height={360}
          />
        )}
      </div>
      <p className="mt-3 text-xs text-fmk-dim">
        Períodos e benchmarks de retorno estão desativados: a planilha informa
        apenas o P/L projetado e sua média histórica.
      </p>
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
              methodology="Estimativa consolidada da publicação, sem repartir o resultado em períodos."
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
              methodology="Lucro líquido total estimado da fonte; não representa receita ou EBITDA realizado."
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
              methodology="Taxa agregada de cinco anos informada na fonte; não reconstrói o lucro de cada ano."
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
              methodology="Relação consolidada da fonte. Valor negativo isolado não comprova caixa líquido; faltam os sinais separados de dívida e EBITDA."
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
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-fmk-dim">
        A publicação fornece indicadores consolidados. Períodos e séries ficam
        indisponíveis até existir uma fonte histórica autorizada.
      </p>
    </div>
  );
}
