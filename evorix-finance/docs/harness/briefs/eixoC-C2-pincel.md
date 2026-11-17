# Brief C2 — Pincel: exclusões com prova (Eixo C)

Para: Pincel (interface). Eixo C, fatias 1 a 4 do relato C1. **Só comece depois que a 2F passou na revisão** e o Pincel liberou os caminhos dela (`release`). Não rode junto com um build de outro papel.

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
git status --short
node scripts/harness.mjs claim interface src/pages/Carteira.tsx src/pages/Dashboard.tsx src/pages/Favoritos.tsx src/components/PortfolioExtras.tsx src/components/PortfolioPulse.tsx src/hooks/usePortfolio.ts src/hooks/useFavoritos.ts src/hooks/useMarketQuotes.ts src/lib/portfolio.ts src/lib/portfolioInsights.ts src/components/DividendDashboard.tsx src/components/ComparativeDividendChart.tsx src/components/fundamental-center.css src/components/ScoreIndicator.tsx src/components/AlgoInsight.tsx src/data/mockData.ts src/pages/Autenticacao.tsx src/components/ResearchAvailability.tsx src/hooks/useResearchStatus.ts src/components/home/LearningTerms.tsx src/lib/publicHomeTerms.ts src/components/home/ReadingChecklist.tsx src/assets/hero.png src/assets/vite.svg src/assets/react.svg src/components/home/AccountHomeContent.tsx src/components/RankingPreview.tsx docs/CENTRAL-FUNDAMENTALISTA.md docs/DASHBOARD-DIVIDENDOS.md docs/CARTEIRA-E-INSIGHTS.md docs/HOME-PUBLICA.md docs/IDENTIDADE-EDITORIAL.md docs/REVISAO-VISUAL-ACOES.md docs/EVOLUCAO-2026-11-13.md docs/harness/relatos/interface-eixoc-c2-2026-11-17.md
node scripts/harness.mjs update interface trabalhando "C2: exclusões com prova (clusters A, B, C, assets, RankingPreview) e linha de status nos docs"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. **Pare e avise também se:** (a) `status` mostrar outro papel com qualquer um desses caminhos; (b) `git status --short` mostrar algum desses arquivos como modificado (`M`), porque alguém editou um "órfão"; (c) o `claim` falhar. Ao terminar:

