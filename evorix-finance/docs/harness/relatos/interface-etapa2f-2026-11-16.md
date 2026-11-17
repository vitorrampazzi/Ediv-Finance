# Etapa 2F: CLS do glossário e da página pública da empresa (16/11/2026)

Autor: Pincel (interface). Brief `docs/harness/briefs/etapa2-2F-pincel.md`. Nota "Contexto Escola" lida (seções 3, 4 e 10). Nenhum texto legal, aviso, regra financeira, margem, cotação ou número exibido foi tocado. Nenhum import de `server/` foi adicionado a `src/`. Commit, push e deploy não foram feitos. A árvore está pronta para a revisão da Lupa.

**Resultado em uma linha:** o glossário ficou com CLS 0 nas duas larguras. Na página da empresa, o CLS caiu de 0,63 para 0,21 (390 px) e de 0,36 para 0,11 (1280 px), mas ainda fica acima de 0,1. O que sobra vem do fallback de rota (`PageLoading`), que está fora do escopo permitido à 2F; ver seções 6 e 8.

## 1. Causa (antes da correção)

**Glossário (confirmada).**
- `src/pages/Glossario.tsx` (versão anterior, linha 19): `initialTerms = []` como padrão. No cliente a lista começa vazia.
- `src/App.tsx:135`: a rota renderiza `<Glossario />` sem termos.
- `src/pages/Glossario.tsx` (versão anterior, linhas 49-53): sem termos, a página mostra "Carregando glossário…". Quando `/api/learning` responde, a lista aparece e a página muda de altura.
- `src/main.tsx:2,12`: `createRoot` (não hidrata). O HTML pré-renderizado é substituído pelo DOM do cliente, então qualquer diferença entre os dois aparece como salto.
- Medição: o rodapé vai de `0, 518 · 390×326` para fora do layout, e `a.action-secondary` de `20, 427` para fora, em 779 ms. O CLS é 0,4106 (390 px) e 0,4216 (1280 px), igual ao "antes" oficial.

**Página da empresa (confirmada, com uma causa a mais que a brief não listava).**
- `src/pages/PublicStock.tsx` (versão anterior, linhas 32-36): com a sessão carregando, a página mostra só "Verificando seu acesso à pesquisa…" em um `<p>`, sem altura. Sequência medida no "antes" (base): rodapé em 305 px (texto curto), depois 659 px (`min-h-[70vh]` da espera de dados), depois fora da tela. O salto de 0,14 do relato do Vigia é esse primeiro salto (medido em 431 ms).
- `src/pages/PublicStock.tsx` (versão anterior, linhas 159-164): `min-h-[70vh]` com "Carregando a pesquisa da empresa…" na espera dos dados.
- **Causa nova, fora do brief:** a rota `/ranking/acao/:ticker` carrega `PublicStock` por `lazy()` (`src/App.tsx:79-83`), e não por `lazyPage`. Logo, `preloadPage` não pré-carrega esse chunk. Enquanto ele baixa, o `Suspense` de `src/components/PageContent.tsx:77` mostra o fallback de rota `PageLoading` (`PageContent.tsx:6-29`), com o rodapé em ~490 px. Esse é o primeiro estado de todas as medições novas e a origem do salto que sobra (seção 6).

## 2. Arquivos alterados

| Arquivo | Linhas (versão atual) | Mudança |
|---|---|---|
| `src/pages/Glossario.tsx` | 20-50 (novas funções), 52-54 (estado inicial), 60-70 (busca com `sameTerms`) | Lê o JSON embutido quando `initialTerms` não é passado; valida `string[][]` de pares; cai para `[]` em qualquer erro. A resposta de `/api/learning` só troca a lista se o conteúdo mudou. |
| `scripts/prerender.mjs` | 113-116 | Só em `/glossario`: embute o JSON dos termos num `<script type="application/json" id="ediv-glossario">`, fora de `#root`, com `<` escapado como no JSON-LD. |
| `src/components/PublicCompanySkeleton.tsx` | novo, arquivo inteiro | Skeleton com a estrutura do conteúdo final (trilha, cabeçalho, indicadores, blocos de texto), só classes Tailwind, `motion-safe:animate-pulse`, `aria-busy`, `role="status"` com a frase em `sr-only`. |
| `src/pages/PublicStock.tsx` | 8 (import), 34 (sessão), 158 (dados) | Os dois estados de espera usam o mesmo `PublicCompanySkeleton`. Estados de erro e de dado ausente não mudaram. |

