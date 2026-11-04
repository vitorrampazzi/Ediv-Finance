export const siteOrigin = "https://escoladodividendo.com.br";
// `updated` is the date of the last real change to the page content, used as
// the sitemap lastmod. Change it together with the content, never per build.
export const publicPages = {
  "/": {
    updated: "2026-11-04",
    title: "Escola do Dividendo",
    description:
      "Estude dividendos e leia pesquisas de ações na Escola do Dividendo. Entenda o negócio, os cenários e os riscos de cada empresa, com aulas e exemplos.",
  },
  "/ranking": {
    updated: "2026-11-04",
    title: "Ranking de Ações | Escola do Dividendo",
    description:
      "Conheça o Ranking de Ações da Escola do Dividendo. Acesse pesquisas, premissas, horizonte e riscos com uma conta gratuita.",
  },
  "/aprender": {
    updated: "2026-10-27",
    title: "Aulas sobre dividendos | Escola do Dividendo",
    description:
      "Estude dividendos, geração de caixa, projeções e riscos. Explore as aulas e cursos da escola de dividendos.",
  },
  "/glossario": {
    updated: "2026-10-27",
    title: "Glossário de investimentos | Escola do Dividendo",
    description:
      "Entenda dividendos, preço-alvo, risco e outros termos usados nas pesquisas de ações, com explicações simples.",
  },
  "/assessoria": {
    updated: "2026-10-21",
    title: "Assessoria | Escola do Dividendo",
    description:
      "Conheça a proposta de acompanhamento da Escola do Dividendo e os canais de atendimento. Serviço de assinatura em preparação.",
  },
  "/privacidade": {
    updated: "2026-10-18",
    title: "Privacidade | Escola do Dividendo",
    description:
      "Saiba quais dados a Escola do Dividendo usa, como funcionam suas ferramentas e quais controles sua conta oferece.",
  },
  "/suporte": {
    updated: "2026-11-03",
    title: "Dúvidas e suporte | Escola do Dividendo",
    description:
      "Encontre respostas sobre pesquisas, dividendos, acesso à conta e ferramentas. Consulte a central de ajuda e converse com a equipe Escola do Dividendo.",
  },
  "/metodologia": {
    updated: "2026-10-18",
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
  // A aba sempre mostra a marca; o título da página segue nas prévias sociais.
  return {
    title: "Escola do Dividendo",
    socialTitle: metadata?.title || "Escola do Dividendo",
    description:
      metadata?.description || "Acesse sua conta na Escola do Dividendo.",
    canonical: metadata ? siteOrigin + normalizedPath(path) : null,
    noindex: qa || !metadata,
  };
}

// Schema.org data for search engines: who publishes the site and where each
// public page sits. No address or company registration until they are public.
export function structuredData(path, qa = false) {
  const page = publicPages[normalizedPath(path)];
  if (qa || !page) return [];
  const home = siteOrigin + "/";
  if (normalizedPath(path) === "/")
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Escola do Dividendo",
        url: home,
        logo: siteOrigin + "/ediv-icon-clean-192.png",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Escola do Dividendo",
        url: home,
        inLanguage: "pt-BR",
      },
    ];
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: home },
        {
          "@type": "ListItem",
          position: 2,
          name: page.title.split(" | ")[0],
          item: siteOrigin + normalizedPath(path),
        },
      ],
    },
  ];
}
