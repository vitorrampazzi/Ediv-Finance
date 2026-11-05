# Interface: cotações da brapi.dev (05/11/2026)

## Objetivo
Mostrar a cotação da brapi.dev à parte dos números da pesquisa, conforme
`docs/COTACOES.md`. O ranking, a página logada da empresa, a página pública das
três primeiras e o gráfico de cotação passam a usá-la. "Preço de mercado",
"Margem de segurança", a ordem, as colunas, a busca, os filtros e a ordenação do
ranking não mudaram. Nenhum texto diz "tempo real". Os horários aparecem no fuso
America/Sao_Paulo.

## Arquivos
Novos:
- `src/lib/liveQuotes.ts`: funções puras. Valida o ticker (`^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$`,
  a regra nova do backend, que aceita B3SA3), monta o conjunto ordenado e sem
  repetição e divide em blocos de 100. Lê o `quote` e o `market` com cuidado
  (`null` nunca vira 0), limita o intervalo entre 60 s e 1 h e formata em pt-BR
  (sinal "−" tipográfico). Também gera o texto da fonte ("com atraso", "consultada
  às HH:MM" ou "cotação de HH:MM", com a data quando não é hoje) e calcula
  `firstOpenDate`.
- `src/hooks/useLiveQuotes.ts`: `usePolledResource` (consulta de novo no
  `refreshSeconds`, pausa com `document.hidden`, consulta ao voltar se o prazo
  venceu, respeita o `Retry-After`, tenta de novo após falha em 2 min e cancela
  ao desmontar). Também tem `useLiveQuotes(symbols)`, com um pedido por conjunto
  e blocos de 100, e `useLiveQuote(ticker)`. Depois de uma falha, os últimos
  valores continuam na tela, marcados como defasados. Só o primeiro
  carregamento aparece como "carregando".
- `src/hooks/useLiveHistory.ts`: `/api/market/history/:ticker?range=3mo`,
  consultado no máximo de hora em hora.
- `src/components/LiveQuote.tsx` e `live-quote.css`: a linha do ranking
  (`LiveQuoteLine`) e o bloco "Cotação atual" (`LiveQuotePanel`), com as
  variantes `research` (tokens fmk) e `public` (tokens evo).
- `tests/live-quotes.test.mjs` (7 testes) e `tests/market-fixture.mjs` (respostas
  determinísticas de `/api/market/*`, que recusam o que a rota real recusa).

Alterados:
- `src/pages/IncomeRanking.tsx`: chama `useLiveQuotes` uma vez com todos os
  tickers da publicação. Busca, filtros e "Ver mais ações" não geram novo
  pedido. A demonstração não consulta.
- `src/components/DividendRankingTable.tsx`: recebe a prop opcional `liveQuotes`.
  A célula "Preço de mercado" mantém o valor da planilha
  (`[data-research-value]`) e ganha a linha. A nota da tabela e o tooltip da
  coluna explicam as fontes. Na prévia do administrador nada muda.
- `src/components/stock-make/StockMake.tsx`: o bloco "Cotação atual" fica na
  seção 02 · Cotação, acima do gráfico. "Cotação de referência" ganha o subtítulo
  "preço da pesquisa". O indicador `referencePrice`, que a planilha chama de
  "Cotação atual", passa a se chamar "Preço da pesquisa" para não confundir com
  o bloco.
- `src/components/stock-make/Charts.tsx`: no gráfico da publicação, o preço da
  planilha aparece como "Preço da pesquisa" (rótulo curto "Referência").
- `src/components/stock-make/HistoryCharts.tsx`: junta o histórico, mostra a
  linha de origem e, nos pontos da brapi, o tooltip diz "· fechamento
  brapi.dev". Os gráficos de proventos e resultados não mudaram.
- `src/lib/stockHistory.ts`: tipo `LiveHistory` (com `stale`) e
  `mergeLiveHistory`, uma função pura.
- `src/pages/PublicStock.tsx`: bloco "Cotação atual" público e a nota "Estimativas
  da pesquisa, que não mudam com a cotação do dia".
- `package.json`: lista do `npm test` com `tests/live-quotes.test.mjs` e, a
  pedido da coordenação, `tests/market-quotes.test.mjs` e
  `tests/quote-service.test.mjs`, que são do backend.
- Testes: `stock-history-ui.test.mjs` e as suítes de navegador `dividend`,
  `public-rankings`, `figma-stock`, `stock-theme`, `browser` e
  `browser-experience`. Todas respondem `/api/market/*` pela fixture.

## O que cada tela mostra
Ranking (`/app/ranking`, tabela `DividendRankingTable`; a
`ResearchRankingTable` só aparece na demonstração ou em publicação sem
`dividendAnalysis`):
- Caso summary (sem token): "agora R$ 19,62 · −0,91%". O percentual tem cor
  sutil (`--ediv-green` ou `--ediv-red`, nos dois temas). O `title` e o texto
  para leitor de tela dizem "Cotação brapi.dev com atraso, consultada às 10:48
  (horário de Brasília)."
- Caso full: o mesmo texto, com "com atraso de até 30 min, cotação de 10:30".
- Com falha depois de uma consulta boa: "defasada R$ 19,62 · −0,91%" e o
  aviso no `title`.
- Sem cotação ou com ticker inválido: "cotação atual indisponível".
- A linha tem altura reservada desde o primeiro quadro, então nenhuma linha da
  tabela muda de altura. Isso foi medido: todas as 90 linhas têm a mesma altura.
- Nota: "Preço de mercado e margem de segurança são os da pesquisa publicada. A
  linha “agora” traz a cotação da brapi.dev, com atraso, e não muda a ordem nem
  a margem."

Página da empresa (logada, `/app/ranking/acao/:ticker`, e pública das três
primeiras, `/ranking/acao/:ticker`), bloco "Cotação atual":
- Summary: preço, variação em % e volume, mais a fonte "brapi.dev · com atraso ·
  consultada às HH:MM". Não mostra fechamento anterior, máxima nem mínima.
- Full: preço, variação em R$ e em %, fechamento anterior, máxima, mínima e
  volume, mais "brapi.dev · com atraso de até 30 min · cotação de HH:MM".
- Defasada: aviso "Defasada: a consulta mais recente falhou…".
- Indisponível: "Cotação atual indisponível no momento…", sem nenhum número.
- Na página logada, o bloco diz "Preço da pesquisa: R$ X, da planilha
  publicada". A página pública não tem o preço da planilha (a API pública só
  envia três indicadores), então mostra apenas a nota de que a cotação não
  altera a pesquisa.

