# Backend — margem dinâmica, cotação canônica e séries de preço (06/11/2026)

## Objetivo

Implementar no backend o contrato `docs/MARGEM-E-HISTORICO.md` (com
`docs/COTACOES.md`): calendário da B3, cotação canônica com `session`,
`/api/rankings/market`, `market` na rota pública, séries do gráfico por base e
fechamentos consolidados pela Escola (migração 009). Toda margem vem de
`safety-margin.mjs`, que não foi alterado. Sem `src/`, `package.json`, `.env`,
segredos, commit, push ou deploy.

## Arquivos

Novos:

- `server/market/b3-calendar.js`: dias sem pregão de 2024, 2025 e 2026, com
  endereços e data da consulta no código; `isTradingDay`, `previousTradingDay`,
  `nextTradingDay`, `hasTradingDayBetween`, `lastTradingDayOfMonth`,
  `isCoveredYear`, `uncoveredYears`, `noSessionReason`.
- `server/market/ranking-market.js`: objeto `safetyMargin` (bases `market`,
  `stale`, `research`, `unavailable`), entradas de `/api/rankings/market` e o
  `market` de cada entrada pública.
- `server/market/price-series.js`: trecho nominal da AGF e montagem pura da
  resposta de `/api/rankings/price-series`.
- `server/market/daily-closes.js`: decisões da consolidação (janela, linhas,
  lista parada, trava, novas tentativas) e o gatilho, aguardado pela própria
  leitura que torna o pregão devido, com prazo de 2,5 s.
- `server/market-closes.js`: SQL da tabela `market_daily_closes` e da trava
  `closes:AAAA-MM-DD` no `provider_cache`.
- `server/market-service.js`: o serviço de cotações único do processo, ligado ao
  gatilho, usado por `/api/market` e `/api/rankings`.
- `server/migrations/009_market_daily_closes.sql`.
- Testes: `tests/b3-calendar.test.mjs`, `tests/price-series.test.mjs`,
  `tests/ranking-market.test.mjs`, `tests/daily-closes.test.mjs` e
  `tests/market-closes.integration.mjs`.

Alterados:

- `server/market/market-session.js`: sessão usa o calendário (feriado fechado,
  próxima abertura pula feriado); `saoPauloClock`, `tradingSessionDate`; TTL
  `series` (60 min aberto).
- `server/market/brapi-provider.js`: `open` (regularMarketOpen) na v2;
  `normalizeSeries` e `series(symbol, { range, includeRaw })`.
- `server/market/plans.js`: `seriesRange` (free 3mo, startup 1y, pro max),
  `includeRaw` (pro) e `demoSeries` (max com raw).
- `server/market/validation.js`: `seriesRanges`, `priceBases`,
  `priceSeriesQuerySchema`.
- `server/market/quote-service.js`: cotação canônica, `canonicalQuotes`
  (uma leitura da lista para várias ações), `series`, gancho `onCatalog`
  aguardado quando devolve trabalho (limite de segurança de 3 s),
  `priceDifference` exata; removido `isRejection`, que ficou sem uso.
- `server/market.js`: usa o serviço compartilhado.
- `server/rankings.js`: `/market`, `/price-series/:ticker`, `market` em
  `/public` e `/history/:ticker` só com o trecho nominal da AGF.
- `server/public-ranking.js`: `publicRankingWithMarket`; `publicRanking` igual.
- `server/stock-history.js`: `stockHistoryTickers()`.
- `server/backup.js`: `market_daily_closes` no backup e na restauração.
- `docs/HISTORICOS-ACOES.md`: base da AGF e o que é servido agora.
- Testes ajustados ao contrato novo: `tests/market-quotes.test.mjs` (`open`),
  `tests/quote-service.test.mjs` (preço da lista e `session`),
  `tests/provider-cache.integration.mjs` (idem), `tests/dividend.integration.mjs`
  (`market` na rota pública, rotas novas, história só com o trecho nominal) e
  `tests/backup.mjs` (um fechamento atravessa backup e restauração).

## Respostas como implementadas

Exemplos gerados pelo código, com brapi simulada e relógio fixo.

`GET /api/market/quote/PETR4` (preço da lista, pregão da v2):

