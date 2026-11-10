import type { AnnualHistory, AnnualPoint } from "./ranking";

// AGF snapshot. Its price series mixes bases (docs/MARGEM-E-HISTORICO.md), so
// only the dividends are drawn; the prices are still validated with the rest.
export type StockHistory = {
  ticker: string;
  source: { name: "AGF"; url: string; capturedAt: string };
  prices: { date: string; close: number }[];
  dividends: {
    value: number | null;
    type: string | null;
    recordDate: string | null;
    paymentDate: string | null;
  }[];
};
const dividendMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 4,
  maximumFractionDigits: 12,
});
export const formatHistoricalDividend = (value: number | null) =>
  value === null ? "Não informado" : dividendMoney.format(value);

export function validHistoryDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function parseStockHistory(
  input: unknown,
  ticker: string,
): StockHistory {
  const data = input as StockHistory | null;
  if (
    !data ||
    data.ticker !== ticker ||
    data.source?.name !== "AGF" ||
    typeof data.source.url !== "string" ||
    !/^https:\/\//.test(data.source.url) ||
    typeof data.source.capturedAt !== "string" ||
    !validHistoryDate(data.source.capturedAt.slice(0, 10)) ||
    !Number.isFinite(Date.parse(data.source.capturedAt)) ||
    !Array.isArray(data.prices) ||
    !Array.isArray(data.dividends) ||
    !data.prices.every(
      (point, index) =>
        point &&
        validHistoryDate(point.date) &&
        typeof point.close === "number" &&
        Number.isFinite(point.close) &&
        point.close > 0 &&
        (index === 0 || point.date > data.prices[index - 1].date),
    ) ||
    !data.dividends.every(
      (event) =>
        event &&
        (event.value === null ||
          (typeof event.value === "number" && Number.isFinite(event.value))) &&
        (event.type === null || typeof event.type === "string") &&
        (event.recordDate === null || validHistoryDate(event.recordDate)) &&
        (event.paymentDate === null || validHistoryDate(event.paymentDate)),
    )
  ) {
    throw new Error(
      "O histórico recebido não corresponde aos dados aprovados desta empresa.",
    );
  }
  return data;
}

