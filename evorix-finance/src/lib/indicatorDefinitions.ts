// One place for what each indicator of the research means. Every screen that
// explains a number (company page, ranking header, summaries) reads from here,
// so the same indicator is never explained in two different ways.
//
// What the product calculates and what it only shows:
// - Safety margin: calculated here, in safety-margin.mjs.
// - Relative P/L difference: calculated in dividend-insights.mjs.
// - Everything else (DY, P/L, payout, ceiling price, EPS…) arrives ready from
//   the research spreadsheet. The site formats it and never recalculates it, so
//   those texts describe the usual definition and say the value is the
//   research's own.
// Pure: unit tests import this file directly in Node.
import { safetyMarginFormula } from "../../safety-margin.mjs";

export type IndicatorHelp = {
  title: string;
  layers: readonly { label: string; text: string }[];
  // Where the number comes from: estimate, quote or history.
  note?: string;
};

const WHAT = "O que é";
const HOW = "Como é calculado";
const READ = "Como ler";
const LIMITS = "Limitações";
const EXAMPLE = "Exemplo";

const fromResearch =
  "Estimativa da pesquisa, na data da pesquisa. O site não recalcula com a cotação.";
const informed = "Dado informado na pesquisa, na data de referência.";

export type IndicatorKey =
  | "marketPrice"
  | "referencePrice"
  | "estimatedGrossDividendYield"
  | "projectedPE"
  | "averagePE10Years"
  | "peDeviation"
  | "ceilingPrice"
  | "safetyMargin"
  | "researchSafetyMargin"
  | "netDebtToEbitda"
  | "estimatedNetIncome"
  | "estimatedEps"
  | "earningsCagr5Years"
  | "expectedPayout"
  | "projectedGrossDividendPerShare"
  | "announcementFrequency"
  | "announcementMonths"
  | "marketValue"
  | "totalShares"
  | "updatedOn"
  | "paidDividends"
  | "annualPayout"
  | "netIncomeHistory"
  | "expectedReturnPercent"
  | "targetPrice"
  | "horizonMonths"
  | "balanceSheet"
  | "incomeStatement"
  | "cashFlow"
  | "companyInformation"
  | "netDebt"
  | "statistics";

