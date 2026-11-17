# Eixo C, C2: exclusões com prova (Pincel, 17/11/2026)

Brief: `docs/harness/briefs/eixoC-C2-pincel.md`. Procedimento: skill `code-quality`, `dead-code.md` (Step 0 a 4 e "Output when asked to remove dead code").
Branch `vitorrampazzi/ux-performance-2026-11-16`. Nada commitado, nada apagado fora da lista, nenhum `git checkout`, `stash` ou `reset`. Trabalho de 2A a 2F não commitado preservado.

## 1. Linha de base (antes de apagar)

Árvore como estava, antes de qualquer exclusão:

| Comando | Resultado |
|---|---|
| `npm run lint` | passou (exit 0) |
| `npx tsc -p tsconfig.app.json --noEmit` | passou (exit 0) |
| `npm test` | passou: 298 testes, 298 aprovados, 0 falhas |
| `npm run build` | passou (exit 0). `dist/assets`: 81 arquivos, 1.511.037 bytes |

Extra: `node --test tests/seo.dist.mjs` passou (9/9), sobre o `dist/` recém-gerado.

## 2. Prova por arquivo

**Detector.** Busca textual (ferramenta Grep e `grep`) em `src`, `server`, `tests`, `scripts`, `public`, `index.html`, `vercel.json`, `site-pages.mjs`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` e `package.json`. Para cada alvo: caminho de import (`/Nome`, `./Nome`, `pages/Nome`), símbolo exportado e forma de texto (rota, string, classe). Não contei acertos: li cada um, e descartei menção, texto e variável homônima.

**Calibração.** `SegmentedControl` aparece em `src/pages/Configuracoes.tsx:12,444` e em `src/components/RankingPreview.tsx:15,70` (antes da exclusão). O detector acha usos reais.

**Não feito:** `knip`, `ts-prune` e `noUnusedLocals` não foram rodados. Não instalei ferramenta, como pede o brief.

| # | Arquivo | Onde procurou | O que achou e descartou (`arquivo:linha`) | Veredito |
|---|---|---|---|---|
| 1 | `src/pages/Carteira.tsx` | `pages/Carteira`, símbolo `Carteira`, `carteira` em src, server, tests, scripts | Nenhum import fora do grupo. `src/App.tsx:190` é `<Navigate to="/app/ranking">`, não o componente. `src/components/NavigationIntent.tsx:31` mapeia a string `/app/carteira`. `src/components/EdivAssistant.tsx:60–552` e `src/lib/learningCatalog.ts:34` (id de aula) são texto. | morto com prova |
| 2 | `src/pages/Dashboard.tsx` | `pages/Dashboard`, símbolo `Dashboard`, `/dashboard` | Nenhum import fora do grupo. `tests/dividend.browser.mjs:723` é texto de nome de teste. `src/layouts/DashboardLayout.tsx` é outro arquivo, ativo, e fica. | morto com prova |
| 3 | `src/pages/Favoritos.tsx` | `pages/Favoritos`, símbolo `Favoritos`, `favoritos` | Nenhum import fora do grupo. `src/App.tsx:194` e `src/components/NavigationIntent.tsx:32` são redirecionamento de rota. `src/context/FavoritesProvider.tsx:8–37` usa a variável `favoritos`. `server/account-limits.js:25` é texto. | morto com prova |
| 4 | `src/components/PortfolioExtras.tsx` | nome e import | Só `src/pages/Carteira.tsx:14,258` (grupo 1). | morto com prova |
| 5 | `src/components/PortfolioPulse.tsx` | nome e import | Só `src/pages/Carteira.tsx:13,81` e `src/pages/Dashboard.tsx:10,88` (grupo 1). | morto com prova |
| 6 | `src/hooks/usePortfolio.ts` | nome e import | Só `src/pages/Carteira.tsx:17,45` (grupo 1). | morto com prova |
| 7 | `src/hooks/useFavoritos.ts` | nome e import | Só `src/pages/Favoritos.tsx:5,15` (grupo 1). `FavoritesProvider.tsx` não o importa. | morto com prova |
| 8 | `src/hooks/useMarketQuotes.ts` | nome e import | Só `src/pages/Favoritos.tsx:6,16` (grupo 1). `MarketQuotePanel` (de `LiveQuote`, usado em `PublicStock.tsx:7`) é outro símbolo. | morto com prova |
| 9 | `src/lib/portfolio.ts` | `lib/portfolio"` e símbolos (`typeLabels`, `formatQuantity`, `fetchPortfolio`) | Só o grupo 1: `PortfolioPulse.tsx:14`, `usePortfolio.ts:11`, `Carteira.tsx:24`, `Dashboard.tsx:6–7`. `server/portfolio.js` é o módulo do servidor e não importa o src. | morto com prova |
| 10 | `src/lib/portfolioInsights.ts` | `lib/portfolioInsights` | Só o grupo 1: `PortfolioPulse.tsx:11–12`, `Dashboard.tsx:9`. `server/portfolio-insights.js` e `tests/portfolio-insights.test.mjs` são a versão do servidor, e ficam. | morto com prova |
| 11 | `src/components/DividendDashboard.tsx` | nome, símbolo | Nenhuma ocorrência fora do próprio arquivo. | morto com prova |
| 12 | `src/components/ComparativeDividendChart.tsx` | nome e import | Só `DividendDashboard.tsx:18,379,430,503,537` (grupo 2). | morto com prova |
| 13 | `src/components/fundamental-center.css` | nome e classe `fundamental-center` | Só `DividendDashboard.tsx:19,253` (grupo 2). | morto com prova |
| 14 | `src/components/ScoreIndicator.tsx` | nome | Nenhuma fora do próprio arquivo. | morto com prova |
| 15 | `src/components/AlgoInsight.tsx` | nome | Nenhuma fora do próprio arquivo. | morto com prova |
| 16 | `src/data/mockData.ts` | `mockData`, `mockPortfolio`, `mockAssets`, `mockRecomendados` | Nenhuma fora do próprio arquivo. A pasta `src/data/` fica vazia; o git não a rastreia. | morto com prova |
| 17 | `src/pages/Autenticacao.tsx` | nome e `pages/Autenticacao` | Nenhuma. As telas de login são importadas direto de `./auth/...`. | morto com prova |
| 18 | `src/components/ResearchAvailability.tsx` | nome | Nenhuma fora do próprio arquivo. | morto com prova |
| 19 | `src/hooks/useResearchStatus.ts` | nome | Só `ResearchAvailability.tsx:1,4` (grupo 3). | morto com prova |
| 20 | `src/components/home/LearningTerms.tsx` | nome | Nenhuma fora do próprio arquivo. | morto com prova |
| 21 | `src/lib/publicHomeTerms.ts` | nome | Só `LearningTerms.tsx:4,30` (grupo 3). | morto com prova |
| 22 | `src/components/home/ReadingChecklist.tsx` | nome | Nenhuma fora do próprio arquivo. | morto com prova |
| 23 | `src/assets/hero.png` | `hero.png`, `assets/hero`, `url(` em CSS | Nenhuma em src (TSX, CSS, `index.html`, `public`, `scripts`). `tests/analytics.test.mjs:444` tem a palavra "hero" como valor de string. `scripts/prerender.mjs:109` é comentário. | morto com prova |
| 24 | `src/assets/vite.svg` | `vite.svg` | Nenhuma (inclusive `index.html` e `public`). | morto com prova |
| 25 | `src/assets/react.svg` | `react.svg` | Nenhuma. | morto com prova |
| 26 | `src/components/RankingPreview.tsx` | nome e `components/RankingPreview` | Só `src/components/home/AccountHomeContent.tsx:7,111`, editado no grupo 4. O único chamador de `HomeContent` é `src/pages/MemberHome.tsx:6` (`<HomeContent member />`), como na prova do C1. | morto com prova (depois da edição do grupo 4) |

