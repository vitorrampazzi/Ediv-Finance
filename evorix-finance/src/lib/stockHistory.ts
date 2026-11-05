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
export const historyPeriods = ["5D", "1M", "6M", "1A", "5A", "Máx"] as const;
export type HistoryPeriod = (typeof historyPeriods)[number];
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

export function selectPrices(
  prices: StockHistory["prices"],
  period: HistoryPeriod,
) {
  if (period === "5D") return prices.slice(-5);
  if (period === "Máx" || !prices.length) return prices;
  const last = new Date(prices.at(-1)!.date + "T00:00:00Z");
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
  return prices.filter((point) => point.date >= start);
}

// Daily closes from /api/market/history (brapi.dev), dates already in São Paulo.
export type LiveHistory = {
  symbol: string;
  available: boolean;
  reason: string | null;
  // Last valid answer served while brapi.dev is failing.
  stale?: boolean;
  points: { date: string; close: string | number | null }[];
};
export type HistoryExtension =
  | "extended"
  | "loading"
  | "unavailable"
  | "no_token"
  | "not_covered"
  | "budget"
  | "provider_error"
  | "range_not_in_plan"
  | "empty"
  | "no_new_points"
  | "no_overlap"
  | "mismatch";
// The junction is checked on the latest common sessions; older adjusted
// closes may legitimately drift with dividends paid since then.
export const historyOverlapDays = 5;
export const historyTolerance = 0.005;
const serverReasons = new Set<HistoryExtension>([
  "no_token",
  "not_covered",
  "budget",
  "provider_error",
  "range_not_in_plan",
]);

// Appends only brapi closes dated after the packaged snapshot, and only when
// the latest common dates agree within 0.5%. Never invents or repeats a date.
export function mergeLiveHistory(
  snapshot: StockHistory["prices"],
  live: LiveHistory | null,
  options: { openSession?: string | null } = {},
): {
  prices: StockHistory["prices"];
  extension: HistoryExtension;
  snapshotEnd: string | null;
  liveEnd: string | null;
  added: number;
} {
  const snapshotEnd = snapshot.at(-1)?.date ?? null;
  const keep = (extension: HistoryExtension) => ({
    prices: snapshot,
    extension,
    snapshotEnd,
    liveEnd: null,
    added: 0,
  });
  if (!live) return keep("unavailable");
  if (!live.available || !Array.isArray(live.points))
    return keep(
      serverReasons.has(live.reason as HistoryExtension)
        ? (live.reason as HistoryExtension)
        : "unavailable",
    );
  // A date with conflicting closes is dropped, like in the packaged history.
  const byDate = new Map<string, number | null>();
  for (const point of live.points) {
    const close =
      typeof point?.close === "number"
        ? point.close
        : typeof point?.close === "string" &&
            /^\d+(\.\d+)?$/.test(point.close.trim())
          ? Number(point.close)
          : NaN;
    if (
      !validHistoryDate(point?.date) ||
      !Number.isFinite(close) ||
      close <= 0 ||
      // The session still trading has no close yet.
      (options.openSession && point.date >= options.openSession)
    )
      continue;
    byDate.set(
      point.date,
      byDate.has(point.date) && byDate.get(point.date) !== close ? null : close,
    );
  }
  const points = [...byDate]
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length || !snapshotEnd) return keep("empty");
  const liveEnd = points.at(-1)!.date;
  const after = points.filter((point) => point.date > snapshotEnd);
  if (!after.length) return { ...keep("no_new_points"), liveEnd };
  const snapshotClose = new Map(
    snapshot.map((point) => [point.date, point.close]),
  );
  const common = points
    .filter((point) => snapshotClose.has(point.date))
    .slice(-historyOverlapDays);
  if (!common.length) return { ...keep("no_overlap"), liveEnd };
  const agree = common.every((point) => {
    const reference = snapshotClose.get(point.date)!;
    return Math.abs(point.close - reference) / reference <= historyTolerance;
  });
  if (!agree) return { ...keep("mismatch"), liveEnd };
  return {
    prices: [...snapshot, ...after],
    extension: "extended",
    snapshotEnd,
    liveEnd,
    added: after.length,
  };
}

export function pricePlot(
  prices: StockHistory["prices"],
  reference: number | null,
  ceiling: number | null,
) {
  const rows: {
    date: string;
    time: number;
    price: number | null;
    reference: number | null;
    ceiling: number | null;
  }[] = [];
  prices.forEach((point, index) => {
    const time = Date.parse(point.date);
    if (index && time - Date.parse(prices[index - 1].date) > 7 * 86400000) {
      // A null separator breaks the drawing across long gaps; it is not an observation.
      rows.push({
        date: "Lacuna sem observação",
        time: Date.parse(prices[index - 1].date) + 86400000,
        price: null,
        reference,
        ceiling,
      });
    }
    rows.push({
      date: point.date,
      time,
      price: point.close,
      reference,
      ceiling,
    });
  });
  return rows;
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
