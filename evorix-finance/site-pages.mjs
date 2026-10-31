export const siteOrigin = "https://escoladodividendo.com.br";
export const publicPages = {
  "/": {
    title: "Escola do Dividendo",
    description:
      "Estude dividendos e leia pesquisas de ações na Escola do Dividendo. Entenda o negócio, os cenários e os riscos de cada empresa, com aulas e exemplos.",
  },
  "/ranking": {
    title: "Ranking de Ações | Escola do Dividendo",
    description:
      "Conheça o Ranking de Ações da Escola do Dividendo. Acesse pesquisas, premissas, horizonte e riscos com uma conta gratuita.",
  },
  "/aprender": {
    title: "Aulas sobre dividendos | Escola do Dividendo",
    description:
      "Estude dividendos, geração de caixa, projeções e riscos. Explore as aulas e cursos da escola de dividendos.",
  },
  "/glossario": {
    title: "Glossário de investimentos | Escola do Dividendo",
    description:
      "Entenda dividendos, preço-alvo, risco e outros termos usados nas pesquisas de ações, com explicações simples.",
  },
  "/assessoria": {
    title: "Assessoria | Escola do Dividendo",
    description:
      "Conheça a proposta de acompanhamento da Escola do Dividendo e os canais de atendimento. Serviço de assinatura em preparação.",
  },
  "/privacidade": {
    title: "Privacidade | Escola do Dividendo",
    description:
      "Saiba quais dados a Escola do Dividendo usa, como funcionam suas ferramentas e quais controles sua conta oferece.",
  },
  "/suporte": {
    title: "Dúvidas e suporte | Escola do Dividendo",
    description:
      "Encontre respostas sobre pesquisas, dividendos, acesso à conta e ferramentas. Consulte a central de ajuda e converse com a equipe Escola do Dividendo.",
  },
  "/metodologia": {
    title: "Pesquisa e metodologia | Escola do Dividendo",
    description:
      "Conheça como as pesquisas de ações são organizadas, confira autoria, fontes e versões e aprenda a ler os cenários com contexto.",
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
// Keep saved links usable after retiring the standalone stock catalogue.
export const retiredPages = {
  "/mercado": "/ranking",
  "/app/analises": "/app/ranking",
};
export function retiredPageDestination(path) {
  return Object.hasOwn(retiredPages, normalizedPath(path))
    ? retiredPages[normalizedPath(path)]
    : null;
}
export function pageMetadata(path, qa = false) {
  const metadata = publicPages[normalizedPath(path)];
  return {
    title:
      metadata?.title ||
      (normalizedPath(path) === "/app"
        ? "Início | Escola do Dividendo"
        : "Escola do Dividendo"),
    description:
      metadata?.description || "Acesse sua conta na Escola do Dividendo.",
    canonical: metadata ? siteOrigin + normalizedPath(path) : null,
    noindex: qa || !metadata,
  };
}
