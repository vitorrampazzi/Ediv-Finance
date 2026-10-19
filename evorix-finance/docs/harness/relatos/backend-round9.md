# Rodada9 — correções de backend antes do lançamento

Data do usuário: 18/10/2026. Sessão backend `01a14ae9-7754-7ca3-b7f6-8c2188479df7`.
Escopo autorizado: A02 isolamento de testes, A06 CSV e solução pequena para A07.
Datasets reais de ranking/cursos, interface, analytics e publicação ficam fora
desta entrega. Nenhuma credencial foi lida/exibida e nenhum banco foi acessado.

## A02 — isolamento sem desligar rate limit

O `fixture.clearLimits()` anterior apagava apenas `request_limits` no SQL.
O contador local de rajadas de60/10s e os caches de bloqueios dos stores
permaneciam ativos entre casos. Além disso, grandes grupos de testes compartilhavam
o limite de40 escritas/minuto. Isso contaminava testes funcionais com429.

Mudanças:

- Extraído guard idêntico para `server/request-admission.js`, com factory pura
  e relógio injetável. Mantidos60/10s,32 requests ativas,5000 chaves e respostas.
  `reset()` recusa chamadas enquanto houver requests em voo.
- `server/security-limits.js` reexporta a instância usada de fato pela API.
- `MysqlLimitStore.clearLocalCaches()` limpa mapas de bloqueio das instâncias;
  só a fixture chama esse método, sem rota HTTP nem flag de bypass de produção.
- `tests/fixture.mjs` confere o nome `ediv_test_<hex>` e o resultado real de
  `SELECT DATABASE()` antes de limpar SQL e ambos os estados em memória.
- `t.beforeEach` isola cada cenário de integração/sessão. Limpezas internas que
  já separavam etapas continuam funcionando, inclusive limites de IA/conta/projeto.
- Nova regressão HTTP prova que40 escritas passam, a41ª retorna429, reset permite
  a próxima;60 GETs passam,61º retorna429, reset permite a próxima.
- Testes puros verificam60/61, janela10s, concorrência32, limite5000 chaves,
  limpeza de chaves vencidas e recusa de reset com trabalho em voo.

Não aumentei limites nem acrescentei condição especial que libere requests em
produção. A API não expõe mecanismo de reset. Validação SQL/HTTP está pendente
do CI descartável; não foi marcada como aprovada só a partir dos testes puros.

## A06 — neutralização de fórmulas CSV

`server/spreadsheet.js` agora só preserva um menos inicial se a célula INTEIRA
for número negativo inteiro/decimal suportado. Expressões como `-1+2`, ` -1+2`
e `-1.5+2` recebem prefixo textual; `-12.5`, `-1,25` e `-0` permanecem intactos.
A regressão em `tests/unit.test.mjs` cobre esses casos e as proteções anteriores
para `=`, `+`, `@` e texto iniciado por menos. Não alterou nomes/valores no banco.

## A07 — limpeza oportunista, aguardada e limitada

Novos `server/auth-cleanup-policy.js` e `server/auth-cleanup.js`; middleware
inserido depois dos limites gerais da API em `server/app.js`. Assim roda também
no handler Vercel que importa app.js, sem depender do timer de index.js ou de
trabalho em background depois que a resposta foi encerrada.

- No máximo uma tentativa por hora **por instância**, acionada por tráfego da API.
- Singleflight: requests concorrentes compartilham o mesmo trabalho.
- Cada tentativa executa dois deletes de até100 linhas, usando expiração SQL e
  ORDER BY expires_at: sessões e confirmações de e-mail.
- Esses dois campos já têm índices nas migrações existentes. Não remove registros
  válidos, não faz DDL, não cria endpoint público nem usa segredo/cron externo.
- O lote é aguardado antes de seguir. Requests seguintes só consultam o relógio;
  não há varredura SQL em toda requisição.
- Falha não derruba a API e só registra código de erro, sem mensagem SQL/dados.
  Uma falha não provoca repetição em cada request.

**Limites:** não substitui um serviço de retenção monitorado: sem tráfego não roda;
o cooldown não é global entre Functions, e um backlog grande avança em lotes.
`password_reset_tokens` não foi incluída porque não possui índice de expiração
nas migrações atuais. Fazer varredura dessa tabela sem índice exigiria revisão
própria/migração; a exclusão por usuário nas rotas de senha permanece como antes.
O timer standalone existente foi preservado. Não houve limpeza em banco real.

Regressões: testes puros cobrem cooldown/lotes/singleflight/falha. Novo caso em
`tests/session.integration.mjs` semeia somente no schema descartável sessões e
tokens expirados/válidos, executa o helper e verifica que apenas os expirados somem.

## Validação local e gates completos

- Node22.23.3: **33/33 testes focados passaram**:
  `tests/request-admission.test.mjs`, `tests/auth-cleanup.test.mjs`,
  `tests/unit.test.mjs`, `tests/password-policy.test.mjs`, `tests/session.test.mjs`.
