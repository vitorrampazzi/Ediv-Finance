# Relato — Auditoria de performance e cache do backend (2026-11-16)

Brief: `docs/harness/briefs/etapa1-1B-tijolo.md`. Só leitura de código. Nenhum arquivo de código foi alterado. Não foram abertos `.env*`, não houve conexão com Aiven/produção, não houve migração nem commit.

## 1. N+1

Não encontrei consulta por linha em rota de requisição. O único laço com `await` de banco está em caminho administrativo ou de exportação, e nenhum deles cresce com o volume de dados do usuário.

- `server/admin.js:235-236` (`PATCH` de conta, rota `/api/admin`): `for (const action of actions)` faz um `connection.execute` por ação dentro de transação. O array tem no máximo 2 itens (`ROLE_CHANGED`, `ACCOUNT_BLOCKED`/`UNBLOCKED`), montado em `admin.js:231-234`. Hoje: até 2 consultas. Ficaria igual. Não é N+1 real.
- `server/auth.js:904-906` (`GET /api/auth/export`): laço sobre lista fixa de consultas (`profile`, `conversations`, `messages`, etc.), um `pool.execute` por tabela, não por linha. Hoje: fixo, em série. Sugestão de baixa prioridade: `Promise.all` para reduzir latência, sem mudar o número de consultas.
- `server/portfolio.js:545` e `server/market-service.js:91`: `Promise.all` com 2 consultas/chamadas em paralelo. Não é N+1.
- `server/market/quote-service.js` e `server/provider-cache.js:20-45`: cada chamada ao provedor faz 2 consultas (`INSERT ... ON DUPLICATE KEY` + `UPDATE` condicional) para reservar cota. Por chamada de provedor, não por linha. Aceitável.

Achado de custo (não é N+1, mas cresce com o histórico do usuário):

- `server/portfolio.js:59` e `:63` (`readLedger`, usado por `GET /api/portfolio` em `:162` e por `GET /api/portfolio/activity` em `:145`): carrega **todas** as transações e eventos do usuário a cada requisição. Hoje: 2 consultas, sem `LIMIT`. Com `historyPage` (`:163-175`), a paginação só fatia a resposta depois de carregar tudo. Correção proposta: calcular posições a partir de um resumo persistido ou paginar o histórico no SQL (`LIMIT ? OFFSET ?`). Exige estudo de contrato, e pode exigir migração.

## 2. Payload

- `server/portfolio.js:59`, `:63`: `SELECT *` em `portfolio_transactions` e `portfolio_events`. Hoje a rota usa `ticker, side, quantity, unit_price, fees, traded_at, kind, amount, factor, status, note` etc. Correção: listar colunas explicitamente. Sem migração.
- `server/rankings.js:76` (`/compare`), `:184` e `:212` (`/history`, `/` com `publication`): `SELECT *` em `ranking_publications`, que inclui `entries_json` (JSON grande). Hoje o `/public` (`rankings.js:97-99`) já seleciona colunas específicas. Correção: colunas explícitas nessas três consultas, mantendo `entries_json` onde é usado.
- `server/rankings.js:221`: `SELECT * FROM income_ranking_entries ORDER BY rank_position` sem filtro de lote (ramo legado). Tabela pequena. Baixa prioridade.
- `server/support.js:69`: lista de tickets com `LIMIT 100`, sem paginação por cursor. Staff vê até 100 tickets. Aceitável por enquanto, mas registrar como limite.
- `server/support.js:128`: `SELECT * FROM support_threads WHERE id=?`. Uma linha. Baixa prioridade.
- `server/portfolio.js:145-160` (`/activity`): devolve todos os eventos do usuário, sem limite.
- `server/learning.js:8-21` (`GET /api/learning`, pública): devolve todas as lições (`serializeLessons`) e o glossário (`server/learning-content.js`, 12,5 KB) em cada visita. Conteúdo estático, mas o cabeçalho é `no-store` (ver seção 3).
- Já adequado: `server/admin.js:128` (lista de usuários, `LIMIT ? OFFSET ?` com 20 por página) e `server/notifications.js:27-60` (cursor, `LIMIT 21`, página de 20).

## 3. Cache

