# Relato da interface, C3 (17/11/2026): apiRequest única

**Resultado em uma linha:** as duas cópias de `apiRequest` viraram uma só, em `src/lib/api.ts`. O `AuthProvider` usa essa mesma função por um invólucro de sessão que fixa `cache: "no-store"` e o tempo limite de 30 s. Comportamento preservado nos casos medidos, com uma mudança pequena e intencional (seção 2). Teste novo, 14/14, com mutação provada.

## 1. Diferenças entre as duas cópias

Confirmei, linha a linha, a lista do brief antes de editar:

- Tempo limite: `src/lib/api.ts` 45 000 ms (`:29-30`); `AuthProvider` 30 000 ms (`:34-35`).
- `cache: "no-store"`: só no `AuthProvider` (`:32`).
- `Retry-After`: lido só em `src/lib/api.ts` (`:45-61`). O `AuthProvider` não lia e o `ApiError` dele não tinha `retryAfterMs`.
- Resto igual: `credentials: "same-origin"`, `AbortSignal.any` com o sinal do chamador, `Accept`, `Content-Type` só com corpo, mensagem de conexão, 204 → `{}`, mensagens padrão de 429, 503 e demais, `code` propagado. Nenhuma outra diferença apareceu.

`grep -rn "retryAfterMs" src` (antes e depois da mudança) mostra só:
- `src/lib/api.ts` (definição e cálculo);
- `src/hooks/useNotifications.ts:202` (leitor, dentro de `ApiError`);
- `src/lib/polledStore.ts:65` (leitor genérico).

Nada em `AuthProvider.tsx` lê esse campo.

**Mudança de comportamento pequena e intencional:** erros de login e de sessão passam a carregar `retryAfterMs` quando o servidor manda `Retry-After`. Nenhum leitor desse caminho trata o campo, então nada muda na tela. Aceita pelo Orquestrador em 17/11. É a única mudança de comportamento.

## 2. Arquivos alterados

- `src/lib/api.ts`: `apiRequest<T>(path, init = {}, options: { timeoutMs?: number } = {})`. O tempo limite vem de `options.timeoutMs ?? 45000` e substitui os dois `AbortSignal.timeout(45000)` (`:31-32`). `ApiError`, mensagens e o resto ficaram. Diff: 6 linhas (+ e −).
- `src/context/AuthProvider.tsx`:
  - import (`:4`) passa a trazer `apiRequest` de `../lib/api`;
  - a função local `apiRequest` (≈ 40 linhas) foi apagada;
  - em `:23-28` entrou o invólucro `sessionRequest`, de 4 linhas, com `cache: "no-store"` e `{ timeoutMs: 30000 }`. Não reimplementa a requisição;
  - as 6 chamadas (`:83`, `:180`, `:202`, `:218`, `:242`, `:257`) trocaram `apiRequest(` por `sessionRequest(`.
  - Diff do arquivo: 19 inserções e 48 remoções no total, incluindo o `api.ts`.
- `tests/api-client.test.mjs`: arquivo novo (seção 3).
- `package.json`: acrescentado `tests/api-client.test.mjs` ao fim de `scripts.test`. Nada mais. Atenção: o arquivo tem outras mudanças já pendentes e aprovadas da 2E (`tests/public-cache.test.mjs` na mesma linha e a remoção de `autoprefixer` e `prettier` em `dependencies`/`devDependencies`). Não as toquei; ficam para a Lupa.

Contagem: `grep -c "fetch(" src/lib/api.ts` = 1; `grep -c "fetch(" src/context/AuthProvider.tsx` = 0; `AbortSignal.timeout` aparece só em `src/lib/api.ts`.

## 3. Teste novo

`tests/api-client.test.mjs`, estilo de `tests/polled-store.test.mjs` (`node:test`, `node:assert/strict`, importa `../src/lib/api.ts` direto). Substitui `fetch` e `AbortSignal.timeout` por falsos que registram os argumentos e restaura os originais ao fim de cada teste.

Casos:
1. tempo limite padrão = 45000;
2. `credentials`, `Accept`, `Content-Type` só com corpo;
3. cabeçalho do chamador sobrescreve o padrão;
4. sinal já abortado pelo chamador aborta a requisição (`AbortSignal.any`);
5. falha de rede → `Error` (não `ApiError`) com a mensagem de conexão;
6. 204 → `{}`;
7. erro com `error` e `code` → `ApiError` com `message`, `status` e `code`;
8. sem corpo JSON: 429, 503 e 500 com a mensagem padrão de cada um;
9. `Retry-After: 3` → 3000; data HTTP futura → entre 0 e 60000; data passada → 0; ausente → `undefined`;
10. (passo 5) `{ timeoutMs: 30000 }` → 30000;
11. (passo 5) sem a opção, duas chamadas → 45000 e 45000;
12. (passo 5) `cache: "no-store"` em `init` chega ao `fetch`.

