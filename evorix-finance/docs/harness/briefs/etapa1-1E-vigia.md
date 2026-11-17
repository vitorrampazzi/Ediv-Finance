# Brief 1E — Vigia: atribuição do CLS de produção

Para: Vigia (QA). Etapa 2, primeira rodada. Roda em paralelo com o 2A (Pincel) e o 2D (Tijolo).

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs claim qa tests/perf-baseline.mjs .test-artifacts/perf-api docs/harness/relatos/qa-cls-2026-11-16.md
node scripts/harness.mjs update qa trabalhando "1E: atribuição do CLS de produção"
```

Leia da nota as seções 3 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Ao terminar:

```
node scripts/harness.mjs update qa revisao "1E pronto"
node scripts/harness.mjs release qa
```

## Objetivo

Descobrir, com medição, quais nós da página e quais chamadas `/api` causam o CLS alto em produção de `/ranking/acao/TIMS3` e `/glossario`, e deixar uma reprodução local com API simulada que servirá de "antes" para a entrega 2F.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 1E. Relato anterior: `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md`, seção 5.
- Em produção, o relato 1C mediu CLS 0,628 (390 px) e 0,189 (1280 px) em `/ranking/acao/TIMS3`, e 0,411 e 0,422 em `/glossario`. Localmente, sem API, o CLS dessas páginas fica entre 0,009 e 0,14.
- Hipóteses do Orquestrador, **a confirmar ou refutar com medição** (não as trate como fato):
  1. `dist/acao.html` tem o `#root` vazio e `src/pages/PublicStock.tsx:32-38` mostra "Verificando seu acesso à pesquisa…" antes do conteúdo, empurrando o rodapé.
  2. O glossário pré-renderizado é refeito quando `/api/learning` responde (`src/pages/Glossario.tsx:28-30`).
  3. A chamada `/api` com erro, em todas as páginas de produção, é `GET /api/auth/me` → 401 para visitante, comportamento esperado (`server/auth.js:521-527`).
- `vite preview` **não aplica** os `rewrites` do `vercel.json`. Em produção `/ranking/acao/:ticker` é servida por `/acao.html` (`vercel.json:24-25`); no preview ela cai no `index.html`. Por isso, na reprodução local, o script precisa entregar `acao.html` para essas rotas (passo 4). `/glossario` funciona no preview (`glossario/index.html` existe).
- O dist de base, guardado pelo Orquestrador em `.test-artifacts/dist-base/`, é o que está em produção (`origin/main`, `5613939`). **Nunca** sirva nem leia o `dist/` atual: o Pincel vai reconstruí-lo na 2A.

## Pode ler primeiro / pode editar

- Ler primeiro: `tests/perf-baseline.mjs` (inteiro), `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md`, `src/pages/PublicStock.tsx`, `src/pages/Glossario.tsx`, `server/auth.js` (linhas 515-530), `vercel.json` (linhas 10-35), `.test-artifacts/dist-base/acao.html`.
- **Pode editar/criar, e só isto:**
  - `tests/perf-baseline.mjs`
  - a pasta `.test-artifacts/perf-api/` (ignorada pelo Git)
  - `docs/harness/relatos/qa-cls-2026-11-16.md`
- `.test-artifacts/dist-base/`: somente leitura.

## Fora do escopo

- Corrigir o CLS ou qualquer código do site.
- Medir outras páginas de produção. Instalar dependência.
- Editar `package.json`, `src/`, `server/`, `dist/`, `.test-artifacts/dist-base/`.
- Login, formulário, clicar no aviso de cookies, qualquer método diferente de GET.

## Passos

