import { readEntries } from "./research-diff.js";

const metricKeys = [
  "estimatedGrossDividendYield",
  "projectedPE",
  "safetyMargin",
];

export function publicRanking(row) {
  const entries = [...readEntries(row?.entries_json)]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((entry) => ({
      rank: entry.rank,
      ticker: entry.ticker,
      companyName: entry.companyName,
      dividendAnalysis: Object.fromEntries(
        metricKeys.map((key) => [
          key,
          typeof entry.dividendAnalysis?.[key] === "string"
            ? entry.dividendAnalysis[key]
            : null,
        ]),
      ),
    }));
  return {
    id: row ? String(row.id) : null,
    title: row?.title ?? "Ranking de dividendos",
    updatedAt: row?.created_at ?? null,
    totalEntries: entries.length,
    entries,
  };
}
