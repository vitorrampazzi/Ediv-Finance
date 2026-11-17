# Brief 2D — Tijolo: cache público seguro e consultas (P1/P2)

Para: Tijolo (backend). Etapa 2, primeira rodada. Roda em paralelo com o 2A (Pincel), em arquivos separados.

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs claim backend server/support.js server/rankings.js tests/public-cache.test.mjs package.json docs/harness/relatos/backend-etapa2d-2026-11-16.md
node scripts/harness.mjs update backend trabalhando "2D: cache público de /api/support/information e SELECT * de ranking_publications"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Ao terminar:

```
node scripts/harness.mjs update backend revisao "2D pronto para revisão da Lupa"
node scripts/harness.mjs release backend
```

## Objetivo

Servir pela borda (CDN) a única rota pública de suporte que é igual para todos, e tirar `SELECT *` de `ranking_publications` apenas onde houver ganho comprovado.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 2D. Relato da Etapa 1: `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md`.
- `server/app.js:82-87` põe `Cache-Control: no-store` em tudo sob `/api`. Rotas públicas existentes sobrescrevem isso com `sharedCache(res, cacheControl)` (`server/limit-store.js:105`, que também remove os cabeçalhos `RateLimit*` da resposta). Exemplo de uso: `server/rankings.js:35` e `:117`, com `publicRankingCacheControl = "public, max-age=0, s-maxage=60, stale-while-revalidate=300"` (`server/rankings.js:94`). Erros continuam com `no-store`.
- `/api/support/information` está em `server/support.js:16-24`, antes do `router.use(requireAuthenticatedUser, ...)` da linha 25, montada em `server/app.js:195`. Hoje devolve campos de `config` (`supportEmail`, `supportHours`, `professionalName`, `professionalCategory`, `professionalRegistration`, vindos de variáveis de ambiente em `server/config.js:133-137`) e `subscriptionsAvailable: false`. O deploy da Vercel invalida o cache da borda.
- `server/learning.js:10-20` (`/api/learning`) devolve o progresso do usuário logado, e a borda não separa por cookie. **Não cacheie** `/api/learning`.
- `ranking_publications` (migração `server/migrations/005_education_platform.sql`): `id`, `title`, `author_name`, `professional_category`, `professional_registration`, `source_file_name`, `entries_json` (**JSON**, a coluna grande), `imported_by`, `created_at`. Confirme nas migrações 006 a 009 se alguma outra coluna foi acrescentada.
- Sem MySQL descartável local, sem Docker e sem banco de produção: nada aqui roda contra banco.

## Pode ler primeiro / pode editar

- Ler primeiro: `server/support.js` (linhas 1-30), `server/limit-store.js` (linhas 95-110), `server/app.js` (linhas 60-200), `server/config.js` (linhas 125-140), `server/rankings.js` (linhas 25-125 e 170-230), `server/research-diff.js`, `tests/api-resilience.test.mjs` e `tests/ranking-market.test.mjs` (como montam rotas Express sem banco), `tests/production-smoke.mjs` (linha 129, para ver se checa cabeçalho de cache de `/api/support/information`).
- **Pode editar:** `server/support.js`, `server/rankings.js` (só o item 2), `package.json` (só para incluir o teste novo em `npm test`, e só se ele não depender de banco).
- **Pode criar:** `tests/public-cache.test.mjs` e o relato `docs/harness/relatos/backend-etapa2d-2026-11-16.md`.
- `server/limit-store.js` (onde vive `sharedCache`): só reaproveitar. **Não editar.**

## Fora do escopo (registrar no relato como "adiado")

- Cache de `/api/learning` (inclui progresso do usuário). Registrar como pendência.
- Índices de suporte e de usuários do admin: sem MySQL descartável nem Docker para o `EXPLAIN`, e o volume atual do beta não indica lentidão. Nenhuma migração nesta missão sem plano de execução medido.
- Paginação do ledger do portfólio no SQL (as posições dependem do ledger inteiro; risco em cálculo financeiro maior que o ganho).
- Retry de e-mail e do assistente (e-mail não é idempotente).
- Remoção de `autoprefixer` e `prettier` (entrega 2E).
- Importar `publicRankingCacheControl` de `rankings.js` em `support.js` (acopla módulos): defina a constante em `support.js`.
- Mexer em margem, cotação, textos legais ou regras financeiras. Criar migração. Rodar `npm run build` (só o Pincel roda build nesta rodada).

## Passos

