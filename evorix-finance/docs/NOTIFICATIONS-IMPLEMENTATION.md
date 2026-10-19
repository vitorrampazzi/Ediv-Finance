# Entrega do sistema de notificações — 19/10/2026

Implementação funcional validada localmente. Ativação no ambiente definitivo
depende da migração e implantação pelo operador; produção não foi alterada.

## 1. Implementação

- Eventos compartilhados de pesquisa, curso e aula, com tipo, título, descrição,
  data UTC, destino interno, origem e leitura individual persistente.
- Polling de 60 segundos apenas com conta autenticada e aba visível; atualização
  ao abrir o sino e retornar à aba. Logout, troca de conta e desmontagem cancelam
  requisições. A fila serializa consultas/mutações; erros usam espera progressiva
  e respeitam `Retry-After`.
- Histórico em páginas de 20, sem limite total de 20 itens. Contador global,
  leitura por botão/link, leitura coletiva e preservação do histórico carregado.
- Pesquisa, mudanças, fingerprint e evento na mesma transação. Reenvio do mesmo
  conteúdo editorial reutiliza a publicação, sem novo aviso nem mudança de data.
- Publicação editorial explícita e versionada de cursos/aulas, sem anúncio
  automático de conteúdos antigos, startup ou simples leitura do catálogo.
- Migração aditiva, alias legado de leitura, exportação da conta e backup/restore
  compatíveis com os eventos e com snapshots antigos.

## 2. Agentes utilizados

Orquestrador, Backend Agent, Frontend Agent e QA Agent existentes, via Maestri.
Backend e frontend trabalharam em caminhos separados; QA validou a integração
após a liberação. Nenhum agente foi criado, substituído ou reiniciado.
Protocolo: [MAESTRI.md](../../docs/harness/MAESTRI.md).

## 3. Arquivos

Modificados:

- `package.json`: comandos de teste.
- `server/notifications.js`: API unificada, paginação, leituras e publicação educativa.
- `server/rankings.js`: publicação transacional e deduplicação.
- `server/learning-content.js`: identificação dos cursos e suas aulas.
- `server/auth.js`: exportação das novas leituras da própria conta.
- `server/backup.js`: novas tabelas e reconstrução após restore legado.
- `src/components/NotificationsMenu.tsx`: central unificada e estados da interface.
- `src/lib/api.ts`: leitura compatível do cabeçalho `Retry-After`.
- `tests/run-browser.mjs`: inclusão dos testes novos de interface/E2E.
- `tests/fixture.mjs`: tratamento do limite transitório de rajada no auxiliar de testes.

Criados:

- `server/migrations/008_notifications.sql`.
- `server/notification-events.js`.
- `src/hooks/useNotifications.ts`.
- `tests/notifications.integration.mjs`, `notifications.backup.mjs`,
  `notifications.e2e.mjs`, `notifications.browser.mjs`,
  `notifications.harness.html`, `notifications.harness.tsx`,
  `notifications.mysql.mjs` e `notifications.run.mjs`.
- Este relatório, [guia operacional](NOTIFICATIONS.md) e
  [relatório QA](NOTIFICATIONS-QA.md).

A alteração preexistente em `src/components/home/PublicHome.tsx` e os documentos
de harness preexistentes foram preservados.

## 4. Migração

A 008 cria `notification_events`, `notification_event_reads` e
`research_publication_keys`. Não remove publicações ou leituras antigas. O
backfill usa as datas originais e mantém `read_at`; repetição é idempotente.

Aplicada e repetida apenas em schemas temporários de uma instância MySQL local
descartável, também durante os testes de restore. Todos os schemas/datadirs de
teste foram removidos. Serviço MySQL93/3306 e schema existente `evorix_finance`
não foram migrados; nenhum banco remoto foi usado.

## 5. Funcionamento

`GET /api/notifications?cursor=...` devolve itens, `unreadCount` global e
`nextCursor`. `POST /read` aceita `notificationId`, mantendo o alias antigo
`publicationId`; `POST /read-all` inclui páginas ainda não carregadas.

Identidade vem da sessão. Lista, contagem e leituras aplicam a elegibilidade
existente desde o cadastro; todos os usuários autenticados continuam com o
acesso de leitura já existente. Publicação requer `rankings:write`, revalidada
na transação. IDs/versões são validados e valores SQL são parametrizados.

Não há cópia de evento para cada usuário nem dependência de IA, WebSocket ou
serviço adicional de entrega. A latência normal esperada é de aproximadamente
até 60 segundos em aba visível, acrescida do tempo da consulta; falhas e limites
de API podem aumentar a espera.

## 6. Testes e resultados

`npm run test:notifications` foi executado completo pelo Orquestrador e passou:

| Suíte | Verificações aprovadas, incluindo grupos |
| --- | --- |
| API e MySQL real | 15/15 |
| Backup/restore novo e legado | 3/3 |
| E2E com login, sino, aula, leitura persistida e logout reais | 1/1 |
| Interface, polling, corridas, falhas e responsividade | 17/17 |
| Total | 36/36, correspondentes a 32 cenários funcionais |

Cobertura na numeração original dos testes solicitados:

| Item | Resultado validado |
| --- | --- |
| 1 | Pesquisa publicada gera evento; prévia não gera; rollback não deixa resíduos |
| 2 | Curso publicado explicitamente gera evento versionado |
| 3 | Aula publicada explicitamente gera evento e valida associação ao curso |
| 4 | Polling de 60s sem recarregar a página, com relógio controlado |
| 5 | Pausa da consulta com aba oculta simulada |
| 6 | Retorno à aba visível atualiza imediatamente |
| 7 | Logout revoga sessão, login restaura as leituras da conta; E2E real de logout |
| 8 | Leitura individual persistente, inclusive clique durante GET em andamento |
| 9 | Leitura coletiva inclui histórico além da página carregada |
| 10 | Leituras isoladas e resposta antiga não contamina outra conta |
| 11 | Destinos de pesquisa/curso/aula; E2E renderiza a primeira aula correta |
| 12 | Duplicação impedida em reenvio e publicação concorrente |
| 13 | Paginação de mais de 20 itens e travessia de lacuna sem perder histórico |
| 14 | 429/Retry-After, 503 progressivo, POST falho e cancelamento |
| 15 | Publicações/leituras antigas e backups legados preservados |

Build completo (`tsc`, Vite e prerender), lint e `git diff --check` passaram.
`npm test` foi executado antes e depois: 31/32 em ambas as rodadas. A falha
preexistente em `tests/site.test.mjs` espera uma CSP sem o domínio Cloudflare
atualmente configurado; não foi alterada nesta demanda.

Após a correção específica de espera do auxiliar de testes, uma única instância
MySQL descartável executou sessão 6/6 PASS, notificações 15/15 PASS e API antiga
14 PASS / 2 FAIL. Os dois FAIL da última suíte representam uma assertion e seu
grupo pai: o teste final de IA esperava 400, mas recebeu 429 porque o teste
anterior deixa um bloqueio em memória no `chatLimiter`; `clearLimits` limpa
somente os registros SQL. Essa pendência de isolamento foi registrada sem
alterar os limites da aplicação, caches de produção ou assertions de quota.
Portanto, a validação geral do repositório **não está inteiramente aprovada**.

A matriz e comandos reproduzíveis estão no [relatório QA](NOTIFICATIONS-QA.md).
`EXPLAIN` real mostrou
varredura reversa da chave primária na lista e lookup `eq_ref` nas leituras; a
contagem escolheu scan na amostra pequena. Não foram feitas otimizações
especulativas além dos índices das tabelas novas.

## 7. Limitações

- Ambiente executado: Node 24.20.0, MySQL 9.3 e Chrome. O projeto declara Node
  22.x; CI com Node 22/MySQL 8.4 não foi executado nesta sessão.
- Polling, corridas e erros de rede da interface usam auth/API/visibilidade
  simuladas; o E2E separado usa aplicação, sessão, API e MySQL reais.
- Sem benchmark de carga, falha TCP real ou validação em outros navegadores.
- O launcher opcional local depende do MySQL 9.3 já instalado no Windows. CI
  chama as suítes com seu próprio MySQL descartável e credenciais de teste.
- Catálogos de cursos frontend/backend devem acompanhar futuras alterações de
  IDs, títulos e associação de aulas. Nenhum CMS ou painel novo foi criado.

## 8. Pendências para produção

Revisar a 008, manter backup recuperável, validar no runtime e MySQL do destino,
tratar as pendências de CSP e isolamento dos testes de IA e executar o CI. A migração
operacional, implantação e observação do ambiente definitivo não foram feitas.

Suspender publicações antes do backfill e mantê-las suspensas até todas as
instâncias usarem o backend novo. A versão antiga ainda grava pesquisas sem
eventos; publicar durante essa janela causaria lacuna. Manter os arquivos de
migração junto do backend para reconstrução de backups legados.

## 9. Como publicar

Pesquisa: usar a publicação de planilha existente. Prévia/rascunho não geram
aviso. Uma publicação nova salva o evento na mesma transação; repetição exata
retorna a publicação original com `reused:true`.

Curso já disponibilizado: como Analista ou Administrador, chamar
`POST /api/notifications/publish-learning` com:

```json
{"courseId":"pesquisa","version":"2026-10-v1"}
```

Para aula do mesmo curso, acrescentar `"lessonId":"risco"`. Reutilizar a versão
editorial nas tentativas repetidas; escolher outra versão apenas para outra
publicação editorial. O guia contém exemplo de `fetch` autenticado e IDs
permitidos. Conteúdo novo precisa estar disponibilizado nos catálogos antes do
anúncio. Não chamar o endpoint indiscriminadamente para todo o acervo antigo.

## 10. Ativação manual

1. Fazer/revisar backup e confirmar explicitamente o ambiente de destino.
2. Suspender publicações; aplicar a 008 pelo processo existente
   `npm run db:migrate`, com credenciais de migração do ambiente autorizado.
3. Implantar backend e frontend compatíveis e concluir a troca das instâncias;
   nenhuma variável, dependência ou serviço de notificações novo é necessário.
4. Abrir a plataforma na versão nova, conferir sino/histórico/leitura e retomar
   publicações. A partir daí o polling é automático.
5. Anunciar cursos/aulas somente quando houver a publicação editorial
   correspondente, usando o endpoint explícito e sua versão estável.

Não foram feitos commits, push, deploy, migração de produção, instalação de
dependências, alteração global do Codex ou exclusão de dados existentes.
