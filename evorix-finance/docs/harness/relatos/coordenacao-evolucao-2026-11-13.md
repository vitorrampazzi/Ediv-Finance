# Coordenação — evolução de 13/11/2026 (relato)

Papel: `coordenacao` (Orquestrador). Branch `vitorrampazzi/evolucao-2026-11-13`.
Registro geral da missão: `docs/EVOLUCAO-2026-11-13.md`.

## Organização

- Orquestrador no Opus; `frontend`, `backend` e `qa` no Haiku (`model: haiku` em
  `../.claude/agents/`). A configuração do Codex em `../.codex/` não mudou.
- Frentes com arquivos separados e reservados no quadro: backend (testes, documentação
  e auditoria), interface/empresas (tooltips, ajuda dos indicadores, tema da página da
  empresa) e interface/conteúdo (metodologia, glossário, cursos, formulários de conta).
- O Orquestrador revisa cada diff antes de integrar.

## Feito pela coordenação

- **Tema claro como padrão.** `src/index.css` (claro na base, escuro em
  `:root[data-theme="dark"]`), `public/theme-init.js`, `src/lib/theme.ts`, `index.html`.
- **Fundo verde no mobile.** Causa: padrão escuro para todo visitante e herói claro
  desenhado como camada translúcida sobre a foto escura (pré-carregada). Correção: herói
  claro com superfície opaca própria; foto só no escuro, sem pré-carregamento.
  Conferido em Chromium e WebKit (iPhone 13), 360 a 1440 px.
- **Home e banner logado.** Subtítulo alinhado à proposta, botões com tokens, prévia do
  ranking em superfícies por empresa, reserva de altura medida (sem salto de layout),
  banner da área logada com a mesma superfície do herói.
- **Analytics.** Lista fechada ampliada (`analytics-policy.mjs`), navegação, cards da
  home, links de conteúdo, perguntas frequentes e troca de tema ligados; `/entrar` e
  `/cadastro` medidos por caminho fixo; aviso de cookies fora desses formulários.
  Documentado em `docs/ANALYTICS-E-PRIVACIDADE.md`.
- **SEO.** Título próprio por página pública (marca primeiro), `WebPage` e
  `DefinedTermSet` no JSON-LD, descrições e `llms.txt` atualizados. Documentado em
  `docs/seo/`.

## Revisão das entregas

- Backend: aceito. Limitadores por conta chaveados por `req.authenticatedUser.id`,
  que só existe depois da autenticação; respostas da equipe não contam; testes
  `tests/backend-evolucao.test.mjs` (8/8). Achados da auditoria sem correção crítica
  pendente; os que exigem índice ou decisão de produto ficaram para o dono.
- Explicações dos indicadores (`src/lib/indicatorDefinitions.ts`): fórmulas e
  exemplos conferidos com `safety-margin.mjs` e `dividend-analysis.mjs`.

- QA independente (Haiku): 90 cargas públicas (9 páginas × 5 larguras × 2 temas) sem
  rolagem horizontal, com um h1, tema claro na primeira visita e sem erros de console;
  dicas da empresa 56/56. Veredito inicial NÃO APTO só pelos títulos de `/entrar` e
  `/cadastro` iguais ao da home. Corrigido: páginas de conta com "Escola do Dividendo |
  Entrar" etc. (WCAG 2.4.2). Também corrigido: no cadastro, o erro da regra de senha
  marcava o e-mail como inválido. Ficou como baixo: em 390 px o aviso de cookies cobre
  parte do botão do herói até ser respondido (não esconde o foco por inteiro).

## Decisão a comunicar ao dono

- Os títulos de aba por página revertem a decisão de 02/11/2026 (PR #34, aba só com
  a marca). A marca continua primeiro em toda aba.

## Verificações

Ver a tabela "Testes executados" em `docs/EVOLUCAO-2026-11-13.md`.
