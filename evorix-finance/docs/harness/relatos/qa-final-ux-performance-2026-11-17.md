# QA final: missão de UX e performance (17/11/2026)

**Veredito: APTO COM RESSALVAS.** Não há falha bloqueante. As ressalvas estão na seção 9.

Escopo: árvore não commitada de `vitorrampazzi/ux-performance-2026-11-16` (2A, 2B, 2C, 2D, 2E, 2F, 2H, C2, C3). Nenhum código de produto foi alterado. Nenhum commit, push ou deploy.

Autorização do `npm ci`: veio na mensagem do Orquestrador desta sessão (condições 1 e 2 conferidas antes: `interface` e `backend` em `revisao`, sem claims, nenhum processo de build ou teste de outra sessão; as portas 4175, 4176, 4191 e 3307 estavam livres).

## 1. Prova da 2E (dependências)

- Antes do ci: `git status --short` com 94 linhas. `git diff --stat -- package.json package-lock.json`: `package-lock.json` com 76 linhas removidas, `package.json` com 4 alteradas. Hashes SHA-256 em `scratchpad/pkg-sha-antes.txt`.
- Pré-ci: `npm run build` (exit 0, 8 rotas pré-renderizadas). Cópia em `.test-artifacts/dist-pre-ci`. Não havia `dist-pre-ci` anterior, então nada foi renomeado.
- `npm ci` (exit 0, sem `--force`). Aviso do npm: 9 vulnerabilidades moderadas. Não rodei `npm audit fix` (proibido pelo brief); registrado para o Backend.
- Pós-ci: `npm run build` (exit 0). Rebuild de conferência (exit 0).
- CSS: `sha256sum *.css` idêntico entre pré-ci e pós-ci (12 de 12 arquivos). Diferença de CSS: 0 linhas.
- JS (informação): os nomes e hashes dos 66 chunks de JS mudaram em relação ao pré-ci. Os dois builds pós-ci são idênticos entre si (0 linhas de diferença), então o build é determinístico. A mudança de hash vem do `node_modules` anterior, não do código.
- `npm ls autoprefixer prettier`: `(empty)`. O exit code é 1, comportamento esperado do npm quando o pacote não existe.
- `package.json` e `package-lock.json` depois do `npm ci`: `diff --stat` igual ao do início; `sha256sum -c` OK nos dois.

## 2. Portões

| Comando | Resultado |
|---|---|
| `npm run lint` | exit 0 |
| `npx tsc -p tsconfig.app.json --noEmit` | exit 0 |
| `npx tsc -p tsconfig.node.json --noEmit` | exit 0 |
| `npx tsc -p tsconfig.json --noEmit` | exit 0 (`tsconfig.json` só tem `references` e `files: []`; o comando é quase no-op) |
| `npm test` | 316 de 316 passaram, 0 falhas |
| `npm run build` | exit 0 |
| `node --test tests/seo.dist.mjs` | 9 de 9 passaram |
| `node scripts/harness.mjs check` | exit 0, "quadro válido; 4 papéis e reservas sem conflito" |

Referência: na 2F, `npm test` deu 298. Os 18 casos a mais são de `tests/api-client.test.mjs` (C3).

## 3. Suítes de navegador

Rodadas contra o `dist/` novo, sem banco:

- `node tests/public-home.browser.mjs`: 10 de 10 PASS, exit 0.
- `node tests/stock-theme.browser.mjs`: 6 de 6 PASS, exit 0.
- `node tests/public-rankings.browser.mjs`: 10 de 10 PASS, exit 0.

Bate com a referência da 2A (10/10, 6/6, 10/10).

Não executadas: `browser.mjs`, `browser-experience.mjs`, `notifications.browser.mjs` e `session.browser.mjs`, por exigirem MySQL descartável. Não há MySQL descartável nesta máquina; o CI cobre.

## 4. CLS antes e depois

Método: `tests/perf-baseline.mjs` com `MOCK_API=1 RUNS=3 ATTRIBUTION=1`. "Depois": `BASE_URL=http://localhost:4175 DIST_DIR=dist`. "Antes": `BASE_URL=http://localhost:4176 DIST_DIR=.test-artifacts/dist-base`. Logs: `scratchpad/perf-depois.log` e `scratchpad/perf-antes.log`.

CLS (média de 3 cargas, coluna do resumo do script):

| Rota | 390 px antes | 390 px depois | 1280 px antes | 1280 px depois |
|---|---|---|---|---|
| `/` | 0,000 | 0,000 | 0,000 | 0,000 |
| `/ranking` | 0,000 | 0,000 | 0,000 | 0,000 |
| `/ranking/acao/TIMS3` | 0,628 | 0,000 | 0,359 | 0,000 |
| `/aprender` | 0,020 | 0,020 | 0,022 | 0,022 |
| `/glossario` | 0,411 | 0,000 | 0,422 | 0,000 |
| `/entrar` | 0,000 | 0,000 | 0,000 | 0,000 |
| `/cadastro` | 0,000 | 0,000 | 0,000 | 0,000 |