Cabeçalhos globais:
- `server/app.js:87`: todo `/api/*` recebe `Cache-Control: no-store` antes de qualquer rota.
- `server/market.js:51`: `no-store` em todo o router de mercado.
- `server/limit-store.js:105-109` (`sharedCache`): único helper que libera cache compartilhado. Remove `RateLimit` e define o `Cache-Control` informado. Erros (status >= 400) mantêm `no-store`, conforme comentário em `rankings.js:92-94`.

Rotas com cache compartilhado (CDN):
- `server/auth.js:302-308` (`GET /api/auth/availability`): `public, max-age=0, s-maxage=300, stale-while-revalidate=600`. Depende só da configuração do deploy. Correto.
- `server/rankings.js:95` (`publicRankingCacheControl`): `public, max-age=0, s-maxage=60, stale-while-revalidate=300`. Usado em `/api/rankings/public` (`rankings.js:117`) e em `/api/rankings/status` (`rankings.js:35`). O corpo do `/public` tem preço e margem de 3 tickers, iguais para todos. Ok. O corpo do `/status` é só `{ published: boolean }` (`server/research-status.js:4-12`), sem dado de conta. Ok.

Cache em memória e no banco (cotações):
- `server/market/quote-service.js:141-145`: `memory` (Map), `inFlight` (deduplicação), `blocked` (cooldown 429). Compartilhado entre usuários por design, pois é dado de mercado.
- `quote-service.js:179-181`: escrita compartilhada em `provider_cache` (`store.write(key, payload, ttlMs)`). TTL vem de `cacheTtlMs(kind, ...)`.
- `quote-service.js:481`: uma listagem geral responde todos os tickers e todos os visitantes dentro do TTL.
- `server/provider-cache.js:4` e `:20-24`: `provider_cache` com `expires_at`. Índice `provider_cache_expiry_idx` existe (migração 005).

Dados privados e risco de cache compartilhado:
- Nenhuma rota com `sharedCache` expõe dado de usuário. As únicas três que o usam (`auth/availability`, `rankings/public`, `rankings/status`) são públicas.
- Rotas que leem dado de conta (`/api/auth/me`, `/api/portfolio`, `/api/notifications`, etc.) continuam com `no-store` pelo middleware global. Ok.
- Verificar no Frontend: `crawlableApi` (`site-pages.mjs:57-64`) inclui `/api/auth/me`. Como ele é lido por crawler e exige sessão, responde 401 ou dado do usuário com `no-store`. Não há cache compartilhado. Ok, mas vale o Orquestrador confirmar que `/api/auth/me` não é renderizado em página pública cacheada no CDN.

Oportunidade perdida (público sem CDN):
- `server/learning.js:8` (`GET /api/learning`) está em `crawlableApi` e responde `no-store`. Conteúdo é estático para visitante anônimo. Hoje: origem atende toda visita. Correção: para o caso `user` nulo, usar `sharedCache(res, "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400")`. Não é seguro para o caso autenticado (`access: "full"`, `completed`), que deve manter `no-store`. Sem migração.
- `server/support.js:16-27` (`GET /api/support/information`) também está em `crawlableApi`, responde `no-store`, e é config estática (e-mail, horário, registro profissional). Mesma correção, com `s-maxage` maior.

## 4. APIs externas

