# Relato: aulas em vídeo, parte do servidor (Tijolo, brief 2a)

Data: 2026-11-23
Branch: worktree `aulas-videos-2026-11-23` (nome completo omitido, repositório público) · HEAD base `f4ae72e`
Papel: Backend (Tijolo)

## Arquivos alterados

- `server/learning-content.js`: bloco `learningCourses` (5 cursos) e lista `lessons` (11 aulas, ordem nova). Gerado pela ferramenta `monta-learning-content.mjs` a partir de `conteudo-aulas.json`. As 4 aulas existentes (`ranking`, `risco`, `dividendos`, `carteira`) não tiveram o texto alterado; o comparador confirma isso.
- `tests/learning.test.mjs`: contagem 4 → 11, lista `[id, answer]` com as 11 duplas na ordem nova, import de `learningCourses`, e teste novo "catalog integrity".
- `docs/harness/relatos/aulas-videos-servidor-2026-11-23.md`: este relato.

Fora deste trabalho, mas no mesmo worktree (não tocados por este Tijolo): `docs/FIGMA-MAKE-INTEGRACAO.md` e `docs/RANKING-PUBLICO.md` (linhas de fim de linha já existentes, ignoradas conforme o Orquestrador), `src/lib/learningCatalog.ts` e `tests/browser-experience.mjs` (Pincel).

Nenhum commit, push, PR, deploy ou `harness claim/update/release` foi feito. O claim não foi feito, conforme decisão do Orquestrador.

## Resultado dos critérios de aceite

- [x] **`git status --short`**: aparecem `M server/learning-content.js`, `M tests/learning.test.mjs` e (após salvar este relato) `?? docs/harness/relatos/aulas-videos-servidor-2026-11-23.md`. Também aparecem as duas linhas de fim de linha já existentes e os arquivos do Pincel, citados acima.
- [x] **Comparador `--only server`**: `Resumo: 115 passam, 0 falham, de 115 verificações.` Nenhuma linha `FALHA`. Na rodada completa, após o reordenamento (ver seção própria): 167 de 167.
- [x] **`serializeLessons(false)`**: 11 itens; só `acoes` com `locked: false`; nenhuma chave `question`, `choices`, `answer` ou `explanation` nos itens do visitante (`vazamento de exercício: false`).
- [x] **`serializeLessons(true)`**: 11 itens, todos com `locked: false`.
- [x] **Cursos**: `primeiros-passos[acoes+corretora+comprar-acoes] dividendos[dividendos+carteira] economia[inflacao+ciclos] analise[fundamentalista+preco-teto] pesquisa[ranking+risco]`.
- [x] **`npm run lint`**: código 0.
- [x] **`node --test tests/learning.test.mjs`**: 2 de 2 passam (inclui o teste novo "catalog integrity"). Código 0.
- [x] **`npm test`**: código 0. **317 de 317** passam. O controle (`controle-testes.txt`) tem 316 de 316. A diferença é só o teste novo.
- [x] **`git grep -i -E "tempo real|com atraso" -- server/learning-content.js`**: sem resultado (limpo).
- [x] **Sem vídeo, segredo, `.env` ou autoria de IA no diff**: busca por linhas de autoria de IA (co-authored, generated with, nomes de ferramentas), segredo, `.env`, `.mp4` e `token` no diff dos dois arquivos de código não retornou nada.
- [x] **Relato explica linha a linha os 3 testes que não rodam localmente**: seção abaixo.

## Ajuste posterior: reordenamento das alternativas (23/11, depois da revisão da Lupa)

O arquivo `conteudo-aulas.json` mudou só a ordem das alternativas e o índice `answer` de 5 aulas, para a resposta certa não ficar sempre no meio. O texto das alternativas não mudou. Índices novos:

- `corretora`: 1 → 2
- `inflacao`: 1 → 0
- `ciclos`: 1 → 2
- `fundamentalista`: 1 → 0
- `preco-teto`: 1 → 2
- `acoes`, `comprar-acoes`, `dividendos`, `carteira`, `ranking`, `risco`: sem mudança.

Procedimento: `server/learning-content.js` foi regenerado a partir de `base/learning-content.js` (origin/main), não do arquivo já gerado. A ferramenta recusa entrada que já tenha as aulas novas. A saída foi gravada com o mesmo nome de arquivo de saída.

`tests/learning.test.mjs` tinha os índices antigos na lista `[id, answer]`. Atualizei só essas 5 duplas. Nenhuma outra linha do teste mudou.

Resultado após o ajuste:

- Comparador completo (com `--catalog` e `--base-catalog`): **167 passam, 0 falham, de 167 verificações**.
- `node --test tests/learning.test.mjs`: 2 de 2 passam.
- `npm test`: 317 de 317 passam.
- `npm run lint`: código 0.

## Testes de integração que não rodaram aqui

Estes três arquivos precisam de MySQL, que não está disponível nesta máquina. **Não foram executados localmente.** Eles devem rodar na CI da PR. Não foram editados.

