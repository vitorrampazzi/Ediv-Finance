# Interface da Ediv

A interface acompanha a leitura de uma pesquisa: títulos, resumos de empresas, dados com rótulos e o texto da tese. A home apresenta o produto e uma atividade curta sobre dividendos.

## Texto

As orientações de [Humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) foram aplicadas aos textos de apresentação e às instruções das páginas. Use verbos diretos e nomeie o que a pessoa pode abrir ou consultar. Evite repetir a descrição no título, listas de benefícios vagas e sequências de slogans. Identificação de exemplos, unidades, fontes e instruções de acesso precisam continuar visíveis.

## Visual

`display-title` usa Georgia, disponível no sistema, para títulos editoriais. A navegação, os formulários e os textos de leitura mantêm a fonte atual. Os números usam a fonte monoespaçada existente. O fundo continua escuro; o verde identifica ações e controles. Não há carregamento de uma nova fonte externa.

As pesquisas da home aparecem em linhas com empresa, potencial e prazo. A lista de mercado usa colunas no computador e linhas no celular. Informações adicionais ficam na página da empresa.

## Exemplo de dividendos

`RankingPreview.tsx` contém uma atividade local com lucro de R$ 100 milhões e 50 milhões de ações. A pessoa ajusta a distribuição entre 10% e 90%. O valor por ação é o total distribuído dividido pela quantidade de ações. O exemplo é simplificado, identificado como didático e não usa dados da conta ou do mercado. O controle tem rótulo e aceita teclado. Ele não grava dados nem faz chamadas à API.

Autenticação, permissões, publicações, vídeos e progresso das aulas seguem os fluxos existentes.
