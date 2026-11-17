# Brief 2A — Pincel: peso das páginas públicas (P1)

Para: Pincel (interface). Etapa 2, primeira rodada. Roda em paralelo com o 2D (Tijolo), em arquivos separados.

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs claim interface src/pages/Home.tsx src/components/NavigationIntent.tsx src/components/home/PublicHeroBrand.tsx public/ediv-logo-clean.webp src/components/SiteChrome.tsx src/layouts/DashboardLayout.tsx src/components/auth/AuthShell.tsx src/App.tsx scripts/prerender.mjs docs/harness/relatos/interface-etapa2a-2026-11-16.md
node scripts/harness.mjs update interface trabalhando "2A: peso das páginas públicas"
```

Leia da nota as seções 3 (regras financeiras e de honestidade), 4 (arquitetura) e 10 (segurança). Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador antes de continuar. Ao terminar:

```
node scripts/harness.mjs update interface revisao "2A pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Reduzir o JavaScript e as imagens que as páginas públicas baixam, sem mudar nenhuma tela, texto ou regra.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 2A. Relato da Etapa 1: `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`. Números de antes: `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md`, seção 3 (linhas de `/`).
- **Correção do Orquestrador ao relato 1A, seção 7a:** a home pública **baixa** o framer-motion (40 kB gzip). Prova no `dist/` atual: `Home-*.js` importa `AccountHomeContent-*.js`, que importa `SegmentedControl-*.js`, que importa `use-reduced-motion-*.js`. Causa: `src/pages/Home.tsx:6` reexporta `HomeContent` de `AccountHomeContent`, e ninguém usa essa reexportação (`src/pages/MemberHome.tsx:1` importa direto do componente).
- Pré-carga: `src/components/NavigationIntent.tsx:49-50` pré-carrega `StockResearch` (137 kB gzip) para qualquer link `/ranking/acao/<ticker>`, inclusive para visitante, que recebe `PublicCompany` (`src/pages/PublicStock.tsx:38`: `user ? <StockResearch /> : <PublicCompany />`).
- Logo: `public/ediv-logo-clean.png` (138.503 B, 512×512, RGBA) em `src/components/home/PublicHeroBrand.tsx:43` e `:52` (duas tags `<img>`, hoje com `width="508" height="503" decoding="async"`).
- Ícones de 192 px: `public/ediv-icon-clean-192.png` é 192×192 (quadrado). Tags `<img>` sem `width`/`height`: `SiteChrome.tsx:89` e `:256`, `DashboardLayout.tsx:372` e `:465`, `AuthShell.tsx:22`.
- Sem API local: o que depende da API fica vazio. Anote, não conserte.

## Pode ler primeiro / pode editar

- Ler primeiro: os arquivos acima e `public/theme-init.js` (para forçar tema claro e escuro nas capturas).
- **Pode editar:** `src/pages/Home.tsx`, `src/components/NavigationIntent.tsx`, `src/components/home/PublicHeroBrand.tsx`, `src/components/SiteChrome.tsx`, `src/layouts/DashboardLayout.tsx` (só atributos de `<img>`), `src/components/auth/AuthShell.tsx`.
- **Edição restrita (decisão do Orquestrador):**
  - `src/App.tsx`: **só** mover `<NavigationIntent />` (hoje `:121`, fora do provedor) para dentro de `<AuthProvider>` (abre em `:128`). Nenhuma outra mudança. Não é mudança de rota pública.
  - `scripts/prerender.mjs`: **só** o filtro `pageCss` (linhas 36-40), e **só se** o CSS com `.home-areas` mudar de arquivo (passo 6).
- **Pode criar:** `public/ediv-logo-clean.webp` (só se a regra do item 3 for cumprida) e o relato `docs/harness/relatos/interface-etapa2a-2026-11-16.md`.
- Pode **ler** (não editar) `src/`, `tests/`, `scripts/` para os `grep` de prova.

## Fora do escopo

