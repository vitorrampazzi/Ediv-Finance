# Brief 2F — Pincel: CLS do glossário e da página pública da empresa

Para: Pincel (interface). Etapa 2. **Só comece depois que o Orquestrador disser que a 2A passou na revisão** e o Pincel liberou os caminhos dela (a 2F usa `src/App.tsx` e `scripts/prerender.mjs`, que a 2A também alterou).

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
node scripts/harness.mjs claim interface src/pages/Glossario.tsx src/pages/PublicStock.tsx src/components/PublicCompanySkeleton.tsx src/App.tsx scripts/prerender.mjs docs/harness/relatos/interface-etapa2f-2026-11-16.md
node scripts/harness.mjs update interface trabalhando "2F: CLS do glossário e da página pública da empresa"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Se `status` mostrar que outro papel reservou um desses caminhos, **pare** e avise. Ao terminar:

```
node scripts/harness.mjs update interface revisao "2F pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Fazer o rodapé parar de se mover durante o carregamento de `/glossario` e de `/ranking/acao/<ticker>` (visitante), sem esconder conteúdo.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 2F. Evidência: `docs/harness/relatos/qa-cls-2026-11-16.md` (Vigia, 1E).
- "Antes" oficial, medido pelo Vigia com `MOCK_API=1` no dist de base (atraso 600 ms; relato qa-cls, seção 3). **Não meça o "antes" de novo.**

  | Página | 390 px | 1280 px |
  |---|---|---|
  | `/glossario` | 0,411 | 0,422 |
  | `/ranking/acao/TIMS3` | 0,699 | 0,334 |

- **Glossário (causa confirmada pelo Orquestrador no código e pelo Vigia).** `src/main.tsx:2,12` usa `createRoot` (não hidrata). O pré-render passa `initialTerms={learning.glossary}` (`src/entry-server.tsx:21`), mas o cliente renderiza `<Glossario />` sem termos (`src/App.tsx:135`). Na primeira pintura, o React troca a lista pré-renderizada por "Carregando glossário…" (`src/pages/Glossario.tsx:50-53`), a página encolhe e cresce de novo quando `/api/learning` responde. O rodapé e `a.action-secondary` se movem (0,411 em 390 px).
- **Página pública da empresa (causa provável; o Vigia não a fechou).** `dist/acao.html` tem `#root` vazio. Com a sessão carregando, `src/pages/PublicStock.tsx:32-36` mostra só "Verificando seu acesso à pesquisa…", sem altura reservada, e o rodapé sobe para a tela. Quando `/api/auth/me` responde, `PublicCompany` mostra `min-h-[70vh]` com "Carregando a pesquisa da empresa…" (`PublicStock.tsx:159-164`): primeiro salto do rodapé (~2,1 s em produção). Quando os dados chegam, o conteúdo passa de 70vh: segundo salto (~2,5 s).
- **Limites da reprodução local de `/ranking/acao/TIMS3` (relato qa-cls, seções 3 e 4):**
  - Atualização do Orquestrador: depois do relato 1E, o Vigia passou a simular `/api/rankings/public` com dados **fictícios** (`.test-artifacts/perf-api/rankings-public.json`, TIMS3 entre as 3 entradas). O "antes" oficial foi medido com esse mock: `/ranking/acao/TIMS3` 0,628 (390 px) e 0,359 (1280 px); `/glossario` 0,411 e 0,422. A página termina com o conteúdo, não em erro.
  - O salto inicial de 0,14 visto antes do mock pode ter sido do estado de erro; relate se ainda aparece.
  - Relate em que estado a página terminou em cada medição (conteúdo ou erro).
- Dado público: o glossário já está no HTML pré-renderizado como texto visível. `scripts/prerender.mjs` já usa `<` para serializar JSON dentro de `<script>` (linha ~103, JSON-LD); siga o mesmo padrão.

## Pode ler primeiro / pode editar