Gráfico de cotação (página logada com histórico empacotado):
- `mergeLiveHistory` acrescenta só os fechamentos com data posterior ao último
  ponto do pacote. Antes, confere as até 5 datas em comum mais recentes, que
  precisam bater dentro de 0,5% no `close`. Datas repetidas com o mesmo valor
  contam uma vez. Datas com valores diferentes, valores nulos, ≤ 0 e datas
  inválidas são descartados. O pregão do dia é descartado até 18:30 (horário de
  Brasília) dos dias úteis, porque o fechamento ainda não é final.
- A linha discreta diz "Histórico até 23/10/2026 + fechamentos diários da
  brapi.dev até 28/10." Quando não estende, ela dá o motivo: sem token ("a
  atualização diária pela brapi.dev ainda não está ativa"), não coberto,
  orçamento, erro, período fora do plano, sem pontos novos, sem datas em comum
  ou divergência acima de 0,5%. Hoje, sem token, aparece a frase do "sem token".

## Decisões
- A junção compara as 5 datas comuns mais recentes, não todas. A série da AGF
  parece ajustada por proventos: os valores antigos não são redondos (TIMS3 em
  2020: 11,0697…). Assim, uma data de meses atrás pode divergir mais de 0,5% do
  `close` bruto da brapi, mesmo com as duas fontes certas. Os pontos novos usam
  `close`.
- O texto mostra a data do último ponto do pacote, que é 23/10/2026 para TIMS3, e
  não a data de captura (26/10).
- Um pedido de cotações por publicação inteira, e não por página visível.

## Verificações (locais, sem banco e sem API de produção)
- `npm test`: 171/171 passaram, incluindo os 7 novos de `live-quotes`, o novo
  de junção em `stock-history-ui` e os do backend.
- `npm run lint`: ok. `npx tsc -b`: ok. `npm run build`: ok (HTML de 8 rotas).
- `node tests/dividend.browser.mjs`: 12/12 PASS. Os dois testes novos cobrem a
  linha "agora" e "indisponível", um único pedido com os 82 tickers válidos, a
  mesma altura nas linhas, o bloco completo e indisponível e a ausência de
  "tempo real". Também cobrem a pausa com a aba oculta, a consulta ao voltar e os
  números defasados na falha, com relógio simulado.
- `node tests/public-rankings.browser.mjs`: 11/11 PASS. Um teste novo cobre a
  junção (estendido, `no_token`, divergência, tooltips com data e
  "fechamento brapi.dev") e outro o bloco summary e indisponível na página
  pública.
- `node tests/stock-theme.browser.mjs`: 6/6 PASS; `node tests/seo.dist.mjs`: 6/6;
  `node tests/public-home.browser.mjs`: 8/8 PASS.
- 320 px nos dois temas, conferido em capturas: tabela com a linha
  ("agora", "indisponível"), bloco da página logada, bloco público e gráfico
  estendido, todos sem rolagem horizontal da página. Um texto só para leitor de
  tela fora da área rolável alargava a página para 796 px. Foi corrigido com
  `position: relative` na linha.
- Não rodados: `figma-stock.browser.mjs`, `browser.mjs` e
  `browser-experience.mjs` (exigem servidor e banco de teste). Foram só ajustados
  (fixture de mercado e rótulo "Preço da pesquisa") e passaram em `node --check`.

## Contrato e pedidos à coordenação
- Já aplicado: a regex nova `^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$` e `range=3mo`. O
  `stale` do histórico aparece como "(defasados)" na linha do gráfico.
- Sugestão para o `docs/COTACOES.md`: registrar que a junção confere as datas
  comuns mais recentes (até 5) e que o pregão aberto fica de fora.
- O limitador `/api/market/*` aceita 30 pedidos/min por IP. Quem abrir mais de
  15 empresas por minuto pode ver "defasada" ou "indisponível" por um minuto.

## Riscos e limites
- `Favoritos`/`useMarketQuotes` não mudaram (blocos de 8). Com a regex nova do
  servidor, um favorito fora do padrão invalida o bloco inteiro (400), e a tela
  mostra o erro. Não conferi os favoritos salvos no banco.
- Na lista geral (summary), a brapi não informa o horário da cotação. O texto
  usa o horário da consulta, `checkedAt`.
- Os feriados da B3 não estão no calendário do servidor nem no `firstOpenDate`.
  Num feriado, o fechamento do dia anterior continua correto, e o do feriado não
  existe.
- `accessibility.browser.mjs` já falhava antes: não simula
  `/api/rankings/public`. Não foi alterado.

## Próximo passo
QA: rodar `figma-stock`, `browser` e `browser-experience` no ambiente com banco
de teste. Quando o token entrar, conferir em homologação que o caso full e o
gráfico estendido aparecem.
