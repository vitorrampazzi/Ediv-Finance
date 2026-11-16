# Backend — evolução de 13/11/2026 (relato)

Data de referência: 15/11/2026. Papel: `backend`. Escopo: testes, lista do `npm test`,
chave do limitador de suporte, documentação de segurança e auditoria somente leitura
das rotas. Nenhum banco foi acessado, nenhum `.env` foi lido, nenhum comando `db:*`,
`access:*`, `test:*:aiven` ou `npm run build` foi executado.

## Objetivo

Cobrir com testes as mudanças já no disco (saudação do e-mail, tetos por conta,
limitadores de suporte, cache de CDN de `/api/rankings/status`), registrar a regra
no documento de segurança e auditar as rotas de `server/` quanto a autorização, IDOR,
SQL, limites de upload e índices.

## Mudanças já aplicadas (aprovadas pelo Orquestrador, não alteradas nesta entrega)

1. `server/mail-greeting.js` (novo): `emailGreeting(name)` repete o nome no e-mail de
   confirmação só para nome simples (letras, espaços, apóstrofo, hífen; 2 a 60
   caracteres); senão devolve "Olá.".
2. `server/auth.js`: `requireAuthenticatedUser` reaproveita `req.authenticatedUser`
   quando a sessão já foi lida na mesma requisição.
3. `server/account-limits.js` (novo): tetos por conta (operações 10.000, eventos
   2.000, favoritos 300, conversas de suporte 10/dia, mensagens de suporte 200/dia),
   `exceedsAccountLimit` e `accountLimitMessages`.
4. `server/favorites.js`: PUT responde 409 quando a lista passaria de 300.
5. `server/portfolio.js`: `assertRoom` dentro de `mutate()` (sob o bloqueio da conta)
   em POST /transactions, POST /events e na importação; estouro vira 409.
6. `server/support.js`: limitadores diários por conta (`MysqlLimitStore`, chave = id
   do usuário) além do limite por IP; respostas da equipe em `/team` não contam.
7. `server/rankings.js`: `GET /status` usa o cabeçalho de cache compartilhado de
   `/public`. A rota não lê cookie, sessão nem query. `sharedCache` remove
   `RateLimit`/`RateLimit-Policy` e define `Cache-Control` (`server/limit-store.js:105-109`).
8. `server/market.js`: apenas comentário (orçamento diário padrão 420).

## Trabalho desta entrega (T1–T4)

- **T1** — `tests/backend-evolucao.test.mjs` (novo, 8 casos): `emailGreeting` (aceites
  e recusas), `exceedsAccountLimit` (limites e valores como string/NaN),
  `accountLimitMessages` (10.000, 2.000, 300), e checagens estáticas de
  `support.js` (limitadores no POST de conversa e de mensagem), `favorites.js` (conferência
  antes do `INSERT`), `portfolio.js` (`assertRoom` nas três rotas, dentro de `mutate`) e
  `rankings.js` (`sharedCache` em `/status`). Nenhum caso falhou; não houve mudança
  em código de produção por causa de teste.
- **T2** — `package.json`: `tests/backend-evolucao.test.mjs` acrescentado ao final da
  lista do script `test`, depois de `tests/market-hardening.test.mjs`. Nenhuma outra
  alteração no arquivo.
- **T3** — `server/support.js:47`: `keyGenerator` agora devolve
  `String(req.authenticatedUser.id)`. Única linha alterada.
- **T4** — `docs/SEGURANCA.md`: seção "Tetos por conta e outras proteções (novembro de
  2026)" acrescentada ao final, com a tabela dos cinco tetos (valor, onde é aplicado,
  409 ou 429), a nota sobre o favorito simultâneo que pode passar o teto por uma linha,
  a regra da saudação do e-mail e o cache de CDN de `/api/rankings/status`. O resto
  do documento não foi alterado.

## Verificações executadas

| Comando | Resultado |
| --- | --- |
| `node --test tests/backend-evolucao.test.mjs` (executado 2 vezes) | passou: 8 de 8, 0 falhas |
| `node node_modules/eslint/bin/eslint.js server tests/backend-evolucao.test.mjs` | passou: saída 0, sem avisos |
| `npm test` (uma execução, `tests/` inclusive `src/`) | passou: 289 de 289, 0 falhas, saída 0 |
| `npm run build`, `db:*`, `access:*`, `test:*:aiven` | não executados (proibido pelas instruções) |

## Auditoria de rotas (T5) — somente leitura