```json
{ "quote": { "symbol": "PETR4", "name": "PETROBRAS PN", "logoUrl": "…", "currency": "BRL",
    "price": "47.64000000", "change": "0.52000000", "changePercent": "1.1000",
    "previousClose": null, "dayHigh": null, "dayLow": null, "volume": "53109700",
    "quoteTime": null, "marketTime": null, "checkedAt": "2026-11-05T20:49:44.908Z",
    "freshness": "delayed", "stale": false, "unavailable": false, "detail": "full",
    "delayMinutes": null, "source": "brapi.dev",
    "session": { "open": "47.90000000", "dayHigh": "48.04000000", "dayLow": "46.38000000",
      "previousClose": "47.12000000", "quoteTime": "2026-11-05T17:48:30.000Z",
      "checkedAt": "2026-11-05T20:49:44.908Z" } },
  "market": { "state": "open", "refreshSeconds": 900, "nextRefreshAt": "2026-11-05T21:04:44.908Z" } }
```

`GET /api/rankings/market` (logado, `no-store`):

```json
{ "publication": { "id": "12", "publishedAt": "2026-10-22T12:00:00.000Z" },
  "market": { "state": "open", "refreshSeconds": 900, "nextRefreshAt": "…" },
  "checkedAt": "2026-11-05T20:49:44.908Z",
  "entries": [
    { "ticker": "TIMS3", "quote": { "…": "…", "detail": "summary", "session": null },
      "ceilingPrice": "32.74", "researchPrice": "19.37", "researchSafetyMargin": "41.00",
      "safetyMargin": { "percent": "40.84", "basis": "market", "price": "19.37000000",
        "checkedAt": "2026-11-05T20:49:44.908Z" } },
    { "ticker": "EMAE4", "quote": { "…": "…", "price": null, "freshness": "unavailable" },
      "ceilingPrice": "60.00", "researchPrice": "52.00", "researchSafetyMargin": "13.00",
      "safetyMargin": { "percent": "13.00", "basis": "research", "price": "52.00",
        "checkedAt": "2026-10-20T03:00:00.000Z" } } ] }
```

`GET /api/rankings/public` (cache `public, max-age=0, s-maxage=60,
stale-while-revalidate=300`): o corpo de antes mais `market` no nível de cima, e
cada entrada `{ rank, ticker, companyName, dividendAnalysis, market: { quote,
safetyMargin } }`. Com a base `research`, `price` é `null` e `checkedAt` é a data
da publicação: `{ "percent": "13.00", "basis": "research", "price": null,
"checkedAt": "2026-10-22T12:00:00.000Z" }`. Teto e preço da pesquisa nunca saem.

`GET /api/rankings/price-series/PETR4?basis=nominal&granularity=daily`:

```json
{ "ticker": "PETR4", "basis": "nominal", "granularity": "daily",
  "availableBases": ["adjusted", "nominal"], "defaultBasis": "adjusted",
  "points": [
    { "date": "2024-08-22", "close": "37.12000000", "status": "consolidated", "source": "agf" },
    "…",
    { "date": "2026-10-23", "close": "58.68000000", "status": "consolidated", "source": "agf" },
    { "date": "2026-11-03", "close": "50.71000000", "status": "consolidated", "source": "brapi", "gapBefore": true },
    { "date": "2026-11-04", "close": "47.12000000", "status": "consolidated", "source": "brapi" } ],
  "latestQuote": { "price": "47.64000000", "checkedAt": "2026-11-05T20:49:44.908Z",
    "freshness": "delayed", "connect": true, "reason": null },
  "coverage": { "from": "2024-08-22", "to": "2026-11-04",
    "segments": [ { "from": "2024-08-22", "to": "2026-10-23", "source": "agf" },
                  { "from": "2026-11-03", "to": "2026-11-04", "source": "brapi" } ],
    "notes": [ "O histórico da AGF anterior a 22/08/2024 foi ajustado por um método não documentado e não é usado.",
               "O fechamento do pregão de hoje entra no gráfico depois das 19:00." ] },
  "unavailableReason": null, "checkedAt": "2026-11-05T20:49:44.908Z" }
```

Mensal: `{ "date": "2026-10-23", "month": "2026-10", "close": "58.68000000",
"status": "incomplete", "source": "agf" }`. Sem token, para TIMS3 na base
ajustada: `points: []`, `availableBases: ["nominal"]`, `defaultBasis:
"nominal"`, `unavailableReason: "no_token"`.

