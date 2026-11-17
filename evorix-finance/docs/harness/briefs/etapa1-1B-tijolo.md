# Brief 1B — Tijolo: auditoria de consultas, cache, APIs externas, índices e dependências

Para: Tijolo (backend). Etapa 1, só leitura de código. Pode começar em paralelo com 1D.

## Objetivo

Entregar um relato com evidência de onde o backend perde performance ou segurança de cache, sem editar nenhum código.

## Contexto mínimo

- Missão: `docs/UX-PERFORMANCE-2026-11-16.md` (seções 1 e 2). Plano: `docs/harness/briefs/00-plano-etapa1.md`, seção 1B.
- Nota "Contexto Escola": seção 4 (arquitetura, migrações 001 a 009, `crawlableApi` em `site-pages.mjs`, Aiven, brapi) e seção 10 (segurança).
- Já existe e não se refaz: cache de cotações (`provider_cache` + memória, deduplicação e teto diário em `server/market/quote-service.js`), limites em `/api/market` (PR #50), cache do ranking público, limitador geral, `AbortSignal.timeout` por tipo de chamada em `brapi-provider.js`. Audite, não reimplemente.
- Decisões já tomadas pelo Orquestrador: Redis só com evidência de carga que o cache atual não sustente (a medição de 04/11, 200 pessoas simultâneas, p95 174 ms, não justifica); índice novo só com consulta real e plano em MySQL descartável; migração nova é numerada 010+, não altera dado e não vai a produção sem autorização do dono.
- Pendências de índice herdadas: notificações não lidas, suporte por `updated_at`, lista de usuários do admin.

## Pode ler primeiro / pode escrever

- Ler primeiro: `server/app.js`, `server/database.js`, `server/rankings.js`, `server/market/quote-service.js`, `server/market/brapi-provider.js`, `server/auth.js`, `server/portfolio.js`, `server/notifications.js`, `server/support.js`, `server/admin.js`, `server/learning.js`, `server/registration-challenge.js`, `server/assistant.js`, `server/migrations/`, `site-pages.mjs` (só `crawlableApi`), `package.json`. Depois siga só o que a pergunta exigir.
- **Único arquivo que pode escrever:** `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md`.

## Fora do escopo

- Editar qualquer arquivo em `server/`, `src/`, `tests/`, `package.json`, `package-lock.json`.
- Criar migração. Mudar regra de margem ou de cotação.
- Remover, instalar ou atualizar dependência.
- Conectar em produção ou Aiven. Usar `.env.aiven` ou qualquer `.env*`.

## Passos

1. Reserve: `node scripts/harness.mjs claim backend docs/harness/relatos/backend-auditoria-performance-2026-11-16.md` e `node scripts/harness.mjs update backend trabalhando "auditoria de performance do backend"`.
2. Escreva o relato com **exatamente** estes títulos de seção, em português:
   - `## 1. N+1`: consultas dentro de laço, `Promise.all` de uma consulta por linha, ou rota que chama outra camada linha a linha. Para cada uma: `arquivo:linha`, rota afetada, quantas consultas por requisição hoje e quantas ficariam, correção proposta (join, `IN (...)`, batch).
   - `## 2. Payload`: `SELECT *` ou colunas que a interface não usa nas rotas públicas e nas mais chamadas; listas sem paginação ou sem limite.
   - `## 3. Cache`: o que é cacheado (memória, `provider_cache`, ranking), TTL, invalidação, e os cabeçalhos `Cache-Control` das APIs públicas lidas pelas páginas públicas (`crawlableApi` em `site-pages.mjs`). Aponte qualquer dado privado que possa ser servido por cache compartilhado (CDN ou memória entre usuários).
   - `## 4. APIs externas`: tabela para brapi, Turnstile (`registration-challenge.js`), e-mail (nodemailer) e assistente, com: timeout, retry, backoff, limite de concorrência, tratamento de erro, e se a operação é segura para repetir. O rate limit da Vercel não conta como timeout.
   - `## 5. Índices`: índices existentes (pelas migrações) e consultas com `WHERE`/`ORDER BY` em coluna sem índice, incluindo as três pendências herdadas. Rode `EXPLAIN` só se já houver um MySQL descartável escutando em `127.0.0.1:3307`, usando as credenciais de teste que os testes de integração ou `../.github/workflows/quality.yml` definem para o banco descartável (nunca `.env*`). Não suba contêiner nem servidor de banco nesta etapa. Se não houver, escreva "não executado" e o motivo, e registre se o Docker está disponível (`docker --version`) para o Orquestrador decidir depois. Nunca aponte para Aiven.
   - `## 6. Redis`: recomendação com evidência (o cache atual dá conta? quais dados públicos ganhariam?).
   - `## 7. Dependências`: para cada item de `dependencies` e `devDependencies` em `package.json`, prova de uso (import, script, configuração ou dependência transitiva) ou suspeita de não uso, e as pesadas demais para o uso que têm. Não remova nada.
   - `## 8. Recomendações`: de 3 a 6 correções para a etapa 2.5, cada uma com arquivos exatos, o teste que comprova e se exige migração.
3. Ao terminar: `node scripts/harness.mjs update backend revisao "relato da auditoria de backend pronto"` e `node scripts/harness.mjs release backend`.

## Critérios de aceite (observáveis)

- [ ] O arquivo `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md` existe e tem as 8 seções numeradas.
- [ ] Cada achado das seções 1 a 5 tem `arquivo:linha` que existe (confira por amostragem: abra 3 linhas citadas e confirme).
- [ ] A tabela da seção 4 tem uma linha para cada uma das 4 integrações, com as 5 colunas preenchidas ou "não há" explícito.
- [ ] Cada dependência de `package.json` aparece na seção 7 com "usada" (com prova) ou "suspeita" (com motivo).
- [ ] A seção 8 tem de 3 a 6 itens e cada um diz se exige migração.
- [ ] Nenhum arquivo de código mudou: o `git status` abaixo não lista nada em `server/`, `src/`, `tests/`, `package.json`.

## Comandos de validação (em `evorix-finance/`)

```
grep -cE "^## [1-8]\." docs/harness/relatos/backend-auditoria-performance-2026-11-16.md
git status --short -- server src tests package.json package-lock.json
node scripts/harness.mjs check
```

Esperado: `8`; nenhuma linha, exceto `?? tests/perf-baseline.mjs` (arquivo do Vigia, criado em paralelo); `check` sem erro.

## Formato do relato

Em português, curto. O relato é o arquivo acima. Na resposta ao Orquestrador (até 15 linhas): arquivos lidos, os 3 achados de maior impacto com `arquivo:linha`, comandos rodados e resultado (passou, falhou ou não executado e por quê), limites, próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em relato. Não abra `.env*`.
- Testes e `EXPLAIN` nunca usam o banco de produção nem a produção como alvo.
- Não faça commit, push nem deploy. Não rode migração.
- Não adicione linha de autoria de IA.
