import { Check, Minus } from "lucide-react";
import type { Entry } from "../lib/ranking";
import { getResearchCoverage } from "../lib/researchCoverage";

export function ResearchCoverage({ entry }: { entry: Entry }) {
  const coverage = getResearchCoverage(entry);
  return (
    <details className="mt-5 border-y border-evo-border py-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
        Conteúdo disponível · {coverage.filled}/{coverage.total}
      </summary>
      <p className="mt-1 text-xs leading-5 text-evo-textSec">
        Veja os campos preenchidos nesta versão.
      </p>
      <ul className="mt-4 space-y-3">
        {coverage.fields.map((field) => (
          <li key={field.key} className="flex items-start gap-2 text-xs">
            {field.present ? (
              <Check
                size={14}
                className="shrink-0 text-evo-accent"
                aria-hidden="true"
              />
            ) : (
              <Minus
                size={14}
                className="shrink-0 text-evo-textSec"
                aria-hidden="true"
              />
            )}
            <span>
              {field.label}
              <span className="sr-only">
                : {field.present ? "preenchido" : "não informado"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
