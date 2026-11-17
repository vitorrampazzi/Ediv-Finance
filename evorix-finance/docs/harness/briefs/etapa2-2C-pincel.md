# Brief 2C — Pincel: skeletons contextuais

Para: Pincel (interface). Etapa 2. Ordem do Pincel: 2F, depois **2C**, depois 2B. **Só comece depois que a 2F passou na revisão** e o Pincel liberou os caminhos dela (`interface` com `release`).

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
node scripts/harness.mjs claim interface src/components/RankingHighlights.tsx src/components/home/ResearchSample.tsx src/components/home/public-sections.css src/components/PageContent.tsx docs/harness/relatos/interface-etapa2c-2026-11-16.md
node scripts/harness.mjs update interface trabalhando "2C: skeletons contextuais"
```

Leia da nota as seções 3 (nunca zero no lugar de dado ausente; textos legais), 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Se `status` mostrar outro papel com um desses caminhos, **pare** e avise. Ao terminar:

```
node scripts/harness.mjs update interface revisao "2C pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Trocar os textos "Carregando…" e o fallback genérico de rota por skeletons que ocupam o mesmo espaço do conteúdo final, para nada abaixo deles se mover quando o conteúdo chega.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 2C. Relato 1A: `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`, seção 5 e recomendações 5 e 6 (seção 9).
- Locais exatos hoje:
  - `src/components/RankingHighlights.tsx:187-189`: `<p role="status">Carregando publicação…</p>` (aparece quando ainda não há `publication`).
  - `src/components/home/ResearchSample.tsx:44-50`: `<p role="status" className="ph-ranking-state ph-ranking-loading[ ph-ranking-loading-locked]">Carregando ranking publicado…</p>`. As regras `.ph-ranking-loading*` estão em `src/components/home/public-sections.css:20-38`.
  - `src/components/PageContent.tsx:6-29` (`PageLoading`): fallback de toda rota (`Suspense`). Hoje: `section` com `min-h-[50vh]`, texto "Abrindo página…" e barras com `motion-safe:animate-pulse`.
- **Padrão de skeleton da 2F:** `src/components/PublicCompanySkeleton.tsx`. **Se já existir quando você começar, reaproveite o padrão dele** (mesmas classes, `role="status"`, `aria-busy="true"`, `motion-safe:animate-pulse`), sem duplicar estilos e sem editar esse arquivo. Se não existir, use o padrão que já está em `PageContent.tsx:14-26` e registre isso no relato.
- Sem API local: o conteúdo final desses blocos depende de `/api/rankings/public`. Para medir a altura "depois", use uma **fixture fictícia** (dados inventados, marcados como fictícios) servida por `page.route` em script descartável. Nunca coloque fixture no código do site.
- Estados que não mudam: erro (com "tentar novamente"), vazio, e dado ausente ("não informado" / "indisponível"). Nunca zero.

## Pode ler primeiro / pode editar

- Ler primeiro: `src/components/RankingHighlights.tsx`, `src/components/home/ResearchSample.tsx`, `src/components/home/public-sections.css`, `src/components/PageContent.tsx`, `src/components/PublicCompanySkeleton.tsx` (se existir), `src/hooks/usePublicRanking.ts` (forma dos dados da fixture).
- **Pode editar:**
  - `src/components/RankingHighlights.tsx` (só o estado de carregamento)
  - `src/components/home/ResearchSample.tsx` (só o estado de carregamento)
  - `src/components/home/public-sections.css` (só as regras `.ph-ranking-loading*`, se o skeleton precisar delas)
  - `src/components/PageContent.tsx` (só `PageLoading`)
- **Pode criar:** o relato `docs/harness/relatos/interface-etapa2c-2026-11-16.md`.
- `src/App.tsx`: **não editar**. Se uma solução do item 2 só funcionar mexendo nele, **pare e pergunte** ao Orquestrador.

## Fora do escopo

- Os outros "Carregando…" do relato 1A (`HistoryCharts.tsx:48`, `ConversationInbox.tsx:129`, `ConversationPanel.tsx:89`, `NotificationsMenu.tsx:141`): só liste no relato como "não feito".
- Tokens de movimento (entrega 2B), CLS do glossário e da página da empresa (2F), qualquer texto legal, regra financeira, margem, cotação ou número exibido.
- Skeletons por tipo de rota **sem medição que mostre ganho** (item 2).
- Editar `tests/`, `package.json`, `server/`, `tests/perf-baseline.mjs`. Instalar dependência.

## Passos

