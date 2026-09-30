# Evorix Finance

Aplicação React/Vite com API Node.js/Express e persistência em MySQL. A página inicial é pública, com cotações demonstrativas da brapi.dev. A área `/app` exige conta e permite salvar operações manuais, favoritos e preferências.

## Requisitos

- Node.js 22.14 ou superior
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

## API de contas

- `POST /api/auth/register` — cria conta pendente e envia confirmação de e-mail.
- `POST /api/auth/verification/resend` — solicita outro link sem revelar se o endereço está cadastrado.
- `POST /api/auth/verify-email` — confirma um token de uso único e validade limitada.
- `POST /api/auth/login` — autentica e cria uma sessão no servidor.
- `GET /api/auth/me` — retorna apenas os dados básicos da sessão atual.
- `POST /api/auth/logout` — revoga a sessão no banco e limpa o cookie.
- `GET /api/market/assets?type=stock&search=PETR&page=1` — lista ações, fundos, ETFs e BDRs com busca, filtros e paginação.
- `GET /api/market/quotes?symbols=PETR4,ITUB4` — devolve cotações da brapi.dev, com limite de oito ativos por chamada.
- `GET /api/portfolio` — calcula posições e valores estimados usando cotações disponíveis, além do histórico recente.
- `POST /api/portfolio/transactions` — registra compra/venda manual e rejeita vendas que deixem a posição negativa.
- `GET/PUT /api/portfolio/preferences` — lê e salva preferência de risco, opções de notificação e o total investido informado pelo usuário.
- `GET /api/favorites` e `PUT/DELETE /api/favorites/:ticker` — favoritos persistidos por conta.
- `GET /api/health` — verifica a disponibilidade da API e do MySQL.

As senhas são armazenadas com Argon2id. Os tokens de confirmação e de sessão são aleatórios; somente seus hashes são persistidos. A sessão usa cookie `HttpOnly`, `SameSite=Strict` e, em produção, `Secure`. Requisições que alteram dados verificam a origem. Não há tokens de autenticação no `localStorage`.

## Produção

Configure `NODE_ENV=production`, `APP_BASE_URL` e `APP_ORIGIN` com o endereço HTTPS real, `MYSQL_SSL=true`, `SMTP_URL` e `MAIL_FROM`. Defina o segredo e a URL de conexão diretamente na plataforma de hospedagem; não os commite nem os envie pelo chat. Configure `BRAPI_API_KEY` no servidor se a cobertura além dos quatro tickers de sandbox for necessária.

Antes de publicar as cotações para usuários, confira os limites e os termos atuais do provedor; o plano gratuito é descrito como adequado a protótipos sem receita, e a recência de dados varia conforme o plano. Exiba sempre a fonte, a moeda e o horário retornado.

Crie um usuário de migração com permissões de DDL e configure `MYSQL_MIGRATION_USER` e `MYSQL_MIGRATION_PASSWORD` apenas no job de deploy. Execute `npm run db:migrate` antes de iniciar a API. A API de produção não executa migrações e deve usar um usuário MySQL separado, com acesso de leitura e escrita apenas às tabelas da aplicação. Configure o proxy HTTPS para encaminhar `/api` ao Node e, se ele encaminhar corretamente os cabeçalhos do cliente, ajuste `TRUST_PROXY=true`.

O limitador de tentativas padrão guarda contadores em memória. Em deploy com múltiplas instâncias, configure um armazenamento compartilhado para os limites antes de expor o serviço.

## Escopo e próximos passos

Este backend registra operações manuais de carteira, mas não envia ordens nem movimenta dinheiro. O valor total que o usuário informa é exibido como declaração pessoal; a estimativa de mercado usa apenas posições com quantidade cadastrada e cotação disponível. Preços podem atrasar ou falhar e não são saldo de corretora. Também não há recuperação de senha, MFA, exclusão/exportação de conta, pagamentos, conexão com corretoras, KYC ou trilha de auditoria financeira certificada. Antes de publicar, defina requisitos de privacidade, licença de dados, política de retenção, monitoramento e resposta a incidentes, e faça revisão de segurança independente.
