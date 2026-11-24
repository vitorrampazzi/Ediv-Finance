// shortcut: static catalog mirrors frontend IDs, update both catalogs when courses change.
export const learningCourses = [
  {
    id: "primeiros-passos",
    title: "Primeiros passos na bolsa",
    chapterIds: ["acoes", "corretora", "comprar-acoes"],
  },
  {
    id: "dividendos",
    title: "Da empresa ao dividendo",
    chapterIds: ["dividendos", "carteira"],
  },
  {
    id: "economia",
    title: "Inflação, juros e ciclos",
    chapterIds: ["inflacao", "ciclos"],
  },
  {
    id: "analise",
    title: "Do negócio ao preço-teto",
    chapterIds: ["fundamentalista", "preco-teto"],
  },
  {
    id: "pesquisa",
    title: "Leia uma análise com autonomia",
    chapterIds: ["ranking", "risco"],
  },
];

export const lessons = [
  {
    id: "acoes",
    title: "Ações: vantagens e riscos",
    text: "Comprar uma ação é virar sócio de uma empresa. Você não precisa ter a ideia, montar a operação nem administrar o negócio: participa do resultado de quem faz isso. Essa participação traz um potencial de retorno maior que o da renda fixa e, junto com ele, riscos que precisam ser conhecidos antes de investir.",
    sections: [
      {
        title: "Ser sócio: as duas formas de ganhar",
        text: "Quando a empresa cresce e lucra mais, o acionista pode ganhar de duas formas: com a valorização da ação ao longo do tempo e com os dividendos, a parte do lucro que a empresa distribui aos sócios. Na Escola do Dividendo, o foco está na segunda: empresas que geram lucro de forma consistente e dividem uma parte dele com os acionistas. Sem lucro não há dividendo. Por isso o que acompanhamos é a evolução do negócio, e não a oscilação diária da cotação.",
      },
      {
        title: "Mais retorno potencial, mais risco",
        text: "No mercado financeiro, retorno maior costuma vir acompanhado de risco maior. Na renda fixa, as regras de remuneração são conhecidas de antemão. Na ação, o resultado depende do desempenho da empresa: se o negócio der certo, o retorno pode superar com folga o da renda fixa; se der errado, a ação pode perder valor e os dividendos podem diminuir ou parar.",
      },
      {
        title: "Riscos da própria empresa",
        text: "O risco mais grave é o de continuidade: se a empresa não consegue executar seus projetos e quebra, a ação pode perder praticamente todo o valor. Antes disso, quando os resultados prometidos não aparecem, o mercado vende as ações e o preço cai. E, se a empresa não tem lucro, ela não tem o que distribuir.",
      },
      {
        title: "Riscos do cenário",
        text: "Risco de mercado: o preço oscila todos os dias, e quem precisa vender num momento ruim pode sair com prejuízo. Por isso a reserva de emergência vem antes da bolsa. Risco de juros: quando a taxa Selic sobe, a renda fixa fica mais atraente, muitos investidores vendem ações e os preços caem, mesmo sem mudança no negócio. Risco cambial: empresas que exportam ganham com o dólar alto, e as que têm custos em dólar perdem; vale saber de onde vêm as receitas e os custos. Risco de inflação: se o investimento rende menos que a inflação, você perde poder de compra.",
      },
      {
        title: "Como se proteger",
        text: "A primeira proteção é a diversificação: ações de empresas diferentes, em setores diferentes, e também outras classes de investimento, como renda fixa e fundos imobiliários. A segunda é escolher bem: empresas líderes, de setores essenciais e com histórico de lucro tendem a atravessar crises com mais firmeza. Mesmo assim, nenhuma empresa está livre de risco, e dividendos não são garantidos.",
      },
    ],
    takeaways: [
      "Ação é participação em uma empresa: você ganha com o lucro dela, por dividendos ou valorização.",
      "Retorno potencial maior vem com risco maior: o preço oscila e os dividendos podem cair.",
      "Reserva de emergência e diversificação vêm antes da busca por retorno.",
    ],
    question: "Por que a alta da taxa Selic costuma pressionar o preço das ações?",
    choices: [
      "Porque as empresas ficam proibidas de pagar dividendos",
      "Porque a renda fixa fica mais atraente e parte dos investidores vende ações",
      "Porque a Selic é calculada a partir do preço das ações",
    ],
    answer: 1,
    explanation:
      "Com juros mais altos, a renda fixa paga mais e muitos investidores migram para ela. Essa venda derruba preços mesmo quando o negócio da empresa não mudou.",
    sources: [
      {
        title: "Portal do Investidor — o que são ações",
        url: "https://www.gov.br/investidor/pt-br/investir/tipos-de-investimentos/acoes",
      },
    ],
  },
  {
    id: "corretora",
    title: "O que é uma corretora de investimentos",
    text: "Para comprar ações, fundos imobiliários ou títulos de renda fixa, você precisa de um intermediário: um banco ou uma corretora de investimentos. A corretora funciona como uma corretora de imóveis: aproxima quem quer comprar de quem quer vender e cuida da parte operacional. Antes de investir, porém, vem a reserva de emergência.",
    sections: [
      {
        title: "Banco ou corretora?",
        text: "Os bancos também dão acesso a investimentos, mas costumam oferecer principalmente produtos ligados à própria instituição. A corretora reúne produtos de vários emissores: ações, fundos imobiliários, CDBs de diferentes bancos, LCI, LCA e debêntures, que são empréstimos feitos a uma empresa sem virar sócio dela. Mais opções ajudam a comparar taxas, custos e riscos antes de escolher.",
      },
      {
        title: "Como a corretora funciona no dia a dia",
        text: "Você abre uma conta, transfere o dinheiro do seu banco e envia a ordem de compra pelo site, pelo aplicativo ou pelo home broker. A corretora executa a ordem na B3, a bolsa brasileira, e as ações passam a ficar registradas em seu nome. Na prática, você vira acionista, um pequeno sócio da empresa, sem precisar lidar diretamente com a bolsa.",
      },
      {
        title: "Como escolher uma corretora",
        text: "Alguns critérios ajudam. Solidez: uma instituição grande e com várias linhas de negócio tende a oferecer mais estrutura e estabilidade. Variedade de produtos: para você comparar antes de investir. Custos claros: taxas de corretagem e de custódia, quando houver. E, principalmente, bom atendimento: alguém que responda às suas dúvidas sobre ordens, extratos e produtos. Confira também se a instituição é autorizada pelo Banco Central e registrada na CVM. Se um dia quiser investir em empresas de outros países, existem corretoras especializadas nisso.",
      },
    ],
    takeaways: [
      "A corretora é a intermediária entre você e a bolsa: executa suas ordens e registra os ativos em seu nome.",
      "Ela costuma oferecer mais variedade de produtos do que o banco tradicional.",
      "Escolha pela solidez, pela variedade, pelos custos e pelo atendimento.",
    ],
    question: "Qual é o papel da corretora quando você compra uma ação?",
    choices: [
      "Garantir que a ação vai se valorizar",
      "Definir quanto de dividendo a empresa vai pagar",
      "Executar a sua ordem na bolsa e registrar as ações em seu nome",
    ],
    answer: 2,
    explanation:
      "A corretora é intermediária: recebe a sua ordem, executa na B3 e cuida do registro. Ela não garante resultado nem decide sobre os proventos da empresa.",
    sources: [
      {
        title: "Portal do Investidor — como investir",
        url: "https://www.gov.br/investidor/pt-br/investir/como-investir",
      },
      {
        title: "B3 Bora Investir — o que é home broker",
        url: "https://borainvestir.b3.com.br/glossario/home-broker/",
      },
    ],
  },
  {
    id: "comprar-acoes",
    title: "Como comprar ações: lotes, fracionário e eventos",
    text: "Na hora de comprar, você encontra dois mercados, o lote padrão e o fracionário, e um código para cada ação, o ticker. Depois da compra, a empresa pode fazer eventos que mudam a quantidade de ações que você tem. Entender esses eventos evita sustos ao abrir o extrato.",
    sections: [
      {
        title: "Lote padrão e mercado fracionário",
        text: "No mercado de ações, a negociação principal acontece em lotes de 100 ações. Se uma ação custa R$ 40, um lote custa R$ 4.000. Para comprar menos que isso, existe o mercado fracionário, onde você compra de 1 a 99 ações. Os preços dos dois mercados costumam ser muito próximos. Uma mesma ordem não mistura os dois: para ter 145 ações, você compra 100 no lote padrão e 45 no fracionário.",
      },
      {
        title: "O ticker",
        text: "Cada ação tem um código de negociação, o ticker: quatro letras que identificam a empresa e um número que indica o tipo. Em geral, 3 indica ação ordinária, com direito a voto; 4 indica ação preferencial, com preferência no recebimento de proventos; e 11 costuma indicar units, um pacote de ações. Para comprar no fracionário, acrescente a letra F ao final do código. Muitas corretoras já fazem essa troca sozinhas quando você digita uma quantidade menor que 100.",
      },
      {
        title: "Proventos",
        text: "O evento que mais interessa à Escola é o pagamento de proventos, a parte do lucro distribuída aos acionistas de quem acreditou no negócio. A frequência varia de empresa para empresa: há as que pagam a cada trimestre, a cada semestre ou uma vez por ano. Esse tema tem aulas próprias no curso Da empresa ao dividendo.",
      },
      {
        title: "Desdobramento e grupamento",
        text: "No desdobramento, a empresa divide cada ação em mais ações: uma ação de R$ 100 desdobrada em duas vira duas ações de R$ 50. Você passa a ter o dobro de ações, mas o seu patrimônio não muda. O objetivo é deixar a ação mais acessível e aumentar a liquidez. O grupamento faz o contrário: junta várias ações em uma, em geral quando o preço ficou muito baixo; a B3 tem regras para ações negociadas abaixo de R$ 1 por longos períodos. Nos dois casos, o valor total da sua posição continua o mesmo no momento do evento.",
      },
      {
        title: "Subscrição e recompra",
        text: "Na subscrição, a empresa emite ações novas para captar dinheiro e investir em projetos. Quem já é acionista costuma ter direito de preferência para comprar as novas ações; quem não participa tem a sua fatia diluída. Se a captação é boa ou ruim depende do uso do dinheiro e do momento da empresa. Na recompra, a empresa compra as próprias ações no mercado. Com menos ações em circulação, cada uma representa um pedaço maior do negócio: dez laranjas divididas entre cinco pessoas rendem duas para cada, e não uma, como seria entre dez. Por isso a recompra pode aumentar o lucro e o dividendo por ação, sem garantia de que isso aconteça.",
      },
    ],
    takeaways: [
      "Ações são negociadas em lotes de 100; para menos, use o fracionário, com F no final do ticker.",
      "Desdobramento e grupamento mudam a quantidade de ações, não o valor da sua posição.",
      "A subscrição pode diluir quem não participa; a recompra aumenta a fatia de cada ação.",
    ],
    question: "Você tem 300 ações a R$ 100 e a empresa faz um desdobramento de uma ação em duas. O que acontece?",
    choices: [
      "Você passa a ter 600 ações de R$ 50, e o patrimônio continua o mesmo",
      "Você passa a ter 600 ações de R$ 100, e o patrimônio dobra",
      "Você passa a ter 150 ações de R$ 200",
    ],
    answer: 0,
    explanation:
      "O desdobramento divide cada ação em duas e o preço pela metade. A quantidade dobra, mas o valor total da posição não muda: R$ 30.000 antes e depois.",
    sources: [
      {
        title: "B3 Bora Investir — o que é ticker",
        url: "https://borainvestir.b3.com.br/glossario/ticker/",
      },
      {
        title: "B3 Bora Investir — desdobramento",
        url: "https://borainvestir.b3.com.br/glossario/desdobramento/",
      },
      {
        title: "B3 Bora Investir — grupamento",
        url: "https://borainvestir.b3.com.br/glossario/grupamento/",
      },
      {
        title: "B3 Bora Investir — subscrição",
        url: "https://borainvestir.b3.com.br/glossario/subscricao/",
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
  {
    id: "inflacao",
    title: "O que é inflação e por que ela importa",
    text: "Inflação é o aumento generalizado dos preços de bens e serviços. Quando os preços sobem mais que a renda, o mesmo salário compra menos coisas. Para o investidor, a inflação é a régua mínima: um investimento que rende menos que ela faz você perder poder de compra.",
    sections: [
      {
        title: "Da troca à moeda",
        text: "Antes da moeda, as pessoas trocavam bens diretamente, como madeira por carne, e era difícil dizer quanto uma coisa valia em relação à outra. A moeda surgiu como uma unidade única de valor, que permite comparar e trocar qualquer bem ou serviço. A economia é o conjunto dessas trocas no dia a dia, e ela influencia diretamente o resultado das empresas e dos seus investimentos.",
      },
      {
        title: "Inflação e poder de compra",
        text: "Se o pedaço de carne que custava R$ 10 passa a custar R$ 12, você paga mais pela mesma quantidade. Quando isso acontece com muitos produtos ao mesmo tempo, há inflação. Se o salário não sobe na mesma proporção, sobra menos para alimentação, estudo e saúde, e a qualidade de vida cai. Por isso uma das funções do Banco Central é preservar o poder de compra da moeda, e por isso vale acompanhar os índices de inflação, como o IPCA.",
      },
      {
        title: "Por que os preços sobem: excesso de demanda",
        text: "Imagine um vendedor com dois celulares. Se só uma pessoa quer comprar, ele dá desconto para vender. Se quatro pessoas disputam os dois aparelhos, ele pode subir o preço. Quando há mais gente querendo comprar do que produtos disponíveis, os preços sobem: é a inflação de demanda.",
      },
      {
        title: "Por que os preços sobem: choque de oferta",
        text: "Agora imagine que um dos dois celulares quebra. A procura é a mesma, mas há menos produto, e o preço sobe. É o choque de oferta: um evento, como uma guerra, uma quebra de safra ou um problema na produção, reduz a oferta e encarece o produto, mesmo sem aumento da procura. Foi o que aconteceu com o petróleo em 2022, quando a guerra entre Rússia e Ucrânia afetou a oferta.",
      },
      {
        title: "O que isso tem a ver com dividendos",
        text: "Para quem investe, o que importa é o retorno acima da inflação. Se uma ação paga 2% ao ano em dividendos e a inflação é de 4%, o poder de compra dessa renda diminui. Por isso a Escola dá preferência a empresas de setores essenciais, como energia elétrica e saneamento, que muitas vezes conseguem repassar custos aos preços. Isso ajuda a proteger o resultado, mas não é garantia: contratos, regulação e concorrência podem limitar o repasse.",
      },
    ],
    takeaways: [
      "Inflação é a alta generalizada dos preços, que reduz o poder de compra.",
      "Ela surge por excesso de demanda ou por choque de oferta.",
      "O retorno que importa é o que fica acima da inflação.",
    ],
    question: "Uma geada destrói parte da safra de café e o preço sobe, mesmo com a procura igual. Que tipo de inflação é essa?",
    choices: [
      "Inflação por choque de oferta",
      "Inflação de demanda",
      "Não é inflação, é um desdobramento",
    ],
    answer: 0,
    explanation:
      "A procura não mudou; o que caiu foi a oferta. Menos produto para a mesma procura eleva o preço: é um choque de oferta.",
    sources: [
      {
        title: "Banco Central — o que é inflação",
        url: "https://www.bcb.gov.br/controleinflacao/oqueinflacao",
      },
      {
        title: "B3 Bora Investir — IPCA",
        url: "https://borainvestir.b3.com.br/glossario/ipca/",
      },
      {
        title: "B3 Bora Investir — poder de compra",
        url: "https://borainvestir.b3.com.br/glossario/poder-de-compra/",
      },
    ],
  },
  {
    id: "ciclos",
    title: "Ciclos econômicos: juros, lucros e preços",
    text: "A economia alterna fases de aceleração e de desaceleração, e a taxa de juros está no centro desse movimento. Entender esses ciclos ajuda a ter paciência nos momentos ruins e cautela nos momentos de euforia, sem tentar adivinhar cada movimento do mercado.",
    sections: [
      {
        title: "A Selic e a demanda",
        text: "Para controlar a inflação, o Banco Central usa a taxa básica de juros, a Selic. Juros mais altos encarecem o crédito e estimulam a poupança: pessoas e empresas compram menos, a demanda cai e a inflação tende a desacelerar. Juros mais baixos fazem o contrário: o crédito fica mais barato, o consumo cresce, a economia acelera e a inflação pode voltar a subir.",
      },
      {
        title: "Do juro ao preço da ação",
        text: "Com juros altos, muitas empresas vendem menos e lucram menos, e a renda fixa fica mais atraente. Os dois efeitos pressionam o preço das ações para baixo. Com juros baixos e economia aquecida, os lucros crescem, o otimismo aumenta e os preços tendem a subir. Lembre que a bolsa é só o lugar onde se negocia a participação nas empresas: o preço reflete o que o mercado espera delas naquele momento.",
      },
      {
        title: "Empresa boa nem sempre é oportunidade",
        text: "Em fases de juros altos, é comum encontrar boas empresas negociadas a preços menores, às vezes sem que o negócio tenha piorado. Em fases de euforia, as mesmas empresas podem ficar caras, e as oportunidades ficam mais raras. Uma empresa boa comprada a um preço alto pode render pouco por muitos anos. Por isso a Escola usa o preço-teto: ele ajuda a decidir se o preço do momento ainda faz sentido, qualquer que seja a fase do ciclo.",
      },
      {
        title: "Ciclo não é previsão",
        text: "Ninguém sabe quanto tempo cada fase vai durar. Entender os ciclos serve para não se assustar quando os preços caem por causa dos juros e para não se empolgar quando sobem por euforia. O que acompanhamos continua sendo o negócio: lucro, geração de caixa e capacidade de distribuir dividendos.",
      },
    ],
    takeaways: [
      "Juros altos desaceleram a economia e costumam pressionar o preço das ações.",
      "Preço baixo por causa do ciclo pode ser oportunidade, se o negócio continua sólido.",
      "O preço-teto dá disciplina em qualquer fase do ciclo; ciclo não é previsão.",
    ],
    question: "Em um período de juros altos, as ações de uma empresa sólida caem, mas o lucro segue estável. O que a aula sugere?",
    choices: [
      "Vender imediatamente, porque juros altos sempre quebram empresas",
      "Comprar sem olhar o preço, porque toda queda é oportunidade",
      "Avaliar o negócio e o preço-teto: a queda pode ser efeito do ciclo, e não do negócio",
    ],
    answer: 2,
    explanation:
      "Juros altos podem derrubar preços mesmo de empresas que continuam lucrando. A decisão depende do negócio e do preço em relação ao preço-teto, e não do ciclo sozinho.",
    sources: [
      {
        title: "Banco Central — taxa Selic",
        url: "https://www.bcb.gov.br/controleinflacao/taxaselic",
      },
      {
        title: "Banco Central — Copom",
        url: "https://www.bcb.gov.br/controleinflacao/copom",
      },
    ],
  },
  {
    id: "fundamentalista",
    title: "Análise fundamentalista: do setor à empresa",
    text: "A análise fundamentalista estuda o negócio para estimar quanto uma empresa vale, e não para adivinhar o próximo movimento do preço. Ela parte da ideia de que a empresa vai continuar existindo e gerando resultados por muitos anos, que é exatamente o horizonte de quem investe em dividendos.",
    sections: [
      {
        title: "Top-down: de cima para baixo",
        text: "Começa pelo cenário: juros, inflação, crescimento do país, decisões do governo e tendências da população. Com essa visão, você identifica os setores mais preparados para atravessar o cenário. Por exemplo: como a inflação afeta o setor de seguros? Como o crescimento da economia afeta os bancos?",
      },
      {
        title: "Bottom-up: de baixo para cima",
        text: "Depois, você desce ao detalhe de cada empresa do setor: demonstrações financeiras, endividamento, margens, posição competitiva, estratégia e qualidade da gestão. As duas abordagens se completam: primeiro o setor, depois a melhor empresa dentro dele.",
      },
      {
        title: "Setores perenes",
        text: "Setores perenes oferecem produtos e serviços dos quais a sociedade não abre mão: bancos, seguros, saneamento e energia elétrica, justamente os setores prioritários da Escola. Mesmo em crises, as pessoas continuam pagando a conta de luz, a de água e o seguro. Na pandemia, enquanto turismo e shoppings ficaram parados, esses serviços continuaram sendo usados e pagos. Isso tende a trazer receitas mais estáveis, caixa mais previsível, capacidade de repassar a inflação aos preços e uma demanda que cresce junto com a população.",
      },
      {
        title: "Perene não é sinônimo de sem risco",
        text: "Uma empresa de setor essencial também pode ir mal: perdas na operação, endividamento, problemas regulatórios ou má gestão afetam o resultado e os dividendos. Por isso a análise da empresa é indispensável, e a diversificação entre empresas e setores continua recomendada.",
      },
      {
        title: "Por que investir com foco em dividendos",
        text: "Quem compra uma ação vira um pequeno sócio de uma grande empresa e participa do lucro dela. Empresas que pagam dividendos de forma consistente costumam ter lucro recorrente e boa geração de caixa, o que serve de filtro inicial. Os dividendos podem crescer quando o lucro cresce e podem continuar entrando mesmo quando o preço da ação oscila, o que ajuda a manter a calma nas quedas. Nada disso é garantido: a empresa pode reduzir ou suspender os pagamentos.",
      },
      {
        title: "A bola de neve do reinvestimento",
        text: "O dividendo é pago por ação, e não pelo valor investido. Ao reinvestir os dividendos em mais ações, você aumenta a quantidade de ações e, com ela, os próximos pagamentos. Repetido ao longo dos anos, esse efeito bola de neve constrói patrimônio e renda passiva, que pode trazer mais liberdade, estabilidade diante de imprevistos e um legado para a família. Isso exige planejamento, paciência e tempo.",
      },
    ],
    takeaways: [
      "Top-down escolhe o setor; bottom-up escolhe a empresa. Use os dois.",
      "Setores perenes tendem a ter receita mais estável, mas cada empresa precisa ser analisada.",
      "Reinvestir dividendos aumenta a quantidade de ações e os pagamentos futuros.",
    ],
    question: "Na análise top-down, por onde você começa?",
    choices: [
      "Pelo cenário econômico e pelos setores",
      "Pelo balanço de uma empresa específica",
      "Pelo gráfico de preço do último mês",
    ],
    answer: 0,
    explanation:
      "O top-down parte do cenário, com juros, inflação e crescimento, para chegar aos setores. Depois, o bottom-up escolhe as empresas dentro deles.",
    sources: [
      {
        title: "B3 Bora Investir — análise fundamentalista",
        url: "https://borainvestir.b3.com.br/objetivos-financeiros/tudo-sobre-a-analise-fundamentalista-no-mundo-dos-investimentos/",
      },
      {
        title: "B3 Bora Investir — dividendos",
        url: "https://borainvestir.b3.com.br/glossario/dividendos/",
      },
    ],
  },
  {
    id: "preco-teto",
    title: "Valuation por dividendos e preço-teto",
    text: "Valuation é o processo de estimar quanto vale uma empresa. Para quem investe em dividendos, a pergunta prática é: até que preço vale a pena comprar esta ação, considerando os dividendos que ela pode pagar? A resposta é o preço-teto. Ele não prevê o futuro; ele ajuda a não pagar caro demais.",
    sections: [
      {
        title: "Valor não é preço",
        text: "O preço é o que o mercado cobra hoje; o valor intrínseco é o que a empresa vale pelos resultados que pode gerar. Há várias formas de estimá-lo: fluxo de caixa descontado, múltiplos como P/L e EV/EBITDA comparados aos de empresas parecidas e modelos baseados em dividendos. Quando o preço fica abaixo do valor estimado, pode haver uma oportunidade, desde que as premissas façam sentido.",
      },
      {
        title: "O modelo de dividendos descontados",
        text: "O modelo de Gordon estima o valor da ação a partir dos dividendos esperados: valor = dividendo esperado para o próximo ano ÷ (retorno exigido − crescimento dos dividendos). Exemplo hipotético: se você exige 10% ao ano e espera que os dividendos cresçam 3% ao ano, divide o dividendo esperado por 7%. O modelo depende de estimativas, por isso deve ser usado junto com a análise do negócio, nunca sozinho.",
      },
      {
        title: "O preço-teto de Décio Bazin",
        text: "Décio Bazin, autor de Faça Fortuna com Ações, Antes que Seja Tarde, popularizou uma regra simples para quem busca renda: só comprar quando o dividendo representar pelo menos 6% ao ano sobre o preço pago. Daí vem o preço-teto: preço-teto = dividendo médio por ação ÷ 6%. Usar a média de vários anos, por exemplo seis, em vez de projetar crescimento, é uma escolha conservadora.",
      },
      {
        title: "Exemplo passo a passo (números hipotéticos)",
        text: "Imagine uma empresa que pagou, por ação, R$ 2,00, R$ 2,20, R$ 2,10, R$ 2,30, R$ 4,00 e R$ 4,20 nos últimos seis anos. A média é R$ 2,80, e o preço-teto seria R$ 2,80 ÷ 0,06, cerca de R$ 46,67. Mas os dois últimos anos foram atípicos: a receita foi corrigida por um índice que subiu fora do normal. Sem esses anos, a média cai para R$ 2,15, e o preço-teto, para cerca de R$ 35,83. Conhecer a empresa mudou a conta: pagamentos extraordinários não devem sustentar o preço-teto.",
      },
      {
        title: "Margem de segurança",
        text: "Com o preço-teto em mãos, compare-o com o preço de mercado. A margem de segurança mostra a folga: margem = (preço-teto − preço de mercado) ÷ preço-teto. No exemplo, com preço-teto de R$ 35,83 e a ação a R$ 32,00, a margem é de cerca de 10,7%. Quanto maior a margem, maior a folga para erros de estimativa; margem negativa indica preço acima do teto. Alguns investidores ainda aplicam um desconto extra sobre o preço-teto, por exemplo de 20%, para ficar mais conservadores.",
      },
      {
        title: "Como isso aparece na Escola",
        text: "Na Escola do Dividendo, o preço-teto de cada empresa vem da análise publicada pela equipe e só muda quando sai uma nova análise: ele não acompanha a cotação. A margem de segurança, essa sim, é recalculada com o preço de mercado, pela mesma fórmula desta aula. O preço-teto não garante retorno: dividendos futuros não são garantidos, e a empresa pode mudar a sua política de distribuição. Se os fundamentos piorarem e a tese deixar de se sustentar, a decisão precisa ser revista.",
      },
    ],
    takeaways: [
      "Preço é o que se paga; valor é o que a empresa pode gerar.",
      "Preço-teto pelo método de Bazin = dividendo médio por ação ÷ 6%, sem pagamentos extraordinários.",
      "Margem de segurança = (preço-teto − preço de mercado) ÷ preço-teto.",
    ],
    question: "Uma empresa pagou em média R$ 3,00 por ação em dividendos. Pelo método de Bazin, com retorno mínimo de 6%, qual é o preço-teto?",
    choices: [
      "R$ 18,00",
      "R$ 30,00",
      "R$ 50,00",
    ],
    answer: 2,
    explanation:
      "Preço-teto = R$ 3,00 ÷ 0,06 = R$ 50,00. Acima desse preço, o dividendo médio passa a render menos de 6% ao ano sobre o valor pago.",
    sources: [
      {
        title: "B3 Bora Investir — valor intrínseco",
        url: "https://borainvestir.b3.com.br/glossario/valor-intrinseco/",
      },
      {
        title: "B3 Bora Investir — dividend yield: o que é e como calcular",
        url: "https://borainvestir.b3.com.br/objetivos-financeiros/investir-melhor/dividend-yield-o-que-e-e-como-calcular/",
      },
    ],
  },
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
];
export function serializeLessons(authenticated) {
  return lessons.map((lesson, index) => {
    if (authenticated) return { ...lesson, locked: false };
    if (index !== 0)
      return { id: lesson.id, title: lesson.title, locked: true };
    const { id, title, text, sections, takeaways, sources } = lesson;
    return { id, title, text, sections, takeaways, sources, locked: false };
  });
}

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
    "Relação entre proventos por ação de um período e um preço de referência. Pode ser histórico ou projetado; sozinho, não indica uma boa escolha.",
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
    "Juros sobre capital próprio, uma modalidade de remuneração ao acionista. Tem imposto de renda retido na fonte, então o valor líquido recebido é menor que o valor bruto anunciado.",
  ],
];
