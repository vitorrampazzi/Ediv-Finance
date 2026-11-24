# Relato: catálogo do front com 11 aulas, 5 cursos e 7 vídeos (23/11/2026)

Responsável: Frontend (Pincel). Brief 2b/6. Execução até o passo 6. O passo 7 (telas) fica para a próxima rodada, depois do relato do Tijolo sobre o servidor.

Worktree: worktree separado. Branch `aulas-videos-2026-11-23` (do dono), HEAD `f4ae72e`. Sem commit, sem push, sem deploy. Sem claim no harness (decisão do brief). Nada em `docs/harness/state.json`.

## Arquivos alterados por este brief

1. `src/lib/learningCatalog.ts`: gerado por `monta-catalogo.mjs`. Mudou só `LessonId`, `learningChapters` e `learningCourses`. `approvedVideoEmbed` e os comentários estão intactos (1 ocorrência no diff, na linha de referência).
2. `tests/browser-experience.mjs`: 11 linhas trocadas (lista abaixo).
3. `site-pages.mjs` (ajuste extra do Orquestrador): entrada `/aprender`, `updated` de `2026-10-27` para `2026-11-23`, e `description` nova (texto exato pedido). `title` e outras rotas não foram tocados.
4. `docs/harness/relatos/aulas-videos-interface-2026-11-23.md`: este relato (novo).

Arquivos que aparecem modificados no `git status` e não são deste brief: `server/learning-content.js` e `tests/learning.test.mjs` (Tijolo, em andamento); `docs/FIGMA-MAKE-INTEGRACAO.md` e `docs/RANKING-PUBLICO.md` (diferença de fim de linha que já existia no repositório; não foram tocados nem adicionados). `src/pages/Aprender.tsx` e `src/components/LearningVideo.tsx` não foram alterados.

### Catálogo: ordem resultante

- Aulas (11, nesta ordem): `acoes` (3 min, vídeo `opr1WI9KnX8`), `corretora` (2 min, `I3ns4SmiCHg`), `comprar-acoes` (3 min, `iyGSotDRekU`), `dividendos` (8 min, sem vídeo), `carteira` (8 min, sem vídeo), `inflacao` (3 min, `lgTWQVok9lg`), `ciclos` (2 min, `DfFnkAXHd6o`), `fundamentalista` (3 min, `mLL51LnRMw8`), `preco-teto` (3 min, `o7UuO2uPP1I`), `ranking` (6 min, sem vídeo), `risco` (7 min, sem vídeo).
- Cursos (5): `primeiros-passos` (`acoes`, `corretora`, `comprar-acoes`), `dividendos` (`dividendos`, `carteira`), `economia` (`inflacao`, `ciclos`), `analise` (`fundamentalista`, `preco-teto`), `pesquisa` (`ranking`, `risco`).
- Os 7 `videoEmbedUrl` estão no formato `https://www.youtube-nocookie.com/embed/<id>`.
- Os `readingMinutes` das aulas novas batem com a decisão do Orquestrador.

### Testes de navegador: 11 linhas

| Linha | Antes | Depois |
|---|---|---|
| 161 | `/aprender#ranking` | `/aprender#acoes` |
| 165 | `data-playlist-item="risco"` | `data-playlist-item="corretora"` |
| 217 | `/aprender#ranking` | `/aprender#acoes` |
| 398 | `/app/aprender#ranking` | `/app/aprender#acoes` |
| 404 | `progress/ranking` | `progress/acoes` |
| 423 | `progress/ranking` | `progress/acoes` |
| 456 | `aula=ranking` | `aula=acoes` |
| 457 | `data-playlist-item="ranking"` | `data-playlist-item="acoes"` |
| 461 | `/aula=risco/` | `/aula=corretora/` |
| 462 | `data-playlist-item="risco"` | `data-playlist-item="corretora"` |
| 512 | `/app/aprender#ranking` | `/app/aprender#acoes` |

Por que o teste continua coerente com a nova ordem. A fonte de `lessons` no teste é `server/learning-content.js` (não o catálogo). No servidor atual, `lessons[0]` é `acoes` e `lessons[1]` é `corretora`. O curso "Primeiros passos" vem com `acoes`, `corretora`, `comprar-acoes`; o próximo curso, "Da empresa ao dividendo", começa em `dividendos`.

- 161-171: o visitante abre `acoes`, clica em `corretora` (bloqueada para visitante) e não vê o texto de `lessons[1]`. Continua certo, porque só o primeiro capítulo é liberado para visitante.
- 217-230: o visitante abre `acoes` e a aba Testes pede login; as opções de `lessons[0]` não aparecem. Continua certo.
- 389-425: "Tentar novamente", resposta errada e falha simulada ao salvar usam `lessons[0]` (`acoes`), e a rota de progresso mockada agora é `progress/acoes`, que é o ID real da aula. Continua certo.
- 452-480: no celular, a seta para a direita sai de `acoes` para `corretora`; "Voltar" restaura `acoes`; o botão "Abrir minicurso: Da empresa ao dividendo" leva a `aula=dividendos`. Continua certo.
- 508-525: sessão expirada ao responder `lessons[0]`, que agora é `acoes`. Mesma lógica. Continua certo.

