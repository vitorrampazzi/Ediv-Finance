import type { RankingFundamentalData } from "../components/RankingFundamentals";
export type Entry = RankingFundamentalData & {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string;
  targetPrice: string | null;
  horizonMonths: number | null;
  thesis: string | null;
  risks: string | null;
  sector: string | null;
  referencePrice?: string;
  revenueHistory?: { period: string; value: number }[];
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