1. **Script: registrar chamadas `/api` com erro.** Em `tests/perf-baseline.mjs`, para cada resposta cujo caminho comece com `/api` e cujo status seja ≥ 400, registre método, caminho (sem segredo na consulta) e status. Imprima uma tabela "Chamadas /api com erro" junto com a tabela atual. Mantenha a coluna "API com erro (n)".
2. **Script: atribuição de `layout-shift`.** Acrescente um modo (variável `ATTRIBUTION=1`) que, em cada carga, registre cada entrada `layout-shift` com: `value`, `hadRecentInput`, horário (`startTime`) e, para cada item de `sources`: seletor do nó (tag, `id` e classes, com o caminho curto até um ancestral com `id`), `previousRect` e `currentRect`. Imprima uma tabela em Markdown, ordenada por horário. Acrescente também: variáveis `ONLY` (lista de caminhos separados por vírgula) e `VIEWPORT` (por exemplo `390`) para limitar as cargas.
3. **Script: trava de produção.** Se `BASE_URL` não for `127.0.0.1` nem `localhost`, o script só roda com `ATTRIBUTION=1`, `RUNS=1`, `VIEWPORT=390` e `ONLY` igual a `/ranking/acao/TIMS3,/glossario`; em qualquer outra combinação, sai com erro **antes de fazer qualquer requisição**. Mantenha as regras atuais: só GET, analytics bloqueado, sem login, sem formulário, sem clicar no aviso de cookies.
4. **Script: captura e simulação da API.**
   - Captura (`CAPTURE_API=1`): durante as cargas de produção do passo 5, grave em `.test-artifacts/perf-api/` as respostas **já recebidas** (sem nova requisição) de `GET /api/learning`, `GET /api/rankings/public`, `GET /api/rankings/status` e `GET /api/auth/me`, um arquivo JSON por endpoint, com `status`, `contentType` e `body`. Nada de cabeçalhos, cookies ou outros endpoints. Se algum corpo contiver dado pessoal ou segredo, não grave e relate.
   - Simulação (`MOCK_API=1`): as respostas desses quatro endpoints vêm desses arquivos (`route.fulfill`, com o mesmo `status`), com atraso `MOCK_DELAY_MS` (padrão `600`). Os demais `/api/*` seguem como hoje. Nesse modo, a navegação para `/ranking/acao/<ticker>` é atendida com o conteúdo de `acao.html` do diretório servido (variável `DIST_DIR`, padrão `.test-artifacts/dist-base`), espelhando o `rewrite` da Vercel.
   - Comente no topo do script todas as variáveis novas e como rodar.
5. **Produção: a terceira e última carga autorizada por página.** Cada uma das duas páginas já teve uma carga em 390 px e uma em 1280 px (relato 1C, seção 5); o limite do dono é 3. Rode **uma única vez**:
   ```
   BASE_URL=https://escoladodividendo.com.br RUNS=1 VIEWPORT=390 ONLY=/ranking/acao/TIMS3,/glossario ATTRIBUTION=1 CAPTURE_API=1 node tests/perf-baseline.mjs
   ```
   Isso é 1 carga de `/ranking/acao/TIMS3` e 1 de `/glossario`, ambas em 390 px, e nada mais. **Sem repetição:** se uma carga falhar, **pare** e pergunte ao Orquestrador, mesmo que isso deixe de fornecer a captura. Regras do passo 6b do brief 1C: só GET de páginas públicas, sem login, sem formulário, sem clicar no aviso de cookies, analytics bloqueado. Anote data e hora da medição. O passo 1 (chamada com erro) usa essas mesmas duas cargas.
6. **Reprodução local com API simulada.** Em outro terminal: `npx vite preview --outDir .test-artifacts/dist-base --port 4175` (porta 4175, porque o Pincel usa a 4173 na 2A). Depois, ambas as páginas, em 390 e 1280 px, 3 cargas cada:
   ```
   BASE_URL=http://localhost:4175 MOCK_API=1 ATTRIBUTION=1 ONLY=/ranking/acao/TIMS3,/glossario node tests/perf-baseline.mjs
   ```
   Se o CLS local não chegar à ordem de grandeza do de produção, tente outros valores de `MOCK_DELAY_MS` (ex.: 300, 600, 1200) e relate cada um; não force o resultado. Pare o servidor ao terminar.
