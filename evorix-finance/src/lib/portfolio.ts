import { apiRequest } from "./api";
import type { PortfolioInsights } from "./portfolioInsights";
export type AssetType =
  "ACAO" | "FII" | "ETF" | "RENDA_FIXA" | "CRYPTO" | "OUTRO";
export type Quote = {
  source: string;
  marketTime: string | null;
  stale?: boolean;
  unavailable?: boolean;
};
export type Position = {
  ticker: string;
  assetName: string;
  assetType: AssetType;
  quantity: string;
  costBasis: string;
  averageCost: string;
  currentPrice: string | null;
  marketValue: string | null;
  unrealizedPnl: string | null;
  quote: Quote | null;
};
export type PortfolioTransaction = {
  id: string;
  side: "BUY" | "SELL";
  ticker: string;
  assetName: string;
  assetType: AssetType;
  quantity: string;
  unitPrice: string;
  fees: string;
  tradedAt: string;
};
export type PortfolioData = {
  insights?: PortfolioInsights;
  positions: Position[];
  transactions: PortfolioTransaction[];
  transactionCount: number;
  historyPage: number;
  historyPages: number;
  transactionHistoryTruncated: boolean;
};

export const typeLabels: Record<AssetType, string> = {
  ACAO: "Ações",
  FII: "FIIs",
  ETF: "ETFs",
  RENDA_FIXA: "Renda fixa",
  CRYPTO: "Criptoativos",
  OUTRO: "Outro",
};
export const integerFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});
export const fetchPortfolio = (historyPage = 1) =>
  apiRequest<PortfolioData>(`/api/portfolio?historyPage=${historyPage}`);
export const localToday = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export function formatQuantity(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const decimals = fraction.replace(/0+$/, "");
  return `${integerFormat.format(BigInt(whole))}${decimals ? `,${decimals}` : ""}`;
}

export function formatDate(value: string) {
  return value.slice(0, 10).split("-").reverse().join("/");
}
