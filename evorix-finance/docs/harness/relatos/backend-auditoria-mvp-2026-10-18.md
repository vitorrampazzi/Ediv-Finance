# Auditoria MVP — backend e qualidade

Data: 18/10/2026. Sessão backend: `01a14ae9-7754-7ca3-b7f6-8c2188479df7`.
Escopo: diagnóstico do código presente no checkout compartilhado. Não é uma
certificação de segurança nem uma inspeção da configuração efetiva de produção.

## Resumo para integração

| ID | Prioridade | Resultado |
| --- | --- | --- |
| AUD-B01 | P1 | Recusa de analytics pode ser revertida por autorização antiga quando gravação falha e leitura funciona |
| AUD-B02 | P2 | Exportação CSV legada não neutraliza fórmula textual iniciada por menos seguido de dígito |
| AUD-B03 | P2 operacional | Limpeza de sessões/tokens fica no servidor standalone e não é executada pelo handler Vercel |
| AUD-B04 | P3 / limite de escala | Atendimento limita busca/lista às 100 conversas mais recentes, sem paginação |

Não foi demonstrada leitura cruzada entre usuários ou escalada de privilégio nas
rotas de ranking, rascunhos, atendimento, conta e administração revisadas.
Isso não substitui testes HTTP/SQL em ambiente isolado. A ausência de pesquisas
reais e a retirada deliberada de Análises/catálogo **não são achados negativos**.
Termos jurídicos adiados também não foram reabertos nesta auditoria.

## AUD-B01 — P1: revogação pode restaurar uma autorização antiga

**Evidência:** `analytics-policy.mjs:105`–`:125`, `src/lib/analytics.ts:33`–`:45`
e `src/components/PrivacyConsent.tsx:28`.

`choose` mantém a escolha em memória mesmo se `setItem` falhar, mas `reconcile`
substitui essa escolha incondicionalmente pelo registro lido. O adaptador chama
reconcile ao voltar o foco para a aba. Se existe um `granted` antigo ainda válido,
`getItem` funciona e `setItem` falha (ex.: quota), o usuário pode recusar e ver
`denied/persisted:false`, mas a próxima reconciliação restaura `granted`.
O efeito de PrivacyConsent então entrega a autorização restaurada ao controlador.

**Reprodução executada, somente em memória:**

1. Criar storage fake por Map e salvar `granted` pelo store.
2. Ativar o controlador fake em `/` (primeiro page_view na fila simulada).
3. Fazer apenas `setItem` lançar erro; manter `getItem` funcional.
4. Chamar update denied e store.choose denied. Confirmado disabled=true e
   snapshot `{choice:'denied', persisted:false}`.
5. Chamar store.reconcile, como faz o handler de focus.
6. Confirmado snapshot `granted`; update em `/ranking` reativa disabled=false e
   enfileira um segundo page_view.

Nenhuma tag real foi carregada, nenhum cookie real foi lido/apagado e nenhum
evento externo foi enviado. O defeito demonstrado é a reativação do controlador;
a transmissão em navegador real não foi executada nesta auditoria.

**Impacto:** uma recusa explícita deixa de prevalecer sobre um consentimento
antigo. Há ainda o caso menos grave de storage com leitura e escrita bloqueadas:
reconcile apaga a escolha só em memória e o banner reaparece na mesma sessão.

**Critério para futura correção:** manter uma recusa local não persistida como
autoridade durante a sessão; uma leitura antiga não pode conceder novamente.
Testar falha somente de escrita, storage totalmente bloqueado, foco, eventos
de outra aba e a transição entre revogação e nova autorização explícita.
Nenhuma correção foi aplicada.

## AUD-B02 — P2: fórmula textual não neutralizada no CSV legado

**Evidência:** `server/spreadsheet.js:123`–`:136` e
`server/portfolio.js:39`, `:493`–`:521`.