Não foram alterados: `src/App.tsx` (a permissão só valia para a linha de `/glossario`, e não foi necessária), `src/entry-server.tsx`, `src/main.tsx`, `package.json`, `server/`, `tests/`, `.test-artifacts/`.

## 3. Item 1: glossário

- **Como o JSON é embutido.** `scripts/prerender.mjs:115`: `JSON.stringify(glossary).replaceAll("<", "\\u003c")`, o mesmo padrão do JSON-LD. O elemento fica depois de `<div id="root">…</div>`, não dentro dele, porque `createRoot` limpa o conteúdo de `#root` ao iniciar. ID escolhido: `ediv-glossario`.
- **Como é lido.** `src/pages/Glossario.tsx:34-45`: `readEmbeddedTerms()` roda só no navegador (`typeof document`), faz `JSON.parse` dentro de `try/catch`, valida com `isTermList` (lista de pares de texto) e devolve `[]` em qualquer falha. O estado inicial é `initialTerms ?? readEmbeddedTerms()` (linha 52-54). No pré-render, `initialTerms` vem de `entry-server.tsx:21` como antes.
- **Chamada à API.** Continua (linhas 61-70). `sameTerms` compara o conteúdo: se a resposta for igual ao JSON embutido, a lista atual é mantida e nada pisca nem muda de ordem.
- **Prova do HTML.** `dist/glossario/index.html` tem o `<script type="application/json" id="ediv-glossario">` com 14 pares válidos, e "Preço-alvo" aparece 2 vezes (lista visível no HTML pré-renderizado e no JSON). Com JavaScript desligado, a lista continua visível.
- **Diff do HTML contra o dist de base** (`.test-artifacts/dist-base/glossario/index.html`, nomes de arquivos com hash ignorados): 6 linhas diferentes. Quatro são as duas tags `ediv-icon-clean-192.png` com `width="192" height="192"`, da 2A já aprovada. As outras duas são o `<script type="application/json">` novo. Nenhum texto legal, aviso ou número mudou.
- **Alternativa menor não implementada.** Não havia outra alternativa mais simples que não exigisse mudar `App.tsx` ou `main.tsx`. Nada a relatar nesse item.

## 4. Item 2: página da empresa

- **Skeleton.** `src/components/PublicCompanySkeleton.tsx`: `section` com `page` e `min-h-screen`. Blocos: trilha (`h-4`), cabeçalho (rótulo, título `h-9`, dois parágrafos), título de indicadores e três cartões `h-28` no grid de 3 colunas, duas linhas de nota, título e três linhas de texto do bloco "pesquisa completa". Tudo em `bg-evo-border/…` e `bg-evo-bgSec`, sem CSS novo.
- **Por que `min-h-screen`.** Sem essa altura, a espera em 1280 px deixava o rodapé em 708 px (dentro da dobra, de 800 px). Com `min-h-screen`, o rodapé fica em 880 px. Em 390 px o conteúdo do skeleton já passava da dobra (912 px, de 844 px).
- **Posição do rodapé nas esperas** (amostras a cada 100 ms, `footer.site-footer`, `innerHeight`):

