# Etapa 2C: skeletons contextuais (17/11/2026)

Autor: Pincel (interface). Brief `docs/harness/briefs/etapa2-2C-pincel.md`, com os ajustes do Orquestrador: item 2 (`PageLoading`) pulado, porque já foi feito na 2F; sem `PageContent.tsx` no claim; skeletons sem `min-h-screen`. Nota "Contexto Escola" lida (seções 3, 4 e 10). Nenhum texto legal, aviso, regra financeira, margem, cotação ou número exibido foi alterado. `src/App.tsx` não foi editado nesta etapa. Commit, push e deploy não foram feitos.

**Resultado em uma linha:** os skeletons de `ResearchSample` e `RankingHighlights` agora têm a mesma altura do conteúdo final. No primeiro, a diferença é de 12 px (um nome de cartão da fixture quebra em duas linhas). No segundo, é de 0 px no estado de cotação em carregamento.

## 1. Estrutura do conteúdo final (antes do desenho)

**`ResearchSample`** (`src/components/home/ResearchSample.tsx`, versão anterior, linhas 44-150). Usada em `PublicHome` (home visitante) e em `RankingAccessLanding` (com `lockedPreview`).
- Cabeçalho da publicação: `h3 "Ranking de Ações"` e um parágrafo de texto estático (`ph-ranking-publication`).
- `ol.ph-ranking-preview` com `publication.entries.slice(0, 3)`: 3 cartões fixos. Cada cartão tem nome (`strong`) e ticker, e um `dl` com as 3 métricas de `publicMetrics` (`src/lib/marketData.ts`). O cartão de margem tem um qualificador (`small.ph-ranking-qualifier`) de uma linha.
- Com `lockedPreview`: `LockedRows` (4 linhas de placeholder, sem dado).
- O bloco de desbloqueio vem depois (`ph-ranking-unlock`).
- Número de cartões fixo (3). Não se reaproveitou `PublicCompanySkeleton.tsx` (é de página inteira, com `min-h-screen`). Usou-se o padrão de skeleton com as mesmas classes do conteúdo final.

**`RankingHighlights`** (`src/components/RankingHighlights.tsx`, versão anterior, linhas 186-263). Usada só em `AccountHomeContent` (área logada).
- Cabeçalho (fica fora do ramo de carregamento; não mudou).
- `p.mt-5` "Ranking de Ações" e, depois, `div.mt-3` com `publication.entries.slice(0, 3)`: 3 linhas fixas (`Link` com `grid`, `py-4` / `lg:py-5`). Cada linha tem identidade (logo, ticker, nome, "Pesquisa de dividendos") e um `dl` com 3 indicadores ("Preço de mercado", "Preço teto", "Margem de segurança" na variante de dividendos), além de "Ler pesquisa".

## 2. Arquivos alterados

| Arquivo | Linhas (versão atual) | Mudança |
|---|---|---|
| `src/components/home/ResearchSample.tsx` | 1-6 (constante `publicationNote`), 44-99 (ramo de carregamento), 113-140 (nota usa a constante) | Carregamento vira skeleton com as mesmas classes do conteúdo. O texto "Carregando ranking publicado…" fica em `role="status"` `sr-only`. Cabeçalho e nota estáticos aparecem também no carregamento (não são dado). `LockedRows` continua quando `lockedPreview`. Erro, vazio e lista inalterados. |
| `src/components/RankingHighlights.tsx` | 144 (subtítulo: o ramo `!publication` usa o texto de dividendos), 186-240 (ramo de carregamento) | Carregamento vira skeleton de 3 linhas com as classes das linhas reais. Rótulos dos indicadores são texto estático; valores são barras. `role="status"` `sr-only` com "Carregando publicação…". |
| `src/components/home/public-sections.css` | 18-41 (removido) | Regras `.ph-ranking-loading*` (`min-height` fixos em rem, medidos no build) removidas: o skeleton tem a altura pelo próprio conteúdo. |

Não alterados: `src/App.tsx`, `src/components/PageContent.tsx` (item 2 pulado), `tests/`, `src/components/PublicCompanySkeleton.tsx`.

Padrões usados no skeleton: `aria-hidden="true"` e `aria-busy="true"` no wrapper animado; `motion-safe:animate-pulse`; barras com `h-[1lh]` (uma linha da própria fonte, então a altura segue a linha que o conteúdo final teria); cores só `bg-evo-border/…` e `text-transparent`.

