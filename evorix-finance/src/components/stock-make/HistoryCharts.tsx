import { useId, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnnualPoint } from "../../lib/ranking";
import {
  attachPayout,
  dividendKindLabels,
  dividendKinds,
  dividendSourceNote,
  formatDividendPerShare,
  formatPayoutPercent,
  groupDividendsByType,
  type DividendKind,
  type DividendTypeRow,
  type StockHistory,
} from "../../lib/stockHistory";
import { axisProps, gridProps, num, useHistory } from "./data";
import { Legend, Seg } from "./ui";

const TEAL = "var(--fmk-teal)";
const PAYOUT = "var(--fmk-amber)";
const kindColors: Record<DividendKind, string> = {
  dividend: TEAL,
  jcp: "var(--fmk-steel)",
  other: "var(--fmk-lilac)",
};
const tooltipBox = { maxWidth: "100%" };
type Mode = "Anual" | "Mensal";
type Row = DividendTypeRow & { payout: number | null };
// "2026-03" → "03/2026"; years stay as they are.
const periodText = (period: string) =>
  period.length === 7 ? `${period.slice(5)}/${period.slice(0, 4)}` : period;

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

// Values of each type in the period, the scheduled part, the total and the
// payout of the year when the publication informs it.
function DividendTip({
  active,
  payload,
  payout,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  payout: boolean;
}) {
  const row = active ? payload?.find((item) => item.payload)?.payload : null;
  if (!row) return null;
  const kinds = dividendKinds.filter(
    (kind) => row[kind] + row[`${kind}Future`] > 0,
  );
  return (
    <div
      role="tooltip"
      data-dividend-tooltip={row.period}
      className="min-w-44 rounded-md border border-fmk-line bg-fmk-raised px-3 py-2.5 text-xs shadow-none"
      style={{ maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      <div className="mb-2 border-b border-fmk-line pb-1.5 font-fmk-mono text-[11px] text-fmk-sub">
        Pagos em {periodText(row.period)} · R$ por ação
      </div>
      <dl className="space-y-1.5">
        {kinds.map((kind) => (
          <div key={kind} data-tooltip-kind={kind}>
            <div className="flex items-center justify-between gap-5">
              <dt className="flex items-center gap-2 text-fmk-sub">
                <span
                  aria-hidden
                  className="size-2 rounded-sm"
                  style={{ background: kindColors[kind] }}
                />
                {dividendKindLabels[kind]}
              </dt>
              <dd className="font-fmk-mono text-fmk-ink">
                {formatDividendPerShare(row[kind] + row[`${kind}Future`])}
              </dd>
            </div>
            {row[`${kind}Future`] > 0 && (
              <p className="mt-0.5 text-right text-[11px] text-fmk-sub">
                inclui {formatDividendPerShare(row[`${kind}Future`])} agendado
              </p>
            )}
          </div>
        ))}
        <div
          className="flex items-center justify-between gap-5 border-t border-fmk-line pt-1.5"
          data-tooltip-total
        >
          <dt className="font-medium text-fmk-ink">Total</dt>
          <dd className="font-fmk-mono font-medium text-fmk-ink">
            {formatDividendPerShare(row.total)}
          </dd>
        </div>
        {payout && row.payout !== null && (
          <div
            className="flex items-center justify-between gap-5"
            data-tooltip-payout
          >
            <dt className="text-fmk-sub">Payout do ano</dt>
            <dd className="font-fmk-mono text-fmk-ink">
              {formatPayoutPercent(row.payout)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// Dividends paid per share, stacked by AGF type, by payment date. Scheduled
// events (after the snapshot date) are hatched. The annual payout informed in
// the publication, when there is one, is a line on its own axis (%).
export function HistoricalDividendChart({
  history,
  payout,
}: {
  history: StockHistory;
  payout?: AnnualPoint[] | null;
}) {
  const [mode, setMode] = useState<Mode>("Anual");
  const [range, setRange] = useState<"5A" | "Máx">("Máx");
  const [on, setOn] = useState<Record<string, boolean>>({
    dividend: true,
    jcp: true,
    other: true,
    future: true,
    payout: true,
  });
  const grouped = useMemo(
    () => groupDividendsByType(history, mode, range),
    [history, mode, range],
  );
  const payoutData = useMemo(
    () => attachPayout(grouped, mode === "Anual" ? payout : null),
    [grouped, mode, payout],
  );
  const informed = attachPayout([], payout).available;
  const data: Row[] = payoutData.rows;
  const withPayout = payoutData.matched > 0;
  const drawPayout = withPayout && on.payout;
  const present = dividendKinds.filter((kind) =>
    data.some((row) => row[kind] + row[`${kind}Future`] > 0),
  );
  const scheduled = data.some((row) => row.scheduled > 0);
  const base = useId().replaceAll(":", "");
  const hidden =
    !present.some((kind) => on[kind]) && !(drawPayout && present.length);
  const unit = mode === "Anual" ? "ano" : "mês";
  return (
    <div className="fmk-chart-layout">
      <figure
        data-history-chart="dividends"
        data-history-ticker={history.ticker}
        data-dividend-mode={mode}
        data-payout={withPayout ? "present" : "absent"}
        aria-labelledby={`${base}-title`}
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={`${base}-title`} className="font-fmk-serif text-xl">
            Proventos pagos por ação
          </h3>
          <p className="text-xs text-fmk-sub" data-dividend-unit>
            R$ por ação, por {unit} de pagamento
            {data.length > 0 &&
              ` · ${periodText(data[0].period)} a ${periodText(data.at(-1)!.period)}`}
          </p>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Legend
            items={[
              ...present.map((kind) => ({
                key: kind,
                label: dividendKindLabels[kind],
                color: kindColors[kind],
                bar: true,
              })),
              ...(scheduled
                ? [
                    {
                      key: "future",
                      label: "Agendados",
                      color: TEAL,
                      hatch: true,
                    },
                  ]
                : []),
              ...(withPayout
                ? [{ key: "payout", label: "Payout anual (%)", color: PAYOUT }]
                : []),
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
              <ComposedChart
                accessibilityLayer
                title={`Proventos pagos por ação, por ${unit}, em reais`}
                data={data}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                barCategoryGap="22%"
              >
                <defs>
                  {dividendKinds.map((kind) => (
                    <pattern
                      key={kind}
                      id={`${base}-${kind}`}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect
                        width="6"
                        height="6"
                        fill={kindColors[kind]}
                        fillOpacity="0.1"
                      />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke={kindColors[kind]}
                        strokeWidth="2.4"
                      />
                    </pattern>
                  ))}
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="period"
                  {...axisProps}
                  minTickGap={24}
                  tickFormatter={periodText}
                />
                <YAxis
                  yAxisId="value"
                  {...axisProps}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => num(v, 2)}
                />
                {drawPayout && (
                  <YAxis
                    yAxisId="payout"
                    orientation="right"
                    {...axisProps}
                    axisLine={false}
                    width={44}
                    domain={[
                      (min: number) => Math.min(0, Math.floor(min / 10) * 10),
                      (max: number) => Math.max(100, Math.ceil(max / 10) * 10),
                    ]}
                    tickFormatter={(v: number) => `${num(v, 0)}%`}
                  />
                )}
                <Tooltip
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={tooltipBox}
                  cursor={{ fill: "var(--fmk-line-soft)" }}
                  content={<DividendTip payout={withPayout} />}
                />
                {dividendKinds.map(
                  (kind) =>
                    on[kind] && (
                      <Bar
                        key={kind}
                        yAxisId="value"
                        dataKey={kind}
                        name={dividendKindLabels[kind]}
                        stackId="a"
                        fill={kindColors[kind]}
                        isAnimationActive={false}
                      />
                    ),
                )}
                {on.future &&
                  dividendKinds.map(
                    (kind) =>
                      on[kind] && (
                        <Bar
                          key={kind + "Future"}
                          yAxisId="value"
                          dataKey={`${kind}Future`}
                          name={`${dividendKindLabels[kind]} agendado`}
                          stackId="a"
                          fill={`url(#${base}-${kind})`}
                          stroke={kindColors[kind]}
                          strokeDasharray="3 2"
                          isAnimationActive={false}
                        />
                      ),
                  )}
                {drawPayout && (
                  <Line
                    yAxisId="payout"
                    dataKey="payout"
                    name="Payout anual"
                    className="fmk-payout-line"
                    stroke={PAYOUT}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{
                      r: 3.5,
                      fill: "var(--fmk-bg)",
                      stroke: PAYOUT,
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 4.5, fill: PAYOUT }}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
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
        {data.length > 0 && hidden && (
          <p role="status" className="text-sm text-fmk-sub">
            Séries ocultas. Ative uma legenda para exibir o gráfico.
          </p>
        )}
        <div className="mt-3 space-y-1 text-xs leading-5 text-fmk-sub">
          <p data-dividend-source>{dividendSourceNote(history)}</p>
          {scheduled && (
            <p>Hachurado: pagamentos agendados depois da data do snapshot.</p>
          )}
          {withPayout && (
            <p data-payout-note>
              Payout anual informado pela equipe na publicação, no eixo da
              direita.
            </p>
          )}
          {informed && !withPayout && (
            <p data-payout-note>
              {mode === "Anual"
                ? "O payout anual informado não coincide com os anos deste intervalo."
                : "O payout anual aparece na visão anual."}
            </p>
          )}
        </div>
        {data.length > 0 && (
          // A table ignores the 1px box of sr-only; the wrapper keeps it.
          <div className="sr-only">
            <table>
              <caption>
                Proventos pagos por ação, por {unit} de pagamento, em reais
              </caption>
              <thead>
                <tr>
                  <th scope="col">Período</th>
                  {present.map((kind) => (
                    <th key={kind} scope="col">
                      {dividendKindLabels[kind]}
                    </th>
                  ))}
                  {scheduled && <th scope="col">Agendado</th>}
                  <th scope="col">Total</th>
                  {withPayout && <th scope="col">Payout</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.period} data-dividend-period={row.period}>
                    <th scope="row">{periodText(row.period)}</th>
                    {present.map((kind) => (
                      <td key={kind} data-dividend-kind={kind}>
                        {formatDividendPerShare(
                          row[kind] + row[`${kind}Future`],
                        )}
                      </td>
                    ))}
                    {scheduled && (
                      <td>{formatDividendPerShare(row.scheduled)}</td>
                    )}
                    <td data-dividend-total>
                      {formatDividendPerShare(row.total)}
                    </td>
                    {withPayout && (
                      <td data-dividend-payout>
                        {row.payout === null
                          ? "Não informado"
                          : formatPayoutPercent(row.payout)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </figure>
    </div>
  );
}
