# Plano do Orquestrador — Etapa 1 (auditoria e medição de base)

Missão: `docs/UX-PERFORMANCE-2026-11-16.md` (leia as seções 1 e 2; os números de base
estão lá). Regras: nota "Contexto Escola" e `docs/harness/CONTEXTO.md`.

Objetivo da etapa: saber, com evidência, onde há ganho real de UX e de performance antes
de mudar qualquer código. **Nenhum executor edita código de produto nesta etapa.** Cada um
escreve apenas o próprio relato.

Regras comuns a todos os briefs:

- Português do Brasil. Relato curto: arquivos lidos, achados com `arquivo:linha`, comandos
  rodados e resultado (passou / falhou / não executado e por quê), limites e próximo passo.
- Reservar o relato antes de escrever: `node scripts/harness.mjs claim <papel> <caminho>` e
  `node scripts/harness.mjs update <papel> trabalhando "<resumo>"`; ao terminar,
  `update <papel> revisao "<resumo>"` e `release <papel>`. Papéis: `interface` (Pincel),
  `backend` (Tijolo), `qa` (Vigia). Comandos rodados na pasta `evorix-finance/`.
- Não ler o repositório inteiro: começar pelos arquivos citados aqui e seguir só o que a
  pergunta exigir.
- Proibido: banco de produção, `.env*` (nem abrir), segredos em relato, deploy, commit,
  push, instalar ou remover dependência do projeto, alterar `package.json`.
- Só o Vigia roda `npm run build` nesta etapa (o `dist/` atual foi gerado pelo Orquestrador
  a partir da árvore igual a `origin/main`). Os outros usam o `dist/` como está.
- Portas: Vigia usa `vite preview --port 4173`; Pincel, se precisar ver a rede no navegador,
  usa `--port 4174`. Sem API local: seções que dependem da API vão aparecer vazias ou com
  erro, e isso deve ser anotado, não "consertado".
