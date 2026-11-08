import { useId } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
  rankingColumns,
} from "../../dividend-analysis.mjs";
import type { Entry } from "../lib/ranking";
import type { DividendColumnKey } from "../../dividend-analysis.mjs";
import type { MarketView } from "../lib/marketData";
import { CompanyLogo } from "./CompanyLogo";
import { MarketMarginCell, MarketPriceCell } from "./LiveQuote";
import { Tooltip } from "./Tooltip";
import "./dividend-research.css";

// Kept apart from the company page so the ranking list does not load its charts.
export type DividendTableEntry = Pick<
  Entry,
  "rank" | "ticker" | "companyName" | "sector" | "dividendAnalysis"
>;
// Market price and dynamic margin of each row, from the shared market data.
export type RankingMarketCells = {
  viewFor: (ticker: string) => MarketView | undefined;
  note: string;
  // The note as it reads with a fresh quote: it holds the note's height.
  noteSizer: string;
};

const tableLabels: Record<DividendColumnKey, string> = {
  companyName: "Empresa",
  ticker: "Código",
  sector: "Setor",
  totalShares: "Total de ações",
  marketValue: "Valor de mercado",
  estimatedNetIncome: "Lucro estimado",
  projectedPE: "P/L projetado",
  averagePE10Years: "P/L médio (10 anos)",
  peDeviation: "Desvio do P/L",
  earningsCagr5Years: "CAGR lucros (5 anos)",
  netDebtToEbitda: "Dívida líq./EBITDA",
  estimatedEps: "LPA estimado",
  expectedPayout: "Payout esperado",
  projectedGrossDividendPerShare: "Dividendo projetado",
  estimatedGrossDividendYield: "DY bruto estimado",
  referencePrice: "Preço de mercado",
  ceilingPrice: "Preço teto",
  safetyMargin: "Margem de segurança",
  announcementFrequency: "Frequência",
  announcementMonths: "Meses de anúncios",
  updatedOn: "Atualização",
};
// Ranking columns stay narrow enough for the seven to fit beside the menu.
const columnWidths: Partial<Record<DividendColumnKey, number>> = {
  companyName: 224,
  ticker: 88,
  sector: 152,
  projectedGrossDividendPerShare: 136,
  ceilingPrice: 136,
  referencePrice: 136,
  projectedPE: 128,
  averagePE10Years: 152,
  netDebtToEbitda: 152,
  safetyMargin: 136,
  announcementMonths: 224,
};

