# Segurança da Ediv Finance

Atualização: 15 de outubro de 2026.

## Proteções aplicadas

| Camada | Política padrão |
| --- | --- |
| Firewall Vercel | Regra publicada `Ediv API - limite por IP`: caminho começa com `/api/`, 240 chamadas por 60 segundos por IP, resposta 429. |
| API compartilhada | 240 chamadas/minuto por IP, incluindo leituras e rotas inexistentes. |
| Escritas | 40 chamadas/minuto por IP, além dos limites específicos de cada recurso. |
| Cadastro | 5 tentativas/15 minutos por IP; 100 tentativas/hora no projeto. |
| Login | 8 tentativas/15 minutos por IP e 12/15 minutos por endereço normalizado. |
| Confirmação e recuperação por e-mail | 1 tentativa/minuto e 5/hora por destinatário, somando cadastro, reenvio e recuperação. |
| Orçamento de e-mail | 30 tentativas/10 minutos e 90/24 horas por projeto. |
| Picos locais | 60 chamadas/10 segundos por IP/sub-rede e até 32 respostas em andamento por instância. |
| Trabalho de senha | Até 2 operações Argon2 simultâneas por instância, sem fila ilimitada. |
| Banco | Fila de até 30 solicitações por instância; pool pequeno; TLS validado em produção; múltiplas instruções e `LOCAL_FILES` desativados. |
| Entrada | JSON de até 16 KB; CSV/XLSX de até 1 MB nas rotas de importação; rascunhos de equipe de até 1100 KB após autenticação/permissão. Corpos comprimidos são rejeitados. |

Os limites por IP agrupam IPv6 em sub-redes /56. Na Vercel, o IP vem dos cabeçalhos
que a própria plataforma fornece. Fora dela, `TRUST_PROXY` só deve ser habilitado
quando houver um proxy confiável em frente ao processo.

Os contadores persistem na tabela existente `request_limits`, compartilhada entre
instâncias. As chaves são resumos SHA-256 de namespace e identificador; IP/e-mail
não são armazenados em texto nesses contadores. Isso é pseudonimização, não
anonimização. Bloqueios locais têm cache limitado para reduzir consultas repetidas.
Se o armazenamento dos limites falhar, a API bloqueia temporariamente com 503.
429 inclui `Retry-After`; sobrecarga de senha/pool retorna 503 com nova tentativa.

Os orçamentos de cadastro/e-mail contam **tentativas**, inclusive endereços já
cadastrados ou inexistentes, e não garantem entrega. As janelas começam no primeiro
uso, não à meia-noite. Sem Turnstile, tráfego distribuído pode consumir essas cotas
e interromper cadastros temporariamente. Contas existentes continuam podendo entrar.
O teto de 32 é de respostas abertas; uma tarefa assíncrona pode continuar se o
cliente abandonar a conexão. Ele não é um limite global do serviço.

### SQL, sessão e autorização

- A revisão dos handlers não identificou SQL injection ou acesso indevido a recursos
  de outro usuário. Valores são passados por placeholders em `execute`; trechos
  dinâmicos revisados vêm de cláusulas fixas. Não substituir isso por filtros de
  palavras como `SELECT` ou `DROP`.
- Dados pessoais são filtrados pelo usuário da sessão. Ações da equipe exigem
  permissões e revalidam acesso nas transações relevantes.
- Senhas permanecem em Argon2id. Tokens opacos são armazenados como hash; cookies
  de produção usam Secure, HttpOnly e SameSite Strict. Login exige e-mail confirmado.
- Recuperação rejeita token inválido/expirado antes de calcular a nova senha e o
  revalida sob transação. Confirmação e reemissão seguem a ordem usuário → token.
- Cadastro e reenvio usam respostas genéricas para reduzir enumeração explícita.
  Isso não elimina todas as diferenças de tempo entre operações de rede.
- Origem e tipo de conteúdo são verificados antes do parser. Os cabeçalhos do HTML
  e da API protegem contra enquadramento, MIME sniffing e execução fora da CSP.
- Logs de respostas de erro são amostrados por método/status a cada 10 segundos,
  sem corpo, senha, token, endereço de e-mail ou IP. Os detalhes de SQL não vão ao cliente.