Erros: 401 sem sessão; 400 "Código da ação, base ou período inválido."; 404
"Histórico não disponível para esta ação." fora do snapshot e da publicação mais
recente. Limite de 30 pedidos por minuto (`price-series`).

## Desvios e decisões (a coordenação decide se atualiza o contrato)

1. **Calendário: 2024, 2025 e 2026, sem 2027.** A B3 ainda não publicou 2027
   (página de feriados e busca do ofício circular em 06/11/2026). A ANBIMA tem os
   feriados nacionais de 2027, mas não confirma 24/12 e 31/12, que a B3 fecha;
   por isso 2027 fica em segunda a sexta, e a resposta avisa em `coverage.notes`.
   Acrescentei 2024 e 2025, conferidos na mesma página e na ANBIMA, porque o
   trecho nominal da AGF começa em 2024. Nos anos sem calendário, a lacuna
   segue uma regra conservadora (item "Ajustes da coordenação"). A abertura às
   13:00 da Quarta-feira de Cinzas não é modelada.
2. **Cotação canônica:** além de `quoteTime`/`marketTime`, também
   `previousClose`, `dayHigh` e `dayLow` do nível de cima ficam `null`; os dados da
   v2 só ficam em `session` ("v2 só preenche session").
3. **`change`:** além de `session.quoteTime` ser do pregão atual, a lista também
   precisa ter sido lida nesse pregão, para não subtrair um fechamento anterior
   novo de um preço velho. "Pregão atual" é hoje a partir das 10:00 de um dia de
   pregão; antes disso, em fim de semana ou feriado, é o último pregão.
4. **`session` defasada:** a última resposta válida da v2 continua em `session`,
   com o próprio `quoteTime` e `checkedAt`. Saiu a regra antiga de voltar ao
   resumo quando a v2 é recusada, porque o preço não vem mais dela.
5. **Margem:**
   - `unavailable` mantém `price`/`checkedAt` da lista quando há preço;
   - `research` usa `researchMarginPercent()` e o `referencePrice` publicado
     como texto. A data é o `updatedOn` às 00:00 de São Paulo, ou a da
     publicação;
   - na rota pública, `research` leva `price: null` e a data da publicação,
     porque o `updatedOn` também não é público;
   - a validade do teto é conferida pelo próprio `safety-margin.mjs` (margem do
     teto contra ele mesmo);
   - `publishedAt` sai em ISO;
   - sem publicação, `/market` responde `publication: null, entries: []`.
6. **Séries:**
   - `notes` são frases (o `src/lib/priceSeries.ts` da interface só aceita texto);
   - o conflito de 0,5% é medido sobre o valor mantido, com decimais exatos; um
     log `price_source_conflict` agregado por montagem, no máximo 1 por hora e
     ação;
   - uma barra da brapi do dia D só conta se foi lida a partir das 19:00 de D
     (era 18:30; ver M1);
   - pontos em fim de semana ou feriado conferido são descartados;
   - `connect` diário vale com o último ponto no pregão da cotação ou no
     anterior (o mesmo pregão depois das 19:00 também liga); no mensal, com o
     último mês consolidado e no mês do pregão da cotação ou no anterior;
   - `gapBefore` mensal quando falta um mês inteiro;
   - `unavailableReason` só quando a base pedida não tem nenhum dado;
   - `checkedAt` é o da brapi quando ela está nos pontos, senão `null`;
   - com token, um ticker que a lista geral carregada não tem não gasta
     orçamento (`not_covered`; o 404 também), o que resolve a pendência P2 do QA
     para a série.
7. **Consolidação:**
   - o gatilho vale para qualquer leitura da lista com dados, não só a rota
     pública;
   - a leitura que torna o pregão devido espera as gravações, no máximo 2,5 s
     (item "Ajustes da coordenação");
   - travas: `running` 1 min, `retry` 5 min, `done` 7 dias. Cada instância tenta
     de novo por tempo: 1 min depois de achar a trava de outra, 5 min depois de
     erro ou prazo vencido. Uma lista já achada parada não é relida;
   - lista parada: ≥ 80% das ações presentes nos dois dias;
   - no primeiro dia, sem pregão anterior, grava;
   - `source = "brapi_list"` e `captured_at` é o `checkedAt` da lista;
   - grava as 90 do snapshot mais as da publicação mais recente no padrão B3.
