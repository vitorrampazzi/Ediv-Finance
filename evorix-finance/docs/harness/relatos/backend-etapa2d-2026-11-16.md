# Relato — Etapa 2D (backend): cache público seguro e consultas P1/P2 (2026-11-16)

Brief: `docs/harness/briefs/etapa2-2D-tijolo.md`. Base: `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md` (Etapa 1).

Não rodei `npm run build` (regra da rodada: só o Pincel builda). Não abri `.env*`. Não conectei em Aiven nem em produção. Nenhuma migração criada. Não houve commit, push nem deploy.

## Resumo

- **Item 1 (cache público de `/api/support/information`): aplicado.** A rota não lê sessão, cookie, usuário nem query. Recebe `Cache-Control` de CDN com `s-maxage=3600` e `stale-while-revalidate=86400`.
- **Item 2 (`SELECT *` em `ranking_publications`): sem ganho real, `server/rankings.js` não foi alterado.** As três consultas alimentam `publication()`, que lê `entries_json` (a coluna grande). O único campo não lido é `imported_by` (`CHAR(36)`), sem ganho relevante.
- **Adiados:** cache de `/api/learning`, índices, paginação do ledger e retry de e-mail/assistente (ver lista no fim).

## Item 1: prova de que `/information` não depende de sessão

Middlewares de `server/app.js` que rodam antes de `/information` (montada em `app.js:195`):

| Trecho | O que faz | Lê sessão, cookie, usuário ou query? |
|---|---|---|
| `app.js:56-80` | `helmet` (cabeçalhos de segurança e CSP) | Não |
| `app.js:82-88` | Gera `X-Request-Id` e define `Cache-Control: no-store` | Não |
| `app.js:100-111` | Log de resposta (só método, status e duração) | Não |
| `app.js:112` → `security-limits.js:54-68` (`identifyClient`) | Usa só o IP (`req.ip`, ou `x-vercel-forwarded-for` no Vercel). Responde 400 se o IP for inválido. | Não |
| `app.js:112` → `request-admission.js:12-25` | Controle de rajada por IP (`securityIpKey`) | Não |
| `app.js:112` → `security-limits.js:187-200` (`requestPolicy`) | Limite de tamanho da URL (414). Verificação de origem só para métodos não seguros (GET passa). | Não |
| `app.js:113-120` | Filtro de método (405) e limitadores `apiLimiter` e `writeLimiter`, ambos por IP (`security-limits.js:97-103`) | Não |
| `app.js:121` → `auth-cleanup.js:1-5` | Apaga sessões e tokens expirados (`DELETE`). Não lê a requisição. | Não |
| `app.js:123-150` | Parsing de corpo (`express.json`, `bodySizeLimit`). Não afeta GET sem corpo. | Não |

Na rota (`server/support.js:21-31`), o handler monta a resposta só com `config.supportEmail`, `supportHours`, `professionalName`, `professionalCategory`, `professionalRegistration` e `subscriptionsAvailable: false`. Não há `req.query`, `req.cookies`, `req.authenticatedUser` nem `req.headers`. O `router.use(requireAuthenticatedUser, ...)` está em `support.js:32`, depois da rota, então não se aplica a ela.

Os valores vêm de `server/config.js:133-137`, lidos de variáveis de ambiente quando o módulo carrega. Não mudam por requisição: só com novo deploy, que na Vercel invalida a borda.

Conclusão: a resposta é igual para todos. Cache compartilhado é seguro.

**Valores escolhidos:**
- `s-maxage=3600` (1 h): margem de segurança caso a configuração mude sem redeploy. Não há risco de dado de conta, porque os campos são públicos e institucionais.
- `stale-while-revalidate=86400` (24 h): a borda pode servir a resposta anterior enquanto revalida em segundo plano. Se o deploy invalidar a borda, esse valor não atrasa mudança.
- Sem `private`, sem `Set-Cookie`. O teste confere as duas coisas.

**Mudança aplicada em `server/support.js`:**
- `support.js:13`: importa `sharedCache` de `./limit-store.js` (junto de `MysqlLimitStore`, que já vinha dali). `limit-store.js` não foi editado.
- `support.js:19-20`: constante `informationCacheControl = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"`, definida no próprio `support.js` (sem importar de `rankings.js`).
- `support.js:21-31`: a rota chama `sharedCache(res, informationCacheControl)` antes de `res.json(...)`.

O `sharedCache` remove `RateLimit*` da resposta. Erros de limitador (429) acontecem antes da rota e continuam com `no-store`.

**Compatibilidade:** `tests/production-smoke.mjs:129-137` checa só status 200 e a presença de `professionalName` no corpo. Não checa cabeçalho de cache, então continua compatível. Não rodei esse arquivo (ele aponta para produção).

## Teste: `tests/public-cache.test.mjs`

Criado com `node:test`, no modelo de `tests/ranking-market.test.mjs`: importa `server/app.js` com `pool.execute` respondendo em memória.

- Guarda de banco: `pool.execute` aceita só as consultas de limitador (`request_limits`) e de limpeza de sessões expiradas. Qualquer outra SQL lança erro. `pool.getConnection` lança erro. Um teste final confere que a lista de consultas proibidas está vazia.
- `createPool` do mysql2 não abre conexão ao ser criado, e as consultas são interceptadas antes de chegar ao driver. A importação não exige banco real.

