# UX, animações, performance e organização — registro da missão (16/11/2026)

Registro de acompanhamento da missão pedida pelo dono em 16/11/2026. Orquestrador
planeja e aprova; Pauta escreve os briefs; Pincel (interface), Tijolo (backend),
Vigia (QA), Lupa (revisão) e Chave (release) executam. Fonte de regras: nota
"Contexto Escola", `docs/harness/CONTEXTO.md`, `docs/COTACOES.md`,
`docs/MARGEM-E-HISTORICO.md` e `docs/HOME-E-GRAFICOS-2026-11-10.md`.

## 1. Diagnóstico inicial (feito pelo Orquestrador)

### Repositório e trabalho preservado

- Raiz Git: `C:/Users/vitor/Evorix-finance`; projeto Node em `evorix-finance/`.
- Branch aberta: `vitorrampazzi/evolucao-2026-11-13` (3ca56b9). Conteúdo idêntico ao
  de `origin/main` (5613939, PR #51 com squash): `git diff origin/main HEAD` vazio.
- Alterações não commitadas, do dono, preservadas e fora do escopo desta missão:
  `evorix-finance/.gitignore` (+`.vercel`), `evorix-finance/docs/harness/state.json`
  (quadro do harness), e não rastreados `.gitignore` da raiz, `.maestri/` e
  `docs/estrategia_escola_do_dividendo.pdf`. Nada disso entra em commit sem pedido.
- Outros worktrees, não tocados: `.codex/worktrees/11a6` (164 alterações locais),
  `.claude/worktrees/orquestrador-escola-dividendo-41e013` (3 docs alterados),
  `angry-bose-5abdcb` e `nervous-chebyshev-3be85e` (limpos).
- Quadro do harness: quatro papéis em `concluido`, sem reservas antes desta missão.

### Já pronto (não refazer)

- Lazy loading por rota (`src/lib/lazyPage.ts`, `src/App.tsx`), CLS 0,41 → 0 no
  desktop em produção (PR #40); `/assets/*` com cache imutável (`vercel.json`).
- Cache de cotações (`provider_cache` no MySQL + memória do processo, deduplicação e
  teto diário em `server/market/quote-service.js`), limites próprios em `/api/market`
  (PR #50), cache do ranking público e limitador geral (PR #39).
- `brapi-provider.js` já usa `AbortSignal.timeout` por tipo de chamada e lê
  `Retry-After`.
- `prefers-reduced-motion` já tratado em ~20 arquivos (CSS da home, navegação,
  ranking, empresa, aulas, notificações, `SegmentedControl`).
- Tema claro padrão, tooltips em camadas (`src/lib/indicatorDefinitions.ts`),
  títulos por página, eventos GA4 em lista fechada (PR #51).

### Fatos medidos antes de qualquer mudança

Build de produção (`npm run build`, árvore igual a 5613939), 16/11:

| Arquivo | gzip | bruto | Observação |
|---|---|---|---|
| `index-*.js` (entrada) | 84,3 kB | 266,7 kB | carregado em toda página pública |
| `jsx-runtime-*.js` | 17,6 kB | 49,2 kB | pré-carregado em toda página pública |
| `StockResearch-*.js` | 136,9 kB | 484,3 kB | página da empresa (inclui gráficos) |
| `use-reduced-motion-*.js` (framer-motion) | 40,0 kB | 123,3 kB | usado por `SegmentedControl`, `NotificationsMenu`, `DashboardLayout`; `SegmentedControl` aparece em `RankingPreview` (home) |
| `IncomeRanking-*.js` | 17,8 kB | 59,6 kB | ranking |
| `Aprender-*.js` | 12,2 kB | 42,3 kB | aulas |
| `Home-*.js` | 5,2 kB | 16,5 kB | home pública |

- 68 arquivos JS em `dist/assets` (1,5 MB brutos no total).
- Movimento: só existe o token `--ediv-ease` em `src/index.css`; não há token de duração.
- Nenhum skeleton no código; o fallback das rotas é `PageLoading` (`src/components/PageContent.tsx`).
- Imagens: `public/ediv-logo-clean.png` (138 kB) no herói da home
  (`PublicHeroBrand.tsx`); `public/og-escola-do-dividendo.png` (1,3 MB, só para redes
  sociais); `<img>` em 5 arquivos a conferir quanto a `width`/`height`.
- Maiores arquivos de interface: `StockMake.tsx` (1052 linhas), `IncomeRanking.tsx`
  (955), `Aprender.tsx` (950), `stock-make/Charts.tsx` (916).
- Pendências herdadas que tocam esta missão: framer-motion fora do pacote inicial,
  textos próprios em `DividendDashboard.tsx`, teste em 320 px com reduced-motion,
  aviso de cookies cobrindo o botão do herói em 390 px, índices (notificações não
  lidas, suporte por `updated_at`, lista de usuários do admin).

### Skill de organização

O dono citou "antagle code base". Não há skill com esse nome (nem "untangle")
instalada. Correspondências mais prováveis: `zizi-skills:code-quality` (código morto
com prova antes de apagar, duplicação, desenho de módulos) e `engineering:tech-debt`
(classificar e priorizar dívida técnica). **Decisão do dono (16/11):** usar
`zizi-skills:code-quality` no Eixo C.

### Medição em produção

**Decisão do dono (16/11):** o Vigia pode medir as páginas públicas de produção, só
leitura (GET de páginas públicas, sem login, sem formulário, até 3 cargas por página),
além da medição local.

## 2. Plano

Entregas pequenas e verificáveis. Fluxo de cada uma: Orquestrador → Pauta (brief) →
executor → Lupa → Vigia → Orquestrador → dono. No máximo dois executores editando em
paralelo, sempre em arquivos separados e reservados no quadro.

### Etapa 1 — Auditoria e medição de base (só leitura)

| Id | Quem | Entrega |
|---|---|---|
| 1A | Pincel | Auditoria de UX, animação e performance da interface, com achados por arquivo e linha e o princípio de cada proposta |
| 1B | Tijolo | Auditoria de consultas (N+1, colunas, paginação), cache, APIs externas, índices e dependências |
| 1C | Vigia | Métricas de base (requisições, JS por página, LCP e CLS) e estado inicial de lint, testes e TypeScript |
| 1D | Chave | Branch de trabalho a partir de `origin/main`, preservando as alterações do dono |

### Etapas seguintes (provisórias, detalhadas depois da Etapa 1)

- 2.1 Tokens de duração e easing + microinterações base (botões, cards, abas, menus).
- 2.2 framer-motion fora das páginas públicas, se a auditoria confirmar o carregamento na home.
- 2.3 Skeletons contextuais (ranking, página da empresa, aulas).
- 2.4 Imagens do herói e `<img>` com dimensões explícitas.
- 2.5 Correções de backend apontadas na 1B (consultas, payload, política de APIs externas, cache público).
- 2.6 Organização do código pela skill confirmada pelo dono.

Decisões já tomadas pelo Orquestrador:

- Redis só entra com evidência de carga que o cache atual não sustente. A medição de
  04/11 (200 pessoas simultâneas, p95 174 ms) não justifica.
- Índice novo só com consulta real e plano de execução em MySQL descartável. Migração
  nova é numerada (010+), não altera dado, e só é aplicada em produção com
  autorização explícita do dono.
- Atualização otimista só em ação de baixo risco (favoritar, preferências), com rollback.

## 3. Andamento

(atualizado a cada etapa)

- 16/11 — Briefs da Etapa 1 escritos pelo Pauta em `docs/harness/briefs/etapa1-*.md` e
  revisados pelo Orquestrador (ajustes: `--no-track` na branch, lista de princípios,
  credenciais do `EXPLAIN` só de teste, medição de produção só de leitura com analytics
  bloqueado).
- 16/11 — 1D concluída pelo Chave: branch `vitorrampazzi/ux-performance-2026-11-16` em
  5613939, sem upstream; `git status` igual antes e depois. Conferido pelo Orquestrador.
- 16/11 — 1A, 1B e 1C despachadas em paralelo (só leitura; cada um escreve só o relato,
  e o Vigia também `tests/perf-baseline.mjs`). Os três caíram por erro de conexão da API e
  foram retomados de onde pararam.
- 16/11 — 1B (Tijolo) aceita após conferência por amostragem: nenhum N+1 em rota de
  requisição; `SELECT *` em `portfolio.js:59,63` e `rankings.js:76,184,212`; `no-store`
  padrão em `app.js:87`; `autoprefixer` e `prettier` sem uso; `EXPLAIN` não executado (sem
  MySQL em 3307 e sem Docker). Ajuste do Orquestrador: `/api/learning` **não** pode ter cache
  de borda, porque a resposta traz o progresso do usuário logado (`learning.js:10-20`).
- 16/11 — 1A (Pincel) aceita com uma correção do Orquestrador: a home pública **baixa** o
  framer-motion. `src/pages/Home.tsx:6` reexporta `HomeContent`, o que faz `Home-*.js`
  importar `AccountHomeContent` → `SegmentedControl` → `use-reduced-motion-*.js` (40 kB gzip).
  Demais achados conferidos: pré-carga de `StockResearch` para visitante
  (`NavigationIntent.tsx:49-50`), logo PNG de 138 kB no herói, `min-h-10` no menu lateral.
- 16/11 — Plano da Etapa 2 em `docs/harness/briefs/01-plano-etapa2.md`. Decisões: índices e
  migração adiados (sem `EXPLAIN` possível e sem lentidão medida); paginação do ledger do
  portfólio adiada (risco em cálculo financeiro); retry de e-mail não muda (não idempotente);
  dependências removidas numa entrega separada (2E).
- 16/11 — 1C (Vigia) aceita. Base: lint ok, `npm test` 294/294, `tsc` ok. Lighthouse não
  instalado; medição com Playwright + Chrome instalado (`tests/perf-baseline.mjs`).
  Local (sem API, 3 cargas): LCP 148–309 ms, CLS até 0,14, JS 100–166 kB; framer-motion só na
  home (confirma a correção acima). Produção (só leitura, 1 carga por página e largura, 23:19,
  analytics bloqueado): LCP 632–1284 ms; **CLS 0,628 em `/ranking/acao/TIMS3` (390 px), 0,189
  (1280 px), 0,41–0,42 em `/glossario`**; demais páginas ≤ 0,022. JS 105–176 kB. A chamada com
  erro em toda página é `GET /api/auth/me` → 401 para visitante (esperado).
- 16/11 — CLS de produção vira prioridade: nova medição com atribuição (1E, Vigia) e correção
  (2F, Pincel) antes dos tokens. Cópia do `dist/` de base guardada em `.test-artifacts/dist-base/`
  para a medição "antes" não ser afetada pelos builds da Etapa 2.
- 16/11 — Briefs 2A, 2D e 1E escritos pelo Pauta e revisados. Decisões: `NavigationIntent` vai
  para dentro do `AuthProvider` (única mudança em `App.tsx`); `scripts/prerender.mjs` só no
  filtro de CSS, se o CSS dos cards da home mudar de arquivo; WebP gerado pelo Chrome já
  instalado (Pillow ausente, nada instalado), adotado só se ≥ 40% menor; `vite preview` não
  aplica os rewrites da Vercel, então o script do Vigia serve `acao.html` em
  `/ranking/acao/<ticker>` no modo simulado; trava no script contra produção (só a carga de
  atribuição). Despachados em paralelo: Pincel (2A, único com build), Tijolo (2D), Vigia (1E).
- 16/11 — 2D entregue pelo Tijolo: `/api/support/information` com `sharedCache`
  (`s-maxage=3600, stale-while-revalidate=86400`), teste `tests/public-cache.test.mjs` (4/4) no
  `npm test` (298/298); `SELECT *` de `ranking_publications` mantido (as 3 consultas leem
  `entries_json`, a coluna grande). Orquestrador conferiu o diff. Lupa: **APROVADO**, 2 menores;
  aceito o de afirmar a ausência de `RateLimit` na resposta cacheada (devolvido ao Tijolo), o outro
  é preferência. QA junto com a 2A. Ajuste feito: ausência de `RateLimit` afirmada, com controle
  em `/api/learning` (4/4).
- 16/11 — 2A entregue pelo Pincel: reexportação removida de `Home.tsx:6` (a home não pede mais o
  framer-motion; 25 → 19 arquivos JS e 649.875 → 498.212 B decodificados na home, medição do
  Pincel); `NavigationIntent` dentro do `AuthProvider`, visitante pré-carrega só `PublicStock`;
  logo do herói em WebP 33.452 B (PNG 138.503 B, −75,9%) via `<picture>` com PNG de reserva;
  `width`/`height` nos 5 ícones; filtro de CSS do pré-render com `usePublicHomeMotion` (mesmo
  CSS da base, só mudou o nome do chunk). Orquestrador conferiu o diff. Em revisão no Lupa.
- 16/11 — Achado do Orquestrador: o Tailwind 4.3.3 detecta automaticamente os `.md` de `docs/`;
  palavras dos relatos (`ease-out`, `ease-in-out`) viraram classes no `index-*.css`. Correção
  (`@source not "../docs"` ou equivalente em `src/index.css`) vai na 2B, que já mexe nesse arquivo.
- 16/11 — 2A no Lupa: **APROVADO COM RESSALVAS** (1 importante, 3 menores; lint, tsc e 298/298
  conferidos por ele). Decisões: filtro de CSS do pré-render passa a falhar o build quando não
  encontra arquivo + teste em `tests/seo.dist.mjs` exigindo o CSS dos cards na home (o manifesto
  do Vite fica para o Eixo C); remover o ramo `AccountHomeContent` do filtro; logado pré-carrega
  `PublicStock` e `StockResearch`. `&& !loading` redundante fica. Devolvido ao Pincel.
- 16/11 — 1E (Vigia) aceita: produção 390 px — `/glossario` 0,411 (rodapé e `a.action-secondary`);
  `/ranking/acao/TIMS3` saltos do rodapé em ~2,1 s e ~2,5 s, depois da resposta de `/api/auth/me`.
  Reprodução local com API simulada: glossário 0,411 (mesmos nós), empresa 0,699. A recusa da
  captura de `/api/rankings/public` foi falso positivo do filtro do script (`session: null` da
  cotação); a resposta pública é por lista fechada de campos (`server/public-ranking.js:14-38`).
  Produção não será mais carregada (limite de 3 cargas por página atingido); o mock do ranking usa
  dados fictícios dos testes.
- 16/11 — Causa do CLS do glossário confirmada no código pelo Orquestrador: `main.tsx` usa
  `createRoot`; o pré-render passa os termos (`entry-server.tsx:21`), o cliente não
  (`App.tsx:135`), então a lista pré-renderizada vira "Carregando glossário…" e volta depois da API.
  Página da empresa: "Verificando seu acesso…" sem altura e `min-h-[70vh]` menor que o conteúdo
  final. Plano da 2F escrito; brief com o Pauta.
- 16/11 — "Antes" oficial da 2F (Vigia; dist de base, API simulada com ranking fictício, 3
  cargas): `/ranking/acao/TIMS3` 0,628 (390 px) e 0,359 (1280 px); `/glossario` 0,411 (390 px) e
  0,422 (1280 px). Três dos quatro iguais aos de produção. Comando de repetição no relato
  `qa-cls-2026-11-16.md`.
- 16/11 — Ajustes da 2A feitos pelo Pincel e conferidos no diff pelo Orquestrador: o pré-render
  falha com mensagem clara se um filtro de CSS não casar nenhum arquivo (provado com regex quebrado
  de propósito, depois restaurado); ramo `AccountHomeContent` removido; teste novo em
  `tests/seo.dist.mjs` (8/8) exige na home a folha com `.home-areas` e `.ph-brand`; logado
  pré-carrega `PublicStock` e `StockResearch`. 2A e 2D no QA conjunto do Vigia.
- 16/11 — Briefs 2F, 2C e 2B prontos (Pauta), revisados. Decisão sobre tokens: 3 durações
  (`fast` 150 ms, `base` 180 ms, `slow` 250 ms), mudança máxima de 10 ms em relação aos literais
  atuais (140–250 ms), imperceptível; cinco tokens quase iguais manteriam a inconsistência.
  Microinterações novas só com achado concreto (o relato 1A não apontou falta de feedback).
- 16/11 — **QA conjunto 2A + 2D: APTO** (Vigia, relato `qa-etapa2a-2d-2026-11-16.md`). lint ok,
  `npm test` 298/298, `tsc` ok, build ok, `seo.dist` 8/8; navegador sem MySQL: public-home 10/10,
  stock-theme 6/6, public-rankings 10/10; comportamento 24/24 (visitante sem `StockResearch`, logado
  simulado com `StockResearch` e `PublicStock`, herói baixa só o WebP, cards estilizados sem
  JavaScript, 320/768/1280 px claro/escuro/reduced-motion sem rolagem horizontal). Medição local
  (3 cargas, sem API): **home 390 px JS 165,8 → 116,8 kB (−30%)**, LCP 309 → 269 ms, framer-motion
  fora da home; CLS sem regressão. Não executado: fluxos logados com banco (`browser.mjs`,
  `browser-experience`, notificações), comparação de pixels da logo. 2A e 2D aceitas pelo
  Orquestrador.
- 16/11 — 2F despachada ao Pincel.
- 17/11 — Eixo C iniciado com a skill `zizi-skills:code-quality` (lida pelo Orquestrador). Plano em
  `docs/harness/briefs/02-plano-eixo-c.md`. C1: diagnóstico só de leitura pelo Lupa (16 maiores
  arquivos, duplicação, ritmo de carregamento/erro, candidatos a código morto com prova), em paralelo
  à 2F; sem build, sem exclusão, sem GitHub. Saída: 4 a 8 fatias pequenas para depois da fila do
  Pincel.
- 17/11 — 2F (Pincel): **glossário 0,411/0,422 → 0** (JSON do glossário embutido no HTML
  pré-renderizado e lido no cliente); **empresa 0,628 → 0,210 (390 px) e 0,359 → 0,114 (1280 px)**
  com `PublicCompanySkeleton` nas duas esperas; meta < 0,1 ainda não atingida na empresa. Causa do
  resto: o fallback de rota `PageLoading` sem altura. Decisão: antecipar o item 2 da 2C
  (`PageLoading` com altura mínima que mantém o rodapé abaixo da dobra). Erro achado pelo Pincel no
  script de medição (modo simulado não servia o HTML pré-renderizado por rota) corrigido pelo Vigia;
  "antes" do glossário refeito com o HTML certo: continua 0,411/0,422.
- 17/11 — C1 (Lupa): 22 arquivos de `src/` sem importador, rota nem teste (4.314 linhas), em três
  grupos; 6 arquivos grandes com divisão de ganho real; `apiRequest` duplicado (`api.ts:19` e
  `AuthProvider.tsx:23`); `/api/learning` chamado por 3 telas. Conferido por amostragem pelo
  Orquestrador (`/app/carteira` e `/app/favoritos` já redirecionam; `Carteira.tsx` e
  `DividendDashboard.tsx` sem importador). **Decisões do dono (17/11): apagar a interface antiga da
  Carteira, Painel e Favoritos (2.539 linhas) e o painel fundamentalista antigo (1.470 linhas).**
  As rotas `/api/portfolio*` do servidor continuam. A pendência dos textos próprios do
  `DividendDashboard` deixa de existir. O item 4 da 2B (`PortfolioPulse.tsx:148`) cai: o arquivo é
  órfão e vai ser apagado.
- 17/11 — Ajuste da 2F (Pincel): `PageLoading` com `min-h-svh`. Medição oficial (MOCK_API, HTML de
  cada rota como na Vercel, 3 cargas): **TIMS3 0,628 → 0 (390 px) e 0,359 → 0 (1280 px); glossário
  0,411 → 0 e 0,422 → 0**. Lint, tsc, 298/298, build, seo 8/8. Em revisão com a Lupa (risco: o
  fallback vale para todas as rotas).
- 17/11 — 2E (Tijolo): `autoprefixer` e `prettier` removidos do `package.json`; lock perdeu 4
  pacotes (os dois e `fraction.js`, `postcss-value-parser`, exclusivos deles), 0 alterados. Conferido
  pelo Orquestrador (só remoções; nenhuma referência restante). `npm ci` limpo fica para o QA final.
  O npm mostrou 9 alertas moderados: triagem só de leitura pedida ao Tijolo.
- 17/11 — Triagem (Tijolo, `backend-auditoria-dependencias-2026-11-17.md`): os 9 alertas são um só,
  `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249, moderado), puxado só pelo lint; `npm audit --omit=dev`
  = 0; nenhum uso de glob/minimatch no código. **Decisão: não corrigir nesta missão** (exige mexer em
  `node_modules` e pode trazer avisos novos de lint). Recomendação no relatório final: `eslint`
  ^10.15.0 e `typescript-eslint` ^8.73.0 (dentro das faixas atuais), `npm ci`, lint e testes, em etapa
  própria.
- 17/11 — Revisão da 2F (Lupa, `revisao-etapa2f-2026-11-17.md`): aprovada com ressalvas. Aceitos:
  reservar altura no "Carregando glossário…" da navegação no cliente (CLS 0,59/0,56 nesse caminho;
  base 0,87/0,84), `PageLoading` com `min-h-screen` (mesmo padrão do esqueleto, `PublicLayout` e
  `AuthShell`) e teste do JSON embutido em `seo.dist.mjs`. Rotas ainda sem medição (1920×1080,
  `/entrar`, `/cadastro`, `/app/*`) vão para o QA. Ajustes mínimos de estilo (classe `page` duplicada,
  ternário do prerender) ficam de fora. Rodada 2 com o Pincel; revisão da 2E com a Lupa.
- 17/11 — Revisão da 2E (Lupa, `revisao-etapa2e-2026-11-17.md`): **aprovada, sem achados** (lock
  371 → 367 pacotes, só os 4 esperados; raiz do lock igual ao `package.json`). O QA final faz `npm ci`
  limpo + build e compara o CSS gerado. Aviso: quem rodar `npx prettier` à mão passa a baixar do
  registro (nenhum script ou CI usa).
- 17/11 — Rodada 2 da 2F (Pincel): estado "Carregando glossário…" com `min-h-screen` só enquanto
  carrega; `PageLoading` com `min-h-screen`; teste novo do JSON embutido em `seo.dist.mjs` (9/9).
  Navegação por clique `/` → `/glossario`: **0,592 → 0,024 (390 px) e 0,556 → 0,008 (1280 px)**;
  carga direta continua 0. Lupa reconferiu: **aprovada**; teste conferido por mutação. Limites de
  severidade baixa, aceitos sem nova rodada: o teste não detecta texto ou ordem trocados com a mesma
  contagem, e não verifica que as outras rotas não têm o script.
- 17/11 — QA da 2F (Vigia), fase 1: lint, tsc, 298/298, build, seo 9/9; build copiado para
  `.test-artifacts/dist-2f`. Fase 2 (medição) em andamento. 2C despachada ao Pincel (sem o item do
  `PageLoading`, já feito na 2F).
- 17/11 — 2C (Pincel): skeletons no lugar de "Carregando…" em `ResearchSample` (home) e
  `RankingHighlights` (área logada), com as mesmas classes e caixas de linha da lista final, sem
  números (só barras). Bloco skeleton/carregado: `ResearchSample` 1472/1484 px (390; antes 1440/1484)
  e 773/785 px (1280; antes 758/785); `RankingHighlights` 807/807 px (390; antes 224/807) e 561/561 px
  (1280; antes 191/561). Lint, tsc, 298/298, build. **Decisões do Orquestrador:** aceitar o resíduo de
  12 px (nome de empresa que quebra em 2 linhas varia com o dado real) e os +48 px quando a cotação
  falha (linha extra do qualificador da margem; reservá-la deixaria o caso normal errado). Em revisão
  com a Lupa.
- 17/11 — Revisão da 2C (Lupa, `revisao-etapa2c-2026-11-17.md`): aprovada com ressalvas; texto da
  `publicationNote` idêntico ao anterior; classes de CSS removidas sem uso. **Aceitos para a rodada 2:**
  no erro da publicação, `RankingHighlights.tsx:144` passou a mostrar o subtítulo que fala de análises,
  preço de mercado e margem acima da mensagem de falha (corrigir com `(!publication && !error) || …`);
  `aria-busy` vai para o contêiner que envolve o status. Fica de fora: guarda contra linha duplicada
  (opcional).
- 17/11 — 2B despachada ao Pincel em paralelo à revisão da 2C (arquivos diferentes). Corrigido no
  brief: **3 tokens de duração** (`--ediv-duration-fast` 150 ms, `-base` 180 ms, `-slow` 250 ms), não 5;
  só 140 → 150 e 160 → 150 mudam (≤ 10 ms).
- 17/11 — 2B (Pincel): tokens `--ediv-ease-out`, `--ediv-ease-emphasis`, `--ediv-duration-fast`
  (150 ms), `-base` (180 ms) e `-slow` (250 ms) em `src/index.css:37-41`; 13 linhas mudaram de valor
  (8 de 140 → 150 e 5 de 160 → 150), o resto virou token de mesmo valor; 260 e 420 ms ficaram como
  casos justificados. `@source not "../docs"`: `.ease-in-out{` some do CSS do build (1 → 0). Alvo de
  toque do menu logado 40 → 44 px (`min-h-11`). Capturas de 5 páginas × 3 larguras × 2 temas: 30 de
  30 iguais. Lint, tsc, 298/298, build. Conferido pelo Orquestrador: nenhuma linha fora de tempo de
  animação mudou. Em revisão com a Lupa; rodada 2 da 2C com o Pincel.
- 17/11 — Rodada 2 da 2C (Pincel): no erro da publicação o subtítulo volta a "Leia a tese e confira o
  prazo de cada cenário." (igual ao `HEAD`, conferido pelo Orquestrador e no navegador com a API em
  500); `aria-busy` num contêiner que envolve o status e o bloco `aria-hidden`; alturas iguais
  (1472/1484 e 773/785). Durante o carregamento o subtítulo mostra o texto da lista com análise, para
  ter a altura do estado final (aceito pela Lupa). C2 despachada ao Pincel (contexto limpo).
- 17/11 — Revisão da 2B (Lupa, `revisao-etapa2b-2026-11-17.md`): **aprovada com ressalvas**. Provado
  por script: só as 13 linhas previstas mudaram de valor; `@source not "../docs"` tira do CSS só
  classes vindas de `docs/` (`.ease-in-out`, `.ease-out`, `.bg-white`, `.antialiased` etc.), nenhuma
  usada em `src/`; movimento reduzido zera as animações tokenizadas. Achados de severidade baixa:
  (a) `min-h-10` → `min-h-11` não muda nada, porque `navigation-chrome.css:111` já dava 44 px aos
  itens do menu (medido 44 antes e depois); a troca fica porque a classe passa a dizer a altura real,
  mas **não conta como melhoria** e o relato do Pincel ("antes 40 px") será corrigido; (b) comentar os
  tokens para não confundir `--ediv-ease-out` com a palavra-chave `ease-out`. Recomendação para depois:
  levar os tokens aos outros 6 CSS e unificar `--ph-ease` com `--ediv-ease-emphasis`.
- 17/11 — Reconferência da rodada 2 da 2C (Lupa): **aprovada**, achados 1 e 2 resolvidos; no erro, o
  subtítulo é idêntico ao `HEAD` (tabela-verdade no relato); `aria-busy` fora de elemento `aria-hidden`,
  sem efeito de layout. 2C e 2B revisadas; aguardam o QA final.
- 17/11 — **QA da 2F (Vigia, `qa-etapa2f-2026-11-17.md`): APTO com ressalvas.** Oficial (média de 3):
  TIMS3 0,628 → 0 (390) e 0,359 → 0 (1280); glossário 0,411 → 0 e 0,422 → 0. Sem regressão em `/`,
  `/ranking`, `/entrar`, `/cadastro` (0) e `/aprender` (0,020/0,022, igual ao antes). Navegação por
  clique a partir de `/`: até 0,026 (antes 0,64–0,87); o rodapé nunca entra na tela. Lint, tsc,
  298/298, build, seo 9/9. **2F aceita.** Ressalvas, ambas já existentes antes da missão: (1)
  `/aprender` em 1920×1080 com CLS 0,227 nos dois builds, que vai para a 2H (diagnóstico e correção
  se for pequena); (2) a página da empresa não mostra "dividendos não são garantidos" (regra 10).
  **Decisão do dono (17/11): ajustar o rodapé** de todas as páginas públicas para "Conteúdo educativo,
  sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados futuros
  não são garantidos." (2H).
- 17/11 — C2 (Pincel, `interface-eixoc-c2-2026-11-17.md`): 26 arquivos apagados (4.447 linhas), todos
  com prova; `AccountHomeContent.tsx` com 2 linhas; linha de status em 7 docs. Chunks 81 → 78; dist
  −10 KB. Sem uso, sinalizados e não apagados: `FavoritesProvider` (`entry-server.tsx:4,36`), 19
  classes de CSS, logos PNG. O chunk do framer-motion passou a se chamar `onboarding-*.js`: o Rollup o
  juntou ao módulo `onboarding`, porque os importadores agora são os mesmos. O Orquestrador conferiu
  que a home pública continua sem ele; Lupa e QA final medem. `CENTRAL-FUNDAMENTALISTA.md` estava com
  CRLF no índice: normalizar para LF conforme o `.gitattributes`, em commit próprio. Em revisão com a
  Lupa; 2H com o Pincel.
- 17/11 — Revisão da C2 (Lupa, `revisao-eixoc-c2-2026-11-17.md`): **aprovada, sem achado obrigatório**.
  Os 26 batem com o C1 e o brief, sem nada apagado fora da lista, e a prova refeita deu 0 referências
  vivas. Visitante em `/`, `/entrar` e `/cadastro`, com hover em 13 links e cliques em Entrar e Criar
  conta: 0 downloads do chunk com framer-motion (o controle positivo baixa 1). Docs: 3 linhas em cada,
  ignorando fim de linha. **Para a Chave:** normalizar `CENTRAL-FUNDAMENTALISTA.md` para LF num commit
  próprio, antes do commit das linhas de status, e conferir 3/0 depois.
- 17/11 — O dono saiu e autorizou concluir tudo, inclusive a publicação, depois da validação ("faça
  tudo que você julgar necessário"), o que soma à autorização permanente da memória. Plano final em
  `docs/harness/briefs/03-plano-final.md`: **uma PR** com 15 commits por assunto. Duas PRs foram
  descartadas, porque a primeira iria para produção num estado que o QA não testou. Briefs
  `final-qa-vigia.md` e `final-chave.md`; arquivo com dois assuntos vai inteiro no commit mais recente
  (sem divisão por hunk).
- 17/11 — 2H (Pincel, `interface-etapa2h-2026-11-17.md`): rodapé com o texto aprovado nas 8 páginas
  pré-renderizadas; comentário da escala de movimento; relato da 2B corrigido (44 px já existiam).
  `/aprender` em 1920 px: **causa encontrada, sem correção nesta missão.** O cliente começa sem o
  conteúdo que o prerender mostrou e põe "Carregando aulas…" com um bloco de 92 px
  (`Aprender.tsx:499-513`); quando o conteúdo chega, o painel `#learning-panel-curso` sobe 92 px.
  **Decisão do Orquestrador:** não aplicar o padrão do glossário (JSON embutido) agora, porque o
  conteúdo de `/aprender` muda com o login (prévia × completo), e o usuário logado veria aulas
  bloqueadas por um instante. Em 390 e 1280 px o CLS é 0,02. Fica como pendência, em tarefa própria.
  Lupa revisa a 2H; C3 com o Pincel.
- 17/11 — Revisão da 2H (Lupa, `revisao-etapa2h-2026-11-17.md`): **aprovada, sem achado obrigatório.**
  O rodapé fica idêntico ao texto aprovado. Nas 8 páginas públicas do `dist/`, o texto novo aparece 1
  vez e o antigo 0, e o antigo também não está no bundle nem no resto do repositório. O comentário dos
  tokens está correto e a correção do relato da 2B é factual. `Aprender.tsx` não mudou.
- 17/11 — C3 (Pincel, `interface-eixoc-c3-2026-11-17.md`): uma só `apiRequest` em `src/lib/api.ts`
  com `{ timeoutMs }` (padrão 45 s); o `AuthProvider` usa um invólucro de sessão (no-store, 30 s) e a
  cópia local de ~40 linhas saiu; teste novo `tests/api-client.test.mjs`; `npm test` 312/312. Revisão
  (Lupa, `revisao-eixoc-c3-2026-11-17.md`): **aprovada com ressalvas.** O teste diferencial `HEAD` ×
  atual (108 combinações) deu 0 diferenças, exceto `retryAfterMs` (mudança aceita); o visitante faz 1
  chamada a `/me`, sem aviso nem laço. Aceitos para a rodada 2: o teste não protegia o invólucro da
  sessão (mutar 30 s → 45 s passava), então `sessionRequest` vai para `api.ts` com testes próprios;
  uma asserção de que as outras chamadas não forçam cache; comentários em inglês, como o resto do
  repositório; corrigir uma frase do relato.
- 17/11 — Rodada 2 da C3 (Pincel): `sessionRequest` exportado em `api.ts` e usado nas 6 chamadas; 18
  casos de teste; 4 mutações pegas; `npm test` 316/316. Lupa reconferiu: **aprovada**, achados 1 a 4
  resolvidos. Ela refez as mutações numa cópia fora do repositório (todas vermelhas no caso certo), e o
  diferencial `HEAD` × atual deu 0 diferenças, exceto `retryAfterMs`. **Todas as entregas estão
  revisadas.** QA final com o Vigia.
- 17/11 — O `gh` agora está instalado e autenticado na conta do dono (`gh version 2.103.3`). O papel
  e a memória diziam que ele não existia; o Orquestrador registrou o conflito e atualizou a memória e
  o brief da Chave, que passa a abrir e mergear a PR com `gh`, com o Chrome de reserva.
- **Plano de QA a partir daqui:** a 2F tem QA próprio (Vigia, em andamento). A 2C, a 2B, a C2 e a C3
  passam pela Lupa uma a uma e entram juntas no **QA final** do Vigia: `npm ci` limpo (prova da 2E),
  lint, tsc, `npm test`, build, comparação do CSS gerado, suítes de navegador, CLS das rotas públicas,
  capturas 320/768/1280 em claro e escuro, movimento reduzido.
- 17/11 — **QA final (Vigia, `qa-final-ux-performance-2026-11-17.md`): APTO com ressalvas, sem
  bloqueio.**
  - `npm ci` limpo: CSS idêntico, `package.json` e lock inalterados.
  - lint, `tsc`, build, `harness check`: passaram. `npm test` 316/316; `seo.dist` 9/9.
  - Navegador sem banco: 10/10, 6/6 e 10/10.
  - CLS: nenhuma rota pior; TIMS3 e glossário em 0.
  - Home: JS 116,9 KB; framer fora para o visitante.
  - Rodapé 8/8; 36 capturas sem rolagem horizontal.
  - Ressalvas: o Vigia olhou só 3 capturas (o Orquestrador olhou mais 4, todas corretas); o LCP local
    variou demais para concluir; as suítes com MySQL não rodaram (fica com o CI). Relatório final
    preenchido em `docs/harness/relatos/coordenacao-ux-performance-2026-11-16.md`. Publicação
    despachada para a Chave.
