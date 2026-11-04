# Validação de SEO — 4 de novembro de 2026

## Testes automáticos

| Teste | O que confere | Resultado |
|---|---|---|
| `npm test` | Inclui `tests/site.test.mjs`: metadados, `noindex`, dados estruturados e datas `updated` | 137/137 |
| `tests/seo.dist.mjs` (novo, roda no CI depois do build) | Título, descrição única, canonical, `og:url`, robots e um único H1 por página pública; JSON-LD válido; `noindex` nas contas, na área logada e na 404; sitemap só com páginas públicas e datas reais; robots.txt; links internos sem destino quebrado | 5/5 |
| `tests/public-home.browser.mjs` | Home em 9 tamanhos de tela, títulos e navegação | 10/10 |
| `tests/public-rankings.browser.mjs` | Prévia pública, cadastro por teclado e página de ação | 10/10 |
| `tests/dividend.browser.mjs` e `tests/stock-theme.browser.mjs` | Ranking logado e temas | 10/10 e 6/6 |
| `npm run lint`, `tsc` e `npm run build` | — | Passam |

## Performance

| Medida | Antes | Depois | Como foi medido |
|---|---|---|---|
| CLS da home e de `/ranking` (desktop, produção) | 0,41 e 0,19 | 0,000 e 0,000 | Navegador, depois da PR #40 |
| CLS em celular (produção, antes) | 0,39 a 0,48 | — | Auditoria com celular emulado (CPU 4×, 4G lenta) |
| Prévia do ranking: espaço enquanto carrega e espaço final | 64 px → 975 px (celular) | 968 px → 975 px | Build local, Playwright |
| JS inicial da home (gzip) | 119 KB (com framer-motion) | 80,4 KB (sem framer-motion) | Assets de produção e build local |
| CSS e JS da primeira visita (gzip) | ~136 KB | 122 KB | Build local |
| LCP em celular (lab, antes) | 1,80 s (home); ~2,5 s em `/ranking`, `/aprender` e `/metodologia`, onde o maior elemento era o banner de cookies | A medir em produção | Auditoria com celular emulado |

## Indexabilidade

- **Públicas e indexáveis (sitemap com `lastmod` real):** `/`, `/ranking`, `/aprender`, `/glossario`, `/assessoria`, `/privacidade`, `/suporte` e `/metodologia`.
- **Fora do índice (`noindex, nofollow`):** `/entrar`, `/cadastro`, `/verificar`, `/recuperar-senha`, `/redefinir-senha`, `/app/*`, `/ranking/acao/*` (até a decisão sobre páginas públicas) e a 404.
- **Bloqueado no robots.txt:** `/api/`, `/app`, `/verificar` e `/redefinir-senha`.

## Produção (PR #40, verificado em 4/11)

- Home com JSON-LD de Organization e WebSite.
- `/entrar` sem `og:url`.
- `/ranking/` responde 308 para `/ranking`.
- `/assets/*` com `max-age=31536000, immutable`.
- CSP com `*.analytics.google.com`.
- Console sem erros, além do 401 esperado de `/api/auth/me` para visitantes.

## Pendências e riscos

- **Indexação:** enviar o sitemap não garante indexação. As 4 páginas "descobertas, não indexadas" dependem do tempo e de links externos.
- **Dados de campo:** o Search Console ainda não tem dados de Core Web Vitals.
- **Validadores do Google:** o Rich Results Test e o Schema Markup Validator não foram rodados nesta sessão. O JSON-LD segue os tipos do schema.org e é validado como JSON no teste automático.