8. **`/api/rankings/history/:ticker`** passa a servir em `prices` só o trecho
   nominal da AGF ("os valores antigos nunca são servidos"). A fonte, os
   proventos e o arquivo empacotado não mudam. A interface só desenha os
   proventos dessa rota.
9. **Backup:** `market_daily_closes` entra no backup. Não é cache, e os
   fechamentos não voltam de graça. A `docs/BACKUP.md` ("cache excluído") pode
   citar a tabela.

## Ajustes da coordenação (segunda rodada, 06/11/2026)

1. **A consolidação não depende de trabalho depois da resposta.** Na Vercel, a
   função pode congelar assim que a resposta sai.
   - Quando uma leitura da lista torna o pregão D devido (janela certa, dia não
     gravado e sem espera de nova tentativa), a mesma requisição aguarda as
     gravações, no máximo 2,5 s (`Promise.race` com temporizador), e só então
     continua.
   - A trava faz isso acontecer uma vez por pregão: o custo de latência é
     desprezível.
   - Prazo vencido ou erro: log `market_closes_error` (`TIMEOUT` ou o código), a
     requisição responde normalmente e a trava expira (1 min) para outra
     leitura tentar de novo.
   - As leituras sem nada devido não esperam e não fazem SQL.
   - O serviço de cotações aguarda o gancho com um limite de segurança de 3 s,
     para que um gancho com defeito nunca prenda a requisição.
   - Nenhuma dependência nova.
2. **Sem lacunas falsas em anos sem calendário conferido** (antes de 2024 e
   2027 até a B3 publicar).
   - Nesses anos, `gapBefore` só aparece com 3 ou mais dias úteis seguidos sem
     dado. Carnaval (segunda e terça) e feriados isolados não interrompem o
     traço. Os anos conferidos mantêm a regra exata
     (`hasDataGap` em `b3-calendar.js`).
   - A mesma regra vale para o mês incompleto (faltam 3 ou mais dias úteis no
     fim) e para o `connect` diário. Sem isso, 31/12/2018 ou 01/01/2027
     marcariam o mês ou o marcador como lacuna.
   - A nota em `coverage.notes` diz: "nesses anos, um feriado não vira lacuna;
     o traço só é interrompido com 3 ou mais dias úteis seguidos sem dado, e o
     mês só fica incompleto quando faltam 3 ou mais dias úteis no fim".
   - Dados reais da brapi (`max`, sem token):
     | Série | Regra de segunda a sexta | Regra nova |
     |---|---|---|
     | PETR4 (6.655 pregões desde 2000) | 261 lacunas | 0 |
     | ITUB4 (4.331 pregões desde 2009) | 161 lacunas | 0 |
     Nenhum mês ficou incompleto nas duas.
   - Troca consciente: um buraco real de 1 ou 2 dias úteis nesses anos não é
     marcado.

## M1 do QA: fechamento final só a partir das 19:00 (07/11/2026)

**Problema.** A consolidação gravava D com a primeira lista lida a partir das
18:30, e o `INSERT IGNORE` nunca reescreve. Em 06/11, a v2 da PETR4 tinha
`regularMarketTime` 18:31:30, e a lista tem `s-maxage=900`. Uma leitura entre
18:30 e cerca de 18:45 podia guardar para sempre um preço anterior ao leilão de
fechamento.

**Correção (decisão da coordenação):**

- `server/market/daily-closes.js`: `closingMinute` = 19:00. Só uma lista lida
  a partir das 19:00 de D, e antes da próxima abertura, tem o fechamento final
  de D.
- `server/market/price-series.js`: `finalFromMinute` = 19:00. Uma barra da brapi
  de D só é final se foi lida a partir das 19:00 de D.
- `server/market/market-session.js`: `settleMinutes` de 45 para 100. O TTL curto
  vai até 19:40, então uma lista nova sempre é buscada depois das 19:00. Uma
  lista buscada depois das 19:40 recebe o TTL longo, mas o `checkedAt` dela já é
  de 19:00 em diante.
- Comentários com 18:30 corrigidos.

**Testes ajustados** às fronteiras novas, mantendo a intenção de cada um (não
devido às 18:59, devido às 19:00, 18:30 e 18:45 explicitamente não devidos):

