# QA — cotações e históricos da brapi — 05/11/2026

Papel: `qa`. Validação independente da integração descrita em `docs/COTACOES.md`
e nos relatos `backend-cotacoes-2026-11-05.md` e `interface-cotacoes-2026-11-05.md`.
Os três documentos que mudaram só no fim de linha (CENTRAL-FUNDAMENTALISTA,
FIGMA-MAKE-INTEGRACAO e RANKING-PUBLICO) ficaram fora: `git diff
--ignore-cr-at-eol` não mostra diferença neles.

## Veredito

**Apto com ressalvas.** Nenhum defeito bloqueante. Não houve correção de código
de produto, porque não achei bug pequeno e claro. As ressalvas são riscos de cota
e de texto, listados em "Pendências", e não impedem a publicação sem token.

## Ambiente e limites

- Windows 11 e Node v24.20.0. O projeto pede a versão 22.x, que é a da CI.
- Banco: a máquina tem o serviço `MySQL93` do usuário, que **não foi usado**. Para
  rodar o SQL de verdade, subi um `mysqld` 9.3 descartável, com o binário já
  instalado, em `127.0.0.1:3307`. A pasta de dados ficou no scratchpad, e a senha
  de root foi gerada só para esse servidor. Ao final, ele foi desligado e a pasta
  apagada, sem nenhum schema `ediv_test_*` sobrando. O serviço `MySQL93` continua
  como estava. A CI usa MySQL 8.4; aqui foi 9.3.
- Nenhum `.env*`, produção ou Aiven foi usado. Fiz 8 GETs só de leitura na brapi
  pública, sem token e em sequência.
- Navegador: Playwright 1.62.1 com Chromium. `/api/**` simulado pelas fixtures. O
  único acesso real à brapi foi o histórico de PETR4, salvo antes em arquivo.

## 1. Revisão de código

Arquivos: `server/market/*`, `server/market.js`, `server/provider-cache.js`,
`src/lib/liveQuotes.ts`, `src/hooks/useLiveQuotes.ts`, `src/hooks/useLiveHistory.ts`,
`src/components/LiveQuote.tsx`/`live-quote.css` e as mudanças do ranking,
StockMake, PublicStock, Charts e HistoryCharts.

