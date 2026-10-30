# Recuperação da home e cores das ações — 29/10/2026

## Solicitação e correção de rumo

Usuário rejeitou a home publicada por falta de movimento e responsividade em
computador e celular. Autorizou recuperar/melhorar a versão existente, alinhar
as cores das páginas de ação e integrar na main, dispensando PR quando possível.
Preservar proteções remotas existentes; nenhum bypass foi autorizado.
Checkout iniciou limpo em main/d543a04, sem alterações de terceiros.

## Diagnóstico

A verificação anterior de animationName era insuficiente: propriedades CSS
permanecem definidas quando um efeito finito já terminou. As animações de350ms e
fluxo2iterações não garantiam movimento perceptível durante leitura. O teste
anterior também usava ranking vazio, não cobrindo a composição real da home.
Além disso o breakpoint min-height700 transformava desktop baixo em uma lista
mobile longa, deixando espaço vazio e perdendo a narrativa em duas colunas.

Frontend identificou referência33cbd2b com fluxo contínuo1.8s; não copiou QA,
que é uma POC antiga sem PublicHome/TeachingJourney. Recuperação focada no
comportamento/identidade históricos com melhorias responsivas e acessibilidade.

## Escopos

- Orquestrador: comparação/revisão, critérios de aceitação e publicação.
- Frontend: TeachingJourney e CSS; estúdio compartilhado compacto mobile,
  duas colunas também no desktop baixo, três cenas com movimento contínuo,
  pausa/reprodução e suspensão fora de viewport/documento oculto/reduced-motion.
- Backend: StockMake usava paleta própria. Fundos, superfícies, textos, bordas,
  destaques e positivo/negativo agora herdam tokens globais em claro/escuro;
  gráficos removem cores de fundo/linha fixas. Sem API/dados alterados.
- QA: baseline visual, quadros temporais em vez de só nome de animação, home
  completa com publicação de3empresas, desktop/tablet/mobile e cores das abas
  da ação renderizadas com fixtures locais. Sem escrita em produção.

## Critérios de aprovação

Movimento real medido vários segundos após entrada, nos três diagramas e hero;
pausa e reduced-motion comprovadamente estáticos. Estúdio visível durante as
etapas em janelas normais, sem cobrir texto/CTAs; títulos/hero/ranking/FAQ/rodapé
cabem em320/390/768/1366/1440px. Retorno/navegação/título/console preservados.
Tokens de fundo/textos das ações iguais ao padrão global nos dois temas.

## Retomada em30/10

Usuário solicitou continuar após interrupção por limite do agenteQA. Nenhuma
alteração foi publicada durante a interrupção. Main local/remota continuavam
sincronizadas emd543a04, mudanças de produto preservadas no workingtree.

Node22:128/128 testes e lint/build aprovados antes da pausa. Cores6/6cenários
(desktop/mobile390/mobile320, temasdark/light, sete seções) aprovadas, sem erros
console/rotas inesperadas. Coordenação inspecionou capturas reais de StockMake,
home inteira desktop baixo e leitura mobile/paisagem.

Teste temporal confirmou defeito da verificação antiga: comparar apenas dois
quadros de um loop pode coincidir na mesma fase. QA passou a amostrar vários
quadros em intervalos diferentes, além de geometria por mais de um ciclo;
pausa/reduced continuam exigindo todos os quadros estáticos. Nenhuma assertiva
foi removida para aprovar implementação sem movimento.

A inspeção paisagem detectou borda do estúdio sob o header; corrigido o offset
para84px+safe-area e acrescentada conferência da geometria contra header real.
Frontend comunicou QA para rebuild antes da validação final.

Validação final30/10: browser exit0,10/10checks(HTML+9cenários), incluindo
1440x900,1366x650,768x1024,390x844,320x760,320x568,844x390 e reduced
emdesktop/mobile. Cincoquadros em intervalos distintos comprovam movimento real;
pausa/reduced exigem0pixels mudando. Header não cobre estúdio emnenhuma etapa,
com4pxdefolga emlandscape. QA e coordenação inspecionaram capturas reais.
Cores6/6cenários e42seções percorridas;128unitários/lint/build aprovados.
Revisão React: efeitos com cleanup, RAF/passive scroll e updates sem timers;
movimento CSS pausado emcenainativa/offscreen/abaoculta e reduced-motion.
Sem mudança deAPI, dados, dependências ou configurações deprodução.
