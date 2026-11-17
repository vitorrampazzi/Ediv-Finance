# Brief final — Vigia: QA final da missão de UX e performance

Para: Vigia (QA). Missão de 16 e 17/11. Plano: `docs/harness/briefs/03-plano-final.md`, seção "QA final — Vigia". Fica depois de 2H → revisão da Lupa → C3 → revisão da Lupa. O QA final testa a **árvore inteira** (2A, 2B, 2C, 2D, 2E, 2F, 2H, C2 e C3); é ela que vai para produção.

## Comece por aqui (antes de rodar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
git status --short
node scripts/harness.mjs claim qa docs/harness/relatos/qa-final-ux-performance-2026-11-17.md
node scripts/harness.mjs update qa trabalhando "QA final: portões, CLS, peso, regras e visual"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. O `claim` é **só do relato**: o `dist/`, o `node_modules/` e `.test-artifacts/` são artefatos de teste, não código. Ao terminar:

```
node scripts/harness.mjs update qa revisao "QA final pronto: veredito no relato"
node scripts/harness.mjs release qa
```

### Condições para começar (confira todas; se faltar uma, **pare** e avise)

1. `node scripts/harness.mjs status` mostra `interface` e `backend` **fora** de `trabalhando`, sem reservas (`claims` vazios) e com as entregas 2H e C3 em `revisao` ou liberadas, e o Orquestrador confirmou que a Lupa aprovou as duas.
2. Ninguém está buildando nem rodando teste. Você é o único usando o `dist/` e a porta 4175/4176/4191.
3. **Antes do passo 1 (o `npm ci` apaga `node_modules/` e reinstala tudo), peça autorização ao Orquestrador e espere a resposta:**
   `maestri ask "Orquestrador" "Vigia vai rodar npm ci agora (apaga e reinstala node_modules). status do harness: <cole a saída resumida>. Posso rodar?"`
   Só rode `npm ci` depois de ele responder que pode. Sem resposta, **não rode**: registre "item 1 não executado: sem autorização" e siga com os passos 2 a 8 usando o `node_modules/` atual (o relato diz que a prova da 2E ficou pendente).

## Objetivo

Dar o veredito **APTO** ou **NÃO APTO** para publicar, com números antes e depois, provando: a remoção de `autoprefixer` e `prettier` não muda o build (2E); os portões passam; o salto de layout (CLS) e o peso da home não pioraram e melhoraram onde o plano prometeu; os textos e regras do produto estão intactos; e as telas continuam acessíveis.

## Contexto mínimo

- Relato de saída: `docs/harness/relatos/qa-final-ux-performance-2026-11-17.md`.
- **"Antes"** = `.test-artifacts/dist-base` (build do `HEAD` de 16/11, `origin/main` `5613939`). **"Depois"** = o `dist/` gerado agora da árvore atual. Se `.test-artifacts/dist-base` não existir ou estiver quebrado, **pare** e avise (não recrie sem pedir).
- Medição oficial de CLS e peso: `tests/perf-baseline.mjs` (ver o cabeçalho do arquivo). **Nunca edite** esse arquivo. Servir com `vite preview`: "depois" na porta **4175**, "antes" na **4176**. Use `localhost` (não `127.0.0.1`). `MSYS_NO_PATHCONV=1` antes dos comandos com caminhos. `MOCK_API=1` usa as respostas gravadas em `.test-artifacts/perf-api/` (dados já capturados, sem rede).
- Referências do que já foi medido, para comparar sem refazer o raciocínio: `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md` (base), `qa-cls-2026-11-16.md`, `qa-etapa2a-2d-2026-11-16.md` (2A: JS da home 165,8 → 116,8 KB) e `qa-etapa2f-2026-11-17.md` (2F: método do CLS com `MOCK_API`). O relato da 2H (caminho **a confirmar**, esperado `docs/harness/relatos/interface-etapa2h-2026-11-17.md`) diz quais limites de CLS ficaram registrados.
- Texto do rodapé (item 6), exatamente: `Conteúdo educativo, sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados futuros não são garantidos.`
- O que **não** é possível nesta máquina: fluxos logados que exigem MySQL descartável (`browser.mjs`, `browser-experience.mjs`, `notifications.browser.mjs`, `session.browser.mjs`). Registre "não executado: sem MySQL descartável (o CI cobre)".