```
node scripts/harness.mjs update interface revisao "C2 pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Apagar o código de `src/` que a Lupa provou sem uso (22 arquivos, 3 imagens do modelo Vite e o ramo "não-membro" da home da conta com o `RankingPreview`), **refazendo a prova de cada um no estado atual da árvore** antes de apagar, sem mudar nada que o usuário vê.

## Contexto mínimo

- Plano: `docs/harness/briefs/02-plano-eixo-c.md`, seção "C2". Diagnóstico: `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`, seção 4 (clusters A, B e C, candidatos 1 a 3 e 6) e seção 5 (fatias 1 a 4).
- **Decisão do dono em 17/11: apagar os clusters A e B** (interface antiga da Carteira, do Painel e dos Favoritos; painel fundamentalista antigo). Os clusters são decisão de produto já tomada: você refaz a **prova técnica**, não a decisão.
- Skill `zizi-skills:code-quality`, arquivo `dead-code.md`:
  `C:/Users/vitor/.claude/plugins/synced/e8a32b2e-8616-4d23-ba7a-3c77461c316a_cb34b0bb-9950-46ae-9789-1cfb8f5028c3/11922719-c2b0-4b58-9751-2dd37b3f91f9/skills/code-quality/dead-code.md` (204 linhas). **Leia inteiro** e siga: Step 0 (linha de base verde antes de apagar), Step 1 e 2 (busca em todo o projeto, inclusive strings, rotas, CSS, HTML, configuração), Step 4 (na dúvida, não apague; sinalize) e "Output when asked to remove dead code". Exclusão em grupo próprio, sem refatoração junto.
- A árvore mudou desde o C1: tem alterações não commitadas da 2A, 2D e 2F (inclusive `src/pages/Home.tsx` sem o reexport de `HomeContent`).
- Atenção a nomes parecidos que **não** entram na lista (não apague):
  - `src/layouts/DashboardLayout.tsx` (layout do app; só `src/pages/Dashboard.tsx` é órfão).
  - `src/context/FavoritesProvider.tsx` e `src/context/favoritesContext.ts` (o provedor ainda é montado em `src/entry-server.tsx:4,36`; o único consumidor era `useFavoritos.ts`; fica como "sinalizar" no relato).
  - `server/portfolio.js`, `server/portfolio-insights.js`, `server/market.js`, `tests/portfolio-insights.test.mjs` (a versão do servidor; as rotas `/api/portfolio*` e `/api/market/quotes` continuam por contrato e teste).
  - `src/components/SegmentedControl.tsx`: continua usado por `src/pages/Configuracoes.tsx`.
- Os redirecionamentos `/app/carteira` e `/app/favoritos` em `src/App.tsx:189..196` e o mapeamento em `src/components/NavigationIntent.tsx:31..32` **ficam**: o código antigo some, as rotas continuam redirecionando.

### Lista exata (do relato C1, seção 4, conferida em 17/11: todos os arquivos existem)

**Grupo 1 — Cluster A: carteira, painel e favoritos retirados (10 arquivos, ≈2.540 linhas)**

| Arquivo | Linhas hoje |
|---|---|
| `src/pages/Carteira.tsx` | 573 |
| `src/pages/Dashboard.tsx` | 275 |
| `src/pages/Favoritos.tsx` | 254 |
| `src/components/PortfolioExtras.tsx` | 631 |
| `src/components/PortfolioPulse.tsx` | 387 |
| `src/hooks/usePortfolio.ts` | 193 |
| `src/hooks/useFavoritos.ts` | 10 |
| `src/hooks/useMarketQuotes.ts` | 78 |
| `src/lib/portfolio.ts` | 71 |
| `src/lib/portfolioInsights.ts` | 57 |

**Grupo 2 — Cluster B: painel fundamentalista antigo (3 arquivos, ≈1.470 linhas)**

| Arquivo | Linhas hoje |
|---|---|
| `src/components/DividendDashboard.tsx` | 617 |
| `src/components/ComparativeDividendChart.tsx` | 229 |
| `src/components/fundamental-center.css` | 621 |

**Grupo 3 — Cluster C: pequenos órfãos (9 arquivos, ≈300 linhas) e 3 imagens do modelo Vite**

| Arquivo | Linhas hoje |
|---|---|
| `src/components/ScoreIndicator.tsx` | 21 |
| `src/components/AlgoInsight.tsx` | 38 |
| `src/data/mockData.ts` | 65 (é o único arquivo de `src/data/`; a pasta fica vazia, o git não a rastreia) |
| `src/pages/Autenticacao.tsx` | 5 |
| `src/components/ResearchAvailability.tsx` | 13 |
| `src/hooks/useResearchStatus.ts` | 18 (só `ResearchAvailability.tsx` o importa) |
| `src/components/home/LearningTerms.tsx` | 55 |
| `src/lib/publicHomeTerms.ts` | 30 (só `LearningTerms.tsx` o importa) |
| `src/components/home/ReadingChecklist.tsx` | 51 |
| `src/assets/hero.png` | imagem (13 KB) |
| `src/assets/vite.svg` | imagem (8,7 KB) |
| `src/assets/react.svg` | imagem (4,1 KB) |

Total: 22 arquivos de código ou estilo (4.314 linhas segundo o C1) e 3 imagens.

**Grupo 4 — Ramo não-membro da home da conta (1 edição e 1 exclusão)**

- Editar `src/components/home/AccountHomeContent.tsx` **só** em duas linhas: a linha 7 (`import { RankingPreview } from "../RankingPreview";`) sai, e a linha 111, `{member ? <MemberHomeBrand /> : <RankingPreview />}`, vira `<MemberHomeBrand />`. Prova do C1: o único chamador é `src/pages/MemberHome.tsx:6` (`<HomeContent member />`), então `member` é sempre verdadeiro; `awaitingRegistration` nunca é passado.
- Apagar `src/components/RankingPreview.tsx` (151 linhas), que só `AccountHomeContent.tsx:7` importa.
- **Não simplifique** o resto de `AccountHomeContent.tsx` (a prop `member`, `awaitingRegistration` e os outros ramos `member ? … : …` das linhas 23..60 e 97..109 continuam). Isso é uma refatoração separada; ver "Fora do escopo" e a pergunta do relato.

**Grupo 5 — Prosa que acompanha a mudança (7 documentos, 1 linha de status em cada)**

Decisão do Orquestrador em 17/11: a skill manda a prosa acompanhar a mudança. Em cada documento que descreve código apagado, acrescente **uma linha de status no topo e nenhuma outra mudança**. Como achar (rode os dois comandos em `evorix-finance/` no início e confira que a lista bate):

```
grep -rlE "pages/Dashboard|Carteira\.tsx|Favoritos\.tsx|PortfolioExtras|PortfolioPulse|usePortfolio|useFavoritos|useMarketQuotes|lib/portfolio\.ts|src/lib/portfolioInsights|DividendDashboard|ComparativeDividendChart|fundamental-center|ScoreIndicator|AlgoInsight|mockData|Autenticacao\.tsx|ResearchAvailability|useResearchStatus|LearningTerms|publicHomeTerms|ReadingChecklist|RankingPreview|hero\.png|vite\.svg|react\.svg" docs ../README.md ../AGENTS.md
ls docs | grep -i -E "carteira|portfolio|favorit"
```

Esperado (17/11): o primeiro comando lista `docs/CENTRAL-FUNDAMENTALISTA.md`, `docs/DASHBOARD-DIVIDENDOS.md`, `docs/EVOLUCAO-2026-11-13.md`, `docs/HOME-PUBLICA.md`, `docs/IDENTIDADE-EDITORIAL.md`, `docs/REVISAO-VISUAL-ACOES.md`, `docs/UX-PERFORMANCE-2026-11-16.md` e arquivos de `docs/harness/`; o segundo lista `CARTEIRA-E-INSIGHTS.md` (descreve a interface retirada da Carteira, do Painel e dos Favoritos, sem citar nomes de arquivo). **Não edite** `docs/UX-PERFORMANCE-2026-11-16.md` (documento de coordenação, que já registra a decisão) nem nada em `docs/harness/`. Se o `grep` achar **outro** documento, **não o edite**: liste no relato.

Onde inserir: logo depois da primeira linha do arquivo (o título `# …`), acrescente três linhas, na ordem: uma linha em branco, a linha de status abaixo, uma linha em branco. O resto do arquivo não muda (`git diff --numstat` mostra `3	0` para cada um dos 7). Linha de status de cada um, **exatamente** (data 17/11/2026, Eixo C, C2):