O exportador neutraliza `=`, `+`, `@` e menos seguido de caractere não numérico,
mas aceita qualquer texto iniciado por menos e dígito. `assetName` é texto livre
e é incluído como `asset_name` na coluna empresa do CSV exportado.

**Reprodução executada sem arquivos:**
`csvDownload([['empresa'], ['-1+2'], ['-1.25']])` produz `"-1+2"` sem o prefixo
de neutralização, assim como preserva o número negativo legítimo `"-1.25"`.
O teste unitário existente de neutralização passa, mas não cobre essa forma.

**Impacto:** texto de nome de ativo/importação pode chegar a uma planilha como
fórmula, em vez de célula textual, quando o CSV é aberto em software que interpreta
esse marcador. Não abri Excel nem executei fórmulas; reproduzi a saída não protegida.
Trata-se de superfície legada de carteira/exportação, fora da navegação central
atual de ranking/aulas. Não é execução remota na API ou vazamento entre contas.

**Critério para futura correção:** só preservar menos inicial quando a célula
inteira for um número permitido; neutralizar expressões e campos textuais,
sem alterar negativos monetários legítimos. Cobrir `-1+2`, prefixos com espaço,
texto de empresa e negativos decimais no teste do exportador. Não corrigido.

## AUD-B03 — P2 operacional: limpeza não acompanha o entrypoint Vercel

**Evidência:** `server/index.js:29`–`:54`, `api/handler.js:1`,
`server/app.js:1`–`:18`, `vercel.json:6`–`:10` e `server/auth.js:171`, `:637`.

A limpeza periódica de sessões expiradas e tokens de confirmação está no
`setInterval` do standalone `server/index.js`. O entrypoint usado pela Vercel
importa `server/app.js` diretamente; ele não executa index.js. Não há cron de
limpeza em vercel.json. Exclusões nas rotas de auth são por usuário/token em
ações específicas; não substituem uma limpeza geral de registros expirados.

**Impacto condicionado à operação:** sem um processo externo de retenção, sessões
expiradas/abandonadas e tokens consumidos/expirados acumulam no banco hospedado.
A validação temporal continua rejeitando tokens e sessões vencidos; isto NÃO
permite usar sessão expirada. O risco é armazenamento, índices e retenção operacional.

Não consultei serviços externos, banco ou agendamentos da instalação, portanto
não afirmo que não exista alguma rotina externa já configurada.

**Verificação necessária:** identificar o responsável e a rotina efetivamente
executada em produção, incluindo tokens de recuperação, contagens e retenção;
validar limpeza limitada e observável em schema descartável. Não executei limpeza.

## AUD-B04 — P3: atendimento antigo deixa de ser descoberto pela lista

**Evidência:** `server/support.js:39`–`:44`,
`src/hooks/useSupportConversations.ts` (carregamento da lista) e
`src/components/support/ConversationInbox.tsx:214`–`:221`.

As listas de titular e equipe retornam no máximo 100 conversas ordenadas por
atualização. A busca da interface filtra somente esse conjunto; não há página
seguinte/cursor nem busca remota. A interface informa honestamente o limite de100,
portanto não é uma contagem enganosa nem perda de dados.

**Gatilho:** a equipe acumula mais de100 conversas; uma pendência sem atualização
recente fica fora do conjunto, e pesquisar seu assunto não a recupera pela inbox.
O detalhe continua acessível com ID conhecido e autorização correta.

**Classificação:** limite de escala/conveniência do suporte, não bloqueio imediato
do MVP nem exposição indevida. Se o volume esperado ultrapassar esse limite,
planejar paginação/busca no servidor mantendo os filtros de titular/equipe.

## Controles revisados e evidências positivas

- **Autenticação/senhas:** `server/password-schema.js` usa o helper único para
  cadastro/reset/troca e preserva senha legada no login/currentPassword.
  `server/auth.js` armazena Argon2id e hashes de tokens opacos; a confirmação e
  reset revalidam os tokens sob locks antes da escrita. Troca/reset encerram
  sessões; mensagens genéricas evitam divulgar cadastro pendente sem autenticação.
