# Dashboard individual de dividendos

Evolução de interface baseada na main `7010102`, sem alterar os dados importados.
A API e os registros existentes continuam como fonte de verdade. A cópia
`Lista de Ações analisadas (1).xlsx` tem o mesmo SHA256 do arquivo auditado:
`663894941a8a3a656a78ac93b3a011f8f9e560290e137062eacd1044182d4b6d`.

## Campos da segunda aba

| Seção | Campos originais |
| --- | --- |
| Visão geral da empresa | Empresa; Código; Atuação; Quantidade total de ações; Valor de mercado; Cotação atual; Última atualização |
| Valuation e margem de segurança | P/L projetado; P/L médio (últ. 10 anos); Desvio do P/L da sua média; Preço Teto baseado em 6,81% de yield (Taxa do Tesouro IPCA+ 2037 com juros semestrais); Margem de segurança |
| Dividendos e distribuição | Payout esperado; Dividendo por ação bruto projetado; Dividend Yield bruto estimado; Frequência nos anúncios; Meses que costumam anunciar dividendos |
| Resultados, crescimento e endividamento | Lucro líquido estimado; CAGR lucros (últ. 5 anos); Dívida líquida/EBITDA; Lucro por ação estimado |

Os 21 campos permanecem ligados ao ticker e à versão da publicação. Não há
histórico artificial, cotação ao vivo ou alteração da classificação original.
A taxa de 6,81% é a premissa registrada na fonte, não uma taxa atual consultada.

## Cálculos e leitura

- Diferença relativa de P/L: `(P/L projetado / P/L médio - 1) × 100`.
- Distância da cotação ao teto: `(cotação / preço teto - 1) × 100`.
- Comparações percentuais exigem os dois valores positivos e resultado finito;
  indicadores originais nulos, zero ou negativos continuam exibidos corretamente.
- A margem e o desvio do P/L informados no Excel não são substituídos por cálculos
  derivados: a fonte contém arredondamentos próprios.
- Payout, DY e CAGR mantêm as frações da fonte, formatadas como percentuais.
  Payout acima de 100% mantém seu valor, mesmo quando o desenho tem limites.
- Uma razão dívida líquida/EBITDA negativa, isoladamente, não permite concluir
  caixa líquido: não estão disponíveis os sinais separados do numerador e denominador.
- O calendário lê somente os meses explicitamente informados. Texto indefinido
  não recebe meses inferidos da frequência. Hábitos de anúncios não garantem
  datas ou pagamentos; dividendos projetados não são dividendos realizados.
- Valores abreviados em mil, mi ou bi têm o valor completo disponível por
  teclado/tooltip. Ausência não é convertida em zero.

## Ranking

A limitação é somente visual: aplicar busca, filtros e ordenação à lista completa
antes de mostrar as primeiras dez ações. Cada clique em “Ver mais ações” acrescenta
dez; ao chegar ao fim, o botão desaparece. A prévia administrativa permanece completa.
Comparação e navegação entre pesquisas continuam usando a publicação inteira.

## Referência visual e limites

As duas abas AGF fornecidas foram observadas no navegador conectado: listagem
com resumo por empresa, cabeçalho de indicadores, âncoras entre seções e grupos
de indicadores em colunas que se empilham no celular. Somente esses padrões de
organização orientam a implementação original com os tokens da Escola do Dividendo.
Não foram reutilizados código, textos, dados financeiros, imagens ou marca da AGF.

O conector REA disponível exige um endpoint CDP local que não foi fornecido pelo
navegador de extensão. Não foi configurado outro acesso ou extraído código da AGF;
as observações acima são do navegador, não evidências emitidas pelo REA.

## Validação local

Foram executados 114 testes de aplicação com Node 22, lint geral e build do cliente
e de oito rotas públicas; sete testes do harness rodaram separadamente no quadro
operacional. O runner `tests/dividend.browser.mjs` cobre dez jornadas com a fonte
auditada e dez com dados sintéticos: paginação, ordem/filtros/versão, os 21 campos
de todos os 90 tickers, fórmulas, calendário, tooltips, casos de borda, prévia,
comparações, legado e 320px nos dois temas. A API dos testes é simulada localmente.

Os cinco testes de `tests/dividend-insights.test.mjs` também foram repetidos pelo
QA independente, incluindo os 52 textos distintos de meses presentes na fonte.
Não há migração ou mudança de API/banco nesta etapa. Não se trata de certificação
WCAG integral ou validação com leitores de tela/dispositivos físicos reais.

## Arquivos da implementação

- `src/pages/IncomeRanking.tsx`: exibição incremental de dez ações.
- `src/components/DividendResearch.tsx`: tabela/prévia e integração do dashboard.
- `src/components/DividendDashboard.tsx`: quatro seções, indicadores e insights.
- `src/components/dividend-research.css`: disposição responsiva e temas existentes.
- `dividend-insights.mjs` e `dividend-insights.d.mts`: cálculos puros e tipagem.
- `tests/dividend-insights.test.mjs` e `tests/dividend.browser.mjs`: regressões.
- `package.json`: inclui os testes novos no comando unitário existente.
- Este documento: campos, fórmulas, fontes e validação.

## Como conferir

Na prévia local `http://127.0.0.1:4199/app/ranking`, conferir dez empresas e clicar
em “Ver mais ações”. Experimentar busca, setor e ordenação; uma mudança reinicia
a exibição em dez. Abrir uma empresa e usar as âncoras, as barras e os valores
abreviados com teclado ou ponteiro. Comparar os campos com a segunda aba do Excel.
A prévia usa uma conta local fictícia e atende somente leituras, sem banco real.

Para os testes automatizados do projeto: `npm test`, `npm run lint`,
`npm run build` e `node tests/dividend.browser.mjs`, usando Node 22 e as
dependências já existentes. `EDIV_WORKBOOK_AUDIT` permite ao runner ler a extração
auditada local; sem essa variável ele gera 90 linhas sintéticas, sem embutir o
arquivo de análises no repositório ou no bundle do site.