Montagem em `server/app.js:186-198`. Limitadores globais do `/api` (`app.js:112-120`,
conforme `docs/SEGURANCA.md`): 240 chamadas/min por IP e 40 escritas/min por IP; não
reconferi os valores no código. Origem obrigatória em métodos não seguros
(`security-limits.js:193-206`). Cookie de sessão `HttpOnly`, `SameSite=strict`
(`auth.js:219-230`).

Legenda: "IP" = limitador com chave padrão do express-rate-limit (IP); "conta" = chave
é o id da sessão. "Sessão" = dono vem de `req.authenticatedUser`. "Parâmetro" = dono
vem de `:id` e é conferido no SQL ou no código.

### auth (`server/auth.js`, prefixo `/api/auth`)

| Método e caminho | Autenticação | Permissão | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- | --- |
| GET /availability | não | — | global | — | não |
| POST /register | não | — | registrationLimiter 5/15 min IP (`auth.js:68`); app.js: registrationBudget e registrationEntryLimiter | — | não |
| POST /verification/resend | não | — | resendLimiter 8/15 min (`auth.js:81-94`); app.js: emailEntryLimiter, emailCooldown, recipient e budgets | e-mail | não |
| POST /verify-email | não | — | verifyEmailLimiter 8/15 min | token (hash) | não |
| POST /login | não | — | app.js:160-166: loginIpLimiter, loginAccountLimiter, loginEmailCeiling | e-mail | não |
| GET /me | sessão (currentUser) | — | global | sessão | não |
| PATCH /me | sessão | — | global | sessão | não |
| DELETE /me | sessão | — | accountDeletionLimiter 3/15 min (`auth.js:95`) | sessão + senha | não |
| POST /password/forgot | não | — | forgotLimiter 5/15 min (`auth.js:645`) + budgets de e-mail | e-mail | não |
| POST /password/reset | não | — | resetLimiter 5/15 min | token (hash) | não |
| POST /password/change | sessão | — | changeLimiter 5/15 min | sessão | não |
| POST /sessions/revoke | sessão | — | revokeLimiter 5/15 min | sessão | não |
| GET /export | sessão | — | global (sem teto próprio) | sessão | não |
| POST /logout | não exigida | — | global | cookie | não |

### rankings (`server/rankings.js`, prefixo `/api/rankings`)

| Método e caminho | Autenticação | Permissão | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- | --- |
| GET /status | não | — | sem próprio; cache CDN (`sharedCache`) | público | não |
| GET /public | não | — | sem próprio; cache CDN 60 s; chama o provedor de cotações (`rankings.js:102-109`) | público | não |
| GET /compare | sessão | — | global | sessão | não (ids validados por regex e BigInt, `rankings.js:65-70`) |
| GET /market | sessão | — | global | sessão | não |
| GET /price-series/:ticker | sessão | — | priceSeriesLimiter 30/min IP | ticker | não |
| GET /history/:ticker | sessão | — | global | ticker | não |
| GET / | sessão | — | global | sessão | não |
| POST /preview e POST / | sessão | rankings:write (`manage`) | limiter 20/15 min IP; planilha 1 MB | sessão | não |

### rascunhos de pesquisa (`server/research-drafts.js`, prefixo `/api/rankings/drafts`)

Todas as rotas: sessão + `rankings:write` (`research-drafts.js:14`). Limitador de
escrita: 60/15 min IP (`research-drafts.js:15-21`).

| Método e caminho | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- |
| GET / | global | sessão (`:72-78` só lista do usuário) | não |
| GET /:id | global | parâmetro + sessão (`user_id=?`, linha 76) | não |
| POST / | limiter 60/15 min | sessão; teto de 100 rascunhos (`:149-153`) | não |
| PUT /:id | limiter 60/15 min | parâmetro + sessão (`user_id=?` linha 130; versão otimista) | não |
| DELETE /:id | limiter 60/15 min | parâmetro + sessão (linha 187) | não |

### notificações (`server/notifications.js`, prefixo `/api/notifications`)

Todas as rotas: sessão (`:14`).

| Método e caminho | Permissão | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- |
| GET / | — | global | sessão (`user.id`, `user.createdAt`) | não (fragmentos constantes, `:21-24`) |
| POST /read | — | global | sessão | não (fragmentos constantes, `:103-112`) |
| POST /read-all | — | global | sessão | não |
| POST /publish-learning | rankings:write | global | catálogo fixo (`:151-157`) | não |

### aprendizado (`server/learning.js`, prefixo `/api/learning`)