- `tests/daily-closes.test.mjs`, `tests/price-series.test.mjs`,
  `tests/market-quotes.test.mjs` (TTL curto às 18:50 e 19:39, longo às 19:40);
- `tests/ranking-market.test.mjs`: na rota HTTP real, uma leitura às 18:50 não
  grava nada, e a das 19:10 busca uma lista nova e grava antes de responder;
- `tests/market-closes.integration.mjs` (cenário de 18:40 para 19:10);
- os arquivos do QA `tests/qa-margem.test.mjs` (janela, barra final, TTL até
  19:40 e o fluxo pelas rotas 18:45 → 18:59 → 19:01) e
  `tests/market-no-migration.integration.mjs` (relógio de 18:40 para 19:10).

`tests/b3-calendar.test.mjs` não codifica essas fronteiras e ficou igual.

**Mutação:** voltar cada constante ao valor antigo derruba testes:

| Constante antiga | Testes que falham |
|---|---|
| `closingMinute` 18:30 | 4 |
| `finalFromMinute` 18:30 | 2 |
| `settleMinutes` 45 | 4 |

Os arquivos foram restaurados idênticos, e as cópias temporárias apagadas.

**Verificações:**

- `npm test`: 257/257 (a lista da coordenação já inclui os arquivos novos);
- `node --test tests/qa-margem.test.mjs`: 23/23;
- `npm run lint`: ok;
- `node --check` nos dois arquivos de integração alterados: ok.

A integração em MySQL não rodou localmente nesta rodada, a pedido da
coordenação: a CI roda `test:integration` no MySQL 8.4.

**Efeito:** os fechamentos da Escola de D passam a ser gravados a partir das
19:00 (na prática, pelo monitor de 20 em 20 min, entre 19:00 e 19:20). O gráfico
só mostra a barra do dia lida a partir das 19:00.

## Fonte dos feriados

Consultados em 06/11/2026:

- B3, Calendário de negociação, Feriados (2024 a 2026):
  https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/calendario-de-negociacao/feriados/
- B3, Ofício Circular 041/2026-VNC, de 30/06/2026, errata do 003/2026-VNC. Só
  mudou um quadro de feriado norte-americano.
- ANBIMA, feriados nacionais de 2024, 2025, 2026 e 2027, para conferência
  cruzada.

Contagens independentes: 251, 250 e 247 pregões em 2024, 2025 e 2026. Nem a
brapi (PETR4 e ITUB4) nem a AGF têm barra em feriado conferido.

## Verificações

- `npm test`: 170/170. Durante o trabalho, `live-quotes` e `stock-history-ui`
  falharam por edições em andamento da interface em `src/lib`; na última
  execução passaram.
- Arquivos novos de unidade, com `tests/safety-margin.test.mjs`: 44/44
  (calendário 5, séries 15, rotas 9, consolidação 9, margem 6). Lista do
  `npm test` mais os cinco: 214/214. Os testes dos ajustes:
  - "espera quando devido": a leitura só responde depois de um insert lento e,
    na rota HTTP real, às 18:40, a resposta de `/api/rankings/public` só sai
    depois de gravar os fechamentos;
  - "não espera quando não devido": as leituras seguintes não fazem SQL;
  - prazo vencido com o insert travado: a leitura responde, o erro fica no log
    e a trava expira para nova tentativa;
  - série longa de 2018 a 2023 com feriados sem `gapBefore`;
  - buraco real de 5 dias úteis (e de 3) marcado; o de 2 dias, não;
  - virada para 2027.
- Mutação dos ajustes: com o gancho de novo sem espera, 4 testes falham,
  inclusive o da rota HTTP. O arquivo foi restaurado idêntico.
- `npm run lint`: ok. `node --test tests/harness.test.mjs`: 6/6.
  `node scripts/harness.mjs check`: quadro válido.
- Prettier: arquivos novos formatados. Nos existentes, só as linhas editadas
  (`server/stock-history.js` já não estava formatado no HEAD).
