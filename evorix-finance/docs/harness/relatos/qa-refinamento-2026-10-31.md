# QA — Ranking de Ações, marca e tipografia — 31/10/2026

## Escopo

Validação independente do refinamento de nomenclatura do ranking, remoção de
metadados de publicação decorativos, reutilização da marca animada na home
autenticada e família Instrument Sans. Fixtures são locais e sintéticas; nenhuma
consulta ou escrita foi feita em produção ou banco real.

## Alterações de QA

- `tests/public-rankings.browser.mjs`: cobre `Ranking de Ações` nas rotas públicas
  e autenticadas, ausência de `publication.title` e data em homes/cards, mesmos
  90 tickers e ordem, seletor e navegação de versão, aviso de cotação de
  referência, data no eixo/tooltip histórico, fontes computadas em texto, input,
  tooltip e gráfico, primeira pintura com CSS da marca, IDs únicos e animação
  original/reutilizada com pausa e movimento reduzido. Captura desktop da home
  autenticada em dark/light e mobile320 dark/light.
- `tests/figma-stock.browser.mjs`: ajusta as expectativas para Instrument Sans
  no título, dados, gráfico e tooltip; verifica que somente essa família e seus
  arquivos de fonte são carregados.
- `tests/public-home.browser.mjs`: aguarda `document.fonts.ready` antes das
  comparações temporais de pixels.
- `tests/accessibility.browser.mjs` e `tests/dividend.browser.mjs`: atualizam
  expectativas de rótulos visíveis para `Ranking de Ações`. Os títulos de fallback
  da API e os dados de versão persistidos permaneceram intactos.

## Verificações executadas

- Node 22.23.3 — `npm test`: 128/128 aprovados.
- Node 22.23.3 — `npm run lint`: aprovado após as alterações de QA.
- Node 22.23.3 — `npm run build`: aprovado após os ajustes finais de pré-render e
  rótulos; TypeScript, bundles client/SSR e oito rotas públicas pré-renderizadas.
- `tests/public-rankings.browser.mjs`: 10/10 grupos aprovados com 90 registros
  sintéticos e APIs simuladas; zero `pageerror` e zero rotas inesperadas. Inclui
  dark/light, 320px, autenticação simulada, histórico de versão, gráficos e
  tipografia. JSON local: `.test-artifacts/public-rankings-browser/results.json`.
- `tests/stock-theme.browser.mjs`: 6/6 cenários aprovados, desktop, mobile390 e
  mobile320 nos dois temas.
- `tests/public-home.browser.mjs`: na matriz inicial, desktop, tablet, mobile,
  320px, paisagem e os dois cenários reduced-motion passaram. Desktop baixo teve
  drift de 2 pixels com delta máximo 1 na captura pausada do hero, antes da espera
  de fontes. Repetição isolada desse cenário com `document.fonts.ready` passou;
  a espera foi mantida no teste. A matriz completa não foi repetida após essa
  estabilização.
- `git diff --check`: aprovado; Git emitiu somente aviso de normalização CRLF/LF
  no `docs/harness/CONTEXTO.md` alterado pela coordenação.

## Limites

`tests/figma-stock.browser.mjs` não foi executado localmente: a fixture prevista
em `127.0.0.1:4332` não estava ativa. `tests/accessibility.browser.mjs` e
`tests/dividend.browser.mjs` tiveram apenas as expectativas verificadas; suas
suítes de browser ficaram para os checks gerais da CI. Não foram configurados
serviços SQL para esta validação.

Capturas da home autenticada, inspecionadas em desktop:

- `.test-artifacts/public-rankings-browser/member-home-1366-dark.png`
- `.test-artifacts/public-rankings-browser/member-home-1366-light.png`
- `.test-artifacts/public-rankings-browser/member-home-320-dark.png`
- `.test-artifacts/public-rankings-browser/member-home-320-light.png`

Sem achado funcional bloqueador nos cenários executados. Próximo passo: checks
`quality` e `dependency-security` na PR, incluindo as suítes de browser adiadas.
