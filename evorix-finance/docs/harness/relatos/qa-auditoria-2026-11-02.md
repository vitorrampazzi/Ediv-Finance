# QA — validação da rodada de auditoria — 02/11/2026

Papel: `qa`. Somente validação; nenhum código de produto ou teste foi alterado.
Escopo: mudanças não commitadas de `server/`, `src/`, `package.json`,
`vercel.json` e `tests/api-resilience.test.mjs`, conforme os relatos
`backend-auditoria-2026-11-02.md` e `interface-auditoria-2026-11-02.md`.
Os três documentos com diferença só de fim de linha (CENTRAL-FUNDAMENTALISTA,
FIGMA-MAKE-INTEGRACAO, RANKING-PUBLICO) ficaram fora; `git diff
--ignore-cr-at-eol` confirmou que não há mudança de conteúdo.

## Ambiente e limites

- Windows 11, Node v24.20.0 (o projeto pede 22.x; a CI usa 22).
- Playwright 1.62.1. O Chromium do Playwright não está instalado; os testes
  usam o Chrome do sistema pelo fallback `channel: "chrome"` dos próprios
  testes. Nada foi instalado.
- Build local servido por `vite preview` em 127.0.0.1. Todo `/api/**` foi
  interceptado no navegador (503 com a mensagem nova, ou dados fictícios de
  teste). Hosts externos foram abortados. Nenhum banco, nenhum `.env*` e
  nenhuma URL de produção foram usados.
- Baseline de comparação: cópia de `HEAD` exportada para uma pasta temporária
  fora do repositório, com build próprio. Serviu para separar falhas
  preexistentes de regressões.
- Screenshots e logs ficaram em pasta temporária fora do repositório; as
  suítes oficiais gravaram em `.test-artifacts/` (ignorado pelo Git).

## Resultado item a item

