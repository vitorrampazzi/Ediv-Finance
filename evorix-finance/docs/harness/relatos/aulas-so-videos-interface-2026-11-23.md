# Relato: aulas só com vídeo, interface e testes (24/11/2026)

Responsável: Frontend (Pincel). Worktree: `so-videos-2026-11-23`, dentro da pasta de worktrees do repositório (projeto em `evorix-finance/`). Branch com o sufixo `aulas-so-videos-2026-11-23` (prefixo do dono omitido), base `1e13fdb`. Sem commit, sem push, sem `harness claim`.

**Status: passos 1 a 8 concluídos,** com `npm run test:public-home` e as suítes de navegador com MySQL não executados (ver tabela). Passo 7 (build e matriz) e passo 8 (telas) feitos após o aviso do Orquestrador, com o relato do Tijolo (`docs/harness/relatos/aulas-so-videos-servidor-2026-11-23.md`) já no worktree.

## Arquivos alterados

- `evorix-finance/src/lib/learningCatalog.ts`: só remoções, com 1 inserção (o `;` que passa para o último membro do `LessonId`). Veio da referência gerada pelo script `igualdade-aulas.mjs`. Restam 7 aulas e 3 cursos.
- `evorix-finance/src/pages/Aprender.tsx`:
  - Abas: ficam só Curso e Testes.
  - A função `tabForHash` saiu; a aba inicial é `"curso"` nos dois lugares em que era usada. `#laboratorio`, `#termos` e `#learning-glossary-title` abrem Curso.
  - Saíram os painéis Laboratório e Termos (com a busca), o `<LearningPractice />`, os imports de `LearningPractice` e `MobileDisclosure`, os estados `search` e `searchTracked`, e as variáveis `glossary` e `matchingTerms`. A leitura de `content.glossary` no tipo `LearningData` foi mantida.
  - Na última aula, o link "Praticar no laboratório" saiu e o ramo passou a ser `null`. "Aula anterior" continua.
  - Novo link "Glossário" para `/glossario` no rodapé, ao lado de "Abrir pesquisas do ranking", com o estilo do link que saiu.
- `evorix-finance/src/components/LearningPractice.tsx`: apagado. Antes, `grep` mostrou uso só em `Aprender.tsx` e no próprio arquivo.
- `evorix-finance/src/pages/IncomeRanking.tsx`: `#ranking` vira `#preco-teto`.
- `evorix-finance/src/pages/StockResearch.tsx`: `#dividendos` vira `#comprar-acoes`; `#ranking` vira `#preco-teto` (destaque); "Continuar nos minicursos" vai para `learningPath` sem âncora.
- `evorix-finance/src/components/RankingAccessLanding.tsx`: `/aprender#ranking` vira `/aprender#preco-teto`.
- `evorix-finance/src/lib/supportHelp.ts`: `#ranking` vira `#preco-teto`; `#dividendos` vira `#comprar-acoes`; no item `dividendo-jcp`, "O laboratório de conceitos traz exemplos..." vira "As aulas trazem exemplos...". Troca aprovada pelo Orquestrador.
- `evorix-finance/src/components/EdivAssistant.tsx`: `#risco` vira `#acoes`; `#dividendos` vira `#comprar-acoes`; `#ranking` vira `#preco-teto`.
- `evorix-finance/tests/browser.mjs`: `#risco` vira `#corretora` (2 ocorrências). A resposta do exercício passa a ser "Executar a sua ordem na bolsa e registrar as ações em seu nome", que é a alternativa de índice 2 da aula `corretora` em `server/learning-content.js` (lido, não alterado).
- `evorix-finance/tests/browser-experience.mjs`:
  - Removido o teste "Laboratório calcula DY, payout e potencial e rejeita base zero".
  - No teste da playlist, o botão vira "Abrir minicurso: Inflação, juros e ciclos" e a URL esperada vira `/aula=inflacao/`.

Não tocados: `server/**`, `tests/learning.test.mjs`, `tests/integration.test.mjs`, `tests/notifications.*`, `tests/backup.mjs` (são do Tijolo); `LearningVideo.tsx`, `LearningPlaylist`, `LearningCourseCarousel`, `LearningJourney`, `LearningQuiz`; `site-pages.mjs`; `docs/harness/state.json`; `package*.json`. A pasta principal do repositório não foi tocada. Sem `harness claim`.

## Resultados dos passos 1 a 6

| Verificação | Resultado |
|---|---|
| `git status --short` no início | vazio |
| `grep LearningPractice` antes de apagar | só `Aprender.tsx` e o próprio arquivo; um relato antigo em `docs/` cita o nome e não foi alterado (histórico) |
| `igualdade-aulas.mjs --base-ref 1e13fdb` | `Aulas iguais à base: 7 de 7`; `Resumo: 57 passam, 0 falham, de 57` |
| `git diff --stat -- src/lib/learningCatalog.ts` | 1 inserção, 45 remoções |
| `grep` de aulas e abas removidas em `src/` | 0 ocorrências |
| `npm run lint` | código 0 |
| `npx eslint tests/browser.mjs tests/browser-experience.mjs` | código 0 |
| `node --check` nos dois arquivos | código 0 |
| `npm test` | 317 de 317 |
| `npm run build` (passo 7) | código 0; HTML público gerado para 8 rotas |
| `dist/aprender/index.html` | "Ações: vantagens e riscos" 4; "Carregar vídeo" 1; "Laboratório de conceitos" 0; "Termos das aulas" 0; "Da empresa ao dividendo" 0; `<iframe` 0; `youtube` 0 |
| `node tests/seo.dist.mjs` | 9 de 9 |
| `npm run test:public-home` | não executado nesta rodada (suíte longa; não foi rodada no worktree) |
| Matriz corrigida | 355 de 355 |
| Matriz controle (`CONTROL=1`, base `1e13fdb`) | 133 de 133 |
| `test:browser` (browser.mjs e browser-experience.mjs) | não executados: precisam de MySQL |
| `test:browser` (browser.mjs e browser-experience.mjs) | não executados: precisam de MySQL |