| Item | Resultado | Evidência |
|---|---|---|
| Ticker trocado com preço | OK | Servidor: `resultFor` casa por `symbol`/`requestedSymbol` (`brapi-provider.js`), e a lista vira um `Map` por símbolo (`quote-service.js` `catalogItem`). Na rota `/quotes`, a ordem pedida é remontada por símbolo (`market.js`). No cliente, `loadQuotes` indexa por símbolo e descarta o que não foi pedido, e `loadQuote` exige `quote.symbol === key`. Com a brapi real, os 4 tickers têm preço da v2 dentro da máxima/mínima do dia e a menos de 0,2% da lista. |
| `null` mostrado como 0 | OK | `priceText` recusa 0 ou valor inválido. `decimal()` no cliente devolve `null`, e `quoteFields` omite o campo. Na tela, EMAE4 sem cotação mostra "cotação atual indisponível". Uma variação 0 real aparece como "0,00%" (B3SA3 na fixture). |
| "tempo real" | OK | `grep -i "tempo real"` em `src/` só acha um comentário de código e o filtro do assistente. Nada no `dist/`. As 16 telas do teste responsivo também não têm o texto. |
| Horário da consulta como horário da cotação | OK | Sem `quoteTime`, o texto diz "consultada às HH:MM" (`checkedAt`). Com a v2, diz "cotação de HH:MM" (`regularMarketTime`). A lista geral não traz horário, e o `quoteTime` dela fica `null`. |
| Pontos duplicados ou inventados no gráfico | OK | No servidor, um ponto por dia de São Paulo, em ordem crescente. No cliente, `mergeLiveHistory` só acrescenta datas posteriores ao pacote, confere as 5 datas comuns mais recentes (≤ 0,5%) e descarta o pregão aberto. Com a brapi real (PETR4 3mo): 62 pontos, crescentes, sem repetição e sem fim de semana. As 5 últimas datas comuns batem 0,000% com o pacote, e um deslocamento de 1 dia daria diferenças de −2,8% a +1,5%. Os carimbos chegam às 03:00Z, que é 00:00 em Brasília, e a data é convertida corretamente. |
| Token em URL, log ou cliente | OK | Item 4. |
| Proxy aberto | OK | As URLs são montadas com origem fixa, caminho fixo, ticker validado duas vezes, período enumerado, `URLSearchParams` e `redirect: "error"`. `/quotes` aceita símbolos mais largos (favoritos), mas só os procura na lista e nunca os coloca em URL. |
| Abuso de cota | Ressalva | Sem token, só as 4 ações de demonstração usam a v2, com teto diário. Com token, qualquer ticker conhecido gasta o orçamento (pendência P1), e EMAE4 gasta chamadas inúteis (P2). |
| Rajada de consultas | OK | Medido: 1 pedido por publicação no ranking. Na página da empresa, 1 cotação a cada 15 min e 1 histórico por hora. A consulta pausa com a aba oculta (suíte `dividend`, item "Cotações: pausa com aba oculta"). Depois de falha, nova tentativa em 2 min ou no `Retry-After`. O intervalo fica entre 60 s e 1 h. |
| Salto de layout | OK com nota | Ranking: todas as linhas com 66 px em 320 e em 1280, nos dois temas. Página pública: a contribuição do bloco ao CLS é 0,0038 em 1280 px e 0 em 320 px. O CLS total da página (0,20 e 0,33) vem do rodapé que se desloca na carga, antes do bloco existir; isso é preexistente e foi medido com o Vite em desenvolvimento. Detalhes no item 5c. |

Observações sem defeito:
- `brapiPlans.*.symbolsPerRequest` não é usado: com o plano Startup não há lote de
  10 ações por chamada (P5).
- Com Vite em desenvolvimento, o `StrictMode` duplica o primeiro pedido de cada
  hook (o primeiro é abortado). No build de produção isso não acontece.

## 2. Teste de integração MySQL (novo)

Arquivo `tests/provider-cache.integration.mjs`, incluído no fim de
`npm run test:integration`. Usa `createFixture()`, que recusa rodar sem
`EDIV_TEST_MYSQL_DISPOSABLE=true` ou fora do loopback, cria um schema
`ediv_test_*` e o apaga no fim. Também força `TZ=America/Sao_Paulo` para pegar
datas lidas como hora local, já que a CI roda em UTC. Subtestes:

1. A primeira reserva cria a linha diária `{perTicker:1, catalog:0}`, que expira
   em cerca de 40 dias, e as chamadas seguintes só a atualizam.
2. `perTicker` com orçamento 5: `[t,t,t,t,t,f,f]`, e o contador para em 5. Se o
   orçamento sobe para 6, o mesmo dia continua.
3. Orçamento 0 recusa a chamada, mas cria a linha.
4. A lista geral nunca é bloqueada: 8 reservas depois do orçamento esgotado, e
   também com orçamento 0. Um tipo desconhecido gera erro.
5. 20 reservas em paralelo com orçamento 5, numa linha já existente: exatamente 5.
6. Primeira chamada do dia em paralelo: 20 por ação e 6 da lista disputando a
   criação da linha. Nenhum erro SQL ou deadlock, exatamente 5 por ação e 6 da lista.
7. `readCache`: chave ausente dá `null`; com TTL de 60 s, `fresh` e `expiresAt`
   batem com ±5 s; o TTL de 12 h sobrevive ao `INTERVAL ? MICROSECOND`; a
   sobrescrita fica numa linha só; uma linha vencida volta com `fresh:false` e o
   `expiresAt` certo.