## Resultado dos critérios e passos

| Item | Resultado |
|---|---|
| Passo 1: worktree limpo, branch e HEAD | Passou (branch `aulas-videos-2026-11-23` do dono, HEAD `f4ae72e`; só as duas linhas fantasmas acima) |
| Passo 2: ferramenta do catálogo, rodada uma vez | Passou: `OK: 11 capítulos e 5 cursos escritos` |
| Comparador `--only catalog` | Passou: `Resumo: 50 passam, 0 falham, de 50 verificações` |
| `git diff -- src/lib/learningCatalog.ts` só com as 3 áreas | Passou (hunks em `LessonId`, `learningChapters` e `learningCourses`; `approvedVideoEmbed` intacto) |
| Passo 3: 11 linhas do teste | Passou (diff acima). `node --check tests/browser-experience.mjs`: código 0. `npx eslint tests/browser-experience.mjs`: código 0. |
| Suíte de navegador com banco | Não executada aqui (precisa de MySQL). Roda na CI da PR. |
| Passo 4: IDs fixos em `src` | Ver respostas abaixo |
| Passo 5: `npm run lint` | Passou (código 0) |
| Passo 5: `npm run build` (inclui `tsc -b`, pré-render e SEO) | Passou (código 0; HTML público gerado para 8 rotas) |
| Passo 6: `npm run test:public-home` | Passou: código 0. Cenários: HTML pré-renderizado, desktop, desktop-baixo, tablet, mobile, mobile-320, mobile-320-baixo, mobile-paisagem, desktop-reduced, mobile-reduced (10 de 10). |
| Ajuste extra: `site-pages.mjs` (`/aprender`) | Feito |
| SEO: `node --test tests/seo.dist.mjs` | Passou: 9 de 9. Não está em nenhum script do `package.json`; rodei direto, depois do build. |
| `npm test` | Passou: 317 de 317 (era 316 na rodada anterior; o aumento vem de `tests/learning.test.mjs`, que é do Tijolo) |
| Meta `/aprender` pré-renderizada | Confirmada em `dist/aprender/index.html`: a description nova aparece |

Observação sobre o `desktop-reduced`: na rodada anterior, esse cenário falhou com diferença de pixels; nesta rodada passou. Não mexi no teste nem na comparação. Isso confirma que a falha é intermitente, mas a causa original continua não provada.

## Respostas aos pontos do brief

**(a) Algum ID fixo restante no `src`?** Não encontrei ID de aula fixo fora do catálogo. A busca achou `ranking` e `carteira` como rotas (`src/App.tsx`), `ranking` em rótulos e rotas de outros temas (`OrbitCoins`, `HomeAreaCards`, tour guiado e `analytics.ts`), e `dividendos` em outros componentes (`StockMake`, `supportHelp`). Nenhum deles é um ID de aula. Não mudei nada.

**(b) O que acontece com o progresso de visitante antigo?** `visitor-learning-progress.mjs` filtra os IDs salvos em `ediv-learning-v1` pela lista permitida, que agora começa em `acoes` (`learningChapters[0]`). Antes desta mudança, a primeira aula do visitante era `ranking`. Um visitante que tinha `ranking` salvo perde esse progresso ao carregar: o ID é ignorado e não conta como concluído. O valor só some do armazenamento no próximo salvamento. Não mudei nada; é um efeito a ser comunicado.

**(c) Os rótulos estão coerentes com vídeo?** Sim, com ressalva de texto:
- A playlist mostra "Leitura disponível" para aulas liberadas e não concluídas, com vídeo ou sem. É coerente, porque a aula tem texto. O vídeo aparece à parte, em "Vídeo disponível" ou "Vídeo em preparação".
- "Leitura estimada · N min" usa só o tempo de leitura. Não inclui o vídeo. O rótulo diz "leitura", então está correto.
- No cartão do curso, "N min de leitura estimada" soma os `readingMinutes`, e "N vídeos disponíveis" conta os embeds aprovados. Ambos são calculados, e a leitura não é apresentada como duração do vídeo.
- Não vi isso na tela (passo 7 não rodou nesta rodada).

**(d) Efeito no GA4 (`lesson_position`)?** A posição é o índice na lista. `ranking` passa de 1 para 10, e `risco` de 2 para 11. `analytics-policy.mjs` aceita até 30, então 11 cabe. Não mudei nada; é um efeito a ser comunicado ao Orquestrador.

## Não rodou nesta rodada