Linha de cada documento (copie a linha inteira, com as crases):

````
docs/CENTRAL-FUNDAMENTALISTA.md
> Retirado: a central descrita aqui (`DividendDashboard.tsx`, `ComparativeDividendChart.tsx` e `fundamental-center.css`) foi removida em 17/11/2026 (Eixo C, C2). Ver o histórico do git.

docs/DASHBOARD-DIVIDENDOS.md
> Retirado: `src/components/DividendDashboard.tsx`, citado neste documento, foi removido em 17/11/2026 (Eixo C, C2). Ver o histórico do git.

docs/CARTEIRA-E-INSIGHTS.md
> Retirado: a interface de Carteira, Painel e Favoritos descrita aqui foi removida do código em 17/11/2026 (Eixo C, C2); as rotas e o cálculo do servidor continuam. Ver o histórico do git.

docs/HOME-PUBLICA.md
> Retirado: `ReadingChecklist.tsx`, `LearningTerms.tsx` e `src/lib/publicHomeTerms.ts`, citados neste documento, foram removidos em 17/11/2026 (Eixo C, C2). Ver o histórico do git.

docs/IDENTIDADE-EDITORIAL.md
> Retirado: `RankingPreview.tsx`, citado neste documento, foi removido em 17/11/2026 (Eixo C, C2). Ver o histórico do git.

