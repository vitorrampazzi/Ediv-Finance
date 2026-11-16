# Interface — tooltips e páginas das empresas, 13/11/2026 (relato)

Papel: `interface` (agente frontend, Haiku). Gravado pela coordenação a partir do
retorno do agente, que não pôde criar o arquivo. Revisado pelo Orquestrador.

## Feito

- `src/components/Tooltip.tsx`: dica na camada superior (popover), ajuste às bordas,
  toque fixa, Esc e toque fora fecham, hover com folga (WCAG 1.4.13),
  `aria-describedby` permanente. Quando a explicação em camadas não cabe acima nem
  abaixo do controle, mas cabe na tela, aparece inteira sobre o controle (antes o
  "Exemplo" era cortado no desktop); só rola por dentro se nem a tela inteira couber.
  `onOpen` opcional (uma vez por montagem) para o evento `open_indicator_help`.
- `src/lib/tooltipText.ts` (novo): achata a explicação em texto para `aria-describedby`.
  Fica fora do componente por causa da regra `react-refresh/only-export-components`.
- `src/components/HelpText.tsx` (novo): explicação no corpo da página (texto simples em
  parágrafo; camadas em lista de definições).
- `src/lib/indicatorDefinitions.ts`: fonte única das explicações. Chaves novas:
  `expectedReturnPercent`, `targetPrice`, `horizonMonths`, `balanceSheet`,
  `incomeStatement`, `cashFlow`, `companyInformation`, `netDebt`, `statistics`; camada
  "Como ler" em `updatedOn`. Sem fórmula onde o código não calcula o valor (o potencial
  vem pronto da planilha, `server/dividend-import.js`).
- `src/components/ResearchTools.tsx`: "Entender este indicador" lê de
  `indicatorDefinitions.ts`; o objeto de textos local foi removido.
- `src/components/stock-make/StockMake.tsx`: tipos `TooltipContent`; "Entenda os
  números" com `HelpText`. A coordenação trocou as frases soltas dos indicadores do topo
  e do bloco de dividendos pelas explicações em camadas (mesma fonte da tabela).
- `src/components/stock-make/stock-make.css`: claro na base, escuro em
  `:root[data-theme="dark"] .figma-stock`.
- `tests/indicator-definitions.test.mjs` (novo, no `npm test`).

## Verificações do agente

- `tsc -p tsconfig.app.json --noEmit` e eslint: passaram.
- `node --test` nos arquivos da frente: 53/53.
- Playwright (12 execuções: logada, pública e legado; claro e escuro; 390×844 com toque
  e 1440×900): tema aplicado, sem rolagem horizontal, dica inteira na janela, Esc fecha.
  Capturas em `.test-artifacts/evolucao-empresas/` (não versionadas).

## Não verificado pelo agente

- Contraste medido numericamente; 320 px; `prefers-reduced-motion` na dica.
- `src/components/DividendDashboard.tsx:69` ainda tem textos próprios de explicação
  (fora do escopo desta frente).

## Ponto de atenção

- No desktop, a explicação em camadas pode cobrir a linha do próprio indicador
  enquanto aberta; o título da dica identifica o indicador.
