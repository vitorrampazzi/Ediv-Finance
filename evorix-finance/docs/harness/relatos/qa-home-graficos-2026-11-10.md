# QA: home com três cards, gráficos de proventos e lucro, logo (10/11/2026)

Contrato: `docs/HOME-E-GRAFICOS-2026-11-10.md`. Relatos conferidos:
`backend-home-graficos-2026-11-10.md` e `interface-home-graficos-2026-11-10.md`.
Validação independente sobre o checkout de trabalho (branch
`vitorrampazzi/home-cards-graficos-2026-11-10`, sem commit). Não alterei nenhum
arquivo do produto nem dos testes; só este relato. Nada de produção: todas as
respostas de API foram fixtures locais ou um MySQL descartável em loopback.

## Veredito

**Apto com ressalvas.** Nenhum defeito alto. Um defeito médio na importação
pelo modelo legado (CSV com `;`), alguns pontos baixos de código morto,
documentação e acessibilidade de cor. Detalhes abaixo.

## Aceitação observável usada

1. Home pública e logada: 3 cards (Ranking principal, Aulas, Glossário) com os
   destinos certos, sem rolagem lateral, sem salto de layout, foco visível por
   teclado, contraste de texto ≥ 4,5:1, nenhum fundo branco.
2. Empresa: sem gráfico de preço e sem chamada a `price-series`; proventos
   empilhados por Dividendo/JCP/Outros, agrupados por data de pagamento,
   agendados separados; linha de payout só com `annualHistory.payout`; lucro
   líquido só com `annualHistory.netIncome`, até 10 anos, senão o texto do
   contrato; fonte, unidade e período visíveis.
3. Importação: duas colunas opcionais, erros com linha, legado aceito, rota
   pública sem `annualHistory`.
4. Margem: teto 10 e cotações 5/8/10/12/4 → 50/20/0/−20/60 %.
5. Nenhum "tempo real", "atraso" ou data/hora de cotação nas telas novas.

## Resultados por item

### 1. Revisão do diff

| Ponto | Resultado | Evidência |
|---|---|---|
| Dados inventados / lacunas preenchidas | Passou | `annualPoints` descarta pontos inválidos, `attachPayout` só põe payout em ano com barra, `Line connectNulls={false}` (`HistoryCharts.tsx:351`); BBSE3 com payout em 2019/2021/2025 mostra 3 pontos soltos, sem ligar os anos vazios |
| Estimativa como histórico | Passou | `NetIncomeHistory` (`Charts.tsx:698`) lê só `annualHistory.netIncome`; o "Lucro líquido estimado" da pesquisa continua no bloco próprio, rotulado como estimado |
| Payout/lucro sem `annualHistory` | Passou | TIMS3 sem histórico: `data-payout="absent"`, 0 `.fmk-payout-line`, sem item "Payout anual (%)" na legenda, lucro com "A publicação não traz o lucro líquido histórico desta empresa." |
| Tipos | Passou | Snapshot tem só `JCP` 4129, `Dividendo` 3715, `Rendimento` 170, `REST CAP DIN` 8, `Restituição de Capital` 2, `rendimento` 3; `dividendKind` (`stockHistory.ts:119`) leva os quatro últimos a "Outros" |
| Agendado × pago | Passou | `paymentDate > capturedAt` vai para `*Future`/`scheduled`; TIMS3 2027 = R$ 0,21668 agendado, hachurado |
| Unidades | Passou | "R$ por ação, por ano de pagamento · 2013 a 2026"; payout em % no eixo direito; lucro "Em R$ · 2016 a 2025", eixo mil/mi/bi, tooltip com valor completo |
| `annualHistory` na rota pública | Passou | `publicRanking` monta a entrada campo a campo (`server/public-ranking.js:14`); conferido no parser e pela API real (item 2) |
| Página ainda pede `price-series` | Passou | nenhuma requisição com `price-series` em 12 carregamentos da página da empresa; `grep` em `src/` só acha `src/lib/priceSeries.ts`, que nada importa |
| Código morto | Ressalva baixa | ver defeitos B1 |
| Salto de layout dos cards | Passou | CLS medido com movimento ligado, 320 e 1280 px: 0,0000; a animação de entrada só usa `opacity`/`transform`; cards no HTML pré-renderizado (`dist/index.html` tem os três `data-home-area`) |
| Contraste / teclado | Passou, com ressalva baixa | texto dos cards ≥ 5,52:1 (claro) e ≥ 6,73:1 (escuro); Tab chega ao card Ranking com contorno `solid 2px` e segue para Aulas; tooltip do gráfico abre por teclado. Ressalva B3 sobre as cores entre segmentos |
| "tempo real", "atraso", datas/horas de cotação | Passou | nada no diff de `src/`; no corpo das 3 telas, em 18 combinações, nenhuma ocorrência de `/tempo real|atraso|atrasad|cotação (de|em|às) \d|\d{1,2}h\d{2}|\d{2}:\d{2}/`. A única ocorrência de "tempo real" no diff é linha CRLF de `docs/RANKING-PUBLICO.md` (preexistente) |