| # | Verificação | Resultado | Evidência |
|---|---|---|---|
| 1a | `npm test` | Passou | 131/131 (baseline 128 + 3 de `api-resilience`), 0 falhas |
| 1b | `node --test tests/api-resilience.test.mjs` | Passou | 3/3 (503 indisponível × ocupado, log com throttle, app no loopback sem banco) |
| 1c | `npm run lint` | Passou | `eslint .` sem saída, exit 0 |
| 1d | `npm run build` | Passou | `HTML público gerado para 8 rotas; QA=false.` `IncomeRanking` 58,2 KB; `StockResearch` 475,8 KB com o recharts fora da rota do ranking |
| 1e | `node scripts/harness.mjs check` | Passou | `quadro válido; 4 papéis e reservas sem conflito` |
| 2a | `tests/public-home.browser.mjs` | Falhou, mas a falha é preexistente | 9/10 nas 3 execuções. `desktop-baixo` falha sempre: pausa do hero com 2 pixels de diferença (delta 1 de 255). `desktop` falhou 1 vez em 3 (16 px, delta 1). O baseline `HEAD` falha igual: `desktop-baixo` com 2 px em 2/2 execuções. Ruído de rasterização do Chrome do sistema, não é regressão |
| 2b | `tests/stock-theme.browser.mjs` | Passou | 6/6 |
| 2c | `tests/public-rankings.browser.mjs` | Passou | 10/10 |
| 2d | `tests/dividend.browser.mjs` | Passou | 10/10 (`#ranking-count`, tooltips exatos, 320px/temas) |
| 2e | `tests/notifications.browser.mjs` | Passou | 17/17 (`aria-controls` dos menus, Escape e foco) |
| 2f | `tests/accessibility.browser.mjs` (manual, fora da CI) | Falhou: suíte desatualizada pela mudança intencional | Axe com axe-core 4.10.3 local: rotas públicas OK nos dois temas, exceto `landmark-complementary-is-top-level` em `/aprender` (2) e `/suporte` (1), iguais no baseline. Depois, assert da linha 270 falha: `aria-describedby` do botão "Ativar tema…" agora é `null`, por causa do item 14 (dica igual ao nome acessível). No baseline a suíte já falhava mais adiante, na linha 370 (tooltip do "Fechar preferências") |
| 2g | `browser.mjs`, `browser-experience.mjs` | Não executado | Usam `createFixture()` (MySQL). Não há MySQL descartável local |
| 2h | `session.browser.mjs`, `notifications.e2e.mjs`, `test:integration`, `test:backup` | Não executado | Exigem `EDIV_TEST_MYSQL_DISPOSABLE` e MySQL |
| 2i | `visual-interactions`, `company-center`, `figma-stock` (runners manuais) | Não executado | Dependem de uma prévia própria em 4210/4332 e ficam fora da CI. Os pontos que interessam foram cobertos no item 3 |
| 3a | `/` com `/api/**` em 503, 1440×900 e 375×812, escuro e claro | Passou | 4/4. `.ph-home` e h1 "Entenda as empresas por trás dos dividendos." visíveis. O aviso `role=status` "Não foi possível verificar sua conta agora…" com o botão "Tentar novamente" aparece acima do hero. Nenhum "Verificando…" nem tela de erro |
| 3b | `/entrar` com 503, nos 4 cenários | Passou | Formulário (E-mail, Senha, "Entrar") e aviso "Não foi possível verificar a sessão agora…" visíveis. Ao enviar, aparece `role=alert` com "O serviço está temporariamente indisponível. Tente novamente em alguns minutos." |
| 3b' | `/cadastro` com TODO `/api/**` em 503 | Falhou contra a aceitação literal (observação de produto) | O formulário não aparece. Ficam o aviso de sessão e "Não foi possível conferir a disponibilidade do cadastro." + outro "Tentar novamente". Com só `/api/auth/me` em 503 e `/api/auth/availability` 200, o formulário aparece com o aviso e sem overflow em 375px (passou). No baseline, a tela inteira era o erro de sessão |
| 3c | `/ranking` com 503, nos 4 cenários | Passou | h1 "Ranking de Ações". A landing pública e "Entre para acessar o ranking completo" aparecem, e o bloco de pesquisas mostra a mensagem 503 com "Tentar carregar ranking novamente". Nenhum "Verificando seu acesso ao ranking…". Esta rota não mostra aviso de sessão, o que é aceitável |
| 3d | Overflow horizontal em 375px | Passou | `scrollWidth` 375 = `innerWidth` em `/`, `/entrar`, `/cadastro` (os dois casos), `/ranking`, `/app/ranking` e na página da empresa |
| 3e | Console | Passou | Só erros "Failed to load resource" de `/api/*` (503, ou 502 sem interceptação). Nenhum `pageerror`. Sem interceptação, o proxy do preview para a API ausente dá 502 e a home pública continua com o aviso |
| 3f | Tooltips por toque e teclado | Passou | Com `/api` simulada e dados fictícios TST1..3 (usuário MEMBER fictício): no cabeçalho "Código" de `/app/ranking` (1440 e 375) e no InfoTip "Cotação de referência" de `/app/ranking/acao/TST1` (375), o toque abre, o toque fora fecha, o segundo toque fecha e Escape fecha. A dica fica dentro da viewport (x 135..367 em 375px). Pelo teclado, Enter fixa, Escape fecha e o foco fica no cabeçalho. No desktop, o clique fixa a dica mesmo com o mouse fora |
| 3g | Logo `ediv-icon-clean-192.png` | Passou | Cabeçalho 40×40 e rodapé 36×36 CSS a partir de 192×192 natural (DPR 2 equivale a 80 px, com margem). Nítido nos temas escuro e claro e nas telas de conta. O hero mantém o arquivo grande |
| 3h | Botão de tema do cabeçalho | Passou | Em 375px, "Ativar tema claro" troca `data-theme` para light, grava `ediv-appearance-v1=light` e passa a mostrar "Ativar tema escuro" |
| 3i | "Tentar novamente" do aviso | Passou | Cada clique faz uma nova chamada a `/api/auth/me` (1→2→3). Durante a verificação, o botão mostra "Verificando…" com `aria-disabled="true"` e o formulário continua na tela. Quando a API volta com 401 de visitante, o aviso some |
| 3j | `/app/ranking` (dados fictícios) | Passou | Um h2 "Empresas da publicação". `#ranking-count` = "3 exibidas de 3 filtradas · 3 ações no total". A região `p.sr-only[role=status]` repete o texto depois de cerca de 800 ms. Sem botão "Explorar demonstração" quando há publicação. Nenhum recurso `StockResearch`/recharts baixado |
| 4 | Revisão do diff para quebras de teste | Ver abaixo | Só `accessibility.browser.mjs` (fora da CI) quebra por causa das mudanças |

## Falhas e reprodução

1. **`tests/accessibility.browser.mjs` desatualizado (não bloqueia a CI).**
   Reprodução: `EDIV_A11Y_TOOLTIP_ONLY=true node tests/accessibility.browser.mjs`.
   Resultado: `null !== '_r_2_'` na linha 270. O teste exige
   `aria-describedby` no botão de tema, mas a dica repete o nome acessível
   ("Ativar tema claro"), e o item 14 deixou de descrevê-lo de propósito.
   A suíte não está em `run-browser.mjs` nem na CI, e no baseline já falhava
   na linha 370. Sugestão para quem tiver o escopo de testes: usar um
   controle cuja dica difira do nome, ou esperar ausência de
   `aria-describedby` quando forem iguais, e revisar a etapa da linha 370.

