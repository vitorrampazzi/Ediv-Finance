import type { RankingFundamentalData } from "../components/RankingFundamentals";
import type { DividendAnalysis } from "../../dividend-analysis.mjs";
// One year of a series the team types in the research spreadsheet. netIncome
// values are decimal reais; payout values are fractions ("0.452000" = 45,2%).
export type AnnualPoint = { year: number; value: string };
export type AnnualHistory = {
  netIncome: AnnualPoint[] | null;
  payout: AnnualPoint[] | null;
};
export type Entry = RankingFundamentalData & {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string | null;
  dividendAnalysis?: DividendAnalysis | null;
  targetPrice: string | null;
  horizonMonths: number | null;
  thesis: string | null;
  risks: string | null;
  sector: string | null;
  referencePrice?: string;
  revenueHistory?: { period: string; value: number }[];
  // Optional: older publications and the public route do not carry it.
  annualHistory?: AnnualHistory | null;
};
export type Ranking = {
  id: string | null;
  title: string;
  authorName: string | null;
  professionalCategory: string | null;
  professionalRegistration: string | null;
  entries: Entry[];
  updatedAt: string | null;
  sourceFileName: string | null;
  canManage: boolean;
  history: { id: string; title: string; createdAt: string }[];
  access?: "full";
  totalEntries?: number;
};