| Integração | Timeout | Retry / backoff | Concorrência / limite | Erro tratado | Seguro repetir? |
|---|---|---|---|---|---|
| brapi (`server/market/brapi-provider.js`, `quote-service.js`) | catálogo 12 s, cotação 7 s, histórico 10 s (`brapi-provider.js:15-19`, `AbortSignal.timeout` em `:257`) | Até `maxAttempts` para erro transitório, com backoff exponencial e jitter: `retryDelayMs * 2^(n-1) * (0,75 a 1,25)` (`quote-service.js:259-280`). Não é repetido em 429. | 429 vira cooldown com `Retry-After` (`quote-service.js:269-270`, `brapi-provider.js:85-96`, mín. 1 s, máx. 24 h, padrão 60 s). Sem token, fila com concorrência 1 (`quote-service.js:300`). Teto diário de 450 chamadas por ticker (`quote-service.js:120`, `provider-cache.js:26-46`, atômico). Rota: 30/min em cotações e 12/min no provedor (`market.js:28-43`). | `QuoteServiceError` e `cooldown` (`quote-service.js:260`) | Sim, é leitura. Deduplicação em `inFlight` (`quote-service.js:320-321`). |
| Turnstile (`server/registration-challenge.js`) | 5 s (`:37`) | Não há retry nem backoff. Falha vira 503 (`:52-58`). | Não há limite próprio além do rate limit de cadastro. | Falha de rede, HTTP não-ok e erros internos do Turnstile viram 503 (fail closed). | Não repetir com o mesmo token. O token é de uso único pelo provedor (regra do Cloudflare, não verificada no código). Cliente deve gerar novo token. |
| E-mail (nodemailer, `server/mail.js:5-9`, `auth.js:193` e `auth.js:686`) | conexão 10 s, greeting 10 s, socket 15 s (`mail.js:7-9`) | Não há retry no envio (`sendMail` em `auth.js:193` e `:686` sem retry). `verify()` em `mail.js:82`. | Limites de reenvio por rota de auth (`resendLimiter`, `forgotLimiter`). | `verify()` distingue `EAUTH` de falha de conexão (`mail.js:88-93`). Envio em `auth.js` não tem tratamento visto nesta etapa. | Não é idempotente: repetir pode enviar e-mail duplicado. Tokens são trocados a cada envio. |
| Assistente (`server/assistant.js`, endpoint do provedor de IA) | 15 s na primeira chamada (`:144`), 10 s na repetição (`:154`) | Uma repetição para 500/502/503/504, após 800 a 1200 ms fixos (`:148-154`). Sem backoff exponencial. | 8 requisições por janela (`assistant.js:12`). Limite diário e de conversa (`:115-124`). | Timeout e erro de rede viram log com motivo (`:199-202`). 429 do provedor vira resposta própria (`:160-166`). | Não é seguro repetir uma geração que consome cota. A repetição só cobre 5xx. |

Observação: o rate limit da Vercel não entra nesta tabela, conforme o brief.

## 5. Índices

Índices existentes (pelas migrações 001 a 009):
- `portfolio_transactions`: PK `id`, `portfolio_user_date_idx (user_id, traded_at, created_at, id)` (002:13), `portfolio_ticker_idx (user_id, ticker)` (002:14). Cobre `readLedger` (`portfolio.js:59`).
- `portfolio_events`: `portfolio_events_user_date_idx (user_id, occurred_at)` (005:41). `readLedger` ordena por `occurred_at, created_at, id`, então `created_at, id` ficam em filesort por usuário. Volume pequeno.
- `notification_events`: `UNIQUE (type, source_id, editorial_version)`, `UNIQUE (publication_id)`, `notification_created (created_at, id)` (008:12-14). `notification_event_reads`: PK `(user_id, notification_id)` (008:22). `notification_reads`: PK `(user_id, publication_id)` (007:27). A consulta de não lidas (`notifications.js:22-24`, `COUNT(*)` com LEFT JOIN nas PKs) usa esses índices. **Pendência 1 (notificações não lidas)**: pela leitura do código, já há índice para o join e o filtro `created_at >= ?`. Confirmação depende de `EXPLAIN`, que não foi executado (ver abaixo).
- `support_threads`: PK `id`, FK `user_id` (índice implícito do InnoDB, 005:54-62). Não há índice em `updated_at`.
- `support_messages`: PK `id`, sem índice em `(thread_id, created_at, id)`. Consulta de `support.js:141` filtra `thread_id` e ordena `created_at, id`. Não há índice composto. Volume por thread é pequeno.
- `user_access`: PK `user_id`, `(role, blocked_at)` (006:6).
- `users`: PK `id`, `UNIQUE (email)` (001:8). Não há índice em `created_at`.
- `admin_audit_events`: `created_at` (006:22).
- `research_drafts`: `(user_id, updated_at)` (007:8).
- `learning_progress`: PK `(user_id, lesson_id)` (007:15).
- `provider_cache`: PK `cache_key`, `expires_at` (005:76-80).
- `request_limits`: PK `bucket`, `expires_at` (005:23-27).
- `market_daily_closes`: PK `(ticker, trade_date)`, `trade_date` (009:8-9).
- `income_ranking_entries`: `UNIQUE (ticker)`, `(batch_id, rank_position)` (004:14-15). Não há índice só em `rank_position`, e `rankings.js:221` ordena só por ela.