2. **`/cadastro` sem formulário quando todo `/api` está fora (decisão de
   produto).** Reprodução: no build local, responder 503 em `/api/**` e abrir
   `/cadastro`. A tela mostra dois avisos e dois botões "Tentar novamente"
   (o do aviso de sessão e o da disponibilidade), com o mesmo nome acessível.
   Isso é coerente, porque o cadastro não pode ser concluído sem banco, e é
   melhor que o baseline, que mostrava só o erro de sessão. Mas não atende
   literalmente "formulário visível em /cadastro" no cenário real de
   produção, em que `/api/auth/availability` também responde 503. Cabe à
   coordenação aceitar ou pedir ajuste: unificar os avisos ou dar nomes
   distintos aos botões.

3. **`public-home.browser.mjs` `desktop-baixo` (preexistente).** Reprodução:
   `npm run build && node tests/public-home.browser.mjs`. A pausa do hero
   difere em 2 pixels com delta 1. A falha também ocorre no baseline `HEAD`
   com o Chrome do sistema. Na CI, com o Chromium do Playwright, o
   comportamento pode ser outro; acompanhar o job `test:browser`.

## Observações sem falha

- O aviso de sessão entra depois do carregamento e desloca o HTML
  pré-renderizado da home (cerca de 96 px no desktop e 138 px em 375px). É um
  deslocamento de layout visível só quando `/api/auth/me` falha.
- Quem está logado vê a landing pública de `/` e `/ranking` por um instante
  antes do redirecionamento ou da troca para o ranking completo. É esperado
  pelo relato de interface.
- `vercel.json` ganhou o redirecionamento permanente de `/login` para
  `/entrar`. `package.json` só acrescenta `api-resilience` ao `npm test`.

## Testes de browser da CI que dependem de banco: previsão por leitura

`run-browser.mjs` roda public-home, stock-theme, public-rankings, dividend,
notifications.browser, browser e browser-experience; session.browser e
notifications.e2e só rodam com `EDIV_TEST_MYSQL_DISPOSABLE`. Não encontrei
seletor quebrado pelas mudanças:

- **h2 "Empresas da publicação":** nenhum teste procura o h2 antigo
  "Ranking de Ações". `browser.mjs` usa `main heading .first()`, que segue
  válido. `dividend.browser.mjs` passou.
- **Região `role=status` sr-only extra no ranking:** os usos de
  `getByRole("status")` em `browser.mjs` e `browser-experience.mjs` no
  ranking filtram por texto ("alterado(s)", "Publicação salva"), então não
  há violação de modo estrito. O `getByRole("status")` sem filtro de
  `browser.mjs:345` está em `/recuperar-senha`, que não mudou.
- **`aria-disabled` no reenvio:** `browser.mjs:216` usa `toBeDisabled()`.
  Conferido localmente: o Playwright 1.62.1 considera `<button
  aria-disabled="true">` desabilitado. O nome "Reenviar em Ns" foi mantido.
- **Remoção de `aria-pressed`:** só `public-rankings.browser.mjs` usa
  `aria-pressed`, em outros controles, e passou. `public-home` usa os rótulos
  "Pausar animação" e "Reproduzir animação", que não mudaram.
- **`session.browser.mjs`:** o 503 é testado em `/app` (`RequireAuth` e
  `SessionStatus`, sem mudança), então continua válido.
- **Limitadores novos (`emailEntryLimiter`, 5 por 15 min por IP):**
  `browser.mjs` limpa os limites a cada `check`, e `integration.test.mjs` usa
  `beforeEach(clearLimits)`. Pela leitura, nenhum cenário passa de 5 entradas
  de e-mail entre limpezas. Isso só se confirma na CI com MySQL.

Previsão: `browser.mjs`, `browser-experience.mjs`, `session.browser.mjs` e
`notifications.e2e.mjs` devem continuar passando. Isso não foi executado.

## Conclusão de aptidão

**Apta para publicação, com ressalvas**, condicionada ao job `quality` da
CI (integração SQL, browser com MySQL descartável e backup) passar com
Node 22.

- O objetivo central foi verificado. Com `/api` em 503, a home pública,
  `/entrar` e `/ranking` ficam utilizáveis, em desktop e mobile e nos dois
  temas, sem tela de erro de página inteira, sem overflow e sem erros de
  console inesperados.
- Tooltips por toque, teclado e Escape funcionam, e o logo novo está nítido.
- Unit, lint, build e harness passaram.
- O ponto 2 (`/cadastro` sem formulário quando todo `/api` está fora)
  precisa de aceite explícito da coordenação.
- O ponto 1 é dívida de teste fora da CI.

**Limites desta validação:**

- Nenhum caminho real de banco foi exercitado: limitadores de login e e-mail,
  limpeza do limit-store, carregamento sob demanda do histórico e
  `Cache-Control` com MySQL ficam para a CI.
- Node 24 local, contra 22 na CI.
- Chrome do sistema em vez do Chromium do Playwright.
- Nenhuma verificação em produção. As mudanças não restauram o banco de
  produção; com o Aiven inacessível, login, cadastro e ranking continuam
  indisponíveis, agora com mensagem honesta.