docs/REVISAO-VISUAL-ACOES.md
> Retirado: `DividendDashboard.tsx`, `fundamental-center.css` e `ComparativeDividendChart.tsx`, citados neste documento, foram removidos em 17/11/2026 (Eixo C, C2). Ver o histórico do git.

docs/EVOLUCAO-2026-11-13.md
> Retirado: `DividendDashboard.tsx`, citado neste registro, foi removido em 17/11/2026 (Eixo C, C2). Ver o histórico do git.
````

Só faça a linha de cada documento **depois** que o grupo do código que ele cita foi apagado e validado (grupo 1 para a Carteira, 2 para o painel, 3 para `ReadingChecklist` e `LearningTerms`, 4 para `RankingPreview`).

## Pode ler / pode editar

- **Pode ler** qualquer arquivo do projeto, exceto `.env*`.
- **Pode apagar:** só os arquivos das tabelas dos grupos 1, 2, 3 e `src/components/RankingPreview.tsx`.
- **Pode editar:** `src/components/home/AccountHomeContent.tsx` (as duas linhas do grupo 4) e, **só para inserir a linha de status do grupo 5**, os 7 documentos: `docs/CENTRAL-FUNDAMENTALISTA.md`, `docs/DASHBOARD-DIVIDENDOS.md`, `docs/CARTEIRA-E-INSIGHTS.md`, `docs/HOME-PUBLICA.md`, `docs/IDENTIDADE-EDITORIAL.md`, `docs/REVISAO-VISUAL-ACOES.md` e `docs/EVOLUCAO-2026-11-13.md`.
- **Pode criar:** o relato `docs/harness/relatos/interface-eixoc-c2-2026-11-17.md`.

## Fora do escopo

- Qualquer arquivo de `public/` (as logos `ediv-logo.png` e `ediv-logo-transparent.png` ficam como "não provado, sinalizar"), de `server/`, de `tests/`, `scripts/`, `package.json` e `docs/` (**exceto** a linha de status dos 7 documentos do grupo 5).
- Apagar `FavoritesProvider.tsx`, `favoritesContext.ts`, `SegmentedControl.tsx`, `DashboardLayout.tsx` ou qualquer arquivo fora das tabelas.
- Simplificar `AccountHomeContent.tsx` além das duas linhas do grupo 4, ou mexer em `src/pages/MemberHome.tsx`, `src/pages/Home.tsx`, `src/App.tsx`, `src/components/NavigationIntent.tsx`.
- Apagar CSS compartilhado que sobrar (classes que só os arquivos apagados usavam): **liste no relato, não edite**.
- Mexer nos documentos além da **uma** linha de status do grupo 5: não reescreva, não apague, não corrija o texto antigo (`docs/CENTRAL-FUNDAMENTALISTA.md:42`, `docs/DASHBOARD-DIVIDENDOS.md:81` etc. ficam como estão). Documento que o `grep` do grupo 5 achar e que **não** está na lista de 7: liste no relato, não edite. `docs/UX-PERFORMANCE-2026-11-16.md` e `docs/harness/` ficam intocados.
- Mudar qualquer regra financeira, margem, cotação, texto legal ou número exibido. Refatorar, renomear ou "aproveitar" o que está perto.
- `npm install`, instalar ferramenta, medir ou abrir produção.

## Passos

