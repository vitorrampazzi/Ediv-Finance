# Relato: ordem cronológica das aulas, aula aberta e aviso (interface, 24/11/2026)

Responsável: Frontend (Pincel). Brief 2b. Worktree `aulas-ordem-2026-11-24` (projeto em `evorix-finance/`), branch com o sufixo `aulas-ordem-2026-11-24` (prefixo do dono omitido), base `bedcb5f`. Sem commit, sem push, sem `harness claim`, sem edição em `docs/harness/state.json`. Pasta principal intocada.

**Status: passos 1 a 9 concluídos.** Suítes `test:browser` (browser.mjs, browser-experience.mjs, accessibility.browser.mjs) não executadas: precisam de MySQL (ver Pendências).

## Arquivos alterados (interface)

- `evorix-finance/src/lib/learningCatalog.ts`: `corretora` vem antes de `acoes` em `learningChapters`; `chapterIds` de `primeiros-passos` = `["corretora", "acoes", "comprar-acoes"]`; `"corretora"` antes de `"acoes"` no tipo `LessonId`; nova constante exportada `openLessonId: LessonId = "acoes"` (gêmea de `server/learning-content.js`, criada pelo Tijolo); descrição de `primeiros-passos` como autorizado: "Entenda como funciona a corretora, o que é ser sócio de uma empresa e como fazer a sua primeira compra." Veio da referência do script `igualdade-aulas.mjs --gerar-referencia`, mais a troca da descrição.
- `evorix-finance/src/pages/Aprender.tsx`:
  - importa `openLessonId`;
  - `const defaultLessonId = user ? lessonIds[0] : openLessonId;` (comentário curto), usado no último ramo de `selectedId`;
  - trava do visitante: `!user && lesson.id !== openLessonId` (antes, por posição);
  - fallbacks de `selectedLesson` e `selectedChapter` passam por `defaultLessonId` antes de `lessons[0]` / `learningChapters[0]`; `selectedCourse` como estava;
  - aviso no topo da aba Curso, primeiro filho do `section#learning-panel-curso`, com `rounded-xl border border-evo-border bg-evo-bgMain px-4 py-3 text-sm leading-6 text-evo-textSec`, sem `role`, sem botão;
  - textos da tabela 'primeira aula': linha ~406 "Aula aberta. Entre para fazer os testes e salvar seu progresso." (variação (a)); linha ~514 "Uma aula e o glossário são abertos. ...";
  - "Portal do Investidor, da CVM" (travessão da linha ~857).
- `evorix-finance/src/lib/visitorLearningProgress.ts`: importa `openLessonId` no lugar de `learningChapters`; lista aceita = `[openLessonId]`.
- `evorix-finance/src/components/LearningCourseCarousel.tsx`: importa `openLessonId`; o teste da aula aberta usa `course.chapterIds.includes(openLessonId)`; rótulo "Aula aberta" (era "Primeira aula aberta").
- Travessões (6 trocas da lista do passo 5): `index.html` (alt de `og:image:alt`), `src/components/RankingFundamentals.tsx` (DRE entre parênteses), `src/components/ResearchRankingTable.tsx` (duas linhas, entre parênteses), `src/lib/priceSeries.ts` (dois-pontos), `src/pages/Aprender.tsx` (linha 857). Em `tests/price-series-ui.test.mjs`, as duas expectativas do `markerTitle` ganham dois-pontos.
- `evorix-finance/site-pages.mjs`: `/aprender` com `updated: "2026-11-24"`.
- Tabela 'primeira aula' (autorizada pelo Orquestrador, com as variações (b), (c), (d)):
  - `src/components/home/AccountHomeContent.tsx`: "Conheça o ranking e a aula aberta enquanto..."; "Começar pela aula aberta"; "Conta gratuita · Uma aula aberta."
  - `src/components/home/PublicHome.tsx`: "Começar pela aula aberta"; "Conta gratuita · Uma aula aberta."; "Ou pela aula aberta." (variação (d))
  - `src/components/home/PublicQuestions.tsx`: "Uma das aulas é aberta." (variação (b))
  - `src/components/home/TeachingJourney.tsx`: `action: "Abrir a aula aberta"` (variação (c); `content: "first_lesson"` do GA4 não mudou)
  - `src/pages/auth/RegisterPage.tsx`: "Explorar a aula aberta"
  - `public/llms.txt`: "apresentação dos cursos e uma aula aberta."