export const indicatorHelp: Record<IndicatorKey, IndicatorHelp> = {
  marketPrice: {
    title: "Preço de mercado",
    layers: [
      {
        label: WHAT,
        text: "A cotação da ação na bolsa, consultada na brapi.dev. É a mesma no ranking e na página da empresa.",
      },
      {
        label: READ,
        text: "Ela muda todo dia e não diz se a empresa está melhor ou pior. Serve para comparar com o preço-teto: a margem de segurança usa esta cotação.",
      },
      {
        label: LIMITS,
        text: "Sem cotação válida, aparece o preço da pesquisa, identificado como “da pesquisa”. Se a consulta falhar, o último valor fica marcado como “defasada”.",
      },
    ],
    note: "Cotação de mercado, não estimativa da pesquisa.",
  },
  referencePrice: {
    title: "Preço da pesquisa",
    layers: [
      {
        label: WHAT,
        text: "Preço da ação na planilha, na data da pesquisa; não é a cotação de mercado.",
      },
      {
        label: READ,
        text: "É a base que a equipe usou para calcular o DY, o P/L e a margem da pesquisa. Compare com o preço de mercado para ver quanto a ação andou desde então.",
      },
    ],
    note: informed,
  },
  estimatedGrossDividendYield: {
    title: "Dividend Yield (DY) bruto estimado",
    layers: [
      {
        label: WHAT,
        text: "Quanto a empresa deve pagar em proventos em um ano, em relação ao preço da ação.",
      },
      {
        label: HOW,
        text: "Dividendos projetados por ação divididos pelo preço da pesquisa.",
      },
      {
        label: READ,
        text: "DY de 8% quer dizer R$ 8 brutos por ano para cada R$ 100 investidos. Mais alto não é sempre melhor.",
      },
      {
        label: LIMITS,
        text: "Um DY alto pode vir de um preço que caiu ou de um pagamento extraordinário que não se repete. Olhe o lucro e o payout antes de concluir.",
      },
      {
        label: EXAMPLE,
        text: "Dividendo projetado de R$ 2,00 e preço de R$ 25,00: 2 ÷ 25 = 8%.",
      },
    ],
    note: fromResearch,
  },
  projectedPE: {
    title: "P/L projetado (preço sobre lucro)",
    layers: [
      {
        label: WHAT,
        text: "Quantos reais se paga por cada R$ 1 de lucro anual que a pesquisa projeta para a empresa.",
      },
      {
        label: HOW,
        text: "Preço da pesquisa dividido pelo lucro por ação projetado.",
      },
      {
        label: READ,
        text: "P/L 8 equivale a 8 anos do lucro projetado. Mais baixo indica preço menor em relação ao lucro; compare com a média da própria empresa e com o setor.",
      },
      {
        label: LIMITS,
        text: "Lucro inflado por evento não recorrente derruba o P/L sem a empresa ter melhorado. Com lucro negativo ou perto de zero, o número perde o sentido.",
      },
      {
        label: EXAMPLE,
        text: "Ação a R$ 20,00 e lucro por ação de R$ 2,50: 20 ÷ 2,5 = P/L 8.",
      },
    ],
    note: fromResearch,
  },
  averagePE10Years: {
    title: "P/L médio dos últimos 10 anos",
    layers: [
      {
        label: WHAT,
        text: "A média do P/L da própria empresa nos últimos dez anos, informada na pesquisa.",
      },
      {
        label: READ,
        text: "É a régua histórica: mostra quanto o mercado costumou pagar pelo lucro desta empresa. O P/L projetado acima da média indica preço mais caro que o habitual; abaixo, mais barato.",
      },
      {
        label: LIMITS,
        text: "A média mistura anos bons e ruins e pode estar distorcida por lucros muito baixos. A empresa de hoje pode ser diferente da de dez anos atrás.",
      },
    ],
    note: informed,
  },
  peDeviation: {
    title: "Desvio do P/L em relação à média",
    layers: [
      {
        label: WHAT,
        text: "A distância, em porcentagem, entre o P/L projetado e o P/L médio de dez anos.",
      },
      {
        label: HOW,
        text: "O valor vem pronto da planilha da pesquisa e é mantido como está. A conta usual é P/L projetado ÷ P/L médio − 1.",
      },
      {
        label: READ,
        text: "Negativo: a ação está mais barata que a própria média. Positivo: mais cara. Perto de zero: em linha com o histórico.",
      },
      {
        label: LIMITS,
        text: "Estar abaixo da média não é sinal de compra: o lucro projetado pode não se confirmar.",
      },
      {
        label: EXAMPLE,
        text: "P/L projetado 8 e média 10: 8 ÷ 10 − 1 = −20%.",
      },
    ],
    note: informed,
  },
  ceilingPrice: {
    title: "Preço-teto",
    layers: [
      {
        label: WHAT,
        text: "O preço máximo que a pesquisa considera coerente pagar pela ação, dado o dividendo projetado.",
      },
      {
        label: HOW,
        text: "Pela premissa da planilha, é o preço em que o dividendo projetado por ação renderia 6,81% ao ano: dividendo projetado ÷ 6,81%. A taxa é a referência histórica do Tesouro IPCA+ 2037 registrada na pesquisa, não a taxa de hoje.",
      },
      {
        label: READ,
        text: "Cotação abaixo do teto: há margem de segurança. Acima do teto: a margem fica negativa.",
      },
      {
        label: LIMITS,
        text: "Depende do dividendo projetado, que pode não se confirmar. Só muda quando a equipe publica uma nova análise.",
      },
      {
        label: EXAMPLE,
        text: "Dividendo projetado de R$ 2,50: 2,50 ÷ 0,0681 ≈ R$ 36,71.",
      },
    ],
    note: "Estimativa da pesquisa. Não é preço-alvo nem garantia de retorno.",
  },
  safetyMargin: {
    title: "Margem de segurança",
    layers: [
      {
        label: WHAT,
        text: "O desconto da cotação em relação ao preço-teto da pesquisa: a folga entre o que a ação custa e o máximo que a pesquisa aceitaria pagar.",
      },
      {
        label: HOW,
        text: `${safetyMarginFormula}, recalculada a cada cotação e mostrada com duas casas.`,
      },
      {
        label: READ,
        text: "Positiva: a cotação está abaixo do teto. Zero: está no teto. Fica negativa quando a cotação passa do teto.",
      },
      {
        label: LIMITS,
        text: "Depende do preço-teto, que é uma estimativa. Não representa retorno esperado nem garantia.",
      },
      {
        label: EXAMPLE,
        text: "Teto de R$ 40,00 e cotação de R$ 30,00: (40 − 30) ÷ 40 = 25,00%.",
      },
    ],
    note: "Calculada pelo site com a cotação de mercado e o preço-teto da pesquisa.",
  },
  researchSafetyMargin: {
    title: "Margem da pesquisa",
    layers: [
      {
        label: WHAT,
        text: "Margem informada na planilha, com o preço da pesquisa. É a fotografia do dia em que a análise foi feita.",
      },
      {
        label: READ,
        text: "A margem atual, que acompanha a cotação, fica no topo da página e na seção Cotação. As duas diferem quando o preço mudou desde a pesquisa.",
      },
      {
        label: LIMITS,
        text: "Não representa retorno esperado ou garantia.",
      },
    ],
    note: informed,
  },
  netDebtToEbitda: {
    title: "Dívida líquida / EBITDA",
    layers: [
      {
        label: WHAT,
        text: "Compara a dívida da empresa, já descontado o caixa, com a geração de caixa operacional de um ano (EBITDA: lucro antes de juros, impostos, depreciação e amortização).",
      },
      {
        label: HOW,
        text: "Dívida líquida dividida pelo EBITDA, em vezes. O valor vem pronto da pesquisa.",
      },
      {
        label: READ,
        text: "2x quer dizer que a dívida equivale a cerca de dois anos de EBITDA. Mais baixo indica menos pressão de dívida sobre o resultado e os dividendos.",
      },
      {
        label: LIMITS,
        text: "Valor negativo isolado não comprova caixa líquido: faltam os sinais separados de dívida e EBITDA. Não se aplica a bancos e seguradoras, que não são analisados por EBITDA. Setores de receita regulada, como energia e saneamento, costumam operar com dívida maior.",
      },
      {
        label: EXAMPLE,
        text: "Dívida líquida de R$ 6 bi e EBITDA de R$ 3 bi: 6 ÷ 3 = 2x.",
      },
    ],
    note: informed,
  },
  estimatedNetIncome: {
    title: "Lucro líquido estimado",
    layers: [
      {
        label: WHAT,
        text: "O lucro total que a pesquisa estima para a empresa, depois de custos, juros e impostos.",
      },
      {
        label: READ,
        text: "É de onde saem os dividendos. O que importa é a evolução: lucro que cresce de forma consistente sustenta proventos; lucro que oscila muito pede cautela.",
      },
      {
        label: LIMITS,
        text: "É uma estimativa, não um resultado realizado. Vendas de ativos e outros eventos não recorrentes podem inflar o lucro de um ano.",
      },
    ],
    note: "Estimativa da pesquisa, em reais. O histórico realizado, quando informado, fica em Resultados.",
  },
  estimatedEps: {
    title: "Lucro por ação (LPA) estimado",
    layers: [
      {
        label: WHAT,
        text: "A parte do lucro estimado que cabe a cada ação.",
      },
      {
        label: HOW,
        text: "Lucro líquido estimado dividido pela quantidade de ações. O valor vem pronto da pesquisa.",
      },
      {
        label: READ,
        text: "É a base do P/L e do payout: o dividendo por ação sai deste lucro. Compare o LPA com o dividendo projetado para ver quanto é distribuído.",
      },
      {
        label: EXAMPLE,
        text: "Lucro de R$ 1 bilhão e 500 milhões de ações: R$ 2,00 por ação.",
      },
    ],
    note: "Estimativa da pesquisa, em reais por ação.",
  },
  earningsCagr5Years: {
    title: "CAGR dos lucros (5 anos)",
    layers: [
      {
        label: WHAT,
        text: "A taxa composta de crescimento anual dos lucros em cinco anos: o ritmo médio, por ano, que leva do lucro inicial ao final.",
      },
      {
        label: HOW,
        text: "(lucro final ÷ lucro inicial) elevado a (1 ÷ número de anos), menos 1. O valor vem pronto da pesquisa.",
      },
      {
        label: READ,
        text: "Positivo: o lucro cresceu no período. Negativo: encolheu. Crescimento de lucro é o que permite dividendos maiores no longo prazo.",
      },
      {
        label: LIMITS,
        text: "Só olha o primeiro e o último ano; não descreve cada ano isoladamente. Um ano inicial muito fraco ou um final extraordinário distorcem a taxa.",
      },
      {
        label: EXAMPLE,
        text: "Lucro de R$ 100 mi para R$ 161 mi em cinco anos: cerca de 10% ao ano.",
      },
    ],
    note: "Dado histórico informado na pesquisa. Não é projeção de crescimento.",
  },
  expectedPayout: {
    title: "Payout esperado",
    layers: [
      {
        label: WHAT,
        text: "A parcela do lucro que a pesquisa espera ver distribuída aos acionistas como proventos.",
      },
      {
        label: HOW,
        text: "Proventos projetados divididos pelo lucro estimado. O valor vem pronto da pesquisa.",
      },
      {
        label: READ,
        text: "60% quer dizer que, de cada R$ 100 de lucro, R$ 60 viram proventos e R$ 40 ficam na empresa. Muito alto deixa pouca folga para investir ou atravessar um ano ruim.",
      },
      {
        label: LIMITS,
        text: "Pode superar 100% quando a empresa distribui mais do que lucrou, o que não se sustenta por muito tempo. É projeção, não distribuição realizada.",
      },
      {
        label: EXAMPLE,
        text: "Lucro por ação de R$ 4,00 e dividendo de R$ 2,40: 2,40 ÷ 4 = 60%.",
      },
    ],
    note: fromResearch,
  },
  projectedGrossDividendPerShare: {
    title: "Dividendo por ação (DPA) bruto projetado",
    layers: [
      {
        label: WHAT,
        text: "Quanto a pesquisa projeta que cada ação receberá em proventos no ano, em valor bruto, antes de eventuais deduções.",
      },
      {
        label: READ,
        text: "É a base do DY e do preço-teto. Multiplique pela quantidade de ações que você tem para estimar o valor bruto do ano.",
      },
      {
        label: LIMITS,
        text: "É uma projeção: o valor pago depende do lucro e da decisão da empresa. Dividendos não são garantidos.",
      },
      {
        label: EXAMPLE,
        text: "DPA de R$ 2,50 e 100 ações: R$ 250,00 brutos no ano, se a projeção se confirmar.",
      },
    ],
    note: "Estimativa da pesquisa. Os proventos já pagos ficam no gráfico de histórico.",
  },
  announcementFrequency: {
    title: "Frequência dos anúncios",
    layers: [
      {
        label: WHAT,
        text: "Com que regularidade a empresa costuma anunciar proventos: mensal, trimestral, semestral ou anual.",
      },
      {
        label: READ,
        text: "Ajuda a organizar o fluxo de renda. Frequência maior não significa pagar mais no ano.",
      },
      {
        label: LIMITS,
        text: "É o hábito observado, sem garantia de eventos futuros.",
      },
    ],
    note: informed,
  },
  announcementMonths: {
    title: "Meses habituais de anúncio",
    layers: [
      {
        label: WHAT,
        text: "Os meses em que a empresa costuma anunciar proventos, segundo a pesquisa.",
      },
      {
        label: LIMITS,
        text: "São meses habituais de anúncio, não datas garantidas de pagamento. A data-com e a data de pagamento só valem depois do anúncio oficial da empresa.",
      },
    ],
    note: informed,
  },
  marketValue: {
    title: "Valor de mercado",
    layers: [
      {
        label: WHAT,
        text: "Quanto vale a empresa inteira na bolsa.",
      },
      {
        label: HOW,
        text: "Preço da ação multiplicado pela quantidade total de ações. O valor vem pronto da pesquisa.",
      },
      {
        label: READ,
        text: "Dá a dimensão do negócio. Empresas maiores e líderes de setor tendem a ter resultados mais estáveis, mas tamanho não é sinônimo de qualidade.",
      },
    ],
    note: "Informado na planilha, na data de referência. Não acompanha a cotação.",
  },
  totalShares: {
    title: "Quantidade total de ações",
    layers: [
      {
        label: WHAT,
        text: "O número de ações em que o capital da empresa está dividido, inclusive frações quando informadas.",
      },
      {
        label: READ,
        text: "É o divisor do lucro e dos proventos por ação. Se a empresa emite ações, o mesmo lucro passa a ser dividido por mais gente.",
      },
    ],
    note: informed,
  },
  updatedOn: {
    title: "Data da pesquisa",
    layers: [
      {
        label: WHAT,
        text: "Data de referência da pesquisa: o dia a que se referem o preço, as estimativas e os indicadores da planilha.",
      },
      {
        label: READ,
        text: "Antes de comparar duas empresas, confira se as datas de referência são as mesmas.",
      },
    ],
  },
  paidDividends: {
    title: "Proventos pagos por ação",
    layers: [
      {
        label: WHAT,
        text: "O que cada ação recebeu em cada período, somado pela data de pagamento. Dividendo e JCP (juros sobre capital próprio) são as duas formas mais comuns de remuneração; “Outros” reúne rendimentos e restituições de capital.",
      },
      {
        label: READ,
        text: "Procure regularidade ao longo dos anos. Um ano muito acima dos outros costuma indicar pagamento extraordinário, que não se repete.",
      },
      {
        label: LIMITS,
        text: "Barras hachuradas são pagamentos já agendados, com data depois da coleta dos dados. O JCP tem imposto de renda retido na fonte: o valor líquido que chega à conta é menor que o valor bruto anunciado pela empresa. Histórico não garante pagamentos futuros.",
      },
    ],
    note: "Dado histórico, diferente do dividendo projetado pela pesquisa.",
  },
  annualPayout: {
    title: "Payout anual",
    layers: [
      {
        label: WHAT,
        text: "A parcela do lucro de cada ano que foi distribuída aos acionistas, informada pela equipe na publicação.",
      },
      {
        label: READ,
        text: "Um payout estável ao longo dos anos sugere uma política de distribuição consistente. Acima de 100%, a empresa distribuiu mais do que lucrou naquele ano.",
      },
    ],
    note: "Dado histórico informado pela equipe. O payout esperado é a estimativa para frente.",
  },
  netIncomeHistory: {
    title: "Lucro líquido por ano",
    layers: [
      {
        label: WHAT,
        text: "O lucro líquido da empresa em cada ano, informado pela equipe na publicação. Mostra até os dez anos mais recentes.",
      },
      {
        label: READ,
        text: "É o centro da análise: lucro que cresce e pouco oscila sustenta dividendos consistentes. Barras em vermelho são anos de prejuízo.",
      },
      {
        label: LIMITS,
        text: "Um ano fora da curva pode refletir evento não recorrente. Anos sem informação não são preenchidos.",
      },
    ],
    note: "Dado histórico, diferente do lucro líquido estimado.",
  },
  expectedReturnPercent: {
    title: "Potencial (%)",
    layers: [
      {
        label: WHAT,
        text: "Compara o preço-alvo com um preço de referência, em percentual. Positivo indica preço-alvo acima da referência; negativo, abaixo.",
      },
      {
        label: HOW,
        text: "O valor vem da pesquisa. O site exibe o número informado e não o recalcula.",
      },
      {
        label: LIMITS,
        text: "Depende das premissas do preço-alvo e não garante retorno.",
      },
    ],
    note: fromResearch,
  },
  targetPrice: {
    title: "Preço-alvo (R$)",
    layers: [
      {
        label: WHAT,
        text: "É uma estimativa do preço da ação, construída com premissas sobre a empresa e o mercado.",
      },
      {
        label: READ,
        text: "É a base do potencial (%) da pesquisa, que o compara com um preço de referência.",
      },
      {
        label: LIMITS,
        text: "Muda se as premissas mudarem. É uma estimativa, não uma garantia de preço futuro.",
      },
    ],
    note: fromResearch,
  },
  horizonMonths: {
    title: "Horizonte (meses)",
    layers: [
      {
        label: WHAT,
        text: "É o prazo, em meses, considerado para o cenário da pesquisa.",
      },
      {
        label: READ,
        text: "Serve para ler o preço-alvo e o potencial dentro do mesmo prazo.",
      },
    ],
    note: informed,
  },
  balanceSheet: {
    title: "Balanço patrimonial",
    layers: [
      {
        label: WHAT,
        text: "Apresenta ativos, obrigações e patrimônio líquido da empresa em uma data.",
      },
      {
        label: READ,
        text: "Confira o período e as unidades da pesquisa antes de comparar valores.",
      },
    ],
    note: informed,
  },
  incomeStatement: {
    title: "DRE",
    layers: [
      {
        label: WHAT,
        text: "Apresenta receitas, despesas e resultado de um período.",
      },
      {
        label: READ,
        text: "Lucro contábil e dinheiro em caixa são medidas diferentes.",
      },
    ],
    note: informed,
  },
  cashFlow: {
    title: "Fluxo de caixa",
    layers: [
      {
        label: WHAT,
        text: "Mostra entradas e saídas de caixa relacionadas à operação, aos investimentos e ao financiamento.",
      },
      {
        label: READ,
        text: "Caixa e lucro contábil são medidas diferentes; compare as duas para entender a geração de caixa.",
      },
    ],
    note: informed,
  },
  companyInformation: {
    title: "Informações da empresa",
    layers: [
      {
        label: WHAT,
        text: "Reúne informações sobre a empresa, sua atividade e seu contexto.",
      },
      {
        label: READ,
        text: "Confira a fonte e a data de referência antes de usar a informação.",
      },
    ],
    note: informed,
  },
  netDebt: {
    title: "Dívida líquida",
    layers: [
      {
        label: WHAT,
        text: "Relaciona as dívidas consideradas na pesquisa com o caixa e equivalentes disponíveis.",
      },
      {
        label: READ,
        text: "A definição pode variar; confira a metodologia do autor antes de comparar com outras fontes.",
      },
    ],
    note: informed,
  },
  statistics: {
    title: "Estatísticas",
    layers: [
      {
        label: WHAT,
        text: "Reúne indicadores e medidas usados na pesquisa.",
      },
      {
        label: READ,
        text: "Compare períodos, unidades e critérios equivalentes.",
      },
    ],
    note: informed,
  },
};

