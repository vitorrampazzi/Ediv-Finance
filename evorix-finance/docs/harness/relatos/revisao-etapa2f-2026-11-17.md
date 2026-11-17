# Revisão da 2F (Pincel): glossário, página da empresa e PageLoading

Revisora: Lupa (somente leitura). Data: 17/11/2026. Padrão: `zizi-skills:code-quality`, dois eixos (padrões e especificação). Especificação: `docs/harness/briefs/etapa2-2F-pincel.md` mais a decisão do Orquestrador de 17/11 (altura mínima no `PageLoading`, sem pré-carregar `PublicStock`, sem mexer em `App.tsx`).

## Veredito: aprovado com ressalvas

Nada bloqueia a 2F. O objetivo medido (carga direta de `/glossario` e de `/ranking/acao/TIMS3`) foi atingido e eu reproduzi o `/glossario`. Há uma lacuna real que o relato não declara (achado 1) e uma lista de rotas que o QA precisa medir antes de dar o `PageLoading` por fechado (achado 2).

Revisei: `src/pages/Glossario.tsx`, `src/pages/PublicStock.tsx`, `src/components/PublicCompanySkeleton.tsx` (novo), `src/components/PageContent.tsx` e, em `scripts/prerender.mjs`, só a linha 115 (JSON do glossário). Ignorei o que é da 2A.

## Achados de padrões (por severidade)

### 1. [Média] Glossário: ao chegar por navegação no cliente, o rodapé ainda se move (CLS 0,59 e 0,56)
- Onde: `src/pages/Glossario.tsx:20-48` (leitura do JSON embutido) e `:53-55` (estado inicial).
- Problema: o JSON só existe no documento quando a página carregada **é** `/glossario`. Quem vem da home e clica em "Glossário" não tem o elemento `#ediv-glossario`, cai em `[]`, mostra "Carregando glossário…" (página curta) e depois a lista de 14 termos. O rodapé passa de fora da dobra para dentro dela e depois desce de novo.
- Prova (script descartável no scratchpad, Chrome headless, `dist/` novo, API simulada com 600 ms e o glossário real, clique no link real do rodapé da home):
  - 390×844: rodapé em 4362 → 912 (fallback) → **519** ("Carregando glossário…") → 2538 (lista). CLS **0,592**.
  - 1280×800: 880 → **470** → 2124. CLS **0,556**.
  - Carga direta de `/glossario` na mesma bancada: CLS **0,000** nas duas larguras. O que o relato mediu está certo.
  - Mesma bancada no `dist-base`: 0,874 (390) e 0,838 (1280). Melhorou, não resolveu.
- Por que importa: esse é o caminho comum do visitante (home → glossário). O critério de aceite do brief só mediu carga direta, então a 2F passa pelo texto do brief, mas o objetivo ("rodapé parar de se mover durante o carregamento de `/glossario`") fica pela metade.
- Correção sugerida (decisão do Orquestrador, nova entrega): reservar altura no estado vazio do glossário (esqueleto com `min-h` na área do `<dl>` enquanto `!terms.length`), sem depender do JSON embutido. Alternativa mínima: registrar como limite conhecido.

### 2. [Média, a medir] `min-h-svh` vale para todas as rotas; falta medir as que têm rodapé curto ou barra de rolagem
- Onde: `src/components/PageContent.tsx:9`. `PageLoading` aparece em quatro lugares:
  - `src/App.tsx:131` (Suspense de fora): troca a árvore inteira, sem cabeçalho nem rodapé. Só dispara quando um layout lazy (`DashboardLayout`) ainda carrega. Aqui `min-h-svh` é inofensivo.
  - `src/components/SiteChrome.tsx:403` (`PublicLayout`): o rodapé vem depois. É o caso que a 2F corrige.
  - `src/App.tsx:150` (rotas `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/verificar`): sem rodapé; `AuthShell` usa `min-h-screen` (`AuthShell.tsx:16`).
  - `src/layouts/DashboardLayout.tsx:514` (área logada): o rodapé fica **dentro** do `<main>`, logo após o `PageContent` (`:517-535`). O layout é `min-h-screen` (`:344` e `:464`).
