# Plano do Orquestrador — Etapa 2 (primeiras mudanças)

Base: relatos `interface-auditoria-ux-2026-11-16.md` (Pincel), `backend-auditoria-performance-2026-11-16.md`
(Tijolo) e, quando chegar, `qa-base-ux-performance-2026-11-16.md` (Vigia). Missão:
`docs/UX-PERFORMANCE-2026-11-16.md`.

Fluxo de cada entrega: executor → Lupa (revisão do diff) → Vigia (QA) → Orquestrador.
Nesta rodada, briefs só para **2A (Pincel)** e **2D (Tijolo)**, que rodam em paralelo em
arquivos separados. 2B, 2C e 2E ficam para a próxima rodada (resumo no fim).

Regras comuns (além das da Etapa 1, que continuam valendo):

- Antes de começar, ler as regras com `maestri note read "Contexto Escola"` (seções 3, 4 e 10).
- Reservar no quadro TODOS os caminhos que vai editar, mais o relato. Papéis: `interface`
  (Pincel), `backend` (Tijolo).
- Explicar a causa antes de corrigir. Menor mudança segura. Sem reescrever o que funciona.
- Validação de cada executor: `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit`.
  **Só o Pincel roda `npm run build` nesta rodada** (o Tijolo não, para não disputar o `dist/`).
- Sem commit, push, deploy, migração, `.env*`. Sem linha de autoria de IA.
- Relato em `docs/harness/relatos/<papel>-etapa2<letra>-2026-11-16.md`, seções numeradas.
  Aviso ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## 2A — Pincel: peso das páginas públicas (P1)

Arquivos permitidos: `src/pages/Home.tsx`, `src/components/NavigationIntent.tsx`,
`src/components/home/PublicHeroBrand.tsx`, `public/` (só arquivo novo de imagem),
`src/components/SiteChrome.tsx`, `src/layouts/DashboardLayout.tsx` (só atributos de `<img>`),
`src/components/auth/AuthShell.tsx`, o relato.

1. **framer-motion fora da home pública.** Correção do Orquestrador ao relato 1A (seção 7a):
   a home pública **baixa** o framer-motion. Prova no `dist/` atual: `Home-*.js` importa
   estaticamente `AccountHomeContent-*.js`, que importa `SegmentedControl-*.js`, que importa
   `use-reduced-motion-*.js` (40 kB gzip). Causa: `src/pages/Home.tsx:6` reexporta `HomeContent`
   de `AccountHomeContent`, e ninguém usa essa reexportação (`MemberHome.tsx:1` importa direto do
   componente). Mudança: remover a reexportação, depois de confirmar com `grep` em `src/`,
   `tests/` e `scripts/` que nada a usa.
   Aceite: depois do build, `Home-*.js` não importa `AccountHomeContent` nem `SegmentedControl`;
   a lista de pré-carga da rota da home no `index-*.js` não contém `use-reduced-motion`; a home
   logada (`/app`) continua igual.
2. **Pré-carga da página logada da empresa só para quem está logado.**
   `src/components/NavigationIntent.tsx:49-50` pré-carrega `StockResearch` (137 kB gzip) também
   para visitante, que recebe `PublicCompany` (`src/pages/PublicStock.tsx:38`).
   Aceite: visitante sem sessão, com mouse ou foco num link `/ranking/acao/<ticker>`, não baixa
   `StockResearch-*.js`; logado continua pré-carregando.
3. **Logo do herói.** `public/ediv-logo-clean.png` (138.503 B, 512×512) em
   `PublicHeroBrand.tsx:43` e `:52`. Gerar `public/ediv-logo-clean.webp` do mesmo arquivo, sem
   reduzir abaixo de 512×512, com transparência preservada, usando ferramenta já instalada na
   máquina (Python com Pillow, se existir; **não** instalar pacote npm). Usar `<picture>` com WebP
   e o PNG como alternativa, mantendo `width`/`height`, `alt` e o comportamento atual
   (`loading`/`fetchpriority`). Só adotar se o WebP ficar pelo menos 40% menor; senão, relatar e
   não mudar.
   Aceite: tamanho dos dois arquivos no relato; aparência igual em 320, 768 e 1280 px, claro e
   escuro (capturas comparadas); sem salto de layout.
4. **Dimensões explícitas nos ícones** de 192 px: `SiteChrome.tsx:89` e `:256`,
   `DashboardLayout.tsx:372` e `:465`, `AuthShell.tsx:22`. Aceite: `width` e `height` presentes,
   iguais à proporção real; visual igual.