- `node --check` passou em fixture, integração, sessão, app e security-limits.
  Os módulos novos também foram importados/executados pelos testes puros.
- Sonda TCP somente no loopback3306 retornou indisponível; não há executável
  MySQL/Docker nem configuração TARGET_MYSQL_* utilizável encontrada nesta sessão.
  A sonda não autenticou nem conectou em banco de produção.
- Não executei testes SQL/HTTP/browser/backup sem ambiente descartável configurado.
  Não instalei dependências ou banco. Não houve Git, branch, PR ou deploy por backend.

Para gates completos, usar o workflow já existente com Node22 e serviço MySQL8.4
descartável no loopback, `EDIV_TEST_MYSQL_DISPOSABLE=true` e TARGET_MYSQL_* do
serviço de teste, sem credenciais de produção. Executar na ordem:

```text
npm run lint
npm test
npm run build
npm run test:integration
npm run test:browser
npm run test:backup
```

O workflow já provisiona Playwright para os gates de browser. A coordenação vai
usar branch/PR para executar CI antes de avançar main. Não confundir os33 testes
locais aprovados com aprovação de SQL/browser/restore ainda pendentes.

## Arquivos

Novos: `server/request-admission.js`, `server/auth-cleanup-policy.js`,
`server/auth-cleanup.js`, `tests/request-admission.test.mjs`,
`tests/auth-cleanup.test.mjs` e este relato.

Alterados: `server/security-limits.js`, `server/limit-store.js`, `server/app.js`,
`server/spreadsheet.js`, `tests/fixture.mjs`, `tests/integration.test.mjs`,
`tests/session.integration.mjs` e `tests/unit.test.mjs`.

Coordenação recebeu nomes dos novos testes para npm test/manifesto de publicação.
Entrega em revisão, reservas liberadas; aguardar resultado dos gates integrados.

### Revisão final dos cenários

- Os três runners browser agora chamam `fixture.clearLimits()` antes de cada
  caso. A matriz de páginas/resoluções também isola cada largura; os contadores
  de navegações anteriores não contaminam o cenário seguinte.
- A regressão de40 escritas faz login explícito e exige200, usando a senha
  alterada pela jornada anterior; limpa o contador após esse login antes de
  exigir40 respostas204 e a41ª429. Não depende de cookie presumidamente válido.
- Syntax check Node22 passou nos quatro arquivos de teste alterados; harness
  check passou. Browser/SQL seguem pendentes na CI, sem MySQL local.
- O reset continua recusando solicitações ativas; não foi criado bypass,
  aumento de limite nem reset acessível por HTTP.
- Complemento solicitado pela coordenação: quatro seletores de progressbar em
  `tests/browser.mjs` usam agora o nome exato `Progresso dos exercícios`, conferido
  em `src/pages/Aprender.tsx`. Continuam verificando valor0 após login e valor1
  após exercício, recarga e outra sessão. A barra de LearningJourney tem outro
  nome acessível e não é o alvo destes cenários. Syntax Node22 e harness passaram;
  execução real dos cenários aguarda CI MySQL descartável.

### Revisão estática adicional dos seletores

- Divergência confirmada: `tests/browser.mjs:589` espera o título antigo
  `Sua escola de ações e dividendos`; `/app` usa MemberHome e o h1 atual de
  AccountHomeContent é `Sua mesa de pesquisa.`. O mesmo nome antigo está em
  `tests/session.browser.mjs:52` e `:141`. Coordenação informada dos três usos;
  nenhum teste editado nesta revisão solicitada como leitura.
- Conferidos os nomes dos fluxos conta/recuperação/configurações, pesquisa,
  exercícios, suporte, editor e administração contra os componentes atuais.
  Não confirmada outra divergência de seletor nesses trechos. O passo numerado
  `2. Cenário` continua existindo no editor; não deve ser retirado por suposição.
- Revisão estática não equivale à execução browser; gates continuam na CI.
- Após autorização explícita da coordenação, os três seletores acima foram
  corrigidos para `getByRole("heading", { name: "Sua mesa de pesquisa.",
  exact: true })`, preservando as assertivas de visibilidade. Syntax Node22
  dos dois runners e harness check passaram. Produto não alterado.
- Após falha reproduzida na CI, login pendente passou a esperar a mensagem real
  `Confirme seu e-mail antes de entrar`, em vez de `/confirmad/i`. O cenário
  aguarda o POST login e exige401 com `EMAIL_NOT_VERIFIED`, além de preservar
  a assertiva de URL em `/entrar`. Conferidos os demais textos de confirmação,
  reset, erro de senha atual, status de publicação/comparação e resposta local
  contra UI/API; não confirmada outra divergência textual. LoginJourney usa
  destino explícito `/app/aprender` sem sinal de tour; ausência de tratamento
  do tour nesse helper não é um bloqueio comprovado. Syntax Node22, ESLint
  do runner e harness check passaram; suíte browser completa depende da CI.