## 3. Alturas e posições medidas

Script Playwright descartável em `scratchpad`, fora do repositório (já apagado), `dist/` novo, porta 4173, Chrome headless de desktop. Fixture: `.test-artifacts/perf-api/rankings-public.json` (empresas **fictícias** "Empresa fictícia A/B/C"). API atrasada em 600 ms, para o carregamento ter tempo de ser medido. "Próximo" = posição do elemento seguinte ao bloco, relativa ao topo do bloco.

**Home visitante, `ResearchSample` (`#caderno-de-exemplo`):**

| Largura | Antes: skeleton (bloco / próximo) | Antes: carregado | Depois: skeleton | Depois: carregado | Diferença depois |
|---|---|---|---|---|---|
| 390 px | 1440 / 1061 | 1484 / 1106 | 1472 / 1093 | 1484 / 1106 | 12 px (bloco) e 13 px (próximo) |
| 1280 px | 758 / 545 | 785 / 572 | 773 / 559 | 785 / 572 | 12 px e 13 px |

Causa da diferença de 12-13 px: o nome do cartão B da fixture ("Empresa fictícia B (ticker de teste)") quebra em duas linhas, e o skeleton reserva uma linha. Medido por cartão: o nome do cartão B tem 58 px (duas linhas) contra 29 px nos demais. A linha do cartão B fica 13 px mais alta, e a grade estica os três cartões para essa altura. O tamanho do nome varia com os dados; o skeleton usa uma linha (o caso comum). Nenhum `layout-shift` registrado nas medições.

**Área logada, `RankingHighlights`** (bloco = seção da pesquisa):

| Largura | Antes: skeleton | Antes: carregado | Depois: skeleton | Depois: carregado | Diferença depois |
|---|---|---|---|---|---|
| 390 px | 224 (só o cabeçalho) | 807 | 807 | 807 | 0 px |
| 1280 px | 191 (só o cabeçalho) | 561 | 561 | 561 | 0 px |

"Carregado, antes" = mesma marcação (só mudou o ramo de carregamento; o subtítulo do cabeçalho só muda quando não há publicação). Com a cotação em falha (a fixture com 401 no mercado mostra "cotação indisponível" e "da pesquisa" na margem de cada linha), o carregado dá 855 px em 390 px. Esse é o único caso em que o bloco cresce 48 px: 16 px por linha, a linha extra do qualificador da margem. O skeleton representa o estado de carregamento da cotação ("—", sem qualificador). Nenhum `layout-shift` registrado nas medições.

Posição dos elementos seguintes: as mesmas diferenças de altura do bloco, sem entradas de `layout-shift` (CLS 0) nas quatro medições.

## 4. `PageLoading` (item 2)

Feito na 2F (relato `docs/harness/relatos/interface-etapa2f-2026-11-16.md`, seção "Ajuste do PageLoading" e Rodada 2): `min-h-screen`, CLS 0 medido no comando oficial para `/ranking/acao/TIMS3` e `/glossario`. Não foi refeito nesta etapa.

## 5. Acessibilidade e movimento reduzido

- Os dois skeletons têm `role="status"` no texto `sr-only` ("Carregando ranking publicado…", "Carregando publicação…") e `aria-busy="true"` no wrapper. O wrapper é `aria-hidden`, então o leitor de tela só anuncia o texto de status.
- Animação: só `motion-safe:animate-pulse`, que usa `opacity`. Conferido no Chrome: `prefers-reduced-motion: no-preference` → `animationName = pulse`; `reduce` → `animationName = none`.
- Erro e dado ausente: iguais a antes. Nenhum zero no lugar de dado ausente; os ramos de erro e de publicação não foram tocados.

## 6. Não feito e pendências

Os outros "Carregando…" do relato 1A continuam como estavam (decisão do brief, fora do escopo): `src/components/HistoryCharts.tsx:48`, `src/components/ConversationInbox.tsx:129`, `src/components/ConversationPanel.tsx:89`, `src/components/NotificationsMenu.tsx:141`.