Fora do escopo: tokens de movimento, skeletons, `min-h` do menu (entregas 2B e 2C); qualquer
texto, regra financeira, margem ou cotação.

Validação extra: `npm run build` e, com `npx vite preview --port 4173`,
`node tests/perf-baseline.mjs` (script do Vigia) só para conferir o `/` (framer-motion baixado:
não). Relatar os tamanhos de `Home-*.js` e o total de JS da home antes e depois.

## 2D — Tijolo: cache público seguro e consultas (P1/P2)

Arquivos permitidos: `server/support.js`, o arquivo onde vive `sharedCache` (se precisar só
reaproveitar, não mudar), um teste novo `tests/public-cache.test.mjs` (incluir em `npm test` no
`package.json` **somente** se o teste não depender de banco), `server/rankings.js` (item 2), o relato.

1. **Cache de borda em `/api/support/information`.** Antes, provar que a resposta não depende de
   sessão nem de usuário (ler a rota). Se for igual para todos, aplicar o mesmo `sharedCache` das
   rotas públicas existentes, com `s-maxage` e `stale-while-revalidate` coerentes com a
   frequência de mudança (o deploy da Vercel já invalida o cache da borda). Se depender de
   sessão, **não** cachear e relatar.
   **`/api/learning` não entra:** a resposta inclui o progresso do usuário logado
   (`server/learning.js:10-20`), e a borda não separa por cookie. Registrar como pendência.
   Aceite: teste que confere `Cache-Control` da rota; resposta idêntica com e sem cookie.
2. **`SELECT *` em `ranking_publications`** (`server/rankings.js:76`, `:184`, `:212`). Só trocar
   por colunas explícitas se houver coluna grande (JSON/TEXT/BLOB) que o chamador comprovadamente
   não usa. Para cada consulta: colunas da tabela (pela migração), campos que o chamador lê, e a
   decisão. Se não houver ganho real, não mudar e relatar.
   Aceite: testes existentes de ranking verdes; JSON das respostas igual campo a campo.

Fora do escopo (decisões do Orquestrador, registrar no relato como "adiado"):
- Índices de suporte e de usuários do admin: sem MySQL descartável local nem Docker para o
  `EXPLAIN`, e o volume atual do beta não indica lentidão. Nenhuma migração nesta missão sem
  plano de execução medido.
- Paginação do ledger do portfólio no SQL: as posições dependem do ledger inteiro; risco em
  cálculo financeiro maior que o ganho com o volume atual.
- Retry de e-mail e do assistente: manter como está (e-mail não é idempotente).
- Remoção de `autoprefixer` e `prettier`: vai na entrega 2E, depois, sozinha, para não mexer em
  `node_modules` enquanto o Pincel roda build e testes.

## 1E — Vigia: atribuição do CLS de produção (roda em paralelo com 2A e 2D)

Motivo: o relato 1C mediu em produção CLS 0,628 (390 px) e 0,189 (1280 px) em
`/ranking/acao/TIMS3`, e 0,41–0,42 em `/glossario`. Localmente, sem API, o CLS dessas páginas
fica entre 0,009 e 0,14. Hipóteses do Orquestrador, a confirmar com medição: (1) `dist/acao.html`
tem o `#root` vazio e `PublicStock.tsx:32-38` mostra "Verificando seu acesso à pesquisa…"
antes do conteúdo, empurrando o rodapé; (2) o glossário pré-renderizado é refeito quando
`/api/learning` responde (`src/pages/Glossario.tsx:28-30`).

Arquivos permitidos: `tests/perf-baseline.mjs`, `.test-artifacts/perf-api/` (pasta ignorada pelo
Git), `docs/harness/relatos/qa-cls-2026-11-16.md`.

1. **Identificar a chamada `/api` com erro.** O script passa a registrar método, endereço e status
   das respostas `/api` com status ≥ 400. Hipótese: `GET /api/auth/me` → 401 para visitante, que
   é o comportamento esperado (`server/auth.js:521-527`).
2. **Atribuição em produção (terceira e última carga autorizada por página).** Uma carga em
   390 px de `/ranking/acao/TIMS3` e uma de `/glossario`, registrando cada entrada `layout-shift`
   (`value`, `hadRecentInput`, horário) e as `sources` (seletor do nó, `previousRect`,
   `currentRect`). Mesmas regras do passo 6b do brief 1C (GET, sem login, sem formulário, sem
   clicar no aviso de cookies, analytics bloqueado). Não carregar outras páginas de produção.
