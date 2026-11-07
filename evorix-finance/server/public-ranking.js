import { readEntries } from "./research-diff.js";
import {
  canonicalUnavailable,
  isoInstant,
  publicMarketEntry,
} from "./market/ranking-market.js";

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

// Public body with the canonical quote and the dynamic margin of each of the
// three entries (docs/MARGEM-E-HISTORICO.md). The ceiling and the research
// price feed the margin on the server and are never sent. `quotes` is a Map by
// ticker; a missing one is an unavailable quote, so a failed list read still
// answers with the research margin or "unavailable".
export function publicRankingWithMarket(row, { quotes = new Map(), market }) {
  const body = publicRanking(row);
  const research = new Map(
    readEntries(row?.entries_json).map((entry) => [entry.ticker, entry]),
  );
  const publishedAt = isoInstant(row?.created_at);
  return {
    ...body,
    entries: body.entries.map((entry) => ({
      ...entry,
      market: publicMarketEntry(
        research.get(entry.ticker),
        quotes.get(entry.ticker) ?? canonicalUnavailable(entry.ticker),
        publishedAt,
      ),
    })),
    market,
  };
}
