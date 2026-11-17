# QA: métricas de base (UX e performance, 16/11/2026)

Brief: `docs/harness/briefs/etapa1-1C-vigia.md`. Branch: `vitorrampazzi/ux-performance-2026-11-16`. Árvore de `src/`, `server/`, `package.json`, `package-lock.json` e `dist/` sem alteração (`git status --short` vazio nesses caminhos).

## 1. Estado inicial

| Comando | Resultado |
|---|---|
| `npm run lint` | passou (exit 0, sem erros; rodou de novo depois de criar o script, também exit 0) |
| `npm test` | passou: 294 de 294 (passou 294, falhou 0, cancelado 0, pulado 0) |
| `npx tsc -p tsconfig.app.json --noEmit` | passou (exit 0) |

Nenhum teste exigiu banco. Nada foi apontado para produção nos testes. Os testes de navegador (`tests/run-browser.mjs`) não foram executados nesta etapa.

## 2. Ferramenta

- Lighthouse: não executado. `npx --no-install lighthouse --version` recusou (pacote ausente, não foi instalado). Medição feita com Playwright.
- Playwright: `npx --no-install playwright --version` → 1.62.1.
- Navegador: o Chromium do Playwright não está instalado (o executável `chrome-headless-shell` não existe). Não instalei nada. O script cai para `channel: "chrome"` (Google Chrome já instalado), como em `tests/browser.mjs`.
- Servidor local: `npx vite preview --port 4173`. Ele respondeu em `localhost` e `[::1]`, não em `127.0.0.1`. Por isso a medição local usou `BASE_URL=http://localhost:4173`. O padrão `127.0.0.1` do script ficou como o brief pede, mas não conectou nesta máquina. Preview encerrado ao final.

## 3. Métricas de base

Medição local: `BASE_URL=http://localhost:4173 RUNS=3 node tests/perf-baseline.mjs` (média de 3 cargas por linha). Tema: `colorScheme: "light"` no contexto do navegador. Não verifiquei se o site guarda o tema em `localStorage`; se guardar, a medição depende do valor padrão do site.

| Página | Viewport | Requisições | JS (KB) | LCP (ms) | CLS | framer-motion baixado | Observação |
|---|---|---|---|---|---|---|---|
| / | 390px | 33 | 165.8 | 309 | 0.112 | sim | API com erro (3) |
| / | 1280px | 33 | 165.8 | 153 | 0.060 | sim | API com erro (3) |
| /ranking | 390px | 39 | 148.1 | 153 | 0.131 | não | API com erro (2) |
| /ranking | 1280px | 39 | 148.1 | 148 | 0.016 | não | API com erro (2) |
| /ranking/acao/TIMS3 | 390px | 26 | 117.0 | 219 | 0.140 | não | API com erro (2) |
| /ranking/acao/TIMS3 | 1280px | 26 | 117.0 | 217 | 0.067 | não | API com erro (2) |
| /aprender | 390px | 29 | 116.1 | 167 | 0.003 | não | API com erro (2) |
| /aprender | 1280px | 29 | 116.1 | 219 | 0.002 | não | API com erro (2) |
| /glossario | 390px | 16 | 100.6 | 224 | 0.024 | não | API com erro (2) |
| /glossario | 1280px | 16 | 100.6 | 216 | 0.009 | não | API com erro (2) |
| /entrar | 390px | 21 | 104.9 | 223 | 0.000 | não | API com erro (1) |
| /entrar | 1280px | 21 | 104.9 | 235 | 0.000 | não | API com erro (1) |
| /cadastro | 390px | 24 | 108.2 | 148 | 0.000 | não | API com erro (2) |
| /cadastro | 1280px | 24 | 108.2 | 201 | 0.000 | não | API com erro (2) |

Vazio por falta de API: as linhas marcadas "API com erro" são chamadas `/api/...` que falharam sem API local. Nenhuma página ficou sem conteúdo (o script marca "conteúdo vazio" abaixo de 80 caracteres de texto; não apareceu). Analytics bloqueados: 0, porque o preview local não dispara essas chamadas.

## 4. Script

`tests/perf-baseline.mjs` (arquivo novo, fora do `npm test`, fora do `package.json`). Comportamento:

- `BASE_URL` (padrão `http://127.0.0.1:4173`), `RUNS` (padrão 3).
- 7 páginas × 2 viewports (390 px e 1280 px), tema claro.
- Só GET: qualquer outro método é abortado e contado.
- Bloqueia Google Analytics/Tag Manager, Clarity e `/_vercel/insights` com `route.abort()`.
- Não faz login, não envia formulário, não clica no aviso de cookies.
- Navegador: `chromium.launch({ headless: true })` e, se falhar, `channel: "chrome"`.
- Mede: requisições, KB de JS transferido, LCP e CLS (via `PerformanceObserver`), e se `use-reduced-motion-*.js` foi baixado. "framer-motion baixado" é um proxy pelo nome do chunk, não uma verificação do pacote.
- Imprime a tabela em Markdown.
- `npm run lint` passa com o script (exit 0).

