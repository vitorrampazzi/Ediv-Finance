# Margem de segurança dinâmica, cotação e histórico de preços

Contrato entre backend, interface e QA, de 06/11/2026. Junta a orientação do
corretor (áudios de 05/11) e o pedido do dono. Complementa `docs/COTACOES.md`,
que continua valendo para provedor, cache, teto diário e erros.

## Regras de negócio

1. **Cotação de mercado (canônica).** Vem da lista geral da brapi
   (`/api/quote/list`): uma consulta por ciclo de cache cobre todas as ações.
   - O mesmo preço vale no ranking, nas páginas de empresa (logada e pública),
     na margem e no marcador do gráfico.
   - A cotação v2 nunca substitui esse preço. Ela só acrescenta os dados do
     pregão: abertura, máxima, mínima, fechamento anterior e horário.
2. **Preço-teto.** É o `dividendAnalysis.ceilingPrice` da última publicação
   aprovada.
   - Uma cotação nova nunca muda o teto.
   - Ele só muda quando a equipe publica uma nova análise, perto dos resultados
     trimestrais.
3. **Margem de segurança.** `(preço-teto − cotação) ÷ preço-teto × 100`.
   - Fonte única: `safety-margin.mjs` (raiz), usada pelo servidor e pela
     interface. Nenhum componente faz a conta por conta própria.
   - A conta é exata (BigInt), arredonda para longe do zero e mostra duas
     casas: "20,00%".
   - Não há piso em zero: −20% quer dizer que a cotação está acima do teto.
   - Teto ausente ou ≤ 0, ou cotação ausente, inválida ou ≤ 0, resulta em
     `null`. Zero nunca substitui uma cotação.
4. **Quando não há cotação nova.**
   - Se a brapi falhou, a margem usa a última cotação válida e aparece como
     "defasada".
   - Se não há nenhuma cotação válida, mostram-se o preço e a margem da
     pesquisa, marcados "da pesquisa (DD/MM)".
5. **O que continua da pesquisa.** DY e P/L ficam como na pesquisa, rotulados
   "na data da pesquisa", porque o corretor não aprovou recalcular esses dois.
   - O preço e a margem da publicação continuam visíveis na página da empresa,
     como referência.
   - A ordem padrão do ranking continua a da publicação. Ordenar por margem usa
     a margem exibida.

## Bases de preço (verificado em 06/11/2026)

- **brapi:**
  - `adjustedClose` é ajustado por proventos e por eventos (desdobramento,
    grupamento, bonificação), pela metodologia da brapi;
  - `rawClose` é o preço negociado e vem com `includeRaw=true` (plano Pro ou
    ticker de demonstração);
  - `close` é ajustado só por eventos de ações. Na ITUB4 de 2025-03-17, por
    exemplo: nominal 35,34, `close` 31,19, ajustado 28,46. **Por isso o
    `close` nunca é usado como preço "sem ajuste".**
- **AGF (snapshot de 23/10):** a base não é uniforme.
  - O trecho final contínuo, de valores com até 2 casas decimais, é o preço
    negociado. Coincide com o `rawClose` em todos os pontos de PETR4 (desde
    22/08/2024), VALE3 (desde 05/08/2024) e ITUB4 (desde 21/06/2024).
  - O trecho anterior, com valores de muitas casas, foi ajustado por um método
    não documentado. Na PETR4, em 02/01/2012: AGF 6,54, nominal 21,73,
    ajustado pela brapi 4,58. **Esse trecho não é usado em nenhuma base.**
  - O trecho nominal tem mediana de 556 pregões por empresa. O menor é o da
    PASS3, com 117 pregões.
- **Sem token, a brapi atende só PETR4, VALE3, ITUB4 e MGLU3.** Para essas
  ações vêm histórico completo, `includeRaw` e proventos. Das 90 empresas,
  PETR4, VALE3 e ITUB4 estão no snapshot.

## Séries do gráfico

| Base | Fontes, em ordem de prioridade na mesma data |
|---|---|
| Ajustada (padrão quando existe) | brapi `adjustedClose`. Sem essa fonte, a base fica indisponível. |
| Sem ajuste (nominal) | brapi `rawClose` → fechamentos consolidados pela Escola → trecho nominal da AGF |

