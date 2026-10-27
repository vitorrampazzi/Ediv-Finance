import { createContext, useContext } from "react";
import type { StockHistoryState } from "../../hooks/useStockHistory";
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

// The current publication supplies snapshots, not authorized historical series.
export type PricePoint = {
  label: string;
  full: string;
  price: number;
  teto: number;
  justo: number;
};
export const priceHistory: PricePoint[] = [];
export type DividendPoint = {
  period: string;
  realizado: number;
  projetado: number;
  anterior?: number;
  dy?: number;
  status: "realizado" | "projetado";
};
export const dividendsAnnual: DividendPoint[] = [];
export const dividendsMonthly: DividendPoint[] = [];
export type ResultPoint = {
  period: string;
  estimado: boolean;
  receita: number;
  lucro: number;
  ebitda: number;
  lpaR: number;
  lpaE: number;
  divEbitda: number | null;
};
export const results: ResultPoint[] = [];
export const cagrSeries: { period: string; real: number; trend: number }[] = [];
export const performanceHistory: {
  label: string;
  full: string;
  acao: number;
  ibov: number;
  cdi: number;
  ifix: number;
}[] = [];
export const periodKeys = ["1D", "5D", "1M", "6M", "1A", "5A", "Máx"];
export const perfPeriods = ["6M", "1A", "3A", "5A"];
export const perfSeriesMeta = [
  { key: "acao", label: "Ação", color: "var(--fmk-teal)", dash: "" },
  { key: "ibov", label: "Ibovespa", color: "var(--fmk-amber)", dash: "" },
  { key: "cdi", label: "CDI", color: "var(--fmk-lilac)", dash: "5 4" },
  { key: "ifix", label: "IFIX", color: "var(--fmk-steel)", dash: "2 3" },
];
export const explanations: Partial<Record<DividendColumnKey, string>> = {
  projectedPE: "Preço em relação ao lucro estimado por ação, em vezes.",
  averagePE10Years: "Média dos últimos dez anos informada na pesquisa.",
  peDeviation:
    "Desvio do P/L informado na planilha, preservado sem substituir por outro cálculo.",
  referencePrice:
    "Cotação de referência na data da pesquisa; não é preço ao vivo.",
  ceilingPrice:
    "Preço teto da fonte. Premissa histórica de yield de 6,81% do Tesouro IPCA+ 2037 com juros semestrais, não taxa de mercado atual.",
  safetyMargin:
    "Margem e arredondamento informados na fonte; não representa retorno esperado ou garantia.",
  netDebtToEbitda:
    "Relação em vezes. Valor negativo isolado não comprova caixa líquido: faltam os sinais separados de dívida e EBITDA.",
  estimatedNetIncome:
    "Lucro líquido total estimado, em reais, sem tratá-lo como resultado realizado.",
  estimatedEps: "Lucro por ação estimado, em reais por ação.",
  earningsCagr5Years:
    "Taxa composta de crescimento anual dos lucros em cinco anos; não descreve cada ano isoladamente.",
  expectedPayout:
    "Parcela esperada do lucro a distribuir. Pode superar 100%; não é distribuição realizada.",
  projectedGrossDividendPerShare:
    "Dividendo bruto projetado por ação, antes de eventuais deduções.",
  estimatedGrossDividendYield:
    "Dividend Yield bruto estimado da fonte, em relação à cotação de referência.",
  announcementFrequency:
    "Frequência habitual de anúncios, sem garantia de eventos futuros.",
  announcementMonths:
    "Meses habituais de anúncio, não datas garantidas de pagamento.",
  marketValue: "Valor de mercado informado na planilha, na data de referência.",
  totalShares:
    "Quantidade total de ações, inclusive frações quando informadas.",
  updatedOn: "Data de referência da pesquisa.",
};

export const axisProps = {
  tick: { fill: "var(--fmk-dim)", fontSize: 11, fontFamily: "DM Mono" },
  axisLine: { stroke: "var(--fmk-line)" },
  tickLine: false as const,
};
export const gridProps = {
  stroke: "var(--fmk-line-soft)",
  vertical: false as const,
};
