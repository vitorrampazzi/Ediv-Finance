# Relatório final — missão de UX, animações, performance e organização (16–17/11/2026)

Coordenação: Orquestrador. Executores: Pincel (interface), Tijolo (servidor), Vigia (QA), Lupa
(revisão), Pauta (briefs), Chave (publicação). Registro dia a dia em `docs/UX-PERFORMANCE-2026-11-16.md`
(seção 3, "Andamento"). Todos os números abaixo vêm de relatos com o comando que os gerou; nada foi
estimado.

## 1. Diagnóstico

- Raiz Git `C:/Users/vitor/Evorix-finance`, projeto Node em `evorix-finance/`, branch
  `vitorrampazzi/ux-performance-2026-11-16` a partir de `origin/main` `5613939` (PR #51).
- Trabalho do dono preservado e fora de qualquer commit: `evorix-finance/.gitignore`,
  `docs/harness/state.json`, o `.gitignore` da raiz, `.maestri/` e `docs/estrategia_escola_do_dividendo.pdf`.
- Achados da auditoria (relatos 1A, 1B e 1C) que guiaram a missão:
  - a home pública baixava framer-motion (40 kB gzip) por causa de um re-export em `Home.tsx`;
  - o visitante pré-carregava a página logada da empresa (137 kB gzip);
  - a logo do herói era um PNG de 138,5 kB;
  - na produção, o CLS era alto na página pública da empresa (0,628 em 390 px) e no glossário (0,411);
  - havia duas cópias da função de requisição (`api.ts` e `AuthProvider.tsx`) e 22 arquivos de
    `src/` que nada usava;
  - o Tailwind lia `docs/*.md` e gerava classes a partir do texto dos relatos.

## 2. Skill usada

`zizi-skills:code-quality` (`SKILL.md` e `dead-code.md`), confirmada pelo dono ("antagle code base"
não existia com esse nome). Ela foi aplicada em quatro frentes:
- o diagnóstico do Eixo C (Lupa);
- os critérios de toda revisão: dois eixos, padrão e especificação, com severidade em cada achado;
- a prova antes de cada exclusão;
- a regra "um ritmo por tipo de trabalho": o JSON do glossário segue o padrão do prerender, e os
  skeletons seguem o `PublicCompanySkeleton`.

## 3. Telas e componentes alterados

| Tela / componente | O que mudou | Etapa |
|---|---|---|
| Home pública (`Home.tsx`, `PublicHeroBrand.tsx`) | sem framer-motion; logo em WebP com PNG de reserva | 2A |
| Ícones do cabeçalho, menu e login | `width`/`height` declarados | 2A |
| Pré-carregamento de rotas (`NavigationIntent.tsx`, `App.tsx`) | visitante não pré-carrega a página logada | 2A |
| Página pública da empresa (`PublicStock.tsx`, `PublicCompanySkeleton.tsx` novo) | skeleton com o formato da página nas duas esperas | 2F |
| Glossário (`Glossario.tsx`, `scripts/prerender.mjs`) | termos embutidos no HTML e lidos no primeiro render; altura reservada ao abrir por clique | 2F |
| Carregamento de rota (`PageContent.tsx`) | `min-h-screen`: o rodapé não sobe enquanto a página carrega | 2F |
| Amostra de pesquisa da home e destaques do ranking | skeletons no lugar de "Carregando…", com a altura do conteúdo final | 2C |
| Rodapé público (`SiteChrome.tsx`) | aviso "dividendos e resultados futuros não são garantidos" (texto aprovado pelo dono) | 2H |
| Sessão e requisições (`api.ts`, `AuthProvider.tsx`) | uma função de requisição só | C3 |
| Home da conta (`AccountHomeContent.tsx`) | ramo morto removido (2 linhas) | C2 |

## 4. Animações e princípios

- **Tokens de movimento** em `src/index.css`: `--ediv-duration-fast` 150 ms, `-base` 180 ms, `-slow`
  250 ms, `--ediv-ease-out` e `--ediv-ease-emphasis`. 13 linhas mudaram de valor (140/160 → 150 ms,
  diferença ≤ 10 ms, imperceptível); as demais viraram token de mesmo valor. Princípios: **Snappy
  Timing** (escala curta e coerente) e **Slow In & Slow Out** (curvas nomeadas). 30 de 30 capturas
  iguais antes e depois.
- **Skeletons** (2C, 2F) com `motion-safe:animate-pulse` e só `opacity`. Princípio: **Doherty**, uma
  resposta visual imediata que já tem o formato da tela final. Com `prefers-reduced-motion`, nada
  anima (conferido pelo QA e pela Lupa).
- **Alvo de toque** do menu logado: a classe foi para `min-h-11`, mas os itens **já tinham 44 px**
  por `navigation-chrome.css:111`. Não conta como melhoria; só alinha a classe à altura real.
- **Microinterações novas:** nenhuma. A auditoria não achou falta de feedback, e a missão proíbe
  animação sem ganho.

## 5. Performance (métricas antes → depois, local)

Números confirmados no QA final (`qa-final-ux-performance-2026-11-17.md`), com a árvore inteira
depois de um `npm ci` limpo. "Antes" é o build de `origin/main` `5613939`.

- **Home pública, visitante, 390 px:** JS transferido 165,8 → 116,9 KB (−30%).
  - O framer-motion (`onboarding-*.js`) não é baixado em `/`, `/entrar` nem `/cadastro`, com e sem
    hover nos links.
  - LCP local: na 2A foi de 309 para 269 ms, mas no QA final a variação entre cargas foi grande
    demais para tirar conclusão. Fica só como referência; não é ganho comprovado.
- **Logo do herói:** 138,5 KB (PNG) → 33,5 KB (WebP), −76%.
- **CLS (média de 3 cargas, API simulada, HTML como na Vercel):**

  | Rota | 390 px antes → depois | 1280 px antes → depois |
  |---|---|---|
  | `/ranking/acao/TIMS3` | 0,628 → 0 | 0,359 → 0 |
  | `/glossario` | 0,411 → 0 | 0,422 → 0 |
  | `/`, `/ranking`, `/entrar`, `/cadastro` | 0 → 0 | 0 → 0 |
  | `/aprender` | 0,020 → 0,020 | 0,022 → 0,022 |
  | navegação por clique `/` → `/glossario` | 0,592 → 0,024 | 0,556 → 0,008 |

  Em 1920 px: `/ranking` 0 → 0; `/aprender` 0,2272 → 0,2272 (sem mudança; ver seção 9). A navegação
  por clique foi medida na 2F, não no QA final.

- **Build:** chunks 81 → 78 e −10 KB no `dist/` (C2); `.ease-in-out` e outras classes vindas de
  `docs/` saíram do CSS (2B).

## 6. Banco, APIs e cache

- **Cache de borda** em `GET /api/support/information` (`s-maxage=3600`, `stale-while-revalidate`),
  com teste que garante corpo igual com e sem cookie e sem cabeçalho de limite (2D).
- **Migrações:** nenhuma. Índices adiados, porque sem EXPLAIN no banco real não há prova, e o volume é
  pequeno.
- **Redis:** não justificado (200 usuários simultâneos com p95 de 174 ms em 04/11).
- **Rejeitado:** cache de borda em `/api/learning`, porque a resposta traz o progresso do usuário.
- **Requisições:** uma função só no cliente, com o tempo de cada chamador preservado (C3).

## 7. Dependências removidas

`autoprefixer` e `prettier` (sem uso; o lock perdeu também `fraction.js` e `postcss-value-parser`,
exclusivos deles): 371 → 367 pacotes, 0 versões alteradas (2E, revisada pela Lupa). A prova com
`npm ci` limpo e comparação do CSS está no QA final. Os 9 alertas do `npm audit` são um só
(`minimatch`, só no lint); a produção tem 0.

## 8. Testes

**QA final (Vigia, 17/11): APTO, com ressalvas não bloqueantes.**

| Verificação | Resultado |
|---|---|
| `npm ci` limpo | exit 0; CSS idêntico ao de antes (12/12 arquivos); `package.json` e lock inalterados; `autoprefixer` e `prettier` ausentes |
| lint, `tsc` (app, node, raiz), build, `harness check` | passaram |
| `npm test` | 316/316 |
| `tests/seo.dist.mjs` | 9/9 |
| Navegador sem banco | public-home 10/10, stock-theme 6/6, public-rankings 10/10 |
| Rodapé com o aviso novo | 8 de 8 páginas |
| "tempo real" / "com atraso" exibidos | 0 |
| Números nos skeletons | nenhum |
| Capturas 320/768/1280 px, claro e escuro, 6 rotas | 36; nenhuma com rolagem horizontal |
| Movimento reduzido | nenhum skeleton anima; todos têm `role="status"` com texto |

As capturas foram vistas em parte, sem comparação de pixel com o "antes":
- o Vigia olhou 3 (320 px, claro);
- o Orquestrador olhou mais 4 (empresa em 320 px escuro, glossário em 1280 px escuro, home em 768 px
  escuro, login em 320 px escuro), todas corretas;
- a 2B já tinha 30 de 30 capturas iguais antes e depois.

Durante a missão, cada entrega passou por lint, `tsc`, `npm test` (298 → 316 casos), build e
`seo.dist.mjs` (8 → 9). Testes novos:
- `tests/public-cache.test.mjs`;
- teste do CSS da home e do JSON do glossário em `tests/seo.dist.mjs`;
- `tests/api-client.test.mjs`.

## 9. Problemas não resolvidos

- **`/aprender` em 1920×1080: CLS 0,227**, igual antes e depois, já existente antes da missão.
  - Causa: o cliente começa sem o conteúdo que o prerender mostrou e exibe um bloco de 92 px que some
    quando as aulas chegam (`Aprender.tsx:499-513`).
  - Por que ficou: o conteúdo muda com o login (prévia × completo), então embutir a prévia faria o
    usuário logado ver aulas bloqueadas por um instante. Precisa de tarefa própria.
- **Fluxos logados que exigem MySQL** (sessão, notificações, carteira): não executados nesta máquina,
  porque o banco Aiven está desligado. O CI cobre.
- **Abas de `/aprender` em 320 px:** a faixa de abas corta o último item dentro do próprio componente,
  sem rolagem da página. `Aprender.tsx` não mudou nesta missão; não foi comparado com o "antes".
- **`npm audit`:** 9 alertas moderados, todos do mesmo `minimatch`, só no lint (recomendação 2).
- **CLS de `/ranking/acao/TIMS3` em 1920 px:** não medido.

## 10. Pendências e recomendações

1. Corrigir o CLS de `/aprender` em telas largas, com tratamento separado para visitante e usuário
   logado.
2. Atualizar `eslint` (^10.15) e `typescript-eslint` (^8.73), dentro das faixas, para fechar o alerta
   de `minimatch`, com `npm ci`, lint e testes.
3. Levar os tokens de movimento aos outros 6 CSS e unificar `--ph-ease` com `--ediv-ease-emphasis`.
4. Divisões com ganho real, em fatias próprias:
   - o painel de publicação para fora de `IncomeRanking.tsx`;
   - `Aprender.tsx`;
   - `Configuracoes.tsx` (precisa de teste antes);
   - `ResearchEditor.tsx`;
   - a sessão para fora de `server/auth.js`;
   - `src/lib/marketData.ts`;
   - um hook único para `/api/learning`.
5. Sinalizados, sem prova suficiente para apagar:
   - `FavoritesProvider` sem consumidor (`entry-server.tsx:4,36`);
   - 19 classes de CSS órfãs;
   - logos PNG antigas em `public/` (podem ter uso externo);
   - ramos `member`/`awaitingRegistration` de `AccountHomeContent`.
6. Cache de borda de `/api/learning` só com um contrato separado (parte pública × progresso).
7. Paginação do extrato da carteira e índices (`support.updated_at`, `users.created_at`) depois de um
   EXPLAIN no banco real.
8. Os outros "Carregando…" (`HistoryCharts`, `ConversationInbox`, `ConversationPanel`,
   `NotificationsMenu`) e o ruído de 401 de `/api/auth/me` no console do visitante.
9. Conferir as abas de `/aprender` em 320 px: indicar que há mais itens (sombra na borda ou rolagem
   visível) se o corte for confirmado.

## Publicação

O dono autorizou a publicação completa em 17/11 ("faça tudo"). Depois do QA final APTO, a Chave
publica uma PR com os commits separados por assunto (`docs/harness/briefs/final-chave.md`) e faz o
merge com squash depois dos checks verdes. A conferência da produção, feita só com GET em páginas
públicas, é relatada ao dono na entrega.