1. **Item 1, prova primeiro.** Leia a rota `/information` e todo middleware de `server/app.js` que roda antes dela (CORS, origem, limitador geral, cookies). Registre no relato, com `arquivo:linha`, que a resposta **não** lê sessão, cookie, usuário nem query. Se ler qualquer um deles: **não cacheie**, registre o motivo e passe ao item 2.
2. **Item 1, mudança.** Se for igual para todos: na rota `/information` chame `sharedCache(res, informationCacheControl)` antes de `res.json(...)`, importando `sharedCache` de `./limit-store.js` (o arquivo já importa `MysqlLimitStore` dali). Defina `informationCacheControl` em `support.js` com `public, max-age=0, s-maxage=<n>, stale-while-revalidate=<m>`. Justifique no relato os valores de `n` e `m` pela frequência de mudança (os campos vêm de variáveis de ambiente, que só mudam com novo deploy, e o deploy invalida a borda). Sem `private`, sem `Set-Cookie` na resposta.
3. **Item 1, teste.** Crie `tests/public-cache.test.mjs` (node:test). Ele deve: (a) conferir o `Cache-Control` de `/api/support/information`; (b) provar que a resposta é idêntica com e sem cookie (mesmo corpo e mesmo `Cache-Control`); (c) provar que `/api/learning` continua `no-store`, se isso for possível sem banco. O teste **não pode abrir conexão com banco**. Se a importação de `server/support.js` ou `server/learning.js` abrir conexão ou exigir variável de ambiente de banco, não inclua o teste em `npm test` e registre o motivo. Se não depender de banco, acrescente `tests/public-cache.test.mjs` ao script `test` do `package.json` (único trecho do arquivo que pode mudar).
4. **Item 2, uma tabela por consulta.** Para cada uma de `server/rankings.js:76`, `:184` e `:212` (`SELECT * FROM ranking_publications ...`): colunas da tabela (pelas migrações), campos que o chamador lê (com `arquivo:linha`), e a decisão. Só troque `*` por colunas explícitas se existir coluna grande (JSON, TEXT ou BLOB) que o chamador comprovadamente não usa. `entries_json` é a única coluna grande conhecida: se o chamador a usa, não há ganho: a consulta fica como está e o relato diz "sem ganho real". Se nenhuma consulta tiver ganho, não mude `rankings.js` e registre.
5. **Validação** (comandos abaixo).

## Critérios de aceite (observáveis)

- [ ] O relato prova, com `arquivo:linha`, que `/api/support/information` não depende de sessão (ou explica por que não foi cacheada).
- [ ] `tests/public-cache.test.mjs` confere o `Cache-Control` da rota e a resposta idêntica com e sem cookie, e passa.
- [ ] `server/learning.js` e `server/limit-store.js` sem alteração (`git diff --stat` não os lista).
- [ ] Item 2: uma tabela por consulta (as 3), com a decisão. Nenhuma troca sem coluna grande não usada comprovada.
- [ ] Se `rankings.js` mudou: `npm test` verde, e o relato lista, para cada consulta alterada, os campos lidos pelo chamador e confirma que todos continuam selecionados.
- [ ] Nenhuma migração criada; nenhum arquivo `.env*` aberto.
- [ ] `npm run lint`, `npm test` e `npx tsc -p tsconfig.app.json --noEmit` passam.
- [ ] `git status --short` não lista nenhum arquivo seu fora dos permitidos. Itens esperados de outros: `docs/harness/state.json` (quadro), arquivos do Pincel (`src/`, `public/`, `scripts/prerender.mjs`), do Vigia (`tests/perf-baseline.mjs`, relatos), da coordenação (`docs/UX-PERFORMANCE-2026-11-16.md`, `docs/harness/briefs/`) e os não rastreados do dono.

## Comandos de validação (em `evorix-finance/`)

```
node --test tests/public-cache.test.mjs
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
git diff --stat -- server package.json
git status --short
node scripts/harness.mjs check
```

Não rode `npm run build`, `npm run test:integration:aiven`, `npm run test:browser:aiven`, `npm run test:production` nem qualquer comando com `.env.aiven`.

## Formato do relato

Arquivo `docs/harness/relatos/backend-etapa2d-2026-11-16.md`, em português, com estas seções numeradas:

1. Item 1, prova: o que a rota lê e o que roda antes dela (`arquivo:linha`).
2. Item 1, mudança: arquivos alterados, `Cache-Control` escolhido e a justificativa dos valores.
3. Item 1, teste: o que cobre, se entrou em `npm test` e, se não entrou, o motivo.
4. Item 2: uma tabela por consulta (colunas, campos lidos, decisão).
5. Adiado: os cinco itens da lista "Fora do escopo", com o motivo, e `/api/learning` como pendência.
6. Comandos rodados e resultado (passou, falhou, não executado e por quê). A comparação de JSON de resposta real não foi executada se não houver banco: diga isso.
7. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log, teste ou relato. Não abra `.env*`. Não imprima valores de `SUPPORT_EMAIL` ou dos dados profissionais reais; no teste, use valores fictícios marcados como tal.
- Testes nunca usam o banco de produção nem a produção como alvo.
- Não faça commit, push, deploy nem migração. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
