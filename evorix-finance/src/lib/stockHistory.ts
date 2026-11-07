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
