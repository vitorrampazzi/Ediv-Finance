# Coordenação: home com três cards, gráficos de proventos e lucro (10/11/2026)

O pedido veio do corretor em 09/11, repassado pelo dono. O contrato está em
`docs/HOME-E-GRAFICOS-2026-11-10.md`.

## Delegação

- **backend:** colunas opcionais "Lucro líquido anual" e "Payout anual" na
  planilha (`annualHistory`), o modelo para download, a comparação de versões e
  a exclusão desses dados da rota pública. Relato em
  `backend-home-graficos-2026-11-10.md`.
- **interface:**
  - três cards na home, pública e logada;
  - saída do gráfico de preço;
  - proventos por ano e por tipo, com linha de payout quando há dado;
  - lucro líquido anual;
  - fundo verde-claro com o logo branco;
  - "Histórico anual" na comparação.

  Relato em `interface-home-graficos-2026-11-10.md`.
- **qa:** apto com ressalvas. Relato em `qa-home-graficos-2026-11-10.md`.

## Ajustes da coordenação

- **M1 do QA, corrigido:** no CSV legado, uma linha com mais células que o
  cabeçalho agora é recusada, com a orientação de pôr aspas. Antes, uma célula
  sem aspas, partida pelo `;`, empurrava valores para a coluna seguinte sem
  nenhum erro. Há teste novo em `tests/dividend-import.test.mjs`. Conferi que
  nenhum CSV dos testes nem o modelo tem linha mais longa que o cabeçalho.
- **B2, corrigido:** `docs/MARGEM-E-HISTORICO.md` agora diz que o gráfico de
  preço saiu da página.
- **Não corrigido:**
  - B1, código morto que continua só porque os testes o usam;
  - B3, contraste baixo entre segmentos vizinhos do gráfico. O tooltip e a
    tabela compensam.
- **Decisão:** logado, o card Aulas leva a `/app/aprender`, para o usuário não
  sair do layout da conta.

## Verificação

- `npm test`: 273/273; lint, tsc e build passam.
- O QA, num MySQL descartável:
  - integração 74/74 e `browser.mjs` 32/32;
  - suítes sem banco passando;
  - responsividade 254/254;
  - soma dos proventos de BBSE3 e TIMS3, conferida contra o snapshot: 369
    células, nenhuma divergência.