- **Sessões:** `server/auth.js` / `currentUser` exige sessão não expirada, limite
  absoluto, e-mail confirmado e conta não bloqueada; cookie de produção usa
  prefixo __Host, HttpOnly, Secure, SameSite Strict e path raiz. Não se inferiu
  exposição de hashes/senhas a partir das respostas públicas revisadas.
- **Permissões:** `server/permissions.js` rejeita papéis desconhecidos/bloqueados.
  `server/admin.js:18`, `:141` e sequência transacional conferem ADMIN, revalidam
  ator, impedem remoção do último administrador e revogam sessões ao mudar acesso.
- **Rascunhos:** `server/research-drafts.js:14`, `:76`, `:130`, `:187` protege
  funções de equipe, proprietário e versão; conflito retorna409, sem sobrescrever
  outra edição. A criação é limitada e serializada por lock do usuário.
- **Atendimento:** `server/support.js:25`–`:27`, `:101`–`:120`, `:150`–`:167`
  distingue namespace da equipe e titular, exige permissão, revalida mensagens
  na transação e só consulta carteira compartilhada com consentimento ativo.
- **Dados próprios:** aulas, favoritos, notificações, export de conta e carteira
  usam user_id do usuário autenticado; não aceitam user_id arbitrário como dono.
  Exclusão de conta exige senha atual e preserva a proteção do último ADMIN.
- **Ranking/importação:** leitura exige conta; escrita exige equipe e revalidação
  transacional do perfil (`server/rankings.js:308` em diante). Parser valida
  colunas/tickers duplicados, intervalos, tamanhos e quantidade de linhas;
  versões são novas publicações, preservando histórico. Planilha de planejamento
  não é convertida silenciosamente em publicação. A ausência de dados reais não
  foi considerada falha.
- **Uploads:** `server/spreadsheet.js` limita1MB, aceita CSV/XLSX e verifica
  tamanhos declarados de entradas descompactadas antes da leitura. Não houve
  ensaio de ZIP bomb/carga; não certifico resistência completa do parser binário.
- **Borda da API:** `server/security-limits.js` valida origem de escritas,
  formato/tamanho, limita rajadas/concor­rência e usa contadores persistidos.
  `server/app.js:105`–`:148` aplica controles antes de parsing/custo de senha;
  `server/password-work.js` limita Argon2 em voo. Logs de falhas não incluem
  corpo/senha/token; erros de banco não são devolvidos integralmente ao cliente.
- **Banco:** `server/database.js` habilita validação de certificado TLS,
  desabilita multipleStatements/LOCAL_FILES, limita pool/fila e usa SQL com
  parâmetros para dados. FKs nas migrações preservam relações de conta e
  isolamento por proprietário. Não inspecionei grants nem estado real do schema.
- **Ambientes:** `server/config.js` exige HTTPS/TLS em produção, fecha recursos
  de links de teste fora do loopback e exige schema QA na branch identificada
  como QA. Não verifiquei variáveis efetivamente publicadas. `deployment-policy.mjs`
  bloqueia o assistente no ambiente Production.
- **Backup:** `server/backup.js` usa snapshot consistente e AES-256-GCM, não
  exporta sessões/tokens, valida cifra antes de escrita, recusa destino com dados
  e restaura em transação mantendo FKs. Foi lido, não executado.
- **Analytics adicional:** a proteção `!sessionError` está presente em
  PrivacyConsent, evitando ativar medição com papel desconhecido após erro de
  sessão. As rotas/nomes enviados são agregados e os testes puros atuais passaram.
  O achado de revogação acima permanece separado dessas proteções.

## Banco, migração, backup e produção: verificações pendentes