## 5. Produção

Medição só de leitura, autorizada pelo dono em 16/11: `BASE_URL=https://escoladodividendo.com.br RUNS=1 node tests/perf-baseline.mjs`. Feita em 16/11/2026, entre 23:19:07 e 23:20:04 (horário local da máquina). Uma carga por página e viewport (14 cargas no total). A página `/ranking/acao/TIMS3` foi medida como as demais (14 linhas, sem "HTTP ≥ 400" na observação). Não confirmei se ela segue indexável (o script não grava o status final por página); fica como ponto a verificar.

| Página | Viewport | Requisições | JS (KB) | LCP (ms) | CLS | framer-motion baixado | Observação |
|---|---|---|---|---|---|---|---|
| / | 390px | 36 | 176.4 | 1080 | 0.000 | sim | API com erro (1) |
| / | 1280px | 36 | 176.2 | 852 | 0.000 | sim | API com erro (1) |
| /ranking | 390px | 39 | 158.7 | 1196 | 0.000 | não | API com erro (1) |
| /ranking | 1280px | 39 | 158.0 | 996 | 0.000 | não | API com erro (1) |
| /ranking/acao/TIMS3 | 390px | 26 | 123.9 | 708 | 0.628 | não | API com erro (1) |
| /ranking/acao/TIMS3 | 1280px | 26 | 124.5 | 632 | 0.189 | não | API com erro (1) |
| /aprender | 390px | 25 | 123.0 | 880 | 0.020 | não | API com erro (1) |
| /aprender | 1280px | 25 | 123.1 | 1284 | 0.022 | não | API com erro (1) |
| /glossario | 390px | 12 | 104.8 | 992 | 0.411 | não | API com erro (1) |
| /glossario | 1280px | 12 | 104.9 | 932 | 0.422 | não | API com erro (1) |
| /entrar | 390px | 17 | 110.2 | 1192 | 0.000 | não | API com erro (1) |
| /entrar | 1280px | 17 | 110.2 | 1056 | 0.000 | não | API com erro (1) |
| /cadastro | 390px | 20 | 114.3 | 1124 | 0.000 | não | API com erro (1) |
| /cadastro | 1280px | 20 | 114.3 | 1008 | 0.000 | não | API com erro (1) |

Observações da produção:

- Analytics bloqueados: 0. Provavelmente o site só carrega analytics depois do consentimento de cookies, que a medição não aceita. Não confirmei no código.
- "API com erro (1)" em todas as páginas de produção: uma chamada `/api/...` respondeu com status ≥ 400. O script conta, mas não guarda o endereço. Precisa identificar qual chamada e por quê. Isso é observação, não correção.
- CLS alto em `/ranking/acao/TIMS3` (0.628 no mobile) e `/glossario` (0.411 e 0.422). Uma carga só, então é ruidoso; vale repetir com `RUNS=3` numa janela própria, se o Orquestrador autorizar.

## Comandos rodados

- `npm run lint` (antes e depois do script): exit 0.
- `npm test`: 294/294.
- `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
- `npx --no-install lighthouse --version`: falhou (não executado).
- `npx --no-install playwright --version`: 1.62.1.
- `npx vite preview --port 4173`: subiu; encerrado depois.
- `BASE_URL=http://localhost:4173 RUNS=3 node tests/perf-baseline.mjs`: exit 0.
- `BASE_URL=https://escoladodividendo.com.br RUNS=1 node tests/perf-baseline.mjs`: exit 0.
- `node scripts/harness.mjs check`: "quadro válido; 4 papéis e reservas sem conflito" (exit 0).
- `git status --short -- src server package.json package-lock.json dist`: vazio.
- `grep -cE "^## [1-5]\."` no relato: ver contagem na conclusão.

## Limites e riscos

- Lighthouse não executado. Medição feita só com Playwright, então LCP e CLS têm critérios diferentes do Lighthouse.
- Produção: 1 carga por página (limite do dono: até 3). Números de uma carga são ruidosos.
- Tema: a medição força `colorScheme: "light"` e não confirmei o padrão de tema salvo no site.
- Sem commit, push, deploy nem alteração em `src/`, `server/`, `package.json` ou `dist/`.

## Próximo passo

- Decidir se repete a produção com `RUNS=3` (dentro do limite).
- Identificar qual chamada `/api/` falha em produção.
- Usar esta tabela como base para comparar as mudanças dos outros papéis.
