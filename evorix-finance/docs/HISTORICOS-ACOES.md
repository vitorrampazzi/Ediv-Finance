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

A cotação usa a área e as linhas tracejadas do desenho Figma. As linhas Excel são
referências atuais constantes, não históricos de teto. Os períodos seguem as
datas efetivamente disponíveis; 5D significa os cinco últimos fechamentos.
Não existe série intradiária. Lacunas superiores a sete dias interrompem o traço,
sem criar observações. Tabelas paginadas tornam os valores consultáveis por teclado.

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
