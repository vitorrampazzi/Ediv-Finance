# Notificações

## Ativação

A migração aditiva `server/migrations/008_notifications.sql` deve ser revisada e
aplicada pelo operador autorizado antes de ativar este backend. Usar o processo
existente `npm run db:migrate` no ambiente explicitamente autorizado, com backup
prévio. Suspender publicações antes de iniciar o backfill e mantê-las suspensas
até concluir a troca de todas as instâncias para a versão nova. A versão antiga
grava pesquisas sem evento/chave: publicar entre backfill e troca de versão
criaria uma lacuna. Só retomar publicações com a versão nova ativa. A migração
foi exercitada apenas em bancos descartáveis locais; nenhum banco existente,
remoto ou de produção foi migrado nesta entrega.

A migração pode ser repetida após interrupção: cria tabelas com `IF NOT EXISTS` e
faz preenchimentos com chaves únicas e atualização sem efeito. Não remove nem
reescreve `ranking_publications`, `ranking_changes` ou `notification_reads`.
Pesquisas antigas ganham eventos com a data original; leituras antigas são
copiadas sem mudar `read_at`. Duplicatas históricas continuam no histórico.
Nenhum curso/aula é anunciado por migração, inicialização ou leitura do catálogo.

Novas tabelas:

- `notification_events`: um evento compartilhado, sem fan-out por usuário.
- `notification_event_reads`: leitura individual, chave `(user_id,notification_id)`.
- `research_publication_keys`: fingerprint SHA-256 único para reprocessamentos.

Não iniciar a versão nova antes da migração. Não há fallback silencioso para
schema incompleto. A migração não possui downgrade destrutivo.

## Contrato de consumo

Todas as rotas exigem autenticação; o acesso continua disponível a todos os
usuários autenticados, seguindo a política existente. Nenhum filtro por plano,
favorito, matrícula ou nova permissão de leitura foi introduzido.

`GET /api/notifications?cursor=<cursor>` retorna:

```json
{
  "notifications": [{
    "id": "42",
    "type": "research",
    "title": "Pesquisa atualizada",
    "description": "Uma publicação de pesquisa está disponível.",
    "createdAt": "2026-10-19T12:00:00.000Z",
    "read": false,
    "favoriteTickers": ["ABCD3"],
    "href": "/app/ranking?publication=15",
    "sourceId": "15"
  }],
  "unreadCount": 3,
  "nextCursor": null
}
```

`type` é `research`, `course` ou `lesson`. `sourceId` identifica a publicação,
curso ou aula, respectivamente. `id` identifica o evento e **não** deve ser
interpretado como ID da pesquisa. IDs e cursor são strings decimais positivas
de até 20 dígitos, limitadas a BIGINT UNSIGNED. O cliente deve devolver
`nextCursor` sem transformá-lo em Number. Cursor inválido retorna 400.

Cada página contém até 20 eventos, por ID de evento decrescente. A página seguinte
usa IDs menores que o cursor; inserções posteriores não deslocam páginas já
percorridas. `nextCursor` é null quando não há outra página. `unreadCount` cobre
todos os eventos elegíveis, independentemente da página. Lista, favoritos e
contagem são lidos no mesmo snapshot REPEATABLE READ.

Lista, contagem, leitura individual e leitura total aplicam a mesma condição:
`notification_events.created_at >= authenticatedUser.createdAt`. Leituras
antigas e novas de pesquisa contam como lidas. Favoritos só destacam tickers
alterados, sem filtrar elegibilidade. `createdAt` é ISO 8601 UTC.

`POST /api/notifications/read` aceita **um** dos formatos:

```json
{"notificationId":"42"}
```

```json
{"publicationId":"15"}
```

O segundo é o alias legado e resolve o ID da pesquisa, não o ID do evento.
Campos extras, ambos os identificadores juntos ou IDs inválidos retornam 400.
IDs inexistentes ou anteriores ao cadastro não alteram dados; repetições são
seguras. `POST /api/notifications/read-all` marca todos os eventos elegíveis.
Ambas as rotas retornam `{ "message": "..." }` e espelham as leituras de
pesquisa em `notification_reads`, na mesma transação, preservando compatibilidade.

## Publicação de pesquisa

A rota existente `POST /api/rankings` continua recebendo planilha e metadados.
Validação e permissão `rankings:write` existentes são preservadas, com
revalidação transacional. Publicação, mudanças, chave de deduplicação e evento
são gravados na **mesma conexão e transação**; falha em qualquer etapa reverte
tudo. Não há envio assíncrono nem anúncio em startup.

O fingerprint é calculado no MySQL sobre JSON de título, autor, categoria,
registro profissional e entradas completas, incluindo ordem/rank. Nome do
arquivo e identidade do importador não participam: reenviar a mesma pesquisa
com outro arquivo/conta não cria nova publicação. A migração registra também
fingerprints das pesquisas legadas, apontando duplicatas exatas para o menor ID.
A expressão JSON no helper e no preenchimento legado deve continuar idêntica.

Repetir conteúdo editorial já registrado retorna 200 com
`{publicationId,message,reused:true}`, reutiliza o evento sem mudar data/leitura
e não altera a pesquisa mais recente nem `ranking_changes`. Conteúdo editorial
diferente retorna 201, `reused:false`, e cria nova publicação/evento. Não se deve
usar reenvio de conteúdo antigo como mecanismo para recolocá-lo no topo.

O bloqueio existente de `admin_control` serializa publicações e mudanças de
permissão antes da consulta do fingerprint. A chave primária do fingerprint e
as chaves únicas dos eventos garantem deduplicação no banco. A chave de evento
é `(type,source_id,editorial_version)`, além de `publication_id` único para
pesquisa. Repetições não atualizam o evento. Escritores futuros precisam seguir
a mesma transação/bloqueio, não inserir publicações diretamente.