/** One sentence, for places with no room for the layers. */
export const indicatorSummary = (key: IndicatorKey) =>
  indicatorHelp[key].layers[0].text;

/** The whole explanation as plain text (search, tests, long descriptions). */
export const indicatorText = (key: IndicatorKey) => {
  const { title, layers, note } = indicatorHelp[key];
  return [title, ...layers.map((layer) => `${layer.label}: ${layer.text}`), note]
    .filter(Boolean)
    .join(" ");
};

const identity: Record<string, string> = {
  companyName:
    "nome da companhia. Abra a empresa para consultar a pesquisa completa.",
  ticker: "código de negociação da ação na bolsa (B3).",
  sector: "setor em que a empresa atua, como informado na pesquisa.",
};

const formatHints: Record<string, string> = {
  currency: "Valor em reais (R$), informado na pesquisa.",
  quantity: "Quantidade informada na pesquisa.",
  number: "Múltiplo em vezes, informado na pesquisa.",
  percent: "Percentual informado na pesquisa.",
  percentInteger: "Percentual informado na pesquisa.",
};

/**
 * Help of a column of the research table. `label` is the column name as the
 * spreadsheet writes it, kept as the title so the reader can match both.
 * `market` says the table shows the brapi.dev quote and the dynamic margin;
 * without it (publication preview) price and margin are the spreadsheet's.
 */
