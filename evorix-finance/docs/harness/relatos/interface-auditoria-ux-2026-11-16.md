# Auditoria de UX, animação e performance da interface (16/11/2026)

Autor: Pincel (interface). Etapa 1A do plano em `docs/UX-PERFORMANCE-2026-11-16.md`. Só leitura de código. Nenhum arquivo de `src/`, `public/`, `server/`, `tests/`, `package.json` ou `package-lock.json` foi alterado. Build não foi rodado. Medições de tamanho vêm de `dist/` existente (build de 16/11, árvore de 5613939/3ca56b9) e de `gzip -c` local.

Limites desta auditoria:
- Sem navegador: não medi LCP, CLS, tamanho de alvo em pixels nem renderização. Onde a prioridade depende disso, está marcado como "não medido".
- Sem API local: seções que dependem de dados ficam só como análise de código.
- A nota "Contexto Escola" não foi localizada nesta sessão. As regras aplicadas são as da brief (seções 3 e 4 citadas) e as do papel de interface.

## 1. Achados

Princípios usados: os nove citados pelo dono (Snappy Timing, Slow In & Slow Out, Exaggerated Feedback, Anticipation, Fitts, Hick, Jakob, Doherty, Postel). Não usei outro princípio.

| arquivo:linha | problema observado | princípio | mudança proposta | ganho esperado | risco | prioridade |
|---|---|---|---|---|---|---|
| `src/components/NavigationIntent.tsx:49-50` | Ao focar ou passar o mouse sobre um link para `/ranking/acao/:ticker`, o código pré-carrega `pageImports.stockResearch` (chunk `StockResearch-*.js`, 136,9 kB gzip). Isso vale também para visitante anônimo. Em `src/pages/PublicStock.tsx:38`, o anônimo recebe `PublicCompany`, não `StockResearch`. O download é desperdiçado. | Doherty (só antecipar o que o usuário vai usar) | Pré-carregar `stockResearch` só quando houver usuário logado. Para anônimo, não pré-carregar. | Evita ~137 kB gzip por intenção em visitante anônimo. | Logado perde nada, porque mantém a pré-carga. Anônimo que chega a uma página logada pagaria o carregamento normal. | P1 |
| `src/components/home/PublicHeroBrand.tsx:43-55` e `public/ediv-logo-clean.png` | O herói da home usa o PNG de 138.503 bytes (512×512, RGBA). Ele é exibido em 508×503 e aparece em duas `<img>` com a mesma `src`. É o primeiro conteúdo visível da home. | Doherty (primeira resposta visual) | Gerar versão menor do mesmo logo (WebP ou PNG otimizado) com dimensão próxima do dobro da exibida para tela de alta densidade. Só converter depois de medir. | Não medido. Estimativa: redução grande de bytes no caminho crítico da home. | Qualidade visual em tela de alta densidade. Precisa de conferência visual em 320, 768 e 1280. | P1 |
| `src/layouts/DashboardLayout.tsx:259`, `:286`, `:322` | Links e botões do menu lateral usam `min-h-10` (40 px). A regra da brief pede 44×44 px em toque. Não confirmei no navegador se esse menu fica aberto em 320–390 px. | Fitts (alvo pequeno custa mais toques) | Trocar `min-h-10` por `min-h-11` nesses três itens. | Alvo de toque dentro do mínimo de 44 px. | Menu fica um pouco mais alto. | P1 (confirmar no navegador) |
| `src/components/PageContent.tsx:6-29` (`PageLoading`) | Fallback de toda rota. São barras pulsando de forma genérica, mais o texto "Abrindo página…". As barras não têm a forma do conteúdo final. | Doherty (feedback imediato, sem salto) | Skeleton por rota (ranking, empresa, aulas), com as dimensões do conteúdo final. | Menos salto de layout ao trocar de página. CLS não medido. | Skeleton não pode mostrar zero no lugar de dado ausente. | P2 |
| `src/index.css:299-301` e inventário da seção 2 | Durações de 140, 150, 160, 180 e 250 ms repetidas em muitos arquivos sem token. A mudança de cor e transform usa `140ms` literal ao lado de `var(--ediv-ease)`. | Snappy Timing (respostas curtas e iguais) | Criar tokens de duração (seção 2) e trocar os literais. | Consistência. Sem ganho de desempenho. | Baixo. Só mudar valor se o visual for conferido. | P2 |
| `src/components/SegmentedControl.tsx:46-53` | O indicador usa `motion.span` do framer-motion (spring, 0,28 s) e `useReducedMotion`. Está bem tratado. Carrega o chunk framer só onde o componente aparece: `/app` (`src/components/home/AccountHomeContent.tsx:111`) e `Configuracoes`. A home pública não o carrega (seção 7). | Slow In & Slow Out (transição de seleção) | Manter. Se os tokens forem criados, usar a duração do token. | Pequeno. | Trocar por CSS mudaria a animação. | P3 |
| `src/components/PortfolioPulse.tsx:148` | `animate-spin` sem `motion-reduce:animate-none`. Em `src/components/PageState.tsx:32` o mesmo spinner tem a regra. | Jakob (o padrão do próprio app é a regra com `motion-reduce`) | Adicionar `motion-reduce:animate-none`. | Consistência de movimento reduzido. | Nenhum. | P3 |

