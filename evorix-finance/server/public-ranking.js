import { dividendColumns } from "../dividend-analysis.mjs";
import { readEntries } from "./research-diff.js";

const metricKeys = dividendColumns.slice(3).map(({ key }) => key);

export function publicRanking(row) {
  const entries = readEntries(row?.entries_json)
    .map((entry) => ({
      rank: entry.rank,
      ticker: entry.ticker,
      companyName: entry.companyName,
      sector: entry.sector ?? null,
      dividendAnalysis: Object.fromEntries(
        metricKeys.map((key) => [
          key,
          typeof entry.dividendAnalysis?.[key] === "string"
            ? entry.dividendAnalysis[key]
            : null,
        ]),
      ),
    }))
    .sort((a, b) => a.rank - b.rank);
  return {
    id: row ? String(row.id) : null,
    title: row?.title ?? "Ranking de dividendos",
    updatedAt: row?.created_at ?? null,
    totalEntries: entries.length,
    entries,
  };
}
