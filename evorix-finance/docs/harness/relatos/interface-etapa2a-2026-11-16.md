# Etapa 2A: peso das páginas públicas (16/11/2026)

Autor: Pincel (interface). Brief `docs/harness/briefs/etapa2-2A-pincel.md`. Nota "Contexto Escola" lida (seções 3, 4 e 10). Nenhuma tela, texto, regra financeira ou cotação foi alterada. Commit, push e deploy não foram feitos. A árvore está pronta para a revisão da Lupa.

## 1. Causa (antes da correção)

- **Item 1 (framer-motion na home).** A causa é `src/pages/Home.tsx:6`, que reexportava `HomeContent` de `AccountHomeContent`. Saída de `grep -rn "HomeContent" src tests scripts`:
  - `src/components/home/AccountHomeContent.tsx:22`: definição.
  - `src/pages/Home.tsx:6`: reexportação, sem uso (removida).
  - `src/pages/MemberHome.tsx:1` e `:6`: único uso real, importa direto de `AccountHomeContent` (não mudou).
  - `scripts/prerender.mjs:37`: filtro de CSS da home.
  - O uso é só de `MemberHome`, então não houve parada. Essa reexportação puxava `AccountHomeContent` → `SegmentedControl` → `use-reduced-motion` para dentro da home pública.
  - Correção ao meu relato 1A: eu afirmei que a home não baixava framer-motion. Estava errado. Meu grafo partiu de `components/home/PublicHome.tsx` e não de `pages/Home.tsx`, então não viu a reexportação. O Orquestrador e o Vigia estavam certos.
- **Item 2 (pré-carga de StockResearch).** `src/components/NavigationIntent.tsx:49-50` pré-carregava `pageImports.stockResearch` para qualquer link `/ranking/acao/<ticker>`. Para visitante, `PublicStock.tsx:38` renderiza `PublicCompany`, então o download era desperdiçado.
- **Item 3 (logo).** `public/ediv-logo-clean.png` (138.503 B, 512×512, RGBA) é exibido em 508×503 duas vezes em `PublicHeroBrand.tsx`.
- **Item 4 (ícones).** Cinco `<img src="/ediv-icon-clean-192.png">` sem `width`/`height`.

## 2. Arquivos alterados

| Arquivo | Linhas | Mudança |
|---|---|---|
| `src/pages/Home.tsx` | 6 (removida) | Removida a reexportação de `HomeContent`. Nada mais mudou nesse arquivo. |
| `src/App.tsx` | 11 (import), 127-128 | `<NavigationIntent />` saiu de logo após `<PageMetadata />` e entrou logo após `<AuthProvider>`. Nenhuma outra linha mudou. `git diff -- src/App.tsx` mostra só essa troca. |
| `src/components/NavigationIntent.tsx` | 2, 46, 53, 74-80, 131 | Lê `useAuth()` (`user`, `loading`). Guarda o estado de sessão num `ref` atualizado por `useEffect`, sem recriar os ouvintes. `importsForPath(pathname, signedIn)` escolhe `stockResearch` (logado) ou `publicStock` (visitante ou sessão carregando). |
| `src/components/home/PublicHeroBrand.tsx` | 43-54, 55-66 | Cada `<img>` do logo fica dentro de `<picture>` com `<source type="image/webp" srcSet="/ediv-logo-clean.webp" />`. `className`, `alt`, `width`, `height`, `decoding`, `draggable` mantidos. Nenhum `loading`/`fetchpriority` existia, nenhum foi acrescentado. |
| `src/components/auth/AuthShell.tsx` | 23 | `width="192" height="192"`. |
| `src/components/SiteChrome.tsx` | 90, 259 | `width="192" height="192"` em cada uma. |
| `src/layouts/DashboardLayout.tsx` | 373, 468 | `width="192" height="192"` em cada uma. |
| `scripts/prerender.mjs` | 37 | Só o filtro `pageCss` da home: incluído `usePublicHomeMotion` no padrão. Motivo na seção 3. |
| `public/ediv-logo-clean.webp` | novo | 33.452 B. Ver seção 5. |

Escolha do item 2 (ouvintes): `NavigationIntent` registra os ouvintes uma vez, como antes. A sessão vai para um `ref`, então mudanças de login não recriam os ouvintes. Se a sessão ainda estiver carregando, o componente trata como visitante, o que é o caminho seguro.