Veredito: **os 26 arquivos são "morto com prova"**. Nenhum ficou "vivo" ou "não provado".

## 3. Apagado e editado, por grupo

Caminhos exatos, para a Chave montar os commits de exclusão. Cada grupo foi validado com `tsc` e `lint` antes do próximo.

**Grupo 1: Cluster A, carteira, painel e favoritos (10 arquivos, 2.530 linhas)**
- `src/pages/Carteira.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Favoritos.tsx`
- `src/components/PortfolioExtras.tsx`
- `src/components/PortfolioPulse.tsx`
- `src/hooks/usePortfolio.ts`
- `src/hooks/useFavoritos.ts`
- `src/hooks/useMarketQuotes.ts`
- `src/lib/portfolio.ts`
- `src/lib/portfolioInsights.ts`

**Grupo 2: Cluster B, painel fundamentalista antigo (3 arquivos, 1.467 linhas)**
- `src/components/DividendDashboard.tsx`
- `src/components/ComparativeDividendChart.tsx`
- `src/components/fundamental-center.css`

**Grupo 3: Cluster C, pequenos órfãos e imagens do modelo Vite (9 arquivos, 299 linhas, e 3 imagens)**
- `src/components/ScoreIndicator.tsx`
- `src/components/AlgoInsight.tsx`
- `src/data/mockData.ts`
- `src/pages/Autenticacao.tsx`
- `src/components/ResearchAvailability.tsx`
- `src/hooks/useResearchStatus.ts`
- `src/components/home/LearningTerms.tsx`
- `src/lib/publicHomeTerms.ts`
- `src/components/home/ReadingChecklist.tsx`
- `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/react.svg`

