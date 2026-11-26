# Relato: resto do site no celular, só o que a auditoria provou (Brief 2b, Pincel)

Data: 2026-11-26. Branch: `mobile-cursos-2026-11-26`, base `fc56928`. Sem commit, sem texto novo de produto, sem mudança de números.

**Resumo:** Parte A aplicada (A1 a A8, A10, A11; A9 com decisão pendente; A12 sem correção, causa confirmada). Parte B aplicada (B1 a B6 e B8; B7 investigado, sem correção, por ser estrutural). Decisões do Orquestrador (26/11) aplicadas: A9 mantido, A12 aceito com medição no QA final, B8 autorizado (com `LiveQuote.tsx` e `data.ts`).

---

## Parte A

### Arquivos alterados (parte A)

- `evorix-finance/src/pages/Aprender.tsx`: A1 (bloco de fim de aula com conta).
- `evorix-finance/src/components/learning-workspace.css`: A2 (grade do cabeçalho dos minicursos abaixo de 640 px).
- `evorix-finance/src/components/company-logo.css`: A3 (seletor mais específico no fallback do logo).
- `evorix-finance/src/components/SiteChrome.tsx`: A4 (link da logo com 44 px no cabeçalho e no rodapé) e A5 ("Pular para o conteúdo" com 44 px).
- `evorix-finance/src/layouts/DashboardLayout.tsx`: A5 (`nav` sozinho vira `div`; link com 44 px).
- `evorix-finance/src/components/navigation-chrome.css`: A6 (selo "Nova", 12 px).
- `evorix-finance/src/components/AccountGate.tsx`: A7 (etiqueta "Conta gratuita", `text-xs`).
- `evorix-finance/src/components/home/public-home.css`: A7 (eyebrow da home, 12 px).
- `evorix-finance/src/components/home/teaching-journey.css`: A7 (legenda do diagrama, 12 px).
- `evorix-finance/src/components/RankingHighlights.tsx`: A7 (três rótulos de 11 px para 12 px).
- `evorix-finance/src/components/live-quote.css`: A7 (`.market-cell-sub`, 12 px).
- `evorix-finance/src/index.css`: A8 (regra de 16 px dos campos também em `(pointer: coarse)`; o bloco de 639 px continua igual).
- `evorix-finance/src/pages/Perfil.tsx`: A10 (trilho da barra com `bg-evo-border`).
- `evorix-finance/src/pages/auth/VerifyEmailPage.tsx`: A11 (link "Ir para entrar" com `min-h-11`).
- `evorix-finance/tests/accessibility.browser.mjs`: asserção nova do A9 (Enter, Tab para dentro do painel quando há item focável, Escape com foco no sino).
- `evorix-finance/docs/harness/relatos/mobile-cursos-aprender-2026-11-26.md`: só a linha dos prints, que tinha caminho absoluto com o nome do usuário. Trocada por texto sem caminho.

Não alterados nesta parte: `NotificationsMenu.tsx` (A9), `LearningCourseCarousel.tsx`, `LearningJourney.tsx`, `safety-margin.mjs`, API, banco, `site-pages.mjs`, `vercel.json`.

### Itens

**A1. Fim da aula com conta.**
- Causa: `.account-workspace footer a` (em `index.css`, abaixo de 640 px) dá `inline-flex` e `min-height: 44px` a todo link dentro do `footer`, inclusive o do parágrafo da CVM. Por isso a entrelinha ficava com 32 px.
- Correção: no link do parágrafo, `inline! min-h-0!`. Nos botões do bloco, `font-semibold` nos secundários (igual ao principal). No celular, o principal recebe `order-first` e `justify-between` (texto à esquerda, seta no fim). A partir de `sm` a ordem original volta. Espaço: `pt-5` saiu da `nav` (fica `mt-6`, 24 px), botões do grupo com `gap-3` (12 px), parágrafo com `mt-3`.
- Medida (320 e 360, claro): principal com largura total (288 e 328 px) e `order -9999`; gap de 24 px acima da `nav`; entrelinha do parágrafo de 21,1 px (1,625 de 13 px); link do parágrafo `inline`, sem altura mínima. `alvosMenor44` de `app-aprender-3ex`: 4 → 0 (o link do Portal é inline e fica na exceção do WCAG).

