export type DividendMetricKey =
  | 'totalShares' | 'marketValue' | 'estimatedNetIncome' | 'projectedPE'
  | 'averagePE10Years' | 'peDeviation' | 'earningsCagr5Years' | 'netDebtToEbitda'
  | 'estimatedEps' | 'expectedPayout' | 'projectedGrossDividendPerShare'
  | 'estimatedGrossDividendYield' | 'referencePrice' | 'ceilingPrice' | 'safetyMargin'
  | 'announcementFrequency' | 'announcementMonths' | 'updatedOn';
export type DividendAnalysis = Record<DividendMetricKey, string | null>;
export type DividendColumnKey = DividendMetricKey | 'companyName' | 'ticker' | 'sector';
export type DividendFormat = 'text' | 'quantity' | 'currency' | 'number' | 'percent' | 'percentInteger' | 'date';
export const dividendColumns: readonly Readonly<{
  key: DividendColumnKey;
  label: string;
  format: DividendFormat;
  ranking: boolean;
}>[];
export function dividendValue(entry: {
  companyName: string;
  ticker: string;
  sector: string | null;
  dividendAnalysis?: DividendAnalysis | null;
}, key: DividendColumnKey): string | null | undefined;
export function formatDividendValue(value: string | null | undefined, format: DividendFormat): string;
