# QA — recuperação visual da home e cores da ação — 29–30/10/2026

## Falha de cobertura anterior e diagnóstico

A validação anterior verificava `animationName` e a troca de etapas, mas isso
não comprovava movimento perceptível durante a leitura. O nome da animação
permanece definido depois que uma animação finita termina. A fixture anterior
também deixava o ranking público vazio, sem exercitar os três cards na home.

Antes de reconstruir o produto, foram capturados o build anterior e a home
inteira em 1440×900, 1366×650, 768×1024, 390×844 e 320×760, incluindo três
cards com nomes longos. Amostragem temporal confirmou que Empresa e Pesquisa
tinham apenas um estado após 1,5s; Dividendos também parava ao terminar o ciclo
finito de 2,8s. O hero anterior já se movia em desktop/mobile e sua pausa
funcionava; movimento reduzido o mantinha estático.

Evidências locais ignoradas: `.test-artifacts/home-recovery-baseline/`, incluindo
`baseline-summary.json`, `hero.json`, capturas da home e quadros por etapa.

## Testes modificados

- `tests/public-home.browser.mjs`: usa três empresas sintéticas com nomes longos;
  captura a home inteira e mede geometria, navegação, título, console e movimento
  real do hero e das três ilustrações em desktop, mobile e paisagem.
- O movimento é medido depois de 3,4s de entrada, com geometria amostrada durante
  4,2s e cinco screenshots do mesmo recorte em intervalos desiguais. Exige
  variação superior a 1px e pelo menos um par com mais de dez pixels diferentes.
  Os pixels são decodificados antes de comparar; o nome da animação não é usado
  como evidência suficiente. Nenhuma animação é desabilitada para capturar.
- Pausa e movimento reduzido exigem todos os cinco quadros idênticos e variação
  geométrica inferior a 0,02px. A pausa aguarda o término da transição de cena
  para não confundir o crossfade anterior com movimento ainda em execução.
- `tests/stock-theme.browser.mjs`: monta a rota React autenticada de uma ação
  com APIs simuladas, visita as sete seções por navegação/foco e confere que a
  paleta efetivamente renderizada corresponde aos tokens globais, nos dois temas.
- `tests/run-browser.mjs`: inclui a regressão de cores no runner da CI existente.

Uma primeira comparação entre apenas dois quadros coincidiu com a mesma fase
de um loop e falhou apesar da variação geométrica comprovada. As capturas
continham a figura correta e não estavam encobertas. A amostragem em cinco fases
distintas elimina essa ambiguidade sem diminuir a exigência de movimento.

## Verificações realizadas

- Node 22.21.0: 128/128 testes unitários aprovados nesta rodada.
- ESLint completo e build final aprovados, incluindo TypeScript, bundle e oito
  HTMLs públicos; refeitos após o ajuste final de folga do header em paisagem.
- Browser final de 30/10: **10/10 verificações aprovadas** (HTML e nove cenários):
  1440×900, 1366×650, 768×1024, 390×844, 320×760, 320×568, 844×390 e os dois
  cenários de movimento reduzido desktop/mobile. Título exato após hidratação,
  metodologia→home e reload; etapas 0→1→2→1→0; três cards; CTAs contidos;
  desktop baixo em duas colunas; estúdio inteiro visível e abaixo do header;
  texto da etapa móvel abaixo do estúdio. Zero erros inesperados de console.
- As três cenas apresentaram pixels diferentes em todos os sete cenários com
  movimento: até mesmo o menor quadro móvel teve 61 pixels diferentes na cena
  Dividendos, acima do mínimo exigido de dez. Empresa variou 17,79–42,05px e
  Pesquisa 3,41–8,06px de geometria ao longo dos ciclos. O hero também comprovou
  movimento real em todos os tamanhos. Ambos os controles de pausa passaram.
- Nos dois cenários reduzidos, hero e três cenas apresentaram variação geométrica
  zero e zero pixels diferentes entre os cinco quadros. A leitura foi preservada.
- Capturas atuais de mobile390, 320×568 e paisagem844×390 foram inspecionadas
  visualmente, incluindo etapas Empresa e Dividendos. O estúdio acompanha a
  leitura; a folga corrigida em paisagem deixa seu topo abaixo do cabeçalho.
  Evidências: `.test-artifacts/public-home/report.json`, `*-whole.png`,
  `*-reading*.png`, `*-frame-a.png` até `*-frame-e.png`.
- Páginas de ação: 6/6 cenários aprovados, cobrindo 1440×900, 390×844 e 320×568
  nos temas claro e escuro. As sete seções foram renderizadas e percorridas em
  cada cenário; canvas, texto, inset, superfície e muted correspondem aos tokens
  globais. Sem overflow, erros de console/pageerror ou APIs fora da fixture.
- Capturas de ação em `.test-artifacts/stock-theme/`; desktop escuro e mobile
  claro inspecionados visualmente. Nenhum dado foi gravado em banco.
- `git diff --check` e harness com quatro papéis sem conflitos aprovados.

## Limites

Os testes locais usam apenas fixtures, sem acessar banco ou escrever em produção.
A resposta 401 simulada de `/api/auth/me` na home representa visitante e é
contabilizada separadamente; erros inesperados continuam falhando o teste.
Publicação pertence ao Orquestrador após sua revisão e os checks remotos.
Não há bloqueador local de QA. Os gates SQL/backup e a suíte browser completa
da CI desta nova alteração ainda precisam ser acompanhados pelo Orquestrador.

## CI e correção da fixture de tema — 30/10

O workflow `quality` 41058462306 aprovou os 128 unitários, lint, build, 51 testes
SQL e as dez verificações temporais da home. A etapa browser falhou somente em
duas leituras do tema claro no teste novo de cores: desktop e mobile390 ainda
leram o fundo escuro enquanto a variável global já indicava o canvas claro.
Mobile320 claro e todas as suítes anteriores passaram. O backup final foi
pulado pela falha anterior; não deve ser declarado aprovado nessa execução.
`dependency-security` 41058462355 concluiu com sucesso.

A fixture alterava `document.documentElement.dataset.theme` diretamente e lia
os estilos na sequência, contornando `window.edivTheme` e a interação real.
O teste agora usa o botão “Ativar tema claro”, confirma atributo do HTML,
snapshot do store e rótulo do controle inverso, e aguarda por condição observável
que fundo/texto/superfícies/muted correspondam aos tokens antes da captura.
As comparações exatas foram preservadas; nenhum sleep fixo foi acrescentado.
Nenhum arquivo de produto foi alterado nessa correção da fixture.

Com o fluxo real, os seis cenários locais de cores passaram novamente com Node22,
sem erros ou APIs inesperadas. Syntax e ESLint focado aprovados. Nova CI completa
continua necessária antes de integrar/publicar a correção.