**A2. Cabeçalho dos minicursos.**
- Causa: `.ediv-learning-section-heading` é `flex-wrap`, e o grupo de setas (96 px) caía para uma linha própria abaixo da descrição.
- Correção: abaixo de 640 px, grade `minmax(0, 1fr) auto`. O bloco de título e descrição vira `display: contents`; título na coluna 1, setas na coluna 2 (mesma linha), descrição na linha de baixo ocupando a largura. Desktop inalterado. Só `LearningCourseCarousel.tsx` usa esta classe.
- Medida (320 e 360): título em y 863 (360: 839) e setas em y 854 (360: 830), 44×44 cada, centradas na mesma linha; descrição na linha 2 (y 912 em 320), largura total.

**A3. Fallback do logo da empresa.**
- Causa (confirmada no DOM): `.ph-ranking-company-link span span` (em `home/public-sections.css`) aplica `font: 0,8125rem` (13 px) e `color: var(--ediv-muted)` ao código dentro do logo. Com isso, o código passava da caixa nos cards da home e, no escuro, o texto claro (`rgb(188,198,205)`) sobre fundo branco reprovava no contraste. A regra `.company-logo-fallback` (9 px) perdia por especificidade.
- Correção: `.company-logo .company-logo-fallback` (`color: #25333b`, `font: 600 9px/1.1`, `white-space: nowrap`). Os tamanhos de `sm` (7 px) e `lg` (12 px) continuam por cima.
- Medida: contraste do fallback no escuro: 13,0:1 (antes, o texto claro reprovava). `TAEE11` cabe no `sm` (`scrollWidth` = `clientWidth`).
- **Limite:** sete letras largas (`ABCDEFG`) dão 42 px de texto numa caixa útil de 38 px; 2 px de cada lado ficam fora por `overflow: hidden`. Códigos reais têm até 6 caracteres. Não reduzi a fonte (o brief pede não ficar menor que hoje). Se quiser garantir sete letras largas, a saída é 8 px no `md`; decisão do Orquestrador.
- `axe` color-contrast do fallback: 2 (home), 3 (ranking) e 3 (mercado) nos escuros em 360 → 0.

**A4. Link da logo.** `min-h-11` nos links do cabeçalho e do rodapé (`SiteChrome.tsx`). Medida: 40×44 px no cabeçalho; altura do cabeçalho não mudou (64 px).

**A5. "Pular para o conteúdo".** `inline-flex min-h-11 items-center` nos dois links. Medida ao receber foco: 192×44 px, contorno sólido de 3 px. Nenhum teste usa o landmark "Atalho para o conteúdo" (grep em `tests`, `src` e `scripts`).

**A6. Selo "Nova".** `font-size: 0.7rem` → `0.75rem`. O script não gera notificação não lida; verificado pelo CSS.

**A7. Textos de 11 px.** `AccountGate` (`text-xs`); eyebrow da home e legenda do diagrama (`0.75rem`); três rótulos de `RankingHighlights` (`0.75rem`); `.market-cell-sub` (`0.75rem`). A linha "Conta gratuita · Uma aula aberta." não aparece como texto abaixo de 12 px na medida, então não foi mexida. `textoMenor12` nas páginas do item: 1 ou 2 → 0.

**A8. Campos a 768 px.** A regra de 16 px ficou no bloco de 639 px e ganhou um bloco `@media (pointer: coarse)` com o mesmo seletor. Desktop com mouse não muda. O script usa `hasTouch` sem `isMobile`, e ali `matchMedia("(pointer: coarse)")` deu verdadeiro (medido em `home`, `app-aprender-3ex` e `app-perfil`), então a medida pelo script vale. `camposMenor16` em 768: 1 a 3 por página → 0 nas oito páginas do item.

**A9. Foco volta ao sino. Sem correção de código; decisão pendente.**
- Com uma notificação simulada (cópia do script fora do repositório, build 2a), a sequência Enter, Tab, Escape funciona nos três tamanhos: Tab entra em "Marcar todas como lidas", Escape devolve o foco ao sino (`focoVoltouAoBotao: true`, `fechaComEscape: true`, em 320, 360 e 390).
- Com lista vazia (o fixture devolve `notifications: []`), o painel não tem nada focável. O Tab sai do menu, o `focusin` fecha o menu e o foco fica no botão da conta. Depois disso o Escape não tem o que fechar, e `focoVoltouAoBotao` dá `false` (320, 360 e 390). É o comportamento de um menu que fecha quando o foco sai.
- O código já devolve o foco ao sino no Escape (`NotificationsMenu.tsx`, linha 46). Clique fora não força o foco.
- Asserção acrescentada em `tests/accessibility.browser.mjs`: Enter, Tab para dentro do painel quando há item focável, Escape, `aria-expanded` falso e sino com foco. Com lista vazia, só o Escape é testado.
- **Decisão do Orquestrador (26/11): manter.** Com a lista vazia, o Tab leva ao próximo item da página, uma ordem lógica. A asserção nova com 1 item fica.