1. **Linha de base (Step 0 do `dead-code.md`).** Antes de apagar qualquer coisa, na árvore como está: `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test` e `npm run build`. Registre o resultado de cada um. **Se algum falhar, pare e avise** o Orquestrador: sem linha de base verde não dá para saber se uma quebra veio da exclusão.
2. **Fotografia "antes".**
   - `git status --short > <seu diretório temporário>/status-antes.txt` (fora do repositório).
   - Com o build do passo 1: `ls dist/assets` guardado em `chunks-antes.txt`, **sem o hash** (troque `-XXXXXXXX.` por `.`; por exemplo `ls dist/assets | sed -E 's/-[A-Za-z0-9_-]{8}\./\./' | sort`), mais o total em bytes de `dist/assets`.
   - Capturas de `/app` com o `dist/` atual servido em `npx vite preview --port 4173`, em 390×844 e 1280×800, claro e escuro (forçar o tema como `public/theme-init.js` faz), com `reducedMotion: "reduce"`. Sessão **simulada** no script Playwright **descartável fora do repositório**: `page.route` em `GET /api/auth/me` devolvendo 200 com um usuário **fictício** (`{ user: { id, name, email, emailVerified, createdAt, role: "USER", permissions: [] } }`, com nome e e-mail inventados, por exemplo `Pessoa Teste (fictício)` e `teste@example.invalid`), e todas as outras rotas `/api/*` abortadas com 503. Se a simulação de sessão não funcionar, registre "capturas de `/app` não executadas" e o motivo; o critério então fica provado só pelos testes e pelo `git diff`.
3. **Prova por arquivo (Step 1, 2 e 4 do `dead-code.md`), para cada um dos arquivos das tabelas e para `RankingPreview.tsx`.** Refaça no estado atual, **antes de apagar** o grupo.
   - **Calibre o detector** com um símbolo que você sabe que está em uso (`SegmentedControl` deve aparecer em `src/pages/Configuracoes.tsx` e em `src/components/RankingPreview.tsx`) e confirme que a busca o encontra.
   - Para cada arquivo, procure o nome do arquivo e o nome do símbolo exportado, sem contar o próprio arquivo e **sem contar outros arquivos do mesmo grupo** (arquivos que serão apagados juntos podem se importar). Onde procurar: `src/`, `server/`, `tests/`, `scripts/`, `public/`, `index.html`, `vercel.json`, `site-pages.mjs`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `package.json`. Exemplo: `grep -rnE "PortfolioPulse" src server tests scripts public index.html vercel.json site-pages.mjs vite.config.ts`.
   - Procure também por forma de texto: `import(`, `lazy(`, `import.meta.glob`, nomes entre aspas em arrays, rota (`path=`, `site-pages.mjs`, `pageImports.ts`, `NavigationIntent.tsx`), seletor CSS e `url(` para as imagens e o CSS.
   - **Leia os acertos, não conte** (`dead-code.md`, Step 1): um nome como `Carteira`, `Favoritos` ou `Dashboard` aparece em texto, em variável ou em outro arquivo de nome parecido sem ser importação. No estado de 17/11 a busca por nome simples dá, fora dos próprios grupos, só estas ocorrências **que não são uso** (confira de novo): `Carteira` em `server/assistant.js:37` (texto), `Favoritos` em `src/context/FavoritesProvider.tsx` (variável `favoritos`), `portfolioInsights` em `server/portfolio.js`, `server/portfolio-insights.js` e `tests/portfolio-insights.test.mjs` (a versão do servidor, não `src/lib/portfolioInsights.ts`) e `SegmentedControl` em `Configuracoes.tsx`.
   - Resultado por arquivo: **"morto com prova"**, **"vivo"** ou **"não provado (sinalizar)"**. **Só apague o que ficou "morto com prova".** Se algum for "vivo" ou "não provado", **não apague**, e pare o grupo dele e avise o Orquestrador no relato (os outros grupos seguem).
