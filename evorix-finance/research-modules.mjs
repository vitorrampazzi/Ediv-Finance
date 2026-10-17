export const researchModules = Object.freeze(
  [
    {
      key: "balanceSheet",
      label: "Balanço patrimonial",
      anchor: "pesquisa-balanco",
    },
    { key: "incomeStatement", label: "DRE", anchor: "pesquisa-dre" },
    {
      key: "cashFlow",
      label: "Fluxo de caixa",
      anchor: "pesquisa-fluxo-caixa",
    },
    {
      key: "companyInformation",
      label: "Informações da empresa",
      anchor: "pesquisa-empresa",
    },
    {
      key: "netDebt",
      label: "Dívida líquida",
      anchor: "pesquisa-divida-liquida",
    },
    {
      key: "statistics",
      label: "Estatísticas",
      anchor: "pesquisa-estatisticas",
    },
  ].map(Object.freeze),
);

export function hasResearchModule(entry, key) {
  return (
    researchModules.some((module) => module.key === key) &&
    typeof entry?.[key] === "string" &&
    entry[key].trim().length > 0
  );
}

export function researchModuleAnchor(key) {
  return researchModules.find((module) => module.key === key)?.anchor ?? null;
}

export function researchModuleLink(researchLink, key) {
  const anchor = researchModuleAnchor(key);
  return anchor ? `${researchLink.split("#")[0]}#${anchor}` : researchLink;
}
