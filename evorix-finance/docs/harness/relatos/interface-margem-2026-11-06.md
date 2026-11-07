# Interface: margem de segurança dinâmica e histórico de preços (06/11/2026)

## Objetivo
Aplicar na interface o contrato de `docs/MARGEM-E-HISTORICO.md` (com
`docs/COTACOES.md`):

- o "Preço de mercado" é a cotação canônica da brapi.dev;
- a margem é a do servidor, `(teto − cotação) ÷ teto`, com duas casas, e pode
  ser negativa;
- o teto só muda com uma nova análise;
- uma loja única de mercado serve o ranking, a página logada e os destaques
  de `/app`;
- as páginas públicas usam o mesmo padrão com `/api/rankings/public`;
- o gráfico de preços vem de `/api/rankings/price-series`, e o caminho antigo
  de junção com a AGF saiu.

Nenhum componente faz a conta da margem. A interface mostra o
`safetyMargin.percent` do servidor e formata com `formatSafetyMarginPercent`.
A conta com `safetyMarginPercent` aparece só nos testes, como conferência.

## Arquivos
Novos:
- `src/lib/polledStore.ts`: loja de consulta periódica compartilhada.
  - Um pedido por ciclo para todas as telas, no intervalo da última resposta
    (60 s a 1 h).
  - Pausa com a aba oculta e consulta ao voltar, se o prazo venceu.
  - Depois de uma falha, mantém os dados marcados como `failed` e tenta de novo
    em até 2 min ou no `Retry-After`.
  - `loading` só existe antes da primeira resposta.
  - O relógio, os temporizadores e a visibilidade são injetáveis, para o teste
    em Node.
- `src/hooks/usePolledStore.ts` (`useSyncExternalStore`, SSR em "carregando").
- `src/hooks/useRankingMarket.ts`: `/api/rankings/market`, com uma loja por
  conta.
- `src/hooks/usePriceSeries.ts`: uma loja por ticker, base e intervalo, com
  pedido de hora em hora.
  - "auto" pede a base ajustada e, se ela não existir, segue o `defaultBasis`.
  - 404 vira o estado "não coberto".
- `src/lib/marketData.ts`: funções puras.
  - Leitura de `/api/rankings/market`, dos blocos `market` públicos e de
    `safetyMargin`.
  - `marketView`, que escolhe preço e margem por base (mercado, defasada,
    pesquisa, indisponível, carregando).
  - Textos de `title`, nota da tabela, legendas, referência "Na publicação de
    DD/MM", datas e valor de ordenação.
- `src/lib/priceSeries.ts`: funções puras.
  - Leitura da série, com ordem, repetidos e pontos inválidos descartados, e
    notas em texto ou `{ code, text }`.
  - Períodos e linhas do gráfico, com lacuna e marcador.
  - Tooltip, cobertura e mensagens de indisponibilidade.
- `tests/market-ui.test.mjs` (9), `tests/price-series-ui.test.mjs` (5) e
  `tests/polled-store.test.mjs` (6).

Reescritos:
- `src/lib/liveQuotes.ts`: `session` na cotação, `priceText` (zero nunca é
  preço) e `consultedAt` ("às 10:48" ou "em 04/11 às 17:55").
- `src/hooks/useLiveQuotes.ts`: só `useLiveQuote`, para os dados do pregão da
  página logada, sobre a loja compartilhada.
- `src/hooks/usePublicRanking.ts`: loja única do `/api/rankings/public`, que
  devolve também `stale`.
- `src/components/LiveQuote.tsx` e `live-quote.css`: `MarketPriceCell`,
  `MarketMarginCell` e `MarketQuotePanel` (variantes `research` e `public`).
- `src/components/stock-make/HistoryCharts.tsx`: `PriceSeriesChart` novo. O
  `HistoricalDividendChart` ficou igual, byte a byte.

Alterados:
- `src/components/DividendRankingTable.tsx` e `dividend-research.css`:
  - células de preço e margem e tooltips das colunas;
  - nota com um "medidor" invisível, que guarda a altura da nota.
- `src/pages/IncomeRanking.tsx`:
  - a loja começa junto com o pedido da publicação;
  - ordenar por margem usa a margem exibida;
  - texto "Compare com o mercado" no "Como ler".
