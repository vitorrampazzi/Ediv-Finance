# Revisão da 2C (Pincel): skeletons de `RankingHighlights` e `ResearchSample`

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality` (dois eixos, severidade). Especificação: `docs/harness/briefs/etapa2-2C-pincel.md`, com os ajustes do Orquestrador (item 2, `PageLoading`, fora: feito na 2F; padrão do `PublicCompanySkeleton` sem `min-h-screen`) e as decisões 6 (resíduo de 12 px na amostra da home e +48 px quando a cotação falha: aceitos, não são achados). Relato do executor: `docs/harness/relatos/interface-etapa2c-2026-11-16.md`.

Revisei: `src/components/RankingHighlights.tsx`, `src/components/home/ResearchSample.tsx`, `src/components/home/public-sections.css`.

## Veredito: aprovado com ressalvas

Nada bloqueia. A parte visual faz o que o brief pede (reproduzi a altura do skeleton e do conteúdo carregado da home e do `/ranking`, CLS 0). Há uma troca de texto fora do ramo de carregamento que aparece no estado de erro (achado 1) e um atributo de acessibilidade que não tem efeito (achado 2).

## Achados de padrões (por severidade)

### 1. [Baixa] Subtítulo do `RankingHighlights` mostra o texto de margem e brapi quando a publicação falha
- Onde: `src/components/RankingHighlights.tsx:144`: `!publication || entries.some((entry) => entry.dividendAnalysis)`.
- O que o ramo mostra, por estado (conferido no código; `error` não altera `publication`, que fica `null`):

| Estado | `publication` | `error` | Subtítulo |
|---|---|---|---|
| Carregando | `null` | vazio | "Consulte as análises de dividendos: preço de mercado da brapi.dev, e a margem de segurança que acompanha a cotação." (**mudou**; antes "Leia a tese e confira o prazo de cada cenário.") |
| Erro da publicação (inclui 401 sem renovar) | `null` | preenchido | o mesmo texto de margem e brapi (**mudou**, e é o caso que você perguntou) |
| Publicação sem análise de dividendos | preenchido | vazio | "Leia a tese…" (igual); só que, durante o carregamento, o texto de dividendos aparece e depois troca, o que é a pendência já declarada no relato §6 |
| Publicação com análise | preenchido | vazio | texto de dividendos (igual) |
| Demonstração (`entries` vazio) | preenchido | vazio | "Abra uma empresa de exemplo…" (igual; `showingDemo` vem antes) |

- Problema: no erro, a tela diz "Consulte as análises… preço de mercado… margem de segurança" bem em cima de "A publicação não pôde ser carregada agora." Não há número nem texto proibido, e é cópia descritiva; mas anuncia uma capacidade que acabou de falhar. Além disso, a edição está fora do que o brief permitia ("só o estado de carregamento"); o relato a declara (§2, §6).
- Correção sugerida (uma linha): `(!publication && !error) || entries.some(...)`. No erro volta ao texto anterior, que não promete margem.

### 2. [Baixa] `aria-busy="true"` está num elemento `aria-hidden`: não tem efeito
- Onde: `RankingHighlights.tsx:192-196` e `ResearchSample.tsx:54-58`.
- Resposta à pergunta 4: `aria-hidden="true"` tira o elemento e os descendentes da árvore de acessibilidade, então `aria-busy` ali não é exposto a ninguém. O texto `role="status"` sr-only está *fora* desse elemento, como irmão. O brief e o padrão do `PublicCompanySkeleton` pedem `aria-busy` no contêiner que também tem o status (lá, a `<section>`).
- Correção sugerida: um `<div aria-busy="true">` sem classe envolvendo o status sr-only e o bloco `aria-hidden` (não muda o layout se o pai for bloco; conferir que o pai de `ResearchSample` não é flex/grid com `gap`). Não mexe na altura nem na animação.

### 3. [Baixa, Optional] Marcação da linha duplicada, sem nada que force as duas cópias a andar juntas
- Onde: `RankingHighlights.tsx:186-240` (skeleton) copia as classes da linha em `:256-310`; `ResearchSample.tsx:53-106` copia o cartão de `:131-199`.
- Por que importa: a altura igual só vale enquanto as duas cópias têm as mesmas classes. Quem editar a linha carregada sem olhar o skeleton traz o CLS de volta, e nenhum teste avisa. O comentário "Same classes… " ajuda, mas só em um dos lados. Os arquivos já estavam acima da dica de tamanho (266 e 216 linhas no HEAD) e agora têm 324 e 270.
- Sugestão: um comentário no ramo carregado apontando o skeleton (mínimo) ou extrair um componente de linha que receba `entry` ou `null`. Não bloqueia.

### FYI
- `LockedRows` (`ResearchSample.tsx:107`) aparece no skeleton sempre que `lockedPreview`; no estado carregado só com `publication.entries.length >= 3` (`:201`). Com a API entregando 3 entradas, não diferem.
- Estados de erro ou vazio depois do skeleton: o bloco encolhe. Com uma API simulada que devolve `{}`, medi CLS 0,19 (390 px) e 0,04 (1280 px) em `/ranking`. Antes da 2C o `min-height` fixo também reservava um bloco grande que colapsava no erro, então não é regressão clara; é estado raro.
- `h-[1lh]`: em navegador sem a unidade `lh` a classe é inválida, a altura vira automática e o `&nbsp;` transparente mantém uma linha, então a altura continua certa. Raciocínio, não teste.

## Eixo da especificação

Cumprido:
- Dois skeletons com a estrutura do conteúdo final, 3 cartões ou linhas fixos (`slice(0, 3)`), variante `lockedPreview` mantida.
- `role="status"` com "Carregando publicação…" e "Carregando ranking publicado…" em `sr-only`; `motion-safe:animate-pulse`; barras só com `bg-evo-border/…`.
- Erro, vazio e dado ausente intocados (o diff só tem o ramo de carregamento, a constante e o `:144`). `src/App.tsx` e `PageContent.tsx` não foram editados pela 2C.
- Medição de altura reproduzida por mim (abaixo).

Fora do pedido: a mudança em `RankingHighlights.tsx:144` (achado 1), declarada pelo executor. A constante `publicationNote` é necessária para o skeleton e é refatoração aceitável.

Aceito pelo Orquestrador, registrado sem ser achado: 12 px de diferença na amostra da home e +48 px quando a cotação falha.

Não verificado por mim: as alturas do `RankingHighlights` (exigem sessão logada) e o `animationName` com movimento reduzido (conferi só o uso de `motion-safe:`, que é o padrão do Tailwind).

## Respostas aos pontos

1. **Condição do subtítulo:** tabela do achado 1.
2. **Texto da `publicationNote`:** idêntico. Apliquei a regra de espaços do JSX (linhas aparadas e unidas por um espaço) ao trecho de `git show HEAD:…/ResearchSample.tsx` e comparei com a constante: `"DY e P/L da pesquisa publicada; a margem de segurança acompanha a cotação da brapi.dev. Margem de segurança não representa retorno garantido."`, 146 bytes nos dois, sem CRLF, sem entidades. Fora do carregamento, o texto na tela não muda; durante o carregamento, o cabeçalho "Ranking de Ações" e essa nota passam a aparecer (dado estático, não numérico).
3. **Regras de casa:** sem número nem valor no skeleton (só barras e rótulos estáticos: "Preço de mercado", "Preço teto", "Margem de segurança", "Pesquisa de dividendos", "Ler pesquisa"); sem `tempo real` nem `com atraso`; sem cor fixa nem `style=`; só `evo-border`, `evo-textSec`, `evo-accent` e `text-transparent`; `motion-safe:animate-pulse`; nenhum import de `server/`. O aviso "Margem de segurança não representa retorno garantido" continua no carregado e agora também no skeleton; nenhum texto legal ou educativo aparece no diff como alterado.
4. **`aria-busy`:** achado 2.
5. **CSS removido (24 linhas):** exatamente `.ph-ranking-loading`, `.ph-ranking-loading-locked`, as duas regras de `@media (min-width: 768px)` e `1100px` e o comentário delas. `grep -rn ph-ranking-loading` em `src`, `scripts`, `tests`, `server`, `site-pages.mjs` e `index.html`: nenhuma ocorrência; `dist/index.html`, `dist/ranking/index.html` e `dist/assets/*.css`: nenhuma; só `docs/` cita. `.ph-ranking-state`, `.ph-ranking-publication`, `.ph-ranking-company*` e `.ph-ranking-qualifier` seguem em uso.
6. **Decisões do Orquestrador:** respeitadas, ver acima.

## Medição que reproduzi

Script descartável em `scratchpad`, Chrome headless, `localhost`, servidor estático sobre o `dist/` atual, fixture fictícia de `.test-artifacts/perf-api/rankings-public.json` (corpo `body`), API atrasada 900 ms. Altura de `#caderno-de-exemplo` no skeleton → carregado, e CLS:

| Página | Largura | Skeleton | Carregado | Diferença | CLS |
|---|---|---|---|---|---|
| `/` | 390 | 1472 | 1484 | 12 px | 0,000 |
| `/` | 1280 | 773 | 785 | 12 px | 0,000 |
| `/ranking` (`lockedPreview`) | 390 | 1375 | 1387 | 12 px | 0,000 |
| `/ranking` (`lockedPreview`) | 1280 | 853 | 866 | 13 px | 0,000 |

Bate com o relato (1472/1484 e 773/785). O próximo elemento acompanha o bloco (na home, mesmos 12 px).

## Comandos que rodei

| Comando | Resultado |
|---|---|
| `npm run lint` | passou (exit 0) |
| `npx tsc -p tsconfig.app.json --noEmit` | passou (exit 0) |
| `npm test` | passou: 298 pass, 0 fail |
| `npm run build` | não executado (instrução) |
| Medição de altura e CLS (scratchpad) | tabela acima |

Limites: Chrome headless de desktop; fixture fictícia; sem sessão logada (não medi `RankingHighlights`); sem celular real.

## Rodada 2 (17/11/2026)

Revisora: Lupa, somente leitura. Diff: `src/components/RankingHighlights.tsx` (condição em `:143-145`, `aria-busy` em `:188`) e `src/components/home/ResearchSample.tsx` (`aria-busy` em `:49`). Relato do Pincel: `interface-etapa2c-2026-11-16.md`, seção "Rodada 2". Por pedido do Orquestrador (o Pincel está na C2, apagando órfãos, e vai buildar), não rodei build, `npm test`, lint nem `tsc`: li o código e o CSS.

### Veredito da rodada 2: aprovado, achados 1 e 2 resolvidos, sem achados novos

### Achado 1 (subtítulo no erro): resolvido
- `RankingHighlights.tsx:143-145`: `: (!publication && !error) || entries.some((entry) => entry.dividendAnalysis) ? "Consulte as análises de dividendos…" : <>Leia a tese e confira o prazo de cada cenário.</>`. A precedência está certa (`||` liga antes do `?:`).
- Comparação com `git show HEAD:evorix-finance/src/components/RankingHighlights.tsx` (HEAD usa só `entries.some(...)`). Estados possíveis (o erro só existe com `publication` nulo; "Tentar novamente" zera o erro antes de refazer o pedido):

| `publication` | Erro | Análise | Usa o texto de dividendos: HEAD | agora |
|---|---|---|---|---|
| nulo | não | n/a | não | **sim** (carregando; é o que evita a troca de altura) |
| nulo | **sim** | n/a | não | **não** (igual ao HEAD: "Leia a tese e confira o prazo de cada cenário.") |
| preenchido | não | sem análise | não | não |
| preenchido | não | com análise | sim | sim |

  A demonstração (`showingDemo`) vem antes e não mudou. Resultado: no erro o subtítulo é idêntico ao de HEAD; a única diferença contra HEAD é o estado "carregando sem erro", já declarado.

### Achado 2 (`aria-busy`): resolvido
- `RankingHighlights.tsx:188` e `ResearchSample.tsx:49`: `<div aria-busy="true">` sem classe, envolvendo o `<p role="status" className="sr-only">` e o bloco `aria-hidden`. O `aria-busy` saiu dos elementos `aria-hidden` (a busca por `aria-busy` nos dois arquivos mostra só essas duas ocorrências). O `div` fecha depois do bloco `aria-hidden` em `RankingHighlights.tsx:247`; em `ResearchSample.tsx:107` fecha depois de `{lockedPreview && <LockedRows />}`, que passa a ficar dentro do contêiner (já é `aria-hidden` por conta própria).
- Sem efeito de layout, pelo CSS:
  - `ResearchSample`: o pai é `.ph-container` (`public-home.css:11-14`: `width` e `margin-inline`; e `public-sections.css:5-7`: `min-width: 0`). Sem `flex`, `grid` nem `gap`. Nenhuma regra em `src/components/home/*.css` depende de filho direto nem de irmão adjacente do `.ph-container`, de `.ph-ranking-publication` ou de `.ph-ranking-preview` (busca por `>`, `+` e `~` dessas classes: nenhuma).
  - `RankingHighlights`: o pai é a `<section class="mx-auto max-w-7xl py-5 …">`, bloco comum. O `div` novo não tem borda, preenchimento nem formato de contexto, então a margem superior do `p.mt-5` interno continua colapsando como antes; o `<p class="sr-only">` é absoluto e já não entrava no fluxo.
- O relato do Pincel diz ter remedido a home com a fixture fictícia: 1472/1484 px (390) e 773/785 px (1280), a mesma diferença de 12 px da rodada 1. Não repeti a medição (o `dist/` está em uso pela C2); a análise acima não prevê mudança de altura.

### FYI
- `aria-busy="true"` num ancestral da região `role="status"` faz alguns leitores de tela adiarem o anúncio até o fim do carregamento; é o mesmo padrão do `PublicCompanySkeleton` e o que o brief pediu, então não é defeito desta entrega.

### Comandos
Nenhum comando de verificação executado nesta rodada (build, `npm test`, lint e `tsc` ficaram com o Pincel). Conferências feitas por leitura de código e CSS, `git show HEAD:` e uma tabela de verdade da condição.
