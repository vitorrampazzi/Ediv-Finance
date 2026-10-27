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
import { Tooltip as AccessibleTooltip } from "../Tooltip";
import {
  groupDividends,
  formatHistoricalDividend,
  historyPeriods,
  pricePlot,
  selectPrices,
  type HistoryPeriod,
  type StockHistory,
} from "../../lib/stockHistory";
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

export function HistoryFeedback({ empty }: { empty: string }) {
  const { loading, error, retry } = useHistory();
  return (
    <div className="mb-4 text-sm text-fmk-sub">
      <p role="status">
        {loading
          ? "Carregando histórico desta empresa…"
          : error
            ? `Histórico indisponível. ${error}`
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

function Source({
  history,
  children,
}: {
  history: StockHistory;
  children: React.ReactNode;
}) {
  return (
    <figcaption className="mt-3 text-xs leading-relaxed text-fmk-dim">
      {children} Fonte:{" "}
      <a
        href={history.source.url}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        {history.source.name} · {history.ticker}
      </a>
      . Coleta:{" "}
      {new Date(history.source.capturedAt).toLocaleString("pt-BR", {
        timeZone: "UTC",
      })}{" "}
      UTC.
    </figcaption>
  );
}

function HistoryTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: { key: string; cells: string[]; value?: number | null }[];
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const current = Math.min(page, pageCount - 1);
  return (
    <div className="mt-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-xs">
          <caption className="mb-2 text-left font-medium text-fmk-sub">
            {title}
          </caption>
          <thead>
            <tr className="border-b border-fmk-line text-left text-fmk-dim">
              {columns.map((column) => (
                <th key={column} scope="col" className="px-2 py-2 font-normal">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * 20, current * 20 + 20).map((row) => (
              <tr
                key={row.key}
                data-history-row={title}
                data-history-date={row.cells[0]}
                data-history-value={row.value ?? ""}
                className="border-b border-fmk-line-soft"
              >
                {row.cells.map((cell, index) => (
                  <td key={index} className="px-2 py-2 text-fmk-sub">
                    {index === 0 ? (
                      <AccessibleTooltip
                        content={columns
                          .map((column, i) => `${column}: ${row.cells[i]}`)
                          .join(". ")}
                      >
                        <button
                          type="button"
                          className="min-h-6 text-left text-fmk-ink"
                        >
                          {cell}
                        </button>
                      </AccessibleTooltip>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="py-3 text-xs text-fmk-dim">Nenhum registro informado.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fmk-sub">
        <span role="status">
          {rows.length} registros · página {current + 1} de {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Página anterior: ${title}`}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="min-h-8 rounded border border-fmk-line px-2"
          >
            Anterior
          </button>
          <button
            type="button"
            aria-label={`Próxima página: ${title}`}
            disabled={current + 1 >= pageCount}
            onClick={() => setPage(current + 1)}
            className="min-h-8 rounded border border-fmk-line px-2"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoricalPriceChart({ history }: { history: StockHistory }) {
  const { company } = useStockData();
  const [period, setPeriod] = useState<HistoryPeriod>("1A");
  const [on, setOn] = useState<Record<string, boolean>>({
    price: true,
    ceiling: true,
    reference: true,
  });
  const prices = useMemo(
    () => selectPrices(history.prices, period),
    [history.prices, period],
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
    { key: "price", label: "Fechamento AGF", color: TEAL },
    {
      key: "ceiling",
      label: "Preço-teto Excel · constante",
      color: AMBER,
      dash: "6 4",
    },
    {
      key: "reference",
      label: "Cotação Excel · constante",
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
        <p className="mb-3 text-xs text-fmk-dim">
          5D: últimos cinco fechamentos. Demais períodos até o último registro.
          Sem intraday/1D. Lacunas superiores a sete dias interrompem a área.
        </p>
        <div aria-hidden="true">
          <ResponsiveContainer height={380}>
            <ComposedChart
              accessibilityLayer={false}
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
                    title={(_, point) => dateText(String(point.date))}
                  />
                }
              />
              {on.price && (
                <Area
                  dataKey="price"
                  name="Fechamento AGF"
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
                  name="Preço-teto Excel · constante"
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
                  name="Cotação Excel · constante"
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
        <Source history={history}>
          Fechamentos em R$ por ação, sem comprovação de ajuste por eventos
          societários ou retorno total. Linhas Excel são referências constantes
          de {company.updated}, não valores históricos.{" "}
        </Source>
        <HistoryTable
          key={period}
          title="Fechamentos do período"
          columns={["Data", "Fechamento (R$/ação)"]}
          rows={prices.map((point) => ({
            key: point.date,
            cells: [dateText(point.date), brl(point.close)],
            value: point.close,
          }))}
        />
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
              ["Último fechamento AGF", brl(last)],
              [
                "Data do último registro",
                dateText(prices.at(-1)?.date ?? null),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2">
                <dt className="text-fmk-sub">{label}</dt>
                <dd className="text-right font-fmk-mono">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fmk-dim">
            Variação de preço, sem incluir proventos. Não é rentabilidade total.
          </p>
        </div>
        <div>
          <h3 className="font-fmk-mono text-[11px] uppercase tracking-[0.14em] text-fmk-dim">
            Referências da planilha · {company.updated}
          </h3>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt>Preço-teto</dt>
              <dd className="font-fmk-mono text-fmk-amber">
                {brl(company.teto)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Cotação Excel</dt>
              <dd className="font-fmk-mono text-fmk-lilac">
                {brl(company.price)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-fmk-dim">
            Teto baseado na premissa histórica de yield de 6,81%. Não é taxa
            atual nem atualização da cotação da pesquisa.
          </p>
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
    <div className="fmk-chart-layout grid gap-10 lg:grid-cols-[1fr_360px]">
      <figure
        data-history-chart="dividends"
        data-history-ticker={history.ticker}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Legend
            items={[
              { key: "past", label: "Data até a coleta", color: TEAL },
              {
                key: "future",
                label: "Data após a coleta",
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
        <div aria-hidden={data.length ? true : undefined}>
          {data.length ? (
            <ResponsiveContainer height={340}>
              <BarChart
                accessibilityLayer={false}
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
                    name="Data até a coleta"
                    stackId="a"
                    fill={TEAL}
                    isAnimationActive={false}
                  />
                )}
                {on.future && (
                  <Bar
                    dataKey="future"
                    name="Data após a coleta"
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
        <Source history={history}>
          Valores por ação conforme informados, agrupados exclusivamente pela
          data de pagamento. Sem inferir imposto ou valor bruto/líquido. Data
          passada não comprova pagamento; data futura não é estimativa. 5A
          inclui os cinco anos-calendário até a coleta e datas futuras
          informadas.{" "}
        </Source>
        <HistoryTable
          key={`${mode}-${range}`}
          title="Proventos por data de pagamento"
          columns={[
            "Período",
            "Até a coleta (R$)",
            "Após a coleta (R$)",
            "Eventos",
          ]}
          rows={data.map((row) => ({
            key: row.period,
            cells: [
              row.period,
              formatHistoricalDividend(row.past),
              formatHistoricalDividend(row.future),
              String(row.count),
            ],
            value: row.past + row.future,
          }))}
        />
      </figure>
      <div>
        <HistoryTable
          title="Eventos informados pela AGF"
          columns={["Pagamento", "Valor/ação (R$)", "Tipo", "Data-com"]}
          rows={history.dividends.map((event, index) => ({
            key: String(index),
            cells: [
              dateText(event.paymentDate),
              formatHistoricalDividend(event.value),
              event.type || "Não informado",
              dateText(event.recordDate),
            ],
            value: event.value,
          }))}
        />
        <p className="mt-3 text-xs leading-relaxed text-fmk-dim">
          Todos os eventos são mantidos, inclusive repetições e registros sem
          valor ou sem data de pagamento, que não entram nas barras. Data-com é
          a data de posição informada; não é data ex. Calendário abaixo: meses
          habituais da planilha, separado destes eventos.
        </p>
      </div>
    </div>
  );
}