**A10. Trilho da barra do perfil.** `bg-evo-bgSec` → `bg-evo-border`. Contraste trilho/cartão: 1,70:1 no claro e 1,58:1 no escuro (meta: 1,5:1 ou mais).

**A11. "Ir para entrar".** `min-h-10` → `min-h-11`. `alvosMenor44` em `verificar`: 1 → 0 (320, 360, 390 e 768).

**A12. CLS de `/app/aprender` com conta. Causa confirmada, correção não aplicada (precisa de decisão).**
- Medido com `PerformanceObserver` de `layout-shift` e `sources` (script fora do repositório), 3 rodadas por caso, 360 e 390, claro:
  - Controle (base `fc56928`), `app-aprender-3ex`: 0,0622 (360) e 0,0649 (390). `app-aprender-0ex`: 0 ou 0,0649 conforme a rodada.
  - Estado do 2a, `app-aprender-3ex`: 0,0774 (360) e 0,0718 (390). `app-aprender-0ex`: 0 ou 0,0791.
- Fonte principal, nas três rodadas: `section#learning-panel-curso` (o painel de aulas). Sobe de `top 579` para `top 443` quando o bloco `role="status"` (entre as abas e o painel, com esqueleto `h-20`) é removido; depois cresce de 201 para 337 px (3ex) e de 265 para 401 px (0ex) quando o conteúdo chega.
- Fonte secundária, em 3ex: o carrossel (`section#cursos`) sai do fluxo enquanto carrega, e o cartão "Sua próxima aula" (`LearningJourney`, só com conta) entra depois.
- Por que aparece mais no 2a: o cabeçalho ficou mais baixo, então o bloco de carregamento começa mais alto na tela e entra mais área no quadro (como a Lupa supôs).
- Por que não corrigi: reservar altura só para o cartão não resolve, porque o bloco de carregamento continua no fluxo entre as abas e o painel. A solução com menor efeito é mover o bloco para dentro do painel e reservar a altura do cartão da trilha. Isso muda a estrutura de DOM e a posição do `role="status"`, então o brief manda parar.
- **Decisão do Orquestrador (26/11): não mudar o DOM.** Aceito o CLS de 0,077 (abaixo de 0,1), porque o controle oscila mais que a diferença (0 e 0,027 na mesma página). Pendência para o QA final: o Vigia mede 3 vezes por caso e o Orquestrador decide pela mediana.

### Portões (parte A)

| comando | resultado |
|---|---|
| `npm run lint` | passou (0 erros) |
| `npx tsc -b` | passou |
| `npm run build` | passou; 8 rotas pré-renderizadas |
| `npm test` (base e depois) | 318/318 e 318/318 |
| `node --test tests/seo.dist.mjs` | 9/9 |
| `npm run test:public-home` | 1ª rodada: falhou com `ERR_CONNECTION_REFUSED` na porta 4191 (o preview que o próprio teste sobe caiu no meio). 2ª rodada: passou. Instabilidade que o 2a já tinha registrado; não atribuída ao CSS. |
| `auditoria-mobile.mjs` antes (controle, 4195) e depois (4194) | ver tabela |

Comparação do script (antes → depois, parte A; 320 a 768):

| métrica | antes | depois |
|---|---|---|
| `alvosMenor44` (17 páginas) | 1 a 4 por página | 0; `app-aprender-3ex` 4 → 0; `app-perfil` 1 → 0 |
| `alvosMenor24` | 1 por página | 0 |
| `textoMenor12` | 1 a 2 por página | 0 nas páginas da parte A |
| `camposMenor16` (768) | 1 a 3 | 0 |
| `axe` sério ou crítico, 360 escuro | 2 a 3 (home, ranking, mercado) | 0 |
| `rolagemLateral` | não | não |
| CLS, 360 claro | `app-aprender-3ex` 0,0622 → 0,0774 (A12 não corrigido); `mercado` 0,5385 → 0,5461 (+0,0076); `aprender-testes` 0,0271 → 0,0296 (+0,0025) | |

Nota sobre CLS: no controle ele oscila entre rodadas (`app-aprender-0ex` deu 0 em duas de três).

---

## Parte B

### Arquivos alterados (parte B)