## 3. Item 1: provas no `dist/`

Build final (ver seção 8), árvore com as alterações acima.

- `dist/assets/Home-BPAXJ99O.js`: `grep -c "AccountHomeContent\|SegmentedControl"` = **0**. Tamanho 16.496 B bruto, 5.215 B gzip (antes: `Home-CAkMr9q1.js`, 16.519 B).
- `dist/assets/index-*.js` ainda contém uma ocorrência de `use-reduced-motion-Cu8INE8G.js`. Ela pertence à lista de pré-carga de rotas logadas (`AccountHomeContent`, `DashboardLayout`), não à home. A prova que vale é a de tempo de execução, abaixo: `/` não pede nenhum `use-reduced-motion-*.js`.
- Tempo de execução (Playwright, `/`, novo x base): framer (`use-reduced-motion-*.js`) **não** pedido no novo; **pedido** no base.

**CSS da home (risco da brief).** O `.css` com `.home-areas` passou a ser `usePublicHomeMotion-CwbDiM4M.css`, não mais `AccountHomeContent-*.css`. O filtro original não o incluía, e a home ficaria sem o CSS dos cards no HTML. Com a mudança em `prerender.mjs:37`, `dist/index.html` passou a ter `usePublicHomeMotion-CwbDiM4M.css` entre os `<link rel="stylesheet">`. Comparação dos `<link>` (nomes sem hash) com `dist-base`:
- `404`, `acao`, `app`, `aprender`, `assessoria`, `cadastro`, `entrar`, `glossario`, `metodologia`, `privacidade`, `ranking`, `recuperar-senha`, `redefinir-senha`, `suporte`, `verificar`: **mesmos** nomes de CSS.
- `index.html` (home): único diferente, `AccountHomeContent` → `usePublicHomeMotion`. Esperado.
- Sem JavaScript, `/` mostra os três cards estilizados (Ranking de Ações, Aulas, Glossário): `display: grid`, `min-height: 96px`, borda 1px, fundo `rgb(226, 238, 232)`.

**Ponto de atenção que não é meu.** O hash de `index-*.css` mudou (`index-DgvI6xnq.css` no base, `index-Emwc4ruQ.css` no novo). A diferença é aditiva: dois utilitários Tailwind `.ease-out` e `.ease-in-out`, a propriedade `@property --tw-ease` e as variáveis `--ease-out`/`--ease-in-out` no tema (+309 B). Nenhuma regra existente mudou. Nenhum dos arquivos que eu alterei contém essas palavras. As classes aparecem em `src/index.css` e em `src/components/home/teaching-journey.css`, ambos já no commit. A origem exata não confirmei: o `dist-base` pode ter sido gerado de outra árvore. Vale a Lupa conferir.

## 4. Item 2: pré-carga

Teste (Playwright, Chrome do sistema, rota `/glossario`): link `<a href="/ranking/acao/TIMS3">` injetado, `hover` e `focus`, 2 s de espera. Ferramenta: as mesmas do passo 7 do brief.

| Build | Visitante (sem sessão) | Logado (simulado) |
|---|---|---|
| novo (4173) | `StockResearch-*.js`: **nenhum**. `PublicStock-Ct6ZJS9D.js`: pré-carregado. | `StockResearch-DdH5Huu8.js`: pré-carregado. |
| base (4174) | `StockResearch-BaarZCF0.js`: pré-carregado (comportamento antigo, que este item corrige). | `StockResearch-BaarZCF0.js`: pré-carregado. |

Logado: `GET /api/auth/me` respondido por `page.route` com um usuário fictício (`conta-teste@exemplo.invalid`, `role: USER`). A simulação funcionou: o componente pré-carregou `StockResearch` como esperado. Não testei páginas logadas inteiras.

## 5. Item 3: logo em WebP

