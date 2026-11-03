# Interface: seção 05 · Resultados (03/11/2026)

## Problema
Na página da ação, "Resultados" tinha quatro gráficos de barra com uma barra cada
(LPA, lucro, CAGR, Dív./EBITDA) e "P/L e média histórica" com duas barras. Sem série
histórica, nada era comparado. Os controles 6M/1A/3A/5A e a legenda de rentabilidade
estavam sempre desabilitados: `performanceHistory`, `results` e `cagrSeries` eram
arrays vazios fixos, então nada mudava. Foram removidos junto com esses ramos mortos.

## O que mudou
Cada bloco tem forma visual própria e usa só campos da publicação ou contas diretas,
identificadas na tela:
- **Do lucro ao dividendo** (`earnings`): lucro líquido estimado em destaque
  (R$ 5,30 bi e o valor exato), LPA e payout esperado; barra empilhada do LPA em
  "Distribuído como dividendo" (DPA) e "Retido na empresa" (LPA − DPA, hachurado), com
  a proporção "DPA ÷ LPA" rotulada. Se faltar dado, se o LPA for ≤ 0 ou se o DPA superar
  o LPA, a barra não aparece e um aviso curto mostra a diferença.
- **Crescimento do lucro** (`cagr`): CAGR em destaque e área Recharts do índice
  100 × (1 + CAGR)^n, de "Ano 0" a "Ano 5", com a nota "ilustração… não são lucros nem
  datas reais". O CAGR negativo também aparece, preenchido abaixo da linha de base 100.
- **Endividamento** (`debt`): régua de 0 a max(5, valor) (ou a partir do negativo), com
  marcador e frase factual ("equivale a cerca de 0,9 ano de EBITDA"). O valor negativo
  aparece como caixa maior que a dívida ou EBITDA negativo, sem afirmar qual dos dois.
  Não há faixas coloridas nem julgamento.
- **P/L e média histórica** (`valuation`): gráfico de bala horizontal (P/L projetado
  como barra e média de 10 anos como marcador), com o desvio informado (`peDeviation`)
  em destaque.
- Acessibilidade: cada figura tem `figcaption` visível, resumo `sr-only` com os
  números e uma tabela de valores exatos (`data-chart-value`). Os gráficos decorativos
  ficam `aria-hidden`, as legendas usam forma (sólido, hachurado ou marcador) além da
  cor e não há animação de entrada.
- Ticks dos eixos Recharts da página da ação passam a usar Instrument Sans (antes
  pediam "DM Mono", que não é carregada).

Arquivos: `src/components/stock-make/Charts.tsx`, `StockMake.tsx`, `data.ts`;
testes `tests/dividend.browser.mjs`, `tests/public-rankings.browser.mjs`,
`tests/figma-stock.browser.mjs`. Eles agora têm 6 figuras (4 com histórico), os grupos
`earnings` e `valuation` com `peDeviation` e o marcador `[data-chart-visual]` no lugar
de `.recharts-wrapper`.

## Verificações
- `npm test`: 132/132 passaram; `npm run lint` ok; `npm run build` ok.
- `node tests/dividend.browser.mjs`: 10 PASS.
- `node tests/public-rankings.browser.mjs`: 10 PASS.
- `node tests/stock-theme.browser.mjs`: 6 PASS.
- `tests/figma-stock.browser.mjs` não foi executado (exige servidor com dados reais).
- Visual: build servido em 127.0.0.1 com /api mockada (TIMS3 real, uma variação e um
  caso-limite), em 1440 e 375, escuro e claro, sem overflow horizontal.

## Próximo passo
Rodar o `figma-stock.browser.mjs` no ambiente de QA com dados.
