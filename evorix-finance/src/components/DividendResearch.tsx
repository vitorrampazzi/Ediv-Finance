import { useId, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../../dividend-analysis.mjs";
import type { Entry, Ranking } from "../lib/ranking";
import { CompanyLogo } from "./CompanyLogo";
import "./dividend-research.css";

export function DividendRankingTable({
  entries,
  researchLink,
  complete = false,
}: {
  entries: Entry[];
  researchLink?: (ticker: string) => string;
  complete?: boolean;
}) {
  const id = useId();
  const columns = complete
    ? dividendColumns
    : dividendColumns.filter((column) => column.ranking);
  const dates = [
    ...new Set(
      entries.map((entry) => entry.dividendAnalysis?.updatedOn).filter(Boolean),
    ),
  ];
  return (
    <div className="dividend-table">
      <p id={id} className="dividend-table-hint">
        {complete
          ? "Informações completas da planilha."
          : "Resumo da aba Ranking. Abra uma empresa para consultar as informações completas."}{" "}
        Cotação de referência da planilha
        {dates.length === 1
          ? " em " + formatDividendValue(dates[0], "date")
          : ", na data de atualização de cada empresa"}
        ; sem cotação ao vivo. Role a tabela na horizontal para consultar todas
        as colunas.
      </p>
      <div
        role="region"
        aria-label={
          complete
            ? "Prévia completa de dividendos"
            : "Ranking de dividendos por empresa"
        }
        aria-describedby={id}
        tabIndex={0}
        className="dividend-table-region"
      >
        <table>
          <caption className="sr-only">
            {complete
              ? "Informações completas a publicar"
              : "Ranking de dividendos"}{" "}
            · {columns.length} colunas
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.ticker}>
                {columns.map((column) => {
                  const value = formatDividendValue(
                    dividendValue(entry, column.key),
                    column.format,
                  );
                  return column.key === "companyName" ? (
                    <th scope="row" key={column.key}>
                      {researchLink ? (
                        <Link
                          className="dividend-company-link"
                          to={researchLink(entry.ticker)}
                        >
                          <CompanyLogo ticker={entry.ticker} size="sm" />
                          <span>
                            {value}
                            <span className="sr-only">
                              {" "}
                              · {entry.ticker} · Abrir informações completas
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <span className="company-identity-inline">
                          <CompanyLogo ticker={entry.ticker} size="sm" />
                          {value}
                        </span>
                      )}
                    </th>
                  ) : (
                    <td
                      key={column.key}
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
  ranking,
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
      className="dividend-company mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10"
    >
      {backLink}
      <header className="my-6 sm:my-10">
        <p className="text-sm text-evo-textSec">
          Análise de dividendos · {entry.ticker}
        </p>
        <div className="company-identity mt-3">
          <CompanyLogo ticker={entry.ticker} size="lg" loading="eager" />
          <h1
            ref={title}
            tabIndex={-1}
            className="display-title min-w-0 break-words text-3xl sm:text-5xl"
          >
            {entry.companyName}
          </h1>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-evo-textSec">
          Cotação de referência da planilha em{" "}
          {formatDividendValue(entry.dividendAnalysis?.updatedOn, "date")}. Não
          é uma cotação ao vivo. O preço teto usa yield de 6,81%, taxa do
          Tesouro IPCA+ 2037 com juros semestrais indicada na planilha.
        </p>
      </header>
      <section aria-labelledby="dividend-information">
        <h2 id="dividend-information" className="text-xl font-semibold">
          Informações completas
        </h2>
        <dl className="dividend-information mt-4">
          {dividendColumns.map((column) => (
            <div key={column.key}>
              <dt>{column.label}</dt>
              <dd
                className={
                  column.format === "text" || column.format === "date"
                    ? undefined
                    : "font-numbers"
                }
              >
                {formatDividendValue(
                  dividendValue(entry, column.key),
                  column.format,
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        className="my-7 border-y border-evo-border py-5 text-sm"
        aria-label="Origem dos dados"
      >
        <h2 className="font-semibold">Sobre esta publicação</h2>
        <p className="mt-2 break-words">{ranking.title}</p>
        {ranking.sourceFileName && (
          <p className="mt-2 break-words text-evo-textSec">
            Origem: {ranking.sourceFileName}
          </p>
        )}
        {ranking.authorName && (
          <p className="mt-2">Responsável: {ranking.authorName}</p>
        )}
        <p className="mt-3 text-evo-textSec">
          Valores e estimativas informados na planilha. Preço teto e margem de
          segurança não representam preço-alvo ou retorno garantido.
        </p>
      </section>
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
    </article>
  );
}
