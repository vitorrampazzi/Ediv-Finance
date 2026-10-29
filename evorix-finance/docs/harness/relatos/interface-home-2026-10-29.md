# Frontend — homepage pública, 29/10/2026

## Escopo e aceitação

Demanda explícita: título da homepage exatamente `Escola do Dividendo` e
progressão Empresa → Pesquisa → Dividendos fluida, preservando desenho, temas,
acessibilidade e responsividade. Delegação real recebida do Orquestrador pelo
mecanismo de subagentes da sessão. Nenhuma instalação, publicação ou Git remoto
executado por este agente.

O quadro antigo rejeitava este checkout. A investigação inicial foi somente
leitura; após a coordenação migrar o harness para quatro papéis portáteis, os
arquivos abaixo foram reservados com `claim interface` antes da edição.

## Causas verificadas no código e correções

- `index.html` já possuía o título correto. `site-pages.mjs` fornecia o título
  longo usado tanto por `scripts/prerender.mjs` quanto pelo efeito de
  `PageMetadata.tsx`. A fonte compartilhada agora fornece o nome exato.
- `TeachingJourney.tsx` selecionava etapas somente quando o IntersectionObserver
  cruzava seus thresholds. O cruzamento dos centros com a linha de leitura entre
  thresholds não disparava atualização. A seleção agora mede os três artigos
  em scroll passivo e resize, agrupados em um único requestAnimationFrame.
  A limpeza cancela o frame e remove os listeners. Não há temporizadores.
- O CSS animava somente as barras das figuras mobile; o estúdio desktop não
  acionava essa animação e revisão/fluxo não possuíam keyframes. Agora cada cena
  tem entrada finita quando visível; o fluxo faz duas passagens e volta ao traço
  estático. Todas continuam compreensíveis sem movimento, sem JS ou sem observer.
- A ilustração compartilhada era usada em desktop baixo, mas o sticky só existia
  acima de 700px de altura. Ao ler as etapas seguintes, a ilustração saía da tela.
  Desktop abaixo de 700px agora usa as figuras locais existentes, assim como
  mobile; o layout desktop tradicional permanece em largura ≥960px e altura ≥700px.
- Os SVGs e textos originais, tokens de temas, links e demais seções foram
  preservados. `prefers-reduced-motion` desativa animações/transições.

## Arquivos deste agente

- `site-pages.mjs`
- `src/components/home/TeachingJourney.tsx`
- `src/components/home/teaching-journey.css`
- Este relato.

O teste de metadados e a regressão browser pertencem ao QA, evitando sobreposição.

## Verificações executadas

- `git diff --check`: passou.
- `node scripts/harness.mjs check`: quatro papéis e reservas sem conflito.
- `node --test tests/site.test.mjs`: 5/5 passaram, incluindo o título exato.
- Lint, TypeScript/build e browser: aguardando preparação das dependências pelo
  Orquestrador e execução pelo QA; não declarados aprovados nesta etapa.

Próximo passo: QA validar scroll em ambas as direções, navegação de ida/volta,
desktop alto/baixo, mobile e movimento reduzido. Coordenação integra e publica
somente após seus gates.