- **Método.** Chrome do sistema (`channel: 'chrome'`) via o Playwright já presente em `node_modules` (versão 1.62.1). Nenhum pacote instalado e nenhum navegador baixado (o `npx playwright install` não foi executado). O PNG foi desenhado num `canvas` 512×512 com fundo limpo e exportado com `canvas.toBlob(cb, "image/webp", 0.9)`, alfa preservado. Script descartável em `scratchpad`, já apagado.
- **Tamanhos.** PNG 138.503 B. WebP 33.452 B. Redução de **75,9%**, acima do mínimo de 40% (limite 83.101 B).
- **Dimensão e alfa.** WebP 512×512 (relido no mesmo Chrome). Pixel de canto transparente: alfa 0, igual ao PNG. Pixel central desenhado.
- **Igualdade visual.** Comparação pixel a pixel do PNG e do WebP nas dimensões exibidas: 508×503 (255.524 px) diferença média 0,40 em 255, máxima 24,9 por canal, 0 pixels com diferença de alfa acima de 8. O mesmo vale para 254×252 e 1016×1006.
- **Decisão: adotado.** O PNG continua em `public/` como fallback do `<picture>`.
- **Layout.** `hero-brand.css` define `.ph-brand-logo` como absoluto, 100% do `.ph-brand-mark`, que tem tamanho pelo `aspect-ratio`. O `<picture>` não muda essa geometria. Medido em novo x base: retângulos de `.ph-brand-mark`, `.ph-brand-logo-main`, `.home-area-link` e `h1` **iguais** em 320, 768 e 1280 px, claro e escuro. Nenhum ajuste de CSS foi necessário.
- **Capturas** (`fullPage`, movimento reduzido, claro e escuro, 320, 768 e 1280 px; arquivos em `scratchpad/shots/`): dimensões iguais em todos os pares. Pixels com diferença acima de 8 por canal: 1 e 11 (320 e 768 px), 103 e 97 (1280 px claro e escuro), de cerca de 5,4 milhões. Diferença máxima 24. Nenhum salto de layout. Diferença atribuída à compressão do WebP.

## 6. Item 4: dimensões nos ícones

`grep -rn "ediv-icon-clean-192" src` encontra 5 tags. Cada uma tem `width="192" height="192"` (confirmado por contagem por arquivo: AuthShell 1/1, SiteChrome 2/2, DashboardLayout 2/2). Classes e `alt` não mudaram. Os tamanhos exibidos continuam vindo de `h-8 w-8`, `h-9 w-9` e `h-10 w-10`. Visual igual (as capturas da seção 5 incluem o cabeçalho).

## 7. Medição: antes e depois

Playwright, `/`, carregamento com espera de 2,5 s. Tamanhos são **bytes decodificados** das respostas JS (não gzip nem transferido). Os números não mudam entre 390 e 1280 px, como esperado.

| Métrica | Base (4174) | Novo (4173) |
|---|---|---|
| Arquivos JS pedidos | 25 | 19 |
| Bytes JS decodificados | 649.875 | 498.212 |
| `use-reduced-motion-*.js` pedido | sim | não |
| `StockResearch-*.js` pedido na home | não | não |
| `Home-*.js` (bruto) | 16.519 B (`Home-CAkMr9q1.js`) | 16.496 B (`Home-BPAXJ99O.js`) |

Redução de 151.663 B decodificados (cerca de 23%) na home. O número oficial de transferência (gzip, LCP e CLS) é do Vigia no QA. Não usei `tests/perf-baseline.mjs`.

## 8. Comandos rodados e resultados

| Comando | Resultado |
|---|---|
| `grep -rn "HomeContent" src tests scripts` | Passou (saída na seção 1). |
| `npm run lint` | **Passou** (exit 0), rodado duas vezes (antes e depois do `prerender.mjs`). |
| `npx tsc -p tsconfig.app.json --noEmit` | **Passou** (exit 0). |
| `npm test` | **Passou**: 298 pass, 0 fail. |
| `npm run build` | **Passou**, rodado duas vezes. A segunda foi necessária porque o `prerender.mjs` mudou depois da primeira. |
| `grep -c "AccountHomeContent\|SegmentedControl" dist/assets/Home-*.js` | 0. |
| `grep -l "home-areas" dist/assets/*.css` | `usePublicHomeMotion-CwbDiM4M.css`. |
| `grep -o 'href="/assets/[^"]*css"' dist/index.html` | Inclui o CSS dos cards. |
| `npx vite preview --port 4173` e `--outDir .test-artifacts/dist-base --port 4174` | Passou. Servidores encerrados ao final. A 4175 do Vigia não foi usada. |
| Script Playwright (medição, pré-carga, visual, sem JS) | **Passou**. |
| Comparação de pixels (6 pares) | **Passou** (seção 5). |
| `git diff -- src/App.tsx scripts/prerender.mjs` | Só as mudanças descritas acima. |
| `node scripts/harness.mjs check` | **Passou** (quadro válido, saída 0), antes e depois do release. Quadro: interface em `revisao`, reservas liberadas. |

