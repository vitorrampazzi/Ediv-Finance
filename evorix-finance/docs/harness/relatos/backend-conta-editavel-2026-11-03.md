# Backend — conta editável (03/11/2026)

## Entregue

- `PATCH /api/auth/me` em `server/auth.js`: exige sessão válida com e-mail confirmado (`requireAuthenticatedUser`, o mesmo critério do `GET /me`), aceita só `{ "name": string }` (schema estrito com `registerSchema.shape.name`: trim, 2 a 100 caracteres) e grava com `UPDATE users SET name = ? WHERE id = <sessão>`. Responde 200 `{ user }` no formato do `GET /me`.
- Erros: 400 `{ error: "Informe um nome com 2 a 100 caracteres." }` (inclui campos extras como `id`/`email`); 401 `{ error: "Entre na sua conta para continuar." }`; 403 de origem e 429 do `writeLimiter` vêm das camadas globais.
- `PATCH` já constava em `allowedMethods` (`server/app.js`) e a checagem de Origin/JSON em `requestPolicy` vale para todo método não seguro; nada mudou ali.
- Pendência da auditoria: `verificationLimiter` virou fábrica; `/verify-email` usa o prefixo `verify` (contador atual preservado) e `/verification/resend` usa `verification-resend`, ambos 8 por 15 minutos.

## Verificações

- `npm test`: 132/132. `npm run lint`: ok.
- `node --test tests/api-resilience.test.mjs`: 3/3 (sem banco; cobre 401, 400 para nome curto/longo/só espaços/não string/ausente/campos extras, 200 com o id da sessão no UPDATE e 403 de origem externa).
- `tests/integration.test.mjs`: novo caso "conta edita só o próprio nome" (401, 400, 200, GET /me coerente, conta `b` intacta no banco). Não executado aqui; roda na CI com MySQL descartável.

## Observações

- Sem migração nem tabela nova; troca de e-mail fora do escopo.
- Não há lista de rotas/métodos em `tests/security-audit.test.mjs`; nada a acrescentar.