- O que medi (client navigation a partir de `/`, chunks atrasados 700 ms, `dist/` novo), rodapé no fallback → rodapé final:
  - 390×844 (fallback 912): `/aprender` 1056, `/ranking` 1040, `/assessoria` 3124, `/privacidade` 3004, `/suporte` 2207, `/metodologia` 3093.
  - 1280×800 (fallback 880): `/aprender` 977, `/ranking` 985, `/assessoria` 1498, `/privacidade` 1860, `/suporte` 1611, `/metodologia` 2066.
  - Em todas, o rodapé final fica abaixo do rodapé do fallback e abaixo da dobra: sem salto para dentro da tela. CLS de 0,001 a 0,002 (0,021 e 0,024 em `/aprender`). O `dist-base` dava 0,55 a 0,87 nas mesmas rotas, então a correção é real nas rotas públicas.
- Risco que **não** consegui descartar:
  - `/ranking` e `/aprender` terminam com rodapé em ~985 a 1056 px. Em tela mais alta (por exemplo 1920×1080, `innerHeight` ~950 a 1000) o rodapé final já entra na dobra e volta a haver salto.
  - Área logada: o fallback tem altura de cabeçalho + padding + 100svh + rodapé, maior que a tela, então aparece barra de rolagem. O projeto usa `::-webkit-scrollbar` (`src/index.css:564`), isto é, barra clássica que ocupa largura. Em página logada curta, a barra some quando o conteúdo chega e o layout inteiro se desloca na horizontal. Não tenho sessão simulada para medir; é derivado do CSS, não observado.
  - Rotas de conta (sem rodapé): em `/cadastro` vi CLS 0,056 (390) e 0,015 (1280) com API simulada `{}`. Não comparei com a base nem identifiquei o nó.
- Rotas que o QA deve medir (client navigation, 390×844, 1280×800 e 1920×1080):
  - Públicas: `/ranking`, `/aprender`, `/assessoria`, `/metodologia`, `/suporte`, `/privacidade`, `/ranking/acao/<ticker>`.
  - Conta: `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/verificar`.
  - Logadas, a partir de `/app`: `/app`, `/app/aprender`, `/app/conversas`, `/app/perfil`, `/app/configuracoes`. Registrar CLS, posição do rodapé e se a barra de rolagem aparece ou some.

### 3. [Baixa] `PageLoading` com `min-h-svh` e esqueleto com `min-h-screen`: use o mesmo valor
- Onde: `PageContent.tsx:9` (svh) e `PublicCompanySkeleton.tsx:8` (screen).
- Resposta à pergunta 5: no desktop são iguais. No celular com a barra do navegador visível, `100vh` (=`lvh`) é maior que `100svh`; o rodapé do esqueleto fica mais abaixo que o do fallback, os dois fora da dobra, então não conta como salto. O problema é o caso inverso, que o próprio relato registra como limite: com a barra escondida, `innerHeight` cresce até `lvh` e o rodapé do fallback (cabeçalho + `svh`) pode entrar na dobra. `min-h-screen` (`100vh`) garante rodapé abaixo da dobra em qualquer estado da barra, e é o que `PublicLayout` (`SiteChrome.tsx:400`), `AuthShell` e o esqueleto já usam. Sugestão: `min-h-screen` nos dois e remover o limite do relato. Não bloqueia.

### 4. [Baixa] Sem teste que proteja o JSON embutido
- Onde: `scripts/prerender.mjs:115` e `src/pages/Glossario.tsx:20` repetem o id `ediv-glossario`; `grep -rn ediv-glossario tests` não acha nada.
- Risco: se o glossário ganhar uma terceira coluna, `isTermList` (`Glossario.tsx:22-32`, exige pares de 2 textos) rejeita tudo e volta a `[]` sem erro; o CLS volta e nada falha. Hoje os 14 itens passam (conferi).
- Sugestão para o QA/Vigia (o brief proibiu a Pincel de tocar em `tests/`): em `tests/seo.dist.mjs`, afirmar que `dist/glossario/index.html` tem exatamente um `<script type="application/json" id="ediv-glossario">` com os 14 pares e que as outras rotas não têm.

