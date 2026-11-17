# Etapa 2B: tokens de movimento e consistência (17/11/2026)

Autor: Pincel (interface). Brief `docs/harness/briefs/etapa2-2B-pincel.md`, com a decisão do Orquestrador de 17/11 no passo 2 (três tokens de duração, não cinco). Nota "Contexto Escola" lida (seções 3, 4 e 10). Nenhum texto legal, aviso, regra financeira, margem, cotação ou número exibido foi alterado. Commit, push e deploy não foram feitos. A árvore está pronta para a Lupa.

**Resultado em uma linha:** tokens criados e aplicados nos casos da lista; 13 linhas mudaram de valor (8 de 140 ms para 150 ms e 5 de 160 ms para 150 ms); `@source not "../docs"` adicionado; 3 alvos de toque tiveram a classe trocada de `min-h-10` para `min-h-11` (a altura real já era 44 px pela regra de `navigation-chrome.css:111-112`; a troca só alinha a classe a ela). Capturas "depois" iguais às "antes" nas 30 combinações (5 páginas × 3 larguras × 2 temas).

## 1. Tokens: valor → token e definição

Definidos em `src/index.css:37-41`, ao lado de `--ediv-ease` (`:36`, inalterado):

| Valor | Token | Definição |
|---|---|---|
| `cubic-bezier(0.2, 0, 0, 1)` | `--ediv-ease-out` | `src/index.css:37` |
| `cubic-bezier(0.22, 1, 0.36, 1)` | `--ediv-ease-emphasis` | `src/index.css:38` |
| 150 ms (substitui 140, 150 e 160 ms) | `--ediv-duration-fast` | `src/index.css:39` |
| 180 ms | `--ediv-duration-base` | `src/index.css:40` |
| 250 ms | `--ediv-duration-slow` | `src/index.css:41` |

`--ediv-ease` continua como estava. Os tokens ficam em `:root` (duração e easing não mudam com o tema).

## 2. Literais trocados e linhas que mudaram de valor

**Mudança de valor (decisão do Orquestrador: só 140 → 150 e 160 → 150).** Cada linha, antes → depois:

| # | Arquivo:linha (depois) | Propriedade | Antes | Depois |
|---|---|---|---|---|
| 1 | `src/index.css:306` | `.ediv-member-intro a`, `background-color` | 140 ms | 150 ms |
| 2 | `src/index.css:307` | `.ediv-member-intro a`, `color` | 140 ms | 150 ms |
| 3 | `src/index.css:308` | `.ediv-member-intro a`, `transform` | 140 ms | 150 ms |
| 4 | `src/index.css:463` | `.action`, `.action-secondary`, `transition-duration` | 140 ms | 150 ms |
| 5 | `src/components/learning-workspace.css:149` | `background-color` | 140 ms | 150 ms |
| 6 | `src/components/learning-workspace.css:150` | `transform` | 160 ms | 150 ms |
| 7 | `src/components/learning-workspace.css:201` | `border-color` | 160 ms | 150 ms |
| 8 | `src/components/learning-workspace.css:202` | `background-color` | 160 ms | 150 ms |
| 9 | `src/components/learning-workspace.css:286` | `background-color` | 140 ms | 150 ms |
| 10 | `src/components/learning-workspace.css:287` | `transform` | 160 ms | 150 ms |
| 11 | `src/components/learning-workspace.css:378` | `background-color` | 140 ms | 150 ms |
| 12 | `src/components/learning-workspace.css:379` | `border-color` | 140 ms | 150 ms |
| 13 | `src/components/navigation-chrome.css:25` | `transform` (logo) | 160 ms | 150 ms |

Total: 13 linhas (8 de 140 ms e 5 de 160 ms).

**Trocas sem mudança de valor** (literal substituído pelo token com o mesmo número):
- `src/index.css:285`: `ediv-menu-open` 250 ms → `var(--ediv-duration-slow)`; easing `cubic-bezier(0.2, 0, 0, 1)` → `var(--ediv-ease-out)`.
- `src/index.css:377`: `border-color` 180 ms → `var(--ediv-duration-base)`.
- `src/index.css:277`: `ediv-page-rise` (easing) → `var(--ediv-ease-out)`. Duração 260 ms mantida (caso justificado).
- `src/index.css:821`: `favoriteCardEnter` (easing) → `var(--ediv-ease-emphasis)`. Duração 420 ms mantida.
- `src/components/learning-workspace.css:98`: easing → `var(--ediv-ease-emphasis)`. Duração 260 ms mantida.

