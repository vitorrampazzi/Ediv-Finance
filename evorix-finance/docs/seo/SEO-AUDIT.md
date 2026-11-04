# Auditoria de SEO — 4 de novembro de 2026

## Arquitetura vista pelos buscadores

- **Stack:** React 19 + Vite, sem SSR por requisição. As 8 páginas públicas são pré-renderizadas no build (`scripts/prerender.mjs`, `site-pages.mjs`) e servidas como HTML estático pela CDN da Vercel.
- **Área logada:** `/app/*` e as páginas de ação (`/ranking/acao/:ticker`) recebem `app.html`, um HTML sem conteúdo e com `noindex`.
- **Bloqueio no robots.txt:** `/api/`, `/app`, `/verificar` e `/redefinir-senha`.
- **Já estava correto:** `lang="pt-BR"`, canonical e descrição únicas por página pública, um H1 por página, `noindex` nas páginas de conta, 404 real, redirecionamentos 308 (www → raiz, http → https, `/login` → `/entrar`) e sitemap enviado e processado no Search Console.

## Search Console (domínio escoladodividendo.com.br)

- **Indexadas:** 4 páginas.
- **Fora do índice:** 8 páginas.
  - Descobertas, mas ainda não rastreadas: `/aprender`, `/assessoria`, `/glossario` e `/privacidade`. Isso é comum em site novo com poucos links externos.
  - Excluída de propósito pela tag `noindex`: `/cadastro`.
  - Redirecionamento: 1.
  - Rastreada, mas não indexada: 1.
- **Cliques vindos do Google:** 0 no período.
- **Core Web Vitals:** sem dados, por falta de tráfego suficiente.
- **Melhorias (dados estruturados):** nenhuma detectada.

## Problemas encontrados

| # | Problema | Evidência | Impacto | Prioridade | Situação |
|---|---|---|---|---|---|
| 1 | Página de cada ação é um "shell" vazio | `/ranking/acao/TIMS3` serve `app.html`: 2 KB, `noindex`, sem H1 | Nenhuma busca por ticker chega ao site | Alta | Depende de decisão do dono (quais empresas podem ser públicas) |
| 2 | O layout pula ao carregar | CLS de 0,39 a 0,48 no celular. O HTML pré-renderizado era trocado pela tela "Abrindo página…" | Core Web Vitals ruins | Alta | Corrigido (PR #40) |
| 3 | Nenhum dado estruturado | Nenhum JSON-LD nas páginas | Marca e trilha não aparecem para o Google | Média | Corrigido (PR #40) |
| 4 | LCP no limite no celular | O banner de cookies era o maior elemento e só aparecia depois da checagem de sessão (cerca de 2,5 s). Além disso, havia ~40 KB de biblioteca de animação no JS inicial, a fonte não era pré-carregada e a foto do herói carregava tarde | LCP no limite de 2,5 s | Média | Corrigido (esta PR) |
| 5 | Prévia do ranking vazia para o Google | Ela vem de `/api/rankings/public`, que o robots.txt bloqueia, então o Google vê "Carregando…" | Conteúdo principal invisível na renderização | Média | Pendente (junto com o item 1) |
| 6 | Títulos de aba idênticos | `<title>Escola do Dividendo</title>` em todas as páginas, por decisão do dono | O Google tem menos sinal sobre cada página | Média | Depende de decisão do dono |
| 7 | GA4 sem eventos nem campanhas | Nenhum evento personalizado, e os `utm_*` eram descartados | Impossível medir funis e origens | Média | Corrigido (PR #40) |
| 8 | Sem aviso de risco visível | Nenhum texto sobre a natureza educativa do conteúdo | Confiabilidade (YMYL) | Média | Corrigido (esta PR) |
| 9 | `/ranking/` duplicava `/ranking` | Resposta 200 com barra final | Conteúdo duplicado | Baixa | Corrigido (PR #40) |
| 10 | `og:url` vazio | Páginas de conta e 404 | Prévias sociais inconsistentes | Baixa | Corrigido (PR #40) |
| 11 | Sitemap sem `lastmod` | Só `<loc>` | O Google não sabe o que mudou | Baixa | Corrigido (esta PR), com datas reais |
| 12 | `/assessoria` órfã | Sem link no topo, no rodapé ou na home | Pouco rastreável | Baixa | Depende de decisão do dono |
| 13 | Página "Sobre" com responsáveis reais | Não existe | Confiabilidade (E-E-A-T) | Média | Precisa de informações reais do dono |
