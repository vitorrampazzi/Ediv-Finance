# Auditoria backend — refinamento de ranking e homes — 31/10/2026

## Escopo e resultado

Auditoria read-only do clone real `C:/Users/vitor/Evorix-finance`, HEAD `1bcf958`. Nenhuma alteração em API, servidor, banco, ambiente ou dependências. O pedido de interface não exige mudança de contrato nem schema no backend; basta ajustar as apresentações existentes e preservar os campos estruturados já usados para versões e períodos.

## Achados

- A home autenticada é `HomeContent` em `src/components/home/AccountHomeContent.tsx`: rende `RankingPreview`, `RankingHighlights` e `GettingStarted`. A marca visual reutilizável está em `src/components/home/PublicHeroBrand.tsx`; hoje `PublicHome.tsx` a importa. Reutilizar esse componente autenticado é uma mudança de UI. Seu CSS e controle de movimento já são próprios do componente.
- `RankingHighlights.tsx` busca `GET /api/rankings` e apresenta `publication.title` e `updatedAt` na mesma linha. A data é apenas um rótulo de recência da home; ela pode deixar de ser renderizada sem remover `updatedAt` da API ou da publicação. A ação leva ao ranking completo.
- A home pública (`ResearchSample.tsx`) usa `GET /api/rankings/public`. `server/rankings.js` seleciona a publicação mais recente e somente `id,title,created_at,entries_json`; `server/public-ranking.js` limita aos três primeiros itens e a três métricas. O preview mostra `publication.title` sem filtro, portanto um título editorial que contenha uma data pode reproduzir a aparência que o usuário quer remover. A tela já descreve os valores como estimativas da pesquisa publicada e diz explicitamente que não são cotação ao vivo.
- Títulos são metadados editoriais fornecidos na publicação via `X-Publication-Meta` e persistidos como `ranking_publications.title`; o endpoint público apenas os repassa. Não sugiro sanitizar datas no servidor nem alterar o valor armazenado: isso pode destruir identificador/nome legítimo de uma edição. Se necessário, a UI pode usar um rótulo genérico no card de home, preservando o título e a data na seleção/registro de versões.
- Datas com função de versão permanecem em `IncomeRanking.tsx`: `ranking.updatedAt` como publicação selecionada e `history.createdAt` junto ao título de cada versão. Em `StockResearch.tsx`, `updatedAt` e `referencePeriod` compõem o contexto da fonte e da versão. Removê-las reduziria rastreabilidade. Não confundir com a data decorativa da home.
- `RankingPreview.tsx` não lê ou exibe datas; apresenta etapas Empresa/Pesquisa/Dividendos com links contextuais. A alteração de título da navegação do ranking não altera endpoint, rotas, filtros ou conteúdo do ranking.
- As fontes Instrument Sans já estão no bundle local (`public/fonts/instrument-sans-normal-400.woff2` e `stock-make.css` contém os `@font-face`), mas o uso atual é escopado a `.figma-stock`. `src/index.css` ainda define a pilha do sistema em `body`. Tornar Instrument Sans global é alteração CSS/tipográfica da coordenação, sem API ou dependência nova.

## Recomendação mínima ao backend/coordenação

Nenhuma edição de `server/`, `api/`, migrations ou tabelas. Remover somente a data apresentada por `RankingHighlights`; no preview público, evitar usar o título editorial bruto se a data embutida for um problema visual, sem transformar esse título em dado normalizado no servidor. Manter IDs, timestamps de publicação/histórico, período de referência, valores de métricas e aviso de ausência de cotação ao vivo. Não adicionar nem atualizar cotações.

## Verificações

- `node scripts/harness.mjs status`: quadro v2 no clone real, sem claims preexistentes; reserva exclusiva do relato registrada.
- Leitura de `server/rankings.js`, `server/public-ranking.js`, páginas/componentes e buscas de consumidores/campos relacionados.
- Não rodei testes ou lint: o escopo foi somente auditoria read-only, sem código de produto alterado.

## Próximo passo

Coordenação integra as observações ao escopo visual; QA pode confirmar que nenhuma data de versão/período foi removida e que os previews continuam deixando claro que cotações não são ao vivo.
