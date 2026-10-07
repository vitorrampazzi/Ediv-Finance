import type { AssetType } from "./portfolio";

type PositionInsight = {
  ticker: string;
  assetName: string;
  assetType: AssetType;
  costBasis: string;
  weightPercent: string | null;
  marketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedPnlPercent: string | null;
};
type Contribution = {
  ticker: string;
  assetName: string;
  amount: string;
  percent: string | null;
};
export type PortfolioInsights = {
  asOf: string;
  status: "EMPTY" | "UNPRICED" | "PARTIAL" | "COMPLETE";
  openCostBasis: string;
  quotedCostBasis: string;
  quotedMarketValue: string | null;
  unrealizedPnl: string | null;
  unrealizedPnlPercent: string | null;
  realizedPnl: string;
  receivedIncome: string;
  coverage: {
    pricedPositionCount: number;
    totalPositionCount: number;
    costPercent: string | null;
    stalePositionCount: number;
    unpricedTickers: string[];
  };
  concentration: {
    ticker: string;
    assetName: string;
    costBasis: string;
    weightPercent: string | null;
  } | null;
  biggestGain: Contribution | null;
  biggestLoss: Contribution | null;
  allocation: {
    assetType: AssetType;
    costBasis: string;
    weightPercent: string | null;
  }[];
  positions: PositionInsight[];
  quoteRange: { oldest: string | null; newest: string | null };
};

export function formatPercent(value: string | null, signed = false) {
  if (value === null) return "—";
  const number = Number(value);
  return `${signed && number > 0 ? "+" : ""}${number.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