**Prova de que passou no código antigo:** antes de editar `src/`, os 11 testes de caracterização (cobrindo os itens 1 a 9 da lista) passaram no `api.ts` original (`11 pass, 0 fail`).

**Prova de que pega regressão (mutação):** com o padrão trocado de 45000 para 30000 em `src/lib/api.ts`, `node --test tests/api-client.test.mjs` deu `12 pass, 2 fail` (falharam "tempo limite padrão é 45000 ms" e "sem a opção, as chamadas continuam em 45000 ms"). Restaurei a partir de uma cópia de segurança (`cmp` idêntico) e o teste voltou a `14 pass, 0 fail`.

## 4. Navegador, antes e depois

Script descartável fora do repositório (apagado ao terminar). `localhost:4173`, 390×844, Chrome instalado (`channel: "chrome"`), com respostas **fictícias**: `GET /api/auth/me` → 401 "Sessão ausente (fictício)"; `POST /api/auth/login` → 401 "Credenciais inválidas (fictício)" ou 200 com usuário fictício (`teste@example.invalid`); demais `/api/*` → 503. Foi trocado `AbortSignal.timeout` por uma função que registra o valor em `window.__timeouts`.

| Registro | Antes | Depois |
|---|---|---|
| Timeouts em `/entrar` (carga) | `[30000]` | `[30000]` |
| Timeouts após login recusado | `[30000, 30000]` | `[30000, 30000]` |
| Timeouts em `/cadastro` (disponibilidade e sessão) | `[45000, 30000]` | `[45000, 30000]` |
| Login recusado: texto na tela | "Credenciais inválidas (fictício)" | igual |
| Login recusado: destino | `/entrar` | `/entrar` |
| Login aceito: timeouts após o login | `[30000, 30000, 45000, 45000, 45000, 45000]` | igual |
| Login aceito: destino | `/app` | `/app` |
| Sequência de chamadas `/api/*` (método e caminho) | igual nos dois cenários | igual |

- **Cabeçalhos de cache:** esta fotografia **não os viu**. Com `page.route`, a requisição é interceptada antes da pilha de rede, e `request.allHeaders()` não traz `Cache-Control` nem `Pragma`. Isso não quer dizer que a rede não os envie: na rede real eles aparecem (`Cache-Control` e `Pragma` como `no-cache`), como a Lupa confirmou (ver "Rodada 2", item 4).
- Comparação "lado a lado" acima; `antes` e `depois` foram gerados pelo mesmo script.

## 5. O que os testes citados cobrem

- `tests/session.test.mjs` cobre `server/session-policy.js`; `tests/api-resilience.test.mjs` cobre `server/api-errors.js`. Ambos passam (dentro de `npm test`), mas **não cobrem** `src/lib/api.ts` nem `AuthProvider.tsx`.
- `tests/session.browser.mjs` (`npm run test:session`) **não executado**: exige MySQL descartável (`EDIV_TEST_MYSQL_DISPOSABLE=true`), que não existe nesta máquina.
- `tests/browser.mjs` **não executado**: mesmo motivo (MySQL descartável).
- A cobertura nova do cliente é `tests/api-client.test.mjs`. Ela cobre o módulo compartilhado, não o `AuthProvider` em si; o comportamento da sessão no `AuthProvider` foi comparado no navegador (seção 4).

## 6. Não feito (fora do escopo)

- `src/pages/auth/VerifyEmailPage.tsx:38`: `fetch` à mão, justificado (consome token de uso único, não pode ser reexecutado).
- `src/pages/IncomeRanking.tsx:306`: envio de planilha.
- `src/components/EdivAssistant.tsx`: experimental.

Não foram alterados.

## 7. Comandos rodados e resultado

- `node --test tests/api-client.test.mjs`: antes da edição, 11/11 casos de 1 a 9 passaram no código antigo; depois, 14/14.
- Mutação em `src/lib/api.ts` (padrão 30000): 12 pass, 2 fail, como descrito na seção 3. Restaurado; `cmp` idêntico ao backup.
- `grep -rn "retryAfterMs" src`: só os três arquivos da seção 1.
- `npm run lint`: passou (exit 0).
- `npx tsc -p tsconfig.app.json --noEmit`: passou (exit 0).
- `npm test`: 312 testes, 312 passaram, 0 falharam (298 anteriores + 14 novos).
- `npm run build`: passou; 8 rotas pré-renderizadas, `QA=false`.
- Fotografia do navegador antes e depois: executada (seção 4), com respostas fictícias.
- `tests/session.browser.mjs` e `tests/browser.mjs`: **não executados** (sem MySQL descartável).

## 8. Limites e próximo passo

