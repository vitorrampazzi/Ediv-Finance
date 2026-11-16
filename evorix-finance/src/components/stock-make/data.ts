import { createContext, useContext } from "react";
import type { StockHistoryState } from "../../hooks/useStockHistory";
import type { MarketView } from "../../lib/marketData";
import type { Entry } from "../../lib/ranking";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../../dividend-analysis.mjs";
import type { DividendColumnKey } from "../../../dividend-analysis.mjs";
import {
  dividendNumber,
  dividendComparison,
  dividendAnnouncementMonths,
} from "../../../dividend-insights.mjs";
import {
  indicatorHelp,
  type IndicatorHelp,
} from "../../lib/indicatorDefinitions";

export { dividendColumns, dividendAnnouncementMonths };
export type { DividendColumnKey };
export const num = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n)
    ? "Não informado"
    : n.toLocaleString("pt-BR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
export const brl = (n: number | null | undefined) =>
  formatDividendValue(
    n == null || !Number.isFinite(n) ? null : String(n),
    "currency",
  );
// The research stores percentages as fractions; 1 means 100%.
export const pct = (n: number | null | undefined, d = 1, sign = false) =>
  n == null || !Number.isFinite(n)
    ? "Não informado"
    : (sign && n > 0 ? "+" : "") + num(n * 100, d) + "%";
export function makeStockData(entry: Entry) {
  const raw = (key: DividendColumnKey) => dividendValue(entry, key);
  const value = (key: DividendColumnKey) =>
    formatDividendValue(
      raw(key),
      dividendColumns.find((c) => c.key === key)!.format,
    );
  const number = (key: DividendColumnKey) => dividendNumber(raw(key));
  const market = number("marketValue"),
    shares = number("totalShares"),
    profit = number("estimatedNetIncome");
  return {
    entry,
    raw,
    value,
    number,
    company: {
      name: entry.companyName,
      short: entry.companyName,
      ticker: entry.ticker,
      sector: entry.sector || "Atuação não informada",
      price: number("referencePrice"),
      teto: number("ceilingPrice"),
      lpa: number("estimatedEps"),
      dpa: number("projectedGrossDividendPerShare"),
      plProj: number("projectedPE"),
      plMed: number("averagePE10Years"),
      payout: number("expectedPayout"),
      sharesBi: shares === null ? null : shares / 1e9,
      updated: value("updatedOn"),
    },
    marginSeg: number("safetyMargin"),
    dy: number("estimatedGrossDividendYield"),
    plDev: number("peDeviation"),
    cagrLucro: number("earningsCagr5Years"),
    marketCapBi: market === null ? null : market / 1e9,
    profitEst: profit === null ? null : profit / 1e9,
    priceDifference: dividendComparison(
      raw("referencePrice"),
      raw("ceilingPrice"),
    ),
    peDifference: dividendComparison(
      raw("projectedPE"),
      raw("averagePE10Years"),
    ),
    months: dividendAnnouncementMonths(raw("announcementMonths")),
  };
}
export type StockData = ReturnType<typeof makeStockData>;
export const StockContext = createContext<StockData | null>(null);
export const StockHistoryContext = createContext<StockHistoryState | null>(
  null,
);
export function useHistory() {
  const history = useContext(StockHistoryContext);
  if (!history) throw new Error("StockMake requires its history context");
  return history;
}
export function useStockData() {
  const data = useContext(StockContext);
  if (!data) throw new Error("StockMake requires its research context");
  return data;
}
// Market price and dynamic margin, the same the ranking shows.
export type StockMarket = {
  view: MarketView;
};
export const StockMarketContext = createContext<StockMarket | null>(null);
export function useStockMarket() {
  const market = useContext(StockMarketContext);
  if (!market) throw new Error("StockMake requires its market context");
  return market;
}

// What each field means: one module for every screen (indicatorDefinitions).
export const explanations: Partial<Record<DividendColumnKey, IndicatorHelp>> = {
  projectedPE: indicatorHelp.projectedPE,
  averagePE10Years: indicatorHelp.averagePE10Years,
  peDeviation: indicatorHelp.peDeviation,
  referencePrice: indicatorHelp.referencePrice,
  ceilingPrice: indicatorHelp.ceilingPrice,
  // The spreadsheet margin; the dynamic one is in the header and in "Cotação".
  safetyMargin: indicatorHelp.researchSafetyMargin,
  netDebtToEbitda: indicatorHelp.netDebtToEbitda,
  estimatedNetIncome: indicatorHelp.estimatedNetIncome,
  estimatedEps: indicatorHelp.estimatedEps,
  earningsCagr5Years: indicatorHelp.earningsCagr5Years,
  expectedPayout: indicatorHelp.expectedPayout,
  projectedGrossDividendPerShare: indicatorHelp.projectedGrossDividendPerShare,
  estimatedGrossDividendYield: indicatorHelp.estimatedGrossDividendYield,
  announcementFrequency: indicatorHelp.announcementFrequency,
  announcementMonths: indicatorHelp.announcementMonths,
  marketValue: indicatorHelp.marketValue,
  totalShares: indicatorHelp.totalShares,
  updatedOn: indicatorHelp.updatedOn,
};

export const axisProps = {
  tick: {
    fill: "var(--fmk-dim)",
    fontSize: 11,
    fontFamily: "Instrument Sans, sans-serif",
  },
  axisLine: { stroke: "var(--fmk-line)" },
  tickLine: false as const,
};
export const gridProps = {
  stroke: "var(--fmk-line-soft)",
  vertical: false as const,
};