- Ao terminar, avisar o Orquestrador com
  `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## 1D — Chave (fazer primeiro; os outros podem começar em paralelo)

Objetivo: criar a branch de trabalho preservando as alterações não commitadas do dono.

- `git fetch origin`; conferir se `origin/main` ainda é `5613939`. Se houver commit novo,
  **parar e relatar** sem trocar de branch.
- `git switch -c vitorrampazzi/ux-performance-2026-11-16 origin/main` na raiz Git. A árvore de
  `origin/main` é igual à da branch atual, então as alterações locais acompanham a troca.
- Conferir depois: `git status --short` deve mostrar exatamente os mesmos itens de antes
  (`evorix-finance/.gitignore`, `evorix-finance/docs/harness/state.json`, `.gitignore`,
  `.maestri/`, `docs/estrategia_escola_do_dividendo.pdf`) mais os arquivos novos da
  coordenação (`evorix-finance/docs/UX-PERFORMANCE-2026-11-16.md`,
  `evorix-finance/docs/harness/briefs/`).
- Sem commit, sem push, sem stash, sem reset. Relato curto direto na resposta (sem arquivo).

## 1A — Pincel (interface): auditoria de UX, animação e performance da interface

Páginas: home `/`, `/ranking`, `/ranking/acao/:ticker` (pública, `src/pages/PublicStock.tsx`),
página logada da empresa (`src/pages/StockResearch.tsx`, `src/components/stock-make/`),
`/aprender`, `/glossario`, `/entrar`, `/cadastro`. Componentes: botões, cards, menus,
tooltips, modais, navegação, abas (`SegmentedControl`), gráficos, formulários, feedback de
ação, carregamento, notificações.

Entregar no relato `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`:

1. Tabela de achados: `arquivo:linha` → problema observado → princípio (dos 20; os mais
   prováveis: Snappy Timing, Slow In & Slow Out, Exaggerated Feedback, Anticipation, Fitts,
   Hick, Jakob, Doherty, Postel) → mudança proposta → ganho esperado → risco → prioridade
   (P1 ganho claro, P2 bom, P3 cosmético). Princípio sem ganho real não entra.
2. Inventário de durações e easings soltos (CSS e classes Tailwind): quantos, onde. Proposta
   de tokens `--ediv-*` de duração e easing para `src/index.css`, reaproveitando
   `--ediv-ease`. Sem trocar fonte nem paleta.
3. Lacunas de `prefers-reduced-motion` (animações sem a regra).
4. Áreas de toque menores que 44×44 px em 320–390 px (ícones, menu, fechar, abas).
5. Candidatos a skeleton: onde hoje aparece `PageLoading`, spinner, espaço em branco ou salto
   de layout, com a forma e as dimensões do conteúdo final. Incluir os estados de erro e de
   dado ausente que o skeleton precisa respeitar ("não informado" / "indisponível", nunca zero).
6. Imagens: para cada `<img>` e imagem de CSS usada nas páginas acima, tamanho do arquivo,
   dimensão natural, dimensão exibida, se tem `width`/`height`, `loading` e `decoding`. Destaque
   `public/ediv-logo-clean.png` (138 kB, herói da home). Só propor conversão com ganho estimado.
7. JavaScript por página: quais chunks cada página pública baixa (pelo `dist/` e pelos imports);
   confirmar se a home baixa o chunk do framer-motion (40 kB gzip) por causa de
   `SegmentedControl` em `RankingPreview`, e se dá para trocar por CSS sem perder a animação;
   confirmar se `recharts` entra só na página da empresa e se `PublicStock` puxa
   `StockResearch` (137 kB gzip).
8. Requisições duplicadas no cliente: para cada hook ou store de dados (comece por
   `src/lib/api.ts`, `src/lib/marketData.ts`, a store testada em `tests/polled-store.test.mjs`,
   `src/context/AuthProvider.tsx`), quais endpoints chama, quais componentes usam, e se duas
   montagens ao mesmo tempo geram duas requisições iguais. Também renders desnecessários
   evidentes (efeito sem dependência correta, objeto novo a cada render passado a contexto).
9. Lista curta de 5 a 8 mudanças recomendadas para as etapas 2.1 a 2.4, cada uma com arquivos
   exatos e critério de aceite observável.

Fora do escopo: editar código; mexer em cálculo de margem, textos legais ou regras financeiras.

## 1B — Tijolo (backend): consultas, cache, APIs externas, índices, dependências

Começar por `server/app.js`, `server/database.js`, `server/rankings.js`,
`server/market/quote-service.js`, `server/market/brapi-provider.js`, `server/auth.js`,
`server/portfolio.js`, `server/notifications.js`, `server/support.js`, `server/admin.js`,
`server/learning.js`, `server/registration-challenge.js`, `server/assistant.js`,
`server/migrations/`.

Entregar no relato `docs/harness/relatos/backend-auditoria-performance-2026-11-16.md`:

1. N+1: consultas dentro de laço, `Promise.all` de uma consulta por linha, ou rota que chama
   outra camada linha a linha. `arquivo:linha`, rota afetada, quantas consultas por requisição
   hoje e quantas ficariam, correção proposta (join, `IN (...)`, batch).
2. Payload: `SELECT *` ou colunas que a interface não usa nas rotas públicas e nas mais
   chamadas; listas sem paginação ou sem limite.
3. Cache atual: o que é cacheado (memória, `provider_cache`, ranking), TTL, invalidação, e os
   cabeçalhos `Cache-Control` das APIs públicas lidas pelas páginas públicas (`crawlableApi`
   em `site-pages.mjs`). Apontar qualquer dado privado que possa ser servido por cache
   compartilhado (CDN ou memória entre usuários).
4. APIs externas (brapi, Turnstile em `registration-challenge.js`, e-mail via nodemailer,
   assistente): tabela com timeout, retry, backoff, limite de concorrência, tratamento de erro
   e se a operação é segura para repetir. O rate limit da Vercel não conta como timeout.
5. Índices: liste os índices existentes (pelas migrações) e as consultas com `WHERE`/`ORDER BY`
   em coluna sem índice, incluindo as três pendências herdadas (notificações não lidas,
   suporte por `updated_at`, lista de usuários do admin). `EXPLAIN` só se houver MySQL
   descartável em `127.0.0.1:3307`; se não houver, registrar "não executado" e o motivo.
   Nunca apontar para Aiven nem usar `.env.aiven`.
6. Redis: recomendação com evidência (o cache atual dá conta? quais dados públicos ganhariam?).
7. Dependências (`package.json`, dependencies e devDependencies): para cada uma, prova de uso
   (import, script, configuração ou dependência transitiva) ou suspeita de não uso, e as
   pesadas demais para o uso que têm. Não remover nada.
8. Lista curta de 3 a 6 correções recomendadas para a etapa 2.5, com arquivos exatos, teste
   que comprova cada uma e se exige migração.

Fora do escopo: editar código, criar migração, mudar regra de margem ou de cotação.

## 1C — Vigia (QA): métricas de base e estado inicial

Entregar no relato `docs/harness/relatos/qa-base-ux-performance-2026-11-16.md`:

1. Estado inicial: `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit`.
   Resultado de cada um (contagem de testes).
2. Ferramenta: conferir se Lighthouse está disponível sem instalar no projeto
   (`npx --no-install lighthouse --version`). Se não estiver, medir com Playwright (Chromium já
   usado pelos testes de navegador) e registrar Lighthouse como "não executado".
3. No `dist/` atual servido por `npx vite preview --port 4173`, para `/`, `/ranking`,
   `/ranking/acao/TIMS3`, `/aprender`, `/glossario`, `/entrar`, `/cadastro`, em 390 px e
   1280 px, tema claro: número de requisições, bytes de JS transferidos, LCP e CLS (via
   `PerformanceObserver`, média de 3 cargas), e se o chunk do framer-motion é baixado.
   Anotar o que ficou vazio ou com erro por falta de API.
4. Script de medição reaproveitável salvo em `tests/perf-baseline.mjs` (fora de `npm test`),
   para repetir a mesma medição depois das mudanças. Este é o único arquivo novo permitido,
   além do relato; reservar os dois.
5. **Produção:** não medir `escoladodividendo.com.br` a menos que a mensagem de despacho do
   Orquestrador diga que o dono autorizou.

Fora do escopo: corrigir qualquer falha encontrada.
