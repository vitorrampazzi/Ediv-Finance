export const lessons = [
  {
    id: "ranking",
    title: "Como interpretar uma previsão",
    text: "Uma previsão descreve um cenário dependente de premissas. Preço-alvo é o preço que o autor estima em um prazo; potencial é uma variação estimada, não a probabilidade de acontecer. Leia tese, riscos, data e horizonte em conjunto. Um ranking organiza opiniões e não determina o que você deve comprar.",
    question: "O que diferencia potencial estimado de probabilidade de lucro?",
    choices: [
      "São a mesma medida",
      "Potencial é uma variação de preço; probabilidade é a chance de um evento",
      "Potencial é lucro já recebido",
    ],
    answer: 1,
    explanation:
      "Uma projeção de 20% não diz que há 20% de chance de lucro. É indispensável entender as premissas e as incertezas.",
  },
  {
    id: "risco",
    title: "Risco, diversificação e prazo",
    text: "O preço de um ativo pode cair e permanecer abaixo do custo de compra. Distribuir investimentos entre exposições diferentes pode reduzir a concentração, mas não elimina perdas. Prazo, liquidez, custos e capacidade de suportar oscilações influenciam uma decisão. Setores diferentes também podem responder ao mesmo risco econômico.",
    question: "Diversificar elimina o risco de perda?",
    choices: [
      "Sim, sempre",
      "Só quando há mais de cinco ativos",
      "Não; pode reduzir concentração, mas não elimina riscos",
    ],
    answer: 2,
    explanation:
      "O número de ativos sozinho não mede diversificação. É necessário entender suas exposições e os riscos compartilhados.",
  },
  {
    id: "dividendos",
    title: "Dividendos e renda",
    text: "Dividendos e juros sobre capital próprio são formas de distribuição de recursos aos acionistas. O valor anunciado e o recebido são informações diferentes. Pagamentos podem variar e não garantem renda constante. Um dividend yield elevado precisa ser entendido no contexto do negócio e do preço; não avalia sozinho a qualidade da empresa.",
    question: "Um pagamento anunciado equivale a dinheiro já recebido?",
    choices: [
      "Não; deve ser acompanhado até o pagamento",
      "Sim, entra imediatamente no saldo",
      "Sim, se o ativo estiver no ranking",
    ],
    answer: 0,
    explanation:
      "No Ediv, eventos anunciados ficam separados dos recebidos. Registre o valor efetivamente recebido, com a data e sua origem.",
  },
  {
    id: "carteira",
    title: "Entendendo os números da carteira",
    text: "Valor de mercado estimado é quantidade registrada multiplicada pela cotação disponível. Custo registrado é a base das operações e custos informados. Resultado não realizado é a diferença entre valor estimado e custo das posições abertas. Resultado realizado considera as vendas. Proventos recebidos são apresentados separadamente. Informações incompletas e eventos corporativos ausentes podem distorcer o acompanhamento.",
    question: "Uma valorização estimada já é lucro recebido?",
    choices: [
      "Sim",
      "Não; o ganho da posição aberta ainda não foi realizado",
      "Somente se a alta passar de 10%",
    ],
    answer: 1,
    explanation:
      "O preço pode mudar antes de uma venda. O valor estimado não é saldo disponível para saque.",
  },
];
export const glossary = [
  [
    "Preço-alvo",
    "Estimativa de preço para um horizonte, baseada nas premissas de uma análise.",
  ],
  [
    "Potencial",
    "Variação estimada entre uma referência de preço e um cenário. Não é probabilidade de lucro.",
  ],
  ["Horizonte", "Prazo considerado pela análise."],
  ["Tese", "Argumentos e premissas que sustentam um cenário."],
  [
    "Liquidez",
    "Facilidade de negociar um ativo sem grandes impactos no preço.",
  ],
  [
    "Dividend yield",
    "Relação entre proventos e um preço de referência em determinado período.",
  ],
  [
    "Desdobramento",
    "Alteração da quantidade de ações e do preço unitário, sem criar riqueza por si só.",
  ],
  [
    "JCP",
    "Juros sobre capital próprio, uma modalidade de remuneração ao acionista.",
  ],
];