export function DividendRankingTable({
  entries,
  researchLink,
  complete = false,
  showRank = false,
  market,
}: {
  entries: DividendTableEntry[];
  researchLink?: (ticker: string) => string;
  complete?: boolean;
  showRank?: boolean;
  // Without it (publication preview) the cells are the spreadsheet's.
  market?: RankingMarketCells;
}) {
  const id = useId();
  const columns = complete
    ? dividendColumns.filter((column) => column.key !== "updatedOn")
    : rankingColumns;
  const tableWidth = columns.reduce(
    (width, column) => width + (columnWidths[column.key] ?? 176),
    showRank ? 72 : 0,
  );
  return (
    <div
      className="dividend-table"
      style={{ "--dividend-table-width": tableWidth + "px" } as CSSProperties}
    >
      <div className="dividend-table-hint-frame">
        <p id={id} className="dividend-table-hint">
          {complete
            ? "Informações completas da planilha."
            : "Resumo do ranking. Abra uma empresa para consultar as informações completas."}{" "}
          {market
            ? market.note
            : "Preço de mercado de referência da planilha; sem cotação da brapi.dev."}
          {complete &&
            " Role a tabela na horizontal para consultar todas as colunas."}
        </p>
        {market && (
          <p aria-hidden="true" className="dividend-table-hint-sizer">
            Resumo do ranking. Abra uma empresa para consultar as informações
            completas. {market.noteSizer}
          </p>
        )}
      </div>
      <div
        role="region"
        aria-label={
          complete
            ? "Prévia completa de dividendos"
            : "Ranking de Ações por empresa"
        }
        aria-describedby={id}
        tabIndex={0}
        className="dividend-table-region"
      >
        <table>
          <colgroup>
            {showRank && <col style={{ width: 72 }} />}
            {columns.map((column) => (
              <col
                key={column.key}
                style={{
                  width:
                    column.key === "companyName"
                      ? "var(--dividend-company-width)"
                      : (columnWidths[column.key] ?? 176),
                }}
              />
            ))}
          </colgroup>
          <caption className="sr-only">
            {complete ? "Informações completas a publicar" : "Ranking de Ações"}{" "}
            · {columns.length + (showRank ? 1 : 0)} colunas
          </caption>
          <thead>
            <tr>
              {showRank && (
                <th scope="col" data-format="number">
                  Posição
                </th>
              )}
              {columns.map((column) => (
                <th
                  scope="col"
                  key={column.key}
                  data-format={column.format}
                  data-column={column.key}
                >
                  <Tooltip
                    toggleOnClick
                    content={
                      column.label +
                      (column.key === "referencePrice" && market
                        ? " da brapi.dev, em reais (R$). Sem cotação válida, aparece o preço da pesquisa, com a data."
                        : column.key === "safetyMargin" && market
                          ? ": (preço-teto − cotação de mercado) ÷ preço-teto, com duas casas e recalculada a cada cotação. Fica negativa quando a cotação passa do teto e não representa retorno garantido."
                          : column.key === "ceilingPrice"
                            ? ". Premissa histórica da planilha, não uma taxa de mercado atual nem garantia de retorno." +
                              (market ? " Só muda com uma nova análise." : "")
                            : column.format === "currency"
                              ? ". Valor em reais (R$)."
                              : column.format === "quantity"
                                ? ". Quantidade de ações informada na pesquisa."
                                : column.format === "number"
                                  ? ". Múltiplo em vezes."
                                  : column.format.startsWith("percent")
                                    ? ". Percentual informado na pesquisa."
                                    : ". Informação preservada da fonte.")
                    }
                  >
                    <button type="button" className="dividend-header-control">
                      <span>{tableLabels[column.key]}</span>
                      <Info size={13} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.ticker}>
                {showRank && (
                  <td className="font-numbers" data-format="number">
                    {entry.rank}
                  </td>
                )}
                {columns.map((column) => {
                  const value = formatDividendValue(
                    dividendValue(entry, column.key),
                    column.format,
                  );
                  const view =
                    column.key === "referencePrice" ||
                    column.key === "safetyMargin"
                      ? market?.viewFor(entry.ticker)
                      : undefined;
                  return column.key === "companyName" ? (
                    <th scope="row" key={column.key} data-column={column.key}>
                      {researchLink ? (
                        <Link
                          className="dividend-company-link"
                          to={researchLink(entry.ticker)}
                        >
                          <CompanyLogo ticker={entry.ticker} size="sm" />
                          <span>
                            {value}
                            <small aria-hidden="true">{entry.ticker}</small>
                            <span className="sr-only">
                              {" "}
                              · {entry.ticker} · Abrir informações completas
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <span className="company-identity-inline">
                          <CompanyLogo ticker={entry.ticker} size="sm" />
                          <span>
                            {value}
                            <small>{entry.ticker}</small>
                          </span>
                        </span>
                      )}
                    </th>
                  ) : (
                    <td
                      key={column.key}
                      data-format={column.format}
                      data-column={column.key}
                      className={
                        column.format === "text" || column.format === "date"
                          ? undefined
                          : "font-numbers"
                      }
                    >
                      {view && column.key === "referencePrice" ? (
                        <MarketPriceCell view={view} />
                      ) : view ? (
                        <MarketMarginCell view={view} />
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