export function groupDividends(
  history: StockHistory,
  mode: "Anual" | "Mensal",
  range: "5A" | "Máx",
) {
  const groups = new Map<
    string,
    { period: string; past: number; future: number; count: number }
  >();
  const collected = history.source.capturedAt.slice(0, 10);
  const firstYear = Number(collected.slice(0, 4)) - 4;
  for (const event of history.dividends) {
    if (
      !validHistoryDate(event.paymentDate) ||
      event.value === null ||
      !Number.isFinite(event.value)
    )
      continue;
    if (range === "5A" && Number(event.paymentDate.slice(0, 4)) < firstYear)
      continue;
    const period = event.paymentDate.slice(0, mode === "Anual" ? 4 : 7);
    const group = groups.get(period) || {
      period,
      past: 0,
      future: 0,
      count: 0,
    };
    group[event.paymentDate > collected ? "future" : "past"] += event.value;
    group.count += 1;
    groups.set(period, group);
  }
  return [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
}

// The AGF types: "Dividendo", "JCP" and the rest (Rendimento, restituição de
// capital, or no type at all) as "Outros".
export const dividendKinds = ["dividend", "jcp", "other"] as const;
export type DividendKind = (typeof dividendKinds)[number];
export const dividendKindLabels: Record<DividendKind, string> = {
  dividend: "Dividendo",
  jcp: "JCP",
  other: "Outros",
};
export function dividendKind(type: string | null): DividendKind {
  const name = (type ?? "").trim().toLocaleLowerCase("pt-BR");
  return name === "dividendo" ? "dividend" : name === "jcp" ? "jcp" : "other";
}

export type DividendTypeRow = Record<DividendKind, number> &
  Record<`${DividendKind}Future`, number> & {
    period: string;
    // Everything paid in the period, past and scheduled.
    total: number;
    scheduled: number;
    count: number;
  };

// Float sums of sub-cent amounts: keep ten places, never invent more.
const tidy = (value: number) => Math.round(value * 1e10) / 1e10;

// Per share and per payment date, like groupDividends, split by type. Events
// after the snapshot date are the scheduled ones.
export function groupDividendsByType(
  history: StockHistory,
  mode: "Anual" | "Mensal",
  range: "5A" | "Máx",
): DividendTypeRow[] {
  const groups = new Map<string, DividendTypeRow>();
  const collected = history.source.capturedAt.slice(0, 10);
  const firstYear = Number(collected.slice(0, 4)) - 4;
  for (const event of history.dividends) {
    if (
      !validHistoryDate(event.paymentDate) ||
      event.value === null ||
      !Number.isFinite(event.value)
    )
      continue;
    if (range === "5A" && Number(event.paymentDate.slice(0, 4)) < firstYear)
      continue;
    const period = event.paymentDate.slice(0, mode === "Anual" ? 4 : 7);
    const group = groups.get(period) || {
      period,
      dividend: 0,
      jcp: 0,
      other: 0,
      dividendFuture: 0,
      jcpFuture: 0,
      otherFuture: 0,
      total: 0,
      scheduled: 0,
      count: 0,
    };
    const kind = dividendKind(event.type);
    if (event.paymentDate > collected) {
      group[`${kind}Future`] += event.value;
      group.scheduled += event.value;
    } else group[kind] += event.value;
    group.total += event.value;
    group.count += 1;
    groups.set(period, group);
  }
  return [...groups.values()]
    .map((group) => {
      const row = { ...group };
      for (const key of [
        ...dividendKinds,
        ...dividendKinds.map((kind) => `${kind}Future` as const),
        "total",
        "scheduled",
      ] as const)
        row[key] = tidy(row[key]);
      return row;
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

const decimalText = /^-?\d+(\.\d+)?$/;
// Valid points of an annual series, by year, in ascending order.
function annualPoints(points: AnnualPoint[] | null | undefined) {
  const years = new Map<number, number>();
  for (const point of Array.isArray(points) ? points : []) {
    if (
      !point ||
      !Number.isInteger(point.year) ||
      typeof point.value !== "string" ||
      !decimalText.test(point.value.trim())
    )
      continue;
    const value = Number(point.value);
    if (Number.isFinite(value) && !years.has(point.year))
      years.set(point.year, value);
  }
  return [...years].sort(([a], [b]) => a - b);
}

// The payout the team informed for the year of each annual bar, in percent.
// Years without bars or without payout stay out: no gap is filled.
export function attachPayout<T extends { period: string }>(
  rows: T[],
  payout: AnnualPoint[] | null | undefined,
) {
  const byYear = new Map(
    annualPoints(payout).map(([year, value]) => [year, tidy(value * 100)]),
  );
  let matched = 0;
  const withPayout = rows.map((row) => {
    const value = /^\d{4}$/.test(row.period)
      ? (byYear.get(Number(row.period)) ?? null)
      : null;
    if (value !== null) matched += 1;
    return { ...row, payout: value };
  });
  return { rows: withPayout, matched, available: byYear.size > 0 };
}

// The last years of net income the publication brings, at most `limit`.
export function netIncomeSeries(
  points: AnnualPoint[] | null | undefined,
  limit = 10,
) {
  return annualPoints(points)
    .slice(-limit)
    .map(([year, value]) => ({ year, period: String(year), value }));
}

const perShare = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const tinyShare = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumSignificantDigits: 3,
});
// R$ per share with 2 to 4 places, as in the contract of the chart. Amounts
// that 4 places would show as zero (old AGF events of R$ 0,0000075) keep three
// significant digits instead of reading as nothing paid.
export const formatDividendPerShare = (value: number) =>
  value !== 0 && Math.abs(value) < 0.00005
    ? tinyShare.format(value)
    : perShare.format(value);
const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatReais = (value: number) => reais.format(value);
const short = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
// Axis label in reais: "2,3 bi", "450 mi", "12 mil".
export function compactReais(value: number) {
  const size = Math.abs(value);
  if (size >= 1e9) return short(value / 1e9) + " bi";
  if (size >= 1e6) return short(value / 1e6) + " mi";
  if (size >= 1e3) return short(value / 1e3) + " mil";
  return short(value);
}
export const formatPayoutPercent = (percent: number) =>
  percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";
// "Fonte: AGF, snapshot de 26/10/2026, agrupado por data de pagamento."
export function dividendSourceNote(history: StockHistory) {
  const [year, month, day] = history.source.capturedAt.slice(0, 10).split("-");
  return `Fonte: AGF, snapshot de ${day}/${month}/${year}, agrupado por data de pagamento.`;
}

// Every informed year as text, for lists: "R$ 2.345.678.900,00" and "45,2%".
// null means the publication does not bring that series.
export function annualHistoryText(history: AnnualHistory | null | undefined) {
  const lines = (
    points: AnnualPoint[] | null | undefined,
    text: (value: number) => string,
  ) => {
    const valid = annualPoints(points);
    return valid.length
      ? valid.map(([year, value]) => ({ year, text: text(value) }))
      : null;
  };
  return {
    netIncome: lines(history?.netIncome, formatReais),
    payout: lines(history?.payout, (value) =>
      formatPayoutPercent(tidy(value * 100)),
    ),
  };
}