- Testes de navegador (editados por leitura; não executados aqui):
  - `tests/accessibility.browser.mjs`: importa `openLessonId` de `../server/learning-content.js`; o mock do visitante abre a aula de `id === openLessonId` (antes, a de posição 0).
  - `tests/browser-experience.mjs`: importa `openLessonId`; criadas `lessonById` e `openLesson`. Visitante e `#acoes`/`?aula=acoes` usam `openLesson` (linhas 163, 170 com `lessonById("corretora")`, 227, 401, 414, 493). Título do teste da visita renomeado para "Visitante lê a aula aberta e o catálogo bloqueado, sem testes públicos". O teste da playlist no celular foi invertido: abre `?aula=corretora#sala-de-aula`, clica `corretora`, `ArrowRight` leva a `aula=acoes` (foco em `acoes`), `goBack` volta a `corretora`. O trecho do minicurso Inflação e `/aula=inflacao/` ficou.
- `evorix-finance/docs/harness/relatos/aulas-ordem-interface-2026-11-24.md`: este arquivo.

Fora do worktree, na pasta de briefs: `scripts/igualdade-aulas.mjs` (ver abaixo). `scripts/matriz-ordem.mjs` não precisou de ajuste: não confere a descrição de `primeiros-passos` (grep sem resultado).

Não tocados: `server/**`, `tests/learning.test.mjs`, `tests/integration.test.mjs`, `tests/production-smoke.mjs` (Tijolo); `LearningJourney.tsx`, `LearningVideo.tsx`, `LearningPlaylist.tsx`, `learning-workspace.css`, `src/entry-server.tsx`, `scripts/prerender.mjs`, `visitor-learning-progress.mjs`; `docs/harness/state.json`; `package*.json`.

## Ajuste no script de igualdade (pasta de briefs, fora do repositório)

Por autorização do Orquestrador, a checagem de "descrição como na base" em `scripts/igualdade-aulas.mjs` passou a aceitar, para `primeiros-passos`, a descrição nova (constante `DESCRICAO_NOVA` no topo do arquivo). O original ficou em `igualdade-aulas.mjs.bak-antes-descricao`. Nenhuma outra checagem mudou.

## Resultados

| Verificação | Resultado |
|---|---|
| `git rev-parse --short HEAD` (início) | `bedcb5f` |
| `git grep "—" -- src index.html site-pages.mjs` (início) | 16 |
| `igualdade-aulas.mjs --so-catalogo` (após o ajuste de descrição) | `Resumo: 25 passam, 0 falham, de 25.` |
| `igualdade-aulas.mjs` completa (com o servidor do Tijolo no worktree) | `Aulas iguais à base: 7 de 7`; `Resumo: 60 passam, 0 falham, de 60.` |
| `npm run lint` | código 0 |
| `npx tsc -p tsconfig.app.json --noEmit` | código 0 |
| `npx eslint tests/browser-experience.mjs tests/accessibility.browser.mjs tests/price-series-ui.test.mjs` | código 0 |
| `node --check` nos 3 testes | código 0 |
| `npm run build` | código 0; HTML público para 8 rotas |
| `dist/aprender/index.html`: aviso | 1 |
| `dist/aprender/index.html`: "Ações: vantagens e riscos" | 4 |
| `dist/aprender/index.html`: "Carregar vídeo" | 1 |
| `dist/aprender/index.html`: `<iframe` / `youtube` | 0 / 0 |
| `npm test` | 318 de 318 (0 falhas) |
| `node tests/seo.dist.mjs` | 9 de 9 |
| `npm run test:public-home` | código 0; 10 etapas PASS |
| `git grep "—" -- src index.html site-pages.mjs` (fim) | 10 marcadores, só os previstos (`RankingHighlights.tsx` 26, 38, 47, 62, 66; `Admin.tsx` 67, 390; `Configuracoes.tsx` 281; `IncomeRanking.tsx` 633; `Perfil.tsx` 82) |
| `git grep "lessons\[0\]\|lessons\[1\]"` nos dois testes | `browser-experience.mjs` 392 (título após "Tentar novamente", membro sem hash: corretora, correto) e 472 (`goBack` do membro para `corretora`, correto). Nenhuma outra |
| `git grep -i "primeira aula" -- src public` | só `LearningJourney.tsx:90` ("Começar primeira aula") e `Perfil.tsx:124` ("Começar a primeira aula"), como o brief manda manter |
| Textos proibidos ("tempo real", "com atraso") nas linhas adicionadas do `git diff` | nenhum no código. Uma ocorrência em `docs/RANKING-PUBLICO.md` (linha fantasma, ver abaixo), que já vinha modificado e não foi tocado |
| Matriz corrigida (`matriz-ordem.mjs`, `API_DELAY_MS=600`, porta 4194) | **422 de 422**, 0 FALHA (referência da Pauta: 422/422) |
| Matriz controle (`CONTROL=1`, base `bedcb5f`, porta 4195) | **147 de 147**, 0 FALHA (referência: 147/147) |
| `test:browser` (browser.mjs, browser-experience.mjs, accessibility.browser.mjs) | **não executado (sem MySQL)**. Editado e conferido por leitura e `node --check`/eslint |