3. **Reprodução local com API simulada.** Modo `MOCK_API=1` no script: as respostas de
   `/api/learning`, `/api/rankings/public`, `/api/rankings/status` e `/api/auth/me` vêm de
   arquivos em `.test-artifacts/perf-api/` (capturados das respostas públicas durante as cargas do
   passo 2, sem nova requisição), com atraso configurável `MOCK_DELAY_MS` (padrão 600). Servir o
   `dist/` **de base** guardado pelo Orquestrador em `.test-artifacts/dist-base/`
   (`npx vite preview --outDir .test-artifacts/dist-base --port 4173`), nunca o `dist/` atual,
   que o Pincel vai reconstruir na 2A.
   Aceite: o CLS local com `MOCK_API=1` nas duas páginas fica na mesma ordem de grandeza do de
   produção, e a atribuição aponta os mesmos nós. Esse número vira o "antes" da 2F.
4. Relato com a tabela de atribuição, a causa provável de cada salto e o comando exato para
   repetir a medição local depois da correção.

Fora do escopo: corrigir o CLS; medir outras páginas de produção; instalar dependência.

## 2F — Pincel: CLS da página pública da empresa e do glossário (depois do ajuste da 2A)

Evidência: relato `docs/harness/relatos/qa-cls-2026-11-16.md` (Vigia, 1E). Medição "antes"
oficial: 4 números do Vigia com `MOCK_API=1` no dist de base (vão no relato dele). Arquivos
permitidos: `src/pages/Glossario.tsx`, `src/App.tsx` (só a linha da rota `/glossario`, se
necessário), `scripts/prerender.mjs` (só para embutir os dados do glossário, item 1),
`src/pages/PublicStock.tsx`, um componente novo de skeleton em `src/components/` se ajudar, e o
relato `docs/harness/relatos/interface-etapa2f-2026-11-16.md`.

1. **Glossário — causa confirmada pelo Orquestrador no código.** `src/main.tsx:2,12` usa
   `createRoot` (não hidrata). O pré-render passa `initialTerms={learning.glossary}`
   (`src/entry-server.tsx:21`), mas o cliente renderiza `<Glossario />` sem termos
   (`src/App.tsx:135`). Por isso, a primeira pintura do React troca a lista pré-renderizada por
   "Carregando glossário…" (`Glossario.tsx:50-53`), a página encolhe, e cresce de novo quando
   `/api/learning` responde. O Vigia mediu 0,411 em 390 px, com o rodapé e `a.action-secondary`
   se movendo. Correção esperada: o cliente começa com os mesmos termos do HTML pré-renderizado.
   Proposta preferida: o pré-render embute a lista do glossário no HTML como
   `<script type="application/json" id="...">` (dado público, já presente no HTML como texto), e o
   cliente lê esse JSON como `initialTerms`. A chamada a `/api/learning` continua, para atualizar a
   lista se mudar. Alternativa que o Pincel pode propor, se for menor e segura: explicar no relato.
   Não importar `server/` no cliente.
2. **Página pública da empresa — causa provável, a confirmar pela medição.** `dist/acao.html` tem
   `#root` vazio. Com a sessão carregando, `PublicStock.tsx:32-36` mostra uma linha
   "Verificando seu acesso à pesquisa…" sem altura reservada, e o rodapé sobe para a tela. Quando
   `/api/auth/me` responde, `PublicCompany` mostra `min-h-[70vh]` com "Carregando a pesquisa da
   empresa…" (`:159-164`), o que é o primeiro salto do rodapé (~2,1 s em produção). Quando os dados
   chegam, o conteúdo fica maior que 70vh, e vem o segundo salto (~2,5 s). Correção esperada: o
   mesmo skeleton, com a estrutura e a altura aproximadas do conteúdo final da página pública,
   nos dois estados de espera (sessão e dados), de modo que o rodapé fique abaixo da dobra em 390
   e 1280 px. Mantém `role="status"`/`aria-busy`, anima só com `transform`/`opacity` e respeita
   `prefers-reduced-motion`. Erro e dado ausente continuam como hoje ("indisponível", nunca zero).
