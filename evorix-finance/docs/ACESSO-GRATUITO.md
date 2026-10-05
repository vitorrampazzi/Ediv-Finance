# Visitantes e contas gratuitas

| Recurso                                          | Visitante                                         | Conta confirmada e autenticada       |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------ |
| Home, mercado público, apresentação e assessoria | Acesso aberto                                     | Acesso aberto                        |
| Ranking real                                     | Apresentação e convite para cadastro              | Todas as ações, filtros e histórico  |
| Pesquisa da empresa                              | Apresentação dos módulos, sem dados               | Conteúdo completo dos módulos e tese |
| Riscos, autoria, período e fonte                 | Avisos gerais sobre previsões e riscos            | Visíveis                             |
| Demonstração fictícia                            | Apresentação e convite para cadastro              | Acesso completo e identificado       |
| Educação                                         | Primeira aula, glossário e calculadora hipotética | Todas as aulas e exercícios          |
| Assistente                                       | Guia local                                        | Guia local e IA, quando configurada  |
| Carteira, favoritos e conversas                  | Apresentação e convite para cadastro              | Recursos da conta                    |

O cadastro é gratuito. A assessoria permanece em pré-lançamento, sem cobrança.
O e-mail precisa ser confirmado e o usuário deve entrar na conta para liberar os recursos.

## Proteção na API

- `/api/rankings` exige sessão válida e responde 401 a visitantes, antes de consultar
  as publicações. Nenhuma ação, preço, indicador, contagem ou versão histórica do ranking
  é entregue sem autenticação. A home e `/ranking` mostram apenas a apresentação do
  recurso e os convites de cadastro/login. Nem a demonstração aparece sem login,
  inclusive quando o visitante usa `?visual=demo`. A demonstração é fictícia e
  não é conteúdo sigiloso: suas fixtures continuam no código estático do frontend.
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

Visitantes podem conhecer o produto pela home, pelo mercado público, pela primeira aula e pelo glossário.
Os convites explicam os benefícios da conta e sempre oferecem a opção de entrar.
Os limites são aplicados no servidor e não dependem de esconder HTML ou de CSS.
