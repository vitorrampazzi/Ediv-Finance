# Relato: servidor e testes só com as 7 aulas que têm vídeo (Tijolo, brief 2a)

Data: 2026-11-24
Worktree: `so-videos-2026-11-23` (base `1e13fdb`). Nome completo da branch omitido, por ser repositório público.
Papel: Backend (Tijolo)
Coordenação no harness: **sem `harness claim`**, conforme decisão do Orquestrador. Nenhum commit, push, PR ou deploy.

## Arquivos alterados

- `server/learning-content.js`: **só remoções** (180 linhas). Saíram as aulas `dividendos`, `carteira`, `ranking` e `risco`, e os cursos `dividendos` e `pesquisa`. As 7 aulas restantes ficaram byte a byte iguais à base.
- `tests/learning.test.mjs`: contagem 11 → 7; lista `[id, answer]` com as 7 duplas; asserção nova dos cursos (`primeiros-passos`, `economia`, `analise`, com os `chapterIds` esperados). O teste de integridade do catálogo continua e passa.
- `tests/integration.test.mjs`: 3 linhas. `progress/risco` virou `progress/corretora` (duas chamadas) e a lista `["risco"]` virou `["corretora"]`.
- `tests/notifications.integration.mjs`: 13 linhas. `courseId "pesquisa"` virou `"analise"`; o par de 400 virou `{courseId "economia", lessonId "acoes"}`; o par de 200 virou `{courseId "primeiros-passos", lessonId "corretora"}`; o `sourceId` esperado virou `"analise"`; os hrefs viraram `aula=fundamentalista` e `aula=corretora`.
- `tests/notifications.e2e.mjs`: 4 linhas. `courseId` virou `"analise"`; `aula=ranking` virou `aula=fundamentalista` (link e `waitForURL`); o título esperado virou `"Análise fundamentalista: do setor à empresa"`.
- `tests/notifications.backup.mjs`: 1 linha. `courseId "pesquisa"` virou `"analise"`.
- `docs/harness/relatos/aulas-so-videos-servidor-2026-11-23.md`: este relato.

Não tocados, de propósito: `src/**`, `tests/browser.mjs`, `tests/browser-experience.mjs`, `server/learning.js`, `server/notifications.js`, `tests/backup.mjs`, `glossary`, `serializeLessons`, `docs/harness/state.json`, `package*.json`. As linhas fantasma de fim de linha em `docs/` não foram tocadas.

Observação sobre o `git status`: no momento da conferência inicial o worktree estava limpo. Ao fim, aparecem também arquivos de `src/` e `tests/browser.mjs`, modificados pelo Pincel. Não são deste Tijolo.

## Script de igualdade (base `1e13fdb`)

- Antes das edições (`--so-servidor --so-igualdade`): `Aulas iguais à base: 7 de 7`, `Resumo: 14 passam, 0 falham, de 14`. Saída 0.
- Após as edições (`--so-servidor`): `Aulas iguais à base: 7 de 7`, `Resumo: 30 passam, 0 falham, de 30`. Saída 0.
- A referência foi gerada em pasta nova fora do repositório. Copiei somente `learning-content.js`. `learningCatalog.ts` ficou de fora, por ser do Pincel.

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `igualdade-aulas.mjs --so-servidor` | 7 de 7; 30 de 30; saída 0 (passou) |
| `git diff --stat -- server/learning-content.js` | 0 inserções, 180 remoções (passou) |
| `node --check` nos 5 arquivos de teste editados | os 5 OK (passou) |
| `npx eslint` nos 5 arquivos de teste editados | saída 0 (passou) |
| `node --test tests/learning.test.mjs` | 2 de 2 (passou) |
| `npm run lint` | saída 0 (passou) |
| `npm test` | **317 de 317** passam, saída 0. Igual ao controle, nenhum teste criado nem removido (passou) |
| Serialização de visitante (`serializeLessons(false)`) | 7 itens: `acoes` (aberta), `corretora`, `comprar-acoes`, `inflacao`, `ciclos`, `fundamentalista`, `preco-teto`. Nenhum exercício vaza (passou) |
| `grep` de IDs e links removidos nos testes editados | sem resultado, saída 1 (passou) |
| `grep` de `"dividendos"` nos testes editados | sem resultado, saída 1 (passou) |
| `node --test`, MySQL, Playwright (`integration.test.mjs`, `notifications.*`, `backup.mjs`) | **não executado (sem MySQL nem Docker nesta máquina)** |

## Leitura das asserções de MySQL e de navegador editadas (não executadas)

Conferência feita por leitura contra o código. `server/notifications.js:150-189`:

- Linha 150-157: `courseId` e `lessonId` são validados. `courseId` precisa existir em `learningCourses`, e `lessonId` precisa estar em `course.chapterIds`. `{economia, acoes}` cai em 400, porque `acoes` não está em `economia`. Confere.
- Linha 159: `sourceId` é `lessonId || course.id`. Para curso, é `analise`. Confere.
- Linha 189: href é `/app/aprender?aula=${lessonId || course.chapterIds[0]}#sala-de-aula`. Para `analise`, `chapterIds[0]` é `fundamentalista`. Para `corretora` como aula, a href usa `corretora`. Confere.
- `notifications.integration.mjs` linha 154-155 (403 e 401), 158-159 (400 por versão inválida e por campo extra), 164-166 (deduplicação de 4 publicações simultâneas para o mesmo `notificationId`), 177-178 (nova versão cria nova notificação), 186 (falha forçada retorna 500), 221 (paginação): todos usam apenas `courseId "analise"`, que existe. Confere.
- `notifications.integration.mjs` linha 167-168: `{primeiros-passos, corretora}` retorna 200, porque `corretora` está em `primeiros-passos`. Confere.
- Linha 172 (`sourceId` "analise"), 173 (href `aula=fundamentalista`), 176 (href `aula=corretora`): batem com as linhas 159 e 189 do código. Confere.
- `notifications.e2e.mjs` linha 27 (`courseId` "analise"), 46 e 49 (link e `waitForURL` com `fundamentalista`), 51 (título do h2 "Análise fundamentalista: do setor à empresa", que é o `title` da aula em `server/learning-content.js`). Confere.
- `notifications.backup.mjs` linha 38: `courseId` "analise". Confere.
- `integration.test.mjs` linhas 630-648: `progress/corretora` com resposta 0 dá 400 (`corretora` tem resposta certa `2`); com resposta 2 dá 200; lista `completed` vira `["corretora"]`. Confere.
- `integration.test.mjs` linha 613: `PUT /progress/ranking` como visitante retorna 401, porque `requireAuthenticatedUser` roda antes da busca da aula (`server/learning.js:23`). A ausência de `ranking` não muda o resultado. Confere.
- `integration.test.mjs` linha 653-656: `lessons[1].locked === true` para visitante. `lessons[1]` agora é `corretora`, que é bloqueada para visitante. Não mudou.

Nenhuma asserção editada depende de algo que a leitura não confirme. Ainda assim, **nada disso foi executado**. A validação real depende da CI da PR.

Não li `notifications.integration.mjs` a partir da linha 1 em profundidade. A leitura cobriu as linhas 150-275 e uma busca por termos de curso, aula, título e link nas linhas 1-150. Nenhuma asserção ali depende de lição ou curso removido.

## Confirmações pedidas

1. **`server/notifications.js` e `server/learning.js` não mudaram** (`git diff --quiet` passou para os dois). Ambos validam pelas listas do conteúdo: `notifications.js:151-157` valida `courseId` e `lessonId`; `learning.js:24` busca a aula por `id`. Continuam válidos.
2. **Notificação antiga com `aula=ranking` (ou outra aula removida) cai na primeira aula.** Em `src/pages/Aprender.tsx`, linhas 142-147, `selectedId` usa `lessonIds[0]` quando o `aula` da URL ou do hash não está em `lessonIds`. Essa lista vem de `learningChapters`, que é o catálogo do frontend. Esta confirmação depende do `learningCatalog.ts` do Pincel, que também precisa refletir as 7 aulas.
3. **Progresso salvo de aula removida é ignorado pela interface.** `src/pages/Aprender.tsx:181` filtra `data.completed` por `lessonIds`. `src/pages/Perfil.tsx:43` faz o mesmo. As linhas de `learning_progress` ficam no banco, sem migração e sem apagamento.
4. **`tests/backup.mjs:135` não foi alterado.** A linha `lesson_id: "ranking"` é uma linha crua de banco, inserida e lida pelo próprio teste de backup. O teste não valida o ID contra o catálogo. Mudar não é necessário e o brief pediu para não mudar.
5. **Sem `harness claim`.** Nada foi reservado nem liberado no quadro de coordenação.

## Próximo passo sugerido

1. Revisão do diff de `server/learning-content.js` (só remoções) e dos testes editados.
2. Rodar na CI da PR: `integration.test.mjs`, `notifications.integration.mjs`, `notifications.e2e.mjs` e `notifications.backup.mjs`, que não rodaram aqui.
3. Integrar com o trabalho do Pincel no frontend antes da publicação, porque a confirmação 2 depende do catálogo do frontend.
