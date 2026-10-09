export type HelpTopicId =
  "pesquisa" | "dividendos" | "conta" | "tecnico" | "sugestao";

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  description: string;
  suggestedSubject: string;
};

export const helpTopics: HelpTopic[] = [
  {
    id: "pesquisa",
    title: "Ranking e pesquisas",
    description: "Leia cenários, indicadores e teses das empresas.",
    suggestedSubject: "Dúvida sobre ranking e pesquisa de ações",
  },
  {
    id: "dividendos",
    title: "Aprender sobre dividendos",
    description: "Entenda os conceitos e acompanhe as aulas.",
    suggestedSubject: "Dúvida sobre dividendos e conteúdo educativo",
  },
  {
    id: "conta",
    title: "Conta e acesso",
    description: "Senha, confirmação de e-mail e seus dados.",
    suggestedSubject: "Ajuda com minha conta e acesso",
  },
  {
    id: "tecnico",
    title: "Algo não funcionou",
    description: "Conte o que aconteceu em uma página ou ferramenta.",
    suggestedSubject: "Problema técnico no site",
  },
  {
    id: "sugestao",
    title: "Ideias e sugestões",
    description: "Ajude a melhorar as pesquisas e a escola.",
    suggestedSubject: "Sugestão para a Ediv Finance",
  },
];

export type SupportAnswer = {
  id: string;
  topicId: HelpTopicId;
  question: string;
  paragraphs: string[];
  link?: { label: string; to: string };
};

