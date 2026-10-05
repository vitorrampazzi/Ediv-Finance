import type { RankingFundamentalData } from "../components/RankingFundamentals";

export type RankingDemoEntry = RankingFundamentalData & {
  rank: number;
  ticker: string;
  companyName: string;
  expectedReturnPercent: string;
  targetPrice: string;
  horizonMonths: number;
  thesis: string;
  risks: string;
  sector: string;
  referencePrice: string;
  revenueHistory: { period: string; value: number }[];
};

const examples = [
  {
    name: "Horizonte Energia",
    sector: "Energia",
    price: 18,
    target: 22.5,
    horizon: 12,
    revenue: 240,
    profit: 48,
    assets: 1600,
    liabilities: 700,
    cash: 120,
    debt: 420,
    operating: 72,
    investing: -35,
    financing: -18,
    thesis:
      "Neste cenário ilustrativo, contratos de longo prazo e novos projetos sustentariam a expansão da receita.",
    risks:
      "Atrasos em projetos, custos de financiamento e mudanças nas regras do setor poderiam reduzir o resultado.",
  },
  {
    name: "Aurora Serviços",
    sector: "Serviços",
    price: 32,
    target: 38.4,
    horizon: 12,
    revenue: 180,
    profit: 27,
    assets: 820,
    liabilities: 300,
    cash: 95,
    debt: 210,
    operating: 42,
    investing: -16,
    financing: -12,
    thesis:
      "O exemplo considera renovação de contratos e maior eficiência operacional, mantendo despesas sob controle.",
    risks:
      "Perda de clientes, pressão sobre preços e dificuldade para contratar profissionais poderiam afetar as margens.",
  },
  {
    name: "Raiz Papel",
    sector: "Indústria",
    price: 12.5,
    target: 15,
    horizon: 24,
    revenue: 310,
    profit: 31,
    assets: 2100,
    liabilities: 950,
    cash: 180,
    debt: 680,
    operating: 64,
    investing: -45,
    financing: -10,
    thesis:
      "A hipótese fictícia combina recuperação da demanda e melhor utilização das fábricas ao longo de dois anos.",
    risks:
      "Oscilações de demanda, custos de matéria-prima e câmbio poderiam contrariar o cenário.",
  },
  {
    name: "Nexo Tecnologia",
    sector: "Tecnologia",
    price: 24,
    target: 30,
    horizon: 24,
    revenue: 125,
    profit: 20,
    assets: 560,
    liabilities: 160,
    cash: 110,
    debt: 140,
    operating: 34,
    investing: -22,
    financing: -5,
    thesis:
      "Neste exemplo, a expansão de receitas recorrentes compensaria os investimentos em novos produtos.",
    risks:
      "Concorrência, custos de desenvolvimento e cancelamentos de contratos poderiam limitar a expansão.",
  },
  {
    name: "Vereda Consumo",
    sector: "Consumo",
    price: 16,
    target: 18.4,
    horizon: 6,
    revenue: 220,
    profit: 22,
    assets: 940,
    liabilities: 440,
    cash: 75,
    debt: 250,
    operating: 38,
    investing: -12,
    financing: -14,
    thesis:
      "O cenário ilustrativo supõe melhora gradual das vendas e redução de estoques sem grandes investimentos adicionais.",
    risks:
      "Demanda fraca, descontos maiores e aumento de despesas poderiam reduzir o lucro do período.",
  },
  {
    name: "Porto Logística",
    sector: "Logística",
    price: 28,
    target: 33.6,
    horizon: 12,
    revenue: 165,
    profit: 33,
    assets: 1300,
    liabilities: 600,
    cash: 90,
    debt: 390,
    operating: 51,
    investing: -28,
    financing: -13,
    thesis:
      "O exemplo projeta maior ocupação da estrutura existente e contratos adicionais, sem assumir novas aquisições.",
    risks:
      "Queda nos volumes, manutenção imprevista e concentração de clientes poderiam afetar o desempenho.",
  },
];

const number = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const millions = (value: number) => "R$ " + number(value) + " milhões";

// Fictional fixtures for the interface only. Never submitted to the publication API.
export const rankingDemoEntries: RankingDemoEntry[] = examples.map(
  (example, index) => ({
    rank: index + 1,
    ticker: "DEMO" + (index + 1),
    companyName: example.name,
    sector: example.sector,
    expectedReturnPercent: ((example.target / example.price - 1) * 100).toFixed(
      1,
    ),
    targetPrice: example.target.toFixed(2),
    referencePrice: example.price.toFixed(2),
    horizonMonths: example.horizon,
    thesis: example.thesis,
    risks: example.risks,
    balanceSheet:
      "Ativos totais: " +
      millions(example.assets) +
      "\nPassivos totais: " +
      millions(example.liabilities) +
      "\nPatrimônio líquido: " +
      millions(example.assets - example.liabilities),
    incomeStatement:
      "Receita líquida: " +
      millions(example.revenue) +
      "\nLucro líquido: " +
      millions(example.profit) +
      "\nMargem líquida: " +
      number((example.profit / example.revenue) * 100) +
      "%",
    cashFlow:
      "Caixa operacional: " +
      millions(example.operating) +
      "\nCaixa de investimentos: " +
      millions(example.investing) +
      "\nCaixa de financiamento: " +
      millions(example.financing) +
      "\nVariação de caixa: " +
      millions(example.operating + example.investing + example.financing),
    companyInformation:
      "Empresa: " +
      example.name +
      " (fictícia)\nSetor: " +
      example.sector +
      "\nCódigo demonstrativo: DEMO" +
      (index + 1) +
      "\nCadastro: exemplo sem CNPJ ou registro real",
    netDebt:
      "Dívida bruta: " +
      millions(example.debt) +
      "\nCaixa e equivalentes: " +
      millions(example.cash) +
      "\nDívida líquida: " +
      millions(example.debt - example.cash),
    statistics:
      "Margem líquida: " +
      number((example.profit / example.revenue) * 100) +
      "%\nReferência simulada: R$ " +
      number(example.price) +
      "\nPreço-alvo simulado: R$ " +
      number(example.target),
    referencePeriod: "3º trimestre de 2026 · cenário fictício",
    dataSource:
      "Exemplo visual criado para a Ediv Finance. Sem dados de mercado.",
    revenueHistory: [0.77, 0.89, 1].map((factor, quarter) => ({
      period: quarter + 1 + "T26",
      value: Math.round(example.revenue * factor),
    })),
  }),
);