4. **Apagar por grupo, na ordem 1, 2, 3, 4**, com `rm` (não use `git rm`, para não mexer no índice). Os 26 arquivos da lista estão versionados no HEAD (conferido em 17/11); confirme de novo com `git ls-files <caminho>` antes de apagar cada um. Depois de cada grupo rode `npx tsc -p tsconfig.app.json --noEmit` e `npm run lint`. Se falhar por importação que sobrou, **restaure o arquivo** com `git show HEAD:<caminho> > <caminho>`, trate o grupo como "não provado" e avise no relato; não conserte a importação editando outro arquivo.
5. **Grupo 4.** Faça as duas edições de `AccountHomeContent.tsx` e apague `RankingPreview.tsx`. Confirme antes que `grep -rn "HomeContent" src tests scripts` só mostra `AccountHomeContent.tsx` e `MemberHome.tsx` (`<HomeContent member />`). Se aparecer outro chamador ou `src/pages/Home.tsx` voltar a reexportar `HomeContent`, **pare**: a prova do C1 depende disso.
6. **Grupo 5 (docs).** Depois que o código de cada grupo foi apagado e validado, insira a linha de status em cada um dos 7 documentos (texto e posição do grupo 5). Confira com `git diff --numstat -- docs/CENTRAL-FUNDAMENTALISTA.md docs/DASHBOARD-DIVIDENDOS.md docs/CARTEIRA-E-INSIGHTS.md docs/HOME-PUBLICA.md docs/IDENTIDADE-EDITORIAL.md docs/REVISAO-VISUAL-ACOES.md docs/EVOLUCAO-2026-11-13.md` (cada um `3	0`: três linhas acrescentadas, nenhuma removida) e abra um deles para ver que a linha aparece logo abaixo do título.
7. **Validação final** (comandos abaixo) e fotografia "depois": o mesmo `ls dist/assets` sem hash, o total em bytes e as mesmas capturas de `/app` do passo 2.
8. **Relato** com a prova de cada arquivo (ver "Formato do relato"). Não faça commit (decisão confirmada em 17/11): liste no relato, por grupo, os caminhos exatos. A Chave fará, na publicação, **4 commits de exclusão** (grupos 1, 2, 3 e 4), separados dos de refatoração; as linhas de status dos docs (grupo 5) vão em commit à parte, que a Chave decide.

## Critérios de aceite (observáveis)

- [ ] Linha de base verde registrada antes de apagar (lint, tsc, `npm test`, build).
- [ ] Relato com a prova de cada um dos 22 arquivos, das 3 imagens e de `RankingPreview.tsx` (onde procurou, o que achou e descartou, veredito). Nenhum arquivo apagado com veredito diferente de "morto com prova".
- [ ] Os 22 arquivos, as 3 imagens e `RankingPreview.tsx` não existem mais (`git status --short` mostra ` D` para cada um, 26 exclusões no total: 10 + 3 + 9 + 3 imagens + 1) e **nenhum outro arquivo foi apagado**.
- [ ] `git diff -- src/components/home/AccountHomeContent.tsx` mostra só a remoção do `import` de `RankingPreview` e a troca da linha 111 por `<MemberHomeBrand />`.
- [ ] `grep -rnE "pages/Carteira|pages/Dashboard|pages/Favoritos|PortfolioExtras|PortfolioPulse|usePortfolio|useFavoritos|useMarketQuotes|lib/portfolio\"|DividendDashboard|ComparativeDividendChart|fundamental-center|ScoreIndicator|AlgoInsight|mockData|pages/Autenticacao|ResearchAvailability|useResearchStatus|LearningTerms|publicHomeTerms|ReadingChecklist|RankingPreview|hero\.png|vite\.svg|react\.svg" src tests scripts server public index.html vercel.json site-pages.mjs vite.config.ts` não acha nada (se achar, cada ocorrência é explicada no relato como menção e não uso).
- [ ] `git diff --stat` não mostra alteração nova em `server/`, `tests/`, `scripts/`, `public/`, `package.json`, `src/App.tsx`, `src/pages/MemberHome.tsx`, `src/pages/Home.tsx`, `src/components/NavigationIntent.tsx` além das que já estavam antes (compare com `status-antes.txt`).
- [ ] `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run build` e `node --test tests/seo.dist.mjs` passam.
- [ ] A lista de nomes de arquivos de `dist/assets` sem hash é a **mesma** antes e depois, ou cada diferença é explicada (esperado: nenhum chunk some, porque os órfãos não estavam no grafo; o chunk de `AccountHomeContent` pode ficar menor). O total em bytes é registrado antes e depois.
- [ ] Capturas de `/app` iguais antes e depois (390 e 1280 px, claro e escuro), ou "não executada" com o motivo.
- [ ] Os 7 documentos do grupo 5 têm a linha de status exata, logo abaixo do título, e **nada mais** mudou neles (`git diff --numstat` com `3	0` em cada um; nenhum outro arquivo de `docs/` alterado). O `grep` do grupo 5 foi rodado no começo e no fim e a lista bateu (ou o documento extra foi listado no relato, sem edição).
- [ ] O relato lista: CSS que só os arquivos apagados usavam (sinalizar), documentos achados pelo `grep` que não estão nos 7 (sinalizar), as outras ramificações `member`/`awaitingRegistration` de `AccountHomeContent.tsx` (**recomendação** para uma fatia futura, confirmado em 17/11: não simplificar agora), `FavoritesProvider.tsx`/`favoritesContext.ts` sem consumidor (sinalizar), e `public/ediv-logo*.png` e as rotas `/api/portfolio*` e `/api/market/quotes` como "mantidos por contrato, não tocados".
- [ ] `git status --short` lista só os caminhos permitidos, mais `docs/harness/state.json` e os arquivos dos outros executores.