- `src/components/stock-make/StockMake.tsx`, `data.ts`, `ui.tsx`, `Charts.tsx`
  e `src/components/DividendResearch.tsx`: página logada, `StockMarketContext`,
  `Seg` com opções desativadas e legenda com marcador.
- `src/pages/PublicStock.tsx`, `src/components/home/ResearchSample.tsx` e
  `public-sections.css`: páginas públicas e prévias.
- `src/components/RankingHighlights.tsx`: os destaques de `/app` usam a mesma
  loja.
- `src/lib/stockHistory.ts`: saíram `mergeLiveHistory`, `LiveHistory`,
  `selectPrices`, `pricePlot` e `historyPeriods`.
- `public/llms.txt` e `tests/site.test.mjs`.
- Testes: `market-fixture.mjs` (reescrito), `dividend.browser.mjs` (reescrito),
  `public-rankings.browser.mjs` (reescrito), `stock-theme.browser.mjs`,
  `figma-stock.browser.mjs`, `browser.mjs`, `browser-experience.mjs`,
  `public-home.browser.mjs`, `live-quotes.test.mjs` e
  `stock-history-ui.test.mjs`.

Removido: `src/hooks/useLiveHistory.ts`. A série de preços da AGF tem base
mista e não é mais desenhada.

## O que cada tela mostra
Ranking (`/app/ranking`):
- **Preço de mercado.** Mostra a cotação, com a variação % embaixo em verde ou
  vermelho sutil.
  - O `title` e o texto para leitor de tela dizem "Cotação brapi.dev com atraso,
    consultada às 10:48 (horário de Brasília)."
  - Defasada: "defasada · −0,91%".
  - Sem cotação válida: o preço da pesquisa e "da pesquisa (20/10)".
  - Sem preço nenhum: "Não informado" e "cotação indisponível".
- **Margem de segurança.** Mostra duas casas, como em "40,07%" ou "−20,00%".
  - O `title` traz a conta: "Margem de segurança = (preço-teto − cotação de
    mercado) ÷ preço-teto = (R$ 32,74 − R$ 19,62) ÷ R$ 32,74 = 40,07%.
    Preço-teto da pesquisa de 20/10; cotação brapi.dev consultada às 10:48…".
  - Embaixo aparece "defasada" ou "da pesquisa (20/10)". Sem teto válido, fica
    "Não informado".
- **Carregando.** As duas linhas ficam reservadas e vazias, com o texto
  "Consultando a cotação na brapi.dev." para leitor de tela.
  - Um teste mede que a região, as linhas e o botão não se mexem quando a
    cotação chega.
- **Nota.** Diz a fonte e o horário, a fórmula, que a margem fica negativa
  acima do teto, e que "O preço-teto vem da publicação de 22/10 e só muda com
  uma nova análise."
  - Numa versão anterior: "Nesta versão, preço de mercado e margem de segurança
    são os da pesquisa publicada em DD/MM…".
  - Se a consulta falhar, a nota avisa a "última cotação válida".
- A linha "agora" saiu. Colunas, filtros, "Ver mais" e a ordem padrão não
  mudaram. "Maior margem de segurança" ordena pela margem exibida.

Página logada da empresa (`/app/ranking/acao/:ticker`):
- Topo com "Preço de mercado" (por exemplo "brapi.dev, com atraso · 10:48",
  "defasada · 10:48" ou "da pesquisa (20/10)"), "DY bruto estimado" e "P/L
  projetado", com "na data da pesquisa", "Preço-teto" ("da pesquisa de 20/10")
  e "Margem de segurança" dinâmica, com a fórmula no `title`.
- Seção Cotação, bloco "Cotação atual":
  - a cotação canônica;
  - "−R$ 0,18 · −0,91%". O valor em R$ vem da v2 só quando o preço dela é o
    mesmo da tela;
  - "Dados do pregão · cotação de 10:30", com abertura, máxima, mínima e
    fechamento anterior, só quando há `session`;
  - o teto, a margem e o volume;
  - "Na publicação de 22/10: preço R$ 19,37 e margem de segurança de 0,00%.";
  - os estados defasada, pesquisa e indisponível.