### CLS da carga (sem interação)

| Largura | Corrigido | Controle |
|---|---|---|
| 320 px | 0,0204 | 0,0205 |
| 768 px | 0,0359 | 0,0360 |
| 1280 px | 0,0267 | 0,0268 |
| 1920 px | 0,0119 | 0,0119 |

Igual ao controle dentro de 0,0001 em todas as larguras, o mesmo que a referência da Pauta (0,0204/0,0359/0,0267/0,0119 contra 0,0205/0,0360/0,0268/0,0119). O corrigido não piorou o layout.

### Imagens lidas (`ordem-qa\fix\`)

- `V320-claro-1-antes-do-clique.png`: aviso "Os vídeos seguem a ordem do curso. Algumas falas citam aulas que ainda vão entrar no site." em caixa discreta, sem cor de alerta, legível, sem sobrepor nada. Primeiro card "Aula aberta", "Comece por aqui". Sem rolagem horizontal da página (conferido pela matriz).
- `V1280-claro-1-antes-do-clique.png`: aviso em faixa full-width sob o texto "Uma aula e o glossário são abertos...", legível e alinhado. Card "Aula aberta" com "Primeiros passos na bolsa" (descrição nova), card "Entre para acessar" em "Inflação, juros e ciclos". Layout sem sobreposição.
- `V320-escuro-1-antes-do-clique.png`: aviso legível no tema escuro, mesmo contraste do texto secundário. Sem sobreposição.
- `M1280-claro-6-final.png` (membro, página inteira): "Sua próxima aula" = "O que é uma corretora de investimentos" (corretora primeiro); lista "Aula 1 de 3" com corretora em "Aula aberta" e "Ações" e "Como comprar ações" depois; aviso visível no topo da aba Curso; "Glossário" no rodapé; "Próxima aula: Ações: vantagens e riscos" ao concluir. Sem texto cortado.
- `M320-claro-6-final.png` (membro, 320 px): aviso com 3 linhas, sem corte; a barra de cabeçalho fixa aparece sobreposta no meio da captura de página inteira. É artefato de captura (mesmo comportamento do controle), não efeito da mudança.

Imagens ficam fora do repositório, em `ordem-qa\`.

## Como ficou a aula inicial

- **Visitante** (sem conta): `/aprender` sem `?aula=`, sem hash, ou com aula desconhecida (`?aula=ranking`, `#risco`, `#desconhecida`) cai em `acoes` (`openLessonId`). As demais aulas aparecem trancadas, com "Requer conta" e o convite ao clicar.
- **Quem tem conta**: começa pela primeira da ordem (`corretora`) e mantém o "continuar". Com `?aula=` ou hash válido, abre a aula pedida.

## Efeito no GA4

`lesson_position` de `corretora` passa de 2 para 1, e o de `acoes` de 1 para 2. O evento `first_lesson` do `TeachingJourney` permanece com o mesmo nome; só a `action` mudou para "Abrir a aula aberta".

## `LearningJourney.tsx` (não muda, conferido por leitura)

O componente só aparece para quem tem conta. O rótulo "Começar primeira aula" (linha 90) é escolhido pela trilha com `finished` e `allFinished`, e a aula escolhida ("primeira aula aberta e não concluída") já segue a ordem nova: com a trilha sem progresso, é `corretora`. O fallback `lessons[0]` só vale com a trilha toda concluída, e então também é `corretora`. Por isso o arquivo não foi alterado.

## Aviso no HTML pré-renderizado

O aviso está fora do ramo `content && !authLoading && user`, dentro da seção da aba Curso. Por isso entra no HTML pré-renderizado (`dist/aprender/index.html`): aparece 1 vez, sem `role` de alerta e sem botão.

## Pendências

- Suítes `test:browser` (browser.mjs, browser-experience.mjs, accessibility.browser.mjs): não executadas aqui, precisam de MySQL. Rodam na CI da PR.
- Linha fantasma `docs/RANKING-PUBLICO.md` (já modificada antes deste trabalho): contém "cotações em tempo real" numa frase de limite do projeto. Não foi tocada, conforme o brief.
- Linhas fantasma `docs/FIGMA-MAKE-INTEGRACAO.md` e `docs/RANKING-PUBLICO.md` seguem no `git status`; não foram tocadas.
- Servidores 4194 e 4195 parados no fim; confirmado que nenhum processo ficou escutando nessas portas.