- Se duas fontes nominais diferirem mais de 0,5% na mesma data, vale a de maior
  prioridade, e o servidor registra um log `price_source_conflict`.
- Os ajustes são os do fornecedor. Não há subtração manual de proventos, e
  nenhum ajuste é aplicado duas vezes.
- **Diário:**
  - um ponto por pregão (data de São Paulo), só fechamentos consolidados;
  - a barra do pregão em andamento fica de fora até as 19:00 do dia;
  - um ponto que vem depois de um ou mais pregões da B3 sem dado traz
    `gapBefore: true`, e o traço é interrompido ali.
- **Mensal:**
  - um ponto por mês: o fechamento do último pregão do mês que está na série,
    com `date` igual à data do pregão usado e `month` no formato `AAAA-MM`;
  - `status` é `consolidated` quando o mês acabou e a série tem o último
    pregão dele, e `incomplete` quando o mês acabou sem esse pregão (a tela
    mostra "dados até DD/MM");
  - o mês corrente não entra na série. Ele aparece pelo `latestQuote`.
- **`latestQuote`:**
  - é a cotação canônica, sempre nominal, mostrada como marcador próprio:
    "Cotação mais recente, preço nominal de mercado, consultada às HH:MM";
  - `connect: true` só quando o último ponto consolidado é o pregão anterior,
    sem lacuna;
  - na base ajustada, também é preciso que o último ponto tenha fator 1
    (`adjustedClose` igual ao nominal daquela data);
  - nos outros casos, `connect: false` com `reason` `gap` ou `base_mismatch`,
    e o marcador fica solto, sem linha.

## Fechamentos consolidados pela Escola

- **Tabela:** `market_daily_closes(ticker, trade_date, close DECIMAL(20,8),
  volume, source, captured_at)`, com chave `(ticker, trade_date)`, criada na
  migração 009.
- **Quando grava:**
  - uma vez por pregão D, ao ler uma lista geral consultada a partir das 19:00
    de D (horário de Brasília) e antes da próxima abertura;
  - o leilão de fechamento chega à brapi por volta das 18:30. Por isso a lista
    é consultada de novo a cada 15 min até as 19:40, e sempre há uma lista
    posterior às 19:00;
  - a leitura que deixa D pendente espera a gravação por no máximo 2,5 s;
  - só em dia de pregão pelo calendário da B3.
- **O que grava:** as empresas do snapshot e as da publicação mais recente.
  - A trava `closes:D` no `provider_cache` impede gravar duas vezes.
  - Se a lista não mudou desde o pregão anterior (mesmo preço e volume em ≥ 80%
    das ações), não grava e tenta de novo depois.
  - O monitor do GitHub chama `/api/rankings/public` a cada 20 minutos, e essa
    rota lê a lista geral, então o gatilho existe toda noite.
- **Escrita:** `INSERT IGNORE`; um fechamento já gravado não é sobrescrito.

## Calendário da B3

- `server/market/b3-calendar.js` traz os feriados de 2024 a 2026, conferidos
  na página oficial da B3 em 06/11/2026, com o endereço no código.
- A B3 ainda não publicou o calendário de 2027.
- Nos anos sem calendário conferido, só um buraco de 3 ou mais dias úteis
  seguidos quebra o traço. Assim um feriado comum nunca vira lacuna.
- A sessão do mercado, o TTL, a lacuna do gráfico, o último pregão do mês e a
  consolidação usam esse calendário.
- Sem cobertura para um ano, vale "dia útil = segunda a sexta", e a resposta
  avisa isso.

## API

Objeto `quote`: igual ao de `docs/COTACOES.md`, mais o campo `session`:

```json
"session": { "open": "47.90000000", "dayHigh": "48.04000000", "dayLow": "46.38000000",
  "previousClose": "47.12000000", "quoteTime": "2026-11-05T17:48:30.000Z",
  "checkedAt": "2026-11-05T17:49:44.908Z" }
```

- `session` é `null` sem a v2.
- `price`, `changePercent`, `volume`, `checkedAt` e `freshness` vêm sempre da
  lista geral. O `quoteTime` do nível de cima fica `null`.
