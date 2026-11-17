# Revisão da C2 (Pincel): exclusão dos 26 arquivos órfãos

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality` e `dead-code.md` (provar a morte antes de apagar). Especificação: `docs/harness/briefs/eixoC-C2-pincel.md`. Relato do executor: `docs/harness/relatos/interface-eixoc-c2-2026-11-17.md`. Diagnóstico de origem: `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md` (C1).

## Veredito: aprovado

Não achei nenhum arquivo apagado que ainda seja alcançável. O chunk grande do framer-motion não é baixado por visitante. Os dois pontos que o brief destacou (`AccountHomeContent.tsx` e os 7 documentos) estão exatamente como pedido. Não há achado Crítico nem Obrigatório. Há três itens Opcionais/FYI, todos já previstos como "fora desta entrega".

Eu refiz as provas por conta própria. Não me apoiei nas tabelas do relato.

## 1. Os 26 arquivos estão mortos

### 1.1 Conferência da lista

- `git status --short` mostra **26 linhas ` D`** e nenhuma outra exclusão nem renomeação. A lista é a do brief: grupo 1 (10), grupo 2 (3), grupo 3 (9 + 3 imagens), grupo 4 (`RankingPreview.tsx`) = 26.
- Os 26 nomes aparecem no relato C1 (`revisao-eixo-c-diagnostico-2026-11-16.md`): 0 ausentes. A decisão do dono sobre os clusters A e B consta no brief (linha 29). Cluster C, as 3 imagens e `RankingPreview` vêm do diagnóstico do C1.
- Nada fora da lista foi apagado: o grupo ` D` tem 26 linhas e o resto do `git status` é só ` M`/`??` de outros papéis (2A a 2F, Pincel em andamento).

### 1.2 Detector e calibração

Usei `git grep -n -I -w -F --untracked` na raiz do repositório inteiro. Isso cobre `src`, `server`, `tests`, `scripts`, `public`, `index.html`, `vercel.json`, `site-pages.mjs`, `vite.config.ts`, `package.json` e `.github`. Excluí só `docs`, `dist`, `.test-artifacts`, `.maestri` e `.claude`.

- **Calibração:** o mesmo detector, perguntando por `SegmentedControl` (símbolo vivo), devolve 3 acertos reais (`SegmentedControl.tsx:6`, `Configuracoes.tsx:12` e o uso). Ele enxerga símbolos em uso.
- **Falhas do detector:** 0 (a primeira versão do meu script falhava por sintaxe de pathspec e imprimia 0 acertos para tudo; vi o erro, reescrevi com `execFileSync` e conferi que nenhuma chamada devolve erro).
- Para cada arquivo, procurei o nome-base **e cada símbolo exportado** do arquivo, lido do `HEAD`. Depois procurei também por **caminho** (`/Nome'`, `"Nome"`, `./Nome`, `url(`).

### 1.3 Resultado por arquivo

| Grupo | Resultado da busca por nome e símbolos exportados, fora de `docs` |
|---|---|
| G1 (10 arquivos) | **0 acertos reais** em `Carteira`, `Dashboard`, `Favoritos`, `PortfolioExtras`, `PortfolioPulse`, `usePortfolio`, `useFavoritos`, `useMarketQuotes`. Para `lib/portfolio.ts` e `lib/portfolioInsights.ts` ver 1.4. |
| G2 (3 arquivos) | **0 acertos** em `DividendDashboard`, `ComparativeDividendChart` e `fundamental-center` (nem classe CSS, nem import de `.css`). |
| G3 (9 + 3 imagens) | **0 acertos** em `ScoreIndicator`, `AlgoInsight`, `mockData`/`mockPortfolio`/`mockAssets`/`mockRecomendados`, `ResearchAvailability`, `useResearchStatus`, `LearningTerms`, `publicHomeTerms`, `ReadingChecklist`, `hero.png`, `vite.svg`, `react.svg`. |
| G4 | **0 acertos** em `RankingPreview` (a edição em `AccountHomeContent.tsx` tirou os dois últimos). |

