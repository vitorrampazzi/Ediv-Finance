# Interface: home com três cards, gráficos de proventos e lucro, logo (10/11/2026)

Contrato: `docs/HOME-E-GRAFICOS-2026-11-10.md`. Campo novo do backend,
consumido como opcional: `entry.annualHistory = { netIncome, payout } | null`,
listas `[{ year, value }]`, com `value` em reais decimais (lucro) ou em fração
(payout, `"0.452000"` = 45,2%).

## O que cada tela mostra

### Home pública (`/`)
- Três cards fecham o hero, logo abaixo do texto e da marca: **Ranking de
  Ações** (`/ranking`, principal), **Aulas** (`/aprender`) e **Glossário**
  (`/glossario`).
- Cada card tem ícone, título, uma linha de descrição e seta, sem dados novos.
- O card principal tem a superfície `--ediv-graphic-surface`, a borda acentuada
  e o ícone sobre `--ediv-primary`. Os outros dois usam `--ediv-inset`.
- Grade: uma coluna até 639 px; duas de 640 a 959 px, com o Ranking na largura
  toda; três colunas (1,35fr / 1fr / 1fr) a partir de 960 px.
- Os cards são links estáticos e já saem no HTML pré-renderizado, então nada
  se move na hidratação.
- Foco visível de 2 px, `prefers-reduced-motion` e `prefers-contrast` tratados.
- O CTA "Criar conta grátis" e o link "Explorar as aulas" continuam como antes.

### Home logada (`/app`)
- Os mesmos três cards, abaixo da saudação e da marca, nas duas colunas.
- Logado, os destinos são `/app/ranking`, `/app/aprender` e `/glossario`.
- Para as Aulas, uso `/app/aprender` (e não `/aprender`) para não tirar a pessoa
  do layout da conta, como o resto da home logada já fazia. O contrato cita
  `/aprender`; se a coordenação preferir a rota pública, basta trocar uma linha
  em `HomeAreaCards.tsx`.

### Página da empresa (`/app/ranking/acao/:ticker`)
- **02 Cotação**: só o bloco "Cotação atual" (`CompanyQuote`). O gráfico de
  preço saiu e a página não chama mais `/api/rankings/price-series`. A rota
  continua no servidor. Sem o gráfico, o bloco fecha a seção sem a borda e a
  margem duplicadas.
- **03 Dividendos**: novo gráfico "Proventos pagos por ação".
  - Barras empilhadas por tipo da AGF: Dividendo (teal), JCP (aço) e Outros
    (lilás). "Outros" junta Rendimento, rendimento, REST CAP DIN, Restituição de
    Capital e os eventos sem tipo.
  - Agrupado pela data de pagamento, com visão Anual e Mensal e intervalo 5A ou
    Máx.
  - Eventos depois da data do snapshot ficam hachurados, na cor do tipo.
  - Legenda por tipo, mais "Agendados" e "Payout anual (%)"; cada item pode ser
    ocultado.
  - Tooltip, também por teclado: valor de cada tipo, a parte agendada, o total
    e o payout do ano.
  - Unidade e período no topo: "R$ por ação, por ano de pagamento · 1998 a
    2027".
  - Nota: "Fonte: AGF, snapshot de 26/10/2026, agrupado por data de pagamento."
    A data sai de `source.capturedAt`.
  - Uma tabela só para leitores de tela traz todos os valores.
- **Linha de payout**: aparece só quando `annualHistory.payout` traz algum ano
  que também tem barras.
  - Eixo da direita, em %, de 0 a 100 no mínimo; acompanha valores negativos ou
    acima de 100%.
  - Nota: "Payout anual informado pela equipe na publicação, no eixo da
    direita."
  - Sem dado, não há linha, nem eixo, nem item de legenda.
  - Na visão mensal não há linha; a nota diz "O payout anual aparece na visão
    anual."
  - Se o payout informado não coincide com nenhum ano do intervalo, uma nota
    informa isso.
- **05 Resultados**: novo primeiro bloco, "Lucro líquido por ano", na largura
  toda.
  - Com `annualHistory.netIncome`: barras dos últimos 10 anos informados, sem
    preencher lacunas. Eixo abreviado (mil/mi/bi), tooltip com o valor completo
    ("R$ 2.345.678.900,00"), unidade e período ("Em R$ · 2016 a 2025").
  - Prejuízo em vermelho, explicado na nota. Fonte: "informado pela equipe na
    publicação."
  - Sem dado: "A publicação não traz o lucro líquido histórico desta empresa."

### Comparação de empresas (ranking logado), item extra do backend
- `ResearchTools.tsx` ganhou o rótulo "Histórico anual" e a lista curta
  "2024 → R$ 2.345.678.900,00" e "2023 → 45,2%". Quando falta uma série,
  aparece "Não informado".
