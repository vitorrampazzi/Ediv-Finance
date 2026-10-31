import { useId, useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
import type { Entry, Ranking } from "../lib/ranking";
import type { DividendColumnKey } from "../../dividend-analysis.mjs";
import { CompanyLogo } from "./CompanyLogo";
import { Tooltip } from "./Tooltip";
import "./dividend-research.css";
import { StockMake } from "./stock-make/StockMake";
export type DividendTableEntry = Pick<
  Entry,
  "rank" | "ticker" | "companyName" | "sector" | "dividendAnalysis"
>;

const tableLabels: Record<DividendColumnKey, string> = {
  companyName: "Empresa",
  ticker: "Código",
  sector: "Atuação",
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
  projectedGrossDividendPerShare: "DPA bruto projetado",
  estimatedGrossDividendYield: "DY bruto estimado",
  referencePrice: "Cotação de referência",
  ceilingPrice: "Preço teto",
  safetyMargin: "Margem de segurança",
  announcementFrequency: "Frequência",
  announcementMonths: "Meses de anúncios",
  updatedOn: "Atualização",
};
const columnWidths: Partial<Record<DividendColumnKey, number>> = {
  companyName: 224,
  ticker: 104,
  sector: 176,
  projectedPE: 128,
  averagePE10Years: 152,
  netDebtToEbitda: 152,
  safetyMargin: 152,
  announcementMonths: 224,
};

export function DividendRankingTable({
  entries,
  researchLink,
  complete = false,
  showRank = false,
}: {
  entries: DividendTableEntry[];
  researchLink?: (ticker: string) => string;
  complete?: boolean;
  showRank?: boolean;
}) {
  const id = useId();
  const columns = dividendColumns.filter(
    (column) => column.key !== "updatedOn" && (complete || column.ranking),
  );
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
          : "Resumo da aba Ranking. Abra uma empresa para consultar as informações completas."}{" "}
        Cotação de referência da planilha; sem cotação ao vivo. Role a tabela na
        horizontal para consultar todas as colunas.
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
            {complete
              ? "Informações completas a publicar"
              : "Ranking de Ações"}{" "}
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
                    content={
                      column.label +
                      (column.key === "ceilingPrice"
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
                      {value}
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

export function DividendCompanyResearch({
  entry,
  backLink,
  previous,
  next,
  companyLink,
}: {
  entry: Entry;
  ranking: Ranking;
  backLink: ReactNode;
  previous?: Entry;
  next?: Entry;
  companyLink: (ticker: string) => string;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(
    () => title.current?.focus({ preventScroll: true }),
    [entry.ticker],
  );
  return (
    <article
      id="pagina-conteudo"
      className="dividend-company -mx-4 -mt-4 md:-mx-8 md:-mt-10"
    >
      <StockMake entry={entry} titleRef={title} backLink={backLink} />
      <div className="mx-auto max-w-[1280px] px-5 pb-10 md:px-10">
        <nav
          aria-label="Outras pesquisas desta publicação"
          className="grid gap-3 sm:grid-cols-2"
        >
          {[
            { entry: previous, label: "Pesquisa anterior", Icon: ArrowLeft },
            { entry: next, label: "Próxima pesquisa", Icon: ArrowRight },
          ].map(
            ({ entry: item, label, Icon }) =>
              item && (
                <Link
                  key={label}
                  to={companyLink(item.ticker)}
                  className="flex min-h-16 min-w-0 items-center gap-3 rounded-lg border border-evo-border p-4 hover:border-evo-accent"
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-evo-textSec">
                      {label}
                    </span>
                    <span className="mt-1 block break-words">
                      {item.ticker} · {item.companyName}
                    </span>
                  </span>
                  <CompanyLogo ticker={item.ticker} size="sm" />
                </Link>
              ),
          )}
        </nav>
      </div>
    </article>
  );
}
