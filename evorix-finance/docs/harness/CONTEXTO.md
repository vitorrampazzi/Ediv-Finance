# Contexto compartilhado

Atualizado em 18/10/2026. Este documento registra fatos conferidos no repositório;
revalide comportamento no código antes de mudar contratos.

## Objetivo atual

### Rodada9 — correções para lançamento (18/10/2026)

Usuário autorizou reparar os erros mais críticos encontrados na auditoria e
excluiu como bloqueadores a ausência de dados reais do ranking e do conteúdo
dos cursos, que ainda receberá do corretor. Preservar sinalização de demonstração.
Não ampliar o MVP nem criar conteúdo financeiro fictício apresentado como real.

Aceitação: revogação do Analytics não reverte com falha de escrita/foco; testes
de integração isolam seus contadores sem reduzir limites de produção; CSV
neutraliza expressões com sinal negativo; ajuda abre a conta correta; progresso
visitante informa quando só existe na sessão; hover legível e retorno da pesquisa
preserva seção. Limpeza de autenticação expirada deve funcionar também na Vercel,
com lotes pequenos, intervalo e falha isolada. Testar unit/lint/build e gates SQL,
browser e restore em MySQL descartável da CI antes de integrar na main autorizada.

Divisão: coordenação consentimento/integração/validação/publicação; interface
links/progresso/hover/hash; backend isolamento de limites/CSV/limpeza. Mesmas três
sessões, sem novos agentes. Parte jurídica segue adiada por decisão anterior;
não inventar responsável/contato ou afirmar adequação integral à LGPD. Diferenciar
correção técnica de comprovação externa de entrega SMTP, backup e operação.

Usuário também pediu Ponytail e anthropics/skills, confirmando os links oficiais.
Instalação local autorizada; ferramentas não são dependências do site. Conferir
compatibilidade, versões e arquivos; skills novas só disponíveis no próximo turno.

### Rodada7 — MVP ranking e educação (18/10/2026)

Usuário retirou a área geral de Análises/catálogo de ações do site inteiro.
Preservar ranking, pesquisa de empresa do ranking, aulas, conta, suporte,
administração e demais funções existentes. Remover menus, atalhos, destaques
de cotações na home pública/logada, ajuda, pré-carregamento e indexação do catálogo.
Endereços antigos redirecionam ao ranking; destino de autenticação/tour também.
Tour passa a5 etapas, migrando registros antigos sem reabrir guias concluídos.
Sem consultas de catálogo no MVP, nem mudanças de banco/migração. Infraestrutura
de mercado de funções legadas do backend preservada. Coordenação implementa
e valida com testes, SSR e Chrome local isolado; publicação main autorizada.


### Rodada6 — marca Escola do Dividendo (17/10/2026)

Usuário pediu substituir nomes públicos Ediv Finance por Escola do Dividendo.
Aceitação: cabeçalho, navegação, ajuda, telas de conta, e-mails e metadados
consistentes; sem duplicar marca no e-mail; leitura desktop/mobile320px.
Identificadores técnicos, nomes de arquivos/repositório e chaves persistidas
continuam compatíveis. Coordenação implementa/valida/publica na main.
Rodada5 publicada em43b9a75bb5928e3b3678d7955b4fd8683aa88b53; Vercel success
confirmado. Analytics configurado, sem eventos artificiais nem testes no banco.


### Rodada5 — senhas, login e Google Analytics (17/10/2026)

Usuário pediu senha mínima8 com maiúscula/número/especial, espaçamento entre
recuperação de senha e reenviar confirmação, termos/LGPD e Analytics do zero.
Depois pediu para DEIXAR A PARTE JURÍDICA PARA DEPOIS por não ter controlador/
CNPJ/contato definidos. Não criar termos, checkbox contratual ou migração nesta
rodada. A página de transparência existente só recebe explicação factual da
integração de estatísticas/cookies; isso não constitui certificação LGPD.

