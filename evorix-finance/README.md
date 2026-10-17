# Ediv Finance

## Colaboração entre sessões

Este projeto possui um harness para três sessões: coordenação, interface e backend/qualidade.
Leia [AGENTS.md](AGENTS.md) e o [contexto compartilhado](docs/harness/CONTEXTO.md)
ao iniciar ou retomar trabalho. Use `npm run harness:status` para consultar o quadro
e `npm run test:harness` para validar reservas e atualizações. O [fluxo](docs/harness/FLUXO.md)
explica como reservar arquivos, registrar entregas e atualizar as outras sessões.
Os chats compartilham os arquivos deste diretório; cada chat mantém seu próprio histórico.

A React/Vite application with a Node.js/Express API and MySQL persistence. The public home page includes stock analysis backed by brapi.dev. The `/app` area requires a verified account and brings together research rankings, company research pages, learning, and support.

Ediv is short for Escola do Dividendo. The `/ranking` route introduces the ranking; viewing the list requires a verified account. Analysts and Administrators create research in the editor or import CSV/Excel (.xlsx) files, review a preview, and publish versioned research with history.

For an architecture overview and a starting point for contributing, see the [developer guide](docs/GUIA-DESENVOLVEDOR.md). The `/metodologia` page explains how to read the research and how publication works; professional details remain configurable.

## Education, rankings, and updates

The main experience is a ranking of research scenarios supported by a learning path. The educational assistant is available only in QA for evaluation. Author identity, professional category, registration, contact details, and service hours remain blank until supplied. Billing is not enabled.

Before inviting the first users, consult the [beta launch guide](docs/DIVULGACAO-BETA.md). The Administration area lists launch requirements and can check the SMTP connection without sending messages.

See [changes and publication order](docs/ATUALIZACAO-EDIV.md), [roles and the administration panel](docs/PERMISSOES.md), and [the encrypted backup procedure](docs/BACKUP.md). Migrations through 007 must be applied before deployment.

## Requirements

- Node.js 22.x (22.14 or later within this major version)
- MySQL 8.0 or a compatible database accessible from this machine
- An SMTP service for production email verification

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. This installation uses the `evorix_finance` schema. Do not use the `taxi_app` schema. Create separate accounts for the API and migrations; replace the example passwords with strong, unique values:

   ```sql
   CREATE DATABASE IF NOT EXISTS evorix_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'evorix_app'@'127.0.0.1' IDENTIFIED BY 'SENHA_FORTE_DA_API';
   GRANT SELECT, INSERT, UPDATE, DELETE ON evorix_finance.* TO 'evorix_app'@'127.0.0.1';
   CREATE USER IF NOT EXISTS 'evorix_migrator'@'127.0.0.1' IDENTIFIED BY 'OUTRA_SENHA_FORTE';
   GRANT SELECT, INSERT, CREATE, REFERENCES ON evorix_finance.* TO 'evorix_migrator'@'127.0.0.1';
   ```

   The API only reads and writes application data. The migration user creates tables; in production, apply migrations before deploying code that depends on them.

3. Copy `.env.example` to `.env` and fill in `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` with the `evorix_app` connection details. Also configure `MYSQL_MIGRATION_USER` and `MYSQL_MIGRATION_PASSWORD` with the `evorix_migrator` credentials. Git ignores `.env`. Do not send credentials through chat.

4. Start the API and interface in two terminals:

   ```sh
   npm run dev:api
   ```

   ```sh
   npm run dev
   ```

   The public B3 asset and quote listing works without a token. Set `BRAPI_API_KEY` in the local `.env` only if you need additional provider data; the key is used exclusively on the server and must never be included in the frontend.

   The interface uses Vite's local proxy to forward `/api` to the API at `127.0.0.1:3001`. Only in local development, without SMTP and with `APP_BASE_URL` on localhost, does the API return temporary verification and recovery links. Published environments, including QA, require SMTP and a valid sender for sign-up and verification resends, and do not return those links in responses. Registration does not create a session: login and private APIs require `email_verified_at` to be populated after email verification.

5. Configure the first Administrator using the command in [PERMISSOES.md](docs/PERMISSOES.md). Then grant the Analyst role to the team's verified accounts in `/app/admin`. New accounts receive only the User role. Permissions are stored in the database and checked by the API.

### Importing the income ranking

The adviser can prepare the list in Excel and save it as **UTF-8 CSV or XLSX** (CSV may use commas or semicolons). Use the template available on `/ranking`. Required columns are `ticker`, `empresa`, and `potencial_percentual`; `preco_alvo`, `horizonte_meses`, `tese`, `riscos`, and `setor` are optional. Row order determines ranking position. Percentages and monetary values with decimal commas are accepted in semicolon-delimited CSV.

Uploads accept up to 300 assets and create an independent publication with history after the entire file is validated and the preview is confirmed. This requires the Analyst or Administrator role. A draft can also be created in the page editor with the same fields and validation. The site identifies the list as adviser-provided and explains that projections may be wrong and do not guarantee returns.

