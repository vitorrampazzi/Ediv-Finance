# Revisão da 2B (Pincel): tokens de movimento, `@source not` e alvo de toque

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality` (dois eixos, severidade). Especificação: `docs/harness/briefs/etapa2-2B-pincel.md`, com a decisão do Orquestrador no passo 2 (três tokens de duração; só 140 → 150 e 160 → 150 mudam de valor). Relato do executor: `docs/harness/relatos/interface-etapa2b-2026-11-16.md`.

Revisei: `src/index.css`, `src/components/learning-workspace.css`, `src/components/navigation-chrome.css`, `src/layouts/DashboardLayout.tsx`. Não rodei build (o Pincel está buildando); usei o `dist/` que já existe (gerado às 06:54, depois da edição de `src/index.css` às 06:49, e com os tokens dentro) e compilações do Tailwind em memória.

## Veredito: aprovado com ressalvas

Os pontos pedidos passam: cada troca virou o token de mesmo valor, as 13 mudanças de valor são exatamente as listadas, o `@source not` só tirou classes sem uso e o movimento reduzido continua valendo. A ressalva importante é o item de alvo de toque: ele não muda nada na tela, porque os itens do menu já mediam 44 px antes (achado 1).

## Achados de padrões (por severidade)

### 1. [Baixa] O alvo de toque do menu da conta já era 44 px: o `min-h-10 → min-h-11` não muda o layout, e o relato afirma o contrário
- Onde: `src/layouts/DashboardLayout.tsx:259`, `:286`, `:322`; regra que decide: `src/components/navigation-chrome.css:111-114` (`.ediv-profile-popover :is(a, button) { min-height: 2.75rem; … }`).
- Prova: montei os dois CSS (`dist-2f`, anterior à 2B, e `dist`, atual) numa página de 320 px com o contêiner `ediv-chrome-popover ediv-profile-popover` e um link com a classe do `DashboardLayout`:
  - antes, com `min-h-10`: `min-height` calculado **44 px**, altura 44 px;
  - depois, com `min-h-11`: 44 px, 44 px;
  - controle, o mesmo link com `min-h-10` fora do popover: 40 px.
  CSS sem camada vence o utilitário do Tailwind (que fica em `@layer utilities`), então a regra do popover já impunha 44 px.
- Consequências: (a) sem efeito colateral de layout, nem a 320 px (o popover tem `max-width: calc(100vw - 2rem)` = 288 px, igual ao `w-72`, e `max-height` com `overflow-y: auto`, `navigation-chrome.css:106-109`; as alturas não mudam, então os itens empilhados ficam como estavam); (b) o relato §4 diz "Antes: 40 px", valor deduzido da classe, não medido, e a medição de 44 px "depois" não prova a mudança; (c) o achado da auditoria 1A era um falso positivo.
- Sugestão: nenhuma reversão necessária (a edição é inofensiva e alinha a classe à regra). Registrar o fato no relato e, se quiser uma única fonte da altura, tirar a duplicidade (classe e regra do popover) numa limpeza futura.

### 2. [Baixa] Nome `--ediv-ease-out` colide com a palavra-chave `ease-out` do CSS, que é outra curva
- Onde: definição em `src/index.css:37`; palavra-chave `ease-out` ainda em 15 linhas dos três arquivos (`learning-workspace.css` 8, `navigation-chrome.css` 4, `index.css` 3), inclusive nas mesmas declarações que agora usam `var(--ediv-duration-fast) ease-out` (`learning-workspace.css:149-150` e outras, `navigation-chrome.css:25`).
- Problema: `--ediv-ease-out` vale `cubic-bezier(0.2, 0, 0, 1)`; a palavra-chave `ease-out` vale `cubic-bezier(0, 0, 0.58, 1)`. Um júnior lê "ease-out" nas duas e supõe a mesma curva. Também há três nomes parecidos: `--ediv-ease` (0.2, 0.8, 0.2, 1), `--ediv-ease-out` e `--ediv-ease-emphasis`.
- Os tokens não têm comentário nenhum em `index.css:36-41`; o motivo de existirem e quando usar cada um só está no relato.
- Sugestão: um comentário de duas linhas acima dos tokens (o que é cada um, e que `--ediv-ease-out` não é a palavra-chave `ease-out`), ou um nome sem a ambiguidade (por exemplo `--ediv-ease-decelerate`).

### 3. [Baixa, follow-up] Adoção parcial: os mesmos valores seguem literais em outros CSS, e há um token duplicado
- Fora do escopo do brief (só três arquivos), mas vale registrar para a próxima rodada: `home/home-area-cards.css:33,34,80` (150 ms), `home/public-home.css:64,65` (150 ms), `home/public-sections.css:268,380,433` (180 ms), `home/teaching-journey.css:49,50,263` (250 ms), `research-section-nav.css:29,30` (160 ms), `pages/income-ranking.css:74,98` (150 ms).
- `home/public-home.css:2` define `--ph-ease: cubic-bezier(0.22, 1, 0.36, 1)`, o mesmo valor de `--ediv-ease-emphasis`: dois tokens para a mesma curva.

### 4. [Nit] O relato do `@source not` está incompleto: saem mais classes que `.ease-in-out`
- Compilei o Tailwind em memória (mesmo `@tailwindcss/postcss` e `tailwind.config.js` do projeto) com e sem a linha `@source not "../docs"`: 120.159 contra 121.299 bytes (−1.140). O que só existia por causa de `docs/`: `.ease-in-out`, `.ease-out` e as variáveis de tema `--ease-in-out` e `--ease-out`; `.min-h-svh` e `.min-h-[70vh]` (citados nos relatos da 2F); `.bg-white`, `.bg-white/5`, `.antialiased`, `.ordinal`, `.outline`. O resto do CSS é idêntico (só mudou a ordem de dois blocos `@property`/`--tw-outline-style`).
- Isso não é problema: ver a resposta ao ponto 3 abaixo. Só o relato (§3) fala só de `.ease-in-out`.
- Escala: `fast` (150) e `base` (180) distam 30 ms e `base` e `slow` são usados uma vez cada (`index.css:285` e `:377`); a escala é fina. Sem ação.

## Eixo da especificação

Cumprido: três tokens de duração com os nomes e valores decididos (`--ediv-duration-fast: 150ms`, `base: 180ms`, `slow: 250ms`) e dois de easing, no `:root` (`index.css:11`, tokens em `:37-41`); só 140 → 150 e 160 → 150 mudam; `@source not "../docs"` em `index.css:7`; `PortfolioPulse.tsx` sem diff; item 5 não executado, como manda o brief; `--ediv-ease` intacto.

Fora do pedido: nada na 2B. O `DashboardLayout.tsx` tem também `width="192" height="192"` em dois `<img>` (`:374-375` e `:469-470`): é da 2A, já revisada, ignorei.

Parece pronto mas não muda nada: o item de alvo de toque (achado 1).

Não reproduzido por mim: as 30 capturas "antes e depois" iguais e a medição dos 44 px no navegador com sessão simulada (a segunda eu substituí pela prova do achado 1).

## Respostas aos seis pontos

1. **Literal → token de mesmo valor.** Verificação mecânica: para cada um dos três CSS, tirei de `git show HEAD:<arquivo>` o texto antigo; no arquivo atual removi as linhas acrescentadas (definição dos tokens, `@source`), expandi cada `var(--ediv-duration-*)` e `var(--ediv-ease-*)` pelo valor do token e comparei linha a linha. Resultado: mesmo número de linhas; as únicas linhas que diferem são **13**, e em todas a única diferença é `140ms` ou `160ms` virando `150ms`: `index.css` 4 (linhas antigas 299, 300, 301 e 456; atuais 306, 307, 308 e 463), `learning-workspace.css` 8 (149, 150, 201, 202, 286, 287, 378, 379, todas com o mesmo número antes e depois) e `navigation-chrome.css` 1 (25). São 8 de 140 ms e 5 de 160 ms, iguais à lista do relato. Nenhuma outra duração nem easing mudou: as trocas 250 ms → `slow`, 180 ms → `base`, `cubic-bezier(0.2, 0, 0, 1)` → `--ediv-ease-out` (`index.css:277`, `:285`) e `cubic-bezier(0.22, 1, 0.36, 1)` → `--ediv-ease-emphasis` (`index.css:821`, `learning-workspace.css:98`) expandem para o texto original. Literais 140, 150, 160, 180 e 250 ms restantes nos três arquivos: só as definições `index.css:39-41`.
2. **Uso e nomes.** Tokens consistentes: `fast` em 13 pontos, `base` e `slow` em um cada, `ease-out` em 2 e `emphasis` em 2. Nenhum token tem valor diferente do nome. A ressalva é a colisão de nome do achado 2 e a falta de comentário.
3. **`@source not "../docs"`.** O caminho é relativo ao arquivo, então `../docs` é `evorix-finance/docs` (existe). Prova pela comparação em memória (achado 4): as classes removidas são `.ease-in-out`, `.ease-out`, `.min-h-svh`, `.min-h-[70vh]`, `.bg-white`, `.bg-white/5`, `.antialiased`, `.ordinal`, `.outline` e duas variáveis de tema. Busca em `src`, `index.html`, `public`, `scripts`, `tailwind.config.js` e `site-pages.mjs` (`.tsx`, `.ts`, `.js`, `.mjs`, `.html`): nenhum uso da forma sem prefixo de nenhuma delas; os acertos de `bg-white/5` e `bg-white/[...]` são `hover:bg-white/5`, `hover:bg-white/[0.04]` etc., que são outras classes e continuam no CSS (o diff das duas compilações não as toca, nem `focus-visible:outline`); `var(--ease-out)` e `var(--ease-in-out)` não são usados em nenhum CSS. No `dist/` atual, `.ease-in-out{`, `.ease-out{`, `.min-h-svh{`, `.bg-white{` e `.antialiased{` estão ausentes; no `dist-2f` (anterior) estão todos presentes.
4. **`DashboardLayout`.** O diff da 2B no arquivo é só `min-h-10` → `min-h-11` nas três linhas (`:259`, `:286`, `:322`), nenhuma outra classe. Sem efeito de layout: ver achado 1 (a altura calculada não mudou, 44 px antes e depois; a 320 px o popover tem `max-width` de 288 px e rolagem própria).
5. **Movimento reduzido.** A regra global (`index.css:824-831`: `*, *::before, *::after` com `animation-duration`, `animation-iteration-count` e `transition-duration` em `!important`) não está no diff. Teste no CSS construído, com e sem `prefers-reduced-motion: reduce`:

   | Elemento | Sem redução | Com redução |
   |---|---|---|
   | `.action` (token `fast`) | transição 0,15 s | 0,00001 s |
   | `.ediv-public-menu` (token `slow` e `--ediv-ease-out`) | animação 0,25 s | 0,00001 s |
   | `.ediv-member-intro a` (token `fast`, três propriedades) | 0,15 s ×3 | 0,00001 s |
   | `.page-enter-motion` (`--ediv-ease-out`) | animação 0,26 s | 0,00001 s |

   Os tokens resolvem para os valores esperados e a regra global os cobre (`!important` vence o `var()` em qualquer camada). Os blocos de `reduce` dos arquivos, que usam `0ms`, seguem como estavam.
6. **Texto, cor, fonte.** O diff dos três CSS tem apenas as linhas de tokens, o `@source`, o comentário dele e as trocas de duração e easing; nenhuma linha de `color:`, `font-*`, `content:` ou valor de cor. O diff de `DashboardLayout.tsx` da 2B só mexe em classes de altura mínima.

## Comandos que rodei

| Comando | Resultado |
|---|---|
| Verificação mecânica dos literais (`git show HEAD:` contra o arquivo atual, script descartável fora do repositório) | 13 mudanças de valor, 0 inesperadas |
| Compilação do Tailwind em memória com e sem `@source not` (script descartável) | classes removidas listadas no achado 4 |
| Busca das classes removidas em `src`, `index.html`, `public`, `scripts`, `tailwind.config.js`, `site-pages.mjs` | nenhum uso sem prefixo |
| `/usr/bin/grep -c "\.ease-in-out{"` em `dist/assets/index-*.css` e no `dist-2f` | 0 e 1 |
| Medição do `min-height` do menu (Chrome headless, 320 px, CSS do `dist-2f` e do `dist`) | 44 e 44 px; controle 40 px |
| Movimento reduzido no CSS construído (Chrome headless) | tabela do ponto 5 |
| `npm run build`, `npm test`, `lint`, `tsc` | não executados (o Pincel está buildando; testes não são afetados por CSS) |

Observação sobre ferramenta: na minha sessão, uma saída de `grep -c` passada por um filtro devolveu `1` para `dist/` onde o `/usr/bin/grep` direto e uma checagem em Node devolveram `0`. Quem rodar o critério do brief deve usar `/usr/bin/grep` (ou `grep -cF`) para não se confundir.

Limites: Chrome headless de desktop; sem celular real; sem sessão logada; as capturas lado a lado do relato (30 de 30 iguais) não foram repetidas por mim.