Consultas com WHERE ou ORDER BY sem índice adequado:
- **Pendência 2 (suporte por `updated_at`)**: `support.js:69` faz `ORDER BY t.updated_at DESC LIMIT 100`. Para o usuário, filtra por `user_id` (usa o índice da FK) e ordena em filesort. Para o staff, sem WHERE, faz varredura completa de `support_threads` mais join com `users`, com filesort. Proposta: índice `(user_id, updated_at)` para a visão do usuário, e `(updated_at)` para a visão do staff. Exige migração 010+ e `EXPLAIN` em MySQL descartável.
- **Pendência 3 (lista de usuários do admin)**: `admin.js:128` faz `ORDER BY u.created_at DESC, u.id LIMIT 20 OFFSET ...` sem índice em `users(created_at, id)`, então faz filesort de toda a tabela a cada página. O filtro `q` usa `LOCATE` em `name` e `email` (`admin.js:108-109`), que não usa índice e varre a tabela. O filtro de `role` usa `COALESCE(a.role,'USER')` (`admin.js:113`), que impede o índice de `user_access`. Proposta: índice `users(created_at, id)`. Para `q`, só cabe busca com índice de prefixo ou FULLTEXT, se o volume justificar. Exige migração 010+ e `EXPLAIN`.
- `portfolio.js:60-63` (`ORDER BY ... created_at, id` em eventos): ver acima, volume pequeno.
- `rankings.js:221` (`ORDER BY rank_position` sem filtro de lote): filesort em tabela pequena.

**EXPLAIN: não executado.** Motivo: não há MySQL escutando em `127.0.0.1:3307` (teste de conexão: `ECONNREFUSED`). Docker não está disponível (`docker --version`: comando não encontrado). Conforme o brief, não subi contêiner nem servidor, e não apontei para Aiven.

## 6. Redis

Recomendação: **não adotar Redis agora.**

Evidência:
- Cotações já têm três camadas sem Redis: memória (`quote-service.js:141`), `inFlight` para deduplicação (`:142`, `:320`), e `provider_cache` no banco (`provider-cache.js`), com teto diário atômico (`provider-cache.js:26-46`).
- Dados públicos já têm CDN: `auth/availability` com `s-maxage=300` (`auth.js:305`), `rankings/public` e `rankings/status` com `s-maxage=60` (`rankings.js:95`).
- Os dados públicos que mais ganhariam com cache são `/api/learning` e `/api/support/information`, hoje `no-store` (seção 3). A correção é cabeçalho de CDN, não Redis.
- O brief cita uma medição de 04/11 (200 usuários simultâneos, p95 de 174 ms). Não verifiquei essa medição nesta etapa; ela já é a base da decisão do Orquestrador. Não há evidência neste relato de carga que o cache atual não sustente.

Redis só faria sentido com medição de carga mostrando saturação do banco ou da memória de processo, em rota que já tem cache de borda configurado. Hoje não há essa evidência.

## 7. Dependências

Fonte: `package.json`. Não removi nem instalei nada.

`dependencies`:
- `argon2`: usada (hash de senha em `auth.js`, `password-work.js`; 5 arquivos).
- `express`: usada (`app.js`, `index.js` e routers).
- `express-rate-limit`: usada (9 arquivos).
- `fflate`: usada (4 arquivos, incluindo `server/spreadsheet.js` e `src`).
- `framer-motion`: usada em 3 arquivos de `src/` (`NotificationsMenu.tsx`, `SegmentedControl.tsx`, `DashboardLayout.tsx`). Peso moderado para animações pontuais. Candidato a avaliação no Frontend, não remover.
- `helmet`: usada (`server/app.js:3` e `:57`).
- `lucide-react`: usada (63 arquivos).
- `mysql2`: usada (`database.js` e demais consultas).
- `nodemailer`: usada (`mail.js`, `auth.js:193` e `:686`).
- `react`, `react-dom`: usadas (frontend).
- `react-router-dom`: usada (58 arquivos).
- `read-excel-file`: usada em 1 arquivo (`server/spreadsheet.js`). Pesada para um único uso. Candidata a avaliação (sem remover).
- `recharts`: usada (4 arquivos). Pesada. Avaliar tree-shaking ou lazy loading no Frontend.
- `zod`: usada (13 arquivos).

