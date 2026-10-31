# Interface — refinamento do ranking e home — 31/10/2026

## Escopo e aceitação

Renomear os títulos e textos visíveis das variantes do ranking para “Ranking de Ações”; trocar o painel interativo direito da home autenticada pelo hero público já existente; retirar datas repetidas de publicação nos cards e cabeçalhos, sem mexer na seleção/histórico das versões nem nos períodos úteis de dados; preservar a indicação de cotação de referência sem atualização ao vivo.

## Arquivos alterados

- `src/components/SiteChrome.tsx`, `src/layouts/DashboardLayout.tsx`, `src/components/GettingStarted.tsx`, `src/components/RankingAccessLanding.tsx`, `src/components/EdivAssistant.tsx`, `src/components/DividendResearch.tsx`, `src/components/home/PublicQuestions.tsx` e `src/pages/IncomeRanking.tsx`: nomes visíveis e textos de ajuda/captions atualizados. Rotas e IDs permanecem os mesmos.
- `src/components/home/AccountHomeContent.tsx`: home autenticada usa `PublicHeroBrand` com `usePublicHomeMotion`; a home pública conserva `RankingPreview` quando `member` é falso. O hook observa `[data-ph-loop]`, limpa o observer no cleanup e mantém a regra de movimento reduzido existente.
- `src/components/RankingHighlights.tsx`, `src/components/home/ResearchSample.tsx` e `src/pages/StockResearch.tsx`: a UI mostra o rótulo do ranking em lugar de `publication.title`; removidas as datas repetidas de publicação. O período dos dados permanece uma vez na pesquisa; a repetição no painel lateral foi removida.
- `docs/harness/relatos/interface-refinamento-2026-10-31.md`: este relato.

Títulos armazenados, APIs, rotas, IDs e conteúdo de gráficos não foram alterados. O seletor de histórico de `IncomeRanking` continua exibindo datas para identificar as versões. A nota de cotação de referência sem preço ao vivo foi preservada.

## Estilo coordenado

O wrapper novo da arte usa `.member-home-brand-entry`. A coordenação precisa definir o dimensionamento para a coluna da home autenticada (largura fluida, máximo próximo de 600px e proporção 600/550; limite móvel adequado). Não alterei CSS/globais. A busca nos TSX não encontrou declarações `Inter`, `Instrument Sans` ou `fontFamily` inline a substituir.

## Verificações

- ESLint focado nos 12 TSX alterados: passou.
- `node scripts/harness.mjs check`: quadro válido, quatro papéis e reservas sem conflito.
- `git diff --check`: passou.
- Build, suíte e browser não foram executados pela interface; ficam para a coordenação/QA conforme combinado. A aparência final do novo wrapper depende da regra CSS da coordenação.