- Tokens de movimento, skeletons, `min-h` do menu (são as entregas 2B e 2C).
- Qualquer texto, regra financeira, margem ou cotação.
- Editar `package.json`, `tests/`, `server/`, ou qualquer trecho de `src/App.tsx` e `scripts/prerender.mjs` além do descrito em "Edição restrita".
- Instalar ou remover pacote (npm ou Python). Rodar `npm run build` fora da validação final (o Tijolo não roda build nesta rodada; só você).
- Mexer em `public/ediv-logo-clean.png` (o PNG continua como alternativa).

## Passos

1. **Causa antes da correção.** Rode `grep -rn "HomeContent" src tests scripts`. Registre no relato quem usa a reexportação de `Home.tsx:6`. Se algum arquivo além de `MemberHome.tsx` (que importa direto de `AccountHomeContent`) a usar, **pare** e relate. As capturas de "antes" do passo 7 saem de `.test-artifacts/dist-base/` (pode tirá-las a qualquer momento, porque essa cópia não muda).
2. **Item 1 — framer-motion fora da home pública.** Remova a linha 6 de `src/pages/Home.tsx` (`export { HomeContent } ...`). Mais nada nesse arquivo.
3. **Item 2 — pré-carga só para quem está logado.** `NavigationIntent` hoje roda **fora** do `<AuthProvider>` (`src/App.tsx:121`, o provedor abre em `:128`), então não pode chamar `useAuth()`. Decisão do Orquestrador:
   1. Em `src/App.tsx`, mova `<NavigationIntent />` para dentro de `<AuthProvider>`. Nada mais muda nesse arquivo.
   2. Em `NavigationIntent.tsx`, leia `useAuth()` (`src/context/authContext`). Para `/ranking/acao/<ticker>` (`NavigationIntent.tsx:49-50`): **visitante ou sessão ainda carregando** pré-carrega só `pageImports.publicStock`; **logado** pré-carrega como hoje (`pageImports.stockResearch`). Os outros caminhos não mudam.
   3. O `useEffect` do componente registra os ouvintes uma vez. Faça o valor de `useAuth()` chegar a eles sem recriar os ouvintes a cada render (por exemplo, guardando o usuário num `ref`). Explique a escolha no relato.
   Meta do item: visitante sem sessão, com mouse ou foco num link `/ranking/acao/<ticker>`, não baixa `StockResearch-*.js`; logado continua pré-carregando.
4. **Item 3 — logo do herói em WebP.**
   - Ferramenta autorizada pelo Orquestrador: o Chrome do Playwright. O Pillow não está instalado nesta máquina e **não deve ser instalado** (nem pacote npm). Escreva um script Playwright **descartável no diretório temporário do sistema, fora do repositório**, que carregue o PNG numa página, desenhe num `canvas` 512×512 e gere o WebP com `canvas.toBlob(callback, "image/webp", 0.9)` (qualidade 0,9, alpha preservado). Grave `public/ediv-logo-clean.webp`. **Apague o script ao terminar.** Registre no relato o método e a qualidade.
   - Confirme que o WebP tem 512×512 e canal alfa (por exemplo, relendo-o no mesmo Chrome e conferindo um pixel transparente de canto). Se o Chrome não gerar WebP com alpha, registre "item 3 adiado" e o motivo; não instale nada.
   - **Só adote se o WebP for pelo menos 40% menor** que 138.503 B (ou seja, até 83.101 B) **e visualmente igual** (capturas do passo 7). Se não for, apague o `.webp`, registre os dois tamanhos e não mude o código.
   - Se for: em `PublicHeroBrand.tsx` troque cada uma das duas `<img>` por `<picture><source type="image/webp" srcSet="/ediv-logo-clean.webp" /><img ... src="/ediv-logo-clean.png" ...></picture>`, mantendo `className`, `alt`, `width`, `height`, `decoding`, `draggable` e qualquer `loading`/`fetchpriority` que já existam, **sem acrescentar nenhum**. Confirme no CSS (`hero-brand.css`) que nenhum seletor depende de a `<img>` ser filha direta de `.ph-brand-mark`; se depender, ajuste só o necessário para o visual ficar igual e anote.
