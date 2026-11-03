# Interface — Configurações, Perfil e ferramentas do ranking (03/11/2026)

## Arquivos
- `src/pages/Configuracoes.tsx`, `src/pages/Perfil.tsx`
- `src/pages/IncomeRanking.tsx`, `src/components/ResearchTools.tsx`, `src/pages/income-ranking.css`
- `tests/browser.mjs`, `tests/dividend.browser.mjs`

## Decisões
- Configurações: seções em duas colunas (título e descrição à esquerda, controles à direita), separadas por linhas finas, sem `Card`. Seções: Conta (leitura; não há endpoint para editar nome), Segurança, Preferências (tema com `SegmentedControl` + `useTheme`, "Rever introdução" via `requestOnboardingReplay`, "Preferências de cookies" via `openPrivacyPreferences`), Seus dados e Excluir conta.
- Botões: `.action` primário (salvar senha, baixar dados), `.action-secondary` nos demais, vermelho preenchido só em "Excluir permanentemente". Lógica, IDs, textos e confirmações da exclusão preservados. "Encerrar todas as sessões" segue sem confirmação (não havia).
- Causa da diferença de fonte entre botões: `button { font: inherit }` fora de camada em `src/index.css` anula o `text-sm`/`font-semibold` de `.action`. Corrigido localmente definindo a fonte no contêiner dos botões; a correção global (mover a regra para `@layer base`) afeta todo o site e fica para a coordenação decidir.
- Perfil: cabeçalho com avatar de iniciais (`ediv-account-avatar`), nome, e-mail, selo do perfil de acesso, status do e-mail e "Membro desde" (`createdAt`). Progresso real de `GET /api/learning` (`completed`, já usado em Aprender e Glossário), com barra e link para a próxima aula. Atalhos em linhas finas para segurança, dados e suporte.
- Ranking: removidos `VersionComparison` e o código que só ela usava; removida a linha "Origem:" abaixo da tabela (a prévia da equipe continua mostrando). Linhas da faixa de ferramentas com fundo sutil, borda, destaque accent à esquerda, rótulo em accent, indicador "Abrir/Fechar" com chevron, hover e foco visível; `details/summary` e `#publicar-pesquisa` mantidos.

## Verificações
- `npm test` 132/132, `npm run lint` e `npm run build` passaram; `node scripts/harness.mjs check` ok.
- `node tests/public-rankings.browser.mjs` e `node tests/dividend.browser.mjs` passaram.
- `tests/browser.mjs` (precisa de banco) não executado; ajustado para não usar a comparação de versões e para o selo "E-mail confirmado".
- Checagem visual no build com `/api` simulada, 1440 e 375, escuro e claro, equipe e usuário comum.

## Pendências
- Textos de ajuda em `src/lib/supportHelp.ts` ainda chamam a página de "Conta e segurança"; o título agora é "Configurações".
- O endpoint `/api/rankings/compare` continua no backend, sem uso na interface.
