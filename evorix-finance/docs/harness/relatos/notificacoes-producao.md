# Correção das notificações em produção — 20/10/2026

## Escopo e autorização

O usuário autorizou explicitamente corrigir nesta pasta atualizada e publicar na
main, preservando as outras sessões. A coordenação foi informada. O harness
recusa status/claim/update neste checkout porque o quadro ainda aponta para o
worktree 11a6; seu state.json e os arquivos desse worktree foram preservados.
Reserva solicitada: api/handler.js, tests/notifications.integration.mjs e este
relato. Nenhum caminho sobreposto ao trabalho atual das demais sessões.

## Evidência e mudança

- O sino da sessão existente no domínio oficial apresentou HTTP400/Cursor inválido
  mesmo na consulta inicial sem cursor, inclusive após reload.
- A validação estrita de server/notifications.js rejeita parâmetros extras.
- O teste anterior simulava metadados da Vercel apenas em req.query. A regressão
  adicional com vercelPath na URL reproduziu HTTP400 antes da correção.
- api/handler.js passa a remover __path e vercelPath da URL em ambas as formas de
  entrada (rota original e rota reescrita), antes de entregar a consulta ao Express.
  Cursores válidos e duplicados permanecem representados corretamente; cursor
  inválido/duplicado e parâmetros desconhecidos continuam rejeitados.
- Nenhuma mudança no frontend, permissões, tabelas, migrações ou credenciais.

## Verificações executadas

- Regressão antes do ajuste: falhou com 400 onde se esperava 200.
- node tests/notifications.run.mjs --integration: 16/16 após a correção,
  exclusivamente em MySQL local descartável, encerrado e removido pelo runner.
  Inclui publicação, concorrência, rollback, paginação, leituras e isolamento.
- npm test: 96/96. npm run lint e npm run build: aprovados.
- git diff --check: aprovado. Node local24.20.0; produção configurada para22.x.
- Correção publicada na main em b3842de7a6ed5b63f218c30b7377a8bc2cd01008.

## Conferência no domínio oficial

- Deploy de b3842de confirmado como success pela integração GitHub/Vercel:
  https://vercel.com/vitors-projects-7b84bd52/ediv-finance/AEiTPN1WYNExHpwi3QuTx8xk8kwA
- Em escoladodividendo.com.br/app, Chrome com a sessão existente abriu o sino
  e exibiu “Tudo em dia. Novas publicações aparecem por aqui.”, sem erro.
  Conferido em desktop e viewport393x852; viewport restaurado ao terminar.
- Console da aba nova: zero registros de erro na conferência.
- Evidência local ignorada pelo Git:
  .test-artifacts/notifications-fix/production-mobile.png.
- Não foram criados pesquisas, cursos, usuários ou notificações artificiais em
  produção. A chegada de conteúdo novo, paginação e leituras foram verificadas
  na integração descartável; produção comprovou a consulta da lista vazia.
- Quem mantiver a tela antiga com a consulta suspensa após400 precisa recarregar
  a página ou usar “Tentar novamente”. Não é necessário sair da conta.

## Limites

Não foi executada a suíte completa de outras jornadas/browser/backup nesta
correção do adaptador. O connector de logs da Vercel recusou acesso ao escopo
do projeto com403; a evidência operacional foi a resposta real no navegador.
