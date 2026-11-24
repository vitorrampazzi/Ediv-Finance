# Relato: servidor com a ordem nova das aulas, aula aberta por id e travessões

Data: 2026-11-24
Worktree: `aulas-ordem-2026-11-24` (base `bedcb5f`, o HEAD de partida). Nome completo da branch omitido, por ser repositório público.
Papel: Backend (Tijolo)
Coordenação no harness: **sem `harness claim`** (decisão registrada). `docs/harness/state.json` não foi editado.
Nenhum commit, push, deploy ou acesso a produção ou a banco real.

## Ponto de partida

- HEAD `bedcb5f`. `git status` com as 2 linhas fantasma de fim de linha (`docs/FIGMA-MAKE-INTEGRACAO.md` e `docs/RANKING-PUBLICO.md`), não tocadas.
- `git grep -n "—" -- server`: 18 linhas (16 em `server/learning-content.js` e 2 em `server/auth.js`), como o brief esperava.

## Arquivos alterados

- `server/learning-content.js`: gerado a partir da base pelo script de igualdade (modo `--gerar-referencia`) e copiado para o projeto. Mudanças:
  - Ordem nova: o bloco `corretora` passou para antes de `acoes`. Conteúdo das aulas igual à base (o diff mostra só movimento de bloco).
  - `chapterIds` de `primeiros-passos`: `["corretora", "acoes", "comprar-acoes"]`.
  - Constante nova `openLessonId = "acoes"` antes de `export const lessons`, com comentário.
  - `serializeLessons` passou a abrir a aula pelo id (`lesson.id !== openLessonId`), e não pela posição. A estrutura da resposta não mudou.
  - 16 títulos de fontes trocaram o separador ` — ` por `: `. Os títulos e as URLs são os mesmos.
  - Exceção (correção pedida pelo Orquestrador, 24/11): o título `B3 Bora Investir: dividend yield, o que é e como calcular` usa vírgula, e não dois-pontos, para não repetir o separador. A URL é a mesma. A regra de `igualdade-aulas.mjs` ganhou essa exceção explícita (`EXCECAO_TITULO`); o arquivo anterior ficou ao lado, com o sufixo `.bak-antes-dividend-yield`, na pasta de briefs (fora do repositório).
- `server/auth.js`: 2 assuntos de e-mail. Linha 196: `Confirme seu e-mail na Escola do Dividendo`. Linha 689: `Redefina sua senha na Escola do Dividendo`.
- `server/mail.js` (linha 66), **com autorização do Orquestrador** para a tabela de textos "primeira aula": `a primeira aula` virou `a aula aberta`. Nada mais no arquivo.
- `tests/learning.test.mjs`: reescrito com a ordem nova; aula aberta por id; cursos com a ordem nova; respostas por id na ordem nova; teste de integridade do catálogo mantido; teste novo que compara o catálogo do servidor com o do cliente (`openLessonId`, `learningChapters`, cursos e a aula aberta pertencer a um curso).
- `tests/integration.test.mjs`: import de `openLessonId`; visitante: a aula aberta é achada por id e comparada com a fonte; a lista das trancadas usa `filter` por id; a asserção de trancamento passou a achar `corretora` por id. As chamadas de progresso com `corretora` já estavam no brief anterior e continuam válidas (resposta certa 2).
- `tests/production-smoke.mjs` (bloco "aula pública"): acha a aula aberta (`!locked`), exige exatamente uma aberta, e confere que as trancadas não trazem `text` nem `answer`. **Não foi executado** (aponta para produção).
- `docs/harness/relatos/aulas-ordem-servidor-2026-11-24.md`: este relato.

Não tocados, de propósito: `server/learning.js`, `server/notifications.js`, `tests/notifications.*.mjs`, `tests/backup.mjs`, `src/`, `index.html`, `site-pages.mjs`, `tests/browser*.mjs`, `tests/accessibility.browser.mjs`, `tests/price-series-ui.test.mjs`, `public/`, `docs/harness/state.json`, `package*.json`.

## Resultados dos critérios

