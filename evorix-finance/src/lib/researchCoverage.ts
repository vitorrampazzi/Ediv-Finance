import type { Entry } from "./ranking";

export const researchCoverageFields = [
  ["thesis", "Tese e premissas"],
  ["risks", "Riscos do cenário"],
  ["horizonMonths", "Horizonte"],
  ["companyInformation", "Contexto da empresa"],
  ["statistics", "Estatísticas"],
  ["balanceSheet", "Balanço patrimonial"],
  ["incomeStatement", "DRE"],
  ["cashFlow", "Fluxo de caixa"],
  ["netDebt", "Dívida líquida"],
  ["referencePeriod", "Período dos dados"],
  ["dataSource", "Fonte dos dados"],
] as const;

export function getResearchCoverage(entry: Entry) {
  const fields = researchCoverageFields.map(([key, label]) => ({
    key,
    label,
    present:
      key === "horizonMonths"
        ? entry.horizonMonths !== null && entry.horizonMonths > 0
        : Boolean(entry[key]?.trim()),
  }));
  return {
    fields,
    filled: fields.filter((field) => field.present).length,
    total: fields.length,
    missing: fields.filter((field) => !field.present),
  };
}