- `change` (R$) = `price − session.previousClose`, só quando
  `session.quoteTime` é do pregão atual. Nos outros casos, `null`.
- `detail` vale `full` quando há `session`.

Objeto `safetyMargin`:

```json
{ "percent": "40.84", "basis": "market", "price": "19.37000000", "checkedAt": "ISO" }
```

- `basis` vale:
  - `market`: cotação do ciclo atual;
  - `stale`: última válida;
  - `research`: preço e margem da pesquisa;
  - `unavailable`: sem teto válido, e `percent` fica `null`.

Rotas:

- `GET /api/rankings/market`: mesma autenticação do ranking completo. Devolve:
  ```
  { publication: { id, publishedAt } | null, market, checkedAt,
    entries: [{ ticker, quote, ceilingPrice, researchPrice,
                researchSafetyMargin, safetyMargin }] }
  ```
  - `researchSafetyMargin` vem de `researchMarginPercent()`.
  - O ranking e a página logada da empresa usam só esta rota para preço e
    margem.
- `GET /api/rankings/public`:
  - cada uma das 3 entradas ganha `market: { quote, safetyMargin }`, e a
    resposta ganha `market` no nível de cima;
  - o teto não é exposto;
  - `dividendAnalysis` continua igual;
  - cache `s-maxage=60`.
- `GET /api/market/quote/:ticker`: preço canônico e `session`.
- `GET /api/rankings/price-series/:ticker?basis=adjusted|nominal&granularity=daily|monthly`:
  - mesma autenticação de `/api/rankings/history`. Devolve:
    ```
    { ticker, basis, granularity, availableBases, defaultBasis,
      points: [{ date, month?, close, status, source, gapBefore? }],
      latestQuote: { price, checkedAt, freshness, connect, reason } | null,
      coverage: { from, to, segments: [{ from, to, source }], notes },
      unavailableReason, checkedAt }
    ```
  - `source` vale `brapi`, `escola` ou `agf`;
  - `unavailableReason` vale `no_token`, `not_covered`, `budget`,
    `provider_error` ou `null`;
  - histórico da brapi: o maior período do plano. Para ticker de
    demonstração, `max` com `includeRaw`;
  - cache: 60 min com o mercado aberto, até a próxima abertura com ele
    fechado, e respeitando o teto diário.

## Interface

- **Ranking:**
  - "Preço de mercado" mostra a cotação canônica, com a variação % em cor sutil
    logo abaixo;
  - "Margem de segurança" mostra a margem dinâmica com duas casas, e o
    `title` traz a fórmula com os valores;
  - "defasada" e "da pesquisa (DD/MM)" aparecem quando for o caso;
  - a nota da tabela explica a fórmula, a fonte e o horário, e de qual
    publicação veio o teto;
  - sai a linha "agora" do PR #44.
- **Página da empresa:**
  - mostra a cotação canônica, os dados do pregão, o preço-teto (da pesquisa
    de DD/MM) e a margem dinâmica;
  - o preço e a margem da publicação aparecem como referência.
- **Gráfico (retirado da página da empresa em 10/11/2026,** a pedido do
  corretor; ver `docs/HOME-E-GRAFICOS-2026-11-10.md`. A rota
  `/api/rankings/price-series` continua no servidor, sem uso na interface. O
  texto abaixo descreve como ele era):
  - alternância Diário/Mensal e Ajustado/Sem ajuste, esta só com as bases
    disponíveis, e o nome da base sempre visível;
  - marcador da cotação mais recente;
  - linha tracejada até o marcador só com `connect: true`;
  - pontos `incomplete` destacados;
  - traço interrompido em `gapBefore`;
  - tooltip com a data (São Paulo), o valor, a base, o status e a fonte;
  - estado informativo quando a base não existe;
  - os gráficos de proventos e resultados não mudam.
- **Páginas públicas e prévias:** preço e margem vêm da mesma resposta de
  `/api/rankings/public`.
- **Atualização:**
  - uma loja única no cliente, compartilhada pelo ranking e pela página;
  - nova consulta a cada `refreshSeconds`, com pausa quando a aba está oculta;
  - nunca uma tela de carregamento depois da primeira;
  - nenhum valor inventado entre duas consultas.
- Nunca "tempo real".
