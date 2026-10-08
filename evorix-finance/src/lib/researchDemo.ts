export type ResearchStory = {
  introduction: string;
  milestones: { stage: string; text: string }[];
  dividendLens: string;
};

// Editorial fixtures belong only to DEMO companies. They are never broker research.
export const researchDemoStories: Record<string, ResearchStory> = {
  DEMO1: {
    introduction:
      "Horizonte Energia é uma empresa inventada para mostrar como uma pesquisa pode conectar a trajetória do negócio, seus resultados e uma previsão. Neste exemplo, ela opera projetos de geração com contratos de longo prazo.",
    milestones: [
      {
        stage: "Origem",
        text: "A história fictícia começa com uma operação regional de geração de energia.",
      },
      {
        stage: "Expansão",
        text: "Novos contratos permitiriam ampliar a operação e diversificar os projetos.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "O exemplo acompanha a entrada dos novos projetos e o custo do financiamento.",
      },
    ],
    dividendLens:
      "Ao estudar uma empresa de energia, observe a geração de caixa após os investimentos, o endividamento e as regras dos contratos. Receita contratada não significa dividendo garantido.",
  },
  DEMO2: {
    introduction:
      "Aurora Serviços é uma companhia fictícia com contratos recorrentes de prestação de serviços. A narrativa demonstra como a qualidade dos contratos e a eficiência podem entrar na análise de um negócio.",
    milestones: [
      {
        stage: "Origem",
        text: "A empresa de exemplo começa atendendo clientes de uma única região.",
      },
      {
        stage: "Expansão",
        text: "A operação ilustrativa passa a atender outras regiões e diferentes segmentos.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "O foco do exemplo está na renovação de contratos e no controle de despesas.",
      },
    ],
    dividendLens:
      "Contratos recorrentes precisam ser avaliados junto com a retenção de clientes, as margens e a conversão do lucro em caixa. O lucro contábil, sozinho, não mostra quanto pode ser distribuído.",
  },
  DEMO3: {
    introduction:
      "Raiz Papel é uma fabricante inventada. Sua história ilustrativa mostra um negócio industrial sujeito a ciclos de demanda, custos de matérias-primas e investimentos em capacidade.",
    milestones: [
      {
        stage: "Origem",
        text: "Uma fábrica regional dá início à trajetória fictícia.",
      },
      {
        stage: "Expansão",
        text: "A companhia do exemplo amplia a capacidade de produção.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "A pesquisa simulada observa a utilização das fábricas e uma possível recuperação da demanda.",
      },
    ],
    dividendLens:
      "Negócios industriais podem atravessar ciclos. Compare lucro e caixa em diferentes períodos, incluindo os investimentos necessários para manter a operação, antes de interpretar um dividendo elevado.",
  },
  DEMO4: {
    introduction:
      "Nexo Tecnologia é uma empresa fictícia que oferece produtos por assinatura. O exemplo apresenta a relação entre receitas recorrentes, investimentos em desenvolvimento e crescimento.",
    milestones: [
      {
        stage: "Origem",
        text: "Um produto inicial marca o começo da história inventada.",
      },
      {
        stage: "Expansão",
        text: "Novos produtos e contratos recorrentes ampliam a operação ilustrativa.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "A hipótese simulada compara o crescimento das receitas com os gastos de desenvolvimento.",
      },
    ],
    dividendLens:
      "Empresas em expansão podem reter parte do lucro para financiar novos produtos. Entenda a política de distribuição e a necessidade de reinvestimento; crescimento e dividendos são dimensões diferentes.",
  },
  DEMO5: {
    introduction:
      "Vereda Consumo é uma varejista inventada. Sua trajetória ilustrativa ajuda a relacionar vendas, estoques e capital de giro com os resultados do negócio.",
    milestones: [
      {
        stage: "Origem",
        text: "A narrativa fictícia começa com uma rede regional de lojas.",
      },
      {
        stage: "Expansão",
        text: "A empresa de exemplo amplia seus canais de venda.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "A hipótese considera uma melhora das vendas e a redução dos estoques.",
      },
    ],
    dividendLens:
      "No consumo, observe se o resultado acompanha a geração de caixa e o movimento dos estoques. Distribuições pontuais não devem ser interpretadas como renda recorrente.",
  },
  DEMO6: {
    introduction:
      "Porto Logística é uma operadora fictícia de infraestrutura logística. O exemplo reúne capacidade instalada, contratos e volume transportado em uma história de negócio.",
    milestones: [
      {
        stage: "Origem",
        text: "Uma operação regional inicia a trajetória inventada.",
      },
      {
        stage: "Expansão",
        text: "A estrutura ilustrativa passa a atender novos clientes e rotas.",
      },
      {
        stage: "Cenário da pesquisa",
        text: "O cenário simulado acompanha a ocupação da capacidade já instalada.",
      },
    ],
    dividendLens:
      "Avalie o caixa após a manutenção da infraestrutura, a concentração de clientes e o endividamento. Uma ocupação maior pode favorecer o negócio, mas não assegura uma distribuição futura.",
  },
};