Os acertos que sobraram são ruído que li e descartei:

- `Carteira`: só `server/assistant.js:37`, texto de prompt do assistente.
- `Dashboard`: só `tests/dividend.browser.mjs:723`, nome de teste ("Dashboard: tooltips exatos…"). O teste não importa o componente.
- `Autenticacao.tsx`: os símbolos que o arquivo reexportava (`LoginPage`, `RegisterPage` etc.) continuam vivos, mas vêm de `src/pages/auth/*` via `pageImports.ts:22..24` e `App.tsx:45..54`. O arquivo apagado só os reexportava, então nenhum import o usava.
- Por caminho, `hero`, `react.svg` e `vite.svg` acertam em `OrbitCoins.tsx` (`size="hero"`), `analytics-policy.mjs`, `tests/analytics.test.mjs`, `package.json`/`package-lock.json` (pacote `react`, `vite`). Nenhum é caminho de imagem. A busca estrita pelo nome completo `hero.png`, `react.svg` e `vite.svg` dá 0 (inclui `index.html`, `public/`, CSS e `scripts/prerender.mjs`).

### 1.4 Amostra reprovada duas vezes (≥3 por grupo, com leitura)

- **G1:** `src/lib/portfolio.ts` e `src/lib/portfolioInsights.ts`. O nome é comum e o acerto parece real, então fui ao detalhe. De 11 símbolos exportados por `portfolio.ts`, só `Quote` (4), `Position` (1) e `typeLabels` (2) têm ocorrência em `src/tests/scripts`; li as três: são **outro `const typeLabels`** em `NotificationsMenu.tsx:9` e a palavra "Quote" em comentários de `marketData.ts:144` e `PublicStock.tsx:60`. Os outros 8 dão 0. O caminho `lib/portfolio` não é importado por nenhum arquivo de `src`. Para `portfolioInsights`, os 6 acertos são `server/portfolio-insights.js`, `server/portfolio.js` e `tests/portfolio-insights.test.mjs`, que são a **versão do servidor** (mantida, como o brief manda). Também confirmei que `server/` não importa nada de `src/`.
- **G2:** `ComparativeDividendChart.tsx` (único importador era `DividendDashboard.tsx`, também apagado), `fundamental-center.css` (sem `import` e sem classe `fundamental-center` em nenhum TSX restante) e `DividendDashboard.tsx` (0 fora de `docs`).
- **G3:** `useResearchStatus.ts` + `ResearchAvailability.tsx` (par que só se importava), `LearningTerms.tsx` + `publicHomeTerms.ts` (idem) e `mockData.ts`. Todos com 0.
- **G4:** `RankingPreview.tsx`. `git grep` de `HomeContent`/`AccountHomeContent` acha só `AccountHomeContent.tsx:21` (a definição) e `src/pages/MemberHome.tsx:1,6`, que chama `<HomeContent member />`. Nenhum outro chamador, nem em `entry-server.tsx`, `PublicHome` ou testes.

### 1.5 Formas indiretas descartadas

- **Import dinâmico e tabela de rotas:** `src/lib/pageImports.ts` e `src/App.tsx` não referenciam nenhum dos 26 (0 acertos por caminho). `src/App.tsx:190..196` e `NavigationIntent.tsx:31..32` mantêm só `<Navigate>`/mapeamento de string para `/app/carteira` e `/app/favoritos`, que apontam para o ranking e **não importam** os componentes apagados. `tests/site.test.mjs:91` ainda testa `/app/carteira` e continua válido (a rota existe).
- **Strings, HTML, prerender, `vercel.json`, `site-pages.mjs`:** sem acerto.
- **Tipos:** `npx tsc -p tsconfig.app.json --noEmit` rodou agora, no estado da árvore, e passou ("No errors found", exit 0). Isso prova que nenhum import estático aponta para arquivo apagado. Não rodei `lint` nem `npm test` nem `build`: o Pincel está editando e construindo. Os resultados do executor (lint, 298/298 testes, build, `seo.dist` 9/9) são dele; eu não os repeti.
- **Reflexão, `eval`, config pattern-based:** não há registro por convenção de arquivo neste projeto (rotas são explícitas em `App.tsx`; não há auto-import de componentes).