| Viewport | Estado | Rodapé (`top`) | `innerHeight` | Abaixo da dobra? |
|---|---|---|---|---|
| 390×844 | skeleton (espera de sessão e de dados) | 912 px | 844 | sim |
| 1280×800 | skeleton (espera de sessão e de dados) | 880 px | 800 | sim |

  Observação: nas medições, as duas esperas aconteceram juntas (ambas com 600 ms de atraso simulado). Não separei as duas esperas em medições diferentes; as amostras mostram o rodapé abaixo da dobra durante o período inteiro do skeleton, de ~320 ms a ~960 ms.

- **Erro e dado ausente.** Nenhum estado de erro ou de dado ausente foi alterado (`PublicStock.tsx`, `PublicCompany`, `error` e `publication`). O conteúdo final de `PublicCompany` e `StockResearch` não mudou.

## 5. Medição: "antes" x "depois"

**Como medi.** Playwright (Chrome do sistema, `channel: chrome`), 3 cargas por página e viewport, atraso de 600 ms nas três respostas simuladas (`/api/learning`, `/api/auth/me`, `/api/rankings/public`) com os fixtures de `.test-artifacts/perf-api/` (ficcionais). Duas diferenças em relação ao comando do Vigia, que estão explicadas na seção 8:
- `/glossario` e `/ranking/acao/TIMS3` recebem o HTML próprio de cada rota, como a Vercel entrega pelo `vercel.json` (`/glossario` → `glossario/index.html`; `/ranking/acao/:ticker` → `acao.html`). O `vite preview` não aplica essas reescritas.
- Base (`.test-artifacts/dist-base`, porta 4174) e novo (`dist/`, porta 4173) com o mesmo método.

| Página | Viewport | CLS ANTES (base) | CLS DEPOIS (novo) | Meta (< 0,1) |
|---|---|---|---|---|
| `/glossario` | 390 px | 0,4106 | **0** | atingida |
| `/glossario` | 1280 px | 0,4216 | **0** | atingida |
| `/ranking/acao/TIMS3` | 390 px | 0,6284 | 0,2103 | não atingida |
| `/ranking/acao/TIMS3` | 1280 px | 0,3593 | 0,1137 | não atingida |

As cargas repetidas deram o mesmo valor nas três rodadas em todos os casos. O "antes" bate com o do Vigia (0,411 / 0,422 / 0,628 / 0,359), o que confirma o método.

**Atribuição do "depois" (novo):**
- `/glossario` (390 e 1280 px): nenhum salto registrado.
- `/ranking/acao/TIMS3` 390 px: um salto, 0,2103, em 462 ms, `footer.site-footer`, de 490 px para 912 px.
- `/ranking/acao/TIMS3` 1280 px: um salto, 0,1137, em 403 ms, `footer.site-footer`, de 497 px para 880 px.

Em nenhuma das medições o nó `a.action-secondary` ou outro elemento do conteúdo final aparece como fonte de salto. O salto final, de 912 para 2515 px (390 px) e de 880 para 1676 px (1280 px), acontece com o rodapé fora da tela e não conta.

## 6. Estado final da página da empresa e o que sobrou do salto

- **Estado final em todas as medições:** conteúdo, não erro. O `h1` é "Empresa fictícia B (ticker de teste) (TIMS3)" em todas as cargas do base e do novo. Não houve `role="alert"`.
- **Salto de 0,14 do "antes":** não aparece no novo. Ele era o primeiro salto do base, de "Verificando seu acesso…" (texto curto, rodapé em 305 px) para o `min-h-[70vh]` da espera de dados. Com o skeleton, esse salto não existe mais.
- **O que sobra (0,2103 em 390 px e 0,1137 em 1280 px):** a troca de `PageLoading` (rodapé em ~490 px) pelo skeleton (rodapé em 912 e 880 px). `PageLoading` aparece enquanto o chunk de `PublicStock` baixa, porque a rota usa `lazy()` sem pré-carga (seção 1). Como o rodapé sai de 490 px para dentro/abaixo da dobra, o salto fica perto de 0,2 em 390 px.
- **Por que não resolvi aqui:** eliminar esse salto exige uma das duas mudanças abaixo, e nenhuma está dentro das permissões da 2F:
  1. Pré-carregar `PublicStock` na rota `/ranking/acao/:ticker` (mudança em `src/App.tsx:79-83` e em `src/lib/lazyPage.ts`, que hoje só casa caminhos exatos). Assim o primeiro render já é o skeleton, sem o `PageLoading`.
  2. Trocar o fallback de `PageLoading` por um placeholder com a altura do rodapé de cada rota (mudança em `src/components/PageContent.tsx`). Afeta todas as rotas, e por isso é decisão de coordenação, não da 2F.