- Visão geral: a barra "Cotação frente ao preço-teto" usa a cotação canônica.
- Indicadores: os 20 campos continuam os da planilha. O de margem se chama
  "Margem da pesquisa".
- "Entenda os números": a pergunta da margem traz a fórmula, a margem atual e a
  "Margem da fonte, na publicação".

Gráfico de preços:
- Alternâncias Diário/Mensal e "Ajustado por proventos"/"Sem ajuste". A base
  sem série fica desativada e tem um `title` com o motivo.
- A base da série desenhada aparece escrita.
- Períodos: 5D, 1M, 6M, 1A, 5A e Máx no diário; 6M, 1A, 5A e Máx no mensal.
- O marcador ◆ da cotação mais recente tem o mesmo preço do ranking e é sempre
  nominal. A linha tracejada aparece só com `connect: true`.
  - A nota explica a falta da linha: lacuna, ou série ajustada em outra base.
- Em `gapBefore`, o traço é interrompido e aparece uma nota.
- Meses `incomplete` têm ponto tracejado e uma nota: "07/2026: dados até 24/07".
- O tooltip traz a data do pregão (São Paulo), o valor, a base, o status, a
  fonte e o teto.
- Cobertura ("Fontes: …") e notas do servidor aparecem embaixo.
- Estados próprios para carregando, código inválido, erro com "Tentar
  novamente" e indisponível (`no_token`, `not_covered`, `budget`,
  `provider_error`, 404 e série vazia).
- O teto continua uma linha constante. Os gráficos de proventos e resultados
  não mudaram.