- `StockMake.tsx`: B1 (grade `minmax(0,1fr)_auto` na linha de métrica), B2 (h1 `1,75rem` no celular; logo acima do título abaixo de 640 px), B3 ("Não informado" do valor de mercado e do cabeçalho de preço, e do card de resumo), B5 (`ul`/`li` da lista de perguntas viram `div`, com `role="tablist"` e `role="presentation"`).
- `Charts.tsx`: B3 (lucro líquido, CAGR e P/L e média histórica com "Não informado" em estilo menor), B4 (calendário sem `overflow-x-auto` e sem `min-w-[420px]`; 12 colunas `minmax(0,1fr)`), B5 (meses com `role="img"`, mantendo o `aria-label`), B8 (10 e 11 px para `text-xs`).
- `HistoryCharts.tsx`: B8 (10 e 11 px para `text-xs`).
- `ui.tsx`: B6 (`InfoTip` com `relative`; seletor Anual/Mensal/5A/Máx e legenda com `max-sm:min-h-11`), B8 (rótulos de 11 e 10 px para `text-xs`; o `i` decorativo do `InfoTip`, `aria-hidden`, ficou em 10 px).
- `stock-make.css`: B1 (abaixo de 640 px, `fmk-exact` quebra linha com `overflow-wrap: anywhere`), B6 (pseudo-elemento de 44 px no `InfoTip` abaixo de 640 px, sem mudar o ícone).

- `stock-make/data.ts` (autorizado pelo Orquestrador): só `axisProps.tick.fontSize` de 11 para 12. Nada mais no arquivo.
- `LiveQuote.tsx` (autorizado): só os rótulos `heading` e `meta` da variante `research` (`text-[11px]` para `text-xs`; texto, data e hora não mudam).
`safety-margin.mjs`, API, banco e textos de aula não foram tocados.

### Itens

**B1. Rolagem lateral de 396 px.**
- Causa (confirmada): a linha de métrica usava `grid-cols-[1fr_auto]` (sem `minmax(0, 1fr)`) e a linha institucional tinha `dd.fmk-exact` com `white-space: nowrap`. O nome "Companhia de Telecomunicações e Infraestrutura do Brasil" tinha 376 px.
- Correção: `minmax(0, 1fr)` na grade. Abaixo de 640 px, `fmk-exact` com `white-space: normal` e `overflow-wrap: anywhere` (quebra em vez de reticências; o texto completo continua na tela).
- Medida: rolagem lateral SIM → não em 320, 360 e 390 (claro e escuro); `candidatosAFora` 1 → 0.

**B2. Título (h1).**
- Causa: `text-4xl` (36 px) ao lado da logo de 64 px, em 320 px; "Telecomunicações" quebrava no meio.
- Correção: h1 em `text-[1.75rem] sm:text-4xl md:text-5xl`; abaixo de 640 px o bloco da logo vira coluna (`max-sm:flex-col max-sm:items-start`), logo acima do título. A regra `.figma-stock .flex.items-center.gap-5` (em `stock-make.css`) continua valendo, porque a classe ficou.
- Medida (320, 360, 390): h1 com 28 px de fonte, nenhuma palavra quebrada no meio (checada por `Range`); logo com `top` 156 e h1 com `top` 232. Prints na pasta de capturas da auditoria (fora do repositório).

**B3. "Não informado" grande.**
- Causa: o texto "Não informado" herdava o tamanho do número grande (60, 36, 25 e 24 px).
- Correção: quando falta o valor, a classe passa a `text-base` ou `text-lg` (16 a 18 px), itálico e `text-fmk-dim`. O número presente continua com o tamanho original. Compara-se a string "Não informado" nos pontos em que o código não tem outra marca (`value()`, `pct()`); o texto e o cálculo não mudaram.
- Itens: valor de mercado (60 → 18 px, `StockMake.tsx`); "Lucro líquido estimado" (36 → 16 px, `Charts.tsx`); CAGR de lucros (36 → 16 px, `Charts.tsx`); "P/L e média histórica" (36 → 16 px, `Charts.tsx`); os quatro cards de resumo (25 → 16 px, `StockMake.tsx`, `Stat`); os três da faixa de preço (24 → 16 px, `StockMake.tsx`).
- **Nota:** os quatro cards de resumo e os três da faixa de preço não estavam na lista do brief, mas usam o mesmo padrão e estão no mesmo arquivo. Se o Orquestrador não quiser, reverter só esses sete pontos.
- Medida: nenhum "Não informado" acima de 18 px (14 a 18 px); página com dados presentes sem mudança de classe.

