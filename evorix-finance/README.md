# Ediv Finance

Aplicação React/Vite com API Node.js/Express e persistência em MySQL. A página inicial é pública, com cotações consultadas da brapi.dev. A área `/app` exige conta e permite salvar operações manuais, favoritos e preferências.

O nome Ediv é uma abreviação de Escola do Dividendo. A rota `/ranking` apresenta o acesso ao ranking; a lista exige conta confirmada. Analistas e Administradores criam pesquisas pelo editor ou importam CSV/Excel (.xlsx), revisam a prévia e publicam versões com histórico.

## Educação, ranking e atualização

A experiência principal é o ranking de cenários, apoiado por uma trilha de aprendizado. O assistente educativo está disponível apenas na QA para avaliação. Autoria, categoria, registro, contato e horários continuam sem preenchimento até serem informados. Não há cobrança habilitada.

Para convidar os primeiros usuários, consulte o [guia de divulgação da versão beta](docs/DIVULGACAO-BETA.md). A Administração mostra as pendências do lançamento e permite verificar a conexão SMTP sem enviar mensagens.

Veja [as mudanças e a ordem de publicação](docs/ATUALIZACAO-EDIV.md), [os perfis e o painel de administração](docs/PERMISSOES.md) e [a rotina de backup criptografado](docs/BACKUP.md). As migrações até 007 devem estar aplicadas antes do deploy.

## Requisitos

- Node.js 22.x (22.14 ou superior dentro desta versão)
- MySQL 8.0 ou compatível, acessível a partir desta máquina
- Um serviço SMTP para enviar confirmações de e-mail em produção

## Configuração local

1. Instale as dependências:

   ```sh
   npm install
   ```

2. O schema desta instalação é `evorix_finance`. Não use o schema `taxi_app`. Crie contas separadas para a API e para as migrações; substitua as senhas de exemplo por valores fortes e exclusivos:

   ```sql
   CREATE DATABASE IF NOT EXISTS evorix_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'evorix_app'@'127.0.0.1' IDENTIFIED BY 'SENHA_FORTE_DA_API';
   GRANT SELECT, INSERT, UPDATE, DELETE ON evorix_finance.* TO 'evorix_app'@'127.0.0.1';
   CREATE USER IF NOT EXISTS 'evorix_migrator'@'127.0.0.1' IDENTIFIED BY 'OUTRA_SENHA_FORTE';
   GRANT SELECT, INSERT, CREATE, REFERENCES ON evorix_finance.* TO 'evorix_migrator'@'127.0.0.1';
   ```

   A API usa apenas leitura e gravação de dados. O usuário migrador cria tabelas; em produção, execute as migrações no deploy.

3. Copie `.env.example` para `.env` e preencha `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD` com os dados de `evorix_app`. Configure também `MYSQL_MIGRATION_USER` e `MYSQL_MIGRATION_PASSWORD` com os dados de `evorix_migrator`. O arquivo `.env` é ignorado pelo Git. Não envie credenciais pelo chat.

4. Em dois terminais, inicie a API e a interface:

   ```sh
   npm run dev:api
   ```

   ```sh
   npm run dev
   ```

   A lista pública de ativos e cotações da B3 funciona sem token. Configure `BRAPI_API_KEY` no `.env` local apenas se precisar de dados adicionais do provedor; a chave é usada só pelo servidor e nunca deve ser incluída no frontend.

   A interface usa o proxy local do Vite para encaminhar `/api` à API em `127.0.0.1:3001`. Em desenvolvimento, sem SMTP configurado, a API devolve um link temporário de confirmação para facilitar o primeiro cadastro. Esse link só é exposto fora de produção.

5. Configure o primeiro Administrador pelo comando descrito em [PERMISSOES.md](docs/PERMISSOES.md). Depois, conceda o perfil Analista às contas confirmadas da equipe em `/app/admin`. Novos usuários recebem apenas Usuário. As permissões ficam no banco e são verificadas pela API.

### Importação da lista de renda

O assessor pode preparar a lista no Excel e salvá-la como **CSV UTF-8 ou XLSX** (delimitado por vírgulas ou ponto e vírgula). Use o modelo disponível na página `/ranking`. As colunas obrigatórias são `ticker`, `empresa` e `potencial_percentual`; `preco_alvo`, `horizonte_meses`, `tese`, `riscos` e `setor` são opcionais. A ordem das linhas define a posição. Percentuais e valores com vírgula são aceitos em CSV separado por ponto e vírgula.

O upload aceita até 300 ativos e cria uma publicação independente com histórico, após validar o arquivo inteiro e confirmar a prévia. A função exige perfil Analista ou Administrador. Também é possível criar o rascunho no editor da página, usando os mesmos campos e a mesma validação. O site identifica a lista como fornecida pelo assessor e exibe um aviso de que projeções podem estar erradas e não garantem retorno.

Para aplicar migrations na base gerenciada Aiven já configurada, use `npm run db:migrate:aiven`. O comando usa a conta administrativa local de `.env.aiven` só para aplicar DDL; ele não copia nem altera os dados atuais.