8. Duas instâncias do `quote-service` compartilham o cache e o orçamento pelo
   MySQL. A segunda não chama o provedor, e a terceira cotação detalhada volta à
   lista quando o orçamento de 2 acaba.

Resultados no MySQL 9.3 descartável: 9/9, repetido 6 vezes sem falha.
**Teste de mutação:** troquei `provider-cache.js` por 9 versões com defeito, em
cópias no scratchpad, e o teste falhou em todas. As versões: sem a condição de
orçamento, `<=` no lugar de `<`, ler e depois gravar (corrida), lista bloqueada,
data lida como hora local, `fresh` invertido, sem `expiresAt`, TTL em ms em vez
de µs e caminho JSON errado. A CI vai rodar o teste no MySQL 8.4.

## 3. Fumaça real da brapi, sem token (8 chamadas, em sequência)

Ordem das chamadas: lista, v2 de PETR4/VALE3/ITUB4/MGLU3, histórico de PETR4 3mo,
uma busca `search=EMAE` na lista e um segundo histórico de PETR4 para o gráfico.
Todas responderam 200, com `x-brapi-concurrency-limit: 1`. O `cache-control` é
`s-maxage=900` na lista e `300` na v2. O log `brapi_call` ficou só com o endpoint
sem query e `authenticated:false`.

| Ticker | Lista | v2 | Diferença | Horário v2 (Brasília) |
|---|---|---|---|---|
| PETR4 | 47,42 (+0,64%) | 47,36 (+0,51%) | −0,13% | 11:54:30 |
| VALE3 | 62,81 (+0,74%) | 62,86 (+0,82%) | +0,08% | 11:54:30 |
| ITUB4 | 39,68 (−0,08%) | 39,68 (−0,08%) | 0,00% | 11:55:30 |
| MGLU3 | 5,41 (−1,64%) | 5,42 (−1,45%) | +0,19% | 11:54:30 |

Consulta às 11:56. Sem token, a v2 veio com cerca de 2 min de atraso. A lista não
traz horário. Na v2, o preço está dentro de máxima e mínima, e o símbolo bate.

**Cobertura:** dos 90 tickers do pacote (`server/stock-history.js`), 89 estão na
lista de 2.000 ações. **Falta só EMAE4**, que também não aparece na busca
`search=EMAE` (`totalCount: 0`) e é candidata a renomeada ou deslistada. A ação
menos negociada do pacote que está na lista é CEBR5, na posição 1.292. As três da
página pública estão na lista: TIMS3 (R$ 19,69, −0,56%, posição 65), ALOS3
(R$ 25,10, +0,97%, posição 44) e BBSE3 (R$ 37,89, +0,37%, posição 67).

Histórico de PETR4: depois do pacote, que vai até 23/10, vieram as datas 26/10 a
30/10, 03/11, 04/11 e 05/11. O dia 02/11, feriado, não aparece. O ponto de 05/11
é do pregão aberto, e o cliente o descarta até 18:30.

## 4. Exposição do token

- `npm run build` e depois `grep` em `dist/`: `BRAPI` 0 ocorrências, `Bearer` 0,
  `brapi.dev/api` 0, strings com cara de chave 0. A única URL brapi é
  `https://icons.brapi.dev` (módulo de logos). O `connect-src` da CSP não inclui
  a brapi, então o navegador não conseguiria chamar a API.
- Servidor: o token só existe em `config.brapiApiKey`, de onde vai para
  `createBrapiProvider` e para o header `Authorization`. Os logs `brapi_call` e
  `market_cache_error` levam só endpoint, código e status. O tratador de erros
  registra só códigos, e o log de requisições registra método, status e id.
