# Brief 2E — Tijolo: remover `autoprefixer` e `prettier` (dependências sem uso)

Para: Tijolo (backend). Etapa 2. **Pode rodar já, em paralelo ao Pincel**: só mexe em `package.json` e `package-lock.json`, não toca `src/`, `server/` nem `node_modules/`.

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
node scripts/harness.mjs claim backend package.json package-lock.json docs/harness/relatos/backend-etapa2e-2026-11-17.md
node scripts/harness.mjs update backend trabalhando "2E: remover autoprefixer e prettier (só package.json e package-lock.json)"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Se `status` mostrar outro papel com `package.json` ou `package-lock.json`, **pare** e avise. Ao terminar:

```
node scripts/harness.mjs update backend revisao "2E pronto para revisão da Lupa"
node scripts/harness.mjs release backend
```

## Objetivo

Provar, no estado atual da árvore, que `autoprefixer` e `prettier` não são usados por nada, e removê-los de `package.json` e `package-lock.json` sem alterar nenhum outro pacote.

## Contexto mínimo

- Plano: `docs/harness/briefs/02-plano-eixo-c.md`, seção "2E — Tijolo". Origem: `docs/UX-PERFORMANCE-2026-11-16.md:128` ("`autoprefixer` e `prettier` sem uso") e relato C1 (`docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`).
- Onde estão hoje (conferido em 17/11): `package.json:68` (`"autoprefixer": "^10.6.0"`) e `package.json:75` (`"prettier": "^3.9.9"`), ambos em `devDependencies`. No `evorix-finance/package-lock.json` (lockfileVersion 3, 371 pacotes) só o pacote raiz (`""`) depende deles; nenhum outro pacote do lock os exige.
- `postcss.config.js` tem uma linha: `export default { plugins: { "@tailwindcss/postcss": {} } };`. Não usa `autoprefixer`.
- Existem **dois** lockfiles rastreados pelo git: `evorix-finance/package-lock.json` (o do projeto, o que importa) e `../package-lock.json` na raiz do repositório (93 bytes, 0 pacotes). **Não toque o da raiz.**
- `package.json` já tem uma alteração não commitada da 2D (linha 19, `scripts.test`, que acrescenta `tests/public-cache.test.mjs`). **Preserve-a**: o seu diff nesse arquivo são só 2 linhas removidas.
- `.npmrc` tem `ignore-scripts=true` (`tests/dependencies.test.mjs:29` confere). Não mude.
- **Limite importante:** `--package-lock-only` não mexe em `node_modules/`, então `autoprefixer` e `prettier` continuam instalados nesta máquina. Por isso `npm test` e `npm run lint` verdes **não provam** que a remoção é segura; quem prova é a busca do passo 1 e a lista de dependentes do lock. O `npm ci` limpo com build fica para o QA final, quando ninguém estiver buildando.

## Pode ler / pode editar

- **Pode ler** qualquer arquivo do projeto, exceto `.env*`.
- **Pode editar:** `package.json` (só as duas linhas `autoprefixer` e `prettier` de `devDependencies`) e `package-lock.json` (só pelo comando do passo 3).
- **Pode criar:** o relato `docs/harness/relatos/backend-etapa2e-2026-11-17.md`.

## Fora do escopo

- `node_modules/`, `npm install`, `npm ci`, `npm update`, `npm audit fix`, qualquer outro pacote, qualquer mudança de versão.
- `npm run build` (o Pincel depende do `dist/`).
- `../package-lock.json` (o da raiz), `.npmrc`, `postcss.config.js`, `eslint.config.js`.
- Criar `.prettierrc` ou qualquer outra configuração. Reformatar código.
- `src/`, `server/`, `tests/`, `scripts/`.

## Passos

1. **Prova de que não são usados** (estado atual). Rode e guarde a saída de cada comando, em `evorix-finance/`:
   ```
   grep -rn -E "autoprefixer|prettier" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.test-artifacts --exclude=package-lock.json . ../.github ../AGENTS.md ../README.md
   grep -n -E "autoprefixer|prettier|\"format|\"fmt" package.json
   cat postcss.config.js
   grep -n -i -E "postcss|css:" vite.config.ts
   ls -a . .. | grep -i -E "prettier|editorconfig|browserslist|postcssrc"
   ```
   Procure também `browserslist` dentro de `package.json` (campo) e confirme que `.github/workflows/*.yml` e `.github/dependabot.yml` (em `../.github/`) não citam nenhum dos dois. Esperado: as únicas ocorrências são `package.json:68`, `package.json:75` e menções em `docs/` (documentação). Ocorrências em `.claude/worktrees/` e `.maestri/` são cópias de outras árvores: ignore e registre. Se aparecer **qualquer** uso real (import, script, configuração, workflow), **pare e avise** o Orquestrador, sem remover.
