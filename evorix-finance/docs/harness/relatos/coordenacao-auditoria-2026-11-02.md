# Auditoria geral e melhorias — 02/11/2026

## Pedido e equipe

Auditoria completa do site em produção e do código, correções priorizadas e
publicação autorizada após os gates (PR, quality, dependency-security, preview).
Base: main 02e3322. Agentes frontend, backend e QA com escopos separados
(definições em `.claude/agents/`, espelhando `.codex/agents/`). Coordenação
ficou com docs, `vercel.json`, `package.json`, integração e publicação.

## Baseline (antes das mudanças, Node 24 local)

- `npm ci`: ok. Produção sem vulnerabilidades; 12 moderadas só em ferramentas de
  desenvolvimento (eslint/minimatch), corrigíveis apenas com atualização que quebra.
- `npm test` 128/128, `npm run lint` ok, `npm run build` ok (prerender de 8 rotas).

## Produção

- Home `/` e `/entrar`: tela inteira "Não foi possível verificar sua sessão agora".
- `/ranking`, `/aprender`, `/glossario`: blocos de erro "O serviço está ocupado";
  glossário mostrava erro e "Carregando glossário…" ao mesmo tempo.
- `/metodologia` e `/suporte`: normais (conteúdo estático).
- `/api/health`, `/api/auth/me`, `/api/rankings/public`: 503 em ~10 ms.
- Deploy de produção = commit 02e3322 (READY); não é deploy quebrado.
- QA (preview) responde 500 com `ENOTFOUND` no log: o host MySQL não resolve.
  Em produção a causa ficava oculta porque o limitador (MySQL) falha primeiro e o
  handler devolvia "ocupado" sem registrar a causa.
- Painel do Aiven não foi aberto (acesso do navegador negado); religar o serviço
  é ação do usuário. Nenhuma credencial, variável ou configuração foi alterada.
- `/login` respondia 404 (rota real: `/entrar`).
- Cabeçalhos estáticos: HSTS presente (Vercel), CSP e demais conforme `vercel.json`.

## Decisões e entregas

- Backend (relato `backend-auditoria-2026-11-02.md`): itens A–G.
- Interface (relato `interface-auditoria-2026-11-02.md`): itens 1–4, 6–9, 11–14, 16–18.
- Coordenação: GUIA-DESENVOLVEDOR sem a afirmação de ranking de demonstração;
  redirecionamento `/login` → `/entrar`; `tests/api-resilience.test.mjs` no `npm test`.
- Fora desta rodada: framer-motion no bundle inicial, GuidedTour sem saída em
  fechamento forçado, landmarks da área logada, pré-carga do lazy sobre o HTML
  pré-renderizado, enumeração por tempo de resposta, `/api/market` público,
  SQL fixo por requisição, nome no e-mail, índice da inbox (exige migração),
  `verificationLimiter` compartilhado e atualizações de dependências de dev.

## Validação e publicação

Ver relato `qa-auditoria-2026-11-02.md` e a seção de publicação abaixo.
