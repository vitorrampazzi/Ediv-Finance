# Históricos nas páginas de ações

Snapshot consultado em 26/10/2026: 90 empresas da planilha, 262.941 datas de
fechamento inequívocas e 8.027 eventos de proventos. As referências e os 21 campos
da publicação continuam provenientes da planilha. Os históricos têm origem e
data de coleta próprias; não são cotações ao vivo.

O servidor conserva o snapshot em `server/data/stock-history.json.gz` e o lê uma
vez por processo. `GET /api/rankings/history/:ticker` exige a mesma autenticação
do ranking completo, valida o ticker e responde somente dados da lista de 90
empresas. A API não consulta a AGF em tempo de execução e não modifica o banco.
O arquivo está incluído no pacote da função via `vercel.json`; não é um asset
público nem integra o bundle React.

O dataset empacotado é identificado pelo SHA256
`38f0ad94ebdd52acf0e757f2b71d76c47561b03edc93d313426a6891c81311e6`.
Ele deriva do manifesto de normalização
`8a1e3eb7eec077b845a29f210f41e6afa94f073e9d783677a18b33135bd9be80`.
Os testes conferem identidades, contagens, datas, valores e preservação dos eventos.

## Base dos preços da AGF (conferida em 06/11/2026)

A série de preços do snapshot não tem base única. O trecho final contínuo de
valores com até 2 casas decimais é o preço negociado: coincide com o `rawClose`
da brapi em todos os pontos de PETR4 (520 pregões, desde 22/08/2024) e ITUB4
(562 pregões, desde 21/06/2024), e VALE3 começa esse trecho em 05/08/2024. Os
valores anteriores, com muitas casas, foram ajustados por um método não
documentado: na PETR4, em 02/01/2012, a AGF tem 6,54325, o preço negociado foi
21,73 e o ajustado pela brapi é 4,5789. O trecho nominal tem mediana de 556
pregões por empresa; o menor é o da PASS3, com 117. Todas as séries terminam em
23/10/2026.

O que o servidor entrega desde então (`docs/MARGEM-E-HISTORICO.md`):

- `GET /api/rankings/history/:ticker` continua com a mesma autenticação, a fonte
  e todos os proventos, mas `prices` traz só o trecho nominal da AGF. O arquivo
  empacotado e seu hash não mudam.
- O gráfico de cotação usa `GET /api/rankings/price-series/:ticker`. A base
  ajustada é só o `adjustedClose` da brapi. A base sem ajuste usa o `rawClose`
  da brapi, depois os fechamentos consolidados pela Escola
  (`market_daily_closes`, migração 009) e por fim o trecho nominal da AGF. O
  `close` da brapi, ajustado só por eventos de ações, nunca é usado. Nenhum
  ajuste é recalculado no servidor.
- Os pregões e as lacunas seguem `server/market/b3-calendar.js` (feriados de
  2024 a 2026 conferidos na B3). Num ano sem calendário conferido (antes de
  2024 e, até a B3 publicar, 2027), um feriado não vira lacuna: o traço só é
  interrompido com 3 ou mais dias úteis seguidos sem dado, e a resposta avisa em
  `coverage.notes`. Na série completa da PETR4 na brapi, desde 2000, isso deixa
  0 lacunas onde a regra de segunda a sexta marcava 261.

A cotação usa a área e as linhas tracejadas do desenho Figma. As linhas Excel são
referências atuais constantes, não históricos de teto. Os períodos seguem as
datas efetivamente disponíveis; 5D significa os cinco últimos fechamentos.
Não existe série intradiária. O traço é interrompido no ponto marcado com
`gapBefore`, que vem depois de um ou mais pregões da B3 sem dado, sem criar
observações. Tabelas paginadas tornam os valores consultáveis por teclado.

Os proventos são agrupados exclusivamente pela data de pagamento informada. A
hachura distingue datas posteriores à coleta, sem declarar pagamento ocorrido ou
gerar estimativas. Os 8.027 eventos permanecem na tabela, inclusive repetições,
cinco datas de pagamento nulas e dois valores zero. Datas e valores ausentes não
são preenchidos. Os valores por ação mantêm precisão de até 12 casas decimais;
não são recalculados impostos ou ajustes por eventos societários.

Datas com preços conflitantes, fechamentos inválidos e identificadores não
confirmados foram excluídos da série aprovada. Não houve seleção pelo maior
volume nem associação automática de classes antigas. Fechamento não é tratado
como retorno total. LPA, lucros anuais, P/L histórico, dívida histórica e outros
indicadores coletados mas não aprovados ficaram fora deste dataset. Os respectivos
comparativos pontuais da planilha continuam explicitamente pontuais.

Na interface, uma falha de rede permite nova tentativa. Ausência de histórico
mantém os comparativos disponíveis da publicação. A troca de empresa cancela a
requisição anterior e impede exibir o histórico de outro ticker.

Não há atualização automática ou nova integração paga nesta entrega. Uma futura
atualização do snapshot deve repetir a normalização, verificar o manifesto e as
identidades, revisar os dados, gerar novamente o gzip e atualizar o teste de hash.
Publicação segue PR, revisão independente e os checks de qualidade e segurança.