**B4. Calendário de proventos.**
- Causa: 12 colunas com `min-w-[420px]` dentro de `overflow-x-auto` (o axe acusava `scrollable-region-focusable`).
- Correção: sem `overflow-x-auto` e sem `min-w-[420px]`; colunas `2.25rem_repeat(12,minmax(0,1fr))`, `gap-1`, rótulos em `text-xs`. `data-month` e `data-announced` mantidos (os testes contam 12 `[data-month]`).
- Medida (320, 360, 390): 12 meses dentro do quadro; menor coluna de 16 px (320) e 20 px (360); `scrollable-region-focusable` sumiu.

**B5. Axe grave.**
- Causa (confirmada pelos nós do axe): `aria-label` em `span[data-month]` sem papel (12); `ul role="tablist"` com `li` (1 de `aria-required-children`, 6 de `aria-required-parent` e 6 de `listitem`).
- Correção: `span[data-month]` com `role="img"` (mesmo `aria-label`); `ul` da lista de perguntas vira `div role="tablist"`; `li` vira `div role="presentation"`. Os `role="tab"` ficam diretos no `tablist`. `aria-selected`, `aria-controls`, `aria-labelledby` e a navegação por setas continuam.
- Medida: axe sério ou crítico 26 → 0 em 320, 360 e 390 (claro e escuro), e 25 → 0 em 768.

**B6. Alvos de toque.**
- `InfoTip` (botões "O que é …?"): caixa de 24 px, mas área de toque de 44×44 pelo pseudo-elemento `::before` (`inset: -10px`), só abaixo de 640 px. O ícone visível continua com 16 px. Medido: `::before` 44×44, ícone 16 px.
- Seletor Anual/Mensal/5A/Máx e legenda (Dividendo, JCP): `max-sm:min-h-11` (44 px abaixo de 640 px). Em 768 continuam com 32 px (o brief pede 44 px no celular).
- Medida: `alvosMenor24` 1 → 0 (320 a 390). `alvosMenor44` em 360: 38 → 31; os 31 que sobram são todos o `InfoTip`, cujos 44 px vêm do pseudo-elemento que o script não mede (caixa de 24 px). Não é um alvo menor que 44 px na área de toque real.
- Possível sobreposição: a área de 44 px pode cobrir um pouco o botão vizinho, em espaços de 10 px entre linhas. Não testado com toque real.

**B7. CLS de 0,91 a 0,93. Investigado; sem correção (causa estrutural).**
- Sources de `layout-shift` (3 rodadas, mesma sequência de larguras do script):
  - `div.page-enter` (o corpo da página): `height` de 171 px (carregando) para 636 px (conteúdo), com `top` de 80 para 64 px.
  - `footer.ediv-account-footer`: `top` de 291 para 0 (fora do fluxo durante o carregamento).
- Causa: a página mostra um estado de carregamento pequeno e depois o conteúdo inteiro, com 465 px a mais. Não há uma reserva de altura simples: seria preciso um esqueleto da página inteira, o que é mudança de estrutura.
- Medida (controle e depois, idênticos): 320 → 0,9086 (0 em rodada isolada); 360 → 0,9179; 390 → 0,9242; 768 → 0,9331. O 320 oscila entre rodadas (0 isolado, 0,9086 na sequência), como o 360 em rodada isolada (0).
- Meta "controle + 0,01": atendida (o valor é o mesmo do controle). A causa fica registrada, sem correção.

**B8. Texto abaixo de 12 px (aprovado pelo Orquestrador).**
- `text-[10px]` e `text-[11px]` de `StockMake.tsx`, `Charts.tsx`, `HistoryCharts.tsx` e `ui.tsx` trocados por `text-xs`. Exceção: `i` decorativo do `InfoTip` (`aria-hidden`, `ui.tsx:32`) continua em 10 px.
- Medida: `textoMenor12` de `app-empresa` em 360: 15 → 3.
- Autorizado pelo Orquestrador (26/11): `LiveQuote.tsx` (rótulos "Cotação atual" e "brapi.dev") e `stock-make/data.ts` (`fontSize` do eixo de 11 para 12). Medida final em `app-empresa` (320, 360, 390 e 768): `textoMenor12` 15 → 0. Os rótulos dos eixos (7 em 320) têm 12 px e nenhum par de caixas se sobrepõe. O print de 320 px é a página inteira reduzida, então não dá para ler os rótulos nele; a conferência é a medida.