Casos:
1. `/api/support/information` responde 200 com `Cache-Control` exato `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`, sem `Set-Cookie`, com o corpo esperado.
2. Com e sem cookie de sessão (`evorix_session=...`): mesmo status, mesmo corpo, mesmo `Cache-Control` e nenhum `Set-Cookie`.
3. `/api/learning` anônimo continua com `Cache-Control: no-store`.
4. Nenhuma consulta fora da lista permitida foi tentada.

Resultado: **4 de 4 passaram.**

## Item 2: `SELECT *` em `ranking_publications`

Colunas da tabela (`server/migrations/005_education_platform.sql:1-11`). As migrações 006 a 009 só adicionam chaves estrangeiras à tabela (007:21, 007:29, 008:15, 008:30), sem colunas novas. Colunas: `id`, `title`, `author_name`, `professional_category`, `professional_registration`, `source_file_name`, `entries_json` (JSON, coluna grande), `imported_by`, `created_at`.

`publication()` (`server/rankings.js:48-61`) lê: `id`, `title`, `author_name`, `professional_category`, `professional_registration`, `source_file_name`, `created_at` e **`entries_json`**. Ela faz `JSON.parse` e ordena `entries`. Não lê `imported_by`.

| Consulta | Chamador e campos lidos | Decisão |
|---|---|---|
| `server/rankings.js:76` (`GET /api/rankings/compare`, `WHERE id IN (?,?)`) | `publication(before)` e `publication(after)` (`:82-84`) leem `entries_json` e todos os campos de `publication()`. Também `readEntries(before.entries_json)` (`:86`). | **Sem ganho real.** Usa a coluna grande. Mantém `SELECT *`. |
| `server/rankings.js:184` (`latestRanking`, `WHERE id = ?`) | `publication(rows[0])` (`:189`) gera `latestCache.data`, usado por `GET /api/rankings` e `/market`. Lê `entries_json`. | **Sem ganho real.** Mantém `SELECT *`. |
| `server/rankings.js:212` (`GET /api/rankings`, com `?publication=`) | `publication(rows[0])` (`:214`). Lê `entries_json`. | **Sem ganho real.** Mantém `SELECT *`. |

Por que não trocar: o único campo que `SELECT *` traz e ninguém lê é `imported_by`, um `CHAR(36)` pequeno. Listar colunas explicitamente economiza quase nada, e ainda arrisca esquecer campo que o chamador usa. Pela regra do brief, `server/rankings.js` **não foi alterado**.

Observação: a rota pública `/api/rankings/public` (`rankings.js:97-99`) já usa colunas explícitas (`id, title, created_at, entries_json`). Não é alvo deste item.

## Adiado (registrado conforme o brief)

- **Cache de `/api/learning`:** inclui progresso do usuário (`learning.js:10-20`). A borda não separa por cookie, então não pode ser compartilhada. Pendência: separar o caso anônimo em rota própria, ou mover o progresso para outro endpoint. Decisão do Orquestrador.
- **Índices de suporte e de usuários do admin:** sem MySQL descartável nem Docker para `EXPLAIN` (`127.0.0.1:3307` recusou conexão no relato da Etapa 1, e Docker não está instalado). Volume do beta não indica lentidão. Nenhuma migração sem plano medido.
- **Paginação do ledger do portfólio no SQL:** as posições dependem do ledger inteiro. Risco em cálculo financeiro maior que o ganho.
- **Retry de e-mail e do assistente:** e-mail não é idempotente.
- **Remoção de `autoprefixer` e `prettier`:** fica para a entrega 2E.
- **Mexer em margem, cotação, textos legais ou regras financeiras:** fora do escopo.

## Validação

- `npm run lint`: **passou** (saída 0, sem erros).
- `npm test`: **passou**. 298 testes, 0 falhas, saída 0. Inclui os 4 testes de `tests/public-cache.test.mjs`.
- `npx tsc -p tsconfig.app.json --noEmit`: **passou** (saída 0).
- `node --test tests/public-cache.test.mjs`: **passou**, 4 de 4.
- `git diff --stat -- server package.json`: `server/support.js` (16 linhas, 6 removidas) e `package.json` (1 linha, só a inclusão do teste no script `test`).
- `git status --short`: meus arquivos são `server/support.js`, `package.json`, `tests/public-cache.test.mjs` e este relato. `server/limit-store.js`, `server/learning.js` e `server/rankings.js` não aparecem, como exige o brief. Os demais arquivos modificados ou não rastreados (`src/`, `public/`, `tests/perf-baseline.mjs`, relatos e briefs de outros papéis) são de Pincel, Vigia e da coordenação.
- `node scripts/harness.mjs check`: rodado na sequência do fechamento (ver abaixo).
- **Não executado:** `npm run build` (regra da rodada). `EXPLAIN` (sem MySQL descartável). `tests/production-smoke.mjs` (aponta para produção).

## Próximo passo sugerido

Revisão da Lupa. Decidir se o cache de `/api/learning` entra numa etapa posterior, separando o caso anônimo.

## Ajuste pós-revisão (Lupa)

Afirmado no teste de `/api/support/information` que a resposta não traz `RateLimit` nem `RateLimit-Policy` (removidos pelo `sharedCache`). Controle no teste de `/api/learning`: os mesmos cabeçalhos estão presentes, o que prova que o limitador os põe nesta configuração. Resultado: `node --test tests/public-cache.test.mjs` com 4 de 4 passando, e `npm run lint` com saída 0. Não rodei build.
