# Backend — auditoria e correções A–G — 02/11/2026

## Contexto

Auditoria somente leitura de `server/`, `api/`, `vercel.json` e helpers `.mjs`,
seguida da implementação aprovada pela coordenação dos itens A–G. Sem achado
crítico: não foram encontrados IDOR/BOLA, injeção SQL, XSS em HTML do servidor
ou segredo exposto ao bundle.

Fato de produção informado pela coordenação: o MySQL Aiven está inacessível
(`ENOTFOUND` no log de QA) e todas as rotas, inclusive `/api/health`, devolviam
503 "O serviço está ocupado" sem causa registrada, porque o `apiLimiter`
(MysqlLimitStore) falha primeiro como `RATE_LIMIT_STORE_UNAVAILABLE`.
Estas mudanças NÃO restauram o banco; tornam a falha visível e honesta.

## Arquivos

- Novo `server/api-errors.js`: classificação de falhas e handler de erros.
- `server/app.js`: usa o handler novo; ordem dos limitadores de login e e-mail.
- `server/security-limits.js`: `loginIpLimiter`, `loginAccountLimiter` por
  e-mail+IP, `loginEmailCeiling`, `emailEntryLimiter`.
- `server/auth.js`: limitador de login removido do router (agora em app.js);
  limitadores de recuperação separados por rota.
- `server/limit-store.js`: limpeza horária isolada.
- `server/stock-history.js`: carregamento sob demanda e memoizado.
- `server/rankings.js`: Cache-Control público curto em `GET /api/rankings/public`.
- Novo `tests/api-resilience.test.mjs`.

## O que foi feito

**A — observabilidade e indisponibilidade.** `classifyServiceError` separa:
- indisponível: ENOTFOUND, EAI_AGAIN, ECONNREFUSED, ECONNRESET, ETIMEDOUT,
  EHOSTUNREACH, ENETUNREACH, PROTOCOL_CONNECTION_LOST — no erro, na `cause`
  ou dentro de AggregateError (falha dual-stack); e qualquer outra falha do
  store obrigatório de limites. Resposta 503 "O serviço está temporariamente
  indisponível. Tente novamente em alguns minutos.", `Retry-After: 30`.
- ocupado (sobrecarga real): PASSWORD_WORK_BUSY, ER_CON_COUNT_ERROR,
  ER_USER_LIMIT_REACHED, ER_LOCK_WAIT_TIMEOUT e fila do pool, também como
  causa. Mensagem anterior mantida, `Retry-After: 2`.
O ramo 503 grava `console.error` com throttle de 10 s por tipo+código+causa, no
formato `API request failed: <requestId> status=503 unavailable
RATE_LIMIT_STORE_UNAVAILABLE cause=ENOTFOUND`. Só códigos validados por regex;
nunca mensagem, host, SQL ou dados pessoais. 413/400/415/500 inalterados.
EHOSTUNREACH/ENETUNREACH foram acrescentados à lista pedida por serem a
mesma classe de falha de rede.

**B — limpeza horária do limit-store.** O DELETE de `request_limits` tem
try/catch próprio e só registra o código. Exceção deliberada: falha de
conexão é repassada imediatamente, para não esperar uma segunda tentativa de
conexão (até 10 s cada) no INSERT logo em seguida.

**C — e-mail.** `emailEntryLimiter` (5 por 15 min por IP, prefixo
`email-entry`) é o primeiro middleware da cadeia register/resend/forgot, antes
de cooldown, destinatário e orçamentos globais. No cadastro, o limite por IP
pré-existente (`registrationEntryLimiter`) já precedia o `registrationBudget`.
Contagem conferida nos testes de integração e browser: no máximo 3 chamadas
de e-mail por cenário entre limpezas de limites.

**D — login.** Em app.js: `loginIpLimiter` (os mesmos 8 por 15 min por IP,
antes no router) → `identifyEmail` → `loginAccountLimiter` (12 por 15 min,
chave e-mail+IP, prefixo novo `login-account-ip`) → `loginEmailCeiling`
(100 por hora só por e-mail). Bloquear uma conta agora exige vários clientes
(cada um limitado a 8 por 15 min) em vez de um.

**E — recuperação.** Um limitador por rota, mesmo limite 5 por 15 min:
`password-recovery` (forgot, prefixo preservado), `password-reset`,
`password-change`, `sessions-revoke`.

**F — histórico.** O JSON de ~11,8 MB só é descompactado e parseado na primeira
chamada de `stockHistory()` e reaproveitado. `includeFiles` do vercel.json
continua levando o arquivo.

**G — cache público.** Conferido no código: `/api/rankings/public` não lê
cookie, sessão nem query, e nada na cadeia define cookie. Somente no sucesso
define `public, max-age=0, s-maxage=60, stale-while-revalidate=300`; erros
mantêm `no-store` global. Os cabeçalhos RateLimit de quem gerou a resposta
podem ser reaproveitados pela CDN — informativo, sem dado pessoal.

## Verificações

- `npm test`: 128/128 passaram.
- `npm run lint`: passou, sem avisos.
- `node --test tests/api-resilience.test.mjs tests/stock-history.test.mjs`: 4/4.
  O teste novo sobe o app real no loopback com `pool.execute` simulado em
  memória (nenhuma conexão aberta). Cobre 503 indisponível com causa e sem
  host/mensagem no log, throttle, ocupado, 500 genérico, limpeza com lock só
  registrada, limpeza sem conexão sem segunda tentativa, Cache-Control,
  ordem IP→conta no login e IP→orçamento global no e-mail, e contadores de
  recuperação separados.
- Node local é v24.20.0; package.json pede 22.x. CI usa 22.
- NÃO executados: `npm run test:integration`, browser e backup — exigem MySQL
  descartável, indisponível localmente. Nenhum banco foi acessado.

## Pendências para a coordenação

- `tests/api-resilience.test.mjs` não entra em `npm test` até alguém com escopo
  em package.json acrescentá-lo à lista do script `test`.
- Restaurar o acesso ao Aiven (DNS/host do serviço, serviço pausado ou
  credenciais na Vercel) continua necessário; os logs agora devem mostrar a causa.
- Resíduo do item 1: 5 por 15 min por IP ainda soma 480/dia, então um único IP
  pode esgotar o orçamento diário de 90 em cerca de 4,5 h (antes eram ~30 min);
  a janela de 10 min já não é esgotável por um IP. Correção definitiva: só
  consumir os orçamentos globais quando um e-mail for realmente enviado.
- Não implementados nesta rodada, conforme orientação: 3 (enumeração por
  tempo de resposta), 6 (`/api/market` público e sem cache negativo),
  7 (SQL por requisição e `currentUser` duplicado), 10 (nome no e-mail),
  12 (índice da inbox, exige migração), 13 (HSTS/COOP em vercel.json).
- Também observado: `verificationLimiter` é compartilhado entre resend e
  verify-email (mesmo padrão do item 9), fora do escopo aprovado.

## Riscos

- Prefixos novos de login começam zerados: contadores antigos de `login` e
  `login-account` deixam de valer no deploy (efeito único e inofensivo).
- `loginEmailCeiling` ainda permite bloqueio por e-mail com ≥4 clientes
  coordenados por hora; é o compromisso contra tentativas distribuídas.
- Falhas inéditas do store de limites passam a aparecer como "indisponível"
  (antes "ocupado"); o código e a causa ficam no log para diagnóstico.
- Integração SQL/HTTP real das mudanças depende da CI com MySQL descartável.
