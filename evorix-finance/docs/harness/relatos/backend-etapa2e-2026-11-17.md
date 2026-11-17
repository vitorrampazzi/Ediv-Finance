# Relato backend — Etapa 2E (remover `autoprefixer` e `prettier`)

Data: 17/11/2026. Papel: Backend (Tijolo). Brief: `docs/harness/briefs/etapa2-2E-tijolo.md`.
Branch: `vitorrampazzi/ux-performance-2026-11-16`. Nada foi commitado.

## 1. Prova de não uso (estado atual da árvore)

Comandos rodados em `evorix-finance/`:

- `grep -rn -E "autoprefixer|prettier" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.test-artifacts --exclude=package-lock.json . ../.github ../AGENTS.md ../README.md`
  - Achados reais: apenas `package.json:68` (`autoprefixer`) e `package.json:75` (`prettier`).
  - Descartados (documentação, não é uso): `docs/UX-PERFORMANCE-2026-11-16.md:128`, `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md:133,135`, `docs/harness/relatos/backend-etapa2d-2026-11-16.md:86`, `docs/harness/relatos/interface-conteudo-2026-11-13.md:85`, `docs/harness/briefs/*` (planos e este brief), `docs/harness/state.json:23`.
  - Não há ocorrência em `../.github` nem em `../AGENTS.md` / `../README.md`.
- `grep -n -E "autoprefixer|prettier|\"format|\"fmt" package.json`: só linhas 68 e 75. Nenhum script de format/fmt.
- `cat postcss.config.js`: `export default { plugins: { "@tailwindcss/postcss": {} } };`. Não usa `autoprefixer`.
- `grep -n -i -E "postcss|css:" vite.config.ts`: sem ocorrência (exit 1).
- `ls -a . .. | grep -i -E "prettier|editorconfig|browserslist|postcssrc"`: sem ocorrência. Não há `.prettierrc`, `.editorconfig`, `browserslist` nem `postcssrc`.
- `grep -i browserslist package.json`: sem ocorrência.
- `grep -n -i -E "autoprefixer|prettier" ../.github/workflows/*.yml ../.github/dependabot.yml`: sem ocorrência.
- Ocorrências em `.maestri/` e `.claude/worktrees/` não foram analisadas (o brief manda ignorar).

Conclusão: nenhum uso real (import, script, configuração ou workflow). Seguro remover.

## 2. Alterações em `package.json` e `package-lock.json`

- `package.json:68`: removida a linha `"autoprefixer": "^10.6.0",` (devDependencies).
- `package.json:75`: removida a linha `"prettier": "^3.9.9",` (devDependencies).
- `package.json:19`: alteração da 2D (`scripts.test` com `tests/public-cache.test.mjs`) **preservada**, igual ao diff de antes. Nenhuma versão de outro pacote mudou.
- `package-lock.json`: 76 linhas removidas, nenhuma adicionada. Pacotes removidos do lock:
  - `node_modules/autoprefixer` (pedido)
  - `node_modules/prettier` (pedido)
  - `node_modules/fraction.js` (exclusivo do autoprefixer)
  - `node_modules/postcss-value-parser` (exclusivo do autoprefixer)
- Verificação de que nenhum pacote restante exige os dois extras: `npm ls fraction.js postcss-value-parser --package-lock-only` retornou vazio; e `grep` no lock não encontra mais referências a eles.
- `browserslist`, `caniuse-lite` e `picocolors` continuam no lock (são usados por outras dependências).
- `normalize-range` não aparece no lock nem antes nem depois (já era assim; não foi efeito desta etapa).
- Raiz do repositório: `../package-lock.json` **não** foi tocado (`git status` limpo para ele).

## 3. Comparação do lock antes e depois

Cópias de segurança fora do repositório, em `C:\Users\vitor\AppData\Local\Temp\etapa2e\`: `lock-antes.json`, `package-json-antes.json`, `package-diff-antes.txt`.

Saída do script de comparação (`packages` do lock):

```
removidos 4
node_modules/autoprefixer
node_modules/fraction.js
node_modules/postcss-value-parser
node_modules/prettier
alterados 0
```

`devDependencies` da raiz: antes tinha `autoprefixer` e `prettier`; depois, só esses dois saíram. Todas as outras entradas são idênticas.

Estatística: `package-lock.json | 76 ---` e `package.json | 4 +--` (1 inserção = linha 19 da 2D; 3 remoções = linha 19 + 2 linhas removidas).

## 4. Comandos rodados e resultado

| Comando | Resultado |
|---|---|
| `npm uninstall --package-lock-only autoprefixer prettier` | exit 0. Avisos: `EBADENGINE` (projeto pede Node 22.x; máquina tem v24.20.0) e 9 vulnerabilidades moderadas reportadas pelo npm. Não investigadas; `npm audit fix` **não** foi rodado. |
| `ls node_modules/autoprefixer node_modules/prettier` (depois) | Ambos continuam existindo. `node_modules/` não foi tocado. |
| `grep -c -E "autoprefixer\|prettier" package-lock.json` | `0` |
| `npm ls autoprefixer prettier --package-lock-only` (antes) | `autoprefixer@10.6.0` e `prettier@3.9.9`, ambos dependentes só do pacote raiz |
| `node --test tests/dependencies.test.mjs` | exit 0. 3 testes, 3 passaram, 0 falhas |
| `npm run lint` | exit 0 (`eslint .`) |
| `npm test` | exit 0. 298 testes, 298 passaram, 0 falhas, 0 canceladas |
| `node scripts/harness.mjs check` | exit 0. "quadro válido; 4 papéis e reservas sem conflito" |

Observação: lint e `npm test` rodaram sobre a árvore atual, que inclui alterações em `src/` do Pincel em andamento. O resultado reflete essa árvore, não só a remoção.

Não executado: `npm run build`, `npm install`, `npm ci` e `npm update` (proibidos pelo brief). Não foram rodados os testes de integração com MySQL (não afetados por esta mudança).

## 5. Limites

- `node_modules/` continua com `autoprefixer` e `prettier` instalados. Por isso `npm test` e lint verdes **não provam** sozinhos que a remoção é segura. A prova é a busca do passo 1 e a análise do lock.
- O efeito completo só aparece num `npm ci` limpo seguido de build. Isso fica para o QA final, quando ninguém estiver buildando.
- Não verificado: as 9 vulnerabilidades moderadas que o npm listou. Não sei se são anteriores a esta mudança; não é escopo deste brief.

## 6. Próximo passo

- Lupa revisa o diff de `package.json` e `package-lock.json` (só remoções, `alterados 0`).
- Após aprovação, QA roda `npm ci` limpo + build em ambiente descartável para provar a remoção com `node_modules` novo.
- Commit e PR ficam para o Release, conforme a autorização do dono.
