# Refinamento visual e padronização — 31/10/2026

## Pedido e equipe

Implementação autorizada no clone C:/Users/vitor/Evorix-finance/evorix-finance, base main1bcf958. Três subagentes reais: Frontend cuidou de TSX/nomes/datas/brand reutilizada; Backend auditou contratos/dados em leitura; QA mantém fixtures/asserts e validação independente. Coordenação integra CSS/global, metadados, revisão e publicação via PR/checks, sem force ou bypass. Java untracked preservado.

## Alterações

- Rótulo Ranking de Ações em navegação pública/logada, headings, captions, ajuda/FAQ/tour/assistente e metadados. Sem renomear rotas, IDs, endpoints ou títulos persistidos.
- Mesa de Pesquisa: HomeContent(member) reutiliza PublicHeroBrand e usePublicHomeMotion no wrapper .member-home-brand-entry. Logo, animação e controle de pausa originais são compartilhados; hook limita movimento a visibilidade/aba ativa e respeita reduced-motion. Esquerda e home pública preservadas. Wrapper fluido max540px desktop/max380px mobile, proporção do próprio componente.
- Datas decorativas removidas de RankingHighlights(home logada), ResearchSample(home/ranking público), cabeçalho de IncomeRanking e repetições em StockResearch. Títulos editoriais que continham datas são substituídos apenas na apresentação por Ranking de Ações. Datas funcionais do seletor de versões, período da pesquisa e eixos/históricos continuam. Nota de cotação de referência sem preço ao vivo preservada.
- Instrument Sans única família textual: @font-face central src/typography.css, arquivo variável já existente com eixo wght400..700 confirmado nos metadados. Tokens CSS/Tailwind comuns para sans/serif/mono e aliases internos; body, títulos, números, tooltips, fallback das logos, módulos e textos públicos herdam a família. Removidas faces Newsreader/DM Mono do CSS; binários/licenças antigos não são carregados. Nenhuma dependência nova.

## Revisão

Sem alterações de API, banco, cálculos, dados Excel/AGF, configurações de credenciais ou serviços. Todos os caminhos foram reservados no harness antes de editar. Instrument Sans mantém números tabulares; pesos reais400..700 e síntese apenas de estilo itálico quando necessário.

## Validação

QA independente concluída sem bloqueador local:128/128 unidades; lint/build final Node22 PASS (8rotasSSR); public-rankings10/10 grupos incluindo90registros/ordem/versão/dados/fontes/motion/firstpaint; stock-theme6/6. Matriz inicial home teve um drift de2pixels(delta1) em desktopbaixo pausado; fontes ainda não tinham sido aguardadas. Reteste só desse cenário com document.fonts.ready PASS, matriz completa restaurada e limiares intactos. CI deve confirmar toda matriz final, além deSQL/backup/browserFigma/dividendos/a11y adiados localmente por ausência de fixture/decisão de evitar SQLnovo.

Coordenação inspecionou capturas homeautenticada1366dark/light e320dark e aprovou composição. Reutilização moveu CSS da marca para chunkAccountHomeContent: prerender passou a incluir esseCSS noHTMLinicial e QA adicionou assertion real da estilização firstpaint. Dois seletores de versão também mostram Ranking de Ações com data/ID, títulos persistidos intactos. Semsegredos/deps/serviçosnovos.

Arquivos financeiros e APIs têm diff vazio; package/lock inalterados. Arquivos alterados da entrega:

- `evorix-finance/docs/harness/CONTEXTO.md`
- `evorix-finance/docs/harness/relatos/backend-refinamento-2026-10-31.md`
- `evorix-finance/docs/harness/relatos/coordenacao-refinamento-2026-10-31.md`
- `evorix-finance/docs/harness/relatos/interface-refinamento-2026-10-31.md`
- `evorix-finance/docs/harness/relatos/qa-refinamento-2026-10-31.md`
- `evorix-finance/docs/harness/state.json`
- `evorix-finance/scripts/prerender.mjs`
- `evorix-finance/site-pages.mjs`
- `evorix-finance/src/components/DividendResearch.tsx`
- `evorix-finance/src/components/EdivAssistant.tsx`
- `evorix-finance/src/components/GettingStarted.tsx`
- `evorix-finance/src/components/RankingAccessLanding.tsx`
- `evorix-finance/src/components/RankingHighlights.tsx`
- `evorix-finance/src/components/ResearchTools.tsx`
- `evorix-finance/src/components/SiteChrome.tsx`
- `evorix-finance/src/components/company-logo.css`
- `evorix-finance/src/components/fundamental-center.css`
- `evorix-finance/src/components/home/AccountHomeContent.tsx`
- `evorix-finance/src/components/home/PublicQuestions.tsx`
- `evorix-finance/src/components/home/ResearchSample.tsx`
- `evorix-finance/src/components/home/hero-brand.css`
- `evorix-finance/src/components/home/hero-panel.css`
- `evorix-finance/src/components/home/public-home.css`
- `evorix-finance/src/components/home/public-sections.css`
- `evorix-finance/src/components/stock-make/stock-make.css`
- `evorix-finance/src/components/tooltip.css`
- `evorix-finance/src/index.css`
- `evorix-finance/src/layouts/DashboardLayout.tsx`
- `evorix-finance/src/pages/IncomeRanking.tsx`
- `evorix-finance/src/pages/StockResearch.tsx`
- `evorix-finance/src/typography.css`
- `evorix-finance/tailwind.config.js`
- `evorix-finance/tests/accessibility.browser.mjs`
- `evorix-finance/tests/dividend.browser.mjs`
- `evorix-finance/tests/figma-stock.browser.mjs`
- `evorix-finance/tests/public-home.browser.mjs`
- `evorix-finance/tests/public-rankings.browser.mjs`

Publicação: PR/main/checks pendentes; não há deploy afirmado neste commit de preparação.
