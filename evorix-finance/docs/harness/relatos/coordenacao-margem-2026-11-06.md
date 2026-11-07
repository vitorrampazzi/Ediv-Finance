# Coordenação: margem dinâmica e histórico de preços (06/11/2026)

O dono pediu, com base nos áudios do corretor de 05/11, cinco mudanças:
- margem de segurança que acompanha a cotação;
- preço-teto fixo até uma nova análise;
- gráfico diário e mensal;
- histórico ajustado por proventos;
- publicação em produção, usando os agentes de backend, frontend e QA.

## Decisões

- **Fórmula:** `(teto − cotação) ÷ teto`, em `safety-margin.mjs`, escrita pela
  coordenação como contrato compartilhado. A conta é exata e os cinco exemplos
  do corretor passam.
- **Fonte do preço:** a cotação canônica é a lista geral da brapi, a mesma em
  todas as telas. A v2 só traz os dados do pregão.
- **DY e P/L:** continuam os da pesquisa, porque o corretor só aprovou a
  margem dinâmica.
- **Histórico da AGF:** a base não é uniforme. O trecho antigo é parcialmente
  ajustado por um método não documentado e saiu do gráfico. O trecho final, com
  até 2 casas decimais, é nominal: foi conferido contra o `rawClose` da brapi
  em PETR4, VALE3 e ITUB4, com zero divergências.
- **`close` da brapi:** é ajustado só por eventos de ações, então nunca é usado
  como preço nominal.
- **Fechamentos da Escola:** a partir de agora, o fechamento de cada pregão é
  gravado a partir da lista geral, na tabela da migração 009.
- **Calendário:** os feriados da B3 de 2024 a 2026 foram conferidos na fonte
  oficial. 2027 ainda não foi publicado pela B3.

## Delegação

- **backend:**
  - rotas `/api/rankings/market`, `/api/rankings/price-series` e o bloco
    `market` de `/api/rankings/public`;
  - cotação canônica;
  - calendário da B3;
  - séries;
  - consolidação dentro da requisição, com limite de 2,5 s.

  Relato em `backend-margem-2026-11-06.md`.
- **interface:**
  - loja compartilhada de dados de mercado;
  - ranking, página da empresa, gráficos e páginas públicas.

  Relato em `interface-margem-2026-11-06.md`.
- **qa:**
  - testes financeiros A a F;
  - conferência com a brapi real;
  - integração e navegador num MySQL descartável;
  - funcionamento sem a migração 009.

  Relato em `qa-margem-2026-11-06.md`.

## Ajustes da coordenação

- Os testes novos entraram nos scripts `test` e `test:integration`.
- A comparação de empresas (`ResearchTools.tsx`) passou a chamar de "Preço da
  pesquisa" e "Margem da pesquisa" os campos da planilha.
- `docs/COTACOES.md` foi alinhado à cotação canônica e ao calendário.

## Pendências do dono

- Aplicar a migração 009 em produção (`npm run db:migrate:aiven`). Sem ela, o
  site funciona, mas não grava os fechamentos diários.
- Token da brapi: sem ele, o histórico ajustado completo existe só para PETR4,
  VALE3 e ITUB4. A lacuna de 24/10 a 05/11 nas outras empresas também só se
  preenche com o token.
- Calendário da B3 de 2027, quando for publicado.

## Verificação final (07/11/2026)

- **QA:** apto com ressalvas. Os testes financeiros A a F passaram. Foram 11
  mutações, e todas foram detectadas. Na brapi real, o trecho nominal da AGF
  bateu com o `rawClose` em 520/520, 533/533 e 562/562 pontos, e os
  fechamentos mensais bateram com o último pregão.
- **M1, corrigido:** o fechamento do dia só é gravado com uma lista consultada
  a partir das 19:00. A lista é renovada a cada 15 min até as 19:40.
- **Gates locais:**
  - `npm test` 257/257; lint, tsc e build passam; `dist/` sem token;
  - integração num MySQL descartável: 67/67, incluindo o funcionamento sem a
    migração 009 (antes do M1; a CI roda a integração de novo no 8.4);
  - suítes de navegador: 123.
- **Ressalvas que ficaram para o dono:**
  - M2: o teto das 3 empresas públicas pode ser deduzido da margem e da
    cotação;
  - B1: à noite, a nota da base ajustada diz que a cotação não está na mesma
    base, porque a barra do dia ainda não tem `rawClose`;
  - B2: no fim de semana, o marcador fica num dia sem pregão;
  - B3: `/api/market/history` não é mais usada pela interface;
  - B6: a loja de dados descarta a chave mais antiga depois de 24.