export const supportAnswers: SupportAnswer[] = [
  {
    id: "ler-ranking",
    topicId: "pesquisa",
    question: "Por onde começo a leitura do ranking?",
    paragraphs: [
      "Comece pela data e pela versão da pesquisa. Depois, compare o preço de referência, o cenário projetado e o horizonte de análise. Use os filtros para encontrar empresas de um setor ou período específico.",
      "Clique em uma empresa para abrir seu caderno: ali você encontra a tese, os riscos e os indicadores disponíveis. Uma posição no ranking organiza a pesquisa; ela não representa uma ordem de compra.",
    ],
    link: { label: "Explorar o ranking", to: "/app/ranking" },
  },
  {
    id: "potencial-valorizacao",
    topicId: "pesquisa",
    question: "O potencial de valorização é um ganho garantido?",
    paragraphs: [
      "Não. O potencial compara um preço projetado com o preço de referência usado na pesquisa. Ele descreve um cenário, que pode não acontecer ou precisar de revisão.",
      "Leia as premissas, os riscos e o horizonte antes de interpretar esse número. O potencial projetado também não equivale ao retorno já realizado por um investimento.",
    ],
    link: {
      label: "Rever os conceitos nas aulas",
      to: "/app/aprender#ranking",
    },
  },
  {
    id: "diferenca-analises",
    topicId: "pesquisa",
    question: "Qual é a diferença entre Ranking e Análises?",
    paragraphs: [
      "O Ranking reúne os cenários da pesquisa publicada e abre o caderno de cada empresa. Análises permite explorar ações brasileiras e os dados de mercado disponíveis no site.",
      "Ao comparar números entre as páginas, confira a fonte, a data e a referência de cada informação: uma pesquisa publicada pode usar uma referência diferente da cotação exibida em Análises.",
    ],
    link: { label: "Abrir Análises", to: "/app/analises" },
  },
  {
    id: "exemplos-ranking",
    topicId: "pesquisa",
    question: "Como identifico uma pesquisa de demonstração?",
    paragraphs: [
      "Os exemplos são identificados como demonstração e usam conteúdo ilustrativo para explicar as ferramentas. Eles não devem ser tratados como uma pesquisa publicada pelo analista.",
      "Para uma publicação real, confira a versão, a data, a autoria e o conteúdo da tese. Se encontrar algo que não ficou claro, envie à equipe o nome da empresa e a versão que você está lendo.",
    ],
  },
  {
    id: "dividend-yield",
    topicId: "dividendos",
    question: "Um dividend yield alto significa uma empresa melhor?",
    paragraphs: [
      "O dividend yield relaciona os proventos considerados com um preço de referência. Um preço menor pode elevar esse indicador sem que a empresa tenha aumentado sua distribuição.",
      "Compare também a geração de caixa, o lucro, o endividamento e a recorrência dos pagamentos. Proventos passados não garantem pagamentos futuros.",
    ],
    link: { label: "Estudar dividendos", to: "/app/aprender#dividendos" },
  },
  {
    id: "dividendo-jcp",
    topicId: "dividendos",
    question: "Como encontro o significado de dividendos, payout e JCP?",
    paragraphs: [
      "Use o glossário para consultar os termos e, depois, as aulas para entender como eles se relacionam. O laboratório de conceitos traz exemplos numéricos para praticar a leitura dos indicadores.",
      "Nos exemplos educativos, observe sempre qual período e preço foram usados no cálculo. Isso ajuda a comparar informações com a mesma base.",
    ],
    link: { label: "Consultar o glossário", to: "/glossario" },
  },
  {
    id: "videos-aulas",
    topicId: "dividendos",
    question: "Uma aula está sem vídeo. Ainda posso estudar?",
    paragraphs: [
      "Sim. Quando uma gravação ainda não foi publicada, a página informa isso. Você pode seguir pela leitura, pelos conceitos e pelo exercício da aula.",
      "Se o vídeo estiver publicado e o player não abrir, envie uma mensagem com o título da aula, seu navegador e o que aparece na tela.",
    ],
    link: { label: "Continuar aprendendo", to: "/app/aprender" },
  },
  {
    id: "confirmacao-email",
    topicId: "conta",
    question: "O e-mail de confirmação não chegou. O que faço?",
    paragraphs: [
      "Confira a caixa de spam e as outras pastas do seu e-mail. Verifique também se o endereço informado no cadastro foi digitado corretamente.",
      "Na tela de confirmação, use a opção de reenviar quando ela estiver disponível. Se o problema continuar, descreva à equipe o que você tentou; não envie sua senha nem o link de confirmação.",
    ],
    link: { label: "Conferir meu perfil", to: "/app/perfil" },
  },
  {
    id: "trocar-senha",
    topicId: "conta",
    question: "Onde altero minha senha ou encerro os acessos?",
    paragraphs: [
      "Abra Conta e segurança para alterar a senha ou encerrar todas as sessões. A alteração da senha pede a senha atual e encerra os acessos existentes; depois, você entra novamente.",
      "Se esqueceu a senha, use a recuperação na tela de entrada. Escolha uma senha própria para a Ediv e não a compartilhe nas conversas com a equipe.",
    ],
    link: { label: "Abrir Conta e segurança", to: "/app/configuracoes" },
  },
  {
    id: "dados-conta",
    topicId: "conta",
    question: "Posso baixar meus dados ou excluir minha conta?",
    paragraphs: [
      "Sim. Em Conta e segurança, você pode baixar seus dados em JSON e solicitar a exclusão da conta. Antes de excluir, faça uma cópia das informações que deseja guardar.",
      "A tela apresenta os efeitos da exclusão e pede sua senha para confirmar. Consulte também a política de privacidade para entender o tratamento dos dados.",
    ],
    link: { label: "Gerenciar meus dados", to: "/app/configuracoes" },
  },
  {
    id: "pagina-erro",
    topicId: "tecnico",
    question: "Uma página não carregou ou mostrou erro. O que envio à equipe?",
    paragraphs: [
      "Tente atualizar a página uma vez e confira sua conexão. Se continuar, anote o nome da página, o horário aproximado, o dispositivo, o navegador e os passos que levaram ao erro.",
      "Copie a mensagem exibida, se houver. Esses detalhes ajudam a equipe a localizar o problema. Não inclua senhas, tokens, dados bancários ou links privados de acesso.",
    ],
  },
  {
    id: "dados-ausentes",
    topicId: "tecnico",
    question: "Por que um indicador ou uma empresa aparece sem dados?",
    paragraphs: [
      "Um indicador pode não ter sido incluído na pesquisa ou não estar disponível na fonte consultada. Um campo vazio não significa que o valor seja zero.",
      "Confira se você está na publicação desejada e se há filtros ativos. Se suspeitar de um erro, informe o código da ação, o indicador e a página à equipe.",
    ],
    link: { label: "Revisar a publicação", to: "/app/ranking" },
  },
  {
    id: "acompanhar-conversa",
    topicId: "tecnico",
    question: "Como acompanho uma dúvida que já enviei?",
    paragraphs: [
      "Abra a lista de suas conversas e selecione o assunto. As mensagens e o status ficam no mesmo atendimento. Para complementar a mesma dúvida, responda nessa conversa.",
      "Você pode enviar perguntas a qualquer hora. O envio não significa resposta imediata; acompanhe a conversa para ver o retorno da equipe.",
    ],
  },
  {
    id: "sugerir-conteudo",
    topicId: "sugestao",
    question: "Posso sugerir uma aula ou uma empresa para pesquisar?",
    paragraphs: [
      "Pode. Informe o tema ou o código da empresa e explique qual dúvida você gostaria de esclarecer. Para aulas, conte também seu nível de familiaridade com o assunto.",
      "A sugestão ajuda a equipe a planejar conteúdos. O envio não garante que uma empresa ou aula será incluída nas próximas publicações.",
    ],
  },
  {
    id: "sugerir-melhoria",
    topicId: "sugestao",
    question: "Como envio uma ideia para melhorar uma ferramenta?",
    paragraphs: [
      "Descreva o que você estava tentando fazer, o que dificultou o caminho e como a melhoria ajudaria. Dizer em qual página isso aconteceu torna a sugestão mais fácil de entender.",
      "Se o recurso apresentou uma falha, escolha a categoria de problema técnico para registrar os detalhes do erro.",
    ],
  },
];

export function normalizeHelpSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}