- **Limite:** a comparação do navegador usa respostas fictícias e uma única largura (390×844). Não cobre o fluxo real de sessão com cookie nem o banco.
- **Limite:** a fotografia com `page.route` não mostra `Cache-Control` nem `Pragma`; na rede real eles aparecem (ver "Rodada 2", item 4).
- **Limite:** `package.json` ainda tem mudanças pendentes da 2E na mesma área (ver seção 2); não são desta etapa.
- **Próximo passo:** a Lupa revisa o diff (`src/lib/api.ts`, `src/context/AuthProvider.tsx`, `tests/api-client.test.mjs`, `package.json`). Nenhum commit foi feito.

## Rodada 2 (ajustes da revisão da Lupa)

A revisão aprovou a C3 com ressalvas (`docs/harness/relatos/revisao-eixoc-c3-2026-11-17.md`). Os quatro achados foram aceitos e corrigidos aqui. Esta rodada **substitui** a seção 2 quanto ao invólucro: ele não mora mais no `AuthProvider`.

**1. Invólucro da sessão movido para `src/lib/api.ts`.** Agora é `export function sessionRequest<T>(path, init = {})`, no fim do arquivo, e chama `apiRequest<T>(path, { ...init, cache: "no-store" }, { timeoutMs: 30000 })`. A ordem é a que impede o chamador de sobrescrever `cache`: `cache` vem depois de `...init`. A definição local no `AuthProvider.tsx` saiu; o import passou a ser `import { ApiError, sessionRequest } from "../lib/api"`, e as seis chamadas viraram `sessionRequest<ApiMessage>(...)`. Nenhuma mudança de comportamento.

**2. Testes novos, com mutação.** `tests/api-client.test.mjs` passou de 14 para 18 casos:
- `sessionRequest` usa 30000 ms, não 45000;
- `sessionRequest` envia `cache: "no-store"` ao `fetch`;
- `init.cache` do chamador (`"force-cache"`) não sobrescreve o `no-store`;
- `apiRequest` sem `cache` do chamador não envia `cache` ao `fetch`.

Mutações em `src/lib/api.ts`, cada uma com cópia de segurança, aplicada e conferida, rodada, e restaurada com `cmp` idêntico ao backup:

| Mutação | Resultado do teste | Casos que falharam |
|---|---|---|
| m1: `{ timeoutMs: 30000 }` → `45000` | 17 pass, 1 fail | "sessionRequest usa tempo limite de 30000 ms, não 45000" |
| m2: `cache: "no-store"` removido do `sessionRequest` | 16 pass, 2 fail | "sessionRequest envia cache: no-store ao fetch"; "init.cache do chamador não sobrescreve…" |
| m3: ordem trocada (`{ cache: "no-store", ...init }`) | 17 pass, 1 fail | "init.cache do chamador não sobrescreve…" |
| m4: `cache: "no-store"` forçado no `apiRequest` (a m13 da revisão) | 17 pass, 1 fail | "apiRequest sem cache do chamador não envia cache ao fetch" |

Estado final após restaurar: 18/18 passando.

**3. Comentários em inglês.** O comentário do invólucro, que era em português, saiu junto com a definição local. Em `src/lib/api.ts` o comentário novo sobre `sessionRequest` está em inglês. O cabeçalho de `tests/api-client.test.mjs` e o comentário do helper também estão em inglês. Os nomes dos casos de teste continuam em português, como nos demais testes desta fatia; não são comentários.

**4. Correção: `no-store` é observável na rede.** A seção 4 e o limite da seção 8 diziam que `cache: "no-store"` não era observável. Isso estava errado para a rede real: com `page.route` a requisição é interceptada antes da pilha de rede, e por isso `allHeaders()` não trazia os cabeçalhos. Num servidor HTTP real, `Cache-Control` e `Pragma` aparecem como `no-cache` (dado da Lupa: `GET /api/auth/me` duas vezes e `POST /api/auth/login`). Ou seja: o `no-store` do cliente é o que o `fetch` recebe, e o servidor responde com `no-cache`.

**Validação da rodada 2**
- `npm run lint`: passou (exit 0).
- `npx tsc -p tsconfig.app.json --noEmit`: passou (exit 0).
- `npm test`: 316 testes, 316 passaram, 0 falharam (298 do repositório + 18 do teste novo).
- `npm run build`: passou; 8 rotas pré-renderizadas, `QA=false`.
- `src/lib/api.ts` tem o único `fetch(`; `src/context/AuthProvider.tsx` não tem `fetch(` nem `AbortSignal.timeout`.

**Não feito nesta rodada:** nada além dos quatro itens. Os três `fetch` à mão fora do escopo continuam listados na seção 6, e `tests/session.browser.mjs` e `tests/browser.mjs` continuam não executados (sem MySQL descartável).