## Pode ler / pode escrever

- **Pode ler** qualquer arquivo do projeto, exceto `.env*`.
- **Pode escrever:** o relato `docs/harness/relatos/qa-final-ux-performance-2026-11-17.md`; `dist/` e `node_modules/` (só pelos comandos dos passos); `.test-artifacts/dist-pre-ci/` e outras pastas em `.test-artifacts/`; scripts descartáveis e capturas **fora do repositório** (diretório temporário da sessão).
- **Não corrige código.** Se achar defeito, relate com `arquivo:linha` e devolva.

## Fora do escopo

- Editar `src/`, `server/`, `tests/` (inclusive `tests/perf-baseline.mjs`), `scripts/`, `package.json`, `package-lock.json`, `docs/` (exceto o relato).
- Qualquer coisa contra produção. Qualquer teste que use MySQL, banco real ou `.env*`.
- `npm install`, `npm update`, `npm audit fix`, `npm ci --force`, `--legacy-peer-deps`.
- Commit, push, deploy, stash, reset.

## Passos

1. **Prova da 2E (dependências).** Só depois da autorização do Orquestrador (ver "Condições").
   1. Registre `git status --short` e `git diff --stat -- package.json package-lock.json` ("antes do ci").
   2. `npm run build` com o `node_modules/` atual (ele ainda tem `autoprefixer` e `prettier`). Isso garante que o `dist/` é da árvore **de agora**. Se `.test-artifacts/dist-pre-ci` já existir, **renomeie** para `dist-pre-ci-anterior` (não apague) e registre. Copie `dist/` para `.test-artifacts/dist-pre-ci`.
   3. `npm ci` (limpo, sem `--force`). Registre o exit code e as últimas linhas. Precisa de rede (registro do npm); se falhar no meio, `node_modules/` pode ficar incompleto: **não improvise**, relate o erro e avise o Orquestrador.
   4. `npm run build`.
   5. Compare os CSS: `(cd .test-artifacts/dist-pre-ci/assets && sha256sum *.css | sort) > <temp>/pre.txt`, `(cd dist/assets && sha256sum *.css | sort) > <temp>/pos.txt`, `diff <temp>/pre.txt <temp>/pos.txt`. Esperado: nenhuma diferença (mesmos nomes com hash, mesmo conteúdo). Faça a mesma comparação para `*.js` e registre como informação. Se houver diferença, rode `npm run build` outra vez e compare de novo para saber se o build é determinístico; relate as duas comparações.
   6. `npm ls autoprefixer prettier` (esperado: nenhum dos dois, `(empty)`). `git diff --stat -- package.json package-lock.json` igual ao do início: o `npm ci` não pode alterar os dois arquivos.
2. **Portões.** Registre o resultado de cada um (passou ou falhou, e a contagem):
   ```
   npm run lint
   npx tsc -p tsconfig.app.json --noEmit
   npx tsc -p tsconfig.node.json --noEmit
   npm test
   npm run build
   node --test tests/seo.dist.mjs
   node scripts/harness.mjs check
   ```
   Referência: na 2F, `npm test` deu 298 de 298 e `seo.dist.mjs` 9 de 9; a C3 acrescenta os casos de `tests/api-client.test.mjs`, então espere um número maior. Rode `npx tsc -p tsconfig.json --noEmit` também, se esse arquivo tiver `include` ou `references` que o torne diferente dos dois acima (confira e diga no relato).