---

## Critérios 8 a 17

| critério | meta | resultado | o que sobrou |
|---|---|---|---|
| 8. `rolagemLateral` | falso em 320, 360, 390 e 768 (páginas tocadas) | atendido em `app-empresa`; demais páginas sem rolagem | nada |
| 9. `axe.graves` | 0 em 360, claro e escuro | atendido (0) em `app-empresa`, `home`, `ranking`, `mercado` | 1 nó `region` (impacto moderado, best-practice), não investigado |
| 10. alvos | `alvosMenor24` sem `semEspacamento`; A4, A5, A11, B6 e A1 com 44 px | `alvosMenor24` 0; A4, A5, A11 e A1 com 44 px; B6 com 44 px pelo pseudo-elemento (o script não mede) | `alvosMenor44` com 31 em 360 (são o `InfoTip`); 768 com `Seg`/legenda em 32 px |
| 11. texto e campo | `textoMenor12` vazio; `camposMenor16` vazio | `camposMenor16` 0; `textoMenor12` 0 nas páginas da parte A e em `app-empresa` | nada |
| 12. menu "Notificações" | foco volta ao sino ao fechar com Escape | atendido com item focável; não atendido com lista vazia | decisão do Orquestrador: manter (A9) |
| 3 e 7 (A2 e A10) | setas 44×44 na linha do título; espaço de 16 px; trilho ≥ 1,5:1 | setas 44×44 na linha do título; espaços de 24 e 12 px; trilho 1,70:1 (claro) e 1,58:1 (escuro) | nada |
| 14 a 17 | sem "tempo real", "com atraso" ou data de cotação; avisos presentes; sem travessão novo; sem linha divisória nova; números iguais; `safety-margin.mjs`, API, banco e textos de aula sem diff | nenhum texto novo; avisos não tocados; só classes mudaram; sem linha nova; `safety-margin.mjs`, API, banco e textos de aula sem diff | nada |
| CLS | ≤ controle + 0,01 | `app-empresa`: igual ao controle; `app-aprender-3ex`: +0,0152 (360) e +0,0069 (390) | A12 aceito pelo Orquestrador (CLS 0,077; medição no QA final); B7 explicado |

## Testes que mudaram

- `tests/accessibility.browser.mjs` (depois do bloco "Notificações: teclado, estado expandido e Escape"): asserção nova "Notificações: Enter, Tab para dentro do painel e Escape devolvem o foco ao sino". Com lista vazia só o Escape é testado. Não rodou aqui (depende de banco); `node --check` OK.
- Nenhum outro teste foi alterado. Conferi `tests/dividend.browser.mjs` (`[data-month]` e `data-announced`), `tests/figma-stock.browser.mjs` (12 `[data-month]`, `role="tab"`, `.fmk-info`), `tests/public-rankings.browser.mjs` e `tests/browser.mjs`: os seletores e textos continuam os mesmos.

## Comandos e resultados

| comando | resultado |
|---|---|
| `npm run lint` (base, parte A, parte B) | passou nas três |
| `npx tsc -b` (base, parte A, parte B) | passou nas três |
| `npm run build` (base, parte A, parte B) | passou nas três |
| `npm test` | 318/318 na base, 318/318 na parte A, 318/318 no final (total não caiu) |
| `npm run test:public-home` | 1ª rodada da parte A falhou (porta 4191 caiu no meio); demais rodadas passaram, inclusive a final |
| `node --test tests/seo.dist.mjs` | 9/9 |
| `node --check tests/accessibility.browser.mjs` | OK |
| `auditoria-mobile.mjs` (antes na 4195, depois na 4194) | parte A e parte B, com `--comparar` |
| `git status --short` (final) | só os arquivos da lista "Pode tocar", os do 2a, as duas linhas fantasma e os dois relatos |

Testes de navegador do repositório (`test:browser`, `test:integration`) dependem de banco e não rodaram aqui.

## Limites e dúvidas

- iPhone, Safari e entalhe reais não foram testados. O script usa Chrome no Windows com `hasTouch`.
- Teclado virtual e toque real (área de 44 px do `InfoTip`) não testados.
- Dados reais não testados: o fixture usa TEST1 a TEST3, e as notificações do fixture estão vazias.
- O CLS oscila entre rodadas nas duas páginas (`app-aprender-0ex` e `app-empresa` em 320).
- O fallback do logo não cabe sete letras largas (limite registrado no A3).
- Os prints da auditoria ficaram fora do repositório, na pasta de capturas.