| Método e caminho | Autenticação | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- |
| GET / | opcional (currentUser) | global | sessão | não |
| PUT /progress/:id | sessão | global | sessão; id validado contra o catálogo fixo (`:24`) | não |
| DELETE /progress | sessão | global | sessão | não |

### administração (`server/admin.js`, prefixo `/api/admin`)

Todas as rotas: sessão + `users:read` (`admin.js:18`).

| Método e caminho | Permissão extra | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- |
| GET /launch | — | global | — | não |
| POST /launch/email-check | users:manage | emailCheckLimiter 3/15 min | — | não |
| GET /summary | — | global | — | não |
| GET /users | — | global | filtros em `conditions` com valores parametrizados (`:105-129`) | constantes apenas |
| PATCH /users/:id/access | users:manage | limiter 30/15 min | parâmetro; ator revalidado como ADMIN com trava (`:139-172`) | não |
| GET /audit | audit:read | global | — | não |

### suporte (`server/support.js`, prefixo `/api/support`)

Todas as rotas: sessão + `support:own` (`:26`). `/team`: também `support:manage` (`:28`).

| Método e caminho | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- |
| GET / e GET /team | global | sessão (lista própria) ou equipe | constante (`:69`) |
| POST / | limiter 30/15 min IP + threadLimiter 10/dia por conta (`:74`) | sessão | não |
| GET /:id e GET /team/:id | global | parâmetro; dono ou equipe (`:131-135`) | não |
| POST /:id/messages e /team/... | limiter 30/15 min + messageLimiter 200/dia por conta; equipe isenta (`:154-159`) | parâmetro; dono ou equipe (`:185-196`) | não |
| PATCH /:id/consent | limiter 30/15 min | parâmetro; só o titular (`:222`) | não |

### carteira (`server/portfolio.js`, prefixo `/api/portfolio`)

Todas as rotas: sessão (`:28`). Importação: `importLimiter` 20/15 min IP (`:29-32`).

| Método e caminho | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- |
| GET /activity, GET / | global | sessão (`readLedger` filtra `user_id`) | não |
| POST /transactions | global; assertRoom 10.000 | sessão | não |
| PUT /transactions/:id | global | parâmetro, conferido no livro-razão da sessão (`:235`), `UPDATE ... AND user_id=?` (`:248`) | não |
| DELETE /transactions/:id | global | parâmetro, conferido (`:273`), `DELETE ... AND user_id=?` (`:280`) | não |
| POST /events | global; assertRoom 2.000 | sessão | não |
| DELETE /events/:id | global | parâmetro, conferido (`:358`), `user_id=?` (`:364`) | não |
| POST /import/preview e POST /import | importLimiter 20/15 min; assertRoom 10.000 | sessão | não |
| GET /export | global | sessão | não |
| GET e PUT /preferences | global | sessão | não |

### favoritos (`server/favorites.js`, prefixo `/api/favorites`)

Todas as rotas: sessão (`:9`). Sem limitador próprio além do global.

| Método e caminho | Dono | Teto | SQL com concatenação |
| --- | --- | --- | --- |
| GET / | sessão | — | não |
| PUT /:ticker | sessão | 300 (409, antes do INSERT, `:21-24`) | não |
| DELETE /:ticker | sessão | — | não |

### mercado (`server/market.js`, prefixo `/api/market`)

Sem autenticação (cotações são públicas). `Cache-Control: no-store` (`:50-53`).

| Método e caminho | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- |
| GET /assets | quoteLimiter 30/min IP | — | não |
| GET /quotes | quoteLimiter 30/min IP | — | não |
| GET /quote/:ticker | quoteLimiter + providerLimiter 12/min IP | ticker validado | não |
| GET /history/:ticker | quoteLimiter + providerLimiter 12/min IP | ticker validado | não |

### assistente (`server/assistant.js`, prefixo `/api/assistant`)

Montado só com a flag `config.assistantFeatureEnabled` (`app.js:192-194`).

| Método e caminho | Autenticação | Limitador | Dono | SQL com concatenação |
| --- | --- | --- | --- | --- |
| GET /status | não | global | — | não |
| POST /chat | sessão | chatLimiter 8/15 min IP; contador diário por conta (`config.aiUserDailyLimit`); contador diário do projeto (`config.aiDailyLimit`) | sessão | não |

Os pontos de limite do chat ficam em `assistant.js:9-12, 29-32, 102-125`.

### Outros arquivos

- `server/dividend-import.js`: módulo de leitura de planilha usado por `rankings.js`; não é roteador.
- `server/spreadsheet.js`: leitura de CSV/XLSX; ver itens (b) abaixo.
- `GET /api/health` em `app.js:181-184`: `SELECT 1` público, sem limitador próprio.