- Ler primeiro: `src/pages/Glossario.tsx`, `src/pages/PublicStock.tsx`, `src/entry-server.tsx`, `src/main.tsx`, `scripts/prerender.mjs` (trecho do `html()` e da gravação, linhas ~60-120), `src/components/PageContent.tsx` (padrão atual de skeleton com `motion-safe:animate-pulse`), `docs/harness/relatos/qa-cls-2026-11-16.md`.
- **Pode editar:**
  - `src/pages/Glossario.tsx`
  - `src/pages/PublicStock.tsx`
  - `src/App.tsx`: **só** a linha da rota `/glossario`, e só se for necessário (provavelmente não é).
  - `scripts/prerender.mjs`: **só** para embutir os dados do glossário no HTML de `/glossario` (item 1).
- **Pode criar:** `src/components/PublicCompanySkeleton.tsx` (componente de skeleton, só com classes Tailwind; sem arquivo CSS novo) e o relato `docs/harness/relatos/interface-etapa2f-2026-11-16.md`.

## Fora do escopo

- **Textos legais e avisos** (conteúdo educativo, sem recomendação, dividendos não garantidos): proibido tocar. **Regras financeiras, margem, cotação, preço-teto e qualquer número exibido:** proibido tocar.
- Importar qualquer coisa de `server/` em `src/` (o cliente nunca importa `server/`; `scripts/prerender.mjs` roda em Node e já importa de `server/`, isso é permitido).
- Editar `tests/perf-baseline.mjs` ou qualquer arquivo em `tests/`: o script é **só para rodar**.
- Editar `src/entry-server.tsx`, `src/main.tsx`, `package.json`, `server/`, `.test-artifacts/dist-base/`, `.test-artifacts/perf-api/`.
- Tokens de movimento e skeletons de outras páginas (entregas 2B e 2C).
- Medir a produção. Instalar dependência.

## Passos

1. **Item 1: glossário, o cliente começa com os mesmos termos do HTML pré-renderizado.**
   - Em `scripts/prerender.mjs`, para a rota `/glossario`, embuta no HTML a lista de termos como `<script type="application/json" id="ediv-glossario">…</script>` (id sugerido; documente o escolhido). Serialize com `JSON.stringify(...).replaceAll("<", "\\u003c")`, como o JSON-LD da linha ~103. Não mude as outras rotas.
   - Em `Glossario.tsx`, o estado inicial (`initialTerms`, hoje `[]` por padrão) passa a ler esse JSON no cliente quando `initialTerms` não é passado: lê o elemento pelo `id`, faz `JSON.parse` dentro de `try/catch`, valida que é uma lista de pares de texto (`string[][]`) e, em qualquer falha, cai para `[]` como hoje. A leitura só ocorre no navegador (`typeof document !== "undefined"`); no pré-render continua valendo `initialTerms` vindo de `entry-server.tsx`.
   - A chamada a `/api/learning` continua, para atualizar a lista se mudar. A lista não pode piscar nem mudar de ordem se a resposta for igual ao JSON embutido.
   - Se achar uma alternativa menor e segura, **não a implemente**: descreva-a no relato e pare neste item.
2. **Item 2: página pública da empresa, o mesmo skeleton nos dois estados de espera.**
   - Crie `src/components/PublicCompanySkeleton.tsx`, com a estrutura e a altura aproximadas do conteúdo final de `PublicCompany` (blocos do `<article>` a partir de `PublicStock.tsx:~185`: trilha de navegação, título, painel de números, blocos de texto). Use só `transform`/`opacity` para animar (`motion-safe:animate-pulse`, como em `PageContent.tsx:17`), de modo que `prefers-reduced-motion` fique estático.
   - Use-o nos dois estados de espera: a sessão carregando (`PublicStock`, `:32-36`) e os dados carregando (`PublicCompany`, `:159-164`). Mantenha `role="status"` e `aria-busy="true"`, e as frases atuais ("Verificando seu acesso à pesquisa…" e "Carregando a pesquisa da empresa…") como texto do `role="status"` (podem ficar `sr-only`).
   - O rodapé deve ficar **abaixo da dobra** (`footer.getBoundingClientRect().top >= window.innerHeight`) durante as duas esperas, em 390×844 e 1280×800.
   - Não mude os estados de erro e de dado ausente: continuam como hoje ("indisponível", nunca zero). Não mude o conteúdo final de `PublicCompany` nem `StockResearch`.