Aceite: nenhuma rota ficou pior que o "antes" em mais de 0,01. Melhorias em `/ranking/acao/TIMS3` e `/glossario`.

Meta CLS < 0,1: atendida em todas as rotas, exceto `/aprender`, que tem 0,020 (390 px) e 0,022 (1280 px). Ambas estão abaixo de 0,1 e não pioraram.

1920 px (script descartável `scratchpad/cls-1920.mjs`, mesmo método, 3 cargas, `MOCK_API`; resultado em `scratchpad/cls-1920-result.json`):

| Rota | Antes (média) | Depois (média) |
|---|---|---|
| `/aprender` | 0,2272 (0,2272 ×3) | 0,2272 (0,2272 ×3) |
| `/ranking` | 0,0000 | 0,0000 |

`/aprender` a 1920 px: CLS 0,2272 nos dois builds. Limite registrado na 2H: `docs/harness/relatos/interface-etapa2h-2026-11-17.md:25` (CLS 0,227 em 1920×1080, `section#learning-panel-curso`, y 606 → 514). Não piorou, então fica como limite conhecido, conforme decisão do Orquestrador.

Observação: os LCPs locais variaram bastante entre antes e depois (por exemplo, `/` 1280 px: 137 ms → 485 ms; `/entrar` 390 px: 755 ms → 1041 ms). Com 3 cargas locais em `localhost` isso pode ser ruído. Não é critério de aceite do brief, mas vale medir de novo antes de publicar.

## 5. Peso da home

Medição: `perf-baseline`, visitante, 390 px. JS transferido:

- `/` antes: 165,8 KB, com `framer-motion` baixado (sim).
- `/` depois: 116,9 KB, sem `framer-motion` (não).

Bate com a referência da 2A (165,8 → 116,8 KB).

LCP local de `/` (390 px): 263 ms antes, 305 ms depois. 1280 px: 137 ms antes, 485 ms depois (ver observação da seção 4).

Chunk com `framer-motion`: identificado no `dist/` final como `dist/assets/onboarding-Bb0KAPts.js` (~124 KB). Contém as chaves do framer (`transformPerspective`, `whileInView`, `motionValue`). Não é `use-reduced-motion-*` (esse arquivo não existe no build). O plano citava `onboarding-*.js`, e a identificação confirma.

Teste de rede (script descartável `scratchpad/qa-visitor.mjs`, 390 px, API mockada, 500 ms depois de cada hover nos links públicos do cabeçalho e rodapé):

| Página | Links com hover | JS antes do hover | JS depois do hover | `onboarding-Bb0KAPts` baixado |
|---|---|---|---|---|
| `/` | 8 | 14 | 27 | não (antes e depois) |
| `/entrar` | 0 | 10 | 10 | não |
| `/cadastro` | 0 | 12 | 12 | não |

Nas três páginas, o chunk com `framer-motion` não foi baixado, nem antes nem depois do hover. Atende ao critério.

Ressalva: `/entrar` e `/cadastro` não têm links públicos em `header`/`footer` com `href` iniciando em `/`, então o hover não foi exercitado nelas. Só a home teve hover de fato.

## 6. Texto e regras

Rodapé (texto exato do brief) nas 8 páginas pré-renderizadas do `dist/` (`grep -c`):

| Página | Ocorrências |
|---|---|
| `dist/index.html` | 1 |
| `dist/ranking/index.html` | 1 |
| `dist/aprender/index.html` | 1 |
| `dist/glossario/index.html` | 1 |
| `dist/assessoria/index.html` | 1 |
| `dist/privacidade/index.html` | 1 |
| `dist/suporte/index.html` | 1 |
| `dist/metodologia/index.html` | 1 |

8 de 8. No `dist-base` o rodapé está ausente (0), como esperado, porque é mudança da 2H.

"tempo real" / "com atraso":

- `grep -ril "tempo real\|com atraso" dist --include=*.html`: 0 ocorrências.
- `grep -rli "tempo real\|com atraso" dist`: só `dist/assets/EdivAssistant-CA1ltPpw.js`. Não é texto exibido: é um padrão de detecção no código, `/\b(cotacao|...|tempo real|atraso|...)\b/.test(t)`. O `dist-base` tem a mesma ocorrência em `EdivAssistant--mkLU5yJ.js`. Classificado como conhecida, não exibida.

Dígitos nos estados de carregamento (API atrasada 5 s, leitura 300 ms após a navegação, `role="status"` e `.animate-pulse`):

- `/ranking`, `/ranking/acao/TIMS3`, `/`, `/aprender`: 2 elementos de status cada, nenhum com dígito.
- `/glossario`: 1 elemento com dígito, "14 termos, em ordem alfabética.". Vem de `src/pages/Glossario.tsx:92`, que só mostra essa frase depois que os termos carregam. O texto de carregamento é "Carregando glossário…", sem dígito. Não é skeleton. Critério atendido.

## 7. Visual e acessibilidade

