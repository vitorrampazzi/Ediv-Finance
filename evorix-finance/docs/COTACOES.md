# Cotações e históricos da brapi

Contrato entre o backend e a interface para as cotações do ranking, das páginas
de empresa e dos gráficos. Decisões do dono (05/11/2026):

- **Atualizado em 06/11/2026:** o corretor confirmou que a margem de segurança
  acompanha a cotação, enquanto o preço-teto só muda com uma nova análise. O
  "Preço de mercado" passa a ser a cotação da brapi, e a margem é recalculada
  com ela. Regras, fórmula, séries do gráfico e rotas estão em
  `docs/MARGEM-E-HISTORICO.md`. A ordem do ranking continua a da publicação.
- A fórmula é `(teto − preço) ÷ teto`, implementada em `safety-margin.mjs`.
- **Sem token por enquanto.** Tudo funciona sem `BRAPI_API_KEY` e melhora
  sozinho quando o token entrar na Vercel.

## Fornecedor e planos (consultado em 05/11/2026)

| Plano | Preço | Chamadas/mês | Atraso | Ações por chamada | Histórico |
|---|---|---|---|---|---|
| Sem token | R$ 0 | não informado | não informado | só PETR4, MGLU3, VALE3, ITUB4 na v2 | idem |
| Gratuito (token) | R$ 0 | 15.000 | 30 min | 1 | 3 meses, diário |
| Startup | R$ 99,99/mês (anual) | 150.000 | 15 min | 10 | 1 ano, diário |
| Pro | R$ 116,66/mês (anual) | 500.000 | 5 min | 20 | 10+ anos, intradiário |

- O uso comercial é declarado só nos planos pagos. No gratuito, a página não diz.
- A lista geral `GET /api/quote/list` responde sem token, com preço, variação %
  e volume das 2.000 ações mais negociadas, mas sem horário da cotação, máxima,
  mínima ou fechamento anterior.
- Endpoints v2: `GET /api/v2/stocks/quote?symbols=` e
  `GET /api/v2/stocks/historical?symbols=&range=&interval=`. Os erros 401, 403,
  404 e 429 seguem a documentação, e o 429 traz `Retry-After`. Sem token, a
  brapi indica `x-brapi-concurrency-limit: 1`.

## Variáveis de ambiente

- `BRAPI_API_KEY`: opcional. Fica só no servidor e vai só no header
  `Authorization: Bearer`. Nunca entra em URL, log ou resposta.
- `BRAPI_PLAN`: `free` (padrão), `startup` ou `pro`. Define o atraso declarado,
  as ações por chamada e o maior período de histórico.
- `BRAPI_DAILY_BUDGET`: teto diário de chamadas por ação (cotação detalhada e
  histórico). O padrão é 420: somado à lista geral, o plano gratuito fica perto
  de 13.900 chamadas num mês de 31 dias, abaixo das 15.000. Com `0`, o site para
  de fazer chamadas por ação. A lista geral não entra nesse teto.

## Sessão do mercado

- Aberto: das 10:00 às 18:00 em `America/Sao_Paulo`, já com o call de
  fechamento, só em dia de pregão. Fora disso, fechado.
- Os pregões vêm de `server/market/b3-calendar.js`, com os feriados de 2024 a
  2026 conferidos na página oficial da B3 em 06/11/2026.
- Para 2027, enquanto a B3 não publicar o calendário, valem as segundas a
  sextas, e as respostas avisam isso.
- A abertura às 13:00 da Quarta-feira de Cinzas não está no modelo.

## Cache (compartilhado em `provider_cache`, mais memória do processo)

| Dado | Mercado aberto | Mercado fechado |
|---|---|---|
| Lista geral (todas as ações) | 15 min | até a próxima abertura, no máximo 12 h |
| Cotação detalhada de uma ação | 15 min | até a próxima abertura, no máximo 12 h |
| Histórico diário | 60 min | até a próxima abertura, no máximo 12 h |

- Pedidos iguais ao mesmo tempo esperam a mesma chamada à brapi.
- Depois de um 429, ninguém chama a brapi até passar o `Retry-After`. Nesse
  tempo, o site serve a última cotação válida, marcada como defasada.
- Falha de rede ou 5xx: uma nova tentativa com espera crescente. Erros 4xx não
  são repetidos.
- Chamadas por ação vão uma de cada vez (concorrência 1).
- Cada chamada à brapi soma no contador diário `brapi:usage:AAAA-MM-DD` e gera
  um log `brapi_call` com endpoint, status e duração. O log não leva token nem
  query string.

## API do site

Todas as rotas validam o ticker com `^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$`, a mesma regra de `company-logo.mjs`, que aceita B3SA3 (até 100 tickers
por pedido na lista) e respondem `Cache-Control: no-store`. Nenhuma rota repassa
URL, parâmetro ou endpoint livre à brapi.

### Objeto `quote`

