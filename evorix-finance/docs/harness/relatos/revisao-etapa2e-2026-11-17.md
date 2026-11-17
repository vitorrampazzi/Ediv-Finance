# Revisão da 2E (Tijolo): remoção de `autoprefixer` e `prettier`

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality`. Especificação: `docs/harness/briefs/etapa2-2E-tijolo.md`. Relato do executor: `docs/harness/relatos/backend-etapa2e-2026-11-17.md`.

## Veredito: aprovado

Sem achados de padrões nem de especificação. Os três pontos pedidos foram provados por mim, de forma independente (não repeti o que o relato diz; refiz os comandos). Há duas observações FYI, nenhuma exige ação nesta entrega.

## 1. Nenhum uso restante dos dois pacotes

Busca em `evorix-finance/` e em `../.github`, `../AGENTS.md`, `../README.md`, excluindo `node_modules`, `dist`, `.test-artifacts`, `.claude`, `.maestri`, `docs` e `package-lock.json`, por `autoprefixer|prettier|fraction\.js|postcss-value-parser`: **nenhuma ocorrência** (grep exit 1). Uma primeira tentativa minha saiu com exit 2 por eu ter citado caminhos inexistentes (`../.husky`, `../.vscode`); refiz só com caminhos existentes e o resultado é o acima.

| Onde procurei | Resultado |
|---|---|
| `postcss.config.js` | `export default { plugins: { "@tailwindcss/postcss": {} } };`. Sem `autoprefixer`. |
| `vite.config.ts` | nenhuma referência a postcss nem css. |
| `eslint.config.js` | importa só `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, `eslint/config`. Sem prettier. |
| `tailwind.config.js` e `src/index.css` | `@import "tailwindcss"` e `@config`; sem `@plugin` nem plugin externo. |
| `package.json` | sem script que cite `prettier`, `autoprefixer`, `format`, `fmt` ou `postcss`; sem campos `browserslist` nem `prettier`; sem `husky`, `lint-staged` nem `simple-git-hooks`. |
| `.github/workflows/` (`quality.yml`, `dependencies.yml`, `load-test.yml`, `monitor.yml`) e `dependabot.yml` | sem citação. `quality.yml` roda `npm ci`, `lint`, `test`, `build`, testes de integração e de navegador; `dependencies.yml` roda `npm ci --ignore-scripts`, `npm audit` e `npm run test:dependencies`. Nenhum chama `prettier`. |
| Hooks do Git | `ls ../.git/hooks` só tem `.sample`; `core.hooksPath` vazio. |
| Arquivos de configuração | `ls -a . ..` sem `.prettierrc*`, `.editorconfig`, `browserslist`, `.postcssrc*`, `.husky`, `.vscode`. |
| `tests/dependencies.test.mjs` | não cita os pacotes. |
| Nota "Contexto Escola" | não cita os pacotes. |
| `docs/` | só menções em planos, briefs e relatos (documentação, não uso). |

Por que tirar `autoprefixer` não muda o CSS: o `@tailwindcss/postcss` instalado depende de `@tailwindcss/node`, que depende de `lightningcss` (conferido no lock). No Tailwind 4 os prefixos de navegador vêm daí; o `postcss.config.js` nunca chamou `autoprefixer`. Isto é leitura do lock, não uma comparação do CSS gerado; essa prova fica com o build limpo do QA.

## 2. Os 4 pacotes removidos do lock não são exigidos por nenhum pacote restante

Comparei `git show HEAD:evorix-finance/package-lock.json` com o arquivo atual, com script descartável (fora do repositório):

