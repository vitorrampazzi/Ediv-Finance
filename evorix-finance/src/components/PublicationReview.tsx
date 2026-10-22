import { ClipboardCheck } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import type { Entry } from "../lib/ranking";
import { dividendColumns, dividendValue } from "../../dividend-analysis.mjs";
import {
  getResearchCoverage,
  researchCoverageFields,
} from "../lib/researchCoverage";

type PublicationMetadata = {
  title: string;
  authorName: string;
  professionalCategory: string;
  professionalRegistration: string;
};

export function PublicationReview({
  entries,
  metadata,
  sourceFileName,
}: {
  entries: Entry[];
  metadata: PublicationMetadata;
  sourceFileName?: string;
}) {
  if (entries.some((entry) => entry.dividendAnalysis)) {
    const missing = entries
      .map((entry) => ({
        entry,
        columns: dividendColumns.filter((column) => {
          const value = dividendValue(entry, column.key);
          return value === null || value === undefined || value === "";
        }),
      }))
      .filter((item) => item.columns.length);
    return (
      <section
        aria-label="Revisão do conteúdo a publicar"
        className="rounded-xl border border-evo-border bg-evo-bgMain p-4"
      >
        <h3 className="font-semibold">Confira antes de publicar</h3>
        <p className="mt-2 text-sm text-evo-textSec">
          {entries.length} empresas com análise de dividendos. O ranking mostra
          11 colunas; as informações completas mostram os 21 campos da planilha.
        </p>
        {sourceFileName && (
          <p className="mt-3 break-words text-sm">Origem: {sourceFileName}</p>
        )}
        {metadata.title.trim() && (
          <p className="mt-2 break-words text-sm">
            Título: {metadata.title.trim()}
          </p>
        )}
        <p className="mt-3 text-sm text-evo-textSec">
          Cotação de referência da planilha, sem atualização ao vivo. Preço teto
          e margem de segurança não são preço-alvo ou potencial de retorno.
        </p>
        {missing.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="min-h-11 cursor-pointer py-3">
              Ver campos não informados · {missing.length} empresas
            </summary>
            <ul>
              {missing.map(({ entry, columns }) => (
                <li key={entry.ticker} className="mt-2 break-words">
                  {entry.ticker}:{" "}
                  {columns.map((column) => column.label).join(" · ")}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-3 text-xs text-evo-textSec">
          Valores ausentes serão apresentados como não informados. Confira os
          números, unidades e datas na prévia; a publicação preserva as versões
          anteriores.
        </p>
      </section>
    );
  }
  const coverage = entries.map((entry) => ({
    entry,
    ...getResearchCoverage(entry),
  }));
  const complete = coverage.filter((item) => !item.missing.length).length;
  const missingFields = researchCoverageFields
    .map(([key, label]) => ({
      label,
      count: coverage.filter((item) =>
        item.missing.some((field) => field.key === key),
      ).length,
    }))
    .filter((field) => field.count > 0);

  return (
    <section
      aria-label="Revisão do conteúdo a publicar"
      className="rounded-xl border border-evo-accent/25 bg-evo-bgMain p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <ClipboardCheck
          size={21}
          className="mt-0.5 shrink-0 text-evo-accent"
          aria-hidden="true"
        />
        <div>
          <h3 className="font-semibold">Confira antes de publicar</h3>
          <p className="mt-2 text-sm leading-6 text-evo-textSec">
            {complete} de {entries.length} pesquisas têm os 11 campos de leitura
            preenchidos. A conferência identifica conteúdo disponível; não
            verifica números nem avalia o investimento.
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 border-y border-evo-border py-4 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-evo-textSec">Título que o leitor verá</dt>
          <dd className="mt-1 break-words font-medium">
            {metadata.title.trim() || "Título não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-evo-textSec">Autoria / categoria / registro</dt>
          <dd className="mt-1 break-words font-medium">
            {metadata.authorName.trim() || "Não informada"} ·{" "}
            {metadata.professionalCategory.trim() || "Não informada"} ·{" "}
            {metadata.professionalRegistration.trim() || "Não informado"}
          </dd>
        </div>
      </dl>
      {missingFields.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold">
            Campos que ainda podem ser completados
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <li
                key={field.label}
                className="rounded-md border border-evo-border px-2.5 py-1.5 text-xs text-evo-textSec"
              >
                {field.label}: {field.count}{" "}
                {field.count === 1 ? "pesquisa" : "pesquisas"}
              </li>
            ))}
          </ul>
          <details className="mt-3 text-xs">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold text-evo-accent">
              Ver pendências por empresa
            </summary>
            <ul className="max-h-56 space-y-3 overflow-y-auto border-t border-evo-border pt-3">
              {coverage
                .filter((item) => item.missing.length > 0)
                .map((item) => (
                  <li key={item.entry.ticker}>
                    <span className="company-identity-inline">
                      <CompanyLogo ticker={item.entry.ticker} size="sm" />
                      <strong>{item.entry.ticker}</strong>
                    </span>
                    <span className="mt-1 block leading-5 text-evo-textSec">
                      {item.missing.map((field) => field.label).join(" · ")}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        </div>
      ) : (
        <p className="mt-4 text-xs text-evo-textSec">
          A estrutura de leitura está preenchida. Revise as premissas, fontes,
          unidades e datas de cada empresa na prévia abaixo.
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-evo-textSec">
        Campos vazios serão apresentados como não informados. Esta publicação
        criará uma nova versão e preservará as anteriores.
      </p>
    </section>
  );
}
