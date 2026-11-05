# Backend — cotações e históricos da brapi (05/11/2026)

## Objetivo

Implementar o contrato `docs/COTACOES.md` no backend: provedor brapi trocável,
serviço com cache por sessão do pregão, deduplicação, pausa após 429, nova
tentativa, fila por ação, orçamento diário e rotas `/api/market/*`, sem banco nos
testes e sem tocar em `src/`, `.env` ou segredos.

## Arquivos

Novos:

- `server/market/brapi-provider.js`: único módulo que conhece URLs e payloads da
  brapi. `catalog()`, `quote(symbol)` e `history(symbol, range)` devolvem objetos
  normalizados (texto decimal ou `null`). Valida de novo ticker e período antes de
  montar a URL, usa `URLSearchParams`, `redirect: "error"`, token só no header
  `Authorization: Bearer` e grava o log `brapi_call` (endpoint sem query string,
  status, resultado, duração, `authenticated`).
- `server/market/quote-service.js`: cache em memória e em `provider_cache`,
  deduplicação de pedidos simultâneos, pausa compartilhada após 429
  (`brapi:cooldown`), uma nova tentativa com espera para rede/5xx, nenhuma para
  4xx, fila de concorrência 1, orçamento diário `brapi:usage:AAAA-MM-DD` e montagem
  dos objetos `quote`, `market` e do histórico. Todas as dependências são
  injetadas (provedor, cache, relógio, log, espera).
- `server/market/market-session.js`: funções puras `marketSession`,
  `publicMarket`, `cacheTtlMs` e `saoPauloDate` (fuso `America/Sao_Paulo`).
- `server/market/validation.js`: regex de ticker, tickers de demonstração e
  esquemas zod da lista (1 a 100), do ticker e do período.
- `server/market/plans.js`: tabela dos planos e leitura de `BRAPI_PLAN` e
  `BRAPI_DAILY_BUDGET`.
- `tests/market-quotes.test.mjs` (13 testes) e `tests/quote-service.test.mjs`
  (12 testes).

Alterados:

- `server/market.js`: só rotas. `/assets` mantém a resposta; `/quotes`, `/quote/:ticker`
  e `/history/:ticker` novos; `getMarketQuotes` (carteira) agora usa a lista geral.
- `server/provider-cache.js`: `readCache` também devolve `expiresAt`;
  `reserveProviderCall(key, kind, budget)` novo.
- `server/config.js`: `brapiPlan`, `brapiPlanLimits`, `brapiDailyBudget`.
- `server/stock-history.js`: `hasStockHistory(ticker)` com a lista fixa dos 90
  tickers do snapshot (sem descompactar 12 MB). Um teste confere a lista contra o
  arquivo empacotado. Nada novo é exposto pela API.
- `.env.example`: `BRAPI_PLAN=free` e `BRAPI_DAILY_BUDGET=450`, sem valores secretos.

## Rotas como implementadas

Todas validam com zod, respondem `Cache-Control: no-store` e usam o limitador
`market` existente (30/min por cliente). Erro de validação: 400 com mensagem em
português.

- `GET /api/market/quotes?symbols=A,B` (1 a 100 após remover repetidos, minúsculas
  aceitas): `{ quotes: quote[], market }`, na ordem pedida. Só a lista geral.
- `GET /api/market/quote/:ticker`: `{ quote, market }`. v2 (`detail: "full"`) com
  token ou ticker de demonstração; senão, ou com orçamento esgotado, 401/403/404
  ou payload inválido, lista geral (`detail: "summary"`). Com 429, rede ou 5xx,
  serve a última v2 válida como `stale`; sem ela, a lista geral.
- `GET /api/market/history/:ticker?range=1mo|3mo|1y`: `{ symbol, available, reason,
  interval: "1d", range, points, checkedAt, source, stale }`, sempre 200 para os
  motivos do contrato. Ordem dos motivos: `not_covered` → `no_token` →
  `range_not_in_plan` → `budget` / `provider_error`.
- `GET /api/market/assets`: mesma resposta. Só a falha sem nenhum dado em cache
  passou de erro genérico para 503 "Catálogo de ações indisponível no momento.".

Objeto `quote`: exatamente os campos do contrato (`symbol`, `name`, `logoUrl`,
`currency`, `price`, `change`, `changePercent`, `previousClose`, `dayHigh`,
`dayLow`, `volume`, `quoteTime`, `marketTime`, `checkedAt`, `freshness`, `stale`,
`unavailable`, `detail`, `delayMinutes`, `source`). `stale` é verdadeiro só com
`freshness: "stale"`; uma cotação indisponível tem `stale: false` e
`unavailable: true`. `market`: `{ state, refreshSeconds, nextRefreshAt }`.

## Desvios e acréscimos ao contrato (a coordenação decide se atualiza o documento)

1. **Regex do ticker.** O contrato `^[A-Z]{4}[0-9]{1,2}F?$` recusa `B3SA3`, que está
   no snapshot e no ranking. Usei `^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$`, a mesma regra de
   `company-logo.mjs`. A interface usa hoje a regex do contrato em
   `src/lib/liveQuotes.ts` e `tests/market-fixture.mjs`: B3SA3 fica sem cotação na
   tela até ela adotar a mesma regra.
2. **Janela de fechamento.** Até 45 min depois das 18:00 (dias úteis) o TTL continua
   o do mercado aberto, para não guardar a noite inteira um preço anterior ao call
   de fechamento num feed com 30 min de atraso. `market.state` continua `closed` às
   18:00, como no contrato.
