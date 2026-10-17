# Contexto compartilhado

Atualizado em 17/10/2026. Este documento registra fatos conferidos no repositório;
revalide comportamento no código antes de mudar contratos.

## Objetivo atual

Organizar três sessões colaborativas da Escola do Dividendo com engenharia de
harness: contexto persistente, escopo reservado, verificações executáveis,
evidência das entregas e recuperação após interrupções.
Configuração inicial concluída. Rodada atual autorizada em 17/10/2026:
implementar os cards Trello de alternância claro/escuro e logos reais das empresas
em todas as áreas de ações (home, ranking, pesquisa, mercado e outras superfícies
relevantes), validar e publicar na main. O usuário autorizou main diretamente;
QA será usada quando o site for lançado aos usuários.

Cards lidos: https://trello.com/c/qdn5nYW9 (darkmode) e
https://trello.com/c/hzIa42yb (logos ranking). O quadro também possui o card
https://trello.com/c/9XwWNghO (logos home), coberto pelo escopo amplo de logos
solicitado nesta conversa. Não há descrição extra nos dois primeiros cards.

Aceitação: alternância acessível e persistente, aparência legível nos dois temas,
preferência do sistema quando não há escolha explícita; logos reais com fallback
honesto em falha/empresa fictícia, sem distorção, duplicação de anúncio ou salto
de layout; nenhuma alteração de permissões/preços/publicação de pesquisas.

Divisão: interface implementa tema e estilos existentes; backend implementa
componente/dados de logos e integra superfícies de empresas, podendo editar TSX
nessa tarefa. Coordenação prepara ambiente, integra, valida e publica. Usar
reservas; não editar os arquivos da outra sessão sem combinar. Somente a
coordenação faz Git remoto/deploy/instalação de dependências.

## Produto e arquitetura

- Nome público: Ediv Finance / Escola do Dividendo. A pasta legada é evorix-finance.
- Educação sobre ações e dividendos. Jornada principal: ranking → pesquisa → aprendizado.
- React/TypeScript/Vite no `src/`; Express em `server/`; MySQL; entrada Vercel em `api/handler.js`.
- A pasta Node está dentro da raiz Git. O guia está em `docs/GUIA-DESENVOLVEDOR.md`.
- Rotas públicas também envolvem `src/entry-server.tsx`, `site-pages.mjs` e `vercel.json`.
- Permissões são conferidas na API. Perfis: Usuário, Analista e Administrador.
- Publicação de pesquisa: editar/importar → prévia → conferir → publicar, com histórico.
- Sem execução de ordens. Não inventar resultados financeiros, pesquisas, autoria ou registros profissionais.
- O guia de 09/10 registra demo fictícia, cobrança ausente e IA experimental; conferir configuração/código antes de afirmar situação de produção.
- Credenciais, tokens, dados pessoais e conteúdo de `.env` não entram em relatos.

## Ambiente desta rodada

- A sessão original `Melhore o front-end com foco no uso` está em OUTRO checkout;
  não participa automaticamente deste grupo. Seu histórico contém também demandas alheias ao projeto.
- `git status` falhou neste worktree ao tentar resolver a pasta pai. Não reparar
  metadados Git, copiar alterações para outro checkout ou publicar sem diagnóstico.
- As duas novas sessões devem usar fork no mesmo diretório desta coordenação.
- Código compartilhado em disco não implica histórico de chat compartilhado.
  Atualização ocorre na leitura do quadro/relatos e em mensagens explícitas.
- O script usa apenas Node e não precisa de dependências do aplicativo.

## Critérios de aceitação desta configuração

1. Três chats identificados, no mesmo diretório, com papéis e contexto enviados.
2. Quadro legível por comando, atualizações serializadas e reservas que recusem sobreposição.
3. Testes de reserva, persistência e bloqueio concorrente passando.
4. Relatos iniciais das sessões com evidências e próximos passos.
5. Limitações reais de Git, dependências e sincronização registradas.

## Decisões

- D001: três chats persistentes, contando a coordenação; não três agentes temporários.
- D002: mesmo diretório e reservas explícitas para esta rodada. Worktrees isolados
  só depois de resolver o Git e combinar como compartilhar o quadro.
- D003: frontend e backend começam com auditorias delimitadas; a coordenação
  prioriza correções depois de ler as duas, sem mudanças de produto implícitas.

## Diagnóstico consolidado e fila proposta

Relatos iniciais recebidos e lidos pela coordenação em 17/10/2026.
As tarefas abaixo são propostas; ainda não estão em execução.

1. Preparar ambiente compatível com Node 22 e dependências para validação completa.
   Diagnosticar o vínculo Git do worktree antes de commits ou integração entre checkouts.
2. I01/P2: distinguir conclusão em memória de progresso salvo quando localStorage
   falha (`Aprender.tsx`, `LearningQuiz.tsx`). Interface conduz; backend revisa se
   houver alteração no contrato de progresso autenticado.
3. B01: atualizar teste de CSP para verificar allowlist de scripts com Turnstile
   sem afrouxar a política. Backend conduz; interface preserva fluxo de cadastro.
4. I02/P3: preservar hash no retorno de autenticação para a pesquisa.
   Interface conduz; backend revisa validação de destino permitido.
5. Validar autorização por perfis, isolamento de rascunhos e conflito de versão em QA.

Evidências e critérios detalhados: `relatos/interface.md` e `relatos/backend.md`.
A revisão inicial é estática, sem aprovação de segurança completa ou reprodução em browser.
O harness passou em 4/4 testes; as duas sessões confirmaram leitura e gravação
do mesmo quadro e liberaram suas reservas após os diagnósticos.
