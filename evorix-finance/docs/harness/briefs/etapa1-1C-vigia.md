# Brief 1C — Vigia: métricas de base e estado inicial

Para: Vigia (QA). Etapa 1. Pode começar em paralelo com 1D.

## Objetivo

Registrar o estado inicial de lint, testes e TypeScript e as métricas de base de carga das páginas públicas, com um script que repete a mesma medição depois das mudanças.

## Contexto mínimo

- Missão: `docs/UX-PERFORMANCE-2026-11-16.md` (seções 1 e 2, números de base). Plano: `docs/harness/briefs/00-plano-etapa1.md`, seção 1C.
- O `dist/` atual foi gerado pelo Orquestrador a partir de uma árvore igual a `origin/main` (`5613939`). Use-o como está.
- Não há API local: seções que dependem da API vão aparecer vazias ou com erro. Anote, não conserte.
- Tema claro é o padrão do site. Anote no relato como o tema ficou claro na medição.
- Nota "Contexto Escola": seção 10 (testes nunca usam produção).

## Pode ler primeiro / pode escrever

- Ler primeiro: `package.json` (scripts), `playwright.config.*` se existir, `tests/run-browser.mjs`, `dist/index.html`, `dist/assets/`.
- **Pode escrever dois arquivos, e só eles** (o plano os permite; reserve os dois):
  - `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md` (o relato)
  - `tests/perf-baseline.mjs` (arquivo novo; fora do `npm test`; não adicione ao `package.json`)

## Fora do escopo

- Corrigir qualquer falha encontrada.
- Editar outro arquivo, `package.json` ou `package-lock.json`. Instalar ou remover dependência (nem Lighthouse, nem navegador).
- Rodar `npm run build`. Se `dist/` não existir ou estiver quebrado, pare e pergunte ao Orquestrador.
- Em produção: login, envio de formulário, clique no aviso de cookies, qualquer requisição que não seja GET de página pública ou dos arquivos que ela carrega.

## Passos

1. Reserve: `node scripts/harness.mjs claim qa docs/harness/relatos/qa-base-ux-performance-2026-11-16.md tests/perf-baseline.mjs` e `node scripts/harness.mjs update qa trabalhando "métricas de base"`.
2. Estado inicial, antes de criar o script: rode `npm run lint`, `npm test` e `npx tsc -p tsconfig.app.json --noEmit`. Registre o resultado de cada um e a contagem de testes (total, passou, falhou). Se um teste exigir banco, registre "não executado" e o motivo; nunca aponte para produção.
3. Ferramenta: rode `npx --no-install lighthouse --version`. Se falhar, escreva "Lighthouse: não executado" e use Playwright. Confira também `npx --no-install playwright --version` e se o Chromium está instalado; se não estiver, **não instale**: pare e pergunte ao Orquestrador.
4. Suba o servidor: `npx vite preview --port 4173` (em segundo plano). Pare-o ao terminar.
5. Escreva `tests/perf-baseline.mjs` (Node ESM, Playwright). Comportamento:
   - URL base: variável `BASE_URL`, padrão `http://127.0.0.1:4173`.
   - Páginas: `/`, `/ranking`, `/ranking/acao/TIMS3`, `/aprender`, `/glossario`, `/entrar`, `/cadastro`.
   - Viewports: 390 px e 1280 px, tema claro.
   - Número de cargas: variável `RUNS`, padrão 3.
   - Bloqueia (com `page.route(...).abort()`) requisições de analytics e monitoramento (Google Analytics/Tag Manager, Clarity, `/_vercel/insights`), para não sujar as métricas do site. Anotar no relato que foram bloqueadas.
   - Por página e viewport: `RUNS` cargas; média de LCP e de CLS (via `PerformanceObserver`); número de requisições; bytes de JS transferidos; e se alguma requisição é do chunk do framer-motion (arquivo `use-reduced-motion-*.js`).
   - Anota páginas com resposta de erro ou conteúdo vazio por falta de API.
   - Imprime uma tabela em Markdown no terminal. Comentário no topo explica como rodar.
6. Rode o script e cole a tabela no relato.
6b. **Produção (o dono autorizou em 16/11, só leitura):** rode uma vez
   `BASE_URL=https://escoladodividendo.com.br RUNS=1 node tests/perf-baseline.mjs`
   (2 cargas por página no total: uma em 390 px e uma em 1280 px; limite do dono: até 3).
   Só GET de páginas públicas, sem login, sem formulário, sem clicar no aviso de cookies.
   Se `/ranking/acao/TIMS3` não for mais página pública indexável (top 3 mudou), anote e
   siga. Cole a tabela de produção no relato, separada da local. Rode `npm run lint` de novo: o ESLint também lê `tests/perf-baseline.mjs` e não pode falhar por causa dele.
7. Escreva o relato com **exatamente** estes títulos:
   - `## 1. Estado inicial`
   - `## 2. Ferramenta`
   - `## 3. Métricas de base`
   - `## 4. Script`
   - `## 5. Produção` (tabela da medição só de leitura, com data e hora da medição no relato)
8. Ao terminar: `node scripts/harness.mjs update qa revisao "métricas de base prontas"` e `node scripts/harness.mjs release qa`.

## Critérios de aceite (observáveis)

- [ ] Seção 1 traz o resultado de `lint`, `npm test` (com contagem) e `tsc`, cada um como passou, falhou ou não executado.
- [ ] Seção 3 tem 14 linhas (7 páginas × 2 viewports) com requisições, KB de JS, LCP, CLS e "framer-motion baixado: sim/não".
- [ ] `node tests/perf-baseline.mjs` roda de ponta a ponta com o preview ativo e imprime a mesma tabela.
- [ ] `npm run lint` passa depois de criar o script.
- [ ] Nenhum arquivo além dos dois permitidos mudou: `package.json`, `src/`, `server/` e `dist/` sem alteração.
- [ ] Em produção: só GET, no máximo 3 cargas por página, analytics bloqueado; seção 5 com 14 linhas.

## Comandos de validação (em `evorix-finance/`)

```
grep -cE "^## [1-5]\." docs/harness/relatos/qa-base-ux-performance-2026-11-16.md
node tests/perf-baseline.mjs
npm run lint
git status --short -- src server package.json package-lock.json dist
node scripts/harness.mjs check
```

Esperado: `5`; tabela com 14 linhas; lint sem erro; nenhuma linha; `check` sem erro.

## Formato do relato

Em português, curto. O relato é o arquivo acima. Na resposta ao Orquestrador (até 15 linhas): arquivos escritos, resultado de lint, testes e tsc, os 3 números mais relevantes da tabela, o que ficou vazio por falta de API, comandos rodados e resultado (passou, falhou ou não executado e por quê), limites, próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em script, relato ou log. Não abra `.env*`.
- Testes nunca usam o banco de produção. A única exceção à regra de não usar a produção como alvo é a medição só de leitura do passo 6b, autorizada pelo dono em 16/11.
- Não faça commit, push nem deploy.
- Não adicione linha de autoria de IA.