**Conclusão do ponto 1:** os 26 são "morto com prova". Não há arquivo da lista que eu tenha reprovado.

## 2. Chunk do framer-motion (`onboarding-*.js`, ~124 KB)

Medido sobre a **cópia que fiz de `dist/`** fora do repositório (78 arquivos em `assets`, igual ao "depois" do relato; `index.html` de 07:01:53). Servidor estático local, Chrome headless, `/api/**` respondendo `{}` e `/api/auth/me` com 401 (visitante). Script descartável, fora do repo.

Os dois chunks "onboarding" são diferentes: `onboarding-BjrhvWHz.js` (124.025 bytes; contém `MotionConfig` e `LayoutGroup`, o framer-motion) e `onboarding-Cy_7lbg9.js` (2.220 bytes; lógica de destino pós-login, sem framer).

| Cenário (visitante) | arquivos de `/assets` pedidos | chunk de 124 KB | chunk de 2 KB |
|---|---|---|---|
| carga direta `/` | 18 | **0** | 0 |
| carga direta `/entrar` | 11 | **0** | 0 |
| carga direta `/cadastro` | 13 | **0** | 1 |
| `/` e passar o mouse em **todos os 13 links internos** da home | 56 | **0** | 1 |
| `/` e clicar em Entrar (navegação no cliente) | 23 | **0** | 0 |
| `/` e clicar em Criar conta (cliente) | 25 | **0** | 1 |
| **Controle:** `import()` manual do chunk grande | 20 | **1** | 1 |

- O controle prova que o detector enxerga o chunk quando ele é pedido; os zeros não são um filtro quebrado.
- Leitura do código do build, para fechar o porquê: o `index.html` só tem `modulepreload` de `jsx-runtime`. Quem importa o chunk grande de forma estática: `Configuracoes-*.js`, `DashboardLayout-*.js` e a lista de dependências de import dinâmico do `index-*.js` (carregada só quando aquela rota é aberta). `LoginPage-*.js` não o importa. `RegisterPage-*.js` importa só o de 2 KB.
- **O chunk de 2 KB em `/cadastro` é esperado** e não é o framer-motion.
- Limite desta prova: medi `/`, `/entrar`, `/cadastro` como visitante e passei o mouse nos links públicos. Não medi `/aprender`, `/glossario` etc.; o brief só pedia os três.

**Conclusão do ponto 2:** o chunk grande não é baixado por visitante. Não bloqueia.

Sobre a mudança de agrupamento que o relato descreve (`SegmentedControl.*`, `use-reduced-motion.js` e `scan-search.js` sumiram; `Configuracoes.css` apareceu): bate com o que vi. `SegmentedControl` agora só tem um consumidor (`Configuracoes.tsx:12`), então o Rollup juntou o módulo ao chunk dessa página; é página de conta, não afeta visitante. O relato admite não ter verificado o grafo do Rollup e não ter separado a parcela dos −10.081 bytes; é honesto e não precisa de mais.

## 3. `AccountHomeContent.tsx`

`git diff -U0`:

```
-import { RankingPreview } from "../RankingPreview";
-        {member ? <MemberHomeBrand /> : <RankingPreview />}
+        <MemberHomeBrand />
```

`git diff --numstat`: `1 2`. Só as duas linhas do brief; mais nada no arquivo.

- A prop `member`, `awaitingRegistration` e os outros ramos `member ? … : …` ficaram como estavam (o brief proibia simplificar).
- Equivalência: `member` só chega pelo chamador `MemberHome.tsx:6` (`<HomeContent member />`), então é sempre `true`; a expressão antiga sempre resultava em `<MemberHomeBrand />`. O usuário **vê a mesma home**. Li o código e fiz a busca de chamadores. Não refiz as capturas de tela: o relato diz que os quatro hashes SHA-256 (390 e 1280, claro e escuro) são idênticos antes e depois, e eu não repeti isso.