| Critério | Resultado |
|---|---|
| `igualdade-aulas.mjs --so-servidor` | **Aulas iguais à base: 7 de 7**; **Resumo: 30 passam, 0 falham, de 30**; saída 0 (passou) |
| `git grep -n "—" -- server` | **0 linhas** (passou) |
| `git grep -n "index !== 0" -- server` | sem resultado (passou) |
| `git diff -- server/learning-content.js` | só movimento de bloco, `chapterIds`, constante, `serializeLessons` e 16 títulos. Nenhuma linha de conteúdo de aula nova ou apagada (passou) |
| `eslint` em `server`, `tests/learning.test.mjs`, `tests/integration.test.mjs`, `tests/production-smoke.mjs` | saída 0, sem erros (passou) |
| `node --check` nos 3 testes | OK nos 3 (passou) |
| `node --test tests/learning.test.mjs` | 3 de 3 passam (inclui o teste novo do catálogo do cliente) (passou) |
| `npm test` | **318 de 318** passam, 0 falham, saída 0 (passou); repetido após a correção do título: 318 de 318 |
| Igualdade completa (servidor + catálogo), após a correção do título | **Aulas iguais à base: 7 de 7**; **Resumo: 60 passam, 0 falham, de 60**; saída 0 (passou) |
| `npm run lint` (projeto inteiro) | **saída 1**: 1 erro em `src/pages/Aprender.tsx:203` (`'index' is defined but never used`). **Arquivo do Pincel, em andamento. Não é deste Tijolo.** Os arquivos do servidor e de teste que eu editei passam no eslint. |
| Greps de higiene do relato | ver fim do relato |

Serialização de visitante: `serializeLessons(false)` devolve 7 aulas na ordem `corretora, acoes, comprar-acoes, inflacao, ciclos, fundamentalista, preco-teto`. Só `acoes` vem com `locked: false`. Nenhuma chave de exercício vaza. Confirmado também pelo teste de `tests/learning.test.mjs`.

## Suítes que NÃO rodaram aqui (sem MySQL nem Docker)

Esta máquina não tem MySQL nem Docker. Estas suítes só rodam na CI da PR:

- `tests/integration.test.mjs`: **editado** (import, visitante em 601-609, trancamento em 654). Conferido por `node --check` e leitura.
- `tests/notifications.integration.mjs`, `tests/notifications.e2e.mjs`, `tests/notifications.backup.mjs`, `tests/backup.mjs`: **não editados**. Conferidos por leitura: usam ids explícitos (`courseId`, `lessonId`) e nenhum depende da posição da aula. `notifications.js:189` usa `course.chapterIds[0]`, que para `primeiros-passos` passou a ser `corretora`, como esperado.
- `tests/browser*.mjs` e `tests/accessibility.browser.mjs`: são do Pincel.
- `tests/production-smoke.mjs`: editado, **nunca executado**. Não roda no `monitor.yml` (o monitor só faz `curl` em `/`, `/ranking`, `/api/health` e `/api/rankings/public`). `test:production` é manual. Este teste só passa em produção **depois** da publicação.

## Pontos que dependem da ordem (além dos listados no brief)

- `tests/browser-experience.mjs` usa `lessons[0]` e `lessons[1]` (linhas 163, 170, 227, 390, 401, 414, 470). Com a ordem nova, `lessons[0]` é `corretora`, e a aula aberta é `acoes`. **É arquivo do Pincel** e não foi tocado. Precisa ser conferido por ele antes da publicação.
- `src/pages/Aprender.tsx` usa `lessonIds[0]` como fallback quando a URL não traz aula válida. Com a ordem nova, esse fallback é `corretora`, que está trancada para visitante. Isso é da interface (Pincel), e vale conferir se o fallback deve ser `openLessonId`.

## Verificação de higiene do relato

Feita sobre este arquivo: sem caminho absoluto, sem o nome de usuário do Windows e sem a palavra proibida pela política de escrita do repositório.

## Próximo passo sugerido

1. Pincel: corrigir o erro de lint em `src/pages/Aprender.tsx:203` e conferir `tests/browser-experience.mjs` (`lessons[0]`/`lessons[1]`) e o fallback de `Aprender.tsx`.
2. Revisar o diff de `server/learning-content.js` (movimento de bloco e constante).
3. Rodar na CI da PR: `integration.test.mjs`, `notifications.*`, `backup.mjs` e o browser.
4. `production-smoke.mjs` só depois da publicação, manualmente.
