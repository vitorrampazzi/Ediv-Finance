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
  // Keep keyboard selection independent of Recharts' retained hover and blur state.
  const [tooltipActive, setTooltipActive] = useState<boolean | undefined>();
  const [keyboardIndex, setKeyboardIndex] = useState(0);
  const data = items.map((item) => ({
    label: item.label,
    value: dividendNumber(item.value),
  }));
  const available = data.every((item) => item.value !== null);
  const numbers = data.map((item) => item.value ?? 0);
  const min = Math.min(0, ...numbers);
  const max = Math.max(0, ...numbers);
  const selected = items[Math.min(keyboardIndex, items.length - 1)];
  const renderTooltip = (
    label: string,
    value: string | null | undefined,
    keyboard = false,
  ) => (
    <div
      id={id + "-tooltip"}
      className="fc-chart-tooltip"
      role="tooltip"
      style={
        keyboard
          ? { position: "absolute", top: "3.25rem", right: 0, zIndex: 5 }
          : undefined
      }
    >
      <p>{label}</p>
      <strong>{formatDividendValue(value, format)}</strong>
      <p>{unit}</p>
      <small>
        Referência da análise: {formatDividendValue(referenceDate, "date")}
      </small>
    </div>
  );
  return (
    <figure
      className="fc-chart dividend-comparison"
      style={{ position: "relative" }}
      aria-labelledby={id}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          setTooltipActive(false);
          event.preventDefault();
          event.stopPropagation();
        } else if (
          event.target instanceof SVGElement &&
          event.target.getAttribute("role") === "application"
        ) {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            setKeyboardIndex((index) =>
              Math.max(
                0,
                Math.min(
                  items.length - 1,
                  index + (event.key === "ArrowRight" ? 1 : -1),
                ),
              ),
            );
            setTooltipActive(true);
            event.preventDefault();
            event.stopPropagation();
          } else if (event.key === "Enter") {
            setTooltipActive((active) => active !== true);
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }}
      onPointerMove={(event) => {
        const target = event.target;
        if (!(target instanceof Element) || target.closest(".fc-chart-tooltip"))
          return;
        if (target.closest(".fc-chart-frame")) setTooltipActive(undefined);
        else if (target.closest(".fc-chart-values")) setTooltipActive(false);
      }}
      onFocusCapture={(event) =>
        setTooltipActive(
          event.target.getAttribute("role") === "application" &&
            event.target.matches(":focus-visible"),
        )
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setTooltipActive(false);
      }}
    >
      <figcaption id={id}>
        <h3>{title}</h3>
        <p>
          <span>{unit} · comparação pontual</span>
          <span>Pesquisa · {formatDividendValue(referenceDate, "date")}</span>
        </p>
      </figcaption>
      {available ? (
        <div className="fc-chart-frame">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={data}
              layout="vertical"
              accessibilityLayer
              aria-label={title}
              aria-describedby={
                tooltipActive === true ? id + "-tooltip" : undefined
              }
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
                tickCount={3}
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
                active={tooltipActive === true ? false : tooltipActive}
                isAnimationActive={false}
                cursor={{ fill: "var(--ediv-inset)" }}
                content={({ active, payload }) =>
                  active && payload?.length
                    ? renderTooltip(
                        String(payload[0].payload.label),
                        String(payload[0].value),
                      )
                    : null
                }
              />
              <Bar
                dataKey="value"
                name={unit}
                barSize={24}
                isAnimationActive={false}
                radius={[0, 2, 2, 0]}
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
      {tooltipActive === true &&
        available &&
        selected &&
        renderTooltip(selected.label, selected.value, true)}
      <div
        className="fc-chart-values"
        role="group"
        aria-label={"Valores de " + title}
      >
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
        Setas percorrem o gráfico. Os valores acima também recebem foco; Escape
        fecha a dica.
      </p>
    </figure>
  );
}