1. **Estrutura real antes de desenhar.** Leia `RankingHighlights.tsx` e `ResearchSample.tsx`. Descubra quantas linhas ou cartões cada um mostra (existe limite fixo, como `slice`?). Se for fixo, o skeleton tem esse número; se variar, use o máximo e relate.
2. **Item 1: dois skeletons.** Substitua o `<p>` de carregamento de cada arquivo por um skeleton com a **mesma estrutura e altura** do conteúdo final (linhas da tabela ou cartões). Mantenha `role="status"` e `aria-busy="true"`, com o texto atual ("Carregando publicação…", "Carregando ranking publicado…") como texto para leitor de tela (`sr-only`). Anime só `opacity`/`transform` (`motion-safe:animate-pulse`). O estado `lockedPreview` do `ResearchSample` continua com sua variante.
3. **Item 2: `PageLoading`.** Meça antes de mudar: em `localhost` com o `dist/` novo, em 390×844 e 1280×800, navegue pelo cliente de `/` para `/aprender` e de `/` para `/ranking` com o arquivo `.js` da página atrasado em 600 ms (`page.route` sobre `/assets/*.js`), registrando durante o fallback: a posição do rodapé (`footer.getBoundingClientRect().top`) e as entradas `layout-shift`. Depois teste uma forma genérica com altura mínima de tela (por exemplo, trocar `min-h-[50vh]` por `min-h-screen`). Só mantenha a mudança se os números mostrarem ganho (CLS menor ou rodapé abaixo da dobra durante o fallback). Formas por tipo de rota **só** se a medição mostrar ganho que a forma genérica não dá; nesse caso, descreva e **pare para o Orquestrador decidir** (não implemente).
4. **Item 3: todos os skeletons.** `role="status"` e `aria-busy` com texto para leitor de tela; animação só com `opacity`/`transform`; desligada com `prefers-reduced-motion` (`motion-safe:`); erro e dado ausente iguais a hoje.
5. **Medição de altura (item 1).** Com `npx vite preview --port 4173` e um script Playwright **descartável, fora do repositório**, em 390 e 1280 px: meça a altura do bloco e a posição do próximo elemento abaixo (a) durante o skeleton e (b) com a fixture fictícia carregada. Atrase a resposta da API em 600 ms para ver os dois estados. Registre os dois pares de números. Apague o script ao terminar.

## Critérios de aceite (observáveis)

- [ ] Para `RankingHighlights` e `ResearchSample`, em 390 e 1280 px: altura do bloco e posição do elemento seguinte **iguais** durante o skeleton e depois de carregar (com a fixture de referência; diferença de, no máximo, 2 px por arredondamento, e o relato diz o valor medido). Nenhuma entrada `layout-shift` causada pela troca.
- [ ] Os estados de erro e de dado ausente continuam como antes: nenhum zero no lugar de dado ausente (`git diff` mostra só o ramo de carregamento).
- [ ] Todo skeleton novo tem `role="status"` ou `aria-busy="true"` e texto para leitor de tela; com `prefers-reduced-motion: reduce` a animação não roda (`getComputedStyle(...).animationName` igual a `none` no navegador com movimento reduzido).
- [ ] `PageLoading`: decisão registrada com números antes e depois (CLS e posição do rodapé durante o fallback, em 390 e 1280 px). Se não houve ganho, o arquivo fica como estava.
- [ ] `git diff -- src/App.tsx` vazio.
- [ ] `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit` e `npm run build` passam.
- [ ] `git status --short` lista só os caminhos permitidos, mais `docs/harness/state.json` e os arquivos dos outros executores.

## Comandos de validação (em `evorix-finance/`)

```
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
npm run build
npx vite preview --port 4173
git diff -- src/App.tsx
git diff --stat
git status --short
node scripts/harness.mjs check
```

Porta do Pincel: **4173** (a 4175 é do Vigia). Medições e capturas só contra `localhost`.

## Formato do relato

Arquivo `docs/harness/relatos/interface-etapa2c-2026-11-16.md`, em português, com estas seções numeradas:

1. Estrutura do conteúdo final de cada bloco (linhas ou cartões, com `arquivo:linha`) e se reaproveitou `PublicCompanySkeleton.tsx` ou o padrão de `PageContent.tsx`.
2. Arquivos alterados, com `arquivo:linha`.
3. Alturas e posições medidas (skeleton e conteúdo), em 390 e 1280 px, e a fixture usada (marcada como fictícia).
4. `PageLoading`: medição antes e depois e a decisão.
5. Acessibilidade e movimento reduzido: o que foi conferido.
6. Não feito (os outros "Carregando…") e pendências.
7. Comandos rodados e resultado (passou, falhou, não executado e por quê).
8. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log ou relato. Não abra `.env*`.
- Fixtures só fictícias, só no script descartável, nunca no código do site. Não meça nem abra a produção.
- Não faça commit, push, deploy, stash nem reset. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
