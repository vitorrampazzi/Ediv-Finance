# Leitura personalizada da carteira

O painel apresenta valores calculados pela API a partir dos registros do usuário.
Não usa IA, não envia a carteira a um modelo e não promete retornos futuros.

- **Valor de mercado estimado:** quantidade aberta multiplicada por cotação válida
  em BRL. Sem preço, a posição fica fora dessa soma e aparece na cobertura.
- **Variação frente ao custo:** valor estimado menos custo das mesmas posições
  cotadas. O percentual usa o custo dessas posições; não inclui vendas anteriores,
  proventos ou impostos. Não é variação diária nem rentabilidade total histórica.
- **Concentração e distribuição:** pesos pelo custo das posições abertas,
  incluindo posições sem preço. Não inferem adequação ao perfil ou risco setorial.
- **Contribuições:** maiores diferenças em reais frente ao custo, por ativo.
- **Resultado realizado e proventos:** mostrados separadamente, conforme registros
  de vendas e eventos marcados como recebidos no ledger.
- **Cobertura:** posições e proporção do custo com cotação utilizável. Cotação
  inválida, ausente ou em outra moeda não é tratada como valor zero.

Valores monetários usam oito casas com BigInt no servidor. Percentuais têm quatro
casas no contrato e são arredondados apenas na apresentação. Base de custo zero
gera percentual indisponível. Valores declarados no perfil continuam separados.

Os indicadores de Favoritos descrevem a variação disponibilizada pelo provedor,
nunca o retorno da carteira. Datas de consulta não são datas de negociação.

O layout autenticado usa seções abertas, tipografia e divisórias: visão geral,
carteira, navegação, análises e favoritos. As ferramentas de registro, importação,
correção, exclusão, pesquisa e atendimento preservam as permissões atuais.
