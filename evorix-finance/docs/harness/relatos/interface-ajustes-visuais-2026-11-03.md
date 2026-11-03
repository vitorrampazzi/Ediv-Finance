# Interface: ajustes visuais (03/11/2026)

## Entregue

1. **Título da aba**: `pageMetadata` sempre devolve `title: "Escola do Dividendo"`; o título por página virou `socialTitle` (og:title e twitter:title), usado pelo prerender e por `PageMetadata.tsx`. O HTML estático e a SPA ficam iguais. `/app` deixou de ter "Início | …".
2. **Animação da home**: removidos os rótulos "Pesquisa de ações" e "Educação em dividendos", as linhas e os pinos, e também o botão "Pausar animação" (`PublicHeroBrand.tsx`, `hero-brand.css`). A animação continua parada com `prefers-reduced-motion` e também fora da tela (`data-ph-inview`). A home logada reaproveita o mesmo componente, então a mudança vale para as duas. O botão "Pausar ilustração" do TeachingJourney não mudou.
3. **Ferramentas do ranking**: em vez de três cards, as ferramentas agora ficam numa única faixa `.ranking-tools`, com bordas em cima e embaixo e divisórias finas entre os itens. Cada `summary` (`ToolSummary`) mostra um ícone lucide pequeno, o rótulo, uma descrição curta em texto secundário e um chevron que gira ao abrir. O hover é sutil e o foco aparece em `:focus-visible`. Ficaram iguais: `details`/`summary`, o id `#publicar-pesquisa`, a permissão da Área da equipe, os textos exatos dos rótulos e o conteúdo de cada ferramenta.
4. **KPIs da home logada**: cada ação mostra três KPIs. Na pesquisa de dividendos são Cotação de referência, Preço teto e Margem de segurança, todos formatados por `formatDividendValue`. Na pesquisa legada ou na demonstração são Potencial, Preço-alvo e Horizonte. Campo ausente aparece como "—". No celular, os KPIs formam uma grade de 3 colunas abaixo do nome, alinhada pela base.
5. **Por onde começar**: são dois blocos lado a lado no desktop e empilhados no celular. Cada bloco tem uma ilustração SVG de traço fino (`currentColor` com `text-evo-border` e `text-evo-accent`), um título maior, o texto de apoio, uma chamada com seta e um detalhe real: "2 cursos · 4 aulas", tirado de `learningCatalog`. O componente não tem a contagem de empresas sem fazer uma nova requisição, por isso ela não aparece. Destinos mantidos.

## Verificações

- `npm test` 132/132, `npm run lint` e `npm run build` passaram; o `<title>` de dist/ranking, app.html, 404 e entrar é "Escola do Dividendo".
- Screenshots feitas com Playwright no build servido em 127.0.0.1 e APIs simuladas (TST1–TST6), em 1440 e 375 px, nos temas escuro e claro. Nenhuma tem rolagem horizontal.
- `node tests/public-home.browser.mjs` 10/10 PASS. Na primeira execução, mobile-320 falhou com 404 de assets porque um `npm run build` rodou ao mesmo tempo; executado sozinho, passou.
- `node tests/public-rankings.browser.mjs` passou (exit 0). O console mostra o aviso React de chave duplicada `27`, que não foi investigado.
- Os testes browser.mjs, dividend.browser.mjs e browser-experience.mjs (este com banco) não foram executados.

## Próximo passo

QA: conferir por teclado as ferramentas abertas e a home logada em 320 px.