3. **Suítes de navegador sem banco**, contra o `dist/` novo (cada uma sobe o próprio `vite preview`): `node tests/public-home.browser.mjs`, `node tests/stock-theme.browser.mjs`, `node tests/public-rankings.browser.mjs`. Registre a contagem de cada (na 2A: 10/10, 6/6 e 10/10) e o exit code. O que a QA da 2A chamou de "comportamento" (script descartável da seção 4 de `qa-etapa2a-2d-2026-11-16.md`) entra no passo 5 e no 7. Os fluxos que exigem MySQL: **não executados**, com o motivo.
4. **CLS antes e depois** (comando oficial).
   - Servidores: `npx vite preview --outDir dist --port 4175` ("depois") e `npx vite preview --outDir .test-artifacts/dist-base --port 4176` ("antes"), em segundo plano; encerre os dois ao terminar.
   - `MSYS_NO_PATHCONV=1 MOCK_API=1 RUNS=3 ATTRIBUTION=1 BASE_URL=http://localhost:4175 DIST_DIR=dist node tests/perf-baseline.mjs` e o mesmo com `BASE_URL=http://localhost:4176 DIST_DIR=.test-artifacts/dist-base`. As 7 rotas (`/`, `/ranking`, `/aprender`, `/glossario`, `/entrar`, `/cadastro`, `/ranking/acao/TIMS3`) em 390 e 1280 px.
   - **1920 px** em `/aprender` e `/ranking`: o `perf-baseline.mjs` só tem 390 e 1280 e não pode ser editado. Escreva um script Playwright **descartável fora do repositório** que meça CLS com o mesmo método do `perf-baseline.mjs` (leia o arquivo para copiar o `PerformanceObserver` e o `MOCK_API`), em 1920×1080, 3 cargas, "antes" e "depois".
   - **Aceite:** nenhuma rota pior que o "antes" em mais de 0,01; meta CLS < 0,1, exceto o que o relato da 2H registrou como limite (cite o limite, com o `arquivo:linha` do relato).
5. **Peso da home** (visitante, 390 px): JS transferido antes e depois (referência da 2A: 165,8 → 116,8 KB) e o LCP local, com a saída do `perf-baseline.mjs`. Depois, num script descartável: identifique no `dist/` final qual chunk tem `framer-motion` (o plano cita `onboarding-*.js`, ~124 KB, e `use-reduced-motion-*.js`; **a confirmar** no build final, por exemplo `grep -l "framer-motion\|useReducedMotion" dist/assets/*.js`). Registre as requisições de JS de `/`, `/entrar` e `/cadastro` (visitante) e, em cada uma, passe o mouse nos links públicos do cabeçalho e do rodapé (espera de 500 ms depois de cada). **O chunk com `framer-motion` não pode ser baixado em nenhuma dessas situações.**
6. **Texto e regras.**
   - Nas 8 páginas pré-renderizadas (`dist/index.html`, `dist/ranking/index.html`, `dist/aprender/index.html`, `dist/glossario/index.html`, `dist/assessoria/index.html`, `dist/privacidade/index.html`, `dist/suporte/index.html`, `dist/metodologia/index.html`): `grep -c` do texto do rodapé (acima) em cada uma. Esperado: 1 ou mais em todas.
   - `grep -ril "tempo real\|com atraso" dist --include=*.html` (esperado: 0) e `grep -rli "tempo real\|com atraso" dist` em todo o `dist/`. Na 2F a única ocorrência foi um padrão de detecção do assistente em `assets/EdivAssistant-*.js` (não é texto exibido): se for só essa, registre "conhecida, não exibida" e confira que o `dist-base` também a tem.
   - Nenhum número nas telas de carregamento: com a API simulada atrasada (`MOCK_DELAY_MS=5000` no script descartável), 300 ms depois da navegação, junte o `innerText` de cada `[role="status"]` e dos skeletons (`/ranking`, `/ranking/acao/TIMS3`, `/` com o bloco do ranking, `/aprender`, `/glossario`) e confirme que nenhum contém dígito. Skeleton só com barras e o texto de leitor de tela.
7. **Visual e acessibilidade.** Capturas em 320, 768 e 1280 px, tema claro e escuro (force o tema como `public/theme-init.js` faz), de `/`, `/ranking`, `/aprender`, `/glossario`, `/entrar` e `/ranking/acao/TIMS3` (36 capturas, **fora do repositório**), "depois" contra a porta 4175 com `MOCK_API` ou fixture fictícia. Para cada uma: sem rolagem horizontal (`document.documentElement.scrollWidth <= window.innerWidth`). Olhe pelo menos as capturas de 320 px de cada rota e compare com o "antes" (porta 4176); registre as diferenças visíveis (esperadas: rodapé da 2H, logo, skeletons). Com `prefers-reduced-motion: reduce` (`emulateMedia`) e a API atrasada: nenhum skeleton anima (`getComputedStyle(el).animationName === "none"` no skeleton e em cada filho) e cada skeleton tem `role="status"` com texto não vazio.
8. **Veredito.** APTO ou NÃO APTO, com a tabela antes/depois (CLS por rota e largura; JS e LCP da home), a lista de critérios que bloqueariam, e a lista do que **não** foi executado.