Aceitação senha: helper único frontend/API,8..128, pelo menos1 maiúscula,
1 dígito e1 especial (pontuação/símbolo, espaços não contam), sem exigir minúscula;
cadastro/reset/troca validam senha nova, login/senha atual legada preservados.
Login: ações separadas com44px e gap, mobile320px e desktop, ambos temas.

Analytics: usuário autorizou abrir painel Chrome, informou equipe1..10,
concluiu pessoalmente criação/aceite de termos Google e autorizou DESATIVAR
métrica otimizada em favor da medição controlada pelo site. Propriedade
Escola do Dividendo — Site, Brasil/São Paulo,BRL, setor Empregos e educação;
compartilhamentos opcionais desmarcados. Objetivos tráfego+engajamento/retenção.
Fluxo Web para escoladodividendo.com.br criado; ID e restante via navegador.

Aceitação técnica: GA4 só após permissão explícita, recusar equivalente e sem
bloquear conta, opção reabrir/revogar em todos layouts, escolha versionada6meses,
memória+aviso em storage bloqueado. Nunca enviar nome/email/senha/conta, buscas,
query/hash/tokens ou conteúdo de conversas. Rotas permitidas+nomes estáticos,
empresa agregada, auth/perfil/config/suporte/admin fora. Sem Google Signals,
Ads,User-ID ou dados fornecidos pelo usuário; métrica otimizada OFF na propriedade.
Somente domínio oficial; localhost/previews/QA/staff não enviam. SPA pageviews
manuais com send_page_view:false e dedupe por rota; revogação desabilita tag antes
de atualizar consentimento e limpa cookiesGA acessíveis, sem apagar dados remotos.

Divisão: interface authTSX/spacing, backend política/schemas/testes de senha,
coordenação consentimento/analytics/CSP/transparência/docs/integração/browser/main.
Sem banco/migração/testes de cadastro em produção. Publicar main continua autorizado.

### Rodada4 — introdução guiada e valores de exemplo (17/10/2026)

Usuário pediu tour após cadastro com modais obrigatórios, cada etapa apontando
para uma área do menu/página, e informações fictícias nas seis colunas do ranking
para visualizar o resultado. Esta autorização substitui a decisão anterior de
mostrar somente disponibilidade; vale exclusivamente para a demonstração, sem
alterar pesquisas reais ou apresentar métricas inventadas como dados de mercado.

Card lido: https://trello.com/c/KiC5f6YA/11 — introdução na home logada e escolha
inicial de aparência; sem descrição adicional. Cadastro exige confirmação de
e-mail e login; preservar esse contrato e iniciar tour no primeiro acesso verificado.

Aceitação: seis etapas (aparência, início, ranking, análises, aprender, conta com
suporte), avanço/volta explícitos, Escape/fundo não dispensam, foco no modal e alvo
destacado visível ou fallback central; navegação replace, retorno ao destino
original incluindo query/hash, retomada do passo após reload, opção Rever introdução.
Usuário reforçou que LOGIN NORMAL NÃO INICIA tour. Somente next gerado na jornada
de cadastro leva sinal de introdução ao primeiro login após confirmação. Não usar
createdAt/idade da conta como gatilho; conta nova em login comum também não inicia.
Etapa interrompida pode ser retomada; concluída só reabre por replay voluntário.
Estado por user.id/version no navegador,
sem prometer sincronização cross-device; storage bloqueado usa memória e avisa.
Auditoria confirmou ausência de campo adequado no banco; nenhuma migração.

Tabela: valores fictícios coerentes com o detalhe de DEMO1..6 em cada coluna,
texto de demonstração explícito, links granulares/empresa preservados; conteúdo
real deriva apenas de texto publicado e campos ausentes continuam honestos.
Verificar desktop/320px, teclado e ambos temas sem rolagem da página.

Divisão: interface GuidedTour/steps/CSS/targets/Layout; backend tabela/resumos
e testes; coordenação gatilho/store/AccountOnboarding/RegisterPage, contexto,
ambiente local isolado, validação final e main conforme autorização vigente.
Todos reservam arquivos/relatos; sem produção para testes de cadastro/banco.

