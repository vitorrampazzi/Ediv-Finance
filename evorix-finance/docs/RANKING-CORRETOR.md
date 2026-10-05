# Campos do ranking definidos pelo corretor

Referência: arquivo “Lista de Ações e modulos necessarios.xlsx”, primeira aba,
F3:F28 e H3:H9. O arquivo contém 25 códigos para pesquisa e seis módulos.
Não contém uma classificação, valores contábeis ou previsões.

## Importação

Baixe o modelo na área da equipe do ranking. Uma linha por ação, primeira aba
do XLSX ou CSV UTF-8, até 300 ativos e 1 MB. Confira a prévia antes de publicar.
Continuam obrigatórios `ticker`, `empresa` e `potencial_percentual`.
A ordem das linhas define a ordem publicada. A lista recebida não define essa ordem.

| Módulo                                       | Coluna no modelo         | Conteúdo                                                       |
| -------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| Balanço patrimonial                          | `balanco_patrimonial`    | Texto e números selecionados pelo responsável                  |
| DRE — Demonstração do Resultado do Exercício | `dre`                    | Texto e números selecionados pelo responsável                  |
| Fluxo de caixa                               | `fluxo_de_caixa`         | Texto e números selecionados pelo responsável                  |
| Informações da empresa                       | `informacoes_da_empresa` | Dados cadastrais fornecidos pelo responsável                   |
| Dívida líquida                               | `divida_liquida`         | Valor, unidade, data e comentários fornecidos pelo responsável |
| Estatísticas                                 | `estatisticas`           | Indicadores e suas definições fornecidos pelo responsável      |

Os seis campos são opcionais, com até 5.000 caracteres cada. Inclua unidades,
datas e períodos junto de cada valor. Para múltiplas linhas dentro de uma célula,
use quebras de linha do Excel ou um campo CSV entre aspas.
`periodo_referencia` aceita até 120 caracteres, e `fonte_dados` até 500.
Se os módulos usam períodos ou fontes diferentes, informe-os nos respectivos textos.
Campos vazios aparecem como não informados, sem substituição por zero.

Não há extração automática de balanços, execução de fórmulas, cálculo de indicadores
ou atualização desses módulos por uma API. São conteúdos informados pela equipe,
preservados no histórico de cada publicação. Arquivos antigos continuam compatíveis.
A estrutura existente `ranking_publications.entries_json` comporta esses campos;
esta alteração não exige nova migração do MySQL.

## Demonstração visual

Para contas autenticadas, enquanto não existe publicação real, a interface apresenta seis empresas inventadas
(DEMO1 a DEMO6) com números fictícios, os seis módulos e um gráfico de receita
ilustrativo. Os dados são fixtures locais em `src/lib/rankingDemo.ts`, sem gravação
no banco, importação, negociação ou inclusão nos favoritos. Não são pesquisa do
corretor, preços atuais nem recomendações.

O botão “Explorar demonstração” permite ver os exemplos a qualquer momento;
“Ver publicações da equipe” retorna aos dados da API. A URL `/ranking?visual=demo`
abre os exemplos depois de entrar na conta. Visitantes veem a apresentação e o convite para cadastro. Publicações reais não são preenchidas com valores
simulados, e uma falha de API continua sendo identificada. Na home, os destaques de contas autenticadas
mostram exemplos identificados quando a API confirma que ainda não há publicação.

## Ações recebidas para pesquisa

VALE3, ELET3, CXSE3, ITSA4, CMIG4, CLSC4, IRBR3, BBSE3, ODPV3, WIZC3,
PSSA3, PETR4, BBAS3, CEBR6, ISAE4, CPFE3, EGIE3, TAEE11, NEOE3, ALUP11,
CPLE6, RANI3, KLBN11, PRIO3 e VAMO3.

Os códigos foram transcritos do arquivo. Não foram verificados quanto à negociação
atual ou eventuais mudanças de ticker. A lista não foi publicada como recomendação.

Para transformar estes módulos em tabelas numéricas, gráficos ou comparações
automáticas, ainda é necessário definir com o corretor os indicadores exatos,
unidades, períodos, fontes e critérios de classificação.
