# Ranking público e pesquisa da empresa

A home consulta `GET /api/rankings/public` após carregar no navegador. O build
continua gerando HTML sem consultar banco ou carregar a planilha. A última
publicação salva é a única fonte: não há dados oficiais embutidos no bundle,
cópia de registros, nova importação, migração ou alteração da metodologia.

O endpoint seleciona apenas id, título, data e entradas da última publicação.
A resposta usa whitelist de posição, ticker, empresa, setor e dos 18 indicadores
de dividendos já existentes. Autoria, documentos profissionais, nome do arquivo,
rascunhos, histórico, tese, riscos e controles administrativos ficam de fora.
As rotas completas, comparações e gravações continuam exigindo autenticação e
as permissões existentes. Os limites gerais da API continuam ativos.

A ordem corresponde à posição gravada na publicação. A home começa com dez
linhas e acrescenta dez por clique até acabar. Não há classificação por retorno,
recomendação nova nem substituição de ausências por zero. Carregamento, ausência
de publicação e erro têm estados próprios; erro permite tentar novamente.
Nenhum estado usa empresas demonstrativas como fallback.

O clique em uma empresa preserva ticker e publicação no destino protegido.
O visitante entra na conta para ler a pesquisa completa. Não foi aberto acesso
anônimo às funções de administração ou ao conteúdo completo das publicações.

A página individual usa cabeçalho com identidade e indicadores resumidos,
navegação entre seções, comparativos e calendário. Preserva os 21 campos reais
nos quatro grupos existentes e os formatos, fórmulas e explicações documentados
em [DASHBOARD-DIVIDENDOS.md](DASHBOARD-DIVIDENDOS.md).

A referência visual AGF foi observada pelo navegador integrado, inclusive o
cabeçalho, navegação fixa, agenda e organização ampla dos gráficos. A aparência
usa os tokens e a tipografia da Escola do Dividendo; nenhum código, imagem,
texto, série financeira ou valor da AGF foi copiado para a implementação.
REA 6.5.0 está conectado, mas a extensão não forneceu o endpoint CDP necessário
para observar essa aba pelo REA. A observação visual não é apresentada como
captura de runtime pelo REA. Nenhuma configuração foi alterada para isso.

Os valores são referências e estimativas da planilha, não cotações ao vivo.
Sem séries históricas de preços/resultados/proventos na fonte, não se desenham
históricos fictícios nem controles de períodos que não teriam dados reais.
Calendário mostra os meses habituais de anúncio, sem prometer pagamento.

Validação desta etapa é focal: serializer público com sentinelas privadas,
integração anônima/privada na suíte existente, paginação/links/estados e
comportamento do dashboard. Os checks obrigatórios quality e dependency-security
precisam passar no commit final antes de integrar por PR. Não certifica auditoria
WCAG completa, leitores reais, todos os navegadores ou cotações em tempo real.
