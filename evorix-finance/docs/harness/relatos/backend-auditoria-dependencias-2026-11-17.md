# Relato backend — Auditoria de dependências (somente leitura)

Data: 17/11/2026. Papel: Backend (Tijolo). Pedido do Orquestrador: explicar os 9 alertas moderados que o `npm` mostrou, sem corrigir.
Escopo: nada foi alterado. Não rodei `npm audit fix`, `install`, `update` nem `ci`. `package.json` e `package-lock.json` estão como estavam após a 2E.

## Comandos rodados (leitura)

- `npm audit --json` (exit 1, esperado com vulnerabilidades): 9 moderados, 0 altos, 0 críticos.
- `npm audit --omit=dev --json` (exit 0): **0 vulnerabilidades**.
- `npm ls minimatch --all` e `npm ls minimatch --omit=dev` (produção: vazio).
- `npm view` (somente consulta ao registro): versões de `minimatch`, `eslint`, `typescript-eslint`, `@eslint/config-array` e suas dependências `minimatch`.
- `grep` no código do projeto (`server/`, `src/`, `scripts/`, `tests/`) por `glob`, `minimatch` e `picomatch`: nenhuma ocorrência.

Saídas brutas em `C:\Users\vitor\AppData\Local\Temp\etapa2e\audit-all.json` e `audit-prod.json`.

## Achado central

Os 9 alertas são **um único problema**, a advertência GHSA-g3hv-75wg-m249 no `minimatch` (`potential denial of service via globparts amplification`, CWE-405, severidade moderada, sem CVSS). Ela afeta `minimatch >=7.0.0 <11.0.1`. O `minimatch` instalado é **10.2.6** (`node_modules/minimatch`), dentro da faixa.

Os outros 8 alertas são só propagação dele para as ferramentas de lint. Cada um aparece porque depende de `minimatch` por dentro.

## Tabela dos 9 alertas

| # | Pacote | Instalado | Quem puxa (caminho) | Vai para produção? | Código do projeto chega ao trecho? | Correção sem major? |
|---|---|---|---|---|---|---|
| 1 | `minimatch` | 10.2.6 | `eslint` e `@eslint/config-array` (e `typescript-estree`) | Não (dev) | Não se aplica diretamente: nenhum uso no projeto | Sim, via `eslint` ≥10.15.0 e `typescript-eslint` ≥8.73.0 |
| 2 | `eslint` (direto) | 10.10.0 | `devDependencies` → `minimatch` | Não (dev) | Sim, indiretamente: `eslint .` roda no lint com `eslint.config.js` (padrões fixos, `files: ['**/*.{ts,tsx}']`) | Sim: `10.15.0` (`minimatch ^11.0.5`), dentro de `^10.10.0` |
| 3 | `@eslint/config-array` | 0.23.5 | `eslint` → `minimatch` | Não (dev) | Mesmo caso do `eslint` | Sim: `0.23.6`. O `eslint` 10.10.0 pede `^0.23.5`, e o 10.15.0 pede `^0.23.6`, então sobe junto com o eslint |
| 4 | `typescript-eslint` (direto) | ≤8.72.2 (instalado 8.70.0) | `devDependencies` → pacotes `@typescript-eslint/*` | Não (dev) | Sim, indiretamente: `eslint.config.js` usa `typescript-eslint` no lint | Sim: `8.73.0` (`minimatch ^11.0.1`), dentro de `^8.69.0` |
| 5 | `@typescript-eslint/eslint-plugin` | 6.16.0–8.72.2 (instalado 8.70.0) | `typescript-eslint` | Não (dev) | Mesmo caso do `typescript-eslint` | Sim, junto com 4 |
| 6 | `@typescript-eslint/parser` | 6.16.0–8.72.2 (instalado 8.70.0) | `typescript-eslint` | Não (dev) | Mesmo caso | Sim, junto com 4 |
| 7 | `@typescript-eslint/type-utils` | 6.16.0–8.72.2 | `eslint-plugin` e `utils` | Não (dev) | Mesmo caso | Sim, junto com 4 |
| 8 | `@typescript-eslint/typescript-estree` | 6.16.0–8.72.2 (instalado 8.70.0) | `typescript-eslint` | Não (dev) | Mesmo caso | Sim, junto com 4 |
| 9 | `@typescript-eslint/utils` | 6.16.0–8.72.2 | `typescript-estree` | Não (dev) | Mesmo caso | Sim, junto com 4 |

