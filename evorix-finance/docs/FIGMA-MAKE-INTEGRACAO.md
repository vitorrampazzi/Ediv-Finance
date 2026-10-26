# Página individual — integração Figma Make

Fonte visual: ZIP `Escola do dividendo.zip`, projeto Make
`lUYMlXI1UG46bp8cVSK94U`. Integração na rota existente
`/app/ranking/acao/:ticker`, dentro do layout autenticado.

## Código aproveitado

| ZIP | Aplicação | Adaptação necessária |
| --- | --- | --- |
| `src/App.tsx` | `src/components/stock-make/StockMake.tsx` | Cabeçalho, cinco destaques, visão geral, gauge, indicadores, empresa e explicações; recebe o Entry e o link de retorno existentes. |
| `src/Charts.tsx` | `stock-make/Charts.tsx` | PriceChart, DividendChart, DividendCalendar, PerformanceChart e ResultsCharts preservam composição, cores, legendas e alturas. |
| `src/ui.tsx` | `stock-make/ui.tsx` | InfoTip, Seg, Legend, ChartTip, Tag e SectionHead; dicas usam Tooltip compartilhado, com teclado/Escape. Badge de demonstração removido. |
| `src/data.ts` | `stock-make/data.ts` | Mock substituído por adaptador tipado de Entry, reutilizando dividend-analysis e dividend-insights. |
| `src/index.css` | `stock-make/stock-make.css` | Tokens originais grafite/teal/âmbar/lilás/azul e tipografia, sob `.figma-stock`, com fontes locais. |

Não foram copiados scaffold, package.json, lockfile, vite.config, main.tsx,
index.html, AGENTS ou instrumentação `.figma`. Sem dependências novas, alteração
de API, autenticação, banco, CSP ou lógica de publicação.

`DividendResearch.tsx` integra StockMake; `src/index.css` apenas registra a folha
isolada e a busca de classes. O roteamento e os parâmetros de retorno do ranking
permanecem existentes. O restante do site mantém seus tokens e fontes.

## Dados e metodologia

Todos os 21 campos canônicos da aba Informações Completas permanecem acessíveis:
17 nos grupos de indicadores e quatro no institucional da empresa. Cada campo
mantém rótulo e valor completo, sem substituir ausência por zero. Destaques podem
compactar valores; a tabela de indicadores mantém a precisão da fonte.

Frações percentuais continuam frações. Preço-teto, margem e desvio de P/L da
planilha não são recalculados. A referência histórica de yield é **6,81%**,
do Tesouro IPCA+ 2037 com juros semestrais, sem apresentá-la como taxa atual.
Comparações adicionais explicitam sua fórmula e não substituem campos da fonte.
Payout acima de 100%, zero e valores negativos são preservados; dívida/EBITDA
negativa isoladamente não permite afirmar caixa líquido.

Calendário apresenta somente meses habituais de **anúncio**, sem inventar datas
de pagamento. Nome, ticker, atuação, data, cotação, lucro, dividendos e indicadores
vêm da publicação selecionada, sem DEMO3 ou cadastro corporativo fictício.

## Gráficos alimentados pela publicação

Os sete espaços agora renderizam barras com os indicadores reais de cada Entry:

| Gráfico | Campos e unidade |
| --- | --- |
| Cotação e preço-teto | Cotação da pesquisa e teto; R$ por ação |
| Dividendo e lucro por ação | DPA bruto projetado e LPA estimado; R$ por ação |
| Lucro por ação | LPA estimado; R$ por ação |
| Lucro líquido | Lucro total estimado; R$ (eixo compacto, valor completo na tabela) |
| Crescimento | CAGR informado dos lucros em cinco anos; % ao ano |
| Endividamento | Dívida líquida/EBITDA; vezes |
| P/L e média histórica | P/L projetado e P/L médio de dez anos; vezes |

A média de P/L e o CAGR são referências reais do passado fornecidas na planilha.
São agregados, sem reconstruir lucros por ano, preços diários ou pagamentos.
Os gráficos não afirmam retorno acumulado nem cotação ao vivo. Projeções são
identificadas como estimativas e não pagamentos/resultados realizados.

Cada figura informa unidade, ticker, fonte e data; mantém valores exatos na
alternativa tabular e dicas por mouse/teclado/Escape. Números negativos aparecem
abaixo de zero, zero não é ausência, e null permanece Não informado na tabela,
sem virar zero no desenho. Se todos os valores da figura estão ausentes, o
estado indisponível continua acessível. Os 21 campos completos são preservados.

Os componentes históricos do ZIP permanecem conservados, mas não recebem séries
simuladas. Períodos históricos e benchmarks continuam desativados. Não existe
fonte histórica autorizada na base; a consulta pública TIMS3 na API existente
retornou 401 sem token. O usuário confirmou o uso da planilha por enquanto.
Nenhuma API nova, plano pago, credencial ou alteração de servidor foi introduzida.

## Fidelidade e diferenças deliberadas

Preservados estrutura editorial, divisores, grids, superfícies, cinco destaques,
composição dos gráficos e Newsreader/Instrument Sans/DM Mono. Cinco WOFF2 oficiais
servem em `/fonts`, com três licenças SIL OFL; sem Google Fonts em runtime.

Diferenças: logo real da empresa; dados e textos condicionais reais; estados
vazios; sete âncoras incluindo a área educativa; navegação fixa respeita o menu
autenticado; contenção em telas pequenas e grids pela largura útil após o menu
lateral. Tema claro utiliza a alternância existente. Não há troca de design.

A prévia online do Make apresentou erro M8. O contexto MCP retornou os links de
fonte; captura MCP de Make não é suportada. A comparação visual usa o ZIP original
renderizado localmente, com fontes equivalentes servidas localmente e fontes do
ZIP intactas. A instrumentação/configuração do Make não foi executada.

## Verificação

`tests/figma-stock.browser.mjs`: runner focal local, três tickers, 21 campos,
fontes realmente carregadas, sete âncoras, explicações por mouse/teclado/Escape,
320 e 1440 px nos dois temas, ausentes/zero/negativos/payout acima de 100% e amostra
pública 3×3. Requer prévias locais de referência e produto, nunca produção.

`tests/company-center.browser.mjs` mantém verificações de ranking/22 colunas
completas e encaminha a nova página ao runner focal. Os runners CI
`dividend.browser.mjs` e `public-rankings.browser.mjs` preservam dados, acesso e
paginação, com seletores atualizados para o port. TypeScript, lint, testes e build
devem passar, seguidos de QA independente da versão identificada. Relatos do
harness registram resultados reais; este documento não declara testes futuros
como aprovados. Não há certificação global de WCAG ou teste de leitores reais.

### Correção de gráficos — 26/10/2026

A mudança anterior preservava a composição, mas os históricos vazios deixavam os
sete espaços sem séries. A correção usa os indicadores da publicação para
comparações e projeções, mantendo o design, as fontes e a metodologia. A revisão
focal desta mudança cobre três tickers, 21 campos e sete figuras, 320/1440 nos
dois temas e todos os valores ausentes. Os runners CI mantêm os 90 detalhes,
proteções de acesso e paginação. A matriz completa da integração original não
foi repetida por não haver alteração global, de fonte, de layout ou de rota.
