# Coordenação: cotações da brapi (05/11/2026)

O pedido do dono foi integrar cotações atualizadas ao ranking, às páginas de
empresa e aos gráficos. As decisões estão em `docs/COTACOES.md`:

- os números da pesquisa continuam os do corretor, e a cotação da brapi aparece
  à parte;
- por enquanto não há token;
- a fórmula da margem, se um dia for recalculada, é `(teto − preço) ÷ teto`.

Delegação:
- **backend:** provedor, serviço com cache, teto diário e pausa em 429, e as
  rotas. Relato em `backend-cotacoes-2026-11-05.md`.
- **interface:** linha "agora" no ranking, bloco "Cotação atual" e junção do
  gráfico. Relato em `interface-cotacoes-2026-11-05.md`.
- **qa:** revisão independente, teste de integração do contador num MySQL
  descartável, teste rápido com a brapi real e checagem do bundle. Relato em
  `qa-cotacoes-2026-11-05.md`. Veredito: apto com ressalvas.

Ajustes da coordenação:
- A rota `/api/market/quotes` aceita os tickers salvos nos favoritos com a regra
  antiga e responde os que estão fora do padrão B3 como indisponíveis, sem
  derrubar o lote.
- O teto diário padrão passou de 450 para 420, para dar folga no plano gratuito.
- O `llms.txt` agora descreve a cotação da brapi, com atraso.

Verificações: `npm test`, lint, tsc e build passam. A integração rodou num MySQL
descartável (61/61) e as suítes de navegador também (121 testes).