- MySQL 9.3 descartável, em `127.0.0.1:3307`:
  - iniciado com `--no-defaults`, com a pasta de dados e a senha gerada no
    scratchpad; desligado e apagado no fim, sem nenhum schema `ediv_test_*`
    sobrando. O serviço `MySQL93` não foi tocado;
  - `npm run test:integration`: 61/61 (integration 19, session 7,
    notifications 16, notifications.backup 3, dividend 7, provider-cache 9).
    Depois dos ajustes, rodei de novo às 19:22 de São Paulo, com a janela
    aberta: 61/61, e a consolidação aguardada gravou de verdade dentro das
    requisições das fixtures (2 eventos `market_closes`, nenhum erro);
  - `tests/market-closes.integration.mjs`: 6/6. Cobre colunas, chave, índice,
    CHECK, idempotência, trava atômica com 5 e com 12 pedidos simultâneos,
    tomada de trava vencida, `INSERT IGNORE`, pregão anterior e o fluxo
    completo;
  - mutação: as 3 versões com defeito de `server/market-closes.js` falharam no
    teste (tomada sem conferir a validade, REPLACE no lugar de INSERT IGNORE,
    pregão anterior incluindo D). O arquivo foi restaurado idêntico;
  - `npm run test:backup`: PASS, com um fechamento restaurado.
- brapi real: 2 GETs sem token (PETR4 e ITUB4, `range=max&includeRaw=true`),
  usados para os números das fixtures. Conferi a base da AGF (mediana 556,
  PASS3 117, trecho igual ao `rawClose` em 520/520 e 562/562 pontos).
- Não executados: MySQL 8.4 da CI, suítes de navegador e build (o `src/` é da
  interface e estava em edição).

## Riscos e pendências

- **O teto pode ser estimado na rota pública.** Com a margem de duas casas e a
  cotação pública, teto ≈ cotação ÷ (1 − margem/100), com erro de cerca de
  0,01%. O teto não é exposto, mas pode ser deduzido; a decisão é da
  coordenação.
- **2027 sem calendário.** A partir de 01/01/2027:
  - os feriados não viram lacuna no gráfico (regra conservadora), mas a sessão
    lê o feriado como pregão (mercado "aberto", recarga de 15 em 15 min);
  - a consolidação tenta gravar no feriado, e a regra de lista parada deve
    pular.
  Incluir 2027 quando a B3 publicar.
- **Anos sem calendário (antes de 2024 e 2027):** um buraco real de 1 ou 2 dias
  úteis não é marcado, e um mês sem até 2 dias úteis no fim conta como
  completo. A nota avisa.
- **A leitura que torna o pregão devido fica até 2,5 s mais lenta**, uma vez por
  pregão e instância (na prática, uma requisição por noite). Se o banco estiver
  lento, a gravação pode continuar depois da resposta. Se a função congelar, a
  trava expira em 1 min e outra leitura grava; o `INSERT IGNORE` mantém isso
  idempotente.
- **Migração 009 em produção:** a produção não aplica migrações ao iniciar; a
  coordenação aplica a 009 com o dono (`npm run db:migrate:aiven`). Antes
  disso, a série ignora os fechamentos da Escola e a consolidação só registra
  `market_closes_error`; nenhuma requisição falha.
- **Com token Free ou Startup**, não verifiquei se a brapi mantém `max` e
  `includeRaw` para os tickers de demonstração. Se não mantiver, a série deles
  vira `provider_error`.
- **Teto em notação exponencial** ("3.274e1"), aceito pela importação, dá margem
  `unavailable`, porque `safety-margin.mjs` recusa expoente.
- **Até a consolidação rodar em produção**, as séries nominais das 87 ações sem
  token terminam em 23/10/2026, e o marcador fica solto (`gap`).
- **Documentos da coordenação:** `docs/COTACOES.md` ("feriados não estão no
  calendário", objeto `quote` com `previousClose`/`dayHigh`/`dayLow` no nível de
  cima) e `docs/BACKUP.md`.

## Para o `package.json` (coordenação)

- `test`: acrescentar `tests/b3-calendar.test.mjs tests/price-series.test.mjs
  tests/ranking-market.test.mjs tests/daily-closes.test.mjs`, além do
  `tests/safety-margin.test.mjs` da coordenação.
- `test:integration`: terminar com `&& node tests/market-closes.integration.mjs`.

## Próximo passo

Coordenação:

- incluir os testes no `package.json`;
- decidir os desvios 1 a 9 e o risco do teto deduzível;
- atualizar `COTACOES.md` e `BACKUP.md`;
- aplicar a migração 009 com o dono;
- conferir na CI (MySQL 8.4).

Interface: `notes` são texto e `session` traz os dados do pregão.