3. **Validação e "depois".** Rode os comandos abaixo. Para o "depois", copie do relato `qa-cls-2026-11-16.md`, seção 5, o comando local do Vigia e troque **só** duas coisas: `DIST_DIR=dist` e a porta **4173** (4175 é do Vigia; não a use). Sirva o `dist/` novo com `npx vite preview --port 4173`. Use `MSYS_NO_PATHCONV=1` e `localhost`, como o relato diz. Não use `VIEWPORT`: queremos 390 e 1280 px, 3 cargas, atraso 600. Rode com `ATTRIBUTION=1`.
4. **Conferência de SEO e de conteúdo.** O HTML pré-renderizado de `/glossario` continua com os termos visíveis (abra com JavaScript desligado e capture a tela fora do repositório). Compare `dist/glossario/index.html` com `.test-artifacts/dist-base/glossario/index.html`, ignorando os nomes de arquivos com hash: a única diferença deve ser o `<script type="application/json">` novo.

## Critérios de aceite (observáveis)

- [ ] CLS local com `MOCK_API=1`, média de 3 cargas, **abaixo de 0,1** em `/glossario` e em `/ranking/acao/TIMS3`, em 390 e 1280 px (4 números, a comparar com a tabela "antes" acima).
- [ ] A atribuição mostra que o rodapé (`footer.site-footer`) e `a.action-secondary` não se movem mais nessas cargas. Se sobrar algum salto, o relato lista nó, valor e horário.
- [ ] O relato diz, para cada medição de `/ranking/acao/TIMS3`, em que estado a página terminou (conteúdo ou erro) e se o salto inicial de 0,14 persistiu.
- [ ] Nenhum conteúdo escondido; textos legais e avisos intactos (`git diff` não toca neles).
- [ ] `dist/glossario/index.html` contém o `<script type="application/json">` e os termos visíveis; só essa diferença em relação ao dist de base.
- [ ] Rodapé abaixo da dobra durante as duas esperas da página da empresa, em 390 e 1280 px (valor de `top` e de `innerHeight` no relato).
- [ ] `grep -rn "server/" src` não mostra nenhum import novo de `server/`.
- [ ] `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build` e `node --test tests/seo.dist.mjs` passam.
- [ ] `tests/perf-baseline.mjs` sem alteração (`git diff` do 2F não o lista como novo; ele é do Vigia).
- [ ] `git status --short` lista só os caminhos permitidos, mais `docs/harness/state.json` e os arquivos dos outros executores.

## Comandos de validação (em `evorix-finance/`)

```
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
npm run build
node --test tests/seo.dist.mjs
npx vite preview --port 4173
# em outro terminal: copiar o comando local do relato qa-cls, seção 5, com DIST_DIR=dist e a porta 4173
grep -c 'application/json' dist/glossario/index.html
grep -rn "server/" src
git diff --stat
git status --short
node scripts/harness.mjs check
```

## Formato do relato

Arquivo `docs/harness/relatos/interface-etapa2f-2026-11-16.md`, em português, com estas seções numeradas:

1. Causa de cada item (com `arquivo:linha`), antes da correção.
2. Arquivos alterados, com `arquivo:linha`.
3. Item 1 (glossário): como o JSON é embutido e lido, e o diff do HTML.
4. Item 2 (empresa): estrutura e altura do skeleton, e posição do rodapé nas duas esperas.
5. Medição "depois" (tabela de CLS, 4 números, ao lado do "antes") e a atribuição.
6. Estado final da página da empresa em cada medição e o que sobrou do salto de 0,14.
7. Comandos rodados e resultado (passou, falhou, não executado e por quê).
8. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log ou relato. Não abra `.env*`.
- Medições e capturas só contra `localhost`. Não meça nem abra a produção.
- Não faça commit, push, deploy, stash nem reset. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