## Ativar proteção antirrobô no cadastro

A integração Cloudflare Turnstile está implementada, mas depende de chaves válidas.
Sem as duas chaves, os limites acima funcionam e o desafio não é exigido.

1. No [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/),
   crie um widget para `escoladodividendo.com.br` e para cada outro hostname onde
   realmente permitirá cadastro. Use modo Managed. Não é necessário transferir DNS.
2. Na Vercel, projeto `ediv-finance`, em **Settings → Environment Variables**, defina:
   - `TURNSTILE_SITE_KEY`: chave pública do widget.
   - `TURNSTILE_SECRET_KEY`: chave secreta, apenas no servidor.
3. Selecione o ambiente correto e faça redeploy. QA deve ter os hostnames e as chaves
   correspondentes ao seu ambiente; não liberar automaticamente qualquer Preview.
4. O formulário passa a exigir o desafio. O servidor valida cada token em Siteverify,
   incluindo uso único/expiração, ação `register` e hostname permitido, com timeout.

Uma chave sem a outra fecha o cadastro, preservando o login. Falha do provedor não
libera o cadastro sem verificação. A chave secreta nunca usa prefixo `VITE_` nem
aparece na resposta pública de disponibilidade. A CSP permite somente o domínio
necessário do provedor. Não usar chaves de teste em produção.

## Configuração operacional

Os padrões abaixo já funcionam sem variáveis novas:

| Variável | Padrão | Faixa aceita |
| --- | --- | --- |
| `SECURITY_API_PER_MINUTE` | 240 | 1–3000 |
| `SECURITY_WRITES_PER_MINUTE` | 40 | 1–500 |
| `SECURITY_REGISTRATIONS_PER_HOUR` | 100 | 1–5000 |
| `SECURITY_EMAIL_PER_DAY` | 90 | 1–10000 |
| `MYSQL_CONNECTION_LIMIT` | 3 na Vercel; 10 local | 1–30 |
| `MYSQL_QUEUE_LIMIT` | 30 | 1–200 |
| `REGISTRATION_ENABLED` | habilitado | `false` fecha novos cadastros |

A cota de e-mail deixa uma margem no plano gratuito do Resend, atualmente com
[100 envios/dia](https://resend.com/pricing). Ela não consulta o consumo real da
conta nem cobre outros projetos que usem o mesmo provedor. Ajustar limites junto
com as cotas contratadas antes de campanhas ou divulgação grande.

A regra do firewall foi configurada no painel e persiste entre deploys. Alterar
`SECURITY_API_PER_MINUTE` não altera essa regra automaticamente. Um rollback do Git
também não a remove. Regras extras de frequência exigiram upgrade no painel Hobby;
nenhum plano foi contratado. Para alterar a regra publicada, usar **Firewall → Rules**.
Mudanças nas variáveis de ambiente exigem novo deploy para chegar às Functions.
Monitorar 429/503, consumo de e-mail, latência e conexões do MySQL após divulgação.

Não ampliar os privilégios SQL da aplicação: ela precisa de CRUD nas tabelas
existentes, sem DDL ou privilégio FILE. Estas mudanças não exigem nova migração.
Credenciais, certificados e backups continuam fora do Git. Credenciais já expostas
precisam de tratamento separado; não foram alteradas nesta entrega.

## Verificações e limites

- Revisão de consultas, autorização, middleware e autenticação.
- Verificação de sintaxe dos módulos JavaScript, build TypeScript/Vite e lint.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas reportadas na consulta.
- Regra do firewall publicada e valores conferidos no painel: `/api/`, 240/60s/IP, 429.
- Não foi executada suíte de testes nem simulado ataque/carga contra produção.

Essas medidas reduzem o risco e o custo de abuso. Não são certificação de segurança
nem garantia de disponibilidade contra qualquer ataque distribuído. A proteção
antirrobô ainda precisa ser ativada com as chaves e validada no domínio real.

Referências: [OWASP — SQL](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html),
[OWASP — DoS](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html),
[express-rate-limit](https://express-rate-limit.mintlify.app/reference/configuration),
[cabeçalhos Vercel](https://vercel.com/docs/headers/request-headers),
[validação Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