## Achados (T5), por severidade

Nenhum achado de severidade alta. Nenhuma vulnerabilidade de IDOR, injeção SQL ou
vazamento de erro foi encontrada nas rotas lidas.

### Média

1. **Rascunhos sem teto de armazenamento por conta.** `server/research-drafts.js:108`
   limita cada rascunho a 1 MB e `:153` limita a 100 rascunhos. Uma conta pode guardar
   até cerca de 100 MB, fora dos tetos por conta da entrega anterior.
   Correção sugerida: teto de bytes por conta (soma de `LENGTH(payload)`), a ser
   aprovado pelo Orquestrador por ser política de produto.

2. **Contagem de não lidas e "marcar todas" percorrem todos os eventos desde a
   criação da conta.** `server/notifications.js:48-50` faz `COUNT(*)` com dois `LEFT
   JOIN` a cada abertura de `GET /`; `:102-113` insere uma linha por evento em
   `POST /read-all`. O custo cresce com o número de eventos publicados.
   Correção sugerida: contador de não lidas mantido na escrita, ou limitar a janela
   de eventos considerada. Índice novo exige migração (pendência do Orquestrador).

### Baixa

3. **Resposta da quiz expõe o gabarito a contas autenticadas.** `server/learning-content.js:45, 84, 123, 172`
   guardam `answer`; `serializeLessons` (`:187-189`) devolve a aula inteira com `...lesson`
   para usuários logados. O servidor confere a resposta em `learning.js:31`, mas quem lê
   `GET /api/learning` já tem a resposta. Correção: remover `answer` do payload
   autenticado. Decisão de produto (o progresso deixa de ser prova de resposta).

4. **Índice ausente para a lista da equipe.** `server/support.js:69` faz
   `ORDER BY t.updated_at DESC LIMIT 100` sem índice em `support_threads(updated_at)`
   (migração `005_education_platform.sql`). Efeito pequeno enquanto a tabela for pequena.

5. **Lista de usuários da administração.** `server/admin.js:126-128` ordena por
   `u.created_at` sem índice (`001_identity.sql` só tem o índice de e-mail); `:109`
   usa `LOCATE` (varredura); `:72` aceita página até 100.000, com `OFFSET` profundo.
   Restrito a administradores. Correção: índice em `users(created_at, id)` (migração, pendência)
   e limite menor de página.

6. **Exportação de dados sem teto próprio.** `server/auth.js:852` (`GET /export`) só tem o
   limitador global. Com o teto de 10.000 operações, a resposta pode ficar grande.
   Correção: limitador por conta, ou paginação/compressão.

7. **Visão da equipe da carteira compartilhada.** `server/support.js:145-150` carrega até
   10.000 operações a cada abertura de conversa com carteira compartilhada. Limitado pelo
   teto, mas sem limite de leitura por conversa.

8. **Carregamento do livro-razão em cada escrita.** `server/portfolio.js:118-119`
   (`mutate`) lê todo o livro-razão da conta a cada escrita. O teto (10.000/2.000)
   limita o custo; não há mudança recomendada agora.

9. **Linhas de CSV criadas antes da validação de tamanho.** `server/spreadsheet.js:98`
   confere 1.001 linhas só depois de montar a matriz inteira. O corpo já é limitado
   a 1 MB (`:12`, `:111`), então o efeito é de memória moderada.

10. **Rota pública com chamada ao provedor de cotações.** `server/rankings.js:96-119`
    (`GET /public`) chama `quoteService.canonicalQuotes` sem limitador próprio. O cache
    (`s-maxage=60`, `:94-95`) e o orçamento diário do provedor (`docs/SEGURANCA.md`)
    limitam o custo. Não verifiquei o orçamento em execução.

### Verificado e considerado correto

- **IDOR/BOLA**: carteira (`portfolio.js:235, 248, 273, 280, 358, 364`), rascunhos
  (`research-drafts.js:76-77, 130, 187-188`), conversas (`support.js:131-135`),
  favoritos (`favorites.js`, dono da sessão), notificações (leitura por `user_id` e
  elegibilidade por `createdAt`), aprendizado (id contra catálogo fixo). Administração:
  ação só para ADMIN revalidado sob trava, com última administração protegida e
  revogação de sessões (`admin.js:139-257`).
- **SQL**: concatenações encontradas usam apenas constantes ou fragmentos internos:
  `admin.js:121-124`, `support.js:69`, `notifications.js:44-50, 104, 110`,
  `provider-cache.js:29-44` (caminho vindo de lista fixa), `market-closes.js:27, 55, 62`
  (constante), `market-closes.js:98-100` (apenas placeholders). Valores vão por `?`.
