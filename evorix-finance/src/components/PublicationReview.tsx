import { ClipboardCheck } from "lucide-react";
import type { Entry } from "../lib/ranking";
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
}: {
  entries: Entry[];
  metadata: PublicationMetadata;
}) {
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
                    <strong>{item.entry.ticker}</strong>
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
