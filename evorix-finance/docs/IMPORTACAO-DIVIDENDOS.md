# Ranking de dividendos e informações completas

O Excel usa duas abas: `Ranking` e `Informações Completas`. Cada linha representa
um ticker. Os valores das duas abas devem coincidir; a ordem da primeira define
a ordem inicial do ranking. As 21 colunas são as de `dividend-analysis.mjs`.
As onze marcadas com `ranking: true` compõem o resumo. Ao abrir a empresa,
os 21 campos ficam disponíveis, com fonte e data de referência.

## Publicar uma atualização

1. Entre com uma conta autorizada a publicar pesquisas.
2. Abra a área da equipe no ranking e selecione o Excel original, com as duas abas.
3. Valide e confira a prévia completa, quantidade de ativos, datas e valores.
4. Informe somente metadados editoriais conhecidos e confirme a publicação.

A API valida o arquivo novamente ao publicar. A transação preserva versões
anteriores, registra alterações e reutiliza uma publicação idêntica. Prévia
não grava publicação. O acesso às informações continua exigindo autenticação;
o arquivo dos ativos não é incluído no JavaScript público do site.

## Significado e representação dos valores

- Percentuais permanecem frações: `0.115` aparece como `11,50%`; `1.06`, como `106,00%`.
- Campos numéricos são armazenados como strings brutas, preservando a precisão.
  A apresentação segue o formato do indicador, incluindo quantidades fracionárias.
- Zero é um valor; campo vazio permanece ausente. Valores negativos são preservados.
- Cotação é a referência do arquivo na data informada, sem substituição por preço ao vivo.
- Preço teto mantém a referência de yield de 6,81% e Tesouro IPCA+ 2037 do cabeçalho.
  Ele não é tratado como preço-alvo. Margem de segurança não é retorno esperado.
- Tese, riscos, horizonte e autoria não são fabricados quando ausentes no arquivo.

Cabeçalhos desconhecidos/repetidos, tickers duplicados, valores inválidos,
diferenças entre abas e datas inválidas impedem a importação. Limites existentes:
1 MB por arquivo, até 300 ativos, com proteção de tamanho descompactado.
CSV com as 21 colunas também aceita números canônicos com ponto decimal,
percentuais em fração e datas `AAAA-MM-DD`. O modelo legado continua suportado.

## Verificação desta entrega

Fonte fornecida pelo usuário: `Lista de Ações analisadas.xlsx`, SHA-256
`663894941a8a3a656a78ac93b3a011f8f9e560290e137062eacd1044182d4b6d`.
São 90 ativos, com referência em 20/10/2026. As duas abas coincidem e a auditoria
local comparou os 1.890 campos com o parser de importação. O arquivo original e
os dados completos da auditoria não são publicados no repositório.

Regressões: `tests/dividend-import.test.mjs`, `tests/company-workbook.test.mjs`,
`tests/dividend.integration.mjs` e `tests/dividend.browser.mjs`. A integração de
banco exige MySQL descartável local; produção não é ambiente de testes.
