import { useId, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DividendFormat } from "../../dividend-analysis.mjs";
import { formatDividendValue } from "../../dividend-analysis.mjs";
import { dividendNumber } from "../../dividend-insights.mjs";
import { Tooltip } from "./Tooltip";

export function ComparativeDividendChart({
  title,
  unit,
  items,
  format,
  referenceDate,
}: {
  title: string;
  unit: string;
  items: { label: string; value: string | null | undefined }[];
  format: DividendFormat;
  referenceDate?: string | null;
}) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  const data = items.map((item) => ({
    label: item.label,
    value: dividendNumber(item.value),
  }));
  const available = data.every((item) => item.value !== null);
  const numbers = data.map((item) => item.value ?? 0);
  const min = Math.min(0, ...numbers);
  const max = Math.max(0, ...numbers);
  return (
    <figure
      className="fc-chart dividend-comparison"
      aria-labelledby={id}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          setDismissed(true);
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key.startsWith("Arrow")) setDismissed(false);
      }}
      onPointerMove={() => setDismissed(false)}
      onFocusCapture={() => setDismissed(false)}
    >
      <figcaption id={id}>
        <h3>{title}</h3>
        <p>{unit} · comparação pontual</p>
      </figcaption>
      {available ? (
        <div className="fc-chart-frame">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={data}
              layout="vertical"
              accessibilityLayer
              aria-label={title}
              margin={{ top: 12, right: 22, bottom: 18, left: 0 }}
            >
              <CartesianGrid
                stroke="var(--ediv-line)"
                strokeDasharray="3 5"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[min, max === min ? max + 1 : max]}
                tick={{ fill: "var(--ediv-muted)", fontSize: 11 }}
                tickFormatter={(value) =>
                  formatDividendValue(String(value), format)
                }
                tickCount={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={94}
                tick={{ fill: "var(--ediv-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="var(--ediv-muted)" />
              <ChartTooltip
                active={dismissed ? false : undefined}
                isAnimationActive={false}
                cursor={{ fill: "var(--ediv-inset)" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="fc-chart-tooltip" role="tooltip">
                      <p>{String(payload[0].payload.label)}</p>
                      <strong>
                        {formatDividendValue(String(payload[0].value), format)}
                      </strong>
                      <p>{unit}</p>
                      <small>
                        Referência da análise:{" "}
                        {formatDividendValue(referenceDate, "date")}
                      </small>
                    </div>
                  ) : null
                }
              />
              <Bar
                dataKey="value"
                name={unit}
                barSize={34}
                isAnimationActive={false}
                radius={[0, 4, 4, 0]}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.label}
                    fill={
                      index === 0 ? "var(--ediv-accent)" : "var(--ediv-muted)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p role="status" className="fc-chart-unavailable">
          Comparação indisponível: um dos valores não foi informado. Ausência
          não foi convertida em zero.
        </p>
      )}
    <div className="fc-chart-values" role="group" aria-label={"Valores de " + title}>
        {items.map((item) => (
          <Tooltip
            key={item.label}
            content={
              item.label +
              ": " +
              formatDividendValue(item.value, format) +
              " · " +
              unit
            }
          >
            <button type="button" className="dividend-chart-row">
              <span>{item.label}</span>{" "}
              <strong>{formatDividendValue(item.value, format)}</strong>
            </button>
          </Tooltip>
        ))}
      </div>
      <p className="fc-chart-footnote">
        Valores em texto disponíveis acima. Use as setas no gráfico ou foque os
        valores; Escape dispensa a dica. Sem série histórica ou evolução
        temporal.
      </p>
    </figure>
  );
}
