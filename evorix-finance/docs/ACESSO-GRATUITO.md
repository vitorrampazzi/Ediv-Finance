# Visitantes e contas gratuitas

| Recurso                                          | Visitante                                          | Conta confirmada e autenticada       |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------------ |
| Home, mercado público, apresentação e assessoria | Acesso aberto                                      | Acesso aberto                        |
| Ranking real                                     | As três primeiras ações da publicação mais recente | Todas as ações, filtros e histórico  |
| Pesquisa da empresa                              | Títulos dos seis módulos e trecho da tese          | Conteúdo completo dos módulos e tese |
| Riscos, autoria, período e fonte                 | Visíveis na prévia disponível                      | Visíveis                             |
| Demonstração fictícia                            | Acesso completo e identificado                     | Acesso completo e identificado       |
| Educação                                         | Primeira aula, glossário e calculadora hipotética  | Todas as aulas e exercícios          |
| Assistente                                       | Guia local                                         | Guia local e IA, quando configurada  |
| Carteira, favoritos e conversas                  | Apresentação e convite para cadastro               | Recursos da conta                    |

O cadastro é gratuito. A assessoria permanece em pré-lançamento, sem cobrança.
O e-mail precisa ser confirmado e o usuário deve entrar na conta para liberar os recursos.

## Proteção na API

- `/api/rankings` recorta a resposta pública a três entradas, remove a tese completa
  e os seis módulos, e envia `access: preview`, `totalEntries` e `previewLimit`.
  Mantém riscos, fontes e metadados públicos das três entradas. Não envia as demais
  entradas ocultas. Visitantes não podem consultar versões anteriores pelo parâmetro
  `publication`. Rankings reais nunca são completados com dados fictícios.
- `/api/learning` entrega o conteúdo da primeira aula e o glossário para visitantes.
  As outras aulas têm apenas identificador, título e indicação de bloqueio. Os textos
  completos foram movidos para o servidor e não ficam no bundle público do frontend.
- `/api/assistant/chat` exige sessão válida antes de aplicar contadores ou chamar o
  provedor. `AI_USER_DAILY_LIMIT` limita tentativas por conta em uma janela de 24 horas,
  padrão 20. `AI_DAILY_LIMIT` mantém o limite compartilhado do projeto, padrão 100.
  Permanece o limite de oito requisições por IP em 15 minutos.
- Os contadores usam a tabela existente `request_limits`; nenhuma nova migração é necessária.
  Tentativas válidas podem consumir a cota da conta mesmo quando o provedor falha ou
  o limite compartilhado já foi atingido. O guia local permanece disponível.
- Respostas da API usam `Cache-Control: no-store`, inclusive as que dependem de sessão.

As chamadas de cadastro e login preservam o destino por `next`. O destino é validado
no cliente e no servidor, aceitando apenas rotas internas permitidas. O link de
confirmação de e-mail encaminha para o login com esse destino.

As prévias de visitantes permitem explorar o produto sem cadastro obrigatório na home.
Os convites explicam os benefícios da conta e sempre oferecem a opção de entrar.
Os limites são aplicados no servidor e não dependem de esconder HTML ou de CSS.
