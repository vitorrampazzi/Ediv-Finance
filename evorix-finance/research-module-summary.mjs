import { hasResearchModule } from "./research-modules.mjs";

const demoLabels = {
  balanceSheet: ["Ativos totais", "Patrimônio líquido"],
  incomeStatement: ["Receita líquida", "Lucro líquido"],
  cashFlow: ["Caixa operacional", "Variação de caixa"],
  companyInformation: ["Setor", "Código demonstrativo"],
  netDebt: ["Dívida líquida", "Dívida bruta"],
  statistics: ["Margem líquida", "Referência simulada"],
};

/** Derive the table from the published/detail text; never synthesize values. */
export function researchModuleSummary(entry, key, demo = false) {
  if (!hasResearchModule(entry, key)) return [];
  const lines = entry[key]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!demo) {
    return lines.slice(0, 2).map((value) => ({
      label: null,
      value: value.length > 180 ? `${value.slice(0, 180).trimEnd()}…` : value,
    }));
  }
  const parsed = lines.map((line) => {
    const separator = line.indexOf(":");
    return separator > 0 && line.slice(separator + 1).trim()
      ? {
          label: line.slice(0, separator).trim(),
          value: line.slice(separator + 1).trim(),
        }
      : { label: null, value: line };
  });
  const preferred = demoLabels[key].flatMap((label) => {
    const item = parsed.find((line) => line.label === label);
    return item ? [item] : [];
  });
  return preferred.length ? preferred : parsed.slice(0, 2);
}