## 7. Comandos rodados e resultado

| Comando | Resultado |
|---|---|
| `maestri note read "Contexto Escola"` | Passou (seções 3, 4 e 10 lidas). |
| `node scripts/harness.mjs status` | Passou. Sem reserva conflitante nos caminhos da 2F. |
| `node scripts/harness.mjs claim interface …` e `update` | Passou. |
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0), rodado duas vezes (a segunda com o skeleton de altura de viewport). |
| `node --test tests/seo.dist.mjs` | Passou: 8 de 8. |
| `grep -rn "server/" src` | Vazio. Nenhum import de `server/` em `src/`. |
| `grep -c 'application/json' dist/glossario/index.html` | 1. |
| Comando "depois" do relato qa-cls (`tests/perf-baseline.mjs`, `DIST_DIR=dist`, porta 4173, `MOCK_API=1`) | Executado uma vez, mas **inválido para `/glossario`** (ver seção 8). Para `/ranking/acao/TIMS3` o resultado é coerente com a medição acima. |
| Medição de CLS com rotas da Vercel (seção 5) | Passou. Script descartável em `scratchpad`, fora do repositório. |
| `git diff --stat -- tests` | 1 arquivo, `tests/seo.dist.mjs` (15 linhas). É o teste da 2A (ajustes da revisão, já aprovados), não da 2F. Nenhum arquivo de `tests/` foi alterado pela 2F. `tests/perf-baseline.mjs` não foi tocado. |
| `node scripts/harness.mjs check` | Passou: quadro válido, 4 papéis e reservas sem conflito, saída 0 (antes e depois do release). |

## 8. Limites e próximo passo

**Limites.**
- **Falha no comando de repetição do relato qa-cls (para o Orquestrador e o Vigia).** `tests/perf-baseline.mjs` com `MOCK_API=1` só troca `/ranking/acao/<ticker>` pelo `acao.html`. Para `/glossario` ele usa o shell da raiz (`dist/index.html`), que não tem o HTML pré-renderizado. Por isso o comando "depois" mostra 0,4106 no glossário mesmo com a correção (verifiquei: a medição com o HTML de `/glossario` dá 0). O "antes" do Vigia não muda, porque ele também bate com essa medição, mas o "depois" do glossário pelo comando atual não é válido. Sugiro que o Vigia mapeie `/glossario` para `glossario/index.html` (como faz com `acao.html`). Não editei `tests/`, por restrição do brief.
- **Vite preview não aplica `vercel.json`.** Em qualquer medição local, `/glossario` e `/ranking/acao/:ticker` precisam de reescrita manual para o HTML da rota.
- **Fallback de rota (`PageLoading`).** Causa do salto que sobra (seção 6). Precisa de decisão de coordenação (seção 6, opções 1 e 2).
- **Diferença de hash do CSS principal.** Não mudou nesta rodada, além da 2A.
- **Bytes do JS, LCP e CLS de produção.** Não medidos nesta etapa, e não houve carga de produção.

