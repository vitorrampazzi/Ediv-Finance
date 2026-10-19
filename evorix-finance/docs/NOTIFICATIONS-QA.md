# Notificações — resultado QA

Validação local de 19/10/2026 após liberação. Follow-up: notificações e sessão aprovadas; regressão antiga de IA com uma assertion pendente, detalhada ao final. **Nenhum bug de produto confirmado nos cenários executados.** QA não alterou src/**, server/** ou docs/NOTIFICATIONS.md.

## Resultados reais

| Suíte | Resultado | Ambiente |
| --- | --- | --- |
| notifications.integration.mjs | 14 cenários + grupo: 15/15 PASS | API real e MySQL descartável |
| notifications.browser.mjs, grupo principal | 10 cenários + grupo: 11/11 PASS | Componente real; auth/API/visibilidade simuladas |
| Mesmo arquivo, grupo UI adicional | 5 cenários + grupo: 6/6 PASS, executados separadamente | CSS real, 360/1366 px, Chrome |
| notifications.backup.mjs | 2 cenários + grupo: 3/3 PASS | Backup/restore reais, snapshots novo e antigo |
| notifications.e2e.mjs | 1/1 PASS | Aplicação completa, login/API e MySQL reais |

Total: 32 cenários substantivos; 36 nós PASS incluindo grupos do node:test. Não somar execuções intermediárias repetidas. Sintaxe dos seis scripts MJS verificada. Harness exporta o componente, corrigindo o erro react-refresh informado pelo Orquestrador.

## Cobertura dos 15 grupos recebidos

Agrupamento QA do resumo recebido; a numeração literal da lista original não foi fornecida. Legado é cobertura transversal adicional.

| Item | Critério | Evidência executada |
| --- | --- | --- |
| 1 | Pesquisa | POST real 201; GET com research, descrição, sourceId, UTC, não lida e href da publicação |
| 2 | Curso | ANALYST/ADMIN publicam course; nova versão gera novo evento; leitura do catálogo não anuncia conteúdo |
| 3 | Aula | carteira/dividendos gera lesson; aula de outro curso, versão inválida, campos extras e IDs inválidos retornam 400 |
| 4 | Polling/hidden | Nenhuma consulta antes de 60s; consulta no prazo; pausa durante 120s hidden simulados |
| 5 | Retorno | visibilitychange para visible atualiza imediatamente |
| 6 | Menu/acessibilidade | Abrir atualiza; Escape fecha e devolve foco; 360/1366 px sem overflow horizontal, botões com pelo menos 44px; screenshots revisados |
| 7 | Logout/desmontagem | Logout real revoga cookie; endpoint 401; desmontagem aborta GET e não reinicia polling durante 180s simulados |
| 8 | Contas | Troca limpa dados; resposta antiga em voo, liberada após conta B, não contamina a lista |
| 9 | Read individual | notificationId correto; idempotência/persistência; clique durante GET aguarda fila e envia POST após a resposta |
| 10 | Read-all | Persiste inclusive além da página carregada e zera contador; conta B permanece não lida |
| 11 | Isolamento/cadastro | Contas independentes; visitante 401; USER não publica (403); eventos anteriores ao cadastro não aparecem, não contam e não são marcáveis |
| 12 | Destinos | Pesquisa aponta publication; aula carteira abre /app/aprender?aula=carteira#sala-de-aula; curso abre ranking. E2E valida a primeira aula real e leitura persistida |
| 13 | Dedup/atomicidade | Quatro pesquisas concorrentes: uma 201, três 200/reused e um ID; quatro cursos concorrentes retornam mesmo ID. Reenvio por outro arquivo/conta preserva data/leitura. Preview/inválido não gravam. Falha SQL real no evento reverte publicação, mudanças e fingerprint |
| 14 | Paginação | 45 eventos educativos novos; páginas de 20, fim null, sem saltos/duplicatas, contador global e cursor inválido 400. UI preserva 40 antigos quando recebe mais de 20 novos e atravessa lacuna com overlap, chegando a 70 únicos |
| 15 | Falhas/retry | GET 429/503 preserva dados; retry não burla Retry-After de 60s; 503 repetido respeita 5/10/20s. POST/read falho mantém não lida até sucesso. Burst 429 real também respeitado antes do retry |

## Legado e backup

- Inseridas publicação e leitura legadas sem evento. Reaplicação da 008 cria evento/fingerprint, preserva data e read_at; segunda aplicação não duplica. Reenvio histórico retorna 200/reused e ID original. Alias publicationId continua aceito.
- Backfill exercitado reaplicando SQL completo da 008 em schema já migrado, com registros legados ainda não materializados. Não representa atualização operacional de cluster/produção.
- Backup novo restaura pesquisa, curso, leituras e fingerprints. Snapshot antigo derivado de backup real: remover as três tabelas novas do conteúdo descriptografado e criptografar novamente com AES-GCM. Restore reconstrói pesquisa/leitura/chave e não inventa anúncio educativo.
- Datas comparadas às respectivas fontes. Escritas de leitura nova/legada podem diferir por milissegundos; cada fonte é preservada. Chave errada e destino preenchido foram recusados. Sessões não restauradas.
- Todos os schemas de origem/destino ediv_test_<12 hex> removidos no cleanup.

## EXPLAIN real, sem otimização especulativa

Consultas copiadas do handler, com parâmetros da fixture e dados multipágina. São estimativas do otimizador, não benchmark:

| Consulta/tabela | Acesso | Índice | Observação |
| --- | --- | --- | --- |
| Lista/eventos | index | PRIMARY | 21 linhas; Using where; Backward index scan |
| Lista/leituras nova e legada | eq_ref | PRIMARY | 1 linha por lookup; Using index |
| Count/eventos | ALL | nenhum escolhido | 51 linhas estimadas; Using where |
| Count/leituras nova e legada | eq_ref | PRIMARY | 1 linha; Using where; Not exists; Using index |

notification_created aparece como índice possível. Count escolheu scan na amostra pequena em que quase todos os eventos são elegíveis. Sem mudança de índices; medir volume representativo antes de concluir desempenho em escala.

## Infraestrutura e comandos

Executar na app C:/Users/vitor/Evorix-finance/evorix-finance.

- .env local autenticou sem schema e SELECT 1 passou, mas **não tem CREATE DATABASE em ediv_test_***. Primeira fixture falhou com ER_DBACCESS_DENIED_ERROR antes de migrar. Não ampliar privilégios da aplicação.
- notifications.run.mjs --integration usa notifications.mysql.mjs quando não há ambiente disposable configurado. Instância independente do MySQL 9.3 instalado, porta 13317, bind loopback, --no-defaults, datadir exclusivo, credenciais aleatórias em memória e usuário limitado a ediv_test_%. Serviço MySQL93/3306 e schema evorix_finance intocados.
- Porta ocupada faz falhar sem encerrar serviço existente. Logs por execução em .test-artifacts/notifications-mysql/<aleatório>; só o próprio datadir, validado como descendente dessa pasta, é removido.
- Rollback final usa CHECK temporário na tabela da fixture, evitando privilégio SUPER exigido por triggers com binlog.
- Launcher opcional local depende de C:/Program Files/MySQL/MySQL Server 9.3/bin/mysqld.exe. Sem instalação. CI chama suítes diretamente com EDIV_TEST_MYSQL_DISPOSABLE=true e TARGET_MYSQL_HOST loopback, PORT/USER/PASSWORD do banco descartável, com permissão de criar/remover seus schemas.
- Browser tenta Chromium padrão de CI e depois Chrome local. Sem gate EDIV_NOTIFICATIONS_READY ou estado de Orquestrador.

```powershell
npm run test:notifications
node tests/notifications.run.mjs --integration
node tests/notifications.run.mjs --browser
node tests/notifications.run.mjs --backup
node tests/notifications.run.mjs --e2e
node tests/notifications.mysql.mjs tests/notifications.e2e.mjs
node tests/notifications.mysql.mjs tests/notifications.backup.mjs tests/notifications.e2e.mjs
node --test --test-name-pattern 'UI adicional' tests/notifications.browser.mjs
```

test:integration e tests/run-browser.mjs foram integrados pelo Orquestrador. QA não os alterou. O comando test:notifications compõe API + backup + E2E + browser. O Orquestrador executou o wrapper completo após integrar --e2e: 36 PASS, zero failures; QA não o repetiu neste follow-up. Comandos das suítes gerais ficam sob responsabilidade da coordenação.

## Evidências, limites e parecer

- .test-artifacts/notifications/: harness-360.png, harness-1366.png, e2e.png, explain.json e backups criptografados em subpastas aleatórias. Evidências/DB/logs fora de tests; screenshots mobile/desktop inspecionados visualmente.
- UI de polling, corrida, falhas, layout e acessibilidade simula auth/API e visibilidade. Não comprova segundo plano real do sistema, rede real sob falha ou sessão real nesses casos. E2E separado cobre login, sino, leitura persistida, destino e logout reais de um curso.
- Node 24.20.0 executado versus engines 22.x; MySQL 9.3 local; Chrome. CI, Aiven, produção, outros browsers/motores e falha TCP real não exercitados. Sem benchmark de carga.
- Build/lint/npm test gerais ficaram com o Orquestrador. Baseline por ele informado: 31/32, falha preexistente CSP Cloudflare em site.test; não atribuída a notificações.
- Sem P0/P1/P2 de produto confirmado. Falhas intermediárias corrigidas na reserva QA: CREATE local indisponível, privilégio de trigger, burst 429, sincronização do harness e expectativa de timestamps de fontes diferentes.
- Escrita apenas tests/notifications*, tests/fixture.mjs (reserva exclusiva adicional para a regressão), este relatório e artefatos ignorados. Sem dependências, commits, deploy, merge, alteração src/server ou acesso remoto. Históricos preservados.

Cobertura funcional local aprovada nos cenários acima. Implantação/migração operacional, CI e avaliação em escala não estão aprovados por esta execução.

## Follow-up de regressão — helper compartilhado

Reserva exclusiva adicional recebida: tests/fixture.mjs. Alterados somente esse helper, remoção do wrapper redundante em notifications.integration.mjs e este relatório. Nenhuma alteração em src/server, proteções, package.json ou run-browser.mjs; nenhuma flag nova.

request agora faz no máximo três tentativas (duas repetições), somente para HTTP 429 cujo body.code é RATE_LIMITED. Aguarda Retry-After inteiro em segundos mais 100ms de margem; header ausente/inválido ou fora do limite seguro do timer mantém a resposta original. Outros 429, inclusive quotas IA sem esse code, retornam diretamente para as assertions existentes. Cookies, raw/body, headers, Origin, leitura do corpo e erros de transporte foram preservados. Removido o retry genérico de notificações que repetia qualquer 429.

O Orquestrador informou execução completa de npm run test:notifications após anexar --e2e: API15 + backup3 + E2E1 + UI17 = 36 PASS, zero failure. QA não repetiu browser/build/lint/fullwrapper neste follow-up.

Primeira regressão após o ajuste: integration antiga avançou para 14 PASS / 2 FAIL (incluindo grupo pai). Uma única assertion falhou: tests/integration.test.mjs:833, esperado 400 no histórico inválido de IA, recebido 429. O grupo pai contabiliza o segundo FAIL. O burst de 60/10s passou a ser aguardado e não derrubou os outros cenários. O caso anterior de IA com quotas429 foi aprovado.

Diagnóstico por leitura: o cenário anterior excede deliberadamente o chatLimiter de oito chamadas/15min; MysqlLimitStore.blocked preserva esse bloqueio em memória. fixture.clearLimits apaga apenas request_limits no MySQL, sem limpar aquele cache. O próximo cenário encontra chatLimiter antes da validação do corpo. Assim, a assertion final de IA continua bloqueada por isolamento incompleto entre cenários; não ampliar o retry para mascarar esse 429. Não alterei clearLimits, limiter ou assertions além do escopo solicitado. Pendência P2 de infraestrutura de testes: definir reset completo do limiter entre cenários ou isolar os cenários de IA em outro processo/fixture; requer decisão da coordenação.

A primeira execução parou antes de session porque o launcher falha rápido. Session e notifications foram então executadas juntas em outra instância descartável: 6/6 e 15/15 PASS, respectivamente. Para cumprir também a validação das três suítes numa só instância sem interromper as duas aprovadas, a execução final usa a suíte antiga por último:

```powershell
node tests/notifications.mysql.mjs tests/session.integration.mjs tests/notifications.integration.mjs tests/integration.test.mjs
```

Resultado final do comando acima, mesma instância MySQL descartável em 13317, três schemas exclusivos e cleanup concluído:

| Suíte | PASS | FAIL |
| --- | --- | --- |
| session.integration.mjs | 6 | 0 |
| notifications.integration.mjs | 15 | 0 |
| integration.test.mjs | 14 | 2 (uma assertion de IA + grupo pai) |

Total node:test: 35 PASS / 2 FAIL. Exit code final 1; regressão geral NÃO aprovada. A falha em integration.test.mjs:833 foi reproduzida nas duas execuções. Sessão/notificações e o retry restrito de admissão passaram. Alterar produção ou repetir quotas IA automaticamente não seria correção adequada desse isolamento de testes. Browser, backup/E2E, build, lint, npm test e fullwrapper não repetidos neste follow-up. Sintaxe de fixture e diff --check passaram.

Decisão final do Orquestrador: não expandir para reset de caches de IA, não alterar server nem assertions antigas. Manter 429 de quota observável e classificar a falha como pendência de isolamento da suíte antiga, separada de notificações. Rodada encerrada; sem novos testes ou retries após essa decisão. Validação geral permanece com essa pendência e CSP preexistente, sem alegar tudo verde.