7. Rode `npm run lint` (o ESLint também lê `tests/perf-baseline.mjs`). Rode também a medição antiga, sem as variáveis novas, para provar que o comportamento anterior continua: `node tests/perf-baseline.mjs` com o preview do dist de base (porta 4175, **sem** `MOCK_API`) deve imprimir a mesma tabela de 14 linhas.
8. Escreva o relato com os títulos abaixo.

## Critérios de aceite (observáveis)

- [ ] Tabela "Chamadas /api com erro" com método, caminho e status, para as duas páginas de produção. A hipótese 3 está confirmada ou refutada.
- [ ] Para cada página em produção (390 px): tabela de atribuição com cada `layout-shift` (`value`, `hadRecentInput`, horário) e as `sources` (seletor, `previousRect`, `currentRect`).
- [ ] Exatamente 2 cargas de produção nesta tarefa (`/ranking/acao/TIMS3` e `/glossario`, 390 px). Nenhuma outra URL de produção.
- [ ] Arquivos em `.test-artifacts/perf-api/` para os 4 endpoints (ou o motivo de faltar algum), sem cabeçalhos nem cookies.
- [ ] Reprodução local com `MOCK_API=1`: CLS médio (3 cargas) das duas páginas em 390 e 1280 px, com a atribuição. Aceite: o CLS local em 390 px fica entre metade e o dobro do valor de produção da mesma página (0,628 e 0,411), e a atribuição aponta os mesmos nós. Se não ficar, o relato diz isso e mostra os valores de `MOCK_DELAY_MS` testados.
- [ ] Cada hipótese (1, 2, 3) marcada como confirmada, refutada ou inconclusiva, com a evidência (nó, valor, horário).
- [ ] `npm run lint` passa; a medição antiga continua imprimindo 14 linhas.
- [ ] Só os 3 caminhos permitidos mudaram.

## Comandos de validação (em `evorix-finance/`)

```
npm run lint
npx vite preview --outDir .test-artifacts/dist-base --port 4175
BASE_URL=http://localhost:4175 node tests/perf-baseline.mjs
BASE_URL=http://localhost:4175 MOCK_API=1 ATTRIBUTION=1 ONLY=/ranking/acao/TIMS3,/glossario node tests/perf-baseline.mjs
grep -cE "^## [1-5]\." docs/harness/relatos/qa-cls-2026-11-16.md
git status --short -- src server package.json package-lock.json dist
git status --short
node scripts/harness.mjs check
```

Esperado: lint sem erro; 14 linhas; tabelas de atribuição; `5`; no primeiro `git status`, nenhuma linha sua (alterações em `src/`, `server/` e `package.json` são do Pincel e do Tijolo, que trabalham em paralelo); no segundo, só `tests/perf-baseline.mjs`, o relato e os arquivos dos outros executores; `check` sem erro. A medição de produção (passo 5) roda uma vez só e não aparece como comando de validação.

## Formato do relato

Arquivo `docs/harness/relatos/qa-cls-2026-11-16.md`, em português, com **exatamente** estes títulos:

1. `## 1. Chamadas /api com erro`
2. `## 2. Atribuição em produção` (data e hora da medição; tabela por página)
3. `## 3. Reprodução local com API simulada` (valores de `MOCK_DELAY_MS` usados; CLS médio; atribuição)
4. `## 4. Causa provável de cada salto` (hipóteses 1, 2 e 3: confirmada, refutada ou inconclusiva, com a evidência; sem propor código)
5. `## 5. Como repetir` (os comandos exatos da medição local, para rodar depois da correção da 2F)

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`. O resumo diz: chamada com erro, os maiores saltos por página, e se a reprodução local chegou perto de produção.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em script, relato ou log. Não abra `.env*`.
- Testes nunca usam o banco de produção. A única exceção à regra de não usar a produção como alvo é a medição só de leitura do passo 5, autorizada pelo dono em 16/11, limitada a 1 carga de `/ranking/acao/TIMS3` e 1 de `/glossario` em 390 px.
- Não faça commit, push nem deploy.
- Não adicione linha de autoria de IA.
