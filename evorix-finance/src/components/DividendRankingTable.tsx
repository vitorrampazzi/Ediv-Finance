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
import type { LiveQuotes } from "../hooks/useLiveQuotes";
import { CompanyLogo } from "./CompanyLogo";
import { LiveQuoteLine } from "./LiveQuote";
import { Tooltip } from "./Tooltip";
import "./dividend-research.css";

// Kept apart from the company page so the ranking list does not load its charts.
export type DividendTableEntry = Pick<
  Entry,
  "rank" | "ticker" | "companyName" | "sector" | "dividendAnalysis"
>;

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
  liveQuotes,
}: {
  entries: DividendTableEntry[];
  researchLink?: (ticker: string) => string;
  complete?: boolean;
  showRank?: boolean;
  // brapi.dev quotes, shown apart; the research price and order never change.
  liveQuotes?: LiveQuotes;
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
      <p id={id} className="dividend-table-hint">
        {complete
          ? "Informações completas da planilha."
          : "Resumo do ranking. Abra uma empresa para consultar as informações completas."}{" "}
        {liveQuotes
          ? "Preço de mercado e margem de segurança são os da pesquisa publicada. A linha “agora” traz a cotação da brapi.dev, com atraso, e não muda a ordem nem a margem."
          : "Preço de mercado de referência da planilha; sem cotação ao vivo."}
        {complete &&
          " Role a tabela na horizontal para consultar todas as colunas."}
      </p>
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
                      (column.key === "referencePrice" && liveQuotes
                        ? " da planilha da pesquisa, em reais (R$). A linha “agora” é a cotação da brapi.dev, com atraso."
                        : column.key === "ceilingPrice"
                          ? ". Premissa histórica da planilha, não uma taxa de mercado atual nem garantia de retorno."
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
                      {column.key === "referencePrice" && liveQuotes ? (
                        <>
                          <span data-research-value>{value}</span>
                          <LiveQuoteLine
                            view={liveQuotes.quoteFor(entry.ticker)}
                          />
                        </>
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