- Verificação independente (`token-leak.mjs` no scratchpad), com token falso e
  `fetch` simulado. Testei lista, cotação, falha 500 com o token no corpo e
  histórico. O token não aparece em resposta, log, gravação no cache nem URL. Todas
  as chamadas usaram `Bearer` no header, `redirect:"error"` e origem
  `https://brapi.dev`. Tickers como `../../x`, `PETR4&token=1` e o período `max`
  são recusados antes de virar URL.

## 5. Gates

| Gate | Resultado |
|---|---|
| `npm test` | 171/171 |
| `npm run lint` | ok (exit 0) |
| `npx tsc -b` | ok (exit 0) |
| `npm run build` | ok, HTML de 8 rotas |
| `node scripts/harness.mjs check` + `tests/harness.test.mjs` | ok; 6/6 |
| `test:integration` (MySQL 9.3 descartável, local) | 61/61: integration 19, session 7, notifications 16, backup 3, dividend 7, provider-cache 9 |
| `node tests/run-browser.mjs` com o MySQL descartável | exit 0, 121 aprovados: seo.dist 6, public-home 10, stock-theme 6, public-rankings 11, dividend 12, notifications.browser 17, browser 32, browser-experience 19, session.browser 7, notifications.e2e 1 |
| `figma-stock.browser.mjs` | Não executado. É um runner manual fora da CI e precisa de prévia completa do produto (API logada e publicação real). Com o Vite sozinho, `/api/rankings` não responde e o primeiro `expect` falha por ambiente. Os pontos dele que importam aqui estão nos itens 5b e 5c |

Nenhuma falha preexistente apareceu nesta rodada. A `public-home`, que na rodada de
02/11 oscilava em `desktop-baixo`, passou 10/10.

### 5b. Responsivo (320 e 1280 px, temas claro e escuro, 16 telas)

Script `responsive.mjs` no scratchpad, com `/api` simulado. Os fechamentos de PETR4
são da brapi real.
- Ranking: linhas "agora R$ 19,69 · −0,56%" com cor sutil, "0,00%" sem cor e
  "cotação atual indisponível" (EMAE4). O preço da pesquisa fica intacto, a altura
  das linhas é igual (66 px) e não há rolagem horizontal na página. O `title` diz
  "Cotação brapi.dev com atraso, consultada às 10:48 (horário de Brasília)."
- Bloco logado de TIMS3, com dados completos: preço, variação em R$ e %,
  fechamento anterior, máxima, mínima, volume, "com atraso de até 30 min · cotação
  de 10:30" e "Preço da pesquisa: R$ 19,37". Mede 280×309 em 320 px e 960×200 em
  1280 px, sem rolagem horizontal.
- Gráfico de PETR4: `extended`, "Histórico até 23/10/2026 + fechamentos diários da
  brapi.dev até 04/11.", sem rolagem horizontal e legível nos dois temas.
- Bloco público de TIMS3: legível nos dois temas, sem rolagem horizontal.

### 5c. Salto de layout da página pública (atribuído por `layout-shift`)

| Largura | CLS total | Do bloco | Origem do resto |
|---|---|---|---|
| 1280 | 0,2003 | 0,0038 (a seção seguinte desce 52 px) | rodapé `y529→709→0` na carga da página |
| 320 | 0,3262 | 0 (o bloco fica abaixo da dobra; cresce 180 px) | rodapé `y517→697→0` na carga da página |

O deslocamento do rodapé acontece antes de o bloco aparecer, com ou sem atraso na
resposta da cotação. É preexistente, e foi medido no Vite de desenvolvimento.

## 6. Estimativa de consumo da brapi

Calculada por simulação com o `cacheTtlMs` real (`consumption.mjs`). Por chave,
com tráfego contínuo, são 37 chamadas por dia útil na lista e na cotação e 11 no
histórico. No fim de semana, são 2 por dia em cada um. Mês com 22 pregões e 8 dias
sem pregão. "90 páginas/dia" significa que cada empresa é aberta uma vez por dia,
com cache vencido (1 cotação e 1 histórico).

