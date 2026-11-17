# Revisão da C3 (Pincel): uma só `apiRequest` para o cliente

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality` (dois eixos: padrões e especificação). Especificação: `docs/harness/briefs/eixoC-C3-pincel.md`. Relato do executor: `docs/harness/relatos/interface-eixoc-c3-2026-11-17.md`. Diff: `src/lib/api.ts`, `src/context/AuthProvider.tsx`, `tests/api-client.test.mjs` (novo), `package.json` (linha do script `test`).

## Veredito: aprovado com ressalvas

O comportamento está preservado: o teste diferencial que fiz (108 combinações) não achou nenhuma diferença na requisição nem no resultado, exceto o `retryAfterMs` que o brief já aceitou. Nada bloqueia a publicação. A ressalva principal (achado 1) é sobre o **teste novo**: ele não protege os dois valores que são da sessão (30 s e `cache: "no-store"`), justamente os que o pedido destacava. Hoje esses valores estão certos; o risco é uma regressão futura passar sem teste vermelho.

Rodei `lint`, `tsc` e `npm test`: `eslint .` exit 0; `tsc -p tsconfig.app.json --noEmit` sem erros; `npm test` **312 testes, 312 passaram, 0 falhas** (298 anteriores + 14 do teste novo). Não rodei `build` (o `dist/` que usei foi gerado às 07:34:38, depois da última edição de `api.ts` às 07:33:53 e de `AuthProvider.tsx` às 07:33:44).

## Achados

### Eixo padrões (code-quality)

**1. [Severidade: média] O teste novo não protege o invólucro da sessão: 30 s e `no-store` podem sumir sem teste vermelho.**
- Onde: `src/context/AuthProvider.tsx:25-30` (o `sessionRequest`); `tests/api-client.test.mjs` (só importa `src/lib/api.ts`, linha 3).
- Problema: os valores `cache: "no-store"` e `{ timeoutMs: 30000 }` ficam no invólucro, que mora num `.tsx` não exportado. O teste só exercita `apiRequest`; os testes 10 e 12 provam que **a opção funciona** e que `init.cache` chega ao `fetch`, mas não que o `AuthProvider` a use.
- Como ver (mutação em cópia fora do repositório, `node --test tests/api-client.test.mjs` sobre cada variante):

| Mutação | Teste novo |
|---|---|
| a1: timeout da sessão `30000` → `45000` | **passa (14/14): não pega** |
| a2: invólucro sem `{ timeoutMs: 30000 }` (volta ao padrão de 45 s) | **passa: não pega** |
| a3: `cache: "no-store"` removido do invólucro | **passa: não pega** |
| a4: ordem trocada (`{ cache: "no-store", ...init }`, `init` passa a poder sobrescrever) | **passa: não pega** |

  Isto responde diretamente ao ponto 3 do pedido: o teste **falha** se o padrão de 45 s mudar, se a mensagem de erro mudar ou se `credentials`/cabeçalhos mudarem (ver tabela abaixo), mas **não falha** se o timeout da sessão voltar a 45 s nem se o `no-store` sumir. O relato já admite a limitação (seção 5: "cobre o módulo compartilhado, não o `AuthProvider` em si") e cobre o resto com uma comparação única no navegador, que não é uma proteção contra regressão futura.
- Correção sugerida: tirar o invólucro de dentro do `.tsx` (por exemplo, `export const sessionRequest` em `src/lib/api.ts`, ou um `src/lib/sessionRequest.ts`) e importá-lo no `AuthProvider`. Assim o teste, que importa `.ts` direto, passa a cobrir: timeout 30000; `cache` igual a `"no-store"` mesmo quando `init.cache` tenta outro valor; e que `apiRequest` sem opção continua em 45000. O brief aceita "forma equivalente" (a forma sugerida era só uma sugestão), e o custo é um arquivo de poucas linhas. Se o Orquestrador preferir manter como está, registre como limite aceito.

**2. [Severidade: baixa] Nenhum teste garante que `apiRequest` não force `cache` para os outros chamadores.**
- Onde: `tests/api-client.test.mjs` (casos 1, 2 e 11).
- Problema: mutação m13 (acrescentar `cache: "no-store"` no `fetch` de `api.ts`) **passa 14/14**. O brief exige "os outros chamadores continuam com 45 s e sem cache forçado"; o 45 s está coberto, o "sem cache forçado" não.
- Correção sugerida: uma linha no teste 1 ou 2: `assert.equal(calls[0].init.cache, undefined)` numa chamada sem `cache`.

**3. [Severidade: baixa] Idioma dos comentários novos destoa do repositório.**
- Onde: `src/context/AuthProvider.tsx:23-24` e `tests/api-client.test.mjs:5-6`.
- Problema: os dois comentários novos estão em português. No repositório, os comentários de linha em `src/` são ~96% em inglês (270 em inglês, 10 em português, 31 ambíguos, pelo meu censo por palavras) e nos testes 456 em inglês contra 10 em português. Os dois vizinhos do próprio `AuthProvider.tsx` (`:67` "Other tabs also reconcile their session…" e `:152` "The shared cookie may now belong to a different account.") são em inglês, e o modelo que o brief mandou espelhar, `tests/polled-store.test.mjs`, tem comentários em inglês (`:7`, `:77`, `:96`). **Os títulos dos testes** são mistos no repositório (muitos testes em português), então o teste novo está dentro do padrão nos títulos, não nos comentários.
- O conteúdo dos comentários é correto e curto: o do `AuthProvider` diz o que o invólucro fixa e onde está a requisição de fato.
- Correção sugerida: passar os dois comentários para inglês, no tom dos vizinhos (uma ou duas linhas, o porquê, sem narrar o código).

### Eixo especificação (brief)

**4. [Severidade: baixa] O relato diz que `cache: "no-store"` "não é observável"; é, na rede.**
- Onde: `docs/harness/relatos/interface-eixoc-c3-2026-11-17.md`, seção 4 (cabeçalhos de cache) e seção 8.
- Problema: o relato afirma que `cache: "no-store"` não gera cabeçalho e que a prova é só o teste 12 e o `git diff`. Com `page.route` os cabeçalhos realmente não aparecem (a interceptação vem antes da pilha de rede), mas num servidor HTTP real, no `dist/` atual, o Chrome manda `Cache-Control: no-cache` e `Pragma: no-cache` nas chamadas da sessão e **não** manda nas outras:

| Requisição (login recusado, depois `/aprender`) | `Cache-Control` | `Pragma` |
|---|---|---|
| `GET /api/auth/me` (2×) | `no-cache` | `no-cache` |
| `POST /api/auth/login` | `no-cache` | `no-cache` |
| `GET /api/learning` (usa `apiRequest` sem invólucro) | ausente | ausente |

  Isso fecha o critério "cabeçalhos observados iguais antes e depois" melhor do que o relato fechou, e confirma "outros chamadores sem cache forçado". A correção é do texto do relato (opcional), não do código.
- Detalhe trivial: o relato diz que a 2E mexeu em `dependencies`/`devDependencies` do `package.json`; só `devDependencies` mudou (`autoprefixer` e `prettier` removidos).

**5. [FYI] A única mudança de comportamento é a aceita.** Nos erros de login e sessão com `Retry-After`, o `ApiError` passa a carregar `retryAfterMs`. Quem lê o campo em `src`: `useNotifications.ts:202` e `polledStore.ts:65`, nenhum no caminho da sessão (`LoginPage.tsx:45` e `RegisterPage.tsx:83` leem só `.code`). Sem efeito na tela.

Nada mais a registrar na especificação: arquivos tocados são os permitidos; `fetch(` aparece 1 vez em `api.ts` e 0 em `AuthProvider.tsx`; `AbortSignal.timeout` só em `api.ts:31-32`; os outros `fetch` à mão (`VerifyEmailPage`, `IncomeRanking`, `EdivAssistant`) não foram mexidos.

## Prova por ponto pedido

### 1) Equivalência das 6 chamadas de sessão, e dos outros chamadores

Fiz um **teste diferencial**: a função local do `HEAD` (`git show HEAD:evorix-finance/src/context/AuthProvider.tsx`, `apiRequest` das linhas 23–61, com o `ApiError` do `api.ts` do `HEAD`) contra o código atual (o invólucro extraído do `AuthProvider.tsx` atual + `src/lib/api.ts` atual). Mesmo `fetch` falso e mesmo `AbortSignal.timeout` registrador nos dois lados; cópia fora do repositório.

- **9 formas de chamada** (as 6 do brief e mais 3: refresh sem sinal, `DELETE /api/auth/me` e dois casos em que o chamador tenta sobrescrever `cache` e `headers`) × **12 respostas** (200 com usuário, 204, 401 com `error`+`code`, 401 sem JSON, 429/503/500 sem corpo, 409 com `code` de texto, `code` que não é texto, 200 com corpo JSON inválido, falha de rede, 429 com `Retry-After: 3`) = **108 combinações**.
- Comparei, por combinação: URL, `method`, `body`, `credentials`, `cache`, `headers`, presença de sinal, valores de timeout pedidos a `AbortSignal.timeout`, e o resultado (valor devolvido, ou nome da classe, `message`, `status`, `code` e `retryAfterMs` do erro).
- Resultado: **requisições diferentes: 0; resultados diferentes (exceto `retryAfterMs`): 0**. As únicas 9 diferenças são `retryAfterMs` passando de `undefined` para `3000` na combinação com `Retry-After: 3` (uma por forma de chamada), que é a mudança aceita.
- Amostra idêntica nos dois lados (login): `credentials: "same-origin"`, `cache: "no-store"`, `headers: { Accept: "application/json", "Content-Type": "application/json" }`, timeout `[30000]`.
- `cache` não pode ser sobrescrito por `init`: com `init.cache = "default"`, o `fetch` recebe `no-store` (o invólucro põe `cache` depois de `...init`, como o `HEAD` fazia).
- Mensagens (rede, 429, 503, genérica), 204 → `{}`, `status` e `code`: idênticos nas 108 combinações.
- **Os outros chamadores**: `apiRequest(path, init)` sem terceiro argumento usa `timeoutMs ?? 45000` e não passa `cache`. Em `src` há 40+ chamadas diretas (`LaunchReadiness`, `RankingHighlights`, `SavedResearchDrafts`, `FavoritesProvider`, `useNotifications`, `useSupportConversations`, `Admin`, `Aprender`, `Configuracoes` etc.) e nenhuma passa um terceiro argumento nem entrega `apiRequest` como função de retorno (busca por referência: nenhuma). Na rede, `/api/learning` sai sem `Cache-Control`/`Pragma` e com 45000 (`[30000, 45000]` em `/aprender`: 30000 da sessão, 45000 do `learning`).

### 2) Visitante (`GET /api/auth/me` → 401)

- Código: o `.catch` do `refreshSession` (`AuthProvider.tsx:98-110`) não mudou; ele trata `error instanceof ApiError && error.status === 401` como "sem sessão" (`applyUser(null)`, sem mensagem) e **não relança** o erro. O diferencial acima mostra que o 401 (com e sem corpo JSON) produz o mesmo `ApiError` com o mesmo `status` e `code`.
- No navegador, `dist/` atual, `/api/auth/me` respondendo 401 (visitante), 3,5 s de espera, em `/`, `/entrar`, `/cadastro` e `/aprender`: **1** chamada `GET /api/auth/me` em cada (sem laço), **nenhum** elemento `role="alert"`, nenhum `pageerror`. O único aviso no console é o do próprio navegador, "Failed to load resource … 401", que existe com qualquer 401 e já existia antes (não é do código da aplicação).
- Login recusado (servidor real que devolve 401 com `{ error }`): a tela mostra "Credenciais inválidas (fictício)", a mesma mensagem do relato.

### 3) O teste lê o código?

Li o arquivo inteiro e rodei 15 mutações em `src/lib/api.ts` e 4 no invólucro, numa cópia fora do repositório:

| Mutação | Teste novo (14 casos) |
|---|---|
| padrão 45000 → 30000 | falha (2 casos) |
| opção `timeoutMs` ignorada | falha (1) |
| `credentials` removido | falha (1) |
| mensagem de conexão / 429 / 503 / genérica alterada | falha (2 / 1 / 1 / 1) |
| `Retry-After` ×1000 → ×100 | falha (1) |
| `code` descartado | falha (1) |
| `Content-Type` sempre enviado | falha (1) |
| cabeçalho do chamador perde para o padrão | falha (1) |
| sinal do chamador ignorado | falha (1) |
| `...init` removido (o `cache` deixa de chegar) | falha (1) |
| 204 deixa de devolver `{}` | **passa** (mutante equivalente, ver abaixo) |
| `cache: "no-store"` forçado dentro de `api.ts` (m13) | **passa** (achado 2) |
| invólucro: timeout 30000 → 45000, sem a opção, `no-store` removido, ordem trocada (a1 a a4) | **passam** (achado 1) |

O mutante do 204 é equivalente: o `Response(null, { status: 204 })` tem corpo vazio, `.json()` rejeita e o `.catch(() => ({}))` já devolve `{}`; o ramo explícito é redundante e nenhum teste consegue distingui-lo. Não é falha do teste.

Também confirmei que o teste **passa no código antigo** como o brief pede para os casos 1 a 9: o relato diz 11/11 antes da edição; eu não refiz esse passo (precisaria desfazer a mudança no repositório); o diferencial acima prova a equivalência de comportamento. O teste restaura `fetch` e `AbortSignal.timeout` em `finally` em cada caso, então não vaza estado entre os testes. Está no fim da lista de `npm test`.

### 4) Estilo dos comentários

Ver achado 3. Os comentários não explicam o óbvio, mas estão em português, ao contrário dos vizinhos.

### 5) Regras de casa

- **Segredo:** o diff não traz token, senha nem `.env`; o `package.json` mudou só a linha `test` (e, de outra etapa, a remoção das duas dev-dependências).
- **Log de corpo de resposta:** nenhum `console.*` no diff nem no teste.
- **`server/` em `src/`:** nenhum import novo; o teste importa só `../src/lib/api.ts`.
- **`package.json`:** o prefixo da linha `test` é idêntico ao do `HEAD`; acrescentados no fim: `tests/public-cache.test.mjs` (da 2D, já aprovada) e `tests/api-client.test.mjs` (desta entrega). Nenhum outro script, dependência ou versão mudou além de `autoprefixer` e `prettier` removidos de `devDependencies` (2E, aprovada).

## Por prioridade do papel

1. **Honestidade financeira:** sem achado (não há número, margem nem texto financeiro na mudança).
2. **Segurança:** sem achado. A sessão continua `credentials: "same-origin"`, `no-store`, timeout de 30 s e sem log; nenhum campo novo vaza na resposta; nenhuma rota nova. Observação: a cobertura do `no-store` e do timeout da sessão depende de comparação manual (achado 1).
3. **Regressão:** sem achado. O contrato de `apiRequest` para os 40+ chamadores é o mesmo (terceiro parâmetro opcional).
4. **Textos proibidos:** sem achado.
5. **Qualidade:** achados 1 e 2 (teste).
6. **Estilo:** achado 3 (idioma dos comentários).

## O que eu não vi

- Não rodei `build`, os testes de navegador da sessão (`tests/session.browser.mjs`, `tests/browser.mjs`: exigem MySQL descartável, que não existe nesta máquina) nem o fluxo real com banco. A prova da sessão no navegador usa respostas fictícias e um servidor local, a 390×844.
- Não refiz o passo "o teste novo passa no código antigo" dentro do repositório (não alterei arquivos); refiz a equivalência por comparação direta.

## Arquivos que escrevi

Só este relato. Cópias de mutação e scripts descartáveis ficaram no scratchpad da sessão e em pasta temporária, fora do repositório.

## Rodada 2 (reconferência dos 4 achados, 17/11/2026)

Só leitura de código, a pedido do Orquestrador (o Vigia vai rodar `npm ci`): **não rodei** lint, `tsc`, `npm test` nem build, e não toquei `node_modules`. As únicas execuções foram `node --test` e um script de comparação sobre **cópias em pasta temporária fora do repositório** (`api.ts` e o teste copiados; o `api.ts` não importa nada). Arquivos lidos: `src/lib/api.ts`, `src/context/AuthProvider.tsx`, `tests/api-client.test.mjs` (18 casos) e a seção "Rodada 2" de `docs/harness/relatos/interface-eixoc-c3-2026-11-17.md`.

### Veredito da rodada 2: aprovado

Os 4 achados estão resolvidos e as asserções novas **distinguem** os casos: refiz as mutações do relato e mais três, e cada uma deixa o teste vermelho no caso certo. O comportamento continua equivalente ao do `HEAD` (diferencial refeito: 0 diferenças).

### Achado 1 (média): resolvido

- `sessionRequest<T>` agora é **exportado** em `src/lib/api.ts:71-73` e chama `apiRequest<T>(path, { ...init, cache: "no-store" }, { timeoutMs: 30000 })`. `cache` vem depois de `...init`, então o chamador não o sobrescreve.
- `AuthProvider.tsx` importa `ApiError, sessionRequest` (`:4`); a definição local saiu; as 6 chamadas são `sessionRequest<ApiMessage>(...)` (`:74`, `:171`, `:193`, `:209`, `:233`, `:248`). Não restam `no-store`, `timeoutMs` nem `AbortSignal.timeout` em `AuthProvider.tsx`.
- O teste agora importa `sessionRequest` (`tests/api-client.test.mjs:5`) e tem 3 casos dele: 30000 e não 45000 (`:233`), `cache: "no-store"` chega ao `fetch` (`:243`), `init.cache = "force-cache"` não sobrescreve (`:253`).
- **Mutações que fiz (cópia fora do repositório; `node --test`):**

| Mutação | Teste novo (18 casos) |
|---|---|
| controle, sem mutação | 18/18 passam |
| s1: timeout da sessão `30000` → `45000` | **falha**: "sessionRequest usa tempo limite de 30000 ms, não 45000" |
| s2: sessão sem a opção de timeout (cai no padrão de 45 s) | **falha**: o mesmo caso |
| s3: `no-store` removido | **falha (2)**: "sessionRequest envia cache: no-store…" e "init.cache do chamador não sobrescreve…" |
| s4: ordem trocada (`{ cache: "no-store", ...init }`) | **falha**: "init.cache do chamador não sobrescreve…" |
| s5: padrão do `apiRequest` trocado para 30000 | **falha (2)**: os dois casos de 45000 |

  As mutações a1 a a4 da primeira rodada (as que passavam) agora são pegas por s1 a s4. O caso `init.cache = "force-cache"` é o que distingue a ordem trocada: sem ele, só o caso "envia no-store" não bastaria (a ordem trocada também envia `no-store` quando o chamador não passa `cache`). O caso de 30 s usa `deepEqual(timeouts, [30000])`, então distingue 30000 de 45000 e também de uma chamada dupla.

### Achado 2 (baixa): resolvido

- Caso novo `apiRequest sem cache do chamador não envia cache ao fetch` (`:263`): `assert.equal(calls[0].init.cache, undefined)` numa chamada sem `cache`.
- Mutação a1 (forçar `cache: "no-store"` dentro do `apiRequest`): **falha** nesse caso (17/18). Outras mutações no `apiRequest` seguem sendo pegas: `...init` removido (3 falhas, inclusive as de `sessionRequest`), opção `timeoutMs` ignorada (2), mensagem 429 (1), `credentials` removido (1), `Retry-After` ×100 (1).

### Achado 3 (baixa): resolvido

- Comentários dos 3 arquivos agora em inglês: `src/lib/api.ts:69-70` ("Session requests (login, logout, /api/auth/me, registration): never cached, 30 s timeout. `cache` is set after `...init`, so a caller cannot override it."), cabeçalho do teste (`:1-2`) e do helper (`:7-8`). O comentário em português do `AuthProvider.tsx` saiu junto com a definição local; os dois que restam lá já eram em inglês.
- Os títulos dos testes seguem em português, o que já é comum no repositório (ver relatório da rodada 1) e não é comentário.
- Nit (opcional, sem ação): o cabeçalho do teste (`:1-2`) e o comentário do helper (`:7-8`) dizem quase a mesma coisa (fetch e `AbortSignal.timeout` trocados por falsos que registram argumentos); e a assinatura de `sessionRequest` em `api.ts:71-73` passa de 80 colunas. O projeto já não tem Prettier (removido na 2E), então nada o impede.

### Achado 4 (baixa): resolvido

- Seção 4 do relato do Pincel (linha 74) agora diz que a fotografia com `page.route` "não os viu", que isso "não quer dizer que a rede não os envie" e que na rede real aparecem `Cache-Control` e `Pragma` como `no-cache`. O limite da seção 8 (linha 107) aponta para o item 4 da "Rodada 2", e o item 4 reconhece o erro. Factual e coerente com o que medi.
- A seção "Rodada 2" do relato traz as 4 mutações com os mesmos resultados que obtive (m1 a m4 = s1, s3, s4 e a1). Conferi a conta: 298 do repositório + 18 do teste novo = 316.

### Equivalência refeita

Repeti o teste diferencial (108 combinações: 9 formas de chamada × 12 respostas) comparando a função local do `HEAD` com o `sessionRequest` atual de `api.ts`: **requisições diferentes: 0; resultados diferentes exceto `retryAfterMs`: 0; só `retryAfterMs` difere: 9** (a mudança aceita). Com `init.cache = "default"` o `fetch` recebe `no-store`.

### O que não vi

Não reli o resultado da validação da rodada 2 (lint, `tsc`, `npm test` 316/316, build): são números do relato do Pincel, que não repeti por determinação do Orquestrador. A parte que eu mesma posso afirmar: o teste de 18 casos passa 18/18 na cópia temporária do código atual.