## 2. Durações e easings

Inventário em `src/` (CSS e TSX), contagem de ocorrências:

Durações literais: 140 ms (8), 160 ms (7), 150 ms (7), 250 ms (4), 180 ms (4), 120 ms (3), 65 ms (2), 220 ms (2), 260 ms (2), 350 ms (2), 0 ms (5). Longas e infinitas, decorativas: 3 s, 3,6 s, 3,8 s, 5 s, 6 s, 7,5 s, 16 s, 18 s (`src/index.css:244` e linhas 613–696; `src/components/home/teaching-journey.css`).

Easings:
- `var(--ediv-ease)`: 5 usos (`src/index.css:301, 457`). É o único token de movimento que existe, em `src/index.css:34`.
- `cubic-bezier(0.2, 0, 0, 1)`: 2 usos (`src/index.css:270, 278`).
- `cubic-bezier(0.22, 1, 0.36, 1)`: 4 usos (`src/index.css:814`, `src/components/learning-workspace.css`, `src/components/home/public-home.css`, `src/components/home/hero-brand.css`).
- `cubic-bezier(0.2, 0.65, 0.3, 1)`: 1 uso (`src/index.css:340`).
- `ease-out`: `src/components/learning-workspace.css` (8), `src/components/navigation-chrome.css` (4), `src/index.css` (3).
- `ease-in-out`: `src/index.css` (4), `src/components/home/teaching-journey.css` (1).

Proposta de tokens em `src/index.css` (para a etapa 2.1; não editar agora):
```
--ediv-dur-fast: 140ms;    /* hover, foco, cor */
--ediv-dur-base: 180ms;    /* menus, abas, cards */
--ediv-dur-slow: 260ms;    /* entrada de página */
--ediv-ease: cubic-bezier(0.2, 0.8, 0.2, 1);      /* já existe */
--ediv-ease-out: cubic-bezier(0.2, 0, 0, 1);      /* entradas */
--ediv-ease-emphasis: cubic-bezier(0.22, 1, 0.36, 1); /* destaque */
```
Manter as durações longas decorativas fora dos tokens. Elas já são cobertas pela regra global (seção 3).

## 3. Reduced motion

A regra global existe em `src/index.css:817-826`. Ela zera `animation-duration` e `transition-duration` para `*` e `*::before/::after`, e fixa `animation-iteration-count: 1`. Assim, qualquer animação ou transição em CSS fica coberta, mesmo sem regra local.

Sem regra local e sem checagem em JS, mas cobertas pela regra global: `src/components/AlgoInsight.tsx`, `src/components/Card.tsx`, `src/components/GettingStarted.tsx`, `src/components/MobileDisclosure.tsx`, `src/components/RankingHighlights.tsx`, `src/components/segmented-control.css`, `src/components/stock-make/StockMake.tsx`, `src/components/stock-make/ui.tsx`, `src/components/support/ConversationInbox.tsx`, `src/components/support/SupportHelpCenter.tsx`, `src/pages/Aprender.tsx`, `src/pages/Favoritos.tsx`, `src/pages/Perfil.tsx`, `src/pages/Carteira.tsx`, `src/pages/auth/LoginPage.tsx`, `src/pages/auth/RegisterPage.tsx`.

Animações em JS (framer-motion) com checagem: `SegmentedControl.tsx:21` (`useReducedMotion`), `NotificationsMenu.tsx` (2 checagens), `layouts/DashboardLayout.tsx` (4 checagens). Estão tratadas.

