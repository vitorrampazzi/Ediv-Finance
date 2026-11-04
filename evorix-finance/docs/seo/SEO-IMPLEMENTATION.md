# Implementação de SEO

## Metadados centralizados

`site-pages.mjs` é a fonte única de cada página pública:
- descrição, título social (og/twitter) e canonical;
- `noindex` para as páginas de conta, a área logada e a 404;
- data real da última mudança de conteúdo (`updated`);
- dados estruturados (`structuredData`).

O `scripts/prerender.mjs` aplica tudo isso no HTML de cada rota. O `src/components/PageMetadata.tsx` mantém os mesmos valores durante a navegação.

## Mudanças

| Área | O que mudou | Arquivos | PR |
|---|---|---|---|
| Dados estruturados | Organization e WebSite na home; BreadcrumbList nas outras páginas públicas | `site-pages.mjs`, `scripts/prerender.mjs` | #40 |
| Duplicação | `trailingSlash: false` (`/ranking/` → 308 para `/ranking`) | `vercel.json` | #40 |
| Prévias sociais | Sem `og:url` vazio em páginas sem canonical | `scripts/prerender.mjs` | #40 |
| Layout estável | A página pré-renderizada é trocada pela mesma página, sem tela de carregamento | `src/lib/lazyPage.ts`, `src/App.tsx`, `src/main.tsx` | #40 |
| Cache | `/assets/*` com cache de um ano, `immutable` | `vercel.json` | #40 |
| Acessibilidade | O primeiro Tab da visita cai em "Pular para o conteúdo" | `src/components/PageContent.tsx` | #40 |
| GA4 | Eventos com lista fechada e `utm_*` da página de entrada | `analytics-policy.mjs`, `src/lib/analytics.ts`, componentes de CTA | #40 |
| Sitemap | `lastmod` com a data real de cada página, não a do build | `site-pages.mjs`, `scripts/prerender.mjs` | esta |
| LCP | Banner de cookies sem esperar a checagem de sessão (a medição continua esperando) | `src/components/PrivacyConsent.tsx` | esta |
| JS inicial | Animações de página e do menu do celular em CSS; framer-motion sai do JS inicial | `src/components/PageContent.tsx`, `src/components/SiteChrome.tsx`, `src/index.css` | esta |
| Recursos críticos | Pré-carregamento da fonte (todas as páginas) e da foto do herói (home) | `index.html`, `scripts/prerender.mjs` | esta |
| CLS da prévia | Espaço reservado enquanto a prévia do ranking carrega, medido no build | `src/components/home/ResearchSample.tsx`, `public-sections.css` | esta |
| Confiabilidade | Aviso de risco no rodapé (conteúdo educativo, sem recomendação individual) | `src/components/SiteChrome.tsx` | esta |
| Validação | Suíte que confere o HTML gerado como um buscador o recebe | `tests/seo.dist.mjs`, `tests/run-browser.mjs` | esta |

## Dados estruturados

| Página | Tipos |
|---|---|
| `/` | Organization (nome, URL e logo) e WebSite (nome, URL e `pt-BR`) |
| Demais páginas públicas | BreadcrumbList (Início → página) |

Não usados, porque o conteúdo não sustenta:
- **Course:** as aulas não têm URL própria.
- **VideoObject:** ainda não há vídeos.
- **Article:** não há artigos.
- **Person:** não há autores identificados publicamente.
- **FAQPage:** o Google só mostra esse rich result para sites de governo e saúde.

## Rollback

- **Na Vercel:** Instant Rollback.
- **No código:** `git revert` do squash e nova PR.