### `tests/integration.test.mjs:588-660` (não executado)

- L596-601: compara `guest.body.lessons[0]` com `lessons[0]`. Ambos agora são `acoes`, então continua válido.
- L602-604: confere que nenhum item do visitante tem `question`, `choices`, `answer` ou `explanation`. Continua válido, porque a ordem não muda os campos.
- L605-610: compara `lessons.slice(1)` com `{id, title, locked: true}`. Continua válido para qualquer ordem.
- L611-619: `PUT /progress/ranking` como visitante retorna 401. `ranking` continua existindo, então continua válido.
- L620-626: membro recebe as 11 aulas abertas, comparadas com `lessons`. Continua válido.
- L628-636: `PUT /progress/risco` com resposta 0 retorna 400. `risco` continua com resposta certa `2`, então continua válido.
- L637-648: resposta certa `2` em `risco` retorna 200, e `completed` fica `["risco"]`. Continua válido.
- L649-652: o usuário B não recebe o progresso de A. Continua válido.
- L653-656: `lessons[1].locked` para visitante continua `true`, porque `lessons[1]` agora é `corretora`, que está bloqueada para visitante. Continua válido.
- L657-660: `DELETE` do progresso de A zera `completed`. Continua válido.

### `tests/notifications.integration.mjs:150-170` (não executado)

- L154-155: `publish` de `pesquisa` com usuário comum retorna 403 e sem login retorna 401. Não depende da ordem, continua válido.
- L156-160: as 5 entradas inválidas retornam 400. Inclui `{courseId:"pesquisa", lessonId:"carteira"}`: `carteira` não está em `pesquisa.chapterIds` (`[ranking, risco]`), então continua falhando. Continua válido.
- L161-163: abrir o catálogo não cria anúncio de notificação. Não depende da ordem, continua válido.
- L164-166: 4 publicações simultâneas de `pesquisa` geram o mesmo `notificationId`. `pesquisa` não mudou, continua válido.
- L167-168: `{courseId:"dividendos", lessonId:"carteira"}` retorna 200. `carteira` está em `dividendos.chapterIds` (`[dividendos, carteira]`), continua válido.
- L169-170: a notificação do curso é achada pelo id. O link usa `course.chapterIds[0]`; para `pesquisa` continua `ranking`, como antes. As linhas depois de 170 não foram lidas (fora da faixa do brief); se a CI quebrar ali, o primeiro lugar a olhar é a asserção do link.

### `tests/backup.mjs:44-50` e `:130-136` (não executado)

- L44-48: insere progresso `ranking` para o usuário A. `ranking` existe, continua válido.
- L130-136: após restaurar, o progresso deve ser exatamente `[{user A, ranking}]`. Nenhuma aula nova entra nesse fluxo, e `ranking` continua existindo, então continua válido.

Nenhuma linha que quebre foi encontrada na leitura.

## Totais e controle

- `npm test` agora: 317 testes, 317 passam, 0 falham.
- Controle (`controle-testes.txt`): 316 testes, 316 passam, 0 falham.
- Diferença: +1, o teste "catalog integrity". É o esperado.

## Diff

- `git diff --stat` (somente os dois arquivos de backend/teste): `server/learning-content.js` 456 linhas (com mudanças), `tests/learning.test.mjs` 60 linhas; total 472 inserções e 44 remoções nesses dois arquivos.
- `git diff --patience -- server/learning-content.js | grep -c '^-[^-]'`: **42** linhas removidas. `grep -c '^+[^+]'`: **418** linhas adicionadas.
- As remoções são do bloco antigo de `learningCourses` e das aulas `ranking` e `risco`, que mudaram de posição (o `git diff` mostra como remoção e inserção). A prova de que o texto das 4 aulas existentes não mudou é o comparador com `--base-content`, não o diff. O comparador passou com 0 falhas.

## Verificação de conteúdo sensível

Conferido nesta entrega: o relato não contém caminho absoluto do usuário nem o nome do usuário; o diff não contém segredo, arquivo de vídeo nem linha de autoria de IA (ver critérios acima).

## Limites

- Os três arquivos de integração não rodaram localmente, por falta de MySQL. A validação deles depende da CI da PR.
- Não foi feita revisão editorial do texto. Como pedido, o texto foi copiado do arquivo de conteúdo sem alteração.
- Não houve migração. `learning_progress.lesson_id` é `VARCHAR(40)` e o maior ID novo (`fundamentalista`) tem 15 caracteres.
- Não houve claim no harness, conforme decisão do Orquestrador.

## Próximo passo sugerido

1. O Orquestrador revisa este relato e o diff de `server/learning-content.js`.
2. Abrir a PR somente depois da aprovação, com o Pincel já integrado no mesmo branch (ele trabalha em `src/lib/learningCatalog.ts` e `tests/browser-experience.mjs`).
3. Deixar a CI rodar `tests/integration.test.mjs`, `tests/notifications.integration.mjs` e `tests/backup.mjs`, que não rodaram aqui.