**Próximo passo.**
- Revisão da Lupa desta árvore: `scripts/prerender.mjs` (linha 113-116), `src/pages/Glossario.tsx`, `src/pages/PublicStock.tsx`, `src/components/PublicCompanySkeleton.tsx`.
- Decisão da coordenação sobre o fallback de rota (seção 6): opção 1 (pré-carregar `PublicStock` na rota) ou opção 2 (placeholder com altura do rodapé em `PageContent.tsx`). Sem ela, `/ranking/acao/TIMS3` fica acima de 0,1 nas duas larguras.
- Ajuste no comando de repetição do Vigia (seção 8, primeiro item).

## 9. Validação do quadro

Ao final: `node scripts/harness.mjs update interface revisao` e `release interface`, depois `check`. Resultado no fim da rodada.

## Ajuste do PageLoading (decisão do Orquestrador, 17/11/2026)

**Escopo.** Único ajuste: `src/components/PageContent.tsx`, classe da `section` do `PageLoading` (fallback de rota). `role="status"`, texto "Abrindo página…", `motion-safe:animate-pulse` e `aria-busy` continuam iguais. Não houve pré-carga de `PublicStock` nem mudança em `App.tsx`. Nenhum arquivo de `tests/` foi tocado.

**Diff.**
```
- className="mx-auto min-h-[50vh] w-full max-w-7xl px-4 py-8 sm:px-6"
+ className="mx-auto min-h-svh w-full max-w-7xl px-4 py-8 sm:px-6"
```

**Escolha e justificativa.** `min-h-[50vh]` deixava o rodapé dentro da dobra (~490 px). `min-h-svh` faz a seção ocupar a altura pequena do viewport (100svh). Como o rodapé vem depois da seção, sua posição passa a ser `altura do cabeçalho + 100svh`. Medido no fallback: 912 px em 390×844 (cabeçalho de ~68 px) e 880 px em 1280×800 (cabeçalho de ~80 px). Os dois ficam acima de `innerHeight`. `svh` foi preferido a `dvh` porque não muda de tamanho quando a barra do navegador aparece ou some, então o esqueleto não oscila. Limite: a garantia vale com a barra do navegador visível (`innerHeight` = `svh`). Com a barra escondida, `innerHeight` cresce e a folga é só o cabeçalho (~68 px). Não medi em celular real.

**Medição oficial, antes e depois** (`tests/perf-baseline.mjs`, `MOCK_API=1`, `RUNS=3`, `DIST_DIR=dist`, porta 4173, comando do Orquestrador):

| Página | 390 px antes | 390 px depois | 1280 px antes | 1280 px depois | Meta |
|---|---|---|---|---|---|
| `/ranking/acao/TIMS3` | 0,628 | **0,000** | 0,359 | **0,000** | < 0,1 atingida |
| `/glossario` | 0,411 | **0,000** | 0,422 | **0,000** | 0 mantido |

O "antes" é o número oficial do Orquestrador, medido antes desta rodada. O "depois" saiu do comando oficial, sem nenhum layout-shift registrado nas quatro medições. Estado final de `/ranking/acao/TIMS3` em todas as cargas: conteúdo, sem erro. O 401 de `/api/auth/me` é o visitante anônimo esperado.

**Navegação no cliente (`/` → `/aprender`).** Verificação extra, com script descartável em `scratchpad`, fora do repositório. API com atraso de 1500 ms, rodapé amostrado a cada frame:
- 390×844: no fallback, rodapé em 912 px (abaixo da dobra de 844). Não subiu em nenhuma amostra.
- 1280×800: no fallback, rodapé em 880 px (abaixo da dobra de 800). Não subiu.
Depois do carregamento, o rodapé desce para a posição do conteúdo de `/aprender`. Isso é descida abaixo da dobra, não subida.

**Validação (rodada após o ajuste).**
| Comando | Resultado |
|---|---|
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0). |
| `node --test tests/seo.dist.mjs` | Passou (exit 0). |

**Limites.** Medição em Chrome headless de desktop. Sem celular real, sem barra do navegador escondida. Produção não foi medida.

**Próximo passo.** Revisão da Lupa de `src/components/PageContent.tsx` (uma linha) junto com o restante da 2F.