Observação: o `npm audit` marca 9 entradas, mas o `minimatch` é a única fonte. Conferi: `npm ls minimatch --all` mostra o mesmo `minimatch@10.2.6`, deduplicado entre eslint e typescript-eslint.

## Produção

- `npm audit --omit=dev`: **0**.
- `npm ls minimatch --omit=dev`: **vazio**. O pacote não está no grafo de dependências de runtime.
- Dependências de runtime do projeto (`dependencies`): argon2, express, express-rate-limit, fflate, framer-motion, helmet, lucide-react, mysql2, nodemailer, react, react-dom, react-router-dom, read-excel-file, recharts, zod. Nenhuma delas puxa `minimatch`.
- Bundle do navegador: vem do Vite a partir do código de `src/` e das dependências acima. `eslint` e `typescript-eslint` não entram no bundle.

Conclusão: **nenhum dos 9 alertas chega ao servidor em produção nem ao navegador.** Eles afetam só ferramentas de desenvolvimento (lint).

## Chega ao código do projeto?

- O lint roda `eslint .` (`package.json` script `lint`). O `eslint.config.js` usa padrões estáticos (`files: ['**/*.{ts,tsx}']`), escritos pelo próprio time, sem entrada externa.
- Nenhum arquivo em `server/`, `src/`, `scripts/` ou `tests/` usa `glob`, `minimatch` ou `picomatch` diretamente.
- A advertência precisa de padrões de glob construídos com muitos fragmentos para causar lentidão. Nesse projeto, esses padrões não vêm de usuário nem de requisição. O risco fica limitado a um lint lento num padrão malicioso que o próprio time tivesse de colocar no repositório. Não é um caminho de ataque a produção.
- Avaliação: risco **baixo, de desenvolvimento**. Não se aplica ao runtime. Eu não testei o caso de DoS em si, porque isso não era o escopo.

## Existe correção sem subir versão maior?

Sim, dentro das faixas que o `package.json` já declara:

- `eslint`: `^10.10.0` aceita `10.15.0` (depende de `minimatch ^11.0.5`).
- `typescript-eslint`: `^8.69.0` aceita `8.73.0` (depende de `minimatch ^11.0.1`).
- `@eslint/config-array`: `0.23.6` (corrige a dependência por dentro do eslint).

Não é preciso mudar nenhuma faixa de `package.json`. Ou seja, nada de major. A troca do `minimatch` 10→11 acontece **dentro** das dependências do eslint, não no projeto. Não verifiquei isso com um `npm install` real (proibido nesta tarefa), então a validação fica para a etapa de correção.

## Recomendação

1. **Não é urgente para produção**, porque nenhum alerta chega ao runtime.
2. **Corrigir em etapa própria**, sem misturar com outras mudanças: subir `eslint` para `^10.15.0` e `typescript-eslint` para `^8.73.0` (e deixar o npm resolver `@eslint/config-array` e os `@typescript-eslint/*`). Mudança só em `package.json` e lock.
3. Validar depois com `npm ci` limpo, `npm run lint` e `npm test`. Confirmar `npm audit` zerado.
4. Se o dono preferir não mexer agora, aceitar o risco como de desenvolvimento e registrar.

## Limites

- Não executei nenhuma correção nem simulei a instalação. As versões de correção vêm do registro (`npm view`), não de uma árvore testada.
- Não verifiquei a fundo a advertência GHSA-g3hv-75wg-m249 além do texto e da faixa do `npm audit`.
- O `EBADENGINE` (projeto pede Node 22, máquina tem 24) continua não investigado; não tem relação com os alertas.