**Grupo 4: ramo não-membro da home da conta (1 exclusão, 1 edição, 151 linhas apagadas)**
- Apagado: `src/components/RankingPreview.tsx`
- Editado: `src/components/home/AccountHomeContent.tsx` (`git diff --numstat`: `1 2`). Diff exato:

```diff
-import { RankingPreview } from "../RankingPreview";
...
-        {member ? <MemberHomeBrand /> : <RankingPreview />}
+        <MemberHomeBrand />
```

A prop `member` e os demais ramos `member ? … : …` continuam como estavam (decisão do brief). Confirmado: `grep -rn "HomeContent" src tests scripts` mostra só `AccountHomeContent.tsx` e `MemberHome.tsx:6`.

**Grupo 5: linha de status nos 7 documentos (1 linha de texto, 3 linhas acrescentadas: em branco, status, em branco)**

| Documento | `git diff --numstat` |
|---|---|
| `docs/CARTEIRA-E-INSIGHTS.md` | `3 0` |
| `docs/CENTRAL-FUNDAMENTALISTA.md` | `124 121`, ver nota abaixo |
| `docs/DASHBOARD-DIVIDENDOS.md` | `3 0` |
| `docs/EVOLUCAO-2026-11-13.md` | `3 0` |
| `docs/HOME-PUBLICA.md` | `3 0` |
| `docs/IDENTIDADE-EDITORIAL.md` | `3 0` |
| `docs/REVISAO-VISUAL-ACOES.md` | `3 0` |

**Nota sobre `CENTRAL-FUNDAMENTALISTA.md` (desvio do brief).** No HEAD esse arquivo está commitado com CRLF (`git ls-files --eol`: `i/crlf`), e o `.gitattributes` manda `text eol=lf`. Os outros seis estão em LF. Por isso o `numstat` mostra o arquivo inteiro. Ignorando fim de linha (`git diff --numstat --ignore-cr-at-eol`), a mudança é `3 0`: as três linhas de status, e nada mais. Sem a mudança de fim de linha, qualquer edição nesse arquivo aparece inteira. Decisão para a Chave: ou commitar como está (o `git add` vai normalizar para LF e o commit reescreve o arquivo uma vez), ou normalizar esse arquivo em commit próprio, antes. Não normalizei, porque isso mudaria o arquivo além da linha de status.

Linhas de código removidas no total (`git diff --numstat` contra o HEAD): **4.447** (2.530 + 1.467 + 299 + 151). O C1 estimava 4.314.

## 4. Verificação depois

**Comandos e resultados** (rodados depois do grupo 4 e de novo depois dos docs):