Gap real: `src/components/PortfolioPulse.tsx:148` (`animate-spin` sem `motion-reduce`). Ver achado da seção 1.

## 4. Áreas de toque

- Confirmado em código abaixo de 44 px: `src/layouts/DashboardLayout.tsx:259`, `:286` (`min-h-10`, 40 px) e `:322` (`min-h-10`).
- Dentro do mínimo: `src/components/SiteChrome.tsx:109` e `:351` (`min-h-11`), `src/components/LearningVideo.tsx:97,101` (`min-h-11`), `src/layouts/DashboardLayout.tsx:297`, `:523` (`min-h-11`).
- Não verificado: botões só com ícone em `src/components/SiteChrome.tsx:175` (sem classe de tamanho na amostra), botão de abrir menu e fechar. Exige medição no navegador em 320–390 px. Não medido.
- Itens `h-8 w-8`/`h-9 w-9` são imagens (logo), não alvos: `DashboardLayout.tsx:469`, `SiteChrome.tsx:260`.

## 5. Skeletons

- `src/components/PageContent.tsx:6-29` (`PageLoading`): fallback de toda rota. Já tem barras pulsando com `motion-safe:animate-pulse`. Não tem a forma do conteúdo final. Texto "Abrindo página…" com `role="status"`.
- Spinner: `src/components/PageState.tsx:32` (`animate-spin motion-reduce:animate-none`, com regra), `src/components/PortfolioPulse.tsx:148` (sem regra).
- Só texto, sem skeleton, com risco de salto de layout: `src/components/home/ResearchSample.tsx:49` ("Carregando ranking publicado…"), `src/components/RankingHighlights.tsx:188` ("Carregando publicação…"), `src/components/stock-make/HistoryCharts.tsx:48` ("Carregando histórico desta empresa…"), `src/components/support/ConversationInbox.tsx:129`, `src/components/support/ConversationPanel.tsx:89`, `src/components/NotificationsMenu.tsx:141`.
- Estados que o skeleton precisa respeitar: erro (com recuperação), vazio, e dado ausente mostrado como "não informado" ou "indisponível". Nunca zero. Para ranking e página da empresa, a forma final tem cartões de indicadores com número, gráfico e legenda. Medidas exatas não obtidas (sem navegador).

## 6. Imagens

| Imagem | Onde | Tamanho do arquivo | Dimensão natural | Dimensão exibida | width/height | loading | decoding |
|---|---|---|---|---|---|---|---|
| `/ediv-logo-clean.png` | `home/PublicHeroBrand.tsx:43` e `:52` | 138.503 B | 512×512 | 508×503 | sim (508, 503) | não definido | async |
| `/ediv-icon-clean-192.png` | `SiteChrome.tsx:89`, `:256`; `layouts/DashboardLayout.tsx:372`, `:465`; `auth/AuthShell.tsx:22` | não medido | não medido | 40 px (`h-10 w-10`) e 36 px (`h-9 w-9`) | não | não definido | não definido |
| `CompanyLogo` | `src/components/CompanyLogo.tsx:22-30` | variável | variável | `size` | sim | `lazy` (padrão) | async |
| `/ediv-hero-forest.webp` (fundo CSS) | `src/components/home/public-home.css:136` | 29.104 B | 1774×887 | fundo `cover` | não aplicável | não aplicável | não aplicável |

Achados:
- O herói da home é o maior ganho (ver seção 1). Não há `loading` no logo, o que é correto para imagem acima da dobra.
- Ícone de 192 px exibido em 40 px: é pequeno, mas tem bytes que não medi. Converter só depois de medir.
- `public/og-escola-do-dividendo.png` (1,3 MB) é só para redes sociais. Não está nas páginas, não entra nesta lista.
- Converter sem medir não é recomendado. Ganho estimado, não medido.

## 7. JavaScript por página

Método: `dist/index.html` (entrada e `modulepreload`), grafo de imports estáticos e dinâmicos a partir de `src/`, e referências no `dist/assets/`.

- `dist/index.html` carrega `index-CTmHMFT2.js` (83,3 kB gzip) e `jsx-runtime-Cy3KXmQz.js` (17,4 kB gzip) em toda página.
- Página `/` (home pública, `components/home/PublicHome.tsx`, chunk `Home-CAkMr9q1.js`, 5,2 kB gzip): o grafo não alcança `SegmentedControl`, `RankingPreview` nem `framer-motion`.