To apply migrations to the configured Aiven managed database, use `npm run db:migrate:aiven`. The command uses the local administrative account in `.env.aiven` only to apply DDL; it does not copy or modify existing data.

## Account API

- `POST /api/auth/register` — creates a pending account and sends an email verification link.
- `POST /api/auth/verification/resend` — requests another link without revealing whether the address is registered.
- `POST /api/auth/verify-email` — verifies a single-use token with a limited validity period.
- `POST /api/auth/login` — authenticates the user and creates a server-side session.
- `GET /api/auth/me` — returns only the current session's basic account data.
- `POST /api/auth/logout` — revokes the database session and clears the cookie.
- `GET /api/market/assets?type=stock&search=PETR&page=1` — lists common shares, preferred shares, and units, with search and pagination.
- `GET /api/market/quotes?symbols=PETR4,ITUB4` — returns brapi.dev quotes, limited to eight assets per call.
- `GET /api/rankings` — lists the most recently imported projections and indicates whether the session can publish.
- `POST /api/rankings` — publishes a version from UTF-8 CSV or XLSX; requires a verified Analyst or Administrator session.
- `GET /api/admin/summary`, `/api/admin/users`, `/api/admin/audit` — counts, paginated accounts, and audit history; Administrator only.
- `PATCH /api/admin/users/:id/access` — changes an account's role or blocked status and ends its sessions; Administrator only.
- `GET /api/portfolio` — legacy endpoint that calculates positions; the portfolio was removed from MVP navigation.
- `POST /api/portfolio/transactions` — records manual purchases/sales and rejects sales that would create a negative position.
- `GET/PUT /api/portfolio/preferences` — reads and saves risk preferences, notification options, and the total invested amount reported by the user.
- `GET /api/favorites` and `PUT/DELETE /api/favorites/:ticker` — preserved legacy endpoints; favorites are outside MVP navigation.
- `GET /api/assistant/status` — reports whether the AI assistant is enabled without exposing the key.
- `POST /api/assistant/chat` — sends up to ten recent messages to Gemini; limited to eight calls per IP every 15 minutes.
- `GET /api/health` — checks API and MySQL availability.

Passwords are stored using Argon2id. Verification and session tokens are random; only their hashes are persisted. Sessions use a cookie with `HttpOnly`, `SameSite=Strict`, and, in production, `Secure`. Data-changing requests validate the origin. Authentication tokens are not stored in `localStorage`.

Login is remembered in the same browser for up to 30 days of inactivity. Activity renews that period, with authentication required again no later than 90 days after login. Opening the initial URL with a valid session leads to the account home page. The avatar's sign-out action revokes the server-side session and allows login with another account. Clearing cookies, switching browsers, or ending all sessions requires a new login. Temporary connection failures offer a retry option without treating the session as ended. `BroadcastChannel` synchronizes session changes across tabs without sharing passwords or tokens.

The cookie has a fixed 90-day expiration; the database enforces the 30-day inactivity limit. Session reads neither write nor clear the cookie, preventing an older response from replacing the cookie of an account that has just signed in. Sessions from the previous version may require one login after the update to store the persistent cookie.

`npm run test:session` checks the policy, the API with MySQL, and the browser flow. Tests using MySQL require `TARGET_MYSQL_*`; for a disposable local instance, also set `EDIV_TEST_MYSQL_DISPOSABLE=true`. These tests create and remove only their own `ediv_test_*` schema.

## AI assistant (experimental)

The chat continues to work with local responses when the integration is disabled. To try Gemini's free tier, create a key in Google AI Studio and set `AI_ASSISTANT_ENABLED=true` and `GEMINI_API_KEY` in the local `.env`; `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`. The key stays on the server and must not be sent through chat or placed in `VITE_*` variables.

Before the first submission, the chat asks for confirmation and explains that the question and conversation history will be sent to Google. Under the free-tier terms, Google may use prompts and responses to improve its services and allow human review. Do not use this tier for personal, confidential, or financial data; do not send portfolios, balances, statements, CPF identifiers, contact information, or credentials. The integration does not load account data, and its prompt limits the assistant to educational content, without individualized recommendations or real-time quotes. Free availability and quotas may change. To prevent unexpected charges, do not attach billing to the project used for evaluation, and check the current limits and terms in AI Studio.

To enable the assistant on a deployed site, configure `AI_ASSISTANT_ENABLED=true`, `GEMINI_API_KEY`, and, if needed, `GEMINI_MODEL` in **Vercel → Settings → Environment Variables** for the target environment, then deploy again. Until both the key and flag are enabled, the interface uses local responses. Per-IP and global limits are stored in MySQL; `AI_DAILY_LIMIT` defaults to 100 in a 24-hour window. The integration does not replace the provider's controls.

## Production