## API de contas

- `POST /api/auth/register` — cria conta pendente e envia confirmação de e-mail.
- `POST /api/auth/verification/resend` — solicita outro link sem revelar se o endereço está cadastrado.
- `POST /api/auth/verify-email` — confirma um token de uso único e validade limitada.
- `POST /api/auth/login` — autentica e cria uma sessão no servidor.
- `GET /api/auth/me` — retorna apenas os dados básicos da sessão atual.
- `POST /api/auth/logout` — revoga a sessão no banco e limpa o cookie.
- `GET /api/market/assets?type=stock&search=PETR&page=1` — lista ações, fundos, ETFs e BDRs com busca, filtros e paginação.
- `GET /api/market/quotes?symbols=PETR4,ITUB4` — devolve cotações da brapi.dev, com limite de oito ativos por chamada.
- `GET /api/rankings` — lista as projeções importadas mais recentemente e informa se a sessão pode publicar.
- `POST /api/rankings` — publica uma versão com CSV UTF-8 ou XLSX; requer sessão confirmada de Analista ou Administrador.
- `GET /api/admin/summary`, `/api/admin/users`, `/api/admin/audit` — contagens, contas paginadas e histórico, somente Administrador.
- `PATCH /api/admin/users/:id/access` — altera perfil/bloqueio e encerra sessões da conta, somente Administrador.
- `GET /api/portfolio` — calcula posições e valores estimados usando cotações disponíveis, além do histórico recente.
- `POST /api/portfolio/transactions` — registra compra/venda manual e rejeita vendas que deixem a posição negativa.
- `GET/PUT /api/portfolio/preferences` — lê e salva preferência de risco, opções de notificação e o total investido informado pelo usuário.
- `GET /api/favorites` e `PUT/DELETE /api/favorites/:ticker` — favoritos persistidos por conta.
- `GET /api/assistant/status` — informa se o assistente com IA está ligado, sem revelar a chave.
- `POST /api/assistant/chat` — envia até dez mensagens recentes ao Gemini; limitado a oito chamadas por IP a cada 15 minutos.
- `GET /api/health` — verifica a disponibilidade da API e do MySQL.

As senhas são armazenadas com Argon2id. Os tokens de confirmação e de sessão são aleatórios; somente seus hashes são persistidos. A sessão usa cookie `HttpOnly`, `SameSite=Strict` e, em produção, `Secure`. Requisições que alteram dados verificam a origem. Não há tokens de autenticação no `localStorage`.

## Assistente com IA (experimental)

O chat continua funcionando com respostas locais quando a integração estiver desligada. Para experimentar Gemini no plano gratuito, crie uma chave no Google AI Studio e configure `AI_ASSISTANT_ENABLED=true` e `GEMINI_API_KEY` no `.env` local; `GEMINI_MODEL` é opcional e usa `gemini-3.8-flash` por padrão. A chave fica somente no servidor e não deve ser enviada pelo chat nem colocada em variáveis `VITE_*`.

Antes do primeiro envio, o chat pede confirmação e avisa que a pergunta e o histórico vão ao Google. Nos termos da faixa gratuita, o Google pode usar prompts e respostas para melhorar os serviços e permitir revisão humana. Não use essa faixa para dados pessoais, confidenciais ou financeiros; não envie carteira, saldo, extrato, CPF, contato ou credenciais. A integração não carrega dados da conta e o prompt limita o assistente a conteúdo educativo, sem recomendação individualizada nem cotação em tempo real. A cota e disponibilidade gratuita podem mudar. Para evitar cobrança inesperada, não vincule faturamento ao projeto usado na avaliação e confira os limites e as condições atuais no AI Studio.

Para habilitar no site publicado, configure `AI_ASSISTANT_ENABLED=true`, `GEMINI_API_KEY` e, se necessário, `GEMINI_MODEL` em **Vercel → Settings → Environment Variables** no ambiente desejado e faça um novo deploy. Até haver chave e flag ativada, a interface usa as respostas locais. Os limites por IP e global ficam no MySQL; AI_DAILY_LIMIT tem padrão 100 em uma janela de 24 horas. A integração não substitui os controles do provedor.

## Produção

Configure `NODE_ENV=production`, `APP_BASE_URL` e `APP_ORIGIN` com o endereço HTTPS real, `MYSQL_SSL=true`, `SMTP_URL` e `MAIL_FROM`. Defina o segredo e a URL de conexão diretamente na plataforma de hospedagem; não os commite nem os envie pelo chat. Configure `BRAPI_API_KEY` no servidor se a cobertura além dos quatro tickers de sandbox for necessária.

Antes de publicar as cotações para usuários, confira os limites e os termos atuais do provedor; o plano gratuito é descrito como adequado a protótipos sem receita, e a recência de dados varia conforme o plano. Exiba sempre a fonte, a moeda e o horário retornado.