## Comandos de validação (em `evorix-finance/`)

```
git status --short
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test
npm run build
node --test tests/seo.dist.mjs
ls dist/assets | sed -E 's/-[A-Za-z0-9_-]{8}\./\./' | sort
grep -rn "HomeContent" src tests scripts
git diff --numstat -- docs
git diff -- src/components/home/AccountHomeContent.tsx
git diff --stat
node scripts/harness.mjs check
npx vite preview --port 4173
```

Porta do Pincel: **4173** (a 4175 é do Vigia). Medições e capturas só contra `localhost`. `tests/seo.dist.mjs` precisa do `dist/` recém-gerado (rode depois do `npm run build`).

## Formato do relato

Arquivo `docs/harness/relatos/interface-eixoc-c2-2026-11-17.md`, em português, com estas seções numeradas (siga a ordem de saída do `dead-code.md`, "Output when asked to remove dead code"):

1. Linha de base (antes de apagar): os 4 comandos e o resultado de cada um.
2. Prova por arquivo: uma tabela com os 22 arquivos, as 3 imagens e `RankingPreview.tsx`: arquivo | onde procurou | o que achou e descartou (com `arquivo:linha` das menções) | veredito. Inclua a calibração do detector.
3. O que foi apagado e editado, por grupo (1, 2, 3, 4), com os caminhos exatos para a Chave fazer os 4 commits de exclusão, o diff de `AccountHomeContent.tsx` e, como grupo 5, os 7 documentos com a linha acrescentada (`git diff --numstat`).
4. Verificação depois: comandos rodados e resultado (passou, falhou, não executado e por quê), `chunks` antes e depois, bytes antes e depois, e as capturas de `/app`.
5. Sinalizado, não apagado: CSS que pode ter sobrado, documentos achados que não estão nos 7, **recomendação** de simplificar `member`/`awaitingRegistration` em `AccountHomeContent.tsx` (fatia futura), `FavoritesProvider.tsx`/`favoritesContext.ts`, `public/ediv-logo*.png`, rotas e código antigo de cotações do servidor.
6. Limites e próximo passo (o que não foi verificado, e a próxima exclusão ou refatoração sugerida).

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log ou relato. Não abra `.env*`.
- Usuário simulado só fictício, só no script descartável (apague-o ao terminar). Não meça nem abra a produção.
- Não faça commit, push, deploy, stash nem reset. Não use `git checkout` nem `git clean` na árvore. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