| Cenário | 90 páginas/dia | Contínuo | Teto do código | Comparado a 15.000/mês |
|---|---|---|---|---|
| Hoje, sem token (lista + v2 só PETR4/VALE3/ITUB4) | 962 | 4.094 (5.182 com MGLU3) | 450/dia por ação | 6% a 35%. A brapi não publica cota sem token |
| Token gratuito (v2 + histórico 3mo das 90) | 4.790 | 98.750 sem teto; com 450/dia, 13.610 | 14.808 (31 dias × 450 + lista) | 32%; teto 91% a 98,7% |
| Startup (150.000/mês) | 4.790 | 13.610 com 450/dia; 98.750 com orçamento ≥ 4.320/dia | depende do `BRAPI_DAILY_BUDGET` | 3,2%; teto 9% a 10%; 66% se liberado |

A lista geral tem cerca de 830 chamadas por mês e fica fora do teto.

## Pendências e riscos (não corrigidos)

- **P1 (média, só com token):** qualquer ticker conhecido gasta o orçamento
  diário. Com o limite de 30/min por IP, uma pessoa esgota as 450 chamadas em
  cerca de 15 min, e todos voltam à lista geral até o dia seguinte. O efeito é
  degradação, sem custo extra. O backend já tinha registrado.
- **P2 (baixa, só com token):** EMAE4 está no pacote e não está na brapi.
  `isCovered` faz `quote()` e `history()` chamarem a v2 mesmo assim. Com tráfego
  contínuo, são até 37 + 11 chamadas perdidas por dia, e o gráfico diz "Não foi
  possível consultar… agora" em vez de "não cobre". Sugestão: com a lista
  carregada, exigir que o ticker esteja nela.
- **P3 (baixa, só com token):** na janela de ajuste (18:00 a 18:45) o histórico
  fica com TTL de 60 min. Entre 18:30 e cerca de 19:00, o gráfico pode mostrar o
  fechamento do dia antes de ele ser final, por causa do atraso de 30 min do plano
  gratuito.
- **P4 (baixa):** o teto do plano gratuito fica justo: 14.808 de 15.000 num mês de
  31 dias, com a lista fora do orçamento. Se duas instâncias pedirem a lista ao
  mesmo tempo, o total pode passar de 15.000. Sugestão: `BRAPI_DAILY_BUDGET=420`
  ou contar a lista no teto.
- **P5 (info):** não há lote por chamada no plano Startup (`symbolsPerRequest` sem
  uso).
- **P6 (texto, coordenação):** `public/llms.txt` ainda diz "As cotações são
  referências da planilha, sem atualização ao vivo". Continua certo para a
  pesquisa, mas não menciona a cotação da brapi com atraso nas páginas de
  empresa. O prefixo "agora" também aparece com o mercado fechado, quando é o
  último preço; é decisão de produto.
- **P7 (info):** os feriados da B3 são tratados como pregão (está documentado).
- Não executados: `figma-stock` (ambiente) e o MySQL 8.4 da CI (rodei no 9.3).

## Arquivos alterados pelo QA

- `tests/provider-cache.integration.mjs` (novo).
- `package.json`: `test:integration` termina com `node tests/provider-cache.integration.mjs`.
- Este relato.

Scripts e evidências ficaram no scratchpad: `brapi-smoke.mjs`/`.json`,
`token-leak.mjs`, `mutate.mjs`, `responsive.mjs` e as capturas em `responsive/`,
`cls.mjs` e `consumption.mjs`.

## Próximo passo

Coordenação: decidir P1, P2 e P4 antes de configurar o token e corrigir o texto de
P6. Na CI, confirmar `provider-cache.integration.mjs` no MySQL 8.4. Quando o token
entrar, conferir em homologação o caso `full`, o gráfico estendido e o contador
`brapi:usage:AAAA-MM-DD`.