3. **`nextRefreshAt`** com o mercado fechado é o menor entre agora + 1.800 s e a
   próxima abertura, para a interface não perder o começo do pregão.
4. **Histórico:** `range` é opcional (padrão `1mo`); campo extra `stale` (pontos da
   última consulta válida quando a brapi falha). Sem token, o teto de período é o do
   plano gratuito (3 meses).
5. **Orçamento:** vale também para os tickers de demonstração sem token. Se o
   contador do MySQL não responde, chamadas por ação não são feitas (falha fechada)
   e o histórico responde `reason: "budget"`; a lista geral continua.
6. **Sem token**, a lista geral entra na mesma fila de concorrência 1 das chamadas
   por ação, porque a brapi declara `x-brapi-concurrency-limit: 1`. Com token, só as
   chamadas por ação ficam na fila.
7. **Data do contador** `brapi:usage:AAAA-MM-DD` usa o dia de São Paulo. Linha:
   `{"perTicker": n, "catalog": n}`, expira em 40 dias.

## Outras decisões

- Pausa do 429: `Retry-After` em segundos ou data HTTP, padrão 60 s, entre 1 s e
  24 h; gravada em `brapi:cooldown` e lida por qualquer instância antes de chamar.
- Falha transitória (rede/5xx depois da nova tentativa) bloqueia aquela chave por
  60 s; recusa (4xx, payload inválido) bloqueia até o próximo ciclo do cache (a
  lista geral no máximo 15 min). Assim uma falha não vira uma chamada por visitante.
- Com token, a v2 só é chamada para ticker de demonstração, do snapshot ou presente
  na lista geral, para não gastar orçamento com tickers inexistentes.
- O incremento por ação é um único `UPDATE ... WHERE contador < orçamento`
  (atômico entre instâncias); `affectedRows === 1` reserva a chamada. Cada tentativa
  conta, inclusive a nova tentativa.
- Falhas do `provider_cache` (leitura/gravação) não derrubam a rota: viram log
  `market_cache_error` só com código, com intervalo de 60 s.
- Chaves novas (`market:catalog`, `market:quote:X`, `market:history:X:R`) evitam ler
  as linhas antigas `catalog` e `quote:X`, que ficam órfãs e inofensivas.

## Verificações

- `node --test tests/market-quotes.test.mjs tests/quote-service.test.mjs`: 25/25.
  Cobrem normalização das três amostras reais, `null` nunca vira 0, sessão de São
  Paulo com fim de semana, TTL, deduplicação, 429 com `Retry-After` (pausa
  compartilhada e cotação defasada), nova tentativa em 5xx/rede e nenhuma em 4xx,
  orçamento esgotado voltando à lista, contador por dia de São Paulo, falha do
  contador, concorrência 1 (inclusive lista sem token), token fora de URL/log/
  resposta/cache, validação e limite de 100, datas do histórico e deduplicação.
  O teste da fila sem token foi conferido falhando sem a correção.
- `npm test`: 146/146 (lista atual do `package.json`, que já inclui
  `tests/live-quotes.test.mjs` da interface). Uma execução intermediária teve 1
  falha enquanto a interface editava seus arquivos; as quatro seguintes passaram.
- Lista do `npm test` + os dois arquivos novos: 171/171.
- `npm run lint`: sem erros. `node scripts/harness.mjs check`: quadro válido.
- Prettier só nos arquivos novos; nos existentes, só as linhas editadas.
- Fumaça das rotas (script no scratchpad, fora do repositório): MySQL inalcançável
  e `fetch` simulado, handlers chamados direto (sem limitador). 400 em 101 tickers,
  lista em array, ticker e período inválidos; 200 nas demais; com o banco fora, a
  lista geral funciona e as chamadas por ação ficam bloqueadas, como planejado.
- Não executado: brapi real, MySQL real (as duas queries novas de
  `reserveProviderCall` não rodaram contra MySQL), integração, browser e build.

## Pendências e riscos

- **`package.json` está reservado pela interface.** Falta acrescentar
  `tests/market-quotes.test.mjs tests/quote-service.test.mjs` ao script `test`.
- **SQL do contador sem execução real.** Validar `reserveProviderCall` num MySQL
  descartável antes de publicar (JSON_SET/CAST e `affectedRows` com `FOUND_ROWS`).
- A concorrência 1 e a memória valem por instância; várias instâncias da Vercel
  podem chamar a brapi ao mesmo tempo. O cache e a pausa compartilhados reduzem
  isso, mas não é uma trava distribuída.
- Com token, qualquer ticker válido e conhecido gasta orçamento; alguém pode
  esgotar as 450 chamadas do dia (30/min por IP). O efeito é voltar à lista geral.
- A carteira (`/api/portfolio`) agora usa só a lista geral: com token, perde o
  horário da cotação (`marketTime` nulo) que a v1 dava, mas não gasta orçamento.
- `redirect: "error"`: se a brapi passar a redirecionar, as consultas falham e o
  site serve a última cotação válida.
- Hoje o MySQL de produção está desligado; sem banco, toda a API já responde 503
  pelos limitadores, independentemente desta mudança.

## Próximo passo

Coordenação: incluir os dois testes no `package.json`, decidir os desvios 1 a 7
(principalmente a regex, que a interface precisa seguir) e validar o SQL do
contador num MySQL descartável antes da publicação.