Publicada em main0cb02dc93a6b367583ce7ffb60c681dca4ebee27; status Vercel
success confirmado.61 testes/lint/build Node22 e Chrome local aprovaram fluxo
cadastro→confirmação→primeiro login, ausência em login comum, replay, teclado,
retomada, retorno e tabela nos dois temas/mobile. Sem migração ou QA.

### Nova rodada — refinamento visual e ranking (17/10/2026)

Usuário pediu: controle de tema por clique no mesmo botão (alternar claro/escuro),
escuro como padrão da aplicação; remover a numeração decorativa ao lado de
títulos/seções em todo o site; ranking em tabela semelhante à referência Suno,
com logos/empresas clicáveis e campos definidos no Excel fornecido.

Planilha lida sem alterações: Lista de Ações e modulos necessarios (1).xlsx,
Planilha1!F3:H28. Contém25 tickers para pesquisa e seis módulos em H4:H9:
balanço patrimonial, DRE, fluxo de caixa, informações cadastráveis da empresa,
dívida líquida e estatísticas. Não contém métricas/valores financeiros para a tabela.
Usuário confirmou: cada célula mostra disponibilidade e dá acesso ao conteúdo.
Não importar essa lista como publicação nem inventar conteúdo ou números.

Aceitação: botão tema44px acessível por teclado/touch, clique alterna escuro/claro,
preferência persistente; ausência/valor inválido/antiga preferência sistema usa
escuro independentemente do SO. Numeração ornamental removida sem apagar dados,
datas, contagens, ordem funcional de exercícios ou percentuais. Tabela sem coluna
decorativa de posição, header discreto, divisórias horizontais, alinhamento,
logo/ticker e seis colunas de disponibilidade; célula/empresa abre seção/pesquisa
correta com filtros/versão/demo preservados. Manter temas e mobile320px com
rolagem restrita à tabela, identificação da empresa visível e foco acessível.

Divisão desta rodada: interface = tema e números ornamentais em todo site,
EXCETO IncomeRanking.tsx/income-ranking.css (backend) e backend = ranking tabela,
helper/campos de disponibilidade e testes. Coordenação = Excel, contexto,
integração/browser e publicação na main conforme autorização vigente. Não alterar
contratos/API/persistência/banco salvo necessidade demonstrada e combinada.

Rodada concluída: publicada na main em14464bd3675cd939d584eeb1777afbe6a6719057,
deploy Vercel success confirmado e tabela/botão conferidos no domínio oficial.
51 testes, lint e build Node22 passaram. Evidências no relato da coordenação.
Planilha original, dados publicados e QA não foram alterados.

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

Resultado da rodada: implementação publicada na main em2b155cd, com complemento
de tickers fracionários em5673c3f. 48 testes e build Node22 passaram; lint completo
passou. Chrome local validou desktop e mobile320px, temas, persistência, logos carregadas,
fallback de imagem e demo sem marcas reais. Vercel confirmou ambos os deploys
com success e a versão final foi conferida no domínio oficial. QA não foi alterada.
Relatos por sessão documentam os detalhes e limites das verificações.

## Produto e arquitetura

- Nome público: Escola do Dividendo. A pasta legada é evorix-finance.
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

Rodada6 concluída: main b33a7567b0582ec9546bdf460090d803873eb1a3, Vercel
success e marca/metadados conferidos no domínio oficial.76 testes/lint/build
Node22 aprovados; desktop/320px conferidos em fixtures isoladas. Sem migração.

Rodada7 concluída: main a87156dea72a160c0acbc11cb44b111f15b204d4; Vercel
success confirmado. MVP sem catálogo de Análises, com ranking/pesquisa da empresa,
aulas e demais funções preservadas.79 testes/lint/build aprovados; Chrome local
320px/desktop, tour5etapas, migração concluídos e zero buscas do catálogo validados.
Domínio oficial conferido com navegação nova e endereço legado indo ao ranking.