Set `NODE_ENV=production`, `APP_BASE_URL`, and `APP_ORIGIN` to the actual HTTPS address, along with `MYSQL_SSL=true`, `SMTP_URL`, and `MAIL_FROM`. Set secrets and connection URLs directly on the hosting platform; do not commit them or send them through chat. Configure `BRAPI_API_KEY` on the server if coverage beyond the four sandbox tickers is needed.

Before publishing quotes to users, check the provider's current limits and terms; its free plan is described as suitable for non-revenue prototypes, and data freshness varies by plan. Always display the source, currency, and returned timestamp.

Create a migration user with DDL permissions and configure `MYSQL_MIGRATION_USER` and `MYSQL_MIGRATION_PASSWORD` only in the deployment job. Run `npm run db:migrate` before starting the API. The production API does not run migrations and must use a separate MySQL user with read/write access only to the application's tables. Configure the HTTPS proxy to forward `/api` to Node and set `TRUST_PROXY=true` if it forwards client headers correctly.

Rate-limit counters must be shared across instances. This repository uses MySQL-backed counters, with a local cache for blocked requests; keep the shared storage enabled before exposing a deployment with multiple instances.

## Deploying to Vercel

The repository is configured to build with Vite, serve the SPA on internal routes as well (such as `/app/carteira`), and forward `/api/*` to the Node function at `api/[...path].js`. Vercel does not host MySQL: before the first deployment, use managed MySQL with TLS enabled and network access allowed for the application. Do not use `127.0.0.1` as the production database host.

1. Import the repository into Vercel and keep Root Directory pointed to the folder containing this `package.json`. The framework is Vite; the build command is `npm run build` and the output directory is `dist`.
2. Add these variables to **Production**: `NODE_ENV=production`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE=evorix_finance`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SSL=true`, `MYSQL_SSL_CA` (the provider's CA contents, if required), `MYSQL_CONNECTION_LIMIT=3`, `APP_BASE_URL`, and `APP_ORIGIN` (both using the official HTTPS URL), `SMTP_URL`, and `MAIL_FROM`. Add `BRAPI_API_KEY` if you have a key. Secrets belong in Vercel settings and must never be committed.
3. Run `npm run db:migrate` once against managed MySQL, with `MYSQL_MIGRATION_USER` and `MYSQL_MIGRATION_PASSWORD` configured only in the secure migration environment. Do not grant DDL permissions to the API user.
4. Deploy and check `https://SEU-DOMINIO/api/health`, sign-up, email verification, login, portfolio, and favorites. For previews, the function automatically recognizes the Vercel deployment domain for origin validation; the verification link still uses `APP_BASE_URL`, so test the complete flow on the official domain.

Rate limiters and quote/listing caches use shared MySQL tables. An in-memory cache reduces local reads, but counters persist across instances. Managed MySQL must accept outgoing connections from Vercel (or use a compatible database proxy/service), and the hosting plan must support this connection pattern.

### Initial transfer to Aiven (evaluation)

`npm run db:transfer:aiven` creates the destination schema, applies migrations, and copies users, transactions, preferences, favorites, and summaries from the local database defined in `.env`. Before using it, create a MySQL instance in Aiven, copy `.env.aiven.example` to `.env.aiven`, download the service CA to `.aiven/ca.pem`, and fill in the host, port, username, and password. Then check the destination details and run the command. It cancels the transfer if the destination data tables are not empty; it does not overwrite existing data. Sessions and pending verification links are not transferred for security reasons. Use the Aiven administrative account only for this transfer; create a separate user with restricted permissions for the production API.

After the transfer, `npm run db:bootstrap:aiven-app` creates the runtime user with read/write permissions and writes the connection details locally to `.env.aiven.runtime` (ignored by Git). To run the local API against Aiven, start `npm run dev:api:aiven` in one terminal and `npm run dev` in another. This profile skips automatic migrations because the API user has no DDL privileges. The administrative credential stays only in the local `.env.aiven` file, used for occasional administrative operations.

## Scope and next steps

This backend records manual portfolio transactions but does not send orders or move money. The total amount reported by a user is displayed as a personal declaration; the market estimate uses only positions with a recorded quantity and an available quote. Prices may be delayed or unavailable and do not represent a brokerage balance. Password recovery, account deletion/export, and session termination are available. There is no MFA, payments, automatic brokerage connection, KYC, or certified financial audit trail. Before publication, define privacy requirements, data licensing, retention policy, monitoring, and incident response, and arrange an independent security review.

## Deployment environments

`main` publishes the site without the assistant. `QA` keeps the experimental assistant in Preview with a separate database and fictional data. See [AMBIENTES.md](docs/AMBIENTES.md) for setup and workflow.

## Quality and release

See [technical improvements, safe exports, and outstanding team tasks](docs/MELHORIAS-LANCAMENTO.md). CI uses disposable MySQL and does not receive Aiven credentials.
