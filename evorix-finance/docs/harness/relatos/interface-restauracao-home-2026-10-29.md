# Frontend — restauração da narrativa animada (29/10/2026)

## Nova demanda e diagnóstico

Usuário rejeitou a entrega anterior em desktop e mobile e pediu recuperar a
homepage existente e melhorar a responsividade. Orquestrador delegou a correção
sem publicação por este agente. Caminhos reservados no harness antes da edição.

Histórico conferido: `TeachingJourney` foi criado em `6d3615d`; `33cbd2b` tinha
fluxo de dividendos contínuo (1,8s), barras de 550ms e revisão de 650ms, com pausa
fora da área visível. `645f020` já simplificava o movimento, removendo fluxo e
revisão e escondendo figuras locais no desktop. A entrega `d543a04` não recuperou
essa experiência: entradas finitas terminavam rapidamente e desktop baixo
passava a figuras empilhadas. Portanto restaurar apenas seu pai não resolveria.
`origin/QA` aponta a POC antiga `1475dbd` e não contém estes componentes; não foi
copiada como se fosse a versão visual anterior desta homepage.

## Implementação

- Mantidos os SVGs, copy, temas, destinos atuais e a identidade da homepage.
- Recuperado fluxo contínuo histórico, com movimento persistente nas três cenas:
  barras crescem/encolhem em 3,6s, revisão desloca suavemente em 3,8s e dividendos
  percorrem o caminho em 1,8s. Cenas inativas e estúdio fora da viewport pausam.
- Um único estúdio acompanha a leitura em desktop e mobile. A seleção continua
  pelo scroll com RAF, sem timers concorrentes. A linha de leitura mobile
  considera a área disponível abaixo da ilustração.
- Desktop baixo mantém duas colunas e usa título/ilustração compactos; mobile
  usa estúdio sticky com SVG de 110–150px, retirando as três figuras duplicadas.
  Em paisagem (largura de 480–959px e altura até 550px), a introdução ocupa uma
  linha acima e estúdio/textos usam duas colunas, mantendo a figura sticky visível
  nas três etapas. Viewports estreitas e baixas usam estúdio sticky menor.
- Botão de pausar/reproduzir com alvo mínimo de 44px e `aria-pressed`; pausa ao
  ocultar o documento e limpeza de observer/listeners/RAF ao desmontar.
- Movimento reduzido desativa animações/transições e mantém desenhos completos.
  Ausência de IntersectionObserver mantém a ilustração estática e a seleção por
  scroll operacional.
- Inspeção do hero, ranking, FAQ e CSS geral não mostrou quebra concreta a
  corrigir antes da validação visual. Hero com floresta/logo foi preservado.

## Arquivos e verificações

Alterados `TeachingJourney.tsx`, `teaching-journey.css` e este relato.
`public-home.css` e `hero-brand.css` foram reservados para inspeção, sem edição.

- ESLint do TSX: passou.
- TypeScript `tsc -b`: passou.
- Prettier e `git diff --check`: passaram.
- Harness: quatro papéis e reservas sem conflito.
- QA captura baseline e verifica movimento real por amostragem de vários frames,
  desktop/mobile, pausa e reduced-motion. Browser integrado e aprovação de
  produção dependem desse retorno; não declarados aprovados antecipadamente.

Revisão identificou que o primeiro fallback relativo em paisagem deixaria a
figura fora da tela nas etapas 2/3; corrigido antes da validação final com a
composição em duas colunas descrita acima. QA avisado antes da edição e responsável
pelo build único e pelos testes de `844×390` e `320×568`.

## Retomada em 30/10 — folga do cabeçalho em paisagem

A revisão visual da coordenação em `844×390` identificou o topo do estúdio
encoberto pelo cabeçalho: o offset de 4,5rem equivalia a 72px, abaixo dos cerca de
80px do header. O offset do modo paisagem passou a 5,25rem (84px na escala padrão)
mais safe-area, deixando folga sem alterar as colunas ou o movimento. Formatação,
diff e harness verificados; QA avisado para incluir a geometria header/estúdio no
build e teste final. Nenhuma publicação por este agente.

Nenhum Git remoto, migração, dependência ou ambiente de produção foi alterado por
este agente. Coordenação integra os resultados e decide publicação após os gates.
