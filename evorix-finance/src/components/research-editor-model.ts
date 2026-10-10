export const researchFields = [
  ["ticker", "Ticker", 16, true],
  ["empresa", "Empresa", 160, true],
  ["potencial_percentual", "Potencial (%)", 30, true],
  ["preco_alvo", "Preço-alvo (R$)", 30, false],
  ["horizonte_meses", "Horizonte (meses)", 3, false],
  ["setor", "Setor", 120, false],
  ["tese", "Tese do cenário", 2000, false],
  ["riscos", "Riscos", 2000, false],
  ["balanco_patrimonial", "Balanço patrimonial", 5000, false],
  ["dre", "DRE", 5000, false],
  ["fluxo_de_caixa", "Fluxo de caixa", 5000, false],
  ["informacoes_da_empresa", "Informações da empresa", 5000, false],
  ["divida_liquida", "Dívida líquida", 5000, false],
  ["estatisticas", "Estatísticas", 5000, false],
  ["periodo_referencia", "Período de referência", 120, false],
  ["fonte_dados", "Fonte dos dados", 500, false],
] as const;

export type ResearchField = (typeof researchFields)[number][0];
export type ResearchEntryDraft = Record<ResearchField, string>;

export const researchSections: {
  title: string;
  description: string;
  fields: ResearchField[];
}[] = [
  {
    title: "Identificação",
    description:
      "Identifique a empresa e sua atividade. O ticker e o nome são obrigatórios.",
    fields: ["ticker", "empresa", "setor"],
  },
  {
    title: "Cenário",
    description: "Registre a projeção, o prazo e o raciocínio da pesquisa.",
    fields: [
      "potencial_percentual",
      "preco_alvo",
      "horizonte_meses",
      "tese",
      "riscos",
    ],
  },
  {
    title: "Contexto",
    description:
      "Conte a história da empresa e contextualize os indicadores que ajudam a interpretar a pesquisa.",
    fields: ["informacoes_da_empresa", "estatisticas"],
  },
  {
    title: "Financeiros",
    description:
      "Inclua os dados financeiros como texto, com valores, unidades e datas de referência.",
    fields: ["balanco_patrimonial", "dre", "fluxo_de_caixa", "divida_liquida"],
  },
  {
    title: "Fontes",
    description:
      "Informe o período analisado e as fontes consultadas para o leitor contextualizar os dados.",
    fields: ["periodo_referencia", "fonte_dados"],
  },
];

export function emptyResearchEntry(): ResearchEntryDraft {
  return Object.fromEntries(
    researchFields.map(([key]) => [key, ""]),
  ) as ResearchEntryDraft;
}

function decimal(value: string): number | null {
  let text = value
    .trim()
    .replace(/^(R\$|US\$|\$)\s*/i, "")
    .replace(/%$/, "")
    .replace(/\s/g, "");
  if (text.includes(",") && text.includes(".")) {
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else {
    text = text.replace(",", ".");
  }
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

export function researchEntryIssues(
  entry: ResearchEntryDraft,
): { field: ResearchField; message: string }[] {
  const issues: { field: ResearchField; message: string }[] = [];
  const ticker = entry.ticker.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,15}$/.test(ticker)) {
    issues.push({
      field: "ticker",
      message: "Informe um ticker válido, com até 16 caracteres.",
    });
  }
  if (!entry.empresa.trim()) {
    issues.push({ field: "empresa", message: "Informe o nome da empresa." });
  }
  const potential = decimal(entry.potencial_percentual);
  if (potential === null || potential < -100 || potential > 1000) {
    issues.push({
      field: "potencial_percentual",
      message: "Informe o potencial entre -100% e 1000%.",
    });
  }
  if (entry.preco_alvo.trim()) {
    const target = decimal(entry.preco_alvo);
    if (target === null || target <= 0 || target > 1e9) {
      issues.push({
        field: "preco_alvo",
        message: "O preço-alvo deve ser maior que zero e até R$ 1 bilhão.",
      });
    }
  }
  if (entry.horizonte_meses.trim()) {
    const horizon = decimal(entry.horizonte_meses);
    if (
      horizon === null ||
      !Number.isInteger(horizon) ||
      horizon < 1 ||
      horizon > 120
    ) {
      issues.push({
        field: "horizonte_meses",
        message: "O horizonte deve ser um número inteiro de 1 a 120 meses.",
      });
    }
  }
  for (const [key, label, maximum] of researchFields) {
    if (entry[key].length > maximum) {
      issues.push({
        field: key,
        message: `${label} aceita até ${maximum.toLocaleString("pt-BR")} caracteres.`,
      });
    }
  }
  return issues;
}

export function recommendedResearchFields(entry: ResearchEntryDraft): string[] {
  return researchFields
    .filter(
      ([key]) =>
        [
          "tese",
          "riscos",
          "horizonte_meses",
          "periodo_referencia",
          "fonte_dados",
        ].includes(key) && !entry[key].trim(),
    )
    .map(([, label]) => label);
}