### 5. [Nit] Classe do contêiner duplicada
- `PublicCompanySkeleton.tsx:4` e `PublicStock.tsx:29` repetem `"mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10"`. Os dois precisam andar juntos (o esqueleto imita a página), então vale uma só origem. Não precisa nesta entrega.

### 6. [Nit] `prerender.mjs:115` junta ternário, template e `replaceAll` numa linha
- Legível o bastante, mas um júnior teria de parar para ler. Extrair `const glossaryJson = path === "/glossario" ? ... : ""` antes do `.replace` deixaria o fluxo em dois passos.

### FYI
- Usuário logado vê o esqueleto no formato da página pública durante a checagem de sessão (`PublicStock.tsx:34`) e depois o carregamento próprio de `StockResearch`. Os dois ficam com o rodapé fora da dobra, então não gera salto; só o formato muda. Já era assim (antes era uma linha de texto).
- `Glossario.tsx:61-72`: se a API devolver `glossary` indefinido, `setTerms(undefined)` quebra no `[...terms]`. Já era assim antes da 2F; não é regressão.

## Eixo da especificação

Cumprido (conferido no código):
- JSON embutido só em `/glossario`, fora de `#root`, com `<` escapado como o JSON-LD (`prerender.mjs:115`); id `ediv-glossario` documentado no relato.
- Leitura só no navegador, com `try/catch`, validação de `string[][]` e queda para `[]` (`Glossario.tsx:34-46`); `/api/learning` continua e só troca a lista se o conteúdo mudou (`:59-68`).
- Esqueleto único nos dois estados de espera (`PublicStock.tsx:34` e `:158`), `role="status"` com as frases originais em `sr-only`, `aria-busy="true"`, blocos `aria-hidden`.
- Estados de erro e de dado ausente, textos legais e `StockResearch` fora do diff.
- Decisão de 17/11: só a classe do `PageLoading` mudou; `role="status"`, "Abrindo página…", `motion-safe:animate-pulse` e `aria-busy` intactos; `App.tsx` sem mudança da 2F (o diff dele é a movimentação do `NavigationIntent`, da 2A); nenhum arquivo de `tests/` tocado pela 2F (`seo.dist.mjs` e `perf-baseline.mjs` são de outras entregas).

Parcial ou "parece pronto mas não está":
- "A lista não pode piscar nem mudar de ordem" vale só quando a página carregada é `/glossario` (achado 1).
- "Rodapé abaixo da dobra durante as duas esperas" foi provado em 390×844 e 1280×800; em telas mais altas depende do tamanho do conteúdo final (achado 2).

Fora do pedido: nada. A edição de `PageContent.tsx` foi autorizada em 17/11.

Não verificado por mim: a comparação de `dist/glossario/index.html` com o dist de base (critério do brief, passo 4). Conferi só que o JSON embutido é idêntico a `server/learning-content.js` (14 pares) e que não há `<` cru dentro dele.

## Respostas às seis perguntas

1. **`PageLoading` em todas as rotas:** ver achado 2 (quatro usos, rotas e larguras para o QA medir).
2. **JSON embutido:** seguro. `<` virar `<` impede `</script` e `<!--`; `&` não é decodificado dentro de `<script>`; U+2028/2029 são inertes em JSON e não existem nos dados. Fonte: `server/learning-content.js`, módulo estático do repositório, sem entrada de usuário. No cliente o texto é validado e renderizado como texto pelo React (sem `dangerouslySetInnerHTML`; `termId` só gera `id`). JSON ausente ou inválido, ou HTML antigo em cache, vira `[]` e se comporta como antes da 2F (achado 1 mostra o custo). O elemento fica fora de `#root`, então volta a valer ao reentrar em `/glossario` depois de navegar; a API reconcilia.
3. **Estado inicial e troca:** o pré-render usa `initialTerms={learning.glossary}` (`entry-server.tsx:21`) e o JSON embutido vem do mesmo `glossary`; ordem e texto idênticos e o componente ordena igual nos dois (`Glossario.tsx:76-79`). Carga direta: CLS 0,000. `sameTerms` compara com `JSON.stringify`, sensível a ordem, texto e tamanho, então qualquer mudança no servidor atualiza a tela; igual devolve `current` e não renderiza de novo.
4. **`PublicStock`:** `return user ? <StockResearch /> : <PublicCompany />` está intacto depois do `if (loading)`; o diff só troca o retorno de espera. Leitor de tela: `role="status"` com a frase original e `aria-busy`. Aviso educativo e textos legais não estão no diff.
5. **`min-h-screen` x `min-h-svh`:** achado 3.
6. **Regras da casa:** sem `tempo real`, `com atraso` ou data/hora de cotação (grep nos quatro arquivos, vazio); sem cor fixa (`#`, `rgb(`, `bg-white` etc.), só `evo-border`, `evo-bgSec`, `evo-textSec`; `motion-safe:animate-pulse` no esqueleto e no `PageLoading`; `grep -rn "server/" src` vazio.

