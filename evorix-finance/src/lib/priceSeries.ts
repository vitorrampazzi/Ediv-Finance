// Price history of the company page, from /api/rankings/price-series
// (docs/MARGEM-E-HISTORICO.md, "Séries do gráfico"). The adjustments are the
// provider's; nothing here adjusts, joins or invents a close. Pure: the unit
// tests import this file directly in Node.
import {
  consultedAt,
  decimal,
  isoTime,
  priceText,
  quoteMoney,
  saoPauloDay,
} from "./liveQuotes.ts";

export type PriceBasis = "adjusted" | "nominal";
export type PriceGranularity = "daily" | "monthly";
export type PriceSource = "brapi" | "escola" | "agf";
export type UnavailableReason =
  "no_token" | "not_covered" | "budget" | "provider_error";
export type SeriesPoint = {
  // São Paulo date of the session whose close this is.
  date: string;
  // AAAA-MM of a monthly point.
  month: string | null;
  close: number;
  status: "consolidated" | "incomplete";
  source: PriceSource | null;
  // One or more B3 sessions without data come right before this point.
  gapBefore: boolean;
};
export type LatestQuote = {
  price: string;
  checkedAt: string | null;
  freshness: "delayed" | "stale" | "unavailable";
  connect: boolean;
  reason: "gap" | "base_mismatch" | null;
};
export type PriceSeries = {
  ticker: string;
  basis: PriceBasis;
  granularity: PriceGranularity;
  availableBases: PriceBasis[];
  defaultBasis: PriceBasis | null;
  points: SeriesPoint[];
  latestQuote: LatestQuote | null;
  coverage: {
    from: string | null;
    to: string | null;
    segments: { from: string; to: string; source: PriceSource | null }[];
    notes: { code: string | null; text: string }[];
  };
  unavailableReason: UnavailableReason | null;
  checkedAt: string | null;
};

const bases: readonly PriceBasis[] = ["adjusted", "nominal"];
const sources: readonly PriceSource[] = ["brapi", "escola", "agf"];
const reasons: readonly UnavailableReason[] = [
  "no_token",
  "not_covered",
  "budget",
  "provider_error",
];
const isBasis = (value: unknown): value is PriceBasis =>
  bases.includes(value as PriceBasis);
const record = (value: unknown) =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
const sourceOf = (value: unknown) =>
  sources.includes(value as PriceSource) ? (value as PriceSource) : null;

export function validDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function parsePriceSeries(
  input: unknown,
  expected: {
    ticker: string;
    basis: PriceBasis;
    granularity: PriceGranularity;
  },
): PriceSeries {
  const body = record(input);
  if (
    !body ||
    typeof body.ticker !== "string" ||
    body.ticker.toUpperCase() !== expected.ticker
  )
    throw new Error("O histórico recebido não corresponde a esta empresa.");
  const availableBases = bases.filter(
    (basis) =>
      Array.isArray(body.availableBases) && body.availableBases.includes(basis),
  );
  // Closes in date order; a date sent twice with different closes is dropped.
  const byDate = new Map<string, SeriesPoint | null>();
  for (const item of Array.isArray(body.points) ? body.points : []) {
    const point = record(item);
    const close = decimal(point?.close);
    if (!point || !validDay(point.date) || close === null || close <= 0)
      continue;
    const parsed: SeriesPoint = {
      date: point.date,
      month:
        typeof point.month === "string" && /^\d{4}-\d{2}$/.test(point.month)
          ? point.month
          : null,
      close,
      status: point.status === "incomplete" ? "incomplete" : "consolidated",
      source: sourceOf(point.source),
      gapBefore: point.gapBefore === true,
    };
    const previous = byDate.get(point.date);
    byDate.set(
      point.date,
      previous === undefined
        ? parsed
        : previous && previous.close === close
          ? previous
          : null,
    );
  }
  const points = [...byDate.values()]
    .filter((point): point is SeriesPoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = record(body.latestQuote);
  const latestPrice = priceText(latest?.price);
  const coverage = record(body.coverage);
  const notes = coverage?.notes;
  return {
    ticker: expected.ticker,
    basis: isBasis(body.basis) ? body.basis : expected.basis,
    granularity: expected.granularity,
    availableBases,
    defaultBasis: isBasis(body.defaultBasis)
      ? body.defaultBasis
      : (availableBases[0] ?? null),
    points,
    latestQuote:
      latest && latestPrice
        ? {
            price: latestPrice,
            checkedAt: isoTime(latest.checkedAt),
            freshness:
              latest.freshness === "stale"
                ? "stale"
                : latest.freshness === "unavailable"
                  ? "unavailable"
                  : "delayed",
            connect: latest.connect === true,
            reason:
              latest.reason === "gap" || latest.reason === "base_mismatch"
                ? latest.reason
                : null,
          }
        : null,
    coverage: {
      from: validDay(coverage?.from) ? coverage.from : null,
      to: validDay(coverage?.to) ? coverage.to : null,
      segments: (Array.isArray(coverage?.segments) ? coverage.segments : [])
        .map(record)
        .filter(
          (segment): segment is Record<string, unknown> =>
            segment !== null && validDay(segment.from) && validDay(segment.to),
        )
        .map((segment) => ({
          from: segment.from as string,
          to: segment.to as string,
          source: sourceOf(segment.source),
        })),
      // Notes arrive as { code, text }; plain text is accepted as well.
      notes: (Array.isArray(notes) ? notes : [notes]).flatMap((note) => {
        const item = record(note);
        const text = typeof note === "string" ? note : item?.text;
        return typeof text === "string" && text.trim()
          ? [
              {
                code: typeof item?.code === "string" ? item.code : null,
                text: text.trim(),
              },
            ]
          : [];
      }),
    },
    unavailableReason: reasons.includes(
      body.unavailableReason as UnavailableReason,
    )
      ? (body.unavailableReason as UnavailableReason)
      : null,
    checkedAt: isoTime(body.checkedAt),
  };
}

// A company without a series (the route answers 404) reads as not covered.
export function uncoveredSeries(expected: {
  ticker: string;
  basis: PriceBasis;
  granularity: PriceGranularity;
}): PriceSeries {
  return {
    ...expected,
    availableBases: [],
    defaultBasis: null,
    points: [],
    latestQuote: null,
    coverage: { from: null, to: null, segments: [], notes: [] },
    unavailableReason: "not_covered",
    checkedAt: null,
  };
}

export const seriesPeriods = {
  daily: ["5D", "1M", "6M", "1A", "5A", "Máx"],
  monthly: ["6M", "1A", "5A", "Máx"],
} as const;
export type SeriesPeriod = (typeof seriesPeriods.daily)[number];
// A period that makes no sense for the granularity falls back to one year.
export function periodFor(
  granularity: PriceGranularity,
  period: SeriesPeriod,
): SeriesPeriod {
  return (seriesPeriods[granularity] as readonly SeriesPeriod[]).includes(
    period,
  )
    ? period
    : "1A";
}

// The window ends at the last close and goes back the chosen period.
export function selectSeries(points: SeriesPoint[], period: SeriesPeriod) {
  if (period === "5D") return points.slice(-5);
  if (period === "Máx" || !points.length) return points;
  const last = new Date(points.at(-1)!.date + "T00:00:00Z");
  const months =
    period === "1M" ? 1 : period === "6M" ? 6 : period === "1A" ? 12 : 60;
  const day = last.getUTCDate();
  last.setUTCDate(1);
  last.setUTCMonth(last.getUTCMonth() - months);
  const monthEnd = new Date(
    Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0),
  ).getUTCDate();
  last.setUTCDate(Math.min(day, monthEnd));
  const start = last.toISOString().slice(0, 10);
  return points.filter((point) => point.date >= start);
}