5. **Item 4 — dimensões nos ícones.** Em cada uma das 5 tags `<img src="/ediv-icon-clean-192.png">` acrescente `width="192" height="192"`. Não mude `className` nem `alt`. O tamanho exibido continua vindo das classes (`h-8 w-8`, `h-9 w-9`, `h-10 w-10`).
6. **Validação** (comandos abaixo). Depois do build, confira no `dist/`:
   - `Home-*.js` não contém `AccountHomeContent` nem `SegmentedControl`.
   - A lista de pré-carga (`__vite__mapDeps`) da rota da home em `index-*.js` não contém `use-reduced-motion`.
   - **CSS da home (risco conhecido):** `src/components/home/home-area-cards.css` (classes `.home-areas`, `.home-area`; importado por `HomeAreaCards.tsx`) hoje cai em `AccountHomeContent-*.css`, e `scripts/prerender.mjs:37` só inclui no HTML da home os CSS cujo nome começa com `Home`, `ResearchSample` ou `AccountHomeContent`. Depois do build, o arquivo `.css` que contém `.home-areas` precisa estar entre os `<link rel="stylesheet">` de `dist/index.html`.
     - Se estiver: não mexa em `prerender.mjs`.
     - Se **não** estiver: edite **só** o filtro `pageCss` (linhas 36-40 de `scripts/prerender.mjs`) para incluir o novo nome, refaça o build e confira de novo. Qualquer outra mudança nesse arquivo é proibida.
   - **Outras páginas pré-renderizadas iguais ao de antes:** compare os `<link rel="stylesheet">` de cada `.html` de `dist/` (`index.html`, `acao.html`, `app.html` e os `index.html` das subpastas) com os do dist de base em `.test-artifacts/dist-base/` (somente leitura; **não o altere**). Os de `/ranking`, `/aprender` e das demais páginas devem ser os mesmos; só o da home pode diferir, e só pelo nome do arquivo que carrega `.home-areas`. Registre a comparação no relato.
   - **Cards da home com estilo antes do JavaScript:** abra `/` no preview com JavaScript desligado (Playwright `javaScriptEnabled: false`) e confirme que os três cards de acesso (Ranking de Ações, Aulas, Glossário) aparecem estilizados. Guarde a captura fora do repositório.
7. **Capturas (item 3, se adotado) e visual igual (itens 1 e 4).** Com `npx vite preview --port 4173`, use um script Playwright **descartável fora do repositório** (pasta temporária do sistema; apague ao terminar). Esse mesmo script verifica o item 2: com visitante (sem sessão), passe o mouse e dê foco num link `/ranking/acao/<ticker>` (sem API local a lista do `/ranking` pode estar vazia: nesse caso injete um `<a href="/ranking/acao/TIMS3">` com `page.evaluate`) e confirme que **nenhuma** requisição `StockResearch-*.js` sai. Para o caso logado, simule `GET /api/auth/me` com resposta 200 via `page.route` (corpo de usuário fictício, marcado como tal) e confirme que `StockResearch-*.js` é pré-carregado; se a simulação não funcionar, relate "logado: não executado" e o motivo. Capture `/` em 320, 768 e 1280 px, tema claro e escuro. **As capturas de "antes" saem do dist de base, servido com `npx vite preview --outDir .test-artifacts/dist-base --port 4174` (somente leitura)**; as de "depois" saem do `dist/` novo, na porta 4173. A porta 4175 é do Vigia. Registre os arquivos comparados e se houve salto de layout.
8. **Medição.** **Não use `tests/perf-baseline.mjs`**: o Vigia está editando esse script em paralelo (1E) e fará a medição oficial no QA. No mesmo script descartável do passo 7, registre para `/` em 390 px e 1280 px: requisições JS, bytes de JS transferidos e se algum `use-reduced-motion-*.js` foi pedido, no `dist/` de base (`npx vite preview --outDir .test-artifacts/dist-base --port 4174`) e no `dist/` novo (`--port 4173`). Relate também os tamanhos de `Home-*.js` antes e depois.