```json
{
  "symbol": "TIMS3", "name": "TIM S.A.", "logoUrl": "…", "currency": "BRL",
  "price": "19.62000000", "change": null, "changePercent": "-0.9100",
  "previousClose": null, "dayHigh": null, "dayLow": null, "volume": "367700",
  "quoteTime": null, "marketTime": null,
  "checkedAt": "2026-11-05T13:48:14.389Z",
  "freshness": "delayed", "stale": false, "unavailable": false,
  "detail": "summary", "delayMinutes": null, "source": "brapi.dev"
}
```

- Valores numéricos vêm como texto decimal ou `null`. `null` nunca vira zero.
- **Desde 06/11/2026, o preço é sempre o da lista geral** (cotação canônica,
  ver `docs/MARGEM-E-HISTORICO.md`). No nível de cima, `quoteTime`,
  `marketTime`, `previousClose`, `dayHigh` e `dayLow` ficam `null`.
- Os dados da v2 vão só em `session`: `{ open, dayHigh, dayLow, previousClose,
  quoteTime, checkedAt }`, com o horário próprio dessa consulta.
- `checkedAt`: quando o servidor consultou a brapi. Não é o horário da cotação.
- `freshness`:
  - `delayed`: dado do ciclo atual do cache.
  - `stale`: a brapi falhou e é a última cotação válida.
  - `unavailable`: não há cotação, e `price` é `null`.
- `detail`:
  - `summary`: só a lista geral.
  - `full`: há `session` da v2.
- `delayMinutes`: atraso declarado pelo plano (30 no gratuito). Fica `null` sem
  token, porque a brapi não declara o atraso.

### Objeto `market`

`{ "state": "open" | "closed", "refreshSeconds": 900, "nextRefreshAt": "ISO" }`

O `refreshSeconds` diz à interface quando perguntar de novo: 900 com o mercado
aberto e 1.800 com ele fechado.

### Rotas

- `GET /api/market/quotes?symbols=A,B,…` (1 a 100): devolve
  `{ quotes: quote[], market }`. Sempre usa a lista geral: uma chamada à brapi
  atende todas as ações e todos os visitantes durante o TTL.
- `GET /api/market/quote/:ticker`: devolve `{ quote, market }`.
  - O preço vem da lista geral.
  - A v2 preenche `session` se houver token ou se o ticker for de
    demonstração.
  - Sem token, ou com o orçamento diário esgotado, `session` fica `null`.
- `GET /api/market/history/:ticker?range=1mo|3mo|1y`: devolve
  `{ symbol, available, reason, interval: "1d", range, points, checkedAt, source }`.
  - Só atende tickers do histórico empacotado ou de demonstração.
  - Os pontos têm o formato `{ date: "AAAA-MM-DD", close, adjustedClose, volume }`,
    com a data no fuso de São Paulo e valores em texto ou `null`.
  - `reason` vale `no_token`, `not_covered`, `budget`, `provider_error` ou
    `range_not_in_plan`.
- `GET /api/market/assets`: sem mudança.

## Interface

- Ranking logado: embaixo do "Preço de mercado", uma linha pequena "agora
  R$ X · ±Y%", com a cor sutil de alta ou baixa. A fonte e o horário ficam no
  `title` e no texto para leitor de tela. Busca, filtros, ordenação e colunas
  continuam iguais.
- Páginas de empresa (logada e pública): um bloco "Cotação atual" com preço,
  variação em R$ e %, fechamento anterior, máxima e mínima, volume, fonte e
  horário. Cada campo só aparece quando existe, e o bloco avisa quando o dado
  está atrasado, defasado ou indisponível. O preço da planilha continua sendo
  o "preço da pesquisa".
- Atualização: a interface consulta de novo a cada `refreshSeconds`, pausa com
  a aba escondida e troca só os números, sem tela de carregamento. Se uma
  consulta falhar, os números anteriores continuam na tela, marcados como
  defasados.
- Nunca escrever "tempo real". O texto é sempre "com atraso" ou "consultado às
  HH:MM" (horário de Brasília).
- Gráfico de cotação: substituído em 06/11/2026. As bases ajustada e sem
  ajuste, o diário, o mensal e a cotação mais recente estão em
  `docs/MARGEM-E-HISTORICO.md`. A junção antiga com o histórico da AGF saiu,
  porque a parte antiga desse histórico mistura bases. Os gráficos de proventos
  e resultados não usam cotação.

## Cobertura e pendências (QA de 05/11/2026)

- Das 90 empresas do histórico empacotado, 89 estão na lista geral da brapi.
  Falta **EMAE4**: a busca por "EMAE" não volta nada, então o ticker pode ter
  mudado ou saído da bolsa. A empresa aparece como "cotação atual indisponível".
- A lista geral e a v2 diferiram no máximo 0,19% (PETR4, VALE3, ITUB4, MGLU3).
- Pendências que só valem com token:
  - uma pessoa sozinha consegue gastar o teto diário. Se isso acontecer, o site
    volta para a lista geral até o dia seguinte;
  - EMAE4 ainda gasta chamadas por ação;
  - o Startup aceita 10 ações por chamada, e isso ainda não é usado.
