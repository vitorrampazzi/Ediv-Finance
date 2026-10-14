# Interface da Ediv

A interface acompanha a leitura de uma pesquisa: títulos, resumos de empresas, dados com rótulos e o texto da tese. A home apresenta o produto e os temas Empresa, Pesquisa e Dividendos.

## Texto

As orientações de [Humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) foram aplicadas aos textos de apresentação e às instruções das páginas. Use verbos diretos e nomeie o que a pessoa pode abrir ou consultar. Evite repetir a descrição no título, listas de benefícios vagas e sequências de slogans. Identificação de exemplos, unidades, fontes e instruções de acesso precisam continuar visíveis.

## Visual

`display-title` usa Georgia, disponível no sistema, para títulos editoriais. A navegação, os formulários e os textos de leitura mantêm a fonte atual. Os números usam a fonte monoespaçada existente. O fundo continua escuro; o verde identifica ações e controles. Não há carregamento de uma nova fonte externa.

As pesquisas da home aparecem em linhas com empresa, potencial e prazo. A lista de mercado usa colunas no computador e linhas no celular. Informações adicionais ficam na página da empresa.

## Painel da home

`RankingPreview.tsx` permite alternar entre Empresa, Pesquisa e Dividendos. Cada tema apresenta um fluxo animado e um link para a página correspondente, usando o endereço da área logada quando houver uma sessão. O painel aceita teclado e respeita a preferência por movimento reduzido. Ele não grava dados nem faz chamadas à API.

Autenticação, permissões, publicações, vídeos e progresso das aulas seguem os fluxos existentes.