- **Upload CSV/XLSX**: 1 MB no corpo (`spreadsheet.js:12, 111`); XLSX descompactado
  conferido por streaming (`:16-55`), com 5 MB por entrada e 10 MB no total, sem
  confiar no diretório central forjado (`:40-53`; teste em
  `tests/security-audit.test.mjs:33`); 1.001 linhas e 40 colunas (`:98, :129`);
  erro de leitura genérico (`:151-156`); `URIError` do cabeçalho de nome de arquivo
  vira 400 (`rankings.js:388`).
- **Erros**: resposta genérica, sem pilha nem SQL; log só com código curto
  (`api-errors.js:117-124`).
- **CSRF**: origem exigida e conferida com lista de origens permitidas, bloqueio de
  `sec-fetch-site: cross-site` (`security-limits.js:193-206`); cookie `SameSite=strict`.
- **Sessão**: lookup por hash único (`001_identity.sql:17`); renovação no máximo 1 vez
  a cada 24 h (`session-policy.js:6, 33-45`); limpeza de expirados no máximo 1 vez por
  hora por instância (`auth-cleanup-policy.js:13-19`).
- **Chave do assistente**: enviada em cabeçalho (`assistant.js:134`), não na URL.
- **Índices** consultados nas migrações: `user_sessions(token_hash)` único e
  `expires_at`; `portfolio_transactions(user_id, traded_at, created_at, id)`;
  `portfolio_events(user_id, occurred_at)`; `user_favorites(user_id, ticker)` PK;
  `research_drafts(user_id, updated_at)`; `notification_events(created_at, id)` e
  únicos de publicação; `notification_event_reads` PK `(user_id, notification_id)`;
  `market_daily_closes(ticker, trade_date)` PK e índice por data; `provider_cache` e
  `request_limits` por PK e `expires_at`; `ranking_publications` por PK
  (`ORDER BY id DESC LIMIT 1`).

## O que não foi verificado

- Nenhuma consulta foi executada em banco (proibido). `EXPLAIN`, plano de execução e
  tempos reais não foram medidos; a análise de índices é estática.
- Não li `server/limit-store.js` por inteiro (apenas `sharedCache`); o comportamento do
  `MysqlLimitStore` sob concorrência não foi conferido.
- Não reconferi os valores de `apiLimiter` e `writeLimiter` (globais) nem o `helmet`
  padrão (diretivas de estilo, `X-Frame-Options`). Usei as afirmações de
  `docs/SEGURANCA.md`.
- Não verifiquei a origem dos nomes de tabela em `server/backup.js:54, 126, 139`
  e `server/transfer-aiven.js`, nem os scripts `bootstrap-aiven-app.js` e
  `provision-qa.js` (são operacionais, fora das rotas).
- Não li por inteiro `auth.js` (login, cadastro, recuperação); a análise dessas rotas
  se apoia nos limitadores e nas consultas lidas.
- Não testei XSS na camada de resposta (a API devolve JSON; a CSP fica no HTML).
- O orçamento real do provedor de cotações e o comportamento do Vercel na
  frente da API não foram verificados.

## Pendências que dependem do dono

- **Chaves do Cloudflare Turnstile** (cadastro): sem chaves válidas, o cadastro depende
  só dos limites por IP e por e-mail (`docs/SEGURANCA.md`).
- **Limites em memória por instância** (Vercel): `requestAdmission` (60 em 10 s e 32
  respostas em andamento), o cache de ranking (`latestCache`) e o controle de limpeza
  valem por instância. Os contadores persistentes (`request_limits`) são compartilhados.
- **Decisões de produto**: teto de armazenamento de rascunhos (achado 1), gabarito nas
  respostas de aprendizado (achado 3) e limite de exportação (achado 6).
- **Migrações de índice** (achados 2, 4 e 5): exigem aprovação do Orquestrador, pois
  alteram o esquema. Não foram criadas.
- **Orçamento do provedor** (`market/plans.js`, padrão 420 por dia): confirmar o valor
  de produção antes de liberar `GET /public` a mais tráfego.

## Próximo passo

Orquestrador revisa as mudanças em `package.json`, `server/support.js`,
`docs/SEGURANCA.md`, `tests/backend-evolucao.test.mjs` e este relato. Decide os achados
médios (1 e 2) e as migrações pendentes. Liberação das reservas (`release backend`) e
atualização do quadro ficam com o Orquestrador.