| Comando | Resultado |
|---|---|
| `npm run lint` | passou (exit 0) |
| `npx tsc -p tsconfig.app.json --noEmit` | passou (exit 0) |
| `npm test` | passou: 298 de 298, 0 falhas |
| `npm run build` | passou (exit 0) |
| `node --test tests/seo.dist.mjs` | passou: 9 de 9, sobre o `dist/` novo |
| `git status --short` | 26 linhas ` D` (as 26 exclusões). Nenhum outro arquivo apagado |
| `grep -rnE` de nomes apagados em `src tests scripts server public index.html vercel.json site-pages.mjs vite.config.ts` | nenhum acerto |
| `node scripts/harness.mjs check` | "quadro válido; 4 papéis e reservas sem conflito" |

**Chunks e bytes.** O build "depois" tem 78 arquivos em `dist/assets`, contra 81 "antes". Bytes: 1.511.037 antes, 1.500.956 depois (−10.081 bytes, −0,7%).

Diferença na lista de nomes (sem hash):

| Movimento | Nome | Explicação |
|---|---|---|
| sumiu | `SegmentedControl.css`, `SegmentedControl.js` | Os dois eram compartilhados por `RankingPreview` (home) e por `Configuracoes`. Sem `RankingPreview`, restou um consumidor, e o Rollup juntou o módulo ao chunk de `Configuracoes`. `Configuracoes.tsx:12,444` continua usando. |
| sumiu | `use-reduced-motion.js` | Módulo do framer-motion. Ainda importado por `src/components/NotificationsMenu.tsx`, `src/components/SegmentedControl.tsx` e `src/layouts/DashboardLayout.tsx`. |
| sumiu | `scan-search.js` | Ícone do lucide-react. Ainda importado por `src/components/OrbitCoins.tsx:6,34,37`. |
| apareceu | `Configuracoes.css` | Consequência do item anterior: o CSS de `SegmentedControl` foi juntado ao chunk de `Configuracoes`. |

Explicação pela origem dos módulos. Não verifiquei o grafo do Rollup módulo a módulo. Nenhum módulo deixou de ser importado por código vivo. A queda de 10.081 bytes vem, provavelmente, de `RankingPreview.tsx` (que estava no bundle pela home da conta, via `MemberHome`) e do reagrupamento dos chunks; os outros órfãos não estavam no grafo e não mudam o bundle. Não separei essas duas parcelas.

**Capturas de `/app`.** Quatro combinações: 390 × 844 e 1280 × 800, claro e escuro. Playwright com o Chrome instalado (não instalei nada), `reducedMotion: "reduce"`, tema forçado pela chave `ediv-appearance-v1`, sessão simulada com usuário fictício (`Pessoa Teste (fictício)`, `teste@example.invalid`) via `page.route` (só em memória, nada gravado), e as demais `/api/*` respondendo 503.

- "Antes": `dist/` reconstruído a partir do estado pré-exclusão, numa cópia em scratchpad. Os 27 arquivos foram restaurados do HEAD (que era igual à árvore antes da exclusão). Validação do "antes": a lista de chunks e os 1.511.037 bytes são idênticos aos medidos no início.
- Resultado: as quatro capturas têm o mesmo hash SHA-256 antes e depois. Comparei os dois arquivos de 390 claro e 1280 escuro com `cmp`: idênticos byte a byte.
- Sem rolagem horizontal: `scrollWidth` igual a `clientWidth` (390 e 1280) nas quatro.
- Script descartável, fora do repositório: `C:\Users\vitor\AppData\Local\Temp\claude\d3173e2dd37df12c\a850f7a6-2f64-49ed-880d-bc25fce97512\scratchpad\capturas-app.cjs`.

**Git.** `git status --short` antes e depois: a diferença traz só as 26 exclusões, `AccountHomeContent.tsx` e os 7 docs. Nenhuma alteração em `server/`, `tests/`, `scripts/`, `public/`, `package.json`, `src/App.tsx`, `src/pages/MemberHome.tsx`, `src/pages/Home.tsx` ou `src/components/NavigationIntent.tsx`. O `qa-etapa2f-2026-11-17.md` em `docs/harness/relatos/` é de outro executor.