**Contagem por arquivo.**
- `src/index.css`: 6 durações (250, 140 ×4, 180) e 3 easings trocados. Antes: 6 linhas com literal de duração da lista e 3 easings `cubic-bezier` repetidos. Depois: nenhum literal da lista.
- `src/components/learning-workspace.css`: 8 durações (140 ×4, 160 ×4) e 1 easing trocados.
- `src/components/navigation-chrome.css`: 1 duração (160) trocada.

**Casos justificados que sobraram** (valores fora da lista, mantidos como estão):

`src/index.css`:
- `:313` e `:469`: 65 ms (`transition-duration`, estado de pressionado). Fora da lista.
- `:347`: 650 ms e `cubic-bezier(0.2, 0.65, 0.3, 1)` (barra de progresso). Duração fora da lista; easing usado uma única vez.
- `:351`: 400 ms (`opacity`). Fora da lista.
- `:355`: 220 ms (`insightSummaryEnter`). Fora da lista.
- `:277`: 260 ms (`ediv-page-rise`). Fora da lista.
- `:821`: 420 ms (`favoriteCardEnter`). Fora da lista.
- `:829` e `:831`: 0.01 ms, na regra global de movimento reduzido (`:817-826` de antes). Não mexida, como pede o brief.
- `:613`, `:632`, `:667`, `:695`: animações decorativas longas (6 s e 7,5 s, `ease-in-out`). Ficam como estão.

`src/components/learning-workspace.css`:
- `:98`: 260 ms (`transition`). Fora da lista.
- `:161`, `:293`, `:389`: 0 ms (`transition-duration`, redução de movimento). Fora da lista.

`src/components/navigation-chrome.css`:
- `:40` e `:41`: 120 ms. Fora da lista.
- `:63`: 0 ms. Fora da lista.
- `:114`: 100 ms. Fora da lista.

**Verificação.** Após as edições, `grep -nE "[0-9]+(\.[0-9]+)?ms"` nos três CSS mostra somente as definições dos tokens (`index.css:39-41`) e os casos justificados acima. Nenhum literal 140, 150, 160, 180 ou 250 ms fora da definição. As únicas `cubic-bezier` restantes são `--ediv-ease` (`:36`) e a de `width 650ms` (`:347`).

## 3. Item 2: `@source not "../docs"`

- Prova de que nenhum `.tsx`/`.ts` de `src/` usa a classe: `grep -rn "ease-in-out" src --include=*.tsx --include=*.ts` retornou 0 linhas (antes e depois). Os usos são só dentro de `.css` e continuam lá.
- Adicionado em `src/index.css:7`, logo após `@config`, com comentário explicando a diretiva.
- `grep` no CSS do build:
  - **Antes:** a cópia de 2F do Vigia (`.test-artifacts/dist-2f/assets/index-*.css`) tem `.ease-in-out{` uma vez. Esse é o build que o brief descreve. O `dist/` anterior foi sobrescrito, então não há mais o build "antes" local.
  - **Depois:** `grep -c "\.ease-in-out{" dist/assets/index-*.css` imprime `0`.
- O visual não mudou (ver seção 5). A classe `ease-in-out` não é usada por nenhum componente, então a remoção não tira nada que a interface use.

## 4. Item 3: alvo de toque

- `src/layouts/DashboardLayout.tsx:259`, `:286` e `:322`: `min-h-10` → `min-h-11`. Nenhuma outra classe mudou (`git diff -U0` mostra apenas essas 3 linhas, `-min-h-10` / `+min-h-11`).
- Medição (`boundingBox().height`, Chrome headless, 390 px, menu da conta aberto, sessão simulada com usuário fictício via `page.route`, script descartável apagado ao final):

| Item | Altura depois |
|---|---|
| Perfil (`:259`) | 44 px |
| Conversas (`:286`) | 44 px |
| Sair da conta (`:322`) | 44 px |
| Administração, Início da Escola, Configurações, Rever introdução | 44 px cada (já eram `min-h-11`) |