Não executados: nenhum. Não rodei `npm run build` em outros arquivos. O Tijolo e o Vigia não rodaram build.

## 9. Limites e próximo passo

- **Limites.**
  - Sem API local: a home aparece com dados vazios no novo e no base, então a comparação é justa, mas não mostra o estado com dados.
  - O logado é simulado com usuário fictício e só `/api/auth/me`. Páginas logadas inteiras não foram testadas.
  - Bytes decodificados, não transferidos. Sem LCP ou CLS (é papel do Vigia).
  - O hash de `index-*.css` mudou por causa de utilitários Tailwind que não vêm das minhas edições (seção 3).
- **Risco a registrar.** O filtro `pageCss` da home depende do nome do chunk, `usePublicHomeMotion-*`. Se o hook for renomeado ou o chunk reagrupado, a home perde o CSS dos cards sem erro de build. Sugiro que a Lupa ou o QA tenha uma checagem automática de `.home-areas` em `dist/index.html`.
- **Não tocado (fora do escopo):** tokens de movimento, skeletons, `min-h` do menu (2B e 2C). `/app` continua usando framer-motion, como planejado.
- **Próximo passo.** Revisão da Lupa desta árvore, incluindo o diff de `prerender.mjs` e o comportamento do `NavigationIntent` quando a sessão muda. Depois, a medição oficial do Vigia (1E) no QA.

## Ajustes da revisão

Pedidos pelo Orquestrador após a revisão da Lupa. Os três estão feitos.

1. **Filtro `pageCss` (`scripts/prerender.mjs`).**
   - (a) O pré-render agora lança erro quando algum padrão de `pageCss` não casa nenhum CSS em `dist/assets`. A mensagem traz a rota e o padrão. Prova: com o padrão de `"/"` trocado por um que não casa nada, `npm run build` saiu com código 1 e a mensagem `prerender: nenhum CSS em dist/assets casa /^(?:NaoExiste)-[\w-]+\.css$/ (rota /)`. Depois o padrão foi restaurado. Confirmado por `grep` que `NaoExiste` não está mais no arquivo.
   - (b) Removida a alternativa `AccountHomeContent` do padrão de `"/"`. Ficou `/^(?:Home|ResearchSample|usePublicHomeMotion)-[\w-]+\.css$/`.
   - O mecanismo não mudou (continua por nome de chunk; manifesto do Vite fica para depois).
2. **Teste em `tests/seo.dist.mjs`.** Novo teste "home pré-renderizada carrega a folha que traz os cards e a marca", logo após o teste de links internos. Lê os `<link rel="stylesheet">` de `dist/index.html` e exige um arquivo em `dist/assets` com `.home-areas` e `.ph-brand`. Resultado: `usePublicHomeMotion-CwbDiM4M.css` contém as duas classes. Verificado que a condição dá `false` quando a folha é retirada da lista.
3. **Pré-carga logada (`src/components/NavigationIntent.tsx`).** Em `/ranking/acao/<ticker>`, logado pré-carrega `[pageImports.publicStock, pageImports.stockResearch]`. Visitante e sessão carregando continuam só com `publicStock`. Essa mudança não foi reexecutada no navegador nesta rodada: é só a ordem da lista, e lint e tsc passaram.

Validação desta rodada:

| Comando | Resultado |
|---|---|
| `npm run lint` | Passou (exit 0). |
| `npx tsc -p tsconfig.app.json --noEmit` | Passou (exit 0). |
| `npm test` | Passou: 298 pass, 0 fail. |
| `npm run build` | Passou (exit 0). Com o padrão quebrado, falhou com exit 1 (item 1). |
| `node --test tests/seo.dist.mjs` | Passou: 8 de 8 (inclui o teste novo). |

As portas 4173 e 4174 não foram usadas nesta rodada. A 4175 do Vigia não foi tocada.