export type SeriesMarker = {
  price: number;
  checkedAt: string | null;
  stale: boolean;
  connect: boolean;
};
export type PlotRow = {
  key: string;
  time: number;
  kind: "point" | "gap" | "latest";
  date: string | null;
  month: string | null;
  price: number | null;
  status: SeriesPoint["status"] | null;
  source: PriceSource | null;
  gapFrom: string | null;
  gapTo: string | null;
  latest: number | null;
  connector: number | null;
  ceiling: number | null;
};

const day = 86_400_000;
const empty = {
  date: null,
  month: null,
  price: null,
  status: null,
  source: null,
  gapFrom: null,
  gapTo: null,
  latest: null,
  connector: null,
} as const;

// Chart rows: a null row breaks the line where sessions are missing, and the
// latest quote is a row of its own, joined by a dashed line only on request.
export function seriesPlot(
  points: SeriesPoint[],
  { ceiling, marker }: { ceiling: number | null; marker: SeriesMarker | null },
): PlotRow[] {
  const rows: PlotRow[] = [];
  points.forEach((point, index) => {
    const time = Date.parse(point.date);
    const previous = points[index - 1];
    if (point.gapBefore && previous)
      rows.push({
        ...empty,
        key: "gap-" + point.date,
        kind: "gap",
        time: (Date.parse(previous.date) + time) / 2,
        gapFrom: previous.date,
        gapTo: point.date,
        ceiling,
      });
    rows.push({
      ...empty,
      key: point.date,
      kind: "point",
      time,
      date: point.date,
      month: point.month,
      price: point.close,
      status: point.status,
      source: point.source,
      ceiling,
    });
  });
  if (!marker) return rows;
  const last = rows.at(-1);
  const quoteDay = marker.checkedAt ? saoPauloDay(marker.checkedAt) : null;
  const time = Math.max(
    quoteDay ? Date.parse(quoteDay) : (last?.time ?? 0) + day,
    last?.time ?? -Infinity,
  );
  const connect = marker.connect && last?.kind === "point";
  if (connect && last)
    rows[rows.length - 1] = { ...last, connector: last.price };
  rows.push({
    ...empty,
    key: "latest",
    kind: "latest",
    time,
    date: quoteDay,
    latest: marker.price,
    connector: connect ? marker.price : null,
    ceiling,
  });
  return rows;
}

