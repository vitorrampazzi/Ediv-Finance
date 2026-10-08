export const lessons = [
  {
    id: "ranking",
    title: "Como interpretar uma previsão",
    text: "Uma previsão descreve um cenário dependente de premissas. O ranking é um ponto de partida para conhecer a pesquisa: antes do percentual, entenda a empresa, o raciocínio do autor e o prazo considerado.",
    sections: [
      {
        title: "O que o número está dizendo?",
        text: "Preço-alvo é uma estimativa para um horizonte. Potencial é a diferença percentual entre esse preço e a referência da análise. Nenhum dos dois informa a chance de o cenário acontecer. Uma projeção de 20% não significa uma probabilidade de 20% de lucro.",
      },
      {
        title: "Leia a tese e o que pode contrariá-la",
        text: "Identifique o que precisaria acontecer com receita, custos, margens ou investimentos para sustentar o cenário. Depois procure os riscos: concorrência, dívida, dependência de poucos clientes ou mudanças na demanda. Uma boa leitura inclui os motivos pelos quais a estimativa pode não se concretizar.",
      },
      {
        title: "Compare informações da mesma natureza",
        text: "Confira a data de referência, o horizonte e se a projeção trata de preço, dividendos ou retorno total. Um número de valorização não inclui automaticamente proventos, custos e impostos. Pesquisas com prazos ou metodologias diferentes não são comparáveis apenas pela posição no ranking.",
      },
    ],
    takeaways: [
      "Potencial de preço não é probabilidade de lucro.",
      "Leia tese, riscos, data e horizonte juntos.",
      "O ranking organiza pesquisa; a posição não determina uma compra.",
    ],
    question: "O que diferencia potencial estimado de probabilidade de lucro?",
    choices: [
      "São a mesma medida",
      "Potencial é uma variação de preço; probabilidade é a chance de um evento",
      "Potencial é lucro já recebido",
    ],
    answer: 1,
    explanation:
      "Uma projeção de 20% não diz que há 20% de chance de lucro. É indispensável entender as premissas e as incertezas.",
    sources: [
      {
        title: "Portal do Investidor — o que são ações",
        url: "https://www.gov.br/investidor/pt-br/investir/tipos-de-investimentos/acoes",
      },
    ],
  },
  {
    id: "risco",
    title: "Riscos do negócio e do cenário",
    text: "A ação representa participação em uma empresa. Para compreender uma previsão de dividendos, é necessário conhecer como esse negócio ganha dinheiro e por que os resultados podem mudar.",
    sections: [
      {
        title: "Comece pelo funcionamento da empresa",
        text: "Pergunte quais produtos ou serviços geram receita, quem compra e quais custos têm maior peso. Pense nas condições que poderiam favorecer ou prejudicar esse modelo. Empresas do mesmo setor podem ter dívidas, contratos e necessidades de investimento muito diferentes.",
      },
      {
        title: "Separe os riscos",
        text: "Há riscos próprios do negócio, como perda de um contrato ou dificuldade operacional, e fatores que atingem várias empresas, como juros e atividade econômica. Ter exposição a empresas diferentes pode reduzir concentração, mas não elimina perdas nem torna os resultados previsíveis.",
      },
      {
        title: "O prazo muda a pergunta",
        text: "Um resultado trimestral fraco pode ter causa temporária ou indicar uma deterioração mais duradoura. Procure a explicação nos relatórios e compare períodos coerentes. Uma tese deve ser revisitada quando as premissas mudam; uma queda de preço, sozinha, não prova oportunidade nem invalida uma análise.",
      },
    ],
    takeaways: [
      "Conheça a origem da receita e os principais custos.",
      "Empresas diferentes podem compartilhar o mesmo risco.",
      "Observe mudanças nas premissas, não apenas no preço.",
    ],
    question: "Diversificar elimina o risco de perda?",
    choices: [
      "Sim, sempre",
      "Só quando há mais de cinco ativos",
      "Não; pode reduzir concentração, mas não elimina riscos",
    ],
    answer: 2,
    explanation:
      "O número de ativos sozinho não mede diversificação. É necessário entender suas exposições e os riscos compartilhados.",
    sources: [
      {
        title: "B3 — análise fundamentalista e demonstrativos",
        url: "https://borainvestir.b3.com.br/objetivos-financeiros/tudo-sobre-a-analise-fundamentalista-no-mundo-dos-investimentos/",
      },
    ],
  },
  {
    id: "dividendos",
    title: "Dividendos, yield e calendário",
    text: "Dividendos são distribuições de resultados aos acionistas. O pagamento depende das condições do negócio e das decisões anunciadas pela companhia. Dividendos passados não asseguram renda constante no futuro.",
    sections: [
      {
        title: "Dividend yield: percentual com contexto",
        text: "O dividend yield relaciona o provento por ação de um período a um preço de referência. Sempre confira o período e se o valor é histórico ou projetado. Uma queda do preço ou um pagamento extraordinário pode elevar o indicador sem melhorar a capacidade recorrente da empresa de pagar dividendos.",
      },
      {
        title: "Exemplo para entender a fórmula",
        text: "Em um exemplo fictício, R$ 2,00 distribuídos por ação e um preço de referência de R$ 40,00 produzem um DY de 5%. Esse percentual descreve a relação entre os dois números escolhidos; não representa uma promessa para o próximo período nem o retorno total da ação.",
      },
      {
        title: "Anúncio, data-com, data-ex e pagamento",
        text: "O comunicado informa o valor e o calendário. A data-com é a referência de elegibilidade anunciada: a partir da data-ex, novas compras não dão direito àquela distribuição. O dinheiro é pago na data indicada, que é diferente dessas datas de negociação. Consulte o comunicado específico da empresa para confirmar o evento.",
      },
    ],
    takeaways: [
      "DY alto precisa de contexto e de um período definido.",
      "Data-com, data-ex e pagamento têm funções diferentes.",
      "Valor anunciado não é dinheiro já recebido.",
    ],
    question: "Um pagamento anunciado equivale a dinheiro já recebido?",
    choices: [
      "Não; deve ser acompanhado até o pagamento",
      "Sim, entra imediatamente no saldo",
      "Sim, se o ativo estiver no ranking",
    ],
    answer: 0,
    explanation:
      "Anúncio e pagamento são momentos distintos. Consulte o calendário do comunicado e confirme o crédito na instituição responsável.",
    sources: [
      {
        title: "B3 — como calcular o dividend yield",
        url: "https://borainvestir.b3.com.br/objetivos-financeiros/investir-melhor/dividend-yield-o-que-e-e-como-calcular/",
      },
      {
        title: "B3 — data-ex",
        url: "https://borainvestir.b3.com.br/glossario/data-ex/",
      },
    ],
  },
  {
    // Historical ID retained only for compatibility with saved quiz progress.
    id: "carteira",
    title: "Lucro, caixa e sustentabilidade",
    text: "Uma empresa pode apresentar lucro sem transformar todo esse resultado em dinheiro disponível. Estudar dividendos exige acompanhar o negócio, os investimentos necessários e a origem dos recursos distribuídos.",
    sections: [
      {
        title: "Lucro e caixa respondem perguntas diferentes",
        text: "A demonstração de resultados reúne receitas e despesas do período. A demonstração de fluxos de caixa evidencia entradas e saídas de dinheiro, separadas em atividades operacionais, de investimento e de financiamento. Olhar as duas ajuda a entender por que lucro contábil e geração de caixa podem divergir.",
      },
      {
        title: "Payout: quanto do lucro foi distribuído?",
        text: "Em uma leitura simplificada, payout é o valor distribuído dividido pelo lucro líquido do período. Se uma empresa fictícia lucrou R$ 100 milhões e distribuiu R$ 50 milhões, o payout é de 50%. Confira a base usada e a política da companhia; com lucro zero ou negativo, essa divisão deixa de ser uma referência simples.",
      },
      {
        title: "De onde saiu o dinheiro?",
        text: "Investigue se a distribuição foi apoiada pela atividade recorrente ou por fatores pontuais, como venda de ativos. Compare a geração de recursos com dívidas e investimentos necessários. Um pagamento elevado isolado não demonstra que a empresa conseguirá repetir esse valor.",
      },
      {
        title: "Leve perguntas para a pesquisa do corretor",
        text: "Ao abrir a opinião sobre uma ação, procure quais premissas sustentam os dividendos estimados, quais fontes foram usadas e o que faria o cenário mudar. A pesquisa pode organizar essas perguntas, mas a estimativa continua sujeita a revisão e não é garantia de pagamento.",
      },
    ],
    takeaways: [
      "Lucro contábil e geração de caixa são medidas diferentes.",
      "Leia payout junto com o período, a política e a origem dos recursos.",
      "Estimativas de dividendos dependem de premissas revisáveis.",
    ],
    // Existing exercise and answer index retain saved progress compatibility.
    question: "Uma valorização estimada já é lucro recebido?",
    choices: [
      "Sim",
      "Não; o ganho da posição aberta ainda não foi realizado",
      "Somente se a alta passar de 10%",
    ],
    answer: 1,
    explanation:
      "Uma mudança de preço não equivale a um recebimento. Da mesma forma, uma previsão de dividendos não é um pagamento efetuado.",
    sources: [
      {
        title: "B3 — dividend yield e payout",
        url: "https://borainvestir.b3.com.br/glossario/dividend-yield/",
      },
      {
        title: "B3 — demonstrativos na análise fundamentalista",
        url: "https://borainvestir.b3.com.br/objetivos-financeiros/tudo-sobre-a-analise-fundamentalista-no-mundo-dos-investimentos/",
      },
    ],
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
    "Relação entre proventos por ação de um período e um preço de referência. Pode ser histórico ou projetado.",
  ],
  [
    "Payout",
    "Parcela do lucro distribuída aos acionistas, conforme a base e o período da análise.",
  ],
  [
    "Data-com",
    "Data de referência anunciada para a elegibilidade a uma distribuição de proventos.",
  ],
  [
    "Data-ex",
    "Data a partir da qual uma nova compra não dá direito à distribuição específica anunciada.",
  ],
  [
    "Data de pagamento",
    "Data anunciada para o crédito do provento aos investidores elegíveis.",
  ],
  [
    "Fluxo de caixa",
    "Entradas e saídas de dinheiro da empresa em determinado período.",
  ],
  [
    "Pagamento extraordinário",
    "Distribuição ligada a circunstâncias pontuais; não implica repetição nos períodos seguintes.",
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