- Passo 7 (telas e matriz `matriz-aulas.mjs`, com capturas `V320-claro-1`, `V768-claro-1`, `V1280-claro-1`, `V320-escuro-1`, `V1280-escuro-2`, `M1280-claro-5`): não executado, por decisão do Orquestrador. Depende do relato do Tijolo.
- Suíte de navegador com banco: não executada aqui; roda na CI da PR.
- Verificação visual do carrossel com 5 cursos e 11 aulas, da barra "N de 11 exercícios", do contador em `GettingStarted` ("5 cursos · 11 aulas") e de `Perfil.tsx`: não feita. Precisa do passo 7.
- Prettier: não executado. O projeto não tem prettier como dependência, e não instalei nada.

## Limites

- A lista de `lessons` do teste vem do servidor do Tijolo. Se o servidor mudar a ordem, os testes da linha 161-171 e os demais dependem dessa ordem; a checagem acima foi feita contra o arquivo atual.
- O servidor atual ainda contém `ranking` e `risco` como aulas (ambos aparecem no arquivo, em posições 10 e 11). A pré-condição do passo 7 (`acoes` = 1) foi atendida; a conferência completa do servidor fica com o Tijolo.
- Nenhum arquivo de vídeo, segredo ou linha de autoria de IA foi adicionado ao diff.

## Próximo passo

Quando o Orquestrador liberar, rodar o passo 7 (matriz local nos dois builds, com leitura das capturas listadas acima) e incluir o resultado neste relato. Decidir sobre os dois efeitos informados acima: o progresso antigo do visitante em `ranking` e a mudança de posição no GA4.

## Atualização: telas (passos 7 e 8)

Esta seção atualiza os itens "Não rodou nesta rodada" acima: passos 7 e 8 foram executados depois do relato do Tijolo.

Pré-condição e build:
- `server/learning-content.js` do Tijolo com a aula `acoes` (contagem 1). Build refeito depois do servidor pronto.
- Lint: passou (código 0). Build: passou (código 0). `tests/learning.test.mjs`: 2 de 2. Comparador `--only catalog`: 50 passam, 0 falham.

Servidores (locais, 127.0.0.1): corrigido na porta 4192 e controle na porta 4193. Os dois foram parados ao final; as portas estão livres.

Matriz local (`matriz-aulas.mjs`):
- Corrigido: 166 passam, 0 falham, de 166.
- Controle (`CONTROL=1`): 108 passam, 0 falham, de 108.
- Capturas em pasta de saída de QA fora do repositório.

Leitura das capturas pedidas:
- `V320-claro-1` (antes do clique): cabeçalho, título, carrossel com o cartão "Primeiros passos na bolsa" marcado como "Primeira aula aberta". Nenhum texto cortado nos elementos principais. As abas do topo ("Laboratório de conceitos" etc.) ficam cortadas à direita: é a faixa de abas com rolagem interna, que já existia no controle. A página não tem rolagem horizontal.
- `V768-claro-1`: dois cartões de curso. O primeiro mostra "3 vídeos disponíveis". O segundo, "Da empresa ao dividendo", mostra "Vídeos em preparação. Texto e exercícios já disponíveis", que é o texto correto para um curso sem vídeo. Sem sobreposição.
- `V1280-claro-1`: mesma leitura, com os dois cartões lado a lado. Sem problema visível.
- `V320-escuro-1`: tema escuro legível, mesma faixa de abas cortada que no claro. Sem problema visível.
- `V1280-escuro-2` (depois do clique): aula 1 de 3 do primeiro curso, lista com "01" aberta e "02" e "03" com "Requer conta". Na captura, o player ainda aparece como "Carregando player...". A matriz confirmou que o iframe foi criado com a URL do YouTube (`youtube-nocookie.com/embed/opr1WI9KnX8`); o host externo é bloqueado no teste, e por isso o player não carrega na captura. Não é defeito de layout.
- `M1280-claro-5` (resposta certa): "1 de 11 exercícios concluídos", exercício "Como comprar ações: lotes, fracionário e eventos", feedback "Correto!". Sem problema visível.

Comparação com o controle: a captura de página inteira do controle (`V320-claro-3`, versão antiga com 2 aulas) usa o mesmo desenho de cartões, barra e rodapé. O design não mudou; só o conteúdo.

Efeitos conhecidos (aceitos pelo Orquestrador; registrados aqui):
- Progresso de visitante salvo em `ranking` em `ediv-learning-v1` é ignorado ao carregar, porque a lista permitida agora começa em `acoes`.
- GA4 `lesson_position` deslocado: `ranking` passa da posição 1 para 10, e `risco` da 2 para 11.

Não verificado nesta rodada:
- Celular real e Samsung Internet.
- Suíte de navegador com banco (roda na CI da PR).
- Revisão do diff pela Lupa, que roda em paralelo; nenhum código foi alterado depois do pedido dela.

Commit, push, deploy e claim: nenhum foi feito.