## 4. Os 7 documentos

| Documento | `numstat` normal | `numstat --ignore-cr-at-eol` | Linhas 2–4 |
|---|---|---|---|
| `CARTEIRA-E-INSIGHTS.md` | 3/0 | 3/0 | em branco, status idêntico ao brief, em branco |
| `DASHBOARD-DIVIDENDOS.md` | 3/0 | 3/0 | idem |
| `HOME-PUBLICA.md` | 3/0 | 3/0 | idem |
| `IDENTIDADE-EDITORIAL.md` | 3/0 | 3/0 | idem |
| `REVISAO-VISUAL-ACOES.md` | 3/0 | 3/0 | idem |
| `EVOLUCAO-2026-11-13.md` | 3/0 | 3/0 | idem |
| `CENTRAL-FUNDAMENTALISTA.md` | **124/121** | **3/0** | idem |

- Comparei por script a linha de status de cada arquivo com o texto do brief: **idêntica** nos 7 (com as crases e a data 17/11/2026). Todas começam com "Retirado:", dizem o que foi removido e mandam ver o histórico do git. São factuais: citam só os arquivos que de fato foram apagados.
- `CENTRAL-FUNDAMENTALISTA.md` está commitado em CRLF (`git ls-files --eol`: `i/crlf w/crlf attr/text eol=lf`). `.gitattributes` manda `text eol=lf`. Ignorando o fim de linha, mudam **só as 3 linhas**, nenhuma removida. O 124/121 vem 100% da normalização de EOL, não de conteúdo. Os outros seis estão em LF (`i/lf w/lf`).
- Confere com o `grep` do brief: fora de `docs/harness/`, ele lista os 7 + `UX-PERFORMANCE-2026-11-16.md` (que o brief manda não editar, e não foi editado: não aparece como modificado nos 7 acima nem no `git status` dos docs de topo da C2). Nenhum outro documento de topo.
- Sobre a normalização para LF em commit próprio (decisão do Orquestrador): concordo. Recomendo só a ordem: normalizar `CENTRAL-FUNDAMENTALISTA.md` **antes** do commit com a linha de status, senão o commit de status mostra o arquivo inteiro reescrito e a linha some no meio. Depois da normalização, confira de novo que `git diff --numstat` desse arquivo mostra `3 0`.

## 5. Itens sinalizados e não apagados: ficam de fora desta entrega

Concordo com os três; o motivo é o mesmo nos dois primeiros: tocar neles muda arquivos que outros papéis estão editando, e a regra da skill é "na dúvida, não apague" quando a prova depende de uma mudança fora do escopo.

1. **`FavoritesProvider` sem consumidor** (`entry-server.tsx:4,36`). Confirmei: `FavoritesProvider.tsx` e `favoritesContext.ts` só são importados por `entry-server.tsx` e entre si; `useFavorites`/o contexto não têm outro consumidor em `src` ou `tests`. Tirar isso exige editar `entry-server.tsx` (rota pública: o brief da casa pede conferir `App`, `entry-server`, `site-pages.mjs` e `vercel.json` juntos) e re-checar o prerender. É uma fatia própria, depois do 2F. Não é um órfão do mesmo tipo: hoje o provedor é montado na renderização do servidor e `tests/seo.dist.mjs` depende do HTML gerado.
2. **19 classes CSS** (7 em `src/index.css`, 12 em `src/components/home/public-sections.css`). Amostrei 6 (`ph-term`, `ph-checklist-layout`, `portfolio-value`, `favorite-card-enter`, `journey-scene`, `ediv-research-start`): nenhuma é usada em TSX; todas ainda têm regra em CSS (`ph-term` tem 24 regras). A heurística do relato é plausível. **Mantenha fora**: `src/index.css` está sendo editado pelo Pincel agora, e uma limpeza de CSS pede prova própria (classes montadas dinamicamente, `@source`) e comparação do CSS gerado.
3. **Logos `public/ediv-logo.png` e `ediv-logo-transparent.png`.** `git grep` não acha referência no repositório fora de `docs`, mas arquivo de `public/` é servido por URL e pode estar em e-mail, redes sociais, `og:image` de página já indexada ou link externo. Isso eu não consigo provar de dentro do repositório. Mantenha.

