export const siteOrigin = "https://escoladodividendo.com.br";
export const publicPages = {
  "/": {
    title: "Ediv Finance",
    description:
      "Previsões de ações, pesquisa por empresa e educação sobre dividendos. Conheça a Ediv Finance.",
  },
  "/mercado": {
    title: "Mercado de ações | Ediv Finance",
    description:
      "Explore ações, fundos e outros ativos. Consulte cotações, conheça empresas e aprenda a interpretar os dados do mercado.",
  },
  "/ranking": {
    title: "Ranking de ações | Ediv Finance",
    description:
      "Conheça o ranking de cenários da Ediv Finance. Acesse pesquisas, premissas, horizonte e riscos com uma conta gratuita.",
  },
  "/aprender": {
    title: "Escola de dividendos | Ediv Finance",
    description:
      "Estude dividendos, geração de caixa, projeções e riscos. Explore as aulas e cursos da escola de dividendos.",
  },
  "/glossario": {
    title: "Glossário de investimentos | Ediv Finance",
    description:
      "Entenda dividendos, preço-alvo, risco e outros termos usados nas pesquisas de ações, com explicações simples.",
  },
  "/assessoria": {
    title: "Assessoria | Ediv Finance",
    description:
      "Conheça a proposta de acompanhamento da Ediv Finance e os canais de atendimento. Serviço de assinatura em preparação.",
  },
  "/privacidade": {
    title: "Privacidade | Ediv Finance",
    description:
      "Saiba quais dados a Ediv Finance usa, como funcionam suas ferramentas e quais controles sua conta oferece.",
  },
  "/suporte": {
    title: "Dúvidas e suporte | Ediv Finance",
    description:
      "Encontre respostas sobre pesquisas, dividendos, acesso à conta e ferramentas. Consulte a central de ajuda e converse com a equipe Ediv.",
  },
};
export const accountPaths = [
  "/entrar",
  "/cadastro",
  "/verificar",
  "/recuperar-senha",
  "/redefinir-senha",
];
export function normalizedPath(path) {
  return path === "/" ? path : path.replace(/\/+$/, "");
}
export function pageMetadata(path, qa = false) {
  const metadata = publicPages[normalizedPath(path)];
  return {
    title: metadata?.title || "Ediv Finance",
    description: metadata?.description || "Acesse sua conta na Ediv Finance.",
    canonical: metadata ? siteOrigin + normalizedPath(path) : null,
    noindex: qa || !metadata,
  };
}