1. **Backup efetivo:** `docs/BACKUP.md:33` registra que automação/monitoramento
   externo não foram ativados naquele runbook. O código não prova frequência,
   retenção, cópia externa, guarda da chave ou data do último restore. Confirmar
   evidências operacionais antes de depender da recuperação; não concluir que
   produção está sem backup apenas por esta leitura.
2. **Migrações:** `server/database.js:61`–`:95` registra nomes aplicados, mas não
   checksum nem lock global entre executores; usa DDL/sementes em autocommit.
   Alterar um SQL já aplicado não faz o runner reaplicá-lo. O processo operacional
   deve serializar execuções e usar migração nova para alterações. Não simulei
   concorrência MySQL nem classifiquei corrupção sem reprodução.
3. **Configuração real:** confirmar grants mínimos, TLS/CA, SMTP/entregabilidade,
   Turnstile se desejado, limites/alertas e separação de segredos dos Previews.
   Os valores não foram lidos e não há conclusão positiva/negativa sobre eles.
4. **Versão do checkout:** auditei somente os arquivos atuais; não usei Git,
   comparei commits ou consultei deployment. A coordenação informou retirada de
   Análises na main a87156d; mantive essa decisão fora dos achados.
5. **CI:** o workflow de qualidade lido contém gates de lint, teste, build,
   integração, navegador e backup com MySQL descartável. Não consultei status
   de execução ou proteções da branch. Configuração de gate não prova que rodou
   na revisão atualmente publicada.

## Verificações executadas e limites

Node22.23.3, sem .env e sem serviços externos:

```text
node --test tests/unit.test.mjs tests/session.test.mjs
  tests/password-policy.test.mjs tests/research-modules.test.mjs
  tests/research-module-summary.test.mjs tests/portfolio-insights.test.mjs
  tests/analytics.test.mjs
Resultado: 51 testes, 51 passaram, 0 falharam.
```

Antes da execução, inspecionei os imports/rotinas dos testes selecionados para
excluir fixtures com banco e escrita. Os casos rodados usam funções puras,
schemas ou armazenamento/filas simulados. Reproduções adicionais do CSV e da
revogação foram somente expressões Node em memória, sem salvar testes novos.

Não executados: npm test completo (inclui teste harness com escrita), build,
testes HTTP/SQL/browser/backup/produção, npm audit/consultas de rede, migrações,
inserção de usuários, envio de e-mails ou eventos GA. Não li valores de arquivos
.env, credenciais, certificados ou dumps. Não usei navegador, Git/deploy,
instalação, sessões ou subagentes. Só este relato e o quadro harness foram escritos.

Próximo passo autorizado continua sendo **consolidar o diagnóstico**, não corrigir.
Coordenação lê este arquivo; nenhuma mensagem de retorno foi enviada.

## Complemento — evidência de CI fornecida pela coordenação

Recebido em18/10/2026, após a revisão acima. A coordenação consultou o GitHub
Actions run `39167014261`, commit `a87156d`, job `117791959606`:

- lint, testes unitários e build: **success**;
- `test:integration`: **failure**;
- browser e backup: **skipped** após a falha de integração;
- deployment Vercel: **success**, como fluxo separado.

A coordenação também informou validação local79/79, lint/build aprovados e
`npm audit` completo/produção com0 avisos. Esses números são evidência informada
pela coordenação e não substituem os51 testes puros executados nesta sessão.

Portanto, o gate de integração da revisão informada **não está aprovado** e a
publicação bem-sucedida não comprova aprovação HTTP/SQL, browser ou restore.
A coordenação está identificando a causa nos logs; ela pode ser defeito funcional
ou problema do ambiente, e ainda não foi determinada neste complemento.
Não atribuir a falha a um dos achados acima sem essa correlação.

Não dupliquei a leitura dos logs, não consultei Git/deployment e não alterei código.
O item5 das verificações pendentes passa a ter essa evidência externa informada;
continua pendente confirmar a causa e a abrangência da falha antes de concluir
que a revisão está pronta para uso do MVP.