## Decisões do Orquestrador (26/11)

1. **A9:** mantido. Com a lista vazia, o Tab leva ao próximo item da página. A asserção nova com 1 item fica.
2. **A12:** aceito o CLS de 0,077 em `app-aprender-3ex` (360), sem mudar o DOM. Motivo: o controle oscila mais que a diferença (0 e 0,027 na mesma página). Pendência para o QA final: o Vigia mede 3 vezes por caso, e o Orquestrador decide pela mediana. Sources registradas neste relato (item A12): painel de aulas (`section#learning-panel-curso`) sobe de `top 579` para `443` quando o bloco `role="status"` some e cresce depois; carrossel sai do fluxo enquanto carrega; cartão "Sua próxima aula" entra depois.
3. **B8:** autorizado `LiveQuote.tsx` (dois rótulos) e `data.ts` (uma constante). Feito. Medido.
4. **A3:** o limite de sete letras largas continua. Não reduzi a fonte; o Orquestrador não pediu mudança.

## Próximo passo

O Vigia mede o CLS de `app-aprender-3ex` em 3 rodadas no QA final e o Orquestrador decide pela mediana. Depois, Lupa (3a) sobre este relato. Itens B7 e alvos do `InfoTip` continuam pedindo teste com toque real no 3b.

---

## 2c. CLS de /app/aprender com conta (correção autorizada pelo Orquestrador)

Motivo: o QA final (Vigia) reprovou o critério 5. A causa é a que o Pincel tinha achado no A12: o bloco `role="status"` ficava entre as abas e o painel, e ao sumir o painel subia.

**Mudança (só `src/pages/Aprender.tsx`):**
- O bloco de carregamento saiu de cima das abas e virou uma constante `loadingStatus` (mesmo texto, mesmo `role="status"`, mesmo esqueleto `h-20`).
- Na área da conta (`location.pathname` começa com `/app`), o aviso fica dentro do painel, no lugar onde entra o cartão "Sua próxima aula". Quando o cartão chega, a faixa ocupada é quase a mesma, e nada acima do painel se move.
- No público (`/aprender`, `/aprender-testes`), o aviso continua acima das abas, como no 2b.
- Textos iguais; nenhum texto novo.

**Por que o público fica separado:** a primeira versão, com o aviso dentro do painel para todos, piorou o visitante: `/aprender-testes` foi a 0,0387 em 360 px e a 0,0396 em 390 px (contra 0,0296 e 0,0315). A troca de aba do `/aprender-testes` acontece depois do carregamento e a fonte do salto é o painel do curso (`section#learning-panel-curso`, `prev [448,332] → cur [512,268]`). Separando por rota, o público volta exatamente ao 2b.

**Medidas (CLS, 3 rodadas por caso, `auditoria-mobile.mjs`, `ONLY=aprender,app-aprender`, `WIDTHS=320,360,390`, `THEMES=claro`, `CONCURRENCY=1`, um servidor só, porta 4194):**

| caso | largura | antes (2b, mediana) | depois (2c, mediana) | meta | controle |
|---|---|---|---|---|---|
| app-aprender 0 exercício | 320 | 0,066 (QA final) | 0,0000 | ≤ 0,066 | 0,056 |
| app-aprender 0 exercício | 360 | 0,0774 | 0,0212 | ≤ 0,0722 | 0,0622 |
| app-aprender 0 exercício | 390 | 0,0791 | 0,0305 | ≤ 0,0749 | 0,0649 |
| app-aprender 3 exercícios | 320 | 0,066 (QA final) | 0,0000 | ≤ 0,066 | 0,056 |
| app-aprender 3 exercícios | 360 | 0,0774 | 0,0212 | ≤ 0,0722 | 0,0622 |
| app-aprender 3 exercícios | 390 | 0,0718 | 0,0256 | ≤ 0,0749 | 0,0649 |
| aprender (visitante) | 320 | 0 | 0 | ≤ 2b | 0 |
| aprender (visitante) | 360 | 0,0296 | 0,0296 | ≤ 2b | 0,0271 |
| aprender (visitante) | 390 | 0,0315 | 0,0315 | ≤ 2b | 0,0293 |
| aprender-testes | 320 | 0,0165 | 0,0165 | ≤ 2b | 0,0142 |
| aprender-testes | 360 | 0,0296 | 0,0296 | ≤ 2b | 0,0271 |
| aprender-testes | 390 | 0,0315 | 0,0315 | ≤ 2b | 0,0293 |