- 36 capturas em `scratchpad/caps/` (fora do repositório): 320, 768 e 1280 px × tema claro e escuro × 6 rotas (`/`, `/ranking`, `/aprender`, `/glossario`, `/entrar`, `/ranking/acao/TIMS3`). Tema forçado por `localStorage["ediv-appearance-v1"]`, como `public/theme-init.js` faz.
- Rolagem horizontal da página (`scrollWidth <= innerWidth`): nenhuma falha nas 36 capturas.
- Movimento reduzido (`reducedMotion: reduce`, API atrasada 5 s): em `/ranking`, `/ranking/acao/TIMS3`, `/aprender` e `/glossario`, zero elementos animados em `.animate-pulse` e seus filhos. Cada `role="status"` tem texto não vazio (2 de 2 em cada rota).
- Olhei as capturas de 320 px no tema claro de `/`, `/ranking` e `/aprender`. Não olhei as de `/glossario`, `/entrar` e `/ranking/acao/TIMS3`, nem as de tema escuro, nem a comparação com o "antes" (porta 4176), que não foi capturada. Ver seção 9.
- Observações visuais em 320 px:
  - `/aprender`: a faixa de abas ("Curso", "Testes", "Laboratório…") corta o último item dentro do próprio componente. A página não rola horizontalmente. Não é regressão confirmada, porque não há captura do "antes" para comparar.
  - `/`: o ranking mostra "Empresa fictícia A". É dado de fixture (MOCK_API), não é texto de produção.

## 8. Veredito

**APTO COM RESSALVAS.**

Critérios de aceite:

- Item 1 (2E): diff de CSS sem diferença; `npm ls` sem os dois; `package.json` e lock iguais. Cumprido.
- Item 2 (portões): todos os comandos passam, com contagens. Cumprido.
- Item 3 (suítes sem banco): 10/10, 6/6, 10/10. Cumprido.
- Item 4 (CLS): nenhuma rota pior que +0,01. Meta < 0,1 atendida, exceto `/aprender` (limite da 2H, citado em `interface-etapa2h-2026-11-17.md:25`). Cumprido parcialmente: falta a média de 3 cargas em 1920 px para `/ranking` em todas as rotas (feito para `/aprender` e `/ranking`).
- Item 5 (peso): JS da home 165,8 → 116,9 KB; `framer-motion` ausente em `/`, `/entrar` e `/cadastro`, com e sem hover. Cumprido; LCP com ressalva.
- Item 6 (texto e regras): rodapé em 8 de 8; zero "tempo real"/"com atraso" exibidos; nenhum dígito nos skeletons. Cumprido.
- Item 7 (visual): 36 capturas feitas; sem rolagem horizontal; skeletons sem animação em movimento reduzido e com `role="status"`. Cumprido. Revisão visual parcial (ver seção 9).
- Item 8: veredito e lista do que não foi executado: esta seção e a 9.

Bloqueios (nenhum atingido): lint, tsc, `npm test`, build e `seo.dist.mjs` passam; CSS não mudou; nenhuma rota pior em mais de 0,01; `framer-motion` não baixado por visitante; rodapé presente e sem texto proibido exibido; sem rolagem horizontal; sem skeleton animado em movimento reduzido.

## 9. Não executado, limites e próximo passo

Não executado:

- Suítes com MySQL descartável: `browser.mjs`, `browser-experience.mjs`, `notifications.browser.mjs`, `session.browser.mjs`. Motivo: não há MySQL descartável nesta máquina. O CI cobre.
- Revisão visual completa do passo 7: só 3 capturas de 320 px (tema claro) foram vistas. Faltam as de 768 e 1280 px, o tema escuro e as rotas `/glossario`, `/entrar` e `/ranking/acao/TIMS3`.
- Comparação visual com o "antes" (porta 4176) nas capturas. Não foi feita.
- LCP: a amostra local de 3 cargas tem variação grande. Não há conclusão sobre LCP.
- Rota `/ranking/acao/TIMS3` a 1920 px: não medida (o brief pedia só `/aprender` e `/ranking`).

Limites:

- Vulnerabilidades de dependências: 9 moderadas, anunciadas pelo `npm ci`. Não tratadas aqui (fora do escopo e o brief proíbe `npm audit fix`). Para o Backend.
- Teste de hover em `/entrar` e `/cadastro`: não exercitado (sem links públicos de cabeçalho/rodapé com `href` iniciando em `/`).
- APIs fora do mock: `/api/auth/availability` retornou 502 em `/` e `/cadastro`, e `/api/auth/me` retornou 401 em todas as rotas. São respostas de endpoints não mockados no `perf-baseline`; não representam falha de página, mas não foram investigadas.
- Cobertura do `perf-baseline`: só 390 e 1280 px. O 1920 px veio de script descartável, fora do repositório.

Próximo passo: revisar visualmente as capturas restantes do passo 7 (768 e 1280 px, tema escuro, rotas não olhadas) e comparar os 320 px com o "antes". Depois, o Orquestrador decide se a ressalva de `/aprender` (abas cortadas em 320 px) e o LCP local precisam de nova medição antes da publicação.

Servidores `vite preview` (4175 e 4176) e reserva `qa`: encerrados e liberados no fim desta rodada.