- `lockfileVersion` 3 nos dois; pacotes 371 → 367.
- Removidos (4): `node_modules/autoprefixer`, `node_modules/fraction.js`, `node_modules/postcss-value-parser`, `node_modules/prettier`. Adicionados: 0. Alterados: **0** (comparação do JSON inteiro de cada entrada restante, o que cobre `version`, `resolved`, `integrity`, `dev`, `peer`).
- Quem dependia dos quatro no HEAD: só a raiz (`autoprefixer` e `prettier`) e `autoprefixer` (`fraction.js` e `postcss-value-parser`). Nos 367 pacotes restantes, varri `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies` e `peerDependenciesMeta`: **nenhum dependente** dos quatro nomes. Sem cópia aninhada restante (`.../node_modules/<nome>`).
- `grep -c -E "autoprefixer|prettier|fraction\.js|postcss-value-parser" package-lock.json`: `0`.
- `npm ls autoprefixer prettier fraction.js postcss-value-parser --package-lock-only`: `(empty)`.
- Os outros pacotes que o `autoprefixer` puxava (`browserslist`, `caniuse-lite`, `picocolors`) continuam no lock, o que é correto: o relato afirma que outros pacotes os usam, e como `alterados` é 0 e eles não saíram, não há perda.
- Consistência para o `npm ci`: `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `engines`, `name` e `version` do pacote raiz do lock são idênticos aos de `package.json` (o `npm ci` falha quando divergem; aqui não divergem). Não rodei `npm ci` (proibido nesta rodada).

## 3. Nenhuma versão de outro pacote mudou

- `git diff --numstat`: `package.json` 1 inserção e 3 remoções; `package-lock.json` 0 inserções e 76 remoções.
- `package.json` tem exatamente 3 hunks: a linha 19 (`scripts.test` com `tests/public-cache.test.mjs`, da 2D, preservada) e a remoção de `autoprefixer` e de `prettier` em `devDependencies`. Nenhum número de versão de outro pacote foi tocado.
- `package-lock.json`: 76 linhas removidas, todas dos quatro blocos `node_modules/*` mais as duas linhas da raiz (`devDependencies`). Nenhuma linha adicionada.
- `../package-lock.json` (o da raiz): `git status` sem alteração.

## Achados de padrões e de especificação

Nenhum. Escopo: só `package.json` e `package-lock.json`, como o brief permite; nenhum `.prettierrc` nem configuração nova; o relato cobre as seis seções pedidas e o limite do `--package-lock-only` (o `node_modules/` local ainda tem os dois pacotes, então lint e testes verdes não provam sozinhos a remoção).

### FYI
- **Uso informal de `npx prettier`.** Relatos antigos registram que executores rodaram `npx prettier --check` ou "Prettier nos arquivos novos" (`docs/harness/relatos/interface-conteudo-2026-11-13.md:85`, `qa-margem-2026-11-06.md:251`, `interface.md:184`). Não é uso do projeto (nenhum script, workflow ou configuração), mas, sem o pacote instalado, `npx prettier` passa a baixar a versão mais recente do registro, sem trava. Se o time quiser manter essa prática, vale combinar uma versão ou desistir dela; não bloqueia.
- **Avisos do `npm uninstall`** que o relato registra (`EBADENGINE`: o projeto pede Node 22.x e a máquina tem v24.20.0; 9 vulnerabilidades moderadas) são independentes desta mudança. Não investiguei as 9; o `dependencies.yml` do CI roda `npm audit --audit-level=high`, então só importaria se alguma fosse alta.

## O que o QA ainda precisa provar

`npm ci` limpo (sem `node_modules/` anterior) seguido de `npm run build`, `npm run lint` e `npm test` em ambiente descartável, quando ninguém estiver buildando. É a única prova de que nada dependia dos dois pacotes sem estar no lock ou no código. Também vale diferenciar o CSS gerado antes e depois, para confirmar que os prefixos continuam vindo do Tailwind.

## Comandos que rodei

Todos somente leitura: `git diff`, `git show`, `grep`, `ls`, `cat`, `node -e` (comparação de lock e de dependentes) e `npm ls ... --package-lock-only`. Não rodei `npm install`, `npm ci`, `npm run build`, lint nem testes (o executor já os rodou e eu não os repeti). Único arquivo escrito: este relato; cópia temporária do lock do HEAD em `$TEMP/lock-head.json`, fora do repositório.