## Publicação editorial de cursos/aulas

Menor mecanismo explícito: `POST /api/notifications/publish-learning`.
Exige a permissão **existente** `rankings:write` (ANALYST e ADMIN atuais),
revalidada sob os mesmos bloqueios de acesso dentro da transação. USER recebe
403; conta bloqueada/não autenticada segue as recusas existentes. Não se cria
uma permissão ou política nova. A chamada anuncia conteúdo que já foi revisado
e disponibilizado; não edita o catálogo nem publica arquivos/vídeos.

```json
{"courseId":"pesquisa","version":"2026-10-v1"}
```

```json
{"courseId":"dividendos","lessonId":"carteira","version":"2026-10-v2"}
```

Resposta 200: `{ "notificationId": "42" }`, inclusive nas repetições.

Para anunciar um curso já disponível, entre como Analista ou Administrador e
execute no console do navegador da própria plataforma (ou use um cliente HTTP
com a sessão autenticada):

```js
const response = await fetch("/api/notifications/publish-learning", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ courseId: "pesquisa", version: "2026-10-v1" }),
});
console.log(response.status, await response.json());
```

Para uma aula, acrescente `lessonId`, por exemplo `"risco"` no curso
`"pesquisa"`. Escolha a versão editorial antes da chamada e reutilize o mesmo
valor ao tentar novamente. Para conteúdo novo, disponibilize primeiro os
arquivos e atualize os catálogos backend/frontend; só então faça o anúncio.

`version` é obrigatório: 1–80 caracteres ASCII, primeiro alfanumérico e os
demais alfanuméricos, ponto, hífen ou sublinhado. A versão distingue maiúsculas
e minúsculas. Repetir tipo, fonte e versão devolve o mesmo evento; nova versão
cria outro. Os índices únicos e o bloqueio transacional protegem também chamadas
concorrentes. Não usar timestamp aleatório por tentativa: repetir a versão
editorial original nos retries.

| Curso | Aulas válidas | Aula de abertura do curso |
| --- | --- | --- |
| `pesquisa` | `ranking`, `risco` | `ranking` |
| `dividendos` | `dividendos`, `carteira` | `dividendos` |

IDs inexistentes, aula de outro curso, versão inválida e campos extras retornam
400. Sem `lessonId`, cria evento `course`; com ele, `lesson`. Títulos vêm do
catálogo. Destino: `/app/aprender?aula=<id>#sala-de-aula`, reutilizando o fluxo
existente. Não são usados parâmetros `course`/`lesson`. O catálogo backend em
`learning-content.js` espelha o catálogo estático do frontend; mudanças futuras
de IDs/associações devem atualizar ambos de forma coordenada.

## Backup, restauração e exportação

`server/backup.js` inclui as três tabelas novas, mantendo as tabelas antigas e
a ordem de restauração de dependências: usuários/publicações antes de eventos,
eventos antes de leituras e fingerprints depois de publicações. O formato de
backup criptografado continua `ediv-backup-v1`. Restauração continua exigindo
destino vazio e aborta/rollback se houver dados ou tabelas necessárias ausentes.

Backups antigos, sem as tabelas novas, continuam aceitos. Depois de inserir seus
registros, a restauração reaplica somente os três INSERTs idempotentes de
preenchimento da migração 008, dentro da transação existente; reconstrói eventos
de pesquisa, fingerprints e leituras antigas sem criar anúncios educativos.
Manter o arquivo da migração junto do backend para este caminho de restauração.

`GET /api/auth/export` mantém `notificationReads` e adiciona
`notificationEventReads`, incluindo identificação, leitura e contexto do evento
lido pelo próprio usuário. Eventos são compartilhados e não contêm destinatário;
a exclusão da conta remove suas leituras por FK, preservando o histórico comum.

## Verificação desta entrega

O QA executou 32 cenários funcionais: API/MySQL real, concorrência, rollback,
backfill legado repetido, paginação, leituras, backup/restore novo e antigo,
polling/falhas/corridas no componente e um E2E com login, sino, aula e logout.
O relatório [NOTIFICATIONS-QA.md](NOTIFICATIONS-QA.md) distingue testes reais de
auth/API/visibilidade simuladas e documenta os planos EXPLAIN e seus limites.

`npm run test:notifications` executa API, backup/restore, E2E e os dois grupos de
interface. Sem um MySQL descartável já configurado via `TARGET_MYSQL_*` e
`EDIV_TEST_MYSQL_DISPOSABLE=true`, o launcher local usa o MySQL 9.3 instalado no
Windows em uma instância separada, sem alterar o serviço ou schema existentes.
CI usa seu próprio MySQL descartável; testes novos também integram
`test:integration` e `test:browser`. Nenhuma dependência foi instalada.

Build completo e lint passaram. `npm test` permaneceu em 31/32: o teste de CSP
em `site.test.mjs` já falhava antes da implementação por não aceitar o domínio
Cloudflare configurado. Não foi alterado por ser externo a esta demanda.
Na regressão final, sessão passou 6/6 e notificações 15/15. A suíte antiga de API
ficou em 14 PASS / 2 FAIL (uma assertion e seu grupo pai): o teste de IA recebe
429 de um cache de limite deixado pelo cenário anterior, que a limpeza SQL do
teste não remove. A pendência de isolamento está documentada pelo QA; os
limites da aplicação e as assertions de quota não foram alterados.
O ambiente executado foi Node 24.20.0, MySQL 9.3 e Chrome; CI com Node 22/MySQL
8.4, produção, outros navegadores e carga representativa ainda não foram
validados. Implantação e migração do ambiente definitivo ficam com o operador.
