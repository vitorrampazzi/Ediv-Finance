# Cores das páginas de ação — 29/10/2026

## Demanda e causa

Usuário pediu que as páginas dentro da ação usem a cor padrão do site inteiro.
Delegação recebida do Orquestrador; nenhum acesso de banco/API necessário.

`DividendResearch.tsx` usa `StockMake`, compartilhado entre as abas da pesquisa.
O wrapper `.figma-stock` em `stock-make.css` declarava uma paleta independente:
fundo escuro #0e1113 em vez do canvas global #1c2025, superfícies e textos próprios
e outra lista de valores para light. Por isso a página da ação destoava do layout
e das demais páginas. Alguns pontos/linhas de gráficos também tinham hex fixos.

## Correção

- `src/components/stock-make/stock-make.css`: aliases fmk de canvas, inset,
  superfície, bordas, texto, muted, accent, primary, positivo e negativo agora
  referenciam diretamente os tokens `--ediv-*` existentes. Os dois temas herdam
  a paleta global automaticamente; sem duplicar seus valores.
- Cores auxiliares amber/lilac/steel mantidas para distinguir séries e situações
  sem equivalentes globais; seus valores já variam entre light/dark.
- `src/components/stock-make/Charts.tsx`: pontos usam o canvas da pesquisa;
  linha de zero, cursor e linha neutra usam os tokens de borda/muted.
- Nenhuma alteração de layout, conteúdo, dados financeiros, requisição, API,
  contrato, rota ou dependência. Homepage e TeachingJourney não foram editados.

## Evidências e limites

- Lint focado de Charts.tsx: aprovado.
- `git diff --check`: aprovado.
- `node scripts/harness.mjs check`: quatro papéis sem conflito.
- Contraste calculado pela fórmula de luminância WCAG entre muted global e
  canvas/surface/inset: dark 9.43/8.35/8.81; light 6.17/6.58/5.77. O menor valor
  excede 4.5:1 para os textos auxiliares que substituíram os tons próprios antigos.
- QA informado dos arquivos, das equivalências de tokens e dos cenários a testar
  em fixtures locais: temas, desktop/mobile e abas da pesquisa/gráficos.
- Validação visual e build completo pertencem ao QA/coordenação e ainda não são
  declarados aprovados neste relato. Nenhuma publicação executada pelo agente.