Respostas às confirmações da brief:

(a) A home baixa o chunk do framer-motion por causa de `SegmentedControl` em `RankingPreview`? **Não, para a home pública (`/`).** `RankingPreview` aparece só em `src/components/home/AccountHomeContent.tsx:7` e `:111`, usado por `src/pages/MemberHome.tsx`, ou seja, na área logada (`/app`). Na home pública o framer não entra. A lista de `deps` de `index-CTmHMFT2.js` contém `use-reduced-motion-Cu8INE8G.js` e `SegmentedControl-DMfomocq.js`, mas são dependências de imports dinâmicos de rotas logadas. Não são baixadas em `/`. Troca por CSS: possível, mas sem ganho na home pública. Só faz sentido para `/app`.

(b) `recharts` entra só na página da empresa? **Sim, pelo chunk.** A string de `recharts` (heurística `ResponsiveContainer|recharts`) aparece só em `dist/assets/StockResearch-BaarZCF0.js` (484,3 kB bruto, 135,5 kB gzip). Imports diretos de `recharts` estão em `components/ComparativeDividendChart.tsx`, `components/PortfolioExtras.tsx`, `components/stock-make/Charts.tsx`, `components/stock-make/HistoryCharts.tsx`, todos alcançados só via `StockResearch`.

(c) `PublicStock` puxa `StockResearch` (137 kB gzip)? **Não para o visitante anônimo ao renderizar, mas sim no pré-carregamento.**
- `src/pages/PublicStock.tsx:22-25` importa `StockResearch` de forma dinâmica. Em `:38`, `user ? <StockResearch /> : <PublicCompany />`. O visitante anônimo não baixa esse chunk ao renderizar.
- `src/components/NavigationIntent.tsx:49-50` pré-carrega `stockResearch` ao focar ou passar o mouse sobre `/ranking/acao/:ticker`, sem checar login. Esse é o caso real de download desperdiçado (achado P1 da seção 1).
- O chunk `PublicStock-DH8Nc2a7.js` (8,4 kB bruto) não referencia `StockResearch-*.js`.

Chunks de página (gzip, medido com `gzip -c` sobre `dist/`):
- `use-reduced-motion-Cu8INE8G.js` (framer-motion): 39,5 kB.
- `StockResearch-BaarZCF0.js`: 135,5 kB.
- `Home-CAkMr9q1.js`: 5,2 kB.
- `PublicStock-DH8Nc2a7.js`: 3,1 kB.
- `IncomeRanking-BlBf1Eld.js`: 17,6 kB.

Observação: os números do plano (84,3 e 136,9 kB) diferem um pouco dos que medi (83,3 e 135,5 kB). A diferença vem de unidades (kB decimal ou KiB). Use o plano como referência do Orquestrador.

## 8. Requisições duplicadas

Endpoints mais usados em `src/` (contagem de ocorrências do literal): `/api/auth/me` (3), `/api/learning` (3), `/api/portfolio/activity` (2), `/api/rankings/*`, `/api/market/quotes`, `/api/favorites`, `/api/portfolio`, `/api/notifications`, `/api/support/*`.