**Não executado:** os testes de navegador (`tests/*.browser.mjs`) não estão no brief e não foram rodados. A suíte com banco (`figma-stock`, `browser`, `company-center`) também não.

## 5. Sinalizado, não apagado

**CSS que pode ter sobrado.** Heurística: classes de `className="…"` nos arquivos apagados, com regra no CSS e sem uso no `src` restante. Pode ter perdido classes montadas dinamicamente.
- `src/index.css`: `ediv-research-start`, `favorite-card-enter`, `journey-preview`, `journey-scene`, `journey-signal`, `portfolio-empty`, `portfolio-value`.
- `src/components/home/public-sections.css`: `ph-checklist-footnote`, `ph-checklist-layout`, `ph-checklist-points`, `ph-term`, `ph-term-close-label`, `ph-term-control`, `ph-term-definition`, `ph-term-hint`, `ph-term-open-label`, `ph-term-summary`, `ph-terms`, `ph-terms-grid`.

**Documentos achados pelo `grep` do grupo 5 que não estão nos 7.** Nenhum em `docs/` no nível de topo. Além dos 7, o `grep` acha `docs/UX-PERFORMANCE-2026-11-16.md` (intocado, por regra) e vários arquivos de `docs/harness/` (briefs e relatos, intocados, por regra). Os trechos antigos citados (`docs/CENTRAL-FUNDAMENTALISTA.md:42`, `docs/DASHBOARD-DIVIDENDOS.md:81`) ficam como estão.

**Recomendação para fatia futura (não feito):** simplificar `member` e `awaitingRegistration` em `AccountHomeContent.tsx`. Os ramos `member ? … : …` das linhas 23–60 e 97–109 continuam. Hoje `member` é sempre verdadeiro (único chamador: `MemberHome.tsx:6`).

**`src/context/FavoritesProvider.tsx` e `src/context/favoritesContext.ts`.** Não apagados (fora da lista). O provedor é montado em `src/entry-server.tsx:4,36`. Com `useFavoritos.ts` apagado, ele ficou sem consumidor. Remover precisa tirar também a montagem em `entry-server.tsx`, o que está fora do escopo deste brief.

**`public/ediv-logo.png` e `public/ediv-logo-transparent.png`.** Não provados. Não analisei, por regra.

**Rotas e código de cotações do servidor.** Mantidos por contrato e teste, não tocados: `server/portfolio.js`, `server/portfolio-insights.js`, `server/market.js`, `tests/portfolio-insights.test.mjs`, `/api/portfolio*`, `/api/market/quotes`.

**Redirecionamentos.** `src/App.tsx:189–196` e `src/components/NavigationIntent.tsx:31–32` ficam como estão. `/app/carteira` e `/app/favoritos` redirecionam para `/app/ranking`. Não testei o redirecionamento no navegador.

**`src/data/`.** Pasta vazia após apagar `mockData.ts`. O git não a rastreia; não removi.

**`SegmentedControl.tsx`.** Ficou. Continua usado por `Configuracoes.tsx`.

## 6. Limites e próximo passo

**Limites:**
- Detector textual. Não rodei `knip`, `ts-prune` nem `noUnusedLocals`.
- Capturas: só `/app`, com sessão simulada, duas larguras e dois temas. Não capturei a home pública nem os redirecionamentos.
- Testes de navegador (`tests/*.browser.mjs`) não rodados.
- Chunks: a explicação dos quatro nomes que sumiram é pela origem dos módulos, não pelo grafo do Rollup.

**Próximo passo sugerido:**
1. Chave: decidir o caso do `CENTRAL-FUNDAMENTALISTA.md` (CRLF) antes de commitar o grupo 5.
2. Chave: 4 commits de exclusão, grupos 1, 2, 3 e 4, com os caminhos da seção 3; o grupo 4 leva a edição de `AccountHomeContent.tsx`. Commit à parte para os 7 docs do grupo 5.
3. Próxima fatia do Eixo C: limpar as 19 classes CSS sobreviventes (seção 5) e decidir `FavoritesProvider`/`favoritesContext` junto com `entry-server.tsx`.