export function seriesSummary(points: SeriesPoint[]) {
  if (!points.length) return null;
  const closes = points.map((point) => point.close);
  const first = closes[0];
  const last = closes.at(-1)!;
  return {
    first,
    last,
    min: Math.min(...closes),
    max: Math.max(...closes),
    change: closes.length > 1 ? last / first - 1 : null,
    from: points[0].date,
    to: points.at(-1)!.date,
  };
}

export const basisLabels: Record<PriceBasis, string> = {
  adjusted: "Ajustado por proventos",
  nominal: "Sem ajuste",
};
export const basisDescriptions: Record<PriceBasis, string> = {
  adjusted:
    "Base: ajustada por proventos e por eventos (desdobramento, grupamento e bonificação), pela metodologia da brapi.dev.",
  nominal: "Base: sem ajuste, com o preço negociado em cada pregão.",
};
export const sourceLabels: Record<PriceSource, string> = {
  brapi: "brapi.dev",
  escola: "fechamentos consolidados pela Escola do Dividendo",
  agf: "AGF, no trecho com o preço negociado",
};
export const unavailableMessages: Record<
  UnavailableReason | "empty" | "error" | "invalid",
  string
> = {
  no_token:
    "O histórico de preços desta ação ainda não está disponível: o acesso atual à brapi.dev cobre só algumas ações.",
  not_covered: "A brapi.dev não oferece o histórico de preços desta ação.",
  budget:
    "O limite diário de consultas à brapi.dev foi atingido. O histórico volta a ser consultado mais tarde.",
  provider_error:
    "A brapi.dev não respondeu agora. O histórico será consultado de novo mais tarde.",
  empty: "Ainda não há fechamentos nesta base para esta ação.",
  error: "Não foi possível carregar o histórico de preços.",
  invalid: "Histórico de preços indisponível para este código.",
};

export const dateText = (date: string | null) =>
  date ? date.split("-").reverse().join("/") : "Não informada";
export const monthText = (month: string | null) =>
  month ? month.split("-").reverse().join("/") : "Não informado";
// "dados até 24/09": an incomplete month lacks its last session in the series.
export const incompleteText = (date: string | null) =>
  `mês incompleto, dados até ${dateText(date).slice(0, 5)}`;

export function markerTitle(
  marker: Pick<SeriesMarker, "checkedAt" | "stale">,
  now: number = Date.now(),
) {
  return (
    "Cotação mais recente — preço nominal de mercado" +
    (marker.checkedAt
      ? `, consultada ${consultedAt(marker.checkedAt, now)}`
      : "") +
    (marker.stale ? " (defasada)" : "")
  );
}

export function coverageText(coverage: PriceSeries["coverage"]) {
  const segments = coverage.segments.map(
    (segment) =>
      `${segment.source ? sourceLabels[segment.source] : "fonte não informada"} de ${dateText(segment.from)} a ${dateText(segment.to)}`,
  );
  return segments.length
    ? `Fontes: ${segments.join("; ")}.`
    : coverage.from && coverage.to
      ? `Fechamentos de ${dateText(coverage.from)} a ${dateText(coverage.to)}.`
      : "";
}

// Tooltip of one chart row: São Paulo date, value, basis, status and source.
export function rowTooltip(
  row: PlotRow,
  series: { basis: PriceBasis; granularity: PriceGranularity },
  options: { ceiling: boolean; marker: SeriesMarker | null; now?: number },
) {
  const lines: [string, string][] = [];
  const ceiling =
    options.ceiling && row.ceiling !== null
      ? ([["Preço-teto", quoteMoney(row.ceiling)]] as [string, string][])
      : [];
  if (row.kind === "gap")
    return {
      title: "Lacuna sem dados",
      lines: [
        [
          "Período",
          `sem fechamentos entre ${dateText(row.gapFrom)} e ${dateText(row.gapTo)}`,
        ],
        ...ceiling,
      ] as [string, string][],
    };
  if (row.kind === "latest") {
    lines.push([
      "Cotação",
      row.latest === null ? "Não informada" : quoteMoney(row.latest),
    ]);
    lines.push(["Base", "nominal, sem ajuste"]);
    lines.push(["Status", options.marker?.stale ? "defasada" : "mais recente"]);
    lines.push(["Fonte", "brapi.dev"]);
    return {
      title: markerTitle(
        options.marker ?? { checkedAt: null, stale: false },
        options.now,
      ),
      lines: [...lines, ...ceiling],
    };
  }
  lines.push([
    "Fechamento",
    row.price === null ? "Não informado" : quoteMoney(row.price),
  ]);
  lines.push(["Base", basisLabels[series.basis].toLocaleLowerCase("pt-BR")]);
  lines.push([
    "Status",
    row.status === "incomplete" ? incompleteText(row.date) : "consolidado",
  ]);
  lines.push([
    "Fonte",
    row.source ? sourceLabels[row.source] : "não informada",
  ]);
  return {
    title:
      series.granularity === "monthly"
        ? `Mês ${monthText(row.month ?? row.date?.slice(0, 7) ?? null)} · pregão de ${dateText(row.date)}`
        : `Pregão de ${dateText(row.date)}`,
    lines: [...lines, ...ceiling],
  };
}
