import type { ReactNode } from "react";
import { Tooltip } from "../Tooltip";

export function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label={`O que é ${label}?`}
        className="fmk-info inline-grid min-h-6 min-w-6 place-items-center align-middle"
      >
        <span
          aria-hidden
          className="grid size-4 place-items-center rounded-full border border-fmk-dim/70 font-fmk-serif text-[10px] italic leading-none text-fmk-dim transition-colors"
        >
          i
        </span>
      </button>
    </Tooltip>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-fmk-surface p-0.5 ring-1 ring-fmk-line"
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          disabled={disabled}
          onClick={() => onChange(o)}
          className={`min-h-8 min-w-10 rounded px-3 font-fmk-mono text-xs transition-colors ${
            o === value
              ? "bg-fmk-raised text-fmk-ink ring-1 ring-fmk-line"
              : "text-fmk-sub hover:text-fmk-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export type LegendItem = {
  key: string;
  label: string;
  color: string;
  dash?: string;
  hatch?: boolean;
  value?: string;
};

export function Legend({
  items,
  active,
  onToggle,
  disabled = false,
}: {
  items: LegendItem[];
  active: Record<string, boolean>;
  onToggle: (k: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
      aria-label="Legenda do gráfico (clique para ocultar ou exibir)"
    >
      {items.map((it) => {
        const on = active[it.key];
        return (
          <li key={it.key}>
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onToggle(it.key)}
              className={`group flex min-h-8 items-center gap-2 text-xs transition-opacity ${on ? "text-fmk-ink" : "text-fmk-dim line-through opacity-60"}`}
            >
              <svg width="22" height="10" aria-hidden>
                {it.hatch ? (
                  <rect
                    x="1"
                    y="1"
                    width="20"
                    height="8"
                    rx="1.5"
                    fill="none"
                    stroke={it.color}
                    strokeDasharray="3 2"
                  />
                ) : (
                  <line
                    x1="0"
                    x2="22"
                    y1="5"
                    y2="5"
                    stroke={it.color}
                    strokeWidth="2"
                    strokeDasharray={it.dash}
                  />
                )}
              </svg>
              <span>{it.label}</span>
              {it.value && (
                <span className="font-fmk-mono text-fmk-sub">{it.value}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type TipEntry = {
  name?: string;
  value?: number | string | null;
  color?: string;
  stroke?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
};
export function ChartTip({
  active,
  payload,
  label,
  fmt,
  hide = [],
  title,
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string;
  fmt: (v: number, key?: string) => string;
  hide?: string[];
  title?: (label: string, p: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(
    (p) => p.value != null && !hide.includes(String(p.dataKey)),
  );
  if (!rows.length) return null;
  const head = title ? title(String(label), payload[0].payload ?? {}) : label;
  return (
    <div
      role="tooltip"
      className="min-w-40 rounded-md border border-fmk-line bg-fmk-raised px-3 py-2.5 text-xs shadow-none"
    >
      <div className="mb-2 border-b border-fmk-line pb-1.5 font-fmk-mono text-[11px] text-fmk-sub">
        {head}
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={String(r.dataKey)}
            className="flex items-center justify-between gap-5"
          >
            <span className="flex items-center gap-2 text-fmk-sub">
              <span
                className="size-2 rounded-full"
                style={{ background: r.color ?? r.stroke }}
              />
              {r.name}
            </span>
            <span className="font-fmk-mono text-fmk-ink">
              {fmt(Number(r.value), String(r.dataKey))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const tagMap = {
  informado: { label: "Informado", dot: "bg-fmk-dim" },
  realizado: { label: "Realizado", dot: "bg-fmk-teal" },
  estimado: {
    label: "Estimado",
    dot: "bg-[linear-gradient(90deg,var(--fmk-teal)_50%,transparent_50%)] ring-1 ring-fmk-teal",
  },
  projetado: {
    label: "Projetado",
    dot: "ring-1 ring-dashed ring-fmk-teal bg-transparent",
  },
  indisponivel: { label: "Indisponível", dot: "bg-fmk-dim/40" },
} as const;
export type DataKind = keyof typeof tagMap;
export function Tag({ kind }: { kind: DataKind }) {
  const t = tagMap[kind];
  return (
    <span className="inline-flex items-center gap-1.5 font-fmk-mono text-[10px] uppercase tracking-wider text-fmk-dim">
      <span className={`size-2 rounded-full ${t.dot}`} aria-hidden />
      {t.label}
    </span>
  );
}

export function SectionHead({
  id,
  n,
  title,
  lede,
  right,
}: {
  id: string;
  n: string;
  title: string;
  lede?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-fmk-line pt-8">
      <div className="max-w-2xl">
        <div className="mb-2 font-fmk-mono text-[11px] uppercase tracking-[0.16em] text-fmk-dim">
          {n} · {title}
        </div>
        <h2
          id={`${id}-t`}
          className="font-fmk-serif text-3xl font-medium tracking-tight md:text-4xl"
        >
          {title}
        </h2>
        {lede && (
          <p className="mt-2 text-sm leading-relaxed text-fmk-sub">{lede}</p>
        )}
      </div>
      {right}
    </div>
  );
}