## Conferências sobre o fluxo

- Teste da playlist: antes dele, o teste "Reiniciar exercícios pede confirmação; cancelar preserva e confirmar apaga" termina com `aria-valuenow` 0 (depois do reinício e do reload). Com progresso zero, `LearningCourseCarousel.tsx` usa `firstChapterId` = primeira aula do curso `economia` = `inflacao`, então a URL esperada é `/aula=inflacao/`.
- Última aula: a nova última aula da ordem é `preco-teto` (curso `analise`). Sem próxima aula nem próximo curso, nada aparece no lugar de "Praticar no laboratório"; "Aula anterior" continua visível.
- Link "Glossário": fica no rodapé, visível para visitante e para quem tem conta. Motivo: a frase "A primeira aula e o glossário são abertos", que foi mantida, só aparece para visitante, então um link ali não alcançaria quem tem conta.
- Avisos educativo e de dividendos não foram alterados.

## Telas (passo 8)

Matriz do corrigido e do controle, em 320, 768, 1280 e 1920 px, claro e escuro, com servidores em `127.0.0.1` (portas 4194 e 4195), parados no fim. As imagens ficam fora do repositório. CLS da carga (sem interação; informativo):

| Largura | Corrigido | Controle |
|---|---|---|
| 320 px | 0,0205 | 0,0205 |
| 768 px | 0,0360 | 0,0360 |
| 1280 px | 0,0268 | 0,0268 |
| 1920 px | 0,0119 | (não medido no controle) |

Imagens lidas (corrigido, claro e escuro; página inteira e capturas de aula):

- `V320-claro-3-pagina-inteira.png` e `V320-escuro-3-pagina-inteira.png`: 2 abas (Curso e Testes), 2 minicursos visíveis, aula "Ações" com convite de conta, "Glossário" no rodapé abaixo de "Abrir pesquisas do ranking", avisos educativo e de dividendos visíveis, sem texto cortado nem rolagem lateral. No meio da captura aparece o cabeçalho fixo sobreposto; o controle mostra o mesmo, então é artefato da captura, não da mudança.
- `V1280-claro-3-pagina-inteira.png` e `V1280-escuro-3-pagina-inteira.png`: layout em duas colunas da sala de aula preservado; "Glossário" alinhado à direita, na mesma linha do botão do ranking; sem sobreposição; tema escuro legível.
- Controle em 320 px (`V320-claro-3-pagina-inteira.png`): a aba "Laboratório de conceitos" corta na borda da tela. No corrigido, só as duas abas existem, sem corte.

Outros critérios da matriz (todos passaram nos dois lados, ver `tabela.md` na pasta de QA): sem rolagem horizontal em 320, 768 e 1280 px (`scrollW` = `clientW`); nenhum iframe antes do clique; após o clique, só `youtube-nocookie.com` (bloqueado no teste); aula bloqueada de `/aprender#preco-teto` mostra convite e não vaza o texto; `/aprender#laboratorio`, `#termos` e `#learning-glossary-title` abrem Curso; `/glossario` responde 200; sem erros de console.

Efeitos conhecidos: nenhum identificado nas telas desta rodada.

## Ajuste de rótulos (achado 2 da Revisão)

Os rótulos dos links de "interpretar" prometiam uma aula que não existe mais. Só o texto mudou; os destinos (`#preco-teto`, `#comprar-acoes`) ficaram como estão.

- `src/components/RankingAccessLanding.tsx`: "Como interpretar uma previsão" vira "Entender preço-teto e margem".
- `src/pages/StockResearch.tsx`: "Como interpretar a pesquisa" vira "Entender preço-teto e margem".
- `src/components/EdivAssistant.tsx`: "Interpretar uma previsão" vira "Entender o preço-teto".
- `src/pages/IncomeRanking.tsx`: o rótulo longo (desktop) vira "Entender preço-teto e margem" (ainda fala em entender o ranking por meio do preço-teto); o curto (celular) vira "Preço-teto e margem".
- `src/` e `tests/`: sem os textos antigos (grep dá 0). Em `scripts/matriz-so-videos.mjs` (fora do repositório) só o nome de um teste foi atualizado.

Resultados depois da troca:

| Verificação | Resultado |
|---|---|
| grep dos textos antigos em `src/` e `tests/` | 0 |
| `npm run lint` | código 0 |
| `npx eslint` e `node --check` nos dois testes | código 0 |
| `npm run build` | código 0 |
| `npm test` | 317 de 317 |
| `npm run test:public-home` | código 0; 10 etapas PASS (desktop, desktop-baixo, tablet, mobile, mobile-320, mobile-320-baixo, mobile-paisagem, desktop-reduced, mobile-reduced e HTML pré-renderizado) |
| Matriz corrigida | 355 de 355 (controle não rodou de novo: a mudança é só texto de link) |

## Pendências

- As suítes `test:browser` (browser.mjs e browser-experience.mjs) não foram executadas: precisam de MySQL.
- O script de igualdade (`igualdade-aulas.mjs`) passou com o relato do Tijolo já no worktree: 7 de 7 e 57 de 57.