- A linha só entra quando uma das duas empresas traz `annualHistory`.
- Nenhum campo estruturado é mais impresso cru: objeto vira "Não informado",
  nunca `[object Object]`.
- Hoje não existe na interface comparação de versões que percorra as chaves
  (saiu no #35); o caminho genérico era o `fieldValue` da comparação. O
  `server/research-diff.js` é do backend e não foi tocado.

### Logo e fundo (§4)
- Tema claro, página da empresa: o fundo já era `--ediv-canvas`, e os blocos
  usam `--ediv-inset`.
- As superfícies "raised" (chip do ticker, botão ativo dos seletores, tooltips)
  usavam `--ediv-surface`, branco. Dentro de `.figma-stock`, no tema claro,
  passam a `--ediv-graphic-surface` (#e2eee8). Só o `.company-logo` continua
  branco, com a borda fina `--ediv-line`.
- O tema escuro não muda.
- Os cards da home não usam branco em nenhum tema.

## Decisões
- **Valores por ação**: 2 a 4 casas, como no contrato. Na TIMS3, porém, há
  eventos de 2000 a 2007 de R$ 0,0000075 por ação, que com 4 casas apareceriam
  como "R$ 0,00", ou seja, como se nada tivesse sido pago. Para valores
  positivos abaixo de R$ 0,00005 o texto usa 3 algarismos significativos
  ("R$ 0,00000752"). Não muda nenhum número, só a forma de mostrar.
- **GA4**: nenhum evento novo. A home mede cliques de cadastro e login
  (`click_signup` e `click_login`); os cards são navegação, e a chegada a
  `/ranking`, `/aprender` e `/glossario` já é medida pelo `page_view` com
  referrer. A lista fechada de `analytics-policy.mjs` não foi tocada.
- **Demonstração**: não acrescentei `annualHistory` a `rankingDemo.ts`. As
  entradas DEMO1 a DEMO6 não têm `dividendAnalysis`, então abrem o layout
  antigo da pesquisa, e não o `StockMake`; um histórico ali não apareceria em
  nenhuma tela.
- **`src/lib/priceSeries.ts`**: mantido, junto com `tests/price-series-ui.test.mjs`.
  `tests/qa-margem.test.mjs`, do QA e no `npm test`, ainda importa
  `parsePriceSeries` e `seriesPlot`. A interface não usa mais o módulo. Só o
  hook `src/hooks/usePriceSeries.ts` foi removido. Nenhuma mudança no
  `package.json`.
- **`groupDividends`**: mantida, porque tem teste próprio e serve de
  conferência dos totais da função nova.

## Arquivos
Novos:
- `src/components/home/HomeAreaCards.tsx`
- `src/components/home/home-area-cards.css`

Removido:
- `src/hooks/usePriceSeries.ts`

Alterados:
- `src/lib/ranking.ts`: `AnnualPoint`, `AnnualHistory` e
  `Entry.annualHistory?`.
- `src/lib/stockHistory.ts`, com funções puras:
  - `dividendKind`, `groupDividendsByType`, `attachPayout`, `netIncomeSeries`
    e `annualHistoryText`;
  - os formatos `formatDividendPerShare`, `formatReais`, `compactReais` e
    `formatPayoutPercent`;
  - `dividendSourceNote`.
- `src/components/stock-make/HistoryCharts.tsx`: sai o `PriceSeriesChart`;
  `HistoricalDividendChart` foi reescrito por tipo e com payout.
- `src/components/stock-make/Charts.tsx`: sai o `PriceChart`; entram o
  `NetIncomeHistory` e o payout no `DividendChart`.
- `src/components/stock-make/StockMake.tsx`: a seção 02 fica sem o gráfico.
- `src/components/stock-make/ui.tsx`: amostra em barra na legenda.
- `src/components/stock-make/stock-make.css`: superfície raised no tema claro e
  fechamento da seção Cotação.
- `src/components/home/PublicHome.tsx`, `public-home.css` e
  `AccountHomeContent.tsx`.
- `src/components/ResearchTools.tsx`.

Testes alterados:
- `tests/stock-history-ui.test.mjs`: 1 → 7 testes.
- `tests/public-home.browser.mjs`: cards, hrefs, foco visível sem
  deslocamento, fundo fora do branco e 320 px sem rolagem lateral nos dois
  temas.
- `tests/public-rankings.browser.mjs`: o bloco do gráfico de preço virou
  "Proventos por tipo e ano, payout com e sem histórico anual, lucro líquido e
  320px nos dois temas". Entraram também os cards no bloco de 320 px. A rota
  simulada de price-series do ABEV3 saiu.
- `tests/stock-theme.browser.mjs`: fixture com proventos dos três tipos, um
  agendado e `annualHistory`.
  - Confere a linha de payout, o lucro líquido e a ausência do gráfico de
    preço.
  - No tema claro, só o logo branco.
  - A paleta "raised" segue `--ediv-graphic-surface` no tema claro.
  - Quando falha, mostra o elemento que transborda.
- `tests/qa-margem.browser.mjs`: saem o bloco do gráfico Diário/Mensal e a
  série simulada. Ficam os ciclos de margem e cotação; foi acrescentada a
  verificação de que não há gráfico de preço.
- `tests/dividend.browser.mjs`: o estado `invalid` do gráfico vira "sem
  gráfico"; a comparação ganha a linha "Histórico anual" com dado e sem dado.
- `tests/figma-stock.browser.mjs`: sem gráfico de preço; lucro líquido pronto
  ou vazio conforme a entrada.
- `tests/browser.mjs`: cards da home de visitante e da home logada.
- `tests/seo.dist.mjs`: os três cards no HTML pré-renderizado, o Ranking
  primeiro.
- `tests/company-center.browser.mjs`: sem mudança; não toca no gráfico de
  preço nem na home.

## Verificações
Executadas em 10/11/2026, no Windows, com Node 24 local e Chromium do
Playwright, contra fixtures locais. Nada de produção nem de banco.

- `npm test`: 272/272 passou. `tests/stock-history-ui.test.mjs` tem 7 testes
  (antes 1).
- `npm run lint`: passou, sem avisos.
- `npx tsc -b`: passou.
- `npm run build`: passou; HTML público gerado para 8 rotas.
- `node --test tests/seo.dist.mjs`: 7/7 passou (o teste novo é o dos cards).
- `tests/public-home.browser.mjs`: 10/10 passou, nos nove cenários (1440,
  1366×650, 768, 390, 320, 320×568, paisagem e dois com movimento reduzido).
- `tests/stock-theme.browser.mjs`: 6/6 passou (desktop, 390 e 320, nos temas
  escuro e claro).
- `tests/public-rankings.browser.mjs`: 10/10 passou, inclusive o bloco novo de
  proventos, payout e lucro líquido.
- `tests/dividend.browser.mjs`: 15/15 passou.
- `tests/qa-margem.browser.mjs`: 1/1 passou. O segundo bloco, do gráfico de
  preço, foi removido junto com o gráfico.
- `node --check`: passou em `tests/figma-stock.browser.mjs`,
  `tests/browser.mjs` e `tests/company-center.browser.mjs`. Não executei essas
  três suítes, que precisam de banco e prévia local.
- Conferência visual das capturas em `.test-artifacts/`:
  - `public-home/areas-320-{light,dark}.png` e `desktop-whole.png`;
  - `stock-theme/*-dividendos.png` e `*-resultados.png`;
  - `public-rankings-browser/dividends-320-*.png` e `net-income-320-*.png`.
- Ajustes feitos depois da conferência visual:
  - Tabelas `sr-only` envolvidas em `div`: a `<table>` ignorava a caixa de 1 px
    e criava rolagem lateral em 390 e 320 px.
  - Eixo do lucro com o domínio padrão, para ter marcas redondas, e largura de
    64 px, para que "-500 mi" não quebre.

Rodadas de novo depois desses dois ajustes: `npm test`, lint, tsc, build e
`seo.dist`, todas passaram. Na rodada final de navegador,
sobre o build final, também passaram todas: `public-rankings` 10/10,
`stock-theme` 6/6 e `public-home` 10/10. `node scripts/harness.mjs check` e
`tests/harness.test.mjs` (6/6) também passaram.

## Riscos e limites
- A home pública ficou mais alta no hero. Em 320 px o card do Ranking ocupa
  cerca de 195 px, porque o título quebra em duas linhas. Não há rolagem
  lateral nem salto de layout.
- A cor de "Outros" (lilás) e a de JCP (aço) vêm da paleta existente da página.
  O contraste dos segmentos frente ao fundo não foi medido por ferramenta; foi
  conferido nas capturas dos dois temas.
- A linha de payout usa só os anos com barras; anos de payout sem proventos no
  snapshot ficam de fora, de propósito.
- `figma-stock`, `browser` e `company-center` precisam de banco e prévia local:
  só passaram por `node --check`.
- Leitor de tela real, outros navegadores e certificação WCAG não foram
  testados.

## Próximo passo
A coordenação integra com o backend (`annualHistory` em `entries_json`) e o QA
valida com uma publicação de teste que traga as duas colunas novas.