Os valores "antes" de app-aprender vêm do relato do QA final (relato do QA final, pelo Vigia). Os valores de visitante e testes do 2b são os do mesmo relato. A primeira versão (aviso dentro do painel para todos) deu, em `aprender-testes`, 0,04 / 0,0387 / 0,0396, e no visitante 0,0387 / 0,0396 em 360 e 390; foi descartada pela regra 3.

**Espaços depois do carregamento (critérios 1, 2 e 7), 360 px, claro, `app-aprender-3ex`:**
- Cabeçalho até as abas: 24 px (meta 16 a 32). Critério 1.
- Bloco de aulas até os minicursos: cartão "Sua próxima aula" → Minicursos: 28 px (meta 24 a 40). Critério 2.
- Blocos do painel: 28 px entre intro, cartão, minicursos e sala de aula (meta 28). Critério 7.
- O DOM depois do carregamento é o mesmo do 2b, então a página carregada não muda.

**Por que o CLS da conta caiu:** as sources da primeira versão (mesmo caminho de código na conta) mostram que o único salto restante em `app-aprender` é do carrossel (`section#cursos`) em 0,02125, uma só ocorrência, na substituição do cartão. Antes, o salto de 136 px do aviso subia o painel inteiro.

**Limites:**
- Na área da conta, o aviso fica dentro do painel. Na aba de testes, o aviso também aparece no topo do painel de testes (ajuste de 2c, abaixo). Não medi o CLS da aba de testes com conta durante o carregamento.
- O CLS de visitante oscila entre rodadas no controle (0 ou 0,0296); a medição de 3 rodadas deu valores estáveis nesta sessão.
- O print de carregamento da conta em 360 px (com a API atrasada) mostrou o esqueleto no lugar do cartão e o aviso "Carregando aulas…" acima dele. Não há print de carregamento em 320 px.

**Comandos e resultados (2c):**

| comando | resultado |
|---|---|
| `npm run lint` | passou (exit 0) |
| `npx tsc -b` | passou (exit 0) |
| `npm test` | 318/318, 0 falhas |
| `npm run build` | passou (exit 0) |
| `node --check tests/accessibility.browser.mjs` | OK |
| `auditoria-mobile.mjs` (3 rodadas, pastas `auditoria-pincel-2c-c2-r1`, `-r2`, `-r3` em mobile-qa) | 0 falhas |

**Diff (2c):** só `src/pages/Aprender.tsx`. Em relação ao 2b, sai um bloco de aviso (cerca de 16 linhas, o que ficava acima das abas), contra o estado revisado pela Lupa (3a). Entram a constante `loadingStatus` (cerca de 13 linhas), a variável `inAccount` (4 linhas) e os usos (`{!inAccount && loadingStatus}`, `{inAccount && loadingStatus}` no painel de curso e no de testes). Sem `aprender.css`.

**Ajuste 2c (aba Testes com conta):** a limitação acima foi corrigida. O aviso também aparece no topo do painel `#learning-panel-testes` (`{inAccount && loadingStatus}`). Como os painéis usam `hidden`, só um aviso fica visível por vez. Nada mais mudou.
- Lint, `tsc -b`, `npm test` (318/318) e build passaram após o ajuste.
- CLS, uma rodada, `app-aprender` em 360 px, claro, servidor só na 4194: 0 (0 exercício) e 0,0212 (3 exercícios). Dentro da faixa da 2c.
- Print do carregamento da conta na aba Curso, 360 px, com a API simulada atrasada em 8 s (só para ver o esqueleto): print em pasta de trabalho local, fora do repositório. O esqueleto aparece no lugar do cartão, com o aviso "Carregando aulas…" acima.
- Não medi o CLS da aba Testes com conta durante o carregamento (fora do critério).

**Pendência:** o Vigia refaz o CLS de /app/aprender com 3 rodadas no QA final; a decisão pela mediana é do Orquestrador.

**Decisão do Orquestrador (2c):** `inAccount` usa `location.pathname.startsWith("/app")`, sem a barra final. Hoje não muda nada, porque a única rota da conta é `/app`. Fica como está para não mexer no código depois do QA.

**2d (teste public-home):** `tests/public-home.browser.mjs` ganhou o mock de `/api/support/information` (campos vazios, o mesmo padrão de `accessibility.browser.mjs`), porque a página Metodologia chama essa rota ao ser aberta. Sem mudança de asserção nem de código do site. Uma rodada: passou; `node --check` e lint passaram.