## Rodada 2 (revisão da Lupa)

Relato da Lupa: `docs/harness/relatos/revisao-etapa2f-2026-11-17.md` (achados 1, 3 e 4). Três ajustes pequenos, sem mudar o restante da 2F.

**1. Glossário por navegação no cliente (achado 1).** `src/pages/Glossario.tsx`, classe da `section`: enquanto a lista não chegou e não há erro, o contêiner recebe `min-h-screen`. Assim o rodapé não sobe para dentro da tela e depois desce. `role="status"` e o texto "Carregando glossário…" continuam iguais. Erro e lista carregada não mudam.

**2. Fallback de rota (achado 3).** `src/components/PageContent.tsx`, `PageLoading`: `min-h-svh` virou `min-h-screen`, igual a `PublicCompanySkeleton`, `PublicLayout` e `AuthShell`. `role`, texto e `motion-safe` iguais.

**3. Teste do JSON embutido (achado 4).** `tests/seo.dist.mjs`, teste novo "glossário pré-renderizado embute a lista fora do #root, com o mesmo número de termos". Confere: existe um `script#ediv-glossario` (type `application/json`); o `#root` está fechado antes dele (balanço de `<div>`); o JSON é válido; é lista não vazia de pares de texto não vazios; e o número de termos é igual ao número de `<dt>` do HTML pré-renderizado.
- Falha de propósito: troquei o id no `dist/glossario/index.html` para `ediv-glossario-x`. O teste falhou com `script#ediv-glossario ausente` (`ℹ fail 1`). Restaurei o arquivo e o teste voltou a passar (`ℹ pass 9`). O código-fonte não foi alterado para esse teste.

**Medição (a): comando oficial**, porta 4173, `DIST_DIR=dist`, `MOCK_API=1`, `ATTRIBUTION=1`, `RUNS=3`, `ONLY=/ranking/acao/TIMS3,/glossario`:

| Página | 390 px | 1280 px |
|---|---|---|
| `/ranking/acao/TIMS3` | 0,000 | 0,000 |
| `/glossario` | 0,000 | 0,000 |

Nenhum layout-shift registrado.

**Medição (b): navegação no cliente `/` → `/glossario` por clique** (link visível da home). Script descartável em `scratchpad`, fora do repositório. `MOCK_API` com fixtures de `.test-artifacts/perf-api/` (`/api/learning` e `/api/rankings/public` com 200, `/api/auth/me` com 401), atraso de 600 ms, 3 cargas por largura. CLS medido só depois do clique (`layout-shift` sem `hadRecentInput`).

| Largura | CLS antes (Lupa) | CLS depois (3 cargas) | Média | Salto restante |
|---|---|---|---|---|
| 390 px | 0,592 | 0,0243 / 0,0243 / 0,0243 | 0,0243 | 1 salto, em ~2,0 s, `a.action-secondary` ("Continuar aprendendo") |
| 1280 px | 0,556 | 0,0078 / 0,0078 / 0,0078 | 0,0078 | 1 salto, em ~2,0 s, `a.action-secondary` |

O "antes" é o número da Lupa, medido antes desta rodada com o mesmo tipo de navegação. O rodapé não aparece como fonte de salto nas seis cargas. O salto que sobrou é o link "Continuar aprendendo", empurrado para baixo quando a lista de 14 termos chega. Ele está dentro da tela, por isso conta. Fica abaixo de 0,1, mas não é zero. Para zerar, seria preciso reservar a altura da lista, o que fica como decisão para o Orquestrador.

**Validação (rodada 2):**
| Comando | Resultado |
|---|---|
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0). |
| `node --test tests/seo.dist.mjs` | Passou: 9 pass, 0 fail (eram 8; o teste novo é o nono). |

**Limites.** Chrome headless de desktop, sem celular real. Medição de navegação com API simulada (fixtures). Produção não medida.
