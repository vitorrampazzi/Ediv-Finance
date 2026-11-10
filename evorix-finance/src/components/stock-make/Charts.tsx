import { HistoricalDividendChart, HistoryFeedback } from "./HistoryCharts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  dividendAnnouncementMonths,
  axisProps,
  gridProps,
} from "./data";
import { ChartTip } from "./ui";
import { dividendColumns, type DividendColumnKey } from "./data";
import {
  compactReais,
  formatReais,
  netIncomeSeries,
} from "../../lib/stockHistory";

const TEAL = "var(--fmk-teal)";
const AMBER = "var(--fmk-amber)";

const chartLabels: Partial<Record<DividendColumnKey, string>> = {
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
      <div style={{ height }} data-chart-visual={data.length ? "" : undefined}>
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

/* Dividend bars by type from the approved AGF endpoint; the payout line is
   the one the team informs in the publication, when there is one. */
export function DividendChart() {
  const history = useHistory();
  const { entry } = useStockData();
  if (history.data?.dividends.length)
    return (
      <HistoricalDividendChart
        key={history.data.ticker}
        history={history.data}
        payout={entry.annualHistory?.payout}
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

/* ───────────── Resultados ───────────── */
// The publication brings one snapshot per field, so each block shows how the
// fields relate instead of a single bar. Derived values are direct arithmetic.
function ResultFigure({
  id,
  title,
  sub,
  keys,
  summary,
  className = "",
  children,
}: {
  id: string;
  title: string;
  sub: string;
  keys: DividendColumnKey[];
  summary: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { number, value } = useStockData();
  const ready = keys.some((key) => number(key) !== null);
  return (
    <figure
      className={`fmk-publication-chart min-w-0 border-t border-fmk-line pt-6 ${className}`}
      data-publication-chart={id}
    >
      <figcaption className="mb-5">
        <h3 className="font-fmk-serif text-xl">{title}</h3>
        <p className="mt-0.5 text-xs text-fmk-sub">{sub}</p>
      </figcaption>
      {ready ? (
        <div data-chart-visual>{children}</div>
      ) : (
        <div className="h-40">
          <ChartUnavailable title={`${title}: dados indisponíveis`} />
        </div>
      )}
      <div className="sr-only">
        <p>{summary}</p>
        <table>
          <caption>{title}: valores da publicação</caption>
          <tbody>
            {keys.map((key) => (
              <tr key={key} data-chart-field={key}>
                <th scope="row">
                  {dividendColumns.find((column) => column.key === key)!.label}
                </th>
                <td data-chart-value={key} data-exact-value={value(key)}>
                  {value(key)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Round linear scale from min(bottom, values) to max(top, values), about 5 ticks. */
function scale(values: number[], top: number, bottom = 0) {
  const low = Math.min(bottom, ...values);
  const high = Math.max(top, ...values);
  const rough = (high - low) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, i) => min + i * step,
  );
  return { ticks, at: (v: number) => ((v - min) / (max - min)) * 100 };
}

function Axis({
  ticks,
  at,
  unit = "",
}: {
  ticks: number[];
  at: (v: number) => number;
  unit?: string;
}) {
  return (
    <div aria-hidden className="relative mt-2 h-4 text-[11px] text-fmk-dim">
      {ticks.map((t, i) => (
        <span
          key={t}
          className="absolute top-0 whitespace-nowrap"
          style={{
            left: `${at(t)}%`,
            transform: `translateX(${i === 0 ? 0 : i === ticks.length - 1 ? -100 : -50}%)`,
          }}
        >
          {num(t, 0)}
          {unit}
        </span>
      ))}
    </div>
  );
}

/** Text label above a point of a track, kept inside the track edges. */
function Pin({ at, children }: { at: number; children: React.ReactNode }) {
  return (
    <span
      className="absolute bottom-full mb-1.5 whitespace-nowrap text-xs text-fmk-ink"
      style={{
        left: `${at}%`,
        transform: `translateX(${at < 15 ? 0 : at > 85 ? -100 : -50}%)`,
      }}
    >
      {children}
    </span>
  );
}

const Swatch = ({ hatch = false }: { hatch?: boolean }) => (
  <span
    aria-hidden
    className={`inline-block size-3 shrink-0 rounded-sm ${hatch ? "hatch border border-dashed border-fmk-teal" : "bg-fmk-teal"}`}
  />
);

const years = (n: number) =>
  `${num(Math.abs(n), 1)} ${Math.abs(Math.round(n * 10) / 10) < 2 ? "ano" : "anos"}`;

function EarningsToDividend() {
  const { company, number, value } = useStockData();
  const { lpa, dpa } = company;
  const profit = number("estimatedNetIncome");
  const ok = lpa !== null && dpa !== null && lpa > 0 && dpa >= 0 && dpa <= lpa;
  const kept = ok ? lpa - dpa : null;
  const share = ok ? (dpa / lpa) * 100 : 0;
  const note =
    lpa === null || dpa === null
      ? "Sem LPA estimado ou dividendo projetado para comparar a divisão."
      : !(lpa > 0)
        ? "LPA estimado igual ou abaixo de zero: não há lucro por ação para dividir entre distribuição e retenção."
        : dpa < 0
          ? "Dividendo projetado negativo na publicação; a divisão não é exibida."
          : dpa > lpa
            ? `O dividendo projetado supera o LPA estimado em ${brl(dpa - lpa)} por ação. A barra não é exibida para não distorcer a proporção.`
            : null;
  const summary = ok
    ? `Lucro líquido estimado de ${value("estimatedNetIncome")}. Do LPA estimado de ${brl(lpa)}, ${brl(dpa)} são distribuídos como dividendo projetado e ${brl(kept)} ficam retidos na empresa (LPA menos DPA), ${num(share, 0)}% distribuídos. Payout esperado informado: ${value("expectedPayout")}.`
    : `Lucro líquido estimado de ${value("estimatedNetIncome")}, LPA estimado de ${value("estimatedEps")}, dividendo projetado de ${value("projectedGrossDividendPerShare")} e payout esperado de ${value("expectedPayout")}. ${note}`;
  return (
    <ResultFigure
      id="earnings"
      title="Do lucro ao dividendo"
      sub="Quanto do lucro por ação estimado vira dividendo projetado"
      keys={[
        "estimatedNetIncome",
        "estimatedEps",
        "projectedGrossDividendPerShare",
        "expectedPayout",
      ]}
      summary={summary}
      className="lg:col-span-2"
    >
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-2">
            <dt className="text-xs text-fmk-sub">Lucro líquido estimado</dt>
            <dd className="mt-1 font-fmk-serif text-4xl tracking-tight text-fmk-teal">
              {profit === null
                ? "Não informado"
                : Math.abs(profit) >= 1e9
                  ? `R$ ${num(profit / 1e9)} bi`
                  : Math.abs(profit) >= 1e6
                    ? `R$ ${num(profit / 1e6)} mi`
                    : brl(profit)}
            </dd>
            {profit !== null && (
              <dd className="mt-1 text-xs text-fmk-dim">
                {value("estimatedNetIncome")}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-fmk-sub">LPA estimado</dt>
            <dd className="mt-1 text-xl">{value("estimatedEps")}</dd>
          </div>
          <div>
            <dt className="text-xs text-fmk-sub">Payout esperado</dt>
            <dd className="mt-1 text-xl">{value("expectedPayout")}</dd>
          </div>
        </dl>
        <div className="self-end">
          {ok ? (
            <div aria-hidden>
              <div className="relative mt-7">
                <Pin at={share}>DPA ÷ LPA: {num(share, 0)}%</Pin>
                <div className="flex h-11 overflow-hidden rounded-md">
                  {dpa > 0 && (
                    <div
                      className="bg-fmk-teal"
                      style={{ width: `${share}%` }}
                    />
                  )}
                  {kept! > 0 && (
                    <div
                      className="hatch flex-1 rounded-r-md border border-dashed border-fmk-teal"
                      style={dpa > 0 ? { borderLeft: 0 } : undefined}
                    />
                  )}
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-fmk-dim">
                <span>R$ 0</span>
                <span>LPA estimado {brl(lpa)}</span>
              </div>
            </div>
          ) : (
            <p
              className="rounded-md border border-dashed border-fmk-line px-4 py-3 text-sm text-fmk-sub"
              data-chart-note
            >
              {note}
            </p>
          )}
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-2">
              {ok && (
                <span className="mt-1">
                  <Swatch />
                </span>
              )}
              <span>
                <span className="block text-fmk-sub">
                  Distribuído como dividendo
                </span>
                <span className="text-fmk-ink">
                  {value("projectedGrossDividendPerShare")}
                </span>{" "}
                <span className="text-xs text-fmk-dim">DPA projetado</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              {ok && (
                <span className="mt-1">
                  <Swatch hatch />
                </span>
              )}
              <span>
                <span className="block text-fmk-sub">Retido na empresa</span>
                <span className="text-fmk-ink">
                  {kept === null ? "Não calculado" : brl(kept)}
                </span>{" "}
                <span className="text-xs text-fmk-dim">LPA − DPA</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </ResultFigure>
  );
}

function EarningsGrowth() {
  const { cagrLucro } = useStockData();
  const rate = cagrLucro !== null && cagrLucro > -1 ? cagrLucro : null;
  const data =
    rate === null
      ? []
      : Array.from({ length: 6 }, (_, year) => ({
          year: `Ano ${year}`,
          index: 100 * (1 + rate) ** year,
        }));
  const end = data.at(-1)?.index ?? null;
  const { ticks } = scale(
    data.map((d) => d.index),
    100,
    100,
  );
  const rateText = pct(cagrLucro, 1);
  return (
    <ResultFigure
      id="cagr"
      title="Crescimento do lucro"
      sub="CAGR dos lucros em cinco anos, informado na pesquisa"
      keys={["earningsCagr5Years"]}
      summary={
        end === null
          ? `CAGR de lucros informado: ${rateText}.`
          : `Ilustração do CAGR informado de ${rateText} ao ano: partindo do índice 100 no ano 0, o crescimento composto leva a ${num(end, 0)} no ano 5. ${data.map((d) => `${d.year}: ${num(d.index, 0)}`).join("; ")}. Não são lucros nem datas reais.`
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-fmk-serif text-4xl tracking-tight text-fmk-teal">
          {rateText}
        </span>
        <span className="text-sm text-fmk-sub">ao ano</span>
        {end !== null && (
          <span className="ml-auto text-sm text-fmk-sub">
            índice 100 → <span className="text-fmk-ink">{num(end, 0)}</span>
          </span>
        )}
      </div>
      {data.length > 0 && (
        <>
          <div aria-hidden className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                baseValue={100}
              >
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="year"
                  {...axisProps}
                  interval={0}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={40}
                  domain={[ticks[0], ticks.at(-1)!]}
                  ticks={ticks}
                  interval={0}
                  tickFormatter={(v: number) => num(v, 0)}
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--fmk-dim)"
                  strokeDasharray="3 3"
                />
                <Tooltip
                  cursor={{ stroke: "var(--fmk-dim)", strokeDasharray: "3 3" }}
                  content={<ChartTip fmt={(v) => num(v, 1)} />}
                />
                <Area
                  dataKey="index"
                  name="Índice"
                  type="monotone"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill={TEAL}
                  fillOpacity={0.14}
                  dot={{
                    r: 3,
                    fill: "var(--fmk-bg)",
                    stroke: TEAL,
                    strokeWidth: 1.5,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-fmk-dim">
            Ilustração: o que um crescimento de {rateText} ao ano representa em
            5 anos, em índice (ano 0 = 100). Não são lucros nem datas reais.
          </p>
        </>
      )}
    </ResultFigure>
  );
}

function Leverage() {
  const { number, value } = useStockData();
  const debt = number("netDebtToEbitda");
  const s = scale(debt === null ? [] : [debt], 5);
  const text =
    debt === null
      ? ""
      : debt < 0
        ? `${value("netDebtToEbitda")}x: valor negativo, o que indica caixa maior que a dívida ou EBITDA negativo; a pesquisa não informa os sinais separados.`
        : debt === 0
          ? "0x: a dívida líquida informada é nula em relação ao EBITDA."
          : `${value("netDebtToEbitda")}x significa que a dívida líquida equivale a cerca de ${years(debt)} de EBITDA.`;
  return (
    <ResultFigure
      id="debt"
      title="Endividamento"
      sub="Dívida líquida / EBITDA, em vezes"
      keys={["netDebtToEbitda"]}
      summary={
        debt === null
          ? "Dívida líquida / EBITDA não informada."
          : `Dívida líquida / EBITDA de ${value("netDebtToEbitda")} vezes, numa régua de ${num(s.ticks[0], 0)} a ${num(s.ticks.at(-1)!, 0)} vezes. ${text}`
      }
    >
      {debt !== null && (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-fmk-serif text-4xl tracking-tight">
              {value("netDebtToEbitda")}x
            </span>
            <span className="text-sm text-fmk-sub">
              dívida líquida / EBITDA
            </span>
          </div>
          <div aria-hidden className="mt-12">
            <div className="relative h-3 rounded-full bg-fmk-line-soft">
              {s.ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-fmk-line"
                  style={{ left: `${s.at(t)}%` }}
                />
              ))}
              <span
                className="absolute inset-y-0 rounded-full bg-fmk-teal/80"
                style={{
                  left: `${Math.min(s.at(0), s.at(debt))}%`,
                  width: `${Math.abs(s.at(debt) - s.at(0))}%`,
                }}
              />
              <span
                className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-fmk-teal"
                style={{ left: `${s.at(debt)}%`, background: "var(--fmk-bg)" }}
              />
              <Pin at={s.at(debt)}>
                <span className="relative -top-2">
                  {value("netDebtToEbitda")}x
                </span>
              </Pin>
            </div>
            <Axis ticks={s.ticks} at={s.at} unit="x" />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-fmk-sub">{text}</p>
        </>
      )}
    </ResultFigure>
  );
}

/* Net income year by year, as the team informs it in the publication: at most
   the last ten years, no gap filled and no estimate mixed in. */
function NetIncomeHistory() {
  const { entry } = useStockData();
  const data = netIncomeSeries(entry.annualHistory?.netIncome);
  const period = data.length
    ? data.length === 1
      ? data[0].period
      : `${data[0].period} a ${data.at(-1)!.period}`
    : "";
  return (
    <figure
      className="fmk-annual-chart min-w-0 border-t border-fmk-line pt-6 lg:col-span-2"
      data-annual-chart="net-income"
      data-annual-state={data.length ? "ready" : "empty"}
      aria-labelledby="fmk-net-income-title"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="fmk-net-income-title" className="font-fmk-serif text-xl">
          Lucro líquido por ano
        </h3>
        {data.length > 0 && (
          <p className="text-xs text-fmk-sub" data-annual-unit>
            Em R$ · {period}
          </p>
        )}
      </div>
      {data.length ? (
        <>
          <div className="h-[260px]" data-chart-visual>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                accessibilityLayer
                title={`Lucro líquido por ano, em reais, ${period}`}
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="period" {...axisProps} minTickGap={8} />
                <YAxis
                  {...axisProps}
                  axisLine={false}
                  width={64}
                  // The default domain starts at zero, takes in losses and
                  // keeps round ticks.
                  tickFormatter={(amount: number) => compactReais(amount)}
                />
                <ReferenceLine y={0} stroke="var(--fmk-line)" />
                <Tooltip
                  cursor={{ fill: "var(--fmk-line-soft)" }}
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={{ maxWidth: "100%" }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as
                      (typeof data)[number] | undefined;
                    return active && row ? (
                      <div
                        role="tooltip"
                        data-net-income-tooltip={row.period}
                        className="rounded-md border border-fmk-line bg-fmk-raised px-3 py-2 text-xs text-fmk-ink"
                        style={{
                          maxWidth: "min(280px, calc(100vw - 32px))",
                          overflowWrap: "anywhere",
                        }}
                      >
                        <div className="text-fmk-sub">
                          Lucro líquido em {row.period}
                        </div>
                        <div className="mt-1 font-fmk-mono">
                          {formatReais(row.value)}
                        </div>
                      </div>
                    ) : null;
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Lucro líquido"
                  maxBarSize={56}
                  isAnimationActive={false}
                >
                  {data.map((row) => (
                    <Cell
                      key={row.period}
                      fill={row.value < 0 ? "var(--fmk-down)" : TEAL}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-5 text-fmk-sub" data-annual-source>
            Fonte: informado pela equipe na publicação. Valores anuais em reais;
            no eixo, abreviados (mil, mi, bi).
            {data.some((row) => row.value < 0) &&
              " Barras em vermelho: prejuízo no ano."}
          </p>
          <div className="sr-only">
            <table>
              <caption>Lucro líquido por ano, em reais, {period}</caption>
              <tbody>
                {data.map((row) => (
                  <tr key={row.period} data-net-income-year={row.period}>
                    <th scope="row">{row.period}</th>
                    <td>{formatReais(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p
          className="rounded-md border border-dashed border-fmk-line px-4 py-3 text-sm text-fmk-sub"
          data-annual-empty
        >
          A publicação não traz o lucro líquido histórico desta empresa.
        </p>
      )}
    </figure>
  );
}

export function ResultsCharts() {
  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
      <NetIncomeHistory />
      <EarningsToDividend />
      <EarningsGrowth />
      <Leverage />
    </div>
  );
}

/* P/L projetado contra a média de 10 anos, ambos informados na pesquisa. */
export function ValuationChart() {
  const { company, number, value } = useStockData();
  const times = (key: DividendColumnKey) =>
    number(key) === null ? value(key) : `${value(key)}x`;
  const { plProj, plMed } = company;
  const values = [plProj, plMed].filter((v): v is number => v !== null);
  const s = scale(values, Math.max(1, ...values) * 1.15);
  return (
    <ResultFigure
      id="valuation"
      title="P/L e média histórica"
      sub="P/L projetado comparado à média dos últimos 10 anos"
      keys={["projectedPE", "averagePE10Years", "peDeviation"]}
      summary={`P/L projetado de ${value("projectedPE")} e média de 10 anos de ${value("averagePE10Years")}; desvio informado de ${value("peDeviation")}.`}
    >
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:items-end">
        <div>
          <p className="font-fmk-serif text-4xl tracking-tight text-fmk-teal">
            {value("peDeviation")}
          </p>
          <p className="mt-1 text-sm text-fmk-sub">
            desvio do P/L projetado em relação à média de 10 anos, informado na
            pesquisa
          </p>
        </div>
        <div>
          <div
            aria-hidden
            className="relative mt-6 h-10 rounded-md bg-fmk-line-soft"
          >
            {plProj !== null && (
              <span
                className="absolute top-1/2 h-4 -translate-y-1/2 bg-fmk-teal"
                style={{
                  left: `${Math.min(s.at(0), s.at(plProj))}%`,
                  width: `${Math.abs(s.at(plProj) - s.at(0))}%`,
                }}
              />
            )}
            {plMed !== null && (
              <>
                <span
                  className="absolute -inset-y-1.5 w-[3px] -translate-x-1/2 rounded-full bg-fmk-ink"
                  style={{ left: `${s.at(plMed)}%` }}
                />
                <Pin at={s.at(plMed)}>
                  <span className="relative -top-1.5">
                    média {value("averagePE10Years")}
                  </span>
                </Pin>
              </>
            )}
          </div>
          <Axis ticks={s.ticks} at={s.at} unit="x" />
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-2 w-5 rounded-sm bg-fmk-teal" />
              <span className="text-fmk-sub">P/L projetado</span>
              <span className="text-fmk-ink">{times("projectedPE")}</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-4 w-[3px] rounded-full bg-fmk-ink"
              />
              <span className="text-fmk-sub">Média de 10 anos</span>
              <span className="text-fmk-ink">{times("averagePE10Years")}</span>
            </li>
          </ul>
        </div>
      </div>
    </ResultFigure>
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