Observação, não defeito desta entrega: o qualificativo "defasada" da cotação
continua em `src/components/LiveQuote.tsx:72` e em testes (vem de antes, PR
#47/#48). Se o dono considera "defasada" uma menção a atraso, isso é outra
decisão.

### 2. Importação (parser + API)

Script `C:\Users\vitor\AppData\Local\Temp\claude\b6f6ff36fa235327\e39e8173-b93c-4f25-bac3-6e48166ac672\scratchpad\import-check.mjs`:
`parseCsv` → `parseRankingUpload`, como na rota. **32/32 passou.**

- Modelo `public/modelos/ranking.csv`: BOM, CRLF, termina em
  `;lucro_liquido_anual;payout_anual`.
- Legado válido: `2024: 2.345.678.900,00; 2022: -1.500.000; 2023: 8170000000`
  → ordenado, `"-1500000"`, `"2345678900.00"`; payout `45,2%` → `"0.452000"`.
- 21 + 2 colunas válido; colunas opcionais no meio das 21 também aceitas.
- Lucro negativo (`-1.234.567,89` → `"-1234567.89"`). Só uma coluna presente:
  a outra vira `null`.
- Payout com `%`, ponto, negativo, 1000 e zero: aceito.
- Recusados, sempre "na linha 2": 1000,1 %, −1001 %, ano repetido, 1989, 2027,
  sem `ANO:`, `10 bi`, `10%` no lucro, 31 anos. 30 anos aceito; 1990 e 2026
  aceitos.
- Coluna desconhecida ("Receita anual") recusada. Coluna opcional duplicada
  recusada. Faltando uma das 21, recusado.
- Planilhas antigas: 21 colunas sem as opcionais e legado sem as duas colunas
  aceitos, com `annualHistory: null`.
- Diff: ausente × `null` e ordem de chaves não contam; mudança real aparece em
  `fields: ["annualHistory"]`.
- `publicRanking` e `publicRankingWithMarket` sem `annualHistory`.

Pela API real com o MySQL descartável (script
`C:\Users\vitor\AppData\Local\Temp\claude\b6f6ff36fa235327\e39e8173-b93c-4f25-bac3-6e48166ac672\scratchpad\qa-annual-history.integration.mjs`,
fixture do projeto, schema `ediv_test_*` criado e apagado): **6/6 passou**:
publicação antiga com `annualHistory: null`; erro de payout com a linha, sem
gravar; publicação com as duas colunas grava em `entries_json` no nível da
entrada; `/api/rankings/public` sem `annualHistory`; `/api/rankings/compare`
aponta o campo; a versão anterior continua legível.

**Defeito M1 (médio).** No modelo legado (CSV com `;`), uma célula com pares
separados por `;` e sem aspas é quebrada pelo CSV. O parser legado ignora as
células excedentes e não confere o tamanho da linha
(`server/dividend-import.js:399`, uso em `:458`), então os valores escorregam
de coluna sem erro:

```
...;2026;AGF;2022: 50; 2023: 60;
→ {"netIncome":[{"year":2022,"value":"50"}],"payout":[{"year":2023,"value":"0.600000"}]}
```

O lucro de 2023 virou payout de 60%, e nada avisa. Quando o valor deslocado não
é um percentual válido, a importação é recusada, o que só esconde o problema.
O guia (`docs/RANKING-CORRETOR.md:48`) pede aspas, e o Excel as coloca ao
salvar. Mesmo assim, num arquivo editado à mão, isso grava um dado errado. A
planilha de 21 colunas não tem esse problema: recusa a linha com "Há valores
sem cabeçalho" (`:182`). Sugestão ao backend: no legado, recusar a linha com
mais células que cabeçalhos quando as colunas novas estão presentes, ou sempre.

### 3. Números do gráfico de proventos (BBSE3 e TIMS3)

Script `C:\Users\vitor\AppData\Local\Temp\claude\b6f6ff36fa235327\e39e8173-b93c-4f25-bac3-6e48166ac672\scratchpad\recompute.mjs`.
Ele refaz as somas por ano e por tipo direto de `server/data/stock-history.json.gz`,
com a classificação refeita por conta própria, e compara com
`groupDividendsByType(h, "Anual", "Máx")`.
**369 células comparadas, 0 divergências.** A tolerância foi 1e-9; o helper
arredonda para 10 casas.

- BBSE3: 47 eventos, 14 anos (2013–2026). Só Dividendo e Outros, sem
  agendados. Exemplos: 2020 = Div 2,773640 + Outros 1,364755 = 4,138395;
  2026 = 4,590091, igual ao `groupDividends` legado (`past` 4,5900913116).
- TIMS3: 86 eventos, 27 anos (1998–2027). 2027 = 0,216680, todo agendado.
  2025 = Div 1,596311 + JCP 0,607552 = 2,203864.
- Soma Mensal = soma Anual: BBSE3 33,94919489 e TIMS3 10,96319103.
- "5A" = 2022 em diante. Na TIMS3 inclui 2027 agendado, ou seja, 6 barras.
- Na tela, a tabela para leitor de tela do gráfico bateu com as somas formatadas
  (`formatDividendPerShare`): 14 e 27 anos, nas 6 combinações de largura e tema.

### 4. Margem (regressão)

- Módulo `safety-margin.mjs`, teto `10`: 5 → `50.00`/"50,00%", 8 → 20,00%,
  10 → 0,00%, 12 → "−20,00%", 4 → 60,00%. Teto `null`, `0` ou `-1`: `null`.
- `node --test tests/safety-margin.test.mjs tests/qa-margem.test.mjs tests/market-ui.test.mjs`:
  38/38.
- `tests/qa-margem.browser.mjs`: 1/1 ("teto fixo em R$ 10,00, cotação 5 → 8 →
  10 → 12 → 4 sem recarregar; ranking e empresa iguais"). O bloco do gráfico de
  preço saiu junto com o gráfico, como esperado.

### 5. Gates

Node 24.20.0, Windows. O Playwright usou o Chrome do sistema
(`channel: "chrome"`), porque o headless shell não está instalado. Nada foi
baixado.

| Gate / suíte | Resultado |
|---|---|
| `npm test` | Passou, 272/272 |
| `npm run lint` | Passou, exit 0, sem avisos |
| `npx tsc -b` | Passou, exit 0 |
| `npm run build` | Passou, "HTML público gerado para 8 rotas; QA=false." |
| `node --test tests/harness.test.mjs` | Passou, 6/6 |
| `node scripts/harness.mjs check` | Passou, "quadro válido; 4 papéis e reservas sem conflito." |
| `seo.dist` | Passou, 7/7 |
| `public-home.browser` | Passou, 10/10, sem a instabilidade de pixel da rodada anterior |
| `stock-theme.browser` | Passou, 6/6 |
| `public-rankings.browser` | Passou, 10/10 |
| `dividend.browser` | Passou, 15/15 |
| `qa-margem.browser` | Passou, 1/1 |
| `npm run test:integration` (MySQL descartável) | Passou, 74/74 (8 arquivos) |
| API `annualHistory` (script QA, MySQL descartável) | Passou, 6/6 |
| `tests/browser.mjs` (MySQL descartável) | Passou, 32/32, inclusive os hrefs dos cards na home de visitante e na logada |
| `figma-stock.browser`, `company-center.browser` | Não executados |

As duas suítes não executadas são runners manuais. Elas exigem uma prévia
completa já rodando em `127.0.0.1:4332`, com sessão e publicação. O script não
faz login e as duas ficam fora da CI (`quality.yml` roda só `test:browser`). O
que elas conferem nesta entrega foi coberto por `stock-theme`,
`public-rankings` e pelo script do item 6.

MySQL descartável:
- `mysqld --no-defaults` 9.3, porta 3307, `--bind-address=127.0.0.1`.
- Dados e senha aleatória no scratchpad.
- Desligado com `mysqladmin shutdown` ("Shutdown complete") e pasta apagada no
  fim.
- O serviço `MySQL93` não foi tocado.

### 6. Responsividade e temas

Script `C:\Users\vitor\AppData\Local\Temp\claude\b6f6ff36fa235327\e39e8173-b93c-4f25-bac3-6e48166ac672\scratchpad\qa-visual.mjs`.
Roda sobre o `dist` de produção (`vite preview` na porta 4201), com APIs em
fixture e o histórico real da AGF de BBSE3 e TIMS3. A BBSE3 recebeu um
`annualHistory` fictício de QA, com 11 anos de lucro, 3 deles negativos, e
payout em 2019, 2021 e 2025. **254/254 passou**, sem erro de console nem API
fora da fixture. O único host externo bloqueado foi `icons.brapi.dev` (logos),
de propósito.

- Larguras 320, 768 e 1280 px, temas escuro e claro: home pública, home logada
  e empresa (BBSE3 e TIMS3, seções 03 e 05).
- Sem rolagem lateral em nenhuma: `scrollWidth` = largura da janela e nenhum
  elemento passando da borda.
- Grade dos cards: 1 coluna em 320; Ranking na largura toda e 2 abaixo em 768;
  3 colunas em 1280.
- Destinos dos cards:
  - pública: `/ranking`, `/aprender`, `/glossario`;
  - logada: `/app/ranking`, `/app/aprender`, `/glossario`;
  - alvos ≥ 44 px.
- Tema claro, página da empresa:
  - fundo `rgb(247, 248, 246)` (`--ediv-canvas`);
  - `.company-logo` em `rgb(255, 255, 255)`, com borda `1px solid`;
  - nenhum outro elemento branco.
- Tema escuro: nenhum fundo branco.
- Os cards nunca são brancos.
- Lucro líquido da BBSE3: os 10 últimos anos (2016–2025), negativos em vermelho
  e nota de prejuízo. TIMS3: estado vazio com o texto do contrato.
- Nota de fonte exata: "Fonte: AGF, snapshot de 26/10/2026, agrupado por data
  de pagamento."
- Título da home: "Escola do Dividendo".

Capturas em
`C:\Users\vitor\AppData\Local\Temp\claude\b6f6ff36fa235327\e39e8173-b93c-4f25-bac3-6e48166ac672\scratchpad\qa-visual-1110\`.
Conferi a olho `home-publica-320-light`, `empresa-BBSE3-03-1280-light`,
`empresa-TIMS3-03-320-light` e `empresa-BBSE3-05-1280-dark`. O cabeçalho
fixo aparece sobre a seção nas capturas por elemento, por causa do modo de
captura, e não na página.

## Defeitos

- **M1 — Média.** O legado com `;` sem aspas desloca o lucro para o payout sem
  erro (`server/dividend-import.js:399`, `:458`). Ver o item 2.
- **B1 — Baixa, código morto.**
  - `LegendItem.marker` e o seu ramo de desenho ficaram sem uso
    (`src/components/stock-make/ui.tsx:79` e `:111`).
  - Nada na interface importa mais `src/lib/priceSeries.ts`, `groupDividends`
    (`src/lib/stockHistory.ts:76`) e `formatHistoricalDividend` (`:22`). Eles
    continuam de propósito, porque os testes os usam.
  - `seriesAnswer` e o parâmetro `series` também perderam o uso
    (`tests/market-fixture.mjs:192` e `:235`).
- **B2 — Baixa, documentação.** `docs/MARGEM-E-HISTORICO.md:208` e seguintes
  ainda descrevem o gráfico de preço da página da empresa (Diário/Mensal,
  bases, marcador).
- **B3 — Baixa, acessibilidade de cor.** Cada segmento tem bom contraste com o
  fundo:
  - no claro, de 5,3 a 6,2:1;
  - no escuro, de 5,5 a 10,6:1.

  Entre segmentos vizinhos, porém, o contraste fica baixo: no claro, Dividendo ×
  JCP dá 1,11:1 e JCP × Outros 1,03:1; no escuro, 1,92 e 1,13. Os tipos se
  distinguem só pelo matiz. Tooltip por teclado e tabela para leitor de tela
  compensam em parte.
- **Observação.** O eixo X é categórico: anos sem proventos não aparecem como
  vazio. Na TIMS3, 2007 fica ao lado de 2011. Nenhum dado é inventado, mas o
  intervalo some do desenho. Também "5A" mostra 6 barras quando há agendado no
  ano seguinte.
- **Decisão da coordenação.** Logado, o card Aulas leva a `/app/aprender`, e o
  contrato cita `/aprender`. A interface registrou a escolha no relato dela.

## Limites da validação

- Sem leitor de tela real, sem outros navegadores (só Chrome) e sem
  certificação WCAG.
- O contraste foi calculado pelas cores computadas.
- XLSX real com as duas colunas não testado; parser e CSV sim. O gerador dos
  testes só conhece as 21 colunas.
- `figma-stock` e `company-center` não executados (ver o item 5).
- `notifications.browser`, `browser-experience`, `session.browser` e
  `notifications.e2e` não rodaram. Estão fora do escopo da mudança, e a CI
  roda o `test:browser`.
- O `annualHistory` da BBSE3 nas telas é fictício de QA, não dado de pesquisa.

## Próximo passo

- Backend: decidir M1 (recusar excesso de células no legado).
- Interface: B1 e B3, se quiser.
- Coordenação: B2 e a rota das Aulas para o usuário logado.
- Nenhum item impede a integração.
