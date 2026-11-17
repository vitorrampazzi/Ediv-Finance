# Brief C3 — Pincel: uma só `apiRequest` (Eixo C)

Para: Pincel (interface). Eixo C, fatia 5 do plano (duplicação 2.2 do relato C1). **Só comece depois que a C2 passou na revisão** e o Pincel liberou os caminhos dela (`release`). Mexe em `package.json` (uma linha, **exceção aprovada pelo Orquestrador em 17/11**; o Pincel normalmente não edita `tests/` nem `package.json`): **só comece depois que a 2E do Tijolo liberar `package.json`** (ela também o reserva).

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
git status --short
node scripts/harness.mjs claim interface src/lib/api.ts src/context/AuthProvider.tsx tests/api-client.test.mjs package.json docs/harness/relatos/interface-eixoc-c3-2026-11-17.md
node scripts/harness.mjs update interface trabalhando "C3: apiRequest única em src/lib/api.ts"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. **Pare e avise também se:** (a) `status` mostrar outro papel com qualquer um desses caminhos (em especial o Tijolo com `package.json`); (b) `git status --short` mostrar `src/lib/api.ts` ou `src/context/AuthProvider.tsx` como modificado por outra pessoa; (c) o `claim` falhar. Ao terminar:

```
node scripts/harness.mjs update interface revisao "C3 pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Deixar **um só** lugar que implementa a requisição JSON do cliente (`src/lib/api.ts`), com o `AuthProvider` usando essa implementação, **sem mudar** o tempo limite de cada chamador (30 s na sessão, 45 s no resto) nem o resto do comportamento de login, sessão e erro de rede.

## Contexto mínimo

- Plano: `docs/harness/briefs/02-plano-eixo-c.md`, seção "C3". Diagnóstico: `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`, item 2.2. Regra da skill `zizi-skills:code-quality`: duas cópias que precisam andar juntas compartilham uma base.
- Duas cópias hoje (conferido em 17/11):
  - `src/lib/api.ts:19..65` (`apiRequest<T>`): tempo limite **45 s** (`:29-30`); lê `Retry-After` e põe `retryAfterMs` no `ApiError` (`:45-61`); não manda `cache`.
  - `src/context/AuthProvider.tsx:23..61` (função local `apiRequest`, devolve `ApiMessage`): tempo limite **30 s** (`:34-35`); manda **`cache: "no-store"`** (`:32`); **não** lê `Retry-After`; `ApiError` sem `retryAfterMs`.
  - O resto é igual: `credentials: "same-origin"`, `AbortSignal.any` com o sinal do chamador, cabeçalhos `Accept` e `Content-Type`, mensagem "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente." (um `Error`, não `ApiError`), resposta 204 → `{}`, mensagens padrão para 429, 503 e demais erros, `code` propagado.
- Seis chamadas locais no `AuthProvider`: `:114` (`/api/auth/me`), `:211` (login), `:233` (logout), `:249` (`/api/auth/me`), `:273` (cadastro), `:288` (reenvio de verificação).
- **Os testes que o plano cita não cobrem o cliente.** `tests/session.test.mjs` testa `server/session-policy.js` e `tests/api-resilience.test.mjs` testa `server/api-errors.js`: ambos continuam verdes e **não provam** nada sobre `src/lib/api.ts` nem `AuthProvider.tsx`. Os testes de navegador da sessão (`tests/session.browser.mjs`, `npm run test:session`) exigem MySQL descartável (`EDIV_TEST_MYSQL_DISPOSABLE=true`), que não existe nesta máquina: **não rode** e registre "não executado: sem MySQL descartável". Por isso este brief pede um **teste de caracterização novo** do módulo compartilhado e uma comparação antes e depois no navegador, com respostas fictícias (passos 2 e 6). **Ambos aprovados pelo Orquestrador em 17/11.** O teste novo **espelha `tests/polled-store.test.mjs`**: mesmo estilo (`node:test`, `node:assert/strict`) e importa o `.ts` de `src/lib` direto (`tests/polled-store.test.mjs:3`; também `tests/live-quotes.test.mjs:17`).
- Quem lê `retryAfterMs` hoje: `src/hooks/useNotifications.ts:202` e `src/lib/polledStore.ts:65`. Nenhum deles trata erro de sessão. Unificar faz os erros de login e de sessão passarem a **carregar** `retryAfterMs` quando o servidor mandar `Retry-After`. **O Orquestrador aceitou isso em 17/11:** é um campo a mais que ninguém lê nesse caminho. Confirme no passo 1 que nada em `AuthProvider.tsx` ou em quem consome seus erros lê esse campo, e **registre no relato como "mudança de comportamento pequena e intencional"**. É a única mudança de comportamento permitida.
- **Forma sugerida** (outra equivalente é aceita se cumprir os critérios): em `src/lib/api.ts`, acrescentar um terceiro parâmetro opcional `options: { timeoutMs?: number } = {}` com padrão de 45 000 ms, e **nenhuma mudança** nas chamadas existentes. No `AuthProvider.tsx`, apagar a função local e importar `apiRequest` de `../lib/api`; criar, dentro do módulo, um invólucro de uma linha, por exemplo `const sessionRequest = (path: string, init: RequestInit = {}) => apiRequest<ApiMessage>(path, { ...init, cache: "no-store" }, { timeoutMs: 30000 });`, e trocar as 6 chamadas por ele. O `ApiMessage` fica no `AuthProvider.tsx`. O invólucro **não** reimplementa a requisição: só fixa os dois valores que são da sessão.

## Pode ler / pode editar

- **Pode ler** qualquer arquivo do projeto, exceto `.env*`.
- **Pode editar:**
  - `src/lib/api.ts` (só `apiRequest`: o tempo limite vira opção; o `ApiError` e o resto ficam).
  - `src/context/AuthProvider.tsx` (só a função local `apiRequest` e as 6 chamadas).
  - `package.json` (**só** a linha de `scripts.test`, para acrescentar `tests/api-client.test.mjs` ao final da lista; nada mais; exceção aprovada em 17/11, depois que a 2E liberar o arquivo).
- **Pode criar:** `tests/api-client.test.mjs` e o relato `docs/harness/relatos/interface-eixoc-c3-2026-11-17.md`.

## Fora do escopo

- Os outros `fetch` à mão: `src/pages/auth/VerifyEmailPage.tsx:38` (justificado: consome token de uso único e não pode ser reexecutado) e `src/pages/IncomeRanking.tsx:306` (envio de planilha) e `src/components/EdivAssistant.tsx` (experimental). Liste-os no relato como "não feito"; não os mude.
- Mudar qualquer tempo limite (30 s e 45 s ficam como estão), a lógica de sessão (`sessionRevision`, `pendingRefresh`, `BroadcastChannel` etc.), mensagens de erro, textos legais, regra financeira ou número exibido.
- Padronizar carregamento, erro e vazio dos hooks (decisão do Orquestrador, fora desta fatia); mexer em `src/hooks/`, `server/`, outros testes, `package-lock.json`.
- `npm install`, instalar ferramenta, medir ou abrir produção, rodar teste que use MySQL.

## Passos

1. **Releia as duas cópias** (`src/lib/api.ts:19..65` e `src/context/AuthProvider.tsx:23..61`) e confira, linha a linha, a lista de diferenças acima (45 s × 30 s, `cache`, `Retry-After`). Se achar **outra** diferença, **pare** e avise. Rode `grep -rn "retryAfterMs" src` e confirme que só `api.ts`, `useNotifications.ts:202` e `polledStore.ts:65` aparecem; registre o resultado.
2. **Teste de caracterização, antes de mexer.** Crie `tests/api-client.test.mjs` (`node:test`, `node:assert/strict`, importando `../src/lib/api.ts`). Substitua `globalThis.fetch` por uma função falsa que guarda os argumentos recebidos e devolve `new Response(...)`. Para capturar o tempo limite, troque `AbortSignal.timeout` por uma função que guarda o valor recebido e chama a original. Restaure `fetch` e `AbortSignal.timeout` ao final de cada teste. Cubra, no comportamento **atual**:
   - tempo limite padrão = 45000;
   - `credentials: "same-origin"`, `Accept: application/json`, `Content-Type: application/json` só quando há `body`, e cabeçalho do chamador sobrescrevendo;
   - o sinal do chamador abortado aborta a requisição (`AbortSignal.any`);
   - falha de rede → `Error` (não `ApiError`) com a mensagem "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.";
   - resposta 204 → `{}`;
   - erro com `error` e `code` no corpo → `ApiError` com `message`, `status` e `code`;
   - erro sem corpo JSON: 429, 503 e outro status, cada um com a mensagem padrão do código atual;
   - `Retry-After` em segundos (`"3"` → 3000) e em data HTTP (resultado ≥ 0), e ausente (→ `undefined`).
   Rode `node --test tests/api-client.test.mjs` **e confirme que passa no código atual** (antes de qualquer edição de `src/`). Se não passar, o teste está errado: corrija o teste, não o código.
3. **Fotografia "antes" no navegador** (script Playwright **descartável fora do repositório**, apagado ao terminar). Com o `dist/` atual em `npx vite preview --port 4173`, `localhost`, em 390×844:
   - `page.addInitScript` que troca `AbortSignal.timeout` por uma função que guarda o valor em `window.__timeouts` e chama a original;
   - `page.route` em **todas** as rotas `/api/*` com respostas fictícias e fixas: `GET /api/auth/me` → 401 (`{ "error": "Sessão ausente (fictício)" }`); `POST /api/auth/login` → 401 com `{ "error": "Credenciais inválidas (fictício)" }` e, em outra rodada, 200 com `{ user: { id, name: "Pessoa Teste (fictício)", email: "teste@example.invalid", emailVerified: true, createdAt, role: "USER", permissions: [] } }`; as demais rotas → 503;
   - registre, em `/entrar` (a página de login), para cada requisição a `/api/*`: método, caminho, os cabeçalhos de `request.allHeaders()` que começam por `cache-control` e `pragma`, e depois `window.__timeouts` (esperado hoje: `30000` para a sessão e `45000` para chamadas que usam `src/lib/api.ts`, por exemplo as de `useRegistrationAvailability` — **a confirmar** qual URL é);
   - registre o texto do erro mostrado na tela depois do login recusado e o destino depois do login aceito.
   Se a simulação não funcionar, registre "comparação no navegador não executada" e o motivo.
4. **Implementar.** Faça a mudança de `src/lib/api.ts` e do `AuthProvider.tsx` (forma sugerida acima). Mantenha o diff pequeno: remoção de ≈ 40 linhas no `AuthProvider.tsx`, acréscimo de poucas linhas no `api.ts`.
5. **Teste do que mudou.** Acrescente ao `tests/api-client.test.mjs`: tempo limite com `{ timeoutMs: 30000 }` = 30000; `cache: "no-store"` passado em `init` chega ao `fetch`; as chamadas **sem** a opção continuam em 45000. Acrescente `tests/api-client.test.mjs` ao final de `scripts.test` em `package.json` (nada mais nesse arquivo). Rode `node --test tests/api-client.test.mjs`.
6. **Fotografia "depois".** `npm run build`, o mesmo script do passo 3 contra o `dist/` novo. Os registros têm de ser **iguais** aos do "antes": mesmos tempos (`30000` e `45000`), mesmos cabeçalhos de cache, mesmo texto de erro, mesmo destino. Registre os dois lados lado a lado.
7. **Validação** (comandos abaixo) e relato.

## Critérios de aceite (observáveis)

- [ ] Um só lugar implementa a requisição: `grep -c "fetch(" src/lib/api.ts` imprime `1` e `grep -c "fetch(" src/context/AuthProvider.tsx` imprime `0`; `grep -n "AbortSignal.timeout" src/context/AuthProvider.tsx` não acha nada. O `git diff` mostra a função local apagada e nenhuma outra cópia criada.
- [ ] O tempo limite de cada chamador não mudou: chamadas do `AuthProvider` = 30000; as demais = 45000 (teste novo e `window.__timeouts` no navegador, antes e depois iguais).
- [ ] `cache: "no-store"` continua nas 6 chamadas do `AuthProvider` (teste novo e `git diff`; cabeçalhos observados no navegador iguais antes e depois, ou "não observável" com o motivo).
- [ ] `tests/api-client.test.mjs` passa **no código antigo** (passo 2) e **no novo** (passo 5), com os casos listados; está na lista de `npm test` em `package.json`; o diff de `package.json` é uma linha.
- [ ] Login recusado mostra a mesma mensagem e login aceito leva ao mesmo destino, antes e depois (ou "não executado" com o motivo).
- [ ] `tests/session.test.mjs` e `tests/api-resilience.test.mjs` verdes (via `npm test`) e relatados como **"não cobrem o cliente"**; `tests/session.browser.mjs` relatado como "não executado: sem MySQL descartável".
- [ ] `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test` e `npm run build` passam.
- [ ] Nenhum erro de sessão ou de login passa a ser tratado diferente: `grep -rn "retryAfterMs" src` não mostra leitor novo, e o relato registra, como "mudança de comportamento pequena e intencional" (aceita pelo Orquestrador em 17/11), que os erros de login e de sessão agora carregam `retryAfterMs` quando houver `Retry-After`. Não há outra mudança de comportamento.
- [ ] `git status --short` lista só os caminhos permitidos, mais `docs/harness/state.json` e os arquivos dos outros executores.

## Comandos de validação (em `evorix-finance/`)

```
node --test tests/api-client.test.mjs
grep -c "fetch(" src/lib/api.ts src/context/AuthProvider.tsx
grep -n "AbortSignal.timeout" src/lib/api.ts src/context/AuthProvider.tsx
grep -rn "retryAfterMs" src
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test
npm run build
npx vite preview --port 4173
git diff -- package.json
git diff --stat
git status --short
node scripts/harness.mjs check
```

Porta do Pincel: **4173** (a 4175 é do Vigia). Medições e capturas só contra `localhost`.

## Formato do relato

Arquivo `docs/harness/relatos/interface-eixoc-c3-2026-11-17.md`, em português, com estas seções numeradas:

1. As diferenças encontradas entre as duas cópias (confirmação da lista do brief, ou o que mais apareceu), o resultado do `grep` de `retryAfterMs` e a frase "mudança de comportamento pequena e intencional: erros de login e de sessão passam a carregar `retryAfterMs`".
2. Arquivos alterados, com `arquivo:linha` (`api.ts`, `AuthProvider.tsx`, `package.json`, teste novo) e a forma escolhida.
3. Teste novo: casos, e a prova de que passou no código antigo antes da mudança e no novo depois.
4. Navegador, antes e depois, lado a lado: tempos, cabeçalhos de cache, mensagem de erro do login recusado, destino do login aceito (ou "não executado" e o motivo). Marque as respostas como fictícias.
5. O que os testes citados no plano cobrem de fato (servidor) e o que ficou sem cobertura (`tests/session.browser.mjs` e `tests/browser.mjs` exigem MySQL descartável: não executados).
6. Não feito: `VerifyEmailPage.tsx:38`, `IncomeRanking.tsx:306`, `EdivAssistant.tsx`.
7. Comandos rodados e resultado (passou, falhou, não executado e por quê).
8. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log, teste ou relato. Não abra `.env*`.
- Usuário, e-mail e respostas simulados só fictícios, só no teste e no script descartável (apague o script ao terminar). Nunca use credencial real. Não meça nem abra a produção.
- Testes nunca usam o banco de produção nem MySQL; não rode `test:session`, `test:integration` nem `test:browser`.
- Não faça commit, push, deploy, stash nem reset. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