2. **Antes de mexer.** Guarde cópias fora do repositório (use o seu diretório temporário de sessão): `package-lock.json` como `lock-antes.json` e a saída de `git diff -U0 -- package.json` como `package-diff-antes.txt`. Rode `npm ls autoprefixer prettier --package-lock-only` e anote o resultado.
3. **Remover.** `npm uninstall --package-lock-only autoprefixer prettier`. Confira que o comando terminou sem erro e que `node_modules/` não foi tocado (`ls node_modules/autoprefixer` ainda existe). Se o npm tentar baixar ou instalar algo, **pare**.
4. **Conferir o diff.**
   - `git diff -U0 -- package.json`: deve ter o mesmo hunk da linha 19 que já existia (compare com `package-diff-antes.txt`) e **mais** exatamente dois hunks de remoção (`autoprefixer`, `prettier`).
   - `git diff --stat -- package-lock.json`: só remoções.
   - Compare o lock antes e depois com um script **descartável fora do repositório** (ou o comando abaixo, trocando `<antes>` pelo caminho de `lock-antes.json`):
     ```
     node -e "const a=require('<antes>').packages,b=require('./package-lock.json').packages;const rem=Object.keys(a).filter(k=>!(k in b));const mud=Object.keys(b).filter(k=>k!==''&&JSON.stringify(a[k])!==JSON.stringify(b[k]));console.log('removidos',rem.length);console.log(rem.join('\n'));console.log('alterados',mud.length);console.log(mud.join('\n'))"
     ```
     Esperado: `removidos` contém `node_modules/autoprefixer`, `node_modules/prettier` e, no máximo, dependências que **só** eles usavam; `alterados` é `0`. Se algum pacote restante mudou `version`, `resolved` ou `integrity`, **pare**, não commite e avise (para desfazer o lock, restaure a cópia `lock-antes.json`; **não** use `git checkout`/`git restore` em `package.json`, que tem a alteração pendente da 2D). Se mudou só uma marca como `dev`/`peer`, registre no relato e avise.
   - Para cada pacote removido além dos dois, mostre no relato que **nenhum pacote restante** o exige: `grep -c "\"<nome>\"" package-lock.json` fora da entrada removida, ou o `npm ls <nome> --package-lock-only` vazio.
5. **Validação.** Rode os comandos abaixo e registre cada resultado.

## Critérios de aceite (observáveis)

- [ ] O relato lista cada lugar procurado no passo 1 e o que foi descartado; nenhum uso real encontrado.
- [ ] `git diff -U0 -- package.json`: a alteração da 2D (linha 19) segue igual e há só 2 linhas removidas (`autoprefixer`, `prettier`); nenhuma versão de outro pacote mudou.
- [ ] `git diff -- package-lock.json` só tem remoções, ligadas a esses dois pacotes e às dependências exclusivas deles; o script do passo 4 imprime `alterados 0`.
- [ ] `grep -c -E "autoprefixer|prettier" package-lock.json` imprime `0` (ou cada ocorrência restante é explicada no relato).
- [ ] `node --test tests/dependencies.test.mjs`, `npm run lint` e `npm test` passam.
- [ ] `git status --short` mostra, além do que já estava, só `package.json`, `package-lock.json` (modificados), o relato novo e `docs/harness/state.json`. O `../package-lock.json` da raiz não aparece.

## Comandos de validação (em `evorix-finance/`)

```
grep -c -E "autoprefixer|prettier" package-lock.json
npm ls autoprefixer prettier --package-lock-only
node --test tests/dependencies.test.mjs
npm run lint
npm test
git diff --stat -- package.json package-lock.json
git status --short
node scripts/harness.mjs check
```

Esperado: `0`; o `npm ls` sem os dois pacotes; os testes e o lint sem falha; `check` sem erro. **Não rode** `npm run build`, `npm install` nem `npm ci`.

## Formato do relato

Arquivo `docs/harness/relatos/backend-etapa2e-2026-11-17.md`, em português, com estas seções numeradas:

1. Prova de não uso: cada busca do passo 1 (comando), o que apareceu e o que foi descartado.
2. Alterações em `package.json` e `package-lock.json`, com `arquivo:linha`, e a lista dos pacotes removidos do lock (os dois e os exclusivos deles, se houver).
3. Comparação do lock antes e depois (saída do script do passo 4: `removidos` e `alterados`).
4. Comandos rodados e resultado (passou, falhou, não executado e por quê).
5. Limites: `node_modules/` não foi tocado, então só o `npm ci` limpo com build (QA final) prova o efeito completo; o que não foi executado.
6. Próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em arquivo, log ou relato. Não abra `.env*`.
- Não faça commit, push, deploy nem migração. Deixe o diff na árvore para a Lupa.
- Não instale nem atualize pacote; não use `npm audit fix`.
- Não adicione linha de autoria de IA.