## Critérios de aceite (observáveis)

- [ ] Item 1: `diff` dos CSS sem diferença; `npm ls autoprefixer prettier` sem os dois; `package.json` e `package-lock.json` iguais antes e depois do `npm ci`. Ou "não executado" com o motivo (sem autorização).
- [ ] Item 2: os 7 comandos passam, com contagens no relato.
- [ ] Item 3: as 3 suítes passam, com contagem cada.
- [ ] Item 4: tabela com as 7 rotas × 390/1280 px (+ `/aprender` e `/ranking` em 1920 px), "antes" e "depois", média de 3 cargas; nenhuma rota pior que +0,01; meta < 0,1 (exceto o limite da 2H).
- [ ] Item 5: JS da home antes e depois; LCP local; o chunk com `framer-motion` ausente das requisições em `/`, `/entrar` e `/cadastro`, com e sem passar o mouse nos links.
- [ ] Item 6: texto do rodapé em 8 de 8 páginas; zero "tempo real"/"com atraso" exibido; nenhum dígito nos skeletons.
- [ ] Item 7: 36 capturas feitas; sem rolagem horizontal; skeletons sem animação em movimento reduzido e com `role="status"`.
- [ ] Item 8: veredito e lista do que não foi executado.
- [ ] `git status --short` no fim = o do começo, mais o relato (o `dist/` e o `.test-artifacts/` não aparecem: estão ignorados).

**NÃO APTO se:** lint, tsc, `npm test`, build ou `seo.dist.mjs` falharem; CSS do build mudar depois do `npm ci`; qualquer rota ficar pior que o "antes" em mais de 0,01 de CLS; o chunk com `framer-motion` for baixado por visitante; o texto do rodapé faltar ou aparecer "tempo real"/"com atraso" em texto exibido; houver rolagem horizontal ou skeleton animado em movimento reduzido. Se algo falhar, diga **qual passo** e a **causa** com `arquivo:linha`, sem corrigir.

## Comandos de validação (em `evorix-finance/`)

```
node scripts/harness.mjs status
git status --short
npm ci
npm run build
npm ls autoprefixer prettier
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm test
node --test tests/seo.dist.mjs
node tests/public-home.browser.mjs
node tests/stock-theme.browser.mjs
node tests/public-rankings.browser.mjs
MSYS_NO_PATHCONV=1 MOCK_API=1 RUNS=3 ATTRIBUTION=1 BASE_URL=http://localhost:4175 DIST_DIR=dist node tests/perf-baseline.mjs
MSYS_NO_PATHCONV=1 MOCK_API=1 RUNS=3 ATTRIBUTION=1 BASE_URL=http://localhost:4176 DIST_DIR=.test-artifacts/dist-base node tests/perf-baseline.mjs
node scripts/harness.mjs check
```

(`npm ci` só depois da autorização do Orquestrador. Os dois `vite preview` ficam em segundo plano e são encerrados no fim.)

## Formato do relato

Arquivo `docs/harness/relatos/qa-final-ux-performance-2026-11-17.md`, em português, com **exatamente** estes títulos:

1. `## 1. Prova da 2E (dependências)`
2. `## 2. Portões`
3. `## 3. Suítes de navegador`
4. `## 4. CLS antes e depois`
5. `## 5. Peso da home`
6. `## 6. Texto e regras`
7. `## 7. Visual e acessibilidade`
8. `## 8. Veredito`
9. `## 9. Não executado, limites e próximo passo`

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas: veredito, números principais, o que não foi executado + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em arquivo, log ou relato. Não abra `.env*`.
- Só `localhost`. Nada contra produção. Respostas simuladas e fixtures só fictícias, só nos scripts descartáveis (apague-os ao terminar).
- Testes nunca usam o banco de produção; não rode teste que exija MySQL.
- Não faça commit, push, deploy, stash nem reset. Não corrija código.
- Não adicione linha de autoria de IA.