| Hook ou store | Endpoint | Quem usa | Requisição duplicada? |
|---|---|---|---|
| `usePolledStore` (`src/hooks/usePolledStore.ts`) + `usePublicRanking` (`src/hooks/usePublicRanking.ts:20`, `/api/rankings/public`) | `/api/rankings/public` | `src/components/home/ResearchSample.tsx:25`, `src/pages/PublicStock.tsx:58` | Não. Uma store compartilhada faz uma requisição por ciclo para todos os leitores. Coberto por `tests/polled-store.test.mjs:65` ("one request per cycle for every reader"). |
| `useRankingMarket` (`src/hooks/useRankingMarket.ts:27`, store por `user.id`) | `/api/rankings/market` | `RankingHighlights.tsx:87`, `stock-make/StockMake.tsx:924`, `pages/IncomeRanking.tsx:108` | Não, pela mesma store. Não medi se as três montagens na mesma tela deduplicam por chave: confirma só por leitura. |
| `useLiveQuotes` (`src/hooks/useLiveQuotes.ts:38-39`, `quoteStore(symbol)`) | cotação por símbolo | `MarketQuotePanel` (`src/components/LiveQuote`) | Não. Chave por símbolo. |
| `useMarketQuotes` (`src/hooks/useMarketQuotes.ts:17-72`) | `/api/market/quotes?symbols=` | `src/pages/Favoritos.tsx:16` | Não é duplicata. `Promise.all([work(), work()])` (`:55`) são dois trabalhadores que dividem lotes de 8 símbolos. A chave é a lista de símbolos (`:18`). Ponto de atenção: o resultado `result` é preenchido em ordem de chegada, então a ordem pode variar. |
| `useNotifications` (`src/hooks/useNotifications.ts:45`) | notificações | `NotificationsMenu.tsx:28` | Não medido se há polling. Não verificado nesta etapa. |
| `AuthProvider` (`src/context/AuthProvider.tsx:155`, `:295-310`) | `/api/auth/me` (3 usos) | toda a app | Não há objeto novo a cada render: o `value` está em `useMemo` com dependências explícitas. Confirmar por leitura se as três chamadas de `/api/auth/me` são do mesmo fluxo. Não medido. |

Renders desnecessários evidentes: não encontrei efeito sem dependência correta nos hooks lidos. Não rodei o React Profiler (sem navegador), então isso não é conclusivo.

## 9. Recomendações

1. **Etapa 2.5 (rede, não é tela).** Pré-carregar `stockResearch` só com usuário logado em `src/components/NavigationIntent.tsx:49-50`. Aceite: em janela anônima, passar o mouse sobre `/ranking/acao/<ticker>` não baixa nenhum `StockResearch-*.js` (conferir na aba Rede). Logado mantém a pré-carga.
2. **Etapa 2.4.** Logo do herói: gerar versão menor de `public/ediv-logo-clean.png` (138.503 B) e apontar `src/components/home/PublicHeroBrand.tsx:43` e `:52` para ela. Aceite: arquivo menor, aparência igual em 320, 768 e 1280 px, claro e escuro, sem salto de layout.
3. **Etapa 2.1.** Criar os tokens da seção 2 em `src/index.css`, perto de `--ediv-ease` (`:34`). Trocar os literais de 140, 150, 160 e 180 ms dos arquivos com mais ocorrências (`src/index.css`, `src/components/learning-workspace.css`, `src/components/navigation-chrome.css`). Aceite: `grep` de durações literais cai, e a interface não muda visualmente.
4. **Etapa 2.1.** Alvos de toque: trocar `min-h-10` por `min-h-11` em `src/layouts/DashboardLayout.tsx:259`, `:286` e `:322`. Aceite: medição de 44 px ou mais em 390 px de largura, no navegador.
5. **Etapa 2.3.** Skeleton por rota em `src/components/PageContent.tsx` (`PageLoading`), com formas de ranking, empresa e aulas. Aceite: nenhum salto de layout ao trocar de página (CLS medido pelo Vigia) e nenhum zero no lugar de dado ausente.
6. **Etapa 2.3.** Trocar os textos "Carregando…" de `RankingHighlights.tsx:188` e `ResearchSample.tsx:49` por skeleton com a mesma altura do conteúdo. Aceite: altura igual antes e depois do carregamento.
7. **Etapa 2.4.** Dimensões explícitas nos ícones de 192 px: `src/components/SiteChrome.tsx:89`, `:256`, `src/layouts/DashboardLayout.tsx:372`, `:465`, `src/components/auth/AuthShell.tsx:22`. Aceite: `width` e `height` presentes e CLS igual ou menor.
8. **Etapa 2.1.** Consistência de movimento reduzido: `motion-reduce:animate-none` em `src/components/PortfolioPulse.tsx:148`. Aceite: com `prefers-reduced-motion`, o spinner não gira.

## Validação

- `grep -cE "^## [1-9]\." docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`: **9** (passou).
- `git status --short -- src public server tests package.json package-lock.json`: só `?? tests/perf-baseline.mjs`, arquivo do Vigia criado em paralelo (esperado pela brief; nenhuma alteração do Pincel).
- `node scripts/harness.mjs check`: "quadro válido; 4 papéis e reservas sem conflito", saída 0 (passou).
- `npm run build`: não rodado (proibido pela brief).
- Testes de navegador: não executados (sem navegador nesta etapa).