## Achados

### Eixo padrões (code-quality)
- Nenhum Crítico nem Obrigatório.
- **Opcional (FYI):** a regra "a exclusão leva a prosa junto" ficou cumprida só em parte e de forma deliberada: os 7 documentos ganharam a linha de status, mas o corpo deles ainda descreve a interface retirada (por exemplo `DASHBOARD-DIVIDENDOS.md:81`, `CENTRAL-FUNDAMENTALISTA.md:42`). O brief pediu exatamente isso (uma linha, nenhuma outra mudança) e a linha deixa claro ao leitor. Só registro que o texto antigo continua lá.
- **Opcional:** `src/data/` fica como pasta vazia no disco (git não rastreia). Não afeta o repositório. Se alguém a recriar, vira lixo; pode remover a pasta.

### Eixo especificação (brief)
- Nenhum desvio. Os 26 arquivos, a edição de 2 linhas, as 7 linhas de status e a decisão de não apagar `FavoritesProvider`, `SegmentedControl`, `DashboardLayout`, `server/*` e as logos seguem o brief.
- O desvio que o relato declara (EOL de `CENTRAL-FUNDAMENTALISTA.md`) está correto, não é culpa do executor e já tem decisão do Orquestrador.
- O relato diz "4.447 linhas removidas" contra as 4.314 estimadas no C1; a diferença é contagem diferente (o C1 não somou `RankingPreview` com os 151 linhas e as imagens). Não muda nada.

## Por prioridade do papel

1. **Honestidade financeira:** sem achado. A mudança só remove código sem uso; nenhum cálculo, número ou texto financeiro foi tocado. `server/portfolio*.js` e as rotas `/api/portfolio*` continuam.
2. **Segurança:** sem achado. Nenhum segredo, rota ou resposta mudou. Nenhuma rota de API foi removida; `server/` e `tests/` não foram modificados pela C2.
3. **Regressão:** sem achado. As rotas `/app/carteira` e `/app/favoritos` continuam redirecionando (`App.tsx:190..196`); `site-pages.mjs`, `vercel.json` e `entry-server.tsx` não mudaram nem precisavam mudar. `tsc` passa.
4. **Textos proibidos:** sem achado. Não há texto de interface novo; as 7 linhas de status são em documentos internos e não citam "tempo real", "com atraso" nem hora de cotação. Sem menção a IA nem `Co-Authored-By`.
5. **Qualidade:** ver Opcionais acima.
6. **Estilo:** sem achado.

## O que eu não vi

- Não rodei `lint`, `npm test`, `build` nem testes de navegador (o Pincel está construindo). Só rodei `tsc --noEmit` e as buscas/medições descritas.
- Não repeti as capturas de `/app` do executor.
- Não medi o carregamento de rotas públicas além de `/`, `/entrar` e `/cadastro`.
- As edições em andamento do Pincel em `SiteChrome.tsx`, `src/index.css` e a página de `/aprender` não fazem parte desta revisão.

## Como reproduzir o que provei

- Lista dos apagados: `git status --short | grep "^ D"` (26 linhas).
- Busca: `git grep -n -I -w -F --untracked -e "<símbolo>" -- . ':!docs' ':!.maestri' ':!.claude' ':!evorix-finance/dist'`.
- Chunk: servir a cópia do `dist/` (ou o `dist/` atual do Pincel) com um servidor estático e abrir `/`, `/entrar`, `/cadastro` registrando os pedidos para `/assets/`; o arquivo a procurar é `onboarding-BjrhvWHz.js` (o hash muda a cada build).
- Docs: `git diff --numstat --ignore-cr-at-eol -- docs/<arquivo>.md` (esperado `3 0`) e `git ls-files --eol docs/CENTRAL-FUNDAMENTALISTA.md`.

Único arquivo que escrevi: este relato. Cópias e scripts temporários ficaram no scratchpad da sessão, fora do repositório.
