# Home com três cards, gráficos de proventos e lucro, ajuste do logo

Pedido do corretor em 09/11/2026, relatado pelo dono. Contrato entre backend,
interface e QA.

## 1. Home

- Três cards grandes logo no início da home, ao lado ou logo abaixo da marca,
  com as três áreas que já existem no produto: **Ranking de Ações**
  (`/ranking`, ou `/app/ranking` para quem está logado), **Aulas**
  (`/aprender`) e **Glossário** (`/glossario`).
- Cada card tem título, uma linha de descrição e o destino. O card do Ranking
  é o principal.
- Identidade visual, hierarquia e responsividade atuais; nada de dados novos.

## 2. Cotação e margem

Já implementado (PRs #44, #45, #47 e #48): cotação da brapi em todas as telas,
margem `(preço-teto − cotação) ÷ preço-teto` em `safety-margin.mjs`, teto fixo
até nova publicação, margem negativa permitida, teto ausente ou ≤ 0 resulta em
"indisponível". Nesta entrega, só conferir; não refazer.

## 3. Gráficos da página da empresa

- **Sai** o gráfico de preço histórico (diário/mensal, bases) da seção
  "Cotação". A rota `/api/rankings/price-series` continua no servidor, sem uso
  na interface.
- **Proventos pagos por ação, por ano:** barras empilhadas por tipo, com os
  tipos do snapshot da AGF: `Dividendo`, `JCP` e `Outros` (Rendimento,
  restituição de capital). Agrupados pela data de pagamento, como hoje. Valores
  em R$ por ação, 2 a 4 casas. Eventos futuros continuam hachurados.
  - Fonte: `GET /api/rankings/history/:ticker` (`dividends`), já existente.
  - Nota: "Fonte: AGF, snapshot de 26/10/2026, agrupado por data de pagamento."
- **Linha de payout anual** sobre as barras, em eixo próprio (%), só quando a
  publicação traz `annualHistory.payout` para a empresa. Sem dado, nenhuma
  linha e nenhuma legenda de payout.
- **Lucro líquido histórico, ano a ano:** gráfico próprio na seção
  "Resultados", só quando a publicação traz `annualHistory.netIncome`. Até os
  últimos 10 anos informados. Sem dado, um estado informativo: "A publicação
  não traz o lucro líquido histórico desta empresa."
- Nada de valores inventados, lacunas preenchidas ou estimativas mostradas como
  histórico. Unidade, período e fonte sempre visíveis.
- A demonstração (DEMO1 a DEMO6, `src/lib/rankingDemo.ts`) pode trazer
  `annualHistory` fictício, identificado como exemplo, para mostrar como fica.

## Dados: duas colunas opcionais na planilha da pesquisa

A planilha da análise de dividendos (21 colunas, `dividend-import.js`,
`parseDividendRows`) passa a aceitar duas colunas opcionais, em qualquer
posição depois das 21:

| Coluna | Conteúdo | Guardado como |
|---|---|---|
| `Lucro líquido anual` | pares `ANO: valor` separados por `;` ou quebra de linha. Valor em reais, formato pt-BR (`2.345.678.900,00` ou `2345678900`), negativo permitido. | `annualHistory.netIncome: [{ year, value }]`, `value` texto decimal |
| `Payout anual` | pares `ANO: valor` com o valor em porcentagem (`45,2` ou `45,2%`), de −1000 a 1000. | `annualHistory.payout: [{ year, value }]`, `value` fração em texto, 6 casas (`0.452000`) |

- Ano de 1990 até o ano corrente, sem repetição; a lista sai ordenada por ano.
- Até 30 anos por célula; célula vazia resulta em `null`.
- Erro de formato interrompe a importação com a linha indicada, como os
  outros campos.
- Publicações antigas continuam válidas sem as colunas.
- `annualHistory` fica em `entries_json`, no nível da entrada (irmão de
  `dividendAnalysis`); sem migração.
- A rota pública (`/api/rankings/public`) não expõe `annualHistory`.
- O modelo para download ganha as duas colunas no fim, vazias.

## 4. Logo

No tema claro, a página da empresa (`figma-stock`) e os cards da home usam o
fundo verde bem claro do tema (`--ediv-inset`/`--ediv-canvas`); só o quadrado
do logo (`.company-logo`) é branco, com borda fina. No tema escuro, nada muda.

## 5. Melhoria geral

A interface tem liberdade para alinhar espaçamentos, tipografia, estados de
carregamento e vazio, contraste e responsividade na home e na página da
empresa, sem mudar regras de negócio nem remover informação.