export function columnHelp(
  column: { key: string; label: string; format: string },
  market: boolean,
): string | IndicatorHelp {
  if (identity[column.key]) return `${column.label}: ${identity[column.key]}`;
  const key: IndicatorKey | null =
    column.key === "referencePrice"
      ? market
        ? "marketPrice"
        : "referencePrice"
      : column.key === "safetyMargin"
        ? market
          ? "safetyMargin"
          : "researchSafetyMargin"
        : column.key in indicatorHelp
          ? (column.key as IndicatorKey)
          : null;
  if (!key)
    return `${column.label}. ${formatHints[column.format] ?? "Informação preservada da fonte."}`;
  return { ...indicatorHelp[key], title: column.label };
}

// Banks and insurers are not read through EBITDA or net debt: raising and
// lending money is their business. Brokers ("corretora de seguros") are
// ordinary service companies and keep the indicator.
export function isFinancialSector(sector: string | null | undefined) {
  const text = (sector ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/corretor/.test(text)) return false;
  return /\bbanc|\bsegur(o|os|adora|adoras|idade)\b|ressegur|previdencia/.test(
    text,
  );
}

// Analytics (open_indicator_help) receives only the indicator's group from the
// closed list in analytics-policy.mjs, never a ticker, a value or a free text.
const analyticsGroups: Partial<Record<IndicatorKey, string>> = {
  estimatedGrossDividendYield: "dividend_yield",
  projectedPE: "pl",
  averagePE10Years: "pl",
  peDeviation: "pl",
  expectedPayout: "payout",
  annualPayout: "payout",
  safetyMargin: "safety_margin",
  researchSafetyMargin: "safety_margin",
  ceilingPrice: "ceiling_price",
  expectedReturnPercent: "upside",
  estimatedNetIncome: "net_income",
  netIncomeHistory: "net_income",
  netDebtToEbitda: "net_debt",
  netDebt: "net_debt",
  projectedGrossDividendPerShare: "dividends_per_share",
  paidDividends: "dividends_per_share",
  marketPrice: "quote",
  referencePrice: "quote",
};
// columnHelp copies a help object with another title; the layers stay shared.
const keyByLayers = new Map(
  (Object.keys(indicatorHelp) as IndicatorKey[]).map((key) => [
    indicatorHelp[key].layers,
    key,
  ]),
);

/** Group of an indicator help (by key or by help object), or null. */
export function indicatorAnalyticsName(content: unknown): string | null {
  const key =
    typeof content === "string"
      ? Object.prototype.hasOwnProperty.call(indicatorHelp, content)
        ? (content as IndicatorKey)
        : null
      : content && typeof content === "object" && "layers" in content
        ? (keyByLayers.get((content as IndicatorHelp).layers) ?? null)
        : null;
  return key ? (analyticsGroups[key] ?? "other") : null;
}

export const notApplicableToSector = "Não se aplica ao setor";
export const netDebtNotApplicable =
  "Bancos e seguradoras não são analisados por dívida líquida e EBITDA: captar e aplicar recursos é a própria atividade dessas empresas. A pesquisa não informa este indicador para esta empresa.";