- **Antes:** 44 px nos três itens, já pela regra `min-height: 2.75rem` em `navigation-chrome.css:111-112` (`.ediv-profile-popover :is(a, button)`). A Lupa mediu 44 px antes e depois. A troca para `min-h-11` só alinha a classe à altura real; não mudou a área de toque.

**Item 4: retirado do brief.** `PortfolioPulse.tsx` é órfão e será apagado na C2. Nada foi tocado nele. `git diff -- src/components/PortfolioPulse.tsx` vazio.

## 5. Capturas e valores calculados, antes e depois

**Capturas.** 5 páginas (`/`, `/ranking`, `/aprender`, `/glossario`, `/entrar`) × 3 larguras (320, 768 e 1280 px) × 2 temas (claro e escuro, forçado por `localStorage["ediv-appearance-v1"]`, o mesmo que `public/theme-init.js` lê). Captura de página inteira, com `animations: "disabled"`. Comparação por hash SHA-256 do PNG.
- Resultado: **30 de 30 iguais**. Nenhuma diferença de pixel.

**Valores calculados.** Para todos os elementos de cada página e combinação, coletei o conjunto de `transitionDuration`, `transitionTimingFunction`, `transitionProperty`, `animationDuration` e `animationTimingFunction`. Antes: 25 combinações distintas. Depois: 25.
- As combinações que mudaram são exatamente as 4 esperadas (140 → 150 e 160 → 150):
  - `0.14s` → `0.15s`, `background-color, border-color, color, transform`, `cubic-bezier(0.2, 0.8, 0.2, 1)`.
  - `0.16s` → `0.15s`, `ease-out`, `transform`.
  - `0.14s, 0.16s` → `0.15s, 0.15s`, `ease-out, ease-out`, `background-color, transform`.
  - `0.16s, 0.16s` → `0.15s, 0.15s`, `ease-out, ease-out`, `border-color, background-color`.
- Nenhuma outra combinação mudou (easings, 180 ms e 250 ms iguais).

Os valores amostrados para os elementos afetados (botão `.action`, links `.ediv-member-intro a`, cards e abas dos `learning-workspace`) estão nessas combinações. A mudança é de 10 ms (de 140/160 para 150), abaixo do perceptível, como a decisão do Orquestrador previa.

## 6. Item 5: microinterações

Nenhum achado, não executado. O relato 1A não lista achados de falta de feedback de toque ou foco, e o despacho do Orquestrador não trouxe lista.

## 7. Comandos rodados e resultado

| Comando | Resultado |
|---|---|
| `node scripts/harness.mjs claim interface …` | Passou. |
| `grep -nE "[0-9]+(\.[0-9]+)?ms" src/index.css …` (antes e depois) | Passou; lista na seção 2. |
| `grep -rn "ease-in-out" src --include=*.tsx --include=*.ts` | Passou: 0 linhas. |
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0). |
| `grep -c "\.ease-in-out{" dist/assets/index-*.css` | `0` depois (antes: 1, na cópia 2F do Vigia). |
| Capturas antes/depois (script descartável, apagado) | 30 de 30 iguais. |
| Valores calculados antes/depois (script descartável, apagado) | Só as 4 combinações esperadas mudaram. |
| Medição de 44 px no menu da conta (script descartável, apagado) | Passou: 6 de 6 itens com 44 px. |
| `git diff -- src/components/PortfolioPulse.tsx` | Vazio. |
| `git status --short` | Caminhos da 2B presentes; demais arquivos são de outras etapas. |
| `node scripts/harness.mjs check` | Passou (ver seção 8). |

## 8. Limites e próximo passo

- Capturas e medições em Chrome headless de desktop, com sessão fictícia no menu da conta. Celular real não foi usado.
- As capturas são estáticas. Mudanças de 140/160 para 150 ms só aparecem no tempo de transição, que é medido pelos valores calculados (seção 5), não pelas capturas.
- O build "antes" do CSS não foi regenerado: o `dist/` anterior foi sobrescrito. A comparação de `ease-in-out` usa a cópia 2F do Vigia.
- `src/components/PortfolioPulse.tsx` segue sem alteração, para a C2 apagar.
- Próximo passo: revisão da Lupa dos quatro arquivos (`src/index.css`, `src/components/learning-workspace.css`, `src/components/navigation-chrome.css`, `src/layouts/DashboardLayout.tsx`) e deste relato.