Crie um usuário de migração com permissões de DDL e configure `MYSQL_MIGRATION_USER` e `MYSQL_MIGRATION_PASSWORD` apenas no job de deploy. Execute `npm run db:migrate` antes de iniciar a API. A API de produção não executa migrações e deve usar um usuário MySQL separado, com acesso de leitura e escrita apenas às tabelas da aplicação. Configure o proxy HTTPS para encaminhar `/api` ao Node e, se ele encaminhar corretamente os cabeçalhos do cliente, ajuste `TRUST_PROXY=true`.

O limitador de tentativas padrão guarda contadores em memória. Em deploy com múltiplas instâncias, configure um armazenamento compartilhado para os limites antes de expor o serviço.

## Deploy na Vercel

O repositório está configurado para build do Vite, servir a SPA também em rotas internas (como `/app/carteira`) e encaminhar `/api/*` para a função Node em `api/[...path].js`. A Vercel não hospeda o MySQL: antes do primeiro deploy, use um MySQL gerenciado com TLS habilitado e acesso de rede liberado para a aplicação. Não use `127.0.0.1` como host do banco em produção.

1. Importe o repositório na Vercel e mantenha o Root Directory apontando para a pasta que contém este `package.json`. O framework é Vite; os comandos são `npm run build` e saída `dist`.
2. Cadastre no ambiente **Production** as variáveis `NODE_ENV=production`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE=evorix_finance`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SSL=true`, `MYSQL_SSL_CA` (conteúdo do CA do provedor, se exigido), `MYSQL_CONNECTION_LIMIT=3`, `APP_BASE_URL` e `APP_ORIGIN` (ambos com a URL HTTPS oficial), `SMTP_URL` e `MAIL_FROM`. Adicione `BRAPI_API_KEY` se tiver uma chave. Segredos devem ser cadastrados nas configurações da Vercel, nunca commitados.
3. Execute `npm run db:migrate` uma vez contra o MySQL gerenciado com `MYSQL_MIGRATION_USER` e `MYSQL_MIGRATION_PASSWORD` configurados apenas no ambiente seguro de migração. Não conceda DDL ao usuário usado pela API.
4. Faça deploy e confira `https://SEU-DOMINIO/api/health`, cadastro, confirmação de e-mail, login, carteira e favoritos. Para previews, a função reconhece automaticamente o domínio da implantação Vercel para validação de origem; o link de confirmação continua usando `APP_BASE_URL`, então teste o fluxo completo no domínio oficial.

Limitadores e cache de cotações/listagem usam tabelas compartilhadas no MySQL. Há cache em memória para reduzir leituras locais, mas os contadores são persistidos entre instâncias. O MySQL gerenciado precisa aceitar conexões de saída da Vercel (ou usar um proxy/serviço de banco compatível), e o plano de hospedagem deve permitir esse padrão de conexão.

### Cópia inicial para Aiven (teste)

O comando `npm run db:transfer:aiven` cria o schema no destino, aplica as migrations e copia usuários, operações, preferências, favoritos e resumos do banco local definido em `.env`. Antes de usar, crie uma instância MySQL no Aiven, copie `.env.aiven.example` para `.env.aiven`, baixe o CA do serviço para `.aiven/ca.pem` e preencha host, porta, usuário e senha. Depois confira os dados do destino e execute o comando. Ele cancela a cópia se as tabelas de dados do destino não estiverem vazias; não sobrescreve dados existentes. Sessões e links de confirmação pendentes não são transferidos por segurança. Use a conta administrativa Aiven somente nessa cópia; para a API de produção, crie um usuário separado com permissões restritas.

Após a transferência, `npm run db:bootstrap:aiven-app` cria o usuário de runtime com privilégios de leitura e escrita e grava os dados de conexão localmente em `.env.aiven.runtime` (ignorado pelo Git). Para rodar a API local apontando para Aiven, inicie `npm run dev:api:aiven` em um terminal e `npm run dev` em outro. Esse perfil pula migrations automáticas porque o usuário da API não tem privilégios de DDL. A credencial de administração continua apenas no arquivo local `.env.aiven`, usada para operações administrativas pontuais.

## Escopo e próximos passos

Este backend registra operações manuais de carteira, mas não envia ordens nem movimenta dinheiro. O valor total que o usuário informa é exibido como declaração pessoal; a estimativa de mercado usa apenas posições com quantidade cadastrada e cotação disponível. Preços podem atrasar ou falhar e não são saldo de corretora. Recuperação de senha, exclusão/exportação de conta e encerramento de sessões estão disponíveis. Não há MFA, pagamentos, conexão automática com corretoras, KYC ou trilha de auditoria financeira certificada. Antes de publicar, defina requisitos de privacidade, licença de dados, política de retenção, monitoramento e resposta a incidentes, e faça revisão de segurança independente.

## Ambientes de publicação

`main` publica o site sem assistente. `QA` mantém o assistente experimental em
Preview, com banco separado e dados fictícios. Consulte [AMBIENTES.md](docs/AMBIENTES.md)
para configuração e fluxo de trabalho.

## Qualidade e publicação

Veja [as melhorias técnicas, exportação segura e pendências da equipe](docs/MELHORIAS-LANCAMENTO.md). O CI usa MySQL descartável e não recebe credenciais do Aiven.
