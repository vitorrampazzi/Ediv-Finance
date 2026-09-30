# Evorix Finance

Painel React/Vite com uma API Node.js/Express e persistência em MySQL. As telas de carteira, cotações e análises ainda usam dados fictícios; a API atual é a primeira etapa, focada em contas de usuário.

## Requisitos

- Node.js 22.14 ou superior
- MySQL 8.0 ou compatível, acessível a partir desta máquina
- Um serviço SMTP para enviar confirmações de e-mail em produção

## Configuração local

1. Instale as dependências:

   ```sh
   npm install
   ```

2. Crie um banco MySQL `evorix` e um usuário próprio para a aplicação. Em uma instalação local de desenvolvimento, o administrador MySQL pode executar o exemplo abaixo, trocando a senha por uma senha exclusiva:

   ```sql
   CREATE DATABASE evorix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'evorix_app'@'localhost' IDENTIFIED BY 'SUBSTITUA_POR_UMA_SENHA_LOCAL';
   GRANT ALL PRIVILEGES ON evorix.* TO 'evorix_app'@'localhost';
   ```

   O usuário amplo é apenas para desenvolvimento local, pois a API aplica a primeira migração ao iniciar. Em produção, separe o usuário da API (apenas `SELECT`, `INSERT`, `UPDATE`, `DELETE`) do usuário de migração.

3. Copie `.env.example` para `.env` e preencha `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER` e `MYSQL_PASSWORD`. O arquivo `.env` é ignorado pelo Git.

4. Em dois terminais, inicie a API e a interface:

   ```sh
   npm run dev:api
   ```

   ```sh
   npm run dev
   ```

   A interface usa o proxy local do Vite para encaminhar `/api` à API em `127.0.0.1:3001`. Em desenvolvimento, sem SMTP configurado, a API devolve um link temporário de confirmação para facilitar o primeiro cadastro. Esse link só é exposto fora de produção.

## API de contas

- `POST /api/auth/register` — cria conta pendente e envia confirmação de e-mail.
- `POST /api/auth/verification/resend` — solicita outro link sem revelar se o endereço está cadastrado.
- `POST /api/auth/verify-email` — confirma um token de uso único e validade limitada.
- `POST /api/auth/login` — autentica e cria uma sessão no servidor.
- `GET /api/auth/me` — retorna apenas os dados básicos da sessão atual.
- `POST /api/auth/logout` — revoga a sessão no banco e limpa o cookie.
- `GET /api/health` — verifica a disponibilidade da API e do MySQL.

As senhas são armazenadas com Argon2id. Os tokens de confirmação e de sessão são aleatórios; somente seus hashes são persistidos. A sessão usa cookie `HttpOnly`, `SameSite=Strict` e, em produção, `Secure`. Requisições que alteram dados verificam a origem. Não há tokens de autenticação no `localStorage`.

## Produção

Configure `NODE_ENV=production`, `APP_BASE_URL` e `APP_ORIGIN` com o endereço HTTPS real, `MYSQL_SSL=true`, `SMTP_URL` e `MAIL_FROM`. Defina o segredo e a URL de conexão diretamente na plataforma de hospedagem; não os commite nem os envie pelo chat.

Crie um usuário de migração com permissões de DDL e configure `MYSQL_MIGRATION_USER` e `MYSQL_MIGRATION_PASSWORD` apenas no job de deploy. Execute `npm run db:migrate` antes de iniciar a API. A API de produção não executa migrações e deve usar um usuário MySQL separado, com acesso de leitura e escrita apenas às tabelas da aplicação. Configure o proxy HTTPS para encaminhar `/api` ao Node e, se ele encaminhar corretamente os cabeçalhos do cliente, ajuste `TRUST_PROXY=true`.

O limitador de tentativas padrão guarda contadores em memória. Em deploy com múltiplas instâncias, configure um armazenamento compartilhado para os limites antes de expor o serviço.

## Escopo e próximos passos

Este primeiro backend não implementa recuperação de senha, autenticação multifator, exclusão/exportação de conta, livro-razão, ordens, pagamentos, conexão com corretoras, KYC ou trilhas de auditoria financeiras. O painel existente continua usando dados de demonstração e não deve ser tratado como serviço de investimento nem publicado como produto financeiro pronto. Antes de uso real, defina requisitos de privacidade e regulatórios, política de retenção, monitoramento e resposta a incidentes, e faça uma revisão de segurança independente.