## Comandos que rodei

| Comando | Resultado |
|---|---|
| `npm run lint` | passou (exit 0) |
| `npx tsc -p tsconfig.app.json --noEmit` | passou (exit 0) |
| `npm test` | passou: 298 pass, 0 fail |
| `node --test tests/seo.dist.mjs` | passou: 8 pass, 0 fail |
| `npm run build` | não executado (instrução: o `dist/` do Pincel é o que o QA mede) |
| Medição de rodapé e CLS | scripts descartáveis em `scratchpad` (fora do repositório), Chrome headless, servidor estático local sobre `dist/` e `.test-artifacts/dist-base/`, só `localhost`, API simulada; nada gravado no repositório além deste relato |

Limites: Chrome headless de desktop; sem celular real; sem sessão logada (rotas `/app` não medidas); 1920×1080 não medido.

## Rodada 2 (17/11/2026)

Revisora: Lupa, somente leitura. Diff: `src/pages/Glossario.tsx`, `src/components/PageContent.tsx`, teste novo em `tests/seo.dist.mjs`. Relato do Pincel: `interface-etapa2f-2026-11-16.md`, seção "Rodada 2". Não rodei build nem `npm test` (Vigia na fase 1 do QA); rodei só `node --test tests/seo.dist.mjs` (9 pass, 0 fail) e medições em Chrome headless sobre o `dist/` já construído, servido por um servidor estático local descartável fora do repositório.

### Veredito da rodada 2: aprovado (dois achados baixos, nenhum bloqueia)

### Os três achados anteriores

- **Achado 1 (glossário por navegação no cliente): resolvido, com resíduo menor que 0,1.** Repeti a bancada da rodada 1 (clique no link do rodapé da home, API com 600 ms, glossário real). 390×844: CLS **0,026** (era 0,592); 1280×800: **0,009** (era 0,556). A sequência do rodapé agora é 912 (fallback) → 2538 e 880 → 2124; some o degrau intermediário (519/470) que causava o salto. Carga direta continua 0,000 nas duas larguras. O resíduo é o link "Continuar aprendendo" (`a.action-secondary`) empurrado quando a lista chega, como o Pincel relata (0,0243 e 0,0078 nas medições dele; as minhas diferem na terceira casa, mesma ordem de grandeza).
- **Achado 3 (`min-h-svh` → `min-h-screen`): resolvido.** `PageContent.tsx:9`, só a classe mudou (`min-h-screen`), igual a `PublicLayout`, `AuthShell` e `PublicCompanySkeleton`. `role="status"`, texto e `motion-safe:animate-pulse` intactos. No fallback medido o rodapé fica em 912 e 880 (cabeçalho + 100vh).
- **Achado 4 (teste do JSON embutido): resolvido**, com uma lacuna de força (achado R2-1 abaixo).

### A condição do `min-h-screen` no glossário

`Glossario.tsx:92-94`: `` `...py-12${!terms.length && !error ? " min-h-screen" : ""}` ``. Casos, lendo o código:

| Estado | `terms` | `error` | `min-h-screen` |
|---|---|---|---|
| Direto em `/glossario` (JSON embutido) ou pré-render | 14 | vazio | não |
| Vindo de outra página, esperando a API | 0 | vazio | **sim** (o objetivo) |
| API respondeu | 14 | vazio | não (a altura é solta; o conteúdo é maior que a tela) |
| API falhou sem lista | 0 | preenchido | **não** (não prende a altura no erro) |
| API falhou com lista embutida | 14 | preenchido | não |
| Busca sem resultado | 14 | qualquer | não |

Conclusão: cobre só "carregando" e solta a altura no erro e depois da chegada dos termos. O texto "Carregando glossário…" (`:80-83`) usa a mesma condição, então os dois andam juntos.

### Força do teste do JSON embutido

Teste: `tests/seo.dist.mjs:166-193` ("glossário pré-renderizado embute a lista fora do #root, com o mesmo número de termos"). Ele lê só `dist/` e exige: um `script#ediv-glossario` com `type="application/json"` e conteúdo sem `<`; id único; script depois da abertura do `#root`; `<div>` abertos = fechados antes do script; JSON é lista não vazia de pares `[texto, texto]` não vazios; número de termos = número de `<dt>` do HTML.

Prova por mutação: copiei `dist/glossario/index.html` e o teste para um diretório temporário fora do repositório e mutei só a cópia (`dist/` real intocado: `git status dist` vazio).

| Mutação | Resultado |
|---|---|
| Controle sem mutação | passa |
| Script movido para dentro do `#root` | **falha** ("#root não está fechado antes do script") |
| Script antes do `#root` | **falha** ("script antes do #root") |
| JSON vira objeto em vez de lista de pares | **falha** ("lista vazia") |
| JSON `[]` | **falha** ("lista vazia") |
| Um termo a menos no JSON | **falha** ("termos do JSON diferem do HTML visível") |
| `<` cru dentro do JSON (sem escape) | **falha** (regex não acha o script) |
| Script duplicado | **falha** |
| Texto de um termo trocado, mesmo número | **passa** |
| Ordem dos termos invertida | **passa** |

Respostas diretas: falharia se o script fosse para dentro do `#root` (sim); se o formato do JSON mudasse (sim, para lista de pares textuais não vazios); se o número de termos divergisse do HTML (sim). Não falharia se o **texto** ou a **ordem** divergissem com a mesma contagem.

### Achados da rodada 2

**R2-1. [Baixa] O teste compara quantidade, não conteúdo.** `tests/seo.dist.mjs:190-192`. Um JSON com o mesmo número de pares e texto diferente do HTML (ou do `glossary` do servidor) passa; o cliente usaria esse texto como estado inicial e depois a API o trocaria (piscada). Hoje os dois vêm do mesmo `glossary`, então é difícil acontecer no build; a proteção é contra regressão futura. Sugestão: comparar o JSON com `glossary` de `server/learning-content.js` (testes podem importar `server/`; o brief só proibiu isso em `src/`), ou com os textos dos `<dt>`/`<dd>`.

**R2-2. [Baixa] Não há teste de que as outras rotas não têm o script.** Sugerido na rodada 1 como parte do achado 4; o Pincel fez só o lado `/glossario`. Um loop sobre `publicPages` sem `/glossario` afirmando ausência de `ediv-glossario` fecha isso. Não bloqueia.

**FYI.** Se a API responder com sucesso e `glossary: []`, `terms.length` fica 0 e sem erro: o texto "Carregando glossário…" e agora o `min-h-screen` persistem. Já era assim quanto ao texto (comportamento anterior à 2F); o dado real tem 14 termos, então não ocorre.

### Comandos

| Comando | Resultado |
|---|---|
| `node --test tests/seo.dist.mjs` | passou: 9 pass, 0 fail |
| Medição de CLS e rodapé (scratchpad, Chrome headless, `localhost`) | carga direta 0,000/0,000; clique 0,026 (390) e 0,009 (1280) |
| Mutações do HTML do glossário (cópia em diretório temporário) | tabela acima |
| `npm run build`, `npm test`, `lint`, `tsc` | não executados nesta rodada (instrução do Orquestrador) |

Limites: Chrome headless de desktop; API simulada; sem celular real; sem sessão logada.