Páginas públicas e prévias:
- Página pública das três primeiras:
  - "Indicadores da pesquisa": DY e P/L com "na data da pesquisa", e a margem
    da mesma resposta pública ("com a cotação de 10:48", "defasada" ou "da
    pesquisa (22/10)"), com a fórmula sem o valor do teto;
  - bloco "Cotação atual" da mesma resposta, sem teto e sem chamar
    `/api/market/quote`;
  - novo texto: "DY e P/L são estimativas da pesquisa, na data da publicação, e
    não mudam com a cotação. A margem de segurança acompanha a cotação da
    brapi.dev, com atraso."
  - A meta description não leva mais a margem.
- Home e `/ranking`: margem dinâmica nos três cartões. "defasada" e "da
  pesquisa (DD/MM)" só aparecem quando valem, numa linha pequena.
- Destaques de `/app`: preço e margem da loja, iguais aos do ranking.

## Decisões e leituras do contrato
1. Os dados de mercado valem só quando `publication.id` da rota é o da
   publicação exibida. Uma versão anterior mostra a própria pesquisa.
2. "da pesquisa (DD/MM)" usa o dia da pesquisa: o `safetyMargin.checkedAt` da
   base `research` ou o `updatedOn` da planilha. A nota da tabela e "Na
   publicação de DD/MM" usam a data da publicação.
3. Se a loja falhar depois de uma resposta boa, mercado vira "defasada". Sem
   nenhuma resposta, aparecem os valores da pesquisa.
4. O preço exibido com base `market` ou `stale` é o `safetyMargin.price`, o
   mesmo da margem. A variação % vem do `quote`.
5. O marcador do gráfico usa o preço canônico da tela. A linha tracejada
   segue o `connect` da série, só se a cotação for do mesmo dia (São Paulo).
6. Os pedidos levam sempre `basis` e `granularity`. No modo "auto", são até
   dois pedidos por ticker na primeira visita.
7. O texto do marcador usa o travessão do pedido ("Cotação mais recente —
   preço nominal de mercado, consultada às HH:MM"). O documento usa vírgulas.
8. Os destaques de `/app` (`RankingHighlights`) não estavam na lista. Mudaram
   para não mostrar uma margem diferente da do ranking.
9. Conferido na implementação do backend, só por leitura, e na nota da
   coordenação:
   - os dados do pregão vêm só de `session`; os campos de cima ficam nulos;
   - `change` em R$ só existe no mesmo pregão;
   - a base `research` traz `price` igual ao preço da pesquisa (nulo na rota
     pública) e `checkedAt` com o dia da pesquisa;
   - sem publicação, a rota devolve `publication: null`;
   - na série, `coverage.notes` vem em texto (objetos `{ code, text }` também
     são aceitos), e as respostas 401, 400 e 404 são tratadas, a 404 como "não
     coberto".

## Verificações (locais, sem banco e sem produção)
- `npm test`: 170/170.
- Novos: `market-ui` 9, `price-series-ui` 5 e `polled-store` 6. Com
  `safety-margin` (coordenação, 6), 26/26.
- `npm run lint`: ok. `npx tsc -b`: ok.
- `npm run build`: ok, HTML de 8 rotas. O pedaço do ranking continua sem
  recharts.
- `node tests/dividend.browser.mjs`: 15/15. Inclui:
  - os 5 exemplos do corretor (teto 10 com 5, 8, 10, 12 e 4 → 50,00%, 20,00%,
    0,00%, −20,00% e 60,00%, com o `title` da conta);
  - os 90 valores de margem iguais aos do servidor;
  - os estados defasada, pesquisa e sem teto;
  - a versão anterior e a ordenação pela margem exibida;
  - "sem salto" (região, linhas e botão não se mexem);
  - aba oculta, falha (defasada) e recuperação;
  - Teste C: nova cotação sem recarregar, ranking e empresa iguais, um pedido
    por ciclo, e volta ao ranking com o valor novo;
  - 320 px nos dois temas e nenhum "tempo real".
- `node tests/public-rankings.browser.mjs`: 10/10, com o serializador real do
  servidor (`publicRankingWithMarket` e `rankingMarketBody`). Cobre:
  - prévias e página pública (mercado, pesquisa e defasada, sem teto e sem
    `/api/market`);
  - a página logada com os cinco resumos;
  - o gráfico: diário e mensal, duas bases, marcador com e sem linha, lacuna,
    mês incompleto, tooltip por teclado, base só nominal (auto), `budget`,
    `not_covered` e 404;
  - 320 px nos dois temas.
- `node tests/stock-theme.browser.mjs`: 6/6, com cotação, margem e série nos
  dois temas e três larguras.
- `node --test tests/seo.dist.mjs`: 6/6.
- `node tests/public-home.browser.mjs`: 10/10 na segunda execução.
  - Na primeira, deu 9/10: a comparação de pixels da marca animada em
    "mobile-reduced" achou 3.951 pixels com diferença máxima de 2 por canal.
  - Os arquivos do topo da home não mudaram nesta rodada. Rodando sozinho, o
    teste passou: foi ruído de renderização.
  - A fixture desse teste agora traz os blocos `market`.
- Não rodados, porque exigem servidor e banco de teste: `figma-stock`,
  `browser.mjs` e `browser-experience.mjs`. Foram ajustados (rótulos, cinco
  gráficos, bloco novo e rotas novas na fixture) e passaram em `node --check`.

## Riscos e limites
- Com a ordem "Maior margem", as linhas trocam de lugar quando uma cotação
  nova muda a margem. É o comportamento pedido.
- `CompanyComparison` (`ResearchTools.tsx`, fora do escopo) ainda mostra os 20
  campos da planilha, e o campo de preço tem o rótulo "Cotação atual" da
  planilha.
- A rota de série tem limite de 30/min por pessoa. Quem alternar muito
  depressa entre empresas e bases pode ver o estado de erro, com "Tentar
  novamente".
- O `401` de `/api/rankings/market` vira "defasada" ou "pesquisa". A sessão é
  renovada pela própria página, como antes.
- A loja guarda os dados na memória da aba. Outra conta na mesma aba começa
  do zero.
- Nos cartões da home, "defasada" ou "da pesquisa" acrescentam uma linha
  pequena. A reserva de altura da prévia foi medida sem ela.
- `accessibility.browser.mjs` já falhava antes da rodada e não foi alterado.

## Pedidos à coordenação
- Acrescentar ao `npm test`: `tests/market-ui.test.mjs`,
  `tests/price-series-ui.test.mjs` e `tests/polled-store.test.mjs` (e
  `tests/safety-margin.test.mjs`, se ainda não estiver).
- QA: rodar `figma-stock`, `browser` e `browser-experience` com banco de teste.
  Em homologação com token, conferir a sessão v2 e as duas bases.
