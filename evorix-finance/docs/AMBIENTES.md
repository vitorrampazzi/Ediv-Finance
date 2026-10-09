# Produção e QA

## Organização

| Branch | Vercel                         | Assistente                                                          | Dados                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `main` | Production, domínio oficial    | Desativado na interface e na API                                    | Banco atual de produção                                    |
| `QA`   | Preview, URL própria da branch | Guia local e IA experimental, quando o provedor estiver configurado | Schema separado `ediv_finance_qa`, somente dados fictícios |

`deployment-policy.mjs` mantém `assistantInQa=false` na main e `true` na QA.
O build de Production e a API bloqueiam o assistente mesmo que essa configuração
ou uma variável de IA seja ativada por engano. As aulas, glossário, ranking,
pesquisas de empresas, análises e atendimento continuam disponíveis na produção.

O assistente é carregado em um módulo separado apenas no ambiente habilitado.
As chamadas e botões relacionados a ele também são condicionais. QA exibe um
aviso de avaliação. Nas implantações Vercel da branch QA, o backend recusa qualquer
schema diferente de `ediv_finance_qa` e usa o endereço de preview nos links de conta.

## Variáveis na Vercel

Para criar o schema vazio e um usuário técnico restrito, com as migrações atuais:

```powershell
npm run db:provision:qa -- SEU_EMAIL
```

O acesso administrativo do Aiven é lido de `.env.aiven`. O script recusa um schema
ou `.env.qa` existente. As senhas aleatórias do usuário técnico e da conta de
Administrador QA ficam somente em `.env.qa`, ignorado pelo Git. A conta QA é
independente da produção. Nunca publicar `QA_ADMIN_PASSWORD` na Vercel ou no chat.
Para executar o backend local com esse banco, use `npm run dev:api:qa`.

As credenciais de Production continuam em Production. Configure valores distintos
em **Preview**, com filtro de branch **QA**. Não copie o acesso ao banco real.

- MySQL: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE=ediv_finance_qa`,
  `MYSQL_USER` e `MYSQL_PASSWORD` de um usuário restrito ao schema QA,
  `MYSQL_SSL=true`, `MYSQL_SSL_CA`, `MYSQL_CONNECTION_LIMIT=3`.
- `SKIP_STARTUP_MIGRATIONS=true`: aplicar as migrações com o acesso administrativo
  antes do deploy. Não disponibilizar credenciais de DDL na função.
- `SMTP_URL` e `MAIL_FROM`: opcionais na QA. Sem SMTP, confirmação e recuperação
  mostram um link de teste na própria tela, somente nesse ambiente isolado.
  Production continua exigindo SMTP e remetente. Para avaliar entrega real,
  cadastrar um remetente validado com endereços controlados pela equipe.
- `AI_ASSISTANT_ENABLED=true`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
  `AI_DAILY_LIMIT=100` e `AI_USER_DAILY_LIMIT=20`: somente na QA para o provedor.
- `BRAPI_API_KEY`: opcional, de acordo com o plano do provedor.

Variáveis Secret da Vercel não podem ser reveladas após salvar. A chave Gemini
foi restringida ao Preview QA; SMTP e MAIL_FROM permaneceram em Production.
Não ampliar os segredos de banco para todos os Previews para contornar isso.

`NODE_ENV=production` também é usado nas funções Preview da Vercel. A distinção
entre os ambientes é `VERCEL_ENV`, não `NODE_ENV`. As variáveis de sistema devem
estar habilitadas. `VERCEL_BRANCH_URL` e `VERCEL_URL` definem automaticamente o
endereço da QA. Não apontar `APP_BASE_URL` da QA para o site oficial.

## Trabalho diário

```powershell
git switch QA
# desenvolver e revisar as mudanças
git add .
git commit -m "Aprimora o assistente educativo em QA"
git push origin QA
```

O push em QA gera um Preview; o push em main atualiza Production. Revisar o
endereço e o ambiente na Vercel antes de publicar. A branch QA não é uma cópia
automática de main: incorporar melhorias do site com `git merge main` na QA e
preservar `assistantInQa=true` se houver conflito nesse arquivo.

Para liberar melhorias do site sem a IA, trabalhar em main ou selecionar commits
específicos da QA. Não promover um Preview de QA nem fazer merge indiscriminado
de experimentos. Uma futura liberação da IA exige revisar explicitamente a
política de produção, as respostas, a privacidade e os custos do provedor.

## Desenvolvimento local e avaliação

Na QA, `npm run dev` disponibiliza o guia. A IA exige backend e as variáveis de
provedor. Para executar a suíte existente na main, o fixture isolado define
`EDIV_ASSISTANT_PREVIEW=true`; essa opção nunca vence o bloqueio de Production.

Conversar com o modelo não o treina automaticamente. Evoluir instruções,
conteúdo educativo e casos de avaliação com o corretor. Registrar perguntas,
respostas esperadas, erros e critérios de aprovação usando dados fictícios;
não enviar carteiras, credenciais ou mensagens privadas dos usuários.