3. Medir o "depois" com o mesmo comando do Vigia, trocando `DIST_DIR=dist` e servindo o `dist/`
   novo na porta 4173 (`tests/perf-baseline.mjs` só para rodar, sem editar). 3 cargas, 390 e 1280 px.

Aceite: CLS local com `MOCK_API=1` abaixo de 0,1 em `/glossario` e `/ranking/acao/TIMS3`, em 390 e
1280 px (média de 3 cargas), com a atribuição mostrando que o rodapé não se move mais; nenhum
conteúdo escondido; textos legais e avisos intactos; `npm run lint`, `npm test`, `tsc`, `npm run
build` e `node --test tests/seo.dist.mjs` passando; o HTML pré-renderizado do glossário continua
com os termos visíveis (SEO).

## 2C — Pincel: skeletons contextuais (depois da 2F)

Base: relato 1A, seção 5 e recomendações 5 e 6. Reaproveitar o padrão de skeleton criado na 2F
(`src/components/PublicCompanySkeleton.tsx`), sem duplicar estilos.

1. `RankingHighlights.tsx:188` e `ResearchSample.tsx:49`: trocar "Carregando…" por skeleton com a
   mesma altura e estrutura do conteúdo final (linhas da tabela/cards). Aceite: altura do bloco
   igual antes e depois de carregar (medida em 390 e 1280 px), sem salto do que vem abaixo.
2. `PageLoading` (`src/components/PageContent.tsx:6-29`), fallback das rotas: avaliar se uma forma
   genérica com altura mínima de tela evita o salto do rodapé ao trocar de página; formas por tipo de
   rota só se a medição mostrar ganho. Sem mexer em `src/App.tsx` (a 2F já mexe), a não ser que seja
   inevitável; nesse caso, perguntar.
3. Todos os skeletons: `aria-busy`/`role="status"` com texto para leitor de tela, animação só com
   `opacity`/`transform`, desligada com `prefers-reduced-motion`; erro e dado ausente continuam como
   hoje ("indisponível", "não informado", nunca zero).

## 2B — Pincel: tokens de movimento e consistência (depois da 2C)

Base: relato 1A, seções 2, 3 e 4, e recomendações 3, 4 e 8.

1. Tokens de duração e easing em `src/index.css`, ao lado de `--ediv-ease` (`:34`), com os mesmos
   valores que já existem (140, 150, 160, 180, 250 ms), sem mudança visual. Trocar os literais em
   `src/index.css`, `src/components/learning-workspace.css` e `src/components/navigation-chrome.css`.
   Aceite: `grep` de durações literais nesses arquivos cai para zero ou só sobram casos justificados;
   capturas iguais.
2. Tailwind lendo `docs/`: acrescentar em `src/index.css` a exclusão dos `.md` de documentação da
   detecção automática (`@source not "../docs";`, Tailwind 4.3.3). Aceite: depois do build, o
   `index-*.css` não traz classes que só existem em `docs/` (ex.: `.ease-in-out` se não houver uso em
   `src/`); visual igual.
3. `min-h-11` em `src/layouts/DashboardLayout.tsx:259`, `:286`, `:322` (alvo de toque 44 px).
4. `motion-reduce:animate-none` em `src/components/PortfolioPulse.tsx:148`.
5. Microinterações: só onde o relato 1A ou a revisão mostrar falta de feedback de toque/foco em
   botões e cards principais; usar os tokens novos; nada de animação longa ou repetitiva.

## Próxima rodada (resumo, sem brief ainda)

Ordem do Pincel depois de 2A: **2F (CLS) → 2C (skeletons) → 2B (tokens)**. O CLS medido em
produção tem mais impacto real que a padronização dos tokens.

- **2B (Pincel):** tokens de duração e easing em `src/index.css` a partir da seção 2 do relato 1A
  (mesmos valores, sem mudança visual); trocar literais nos arquivos com mais ocorrências;
  `min-h-11` em `DashboardLayout.tsx:259`, `:286`, `:322`; `motion-reduce:animate-none` em
  `PortfolioPulse.tsx:148`.
- **2C (Pincel):** skeletons contextuais (`PageLoading` por tipo de rota; `RankingHighlights.tsx:188`
  e `ResearchSample.tsx:49`), com estados de erro e de dado ausente preservados.
- **2E (Tijolo):** remover `autoprefixer` e `prettier` com prova de não uso; diff do lockfile só
  com remoções.
- **Eixo C:** organização com a skill `zizi-skills:code-quality`, depois de 2A–2E.