Pendências:
- Cartão de empresa com nome longo (duas linhas): a diferença de 12-13 px fica. Para zerar, seria preciso reservar duas linhas de nome, o que deixaria o caso comum com espaço sobrando. Decisão para o Orquestrador.
- Cotação em falha no `RankingHighlights`: +48 px no bloco em 390 px. Mesma decisão.
- Subtítulo do cabeçalho do `RankingHighlights` sem publicação usa o texto de dividendos (para não mudar de altura ao carregar). Se a publicação não tiver análise de dividendos, o texto muda depois do carregamento.

## 7. Comandos rodados e resultado

| Comando | Resultado |
|---|---|
| `node scripts/harness.mjs release interface` (antes do claim) | Passou (reserva residual da 2F liberada). |
| `node scripts/harness.mjs claim interface …` (sem `PageContent.tsx`) | Passou. |
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0), rodado três vezes; a última depois de todas as edições. |
| `npx vite preview --port 4173` | Serviu o `dist/` novo, usado nas medições. Parado ao final. |
| Medição de alturas (script descartável) | Passou; números na seção 3. |
| Teste de movimento reduzido (script descartável) | Passou (`pulse` → `none`). |
| `git diff -- src/App.tsx` | Não está vazio, mas a diferença é da 2A (já aprovada). Nesta etapa `src/App.tsx` não foi editado. |
| `node scripts/harness.mjs check` | Passou: quadro válido, 4 papéis e reservas sem conflito. |

## 8. Limites e próximo passo

- Medição em Chrome headless de desktop, com fixture fictícia. Celular real e cotação real (brapi) não foram medidos.
- Os números de "depois" dependem da fixture: o nome do cartão B quebra em duas linhas, o que dá a diferença de 12-13 px. Com outro conjunto de dados, a diferença muda.
- Próximo passo: revisão da Lupa de `ResearchSample.tsx`, `RankingHighlights.tsx`, `public-sections.css` e este relato. Decidir os dois pontos da seção 6 (nome longo e cotação em falha).

## Rodada 2 (revisão da Lupa)

Relato da Lupa: `docs/harness/relatos/revisao-etapa2c-2026-11-17.md`, achados 1 e 2 (o 3 ficou de fora). Os dois resíduos da seção 6 foram aceitos pelo Orquestrador e não mudaram.

**1. Subtítulo no erro (achado 1).** `src/components/RankingHighlights.tsx:144-145`: a condição do subtítulo passou a ser `(!publication && !error) || entries.some((entry) => entry.dividendAnalysis)`. No erro (`publication` nulo e `error` preenchido) volta a mostrar "Leia a tese e confira o prazo de cada cenário.", como em HEAD (`git show HEAD:evorix-finance/src/components/RankingHighlights.tsx`, linha 147). Carregando sem erro mantém o texto de dividendos; publicação com análise e sem análise continuam como antes. Conferido no navegador: membro com `/api/rankings` em 500, mensagem "A publicação não pôde ser carregada agora." visível, subtítulo = "Leia a tese e confira o prazo de cada cenário.".

**2. `aria-busy` (achado 2).** O `aria-busy="true"` saiu do elemento `aria-hidden` e foi para um contêiner `<div aria-busy="true">` (sem classe) que envolve o `p role="status" sr-only` e o bloco `aria-hidden`, nos dois skeletons:
- `src/components/RankingHighlights.tsx:186-188` e fechamento em `:247`.
- `src/components/home/ResearchSample.tsx:49-51` e fechamento em `:108`.

Nenhuma classe de layout mudou. O pai de `ResearchSample` é `.ph-container` (`src/components/home/public-home.css:11`: largura e margem, sem `flex` nem `grid`), então o contêiner não altera o layout.

**Medição de novo (fixture fictícia, API atrasada em 600 ms, `dist/` novo, porta 4173):**

| Largura | Skeleton (bloco / próximo) | Carregado (bloco / próximo) | Diferença |
|---|---|---|---|
| 390 px | 1472 / 1093 | 1484 / 1106 | 12 px |
| 1280 px | 773 / 559 | 785 / 572 | 12 px |

Igual à rodada 1 (1472/1484 e 773/785). A diferença de 12 px é a mesma do nome longo do cartão B, aceita pelo Orquestrador.

**Validação (rodada 2):**

| Comando | Resultado |
|---|---|
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0). |

Script de medição descartável apagado; preview na porta 4173 parado.