## Critérios de aceite (observáveis)

- [ ] `grep -c "AccountHomeContent\|SegmentedControl" dist/assets/Home-*.js` imprime `0`.
- [ ] Em `dist/assets/index-*.js`, a lista de dependências da rota da home não contém `use-reduced-motion`; o script descartável do passo 8 mostra que `/` não pede nenhum `use-reduced-motion-*.js` no `dist/` novo (e pedia no de base).
- [ ] O `.css` com `.home-areas` está entre os `<link rel="stylesheet">` de `dist/index.html`.
- [ ] A página `/app` (home logada) continua importando `AccountHomeContent` (`MemberHome.tsx:1` não mudou).
- [ ] Item 2: visitante (sem sessão) com mouse ou foco num link `/ranking/acao/<ticker>` não gera requisição `StockResearch-*.js`; logado (simulado) gera, ou "logado: não executado" com o motivo. `git diff -- src/App.tsx` mostra só a mudança de lugar de `<NavigationIntent />`.
- [ ] Os `<link rel="stylesheet">` de todas as páginas pré-renderizadas, menos a home, são iguais aos de `.test-artifacts/dist-base/`; a home abre com os 3 cards estilizados e JavaScript desligado.
- [ ] Item 3: tamanhos em bytes de `.png` e `.webp` no relato, método e qualidade; ou "adiado" com o motivo; ou "não adotado: WebP só X% menor". Se adotado: capturas iguais em 320, 768 e 1280 px, claro e escuro, sem salto de layout. Script descartável apagado.
- [ ] Item 4: `grep -n 'ediv-icon-clean-192' src -r` mostra `width="192" height="192"` nas 5 tags; visual igual.
- [ ] `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit` e `npm run build` passam.
- [ ] `git status --short` não lista nenhum arquivo seu fora dos permitidos acima. Itens esperados de outros: `docs/harness/state.json` (quadro), arquivos do Tijolo (`server/support.js`, `server/rankings.js`, `tests/public-cache.test.mjs`, `package.json`), do Vigia (`tests/perf-baseline.mjs`, relatos), da coordenação (`docs/UX-PERFORMANCE-2026-11-16.md`, `docs/harness/briefs/`) e os não rastreados do dono (`.gitignore`, `.maestri/`, PDF na raiz Git).

## Comandos de validação (em `evorix-finance/`)

```
grep -rn "HomeContent" src tests scripts
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
npm run build
grep -c "AccountHomeContent\|SegmentedControl" dist/assets/Home-*.js
grep -l "home-areas" dist/assets/*.css
grep -o 'href="/assets/[^"]*css"' dist/index.html
git diff -- src/App.tsx scripts/prerender.mjs
npx vite preview --port 4173
grep -n 'ediv-icon-clean-192' -r src
git status --short
node scripts/harness.mjs check
```

## Formato do relato

Arquivo `docs/harness/relatos/interface-etapa2a-2026-11-16.md`, em português, com estas seções numeradas:

1. Causa (de cada item, antes da correção) e saída do `grep` de uso.
2. Arquivos alterados, com `arquivo:linha`.
3. Item 1: provas no `dist/` (os três critérios).
4. Item 2: mudança em `App.tsx` e `NavigationIntent.tsx`, e o resultado do teste de visitante e de logado (ou "não executado" com o motivo).
5. Item 3: método (Chrome via Playwright, qualidade 0,9), tamanhos, decisão, capturas. Item 1 e CSS: comparação dos `<link>` com `dist-base`, e se o filtro `pageCss` precisou mudar.
6. Item 4: as 5 tags.
7. Medição de antes e depois (`Home-*.js` e total de JS da home).
8. Comandos rodados e resultado (passou, falhou, não executado e por quê).
9. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log ou relato. Não abra `.env*`.
- Testes e capturas só contra `127.0.0.1`. Não meça nem abra a produção.
- Não faça commit, push, deploy, stash nem reset. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