`devDependencies`:
- `@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `typescript-eslint`: usadas pelo `npm run lint` (`eslint.config.js`).
- `@tailwindcss/postcss`, `tailwindcss`: usadas (`postcss.config.js:1`).
- `@types/node`, `@types/react`: usadas pelo TypeScript.
- `@vitejs/plugin-react`, `vite`: usadas pelo build (`scripts/build.mjs`).
- `playwright`: usada em 16 arquivos de teste (`test:browser`, etc.). Pesada, mas usada.
- `typescript`: usada pelo `tsconfig*.json` e pelo `typescript-eslint`.

Suspeitas (sem remoção):
- `autoprefixer`: **suspeita de não uso.** `postcss.config.js` só declara `@tailwindcss/postcss`, e não há referência a `autoprefixer` em nenhum arquivo. Pode ser exigida por algum plugin antigo, mas não aparece no config.
- `postcss`: **suspeita de uso só transitivo.** Nenhuma importação direta. O `@tailwindcss/postcss` e o `vite` trazem `postcss` como dependência própria. Manter como dependência direta é aceitável; avaliar só se o Orquestrador quiser enxugar.
- `prettier`: **suspeita de não uso.** Nenhuma referência em `package.json`, scripts ou CI. Não encontrei `.prettierrc` na raiz (`ls -a`). Sem script de format.
- `@types/react-dom`: **suspeita leve.** Sem import direto. Usado implicitamente pelo TypeScript quando `react-dom` é tipado. Manter.

Não verifiquei `tests/dependencies.test.mjs`, que pode já validar parte disso. Vale o Orquestrador conferir antes de qualquer remoção.

## 8. Recomendações

1. **Cache de borda para conteúdo público estático** (`server/learning.js:8`, `server/support.js:16`). Usar `sharedCache` só para o visitante sem sessão: aulas e glossário com `s-maxage` de 1 h, e informações de suporte com `s-maxage` maior. Manter `no-store` no caso autenticado. Teste: teste de integração que confere o cabeçalho `Cache-Control` com e sem cookie de sessão. Migração: **não exige.**
2. **Limitar o histórico do portfólio** (`server/portfolio.js:59-63`, `:162-175`, `:145-160`). Paginar o histórico no SQL e não carregar todo o ledger a cada requisição, mantendo o contrato de resposta. Teste: teste de integração do `GET /api/portfolio` com `historyPage`, comparando posições com e sem paginação. Migração: **não exige** para paginar; exige estudo se for persistir resumo de posição.
3. **Colunas explícitas no lugar de `SELECT *`** (`server/portfolio.js:59` e `:63`, `server/rankings.js:76`, `:184`, `:212`). Teste: testes de `rankings` e `portfolio` existentes em `tests/` continuam verdes, mais a conferência do JSON de resposta campo a campo. Migração: **não exige.**
4. **Índice para suporte por `updated_at`** (`server/support.js:69`). Índice `(user_id, updated_at)` e outro em `(updated_at)` para o staff. Teste: `EXPLAIN` em MySQL descartável antes e depois, registrado no relato. Migração: **exige** migração 010+, sem alterar dado, e autorização do dono para produção.
5. **Índice para lista de usuários do admin** (`server/admin.js:128`). Índice `users(created_at, id)`. Teste: `EXPLAIN` da consulta paginada, em MySQL descartável. Migração: **exige** migração 010+ (ou 011, se a 010 for de suporte), sem alterar dado, e autorização para produção.
6. **Retry com backoff no assistente e e-mail, somente onde é seguro.** Hoje o assistente repete 5xx uma vez com atraso fixo, e o e-mail não repete. Recomendo não ampliar retry no e-mail (não é idempotente). No assistente, manter como está. Teste: teste unitário com `fetch` falso. Migração: **não exige.**

Próximo passo sugerido: rodar `EXPLAIN` das consultas das recomendações 4 e 5 em MySQL descartável, quando houver um disponível. Até lá, as migrações ficam como proposta.

## Validação

- `grep -cE "^## [1-8]\."` no relato: **8** (ok).
- `git status --short -- server src tests package.json package-lock.json`: só `?? tests/perf-baseline.mjs`, arquivo do Vigia criado em paralelo (esperado). Nenhum arquivo de código meu foi alterado.
- `node scripts/harness.mjs check`: "quadro válido; 4 papéis e reservas sem conflito" (ok).
- `npm test` e `npm run lint`: **não executados.** Este é um relato só de leitura, nenhum código mudou, e o brief não pede testes. Se o Orquestrador quiser, executo na próxima etapa.
