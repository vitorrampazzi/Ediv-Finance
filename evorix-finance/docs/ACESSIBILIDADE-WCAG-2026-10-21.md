# Acessibilidade — implementação e evidências

21/10/2026 · Escola do Dividendo · papel interface.

## Resumo executivo

Implementação incremental no worktree registrado do harness, a pedido do usuário:
`C:/Users/vitor/.codex/worktrees/11a6/Evorix-finance/evorix-finance`.
React19/TypeScript/Vite/Tailwind/React Router; não foi introduzido Next.js nem
reescrito o sistema de componentes. Sem publicação, alteração de API ou negócio.

A base já tinha labels, autenticação compatível com gerenciadores de senhas,
elementos nativos, foco visível, redução de movimento, diálogos, regiões de status,
alternativas textuais para gráficos e tabela de receita. A auditoria encontrou
problemas em nomes acessíveis que substituíam o texto visível, semântica de listas
descritivas/títulos,404 sem main/h1, contraste no tema claro e ausência de dicas
visuais por teclado nos controles de ícone. Esses problemas foram corrigidos.

A revisão independente encontrou três falhas no Tooltip que o primeiro teste
de hover mascarava por manter o botão focado. Foram corrigidas na raiz: percurso
contínuo sem intervalo acima/abaixo, reposicionamento por rolagem/resize enquanto
o disparador permanece válido e Escape consumido pela dica antes do contêiner.
Reteste da Interface:8/8 jornadas focadas e4/4 checks originais do QA em cópia
própria passaram; a confirmação independente final desse ajuste está pendente.

Não constitui certificação integral WCAG: axe detecta somente parte dos critérios.
Leitor de tela real, Safari/Firefox, dispositivos físicos, Turnstile real e
conteúdo audiovisual futuro ainda exigem validação específica. Os estados
`incomplete` do axe permanecem registrados para revisão humana.

Esta base **difere da pasta principal/produção**. Coordenação identificou diferenças
em NotificationsMenu, Admin e outros módulos, inclusive hook de notificações ausente
aqui. Os resultados abaixo pertencem a este worktree e não certificam o site
publicado. Uma integração futura deve reconciliar essas diferenças por PR/checks.

## Inventário e cobertura

- Públicas: `/`, `/ranking`, `/ranking/acao/DEMO1?visual=demo`, `/aprender`,
  `/glossario`, `/assessoria`, `/metodologia`, `/privacidade`, `/suporte`.
- Conta: `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` com token
  fictício, `/verificar`; endereço inexistente para404.
- Autenticadas: `/app`, ranking/pesquisa, aprender, perfil, configurações,
  conversas, atendimentos, administração e assessoria.
- Carteira/favoritos/catálogo retirado redirecionam no App; não apresentados como
  funcionalidades ativas nem reintroduzidos para esta auditoria.
- Varredura inicial/final de25 endereços em1366x900 nos dois temas. Estados de
  cookies/validação/notificações/menu recolhido e reflow320/768 acrescentados.
  APIs dessa varredura são respostas simuladas locais, claramente separadas dos
  testes reais da fixture com MySQL descartável.

## Correções e arquivos

| Arquivos relativos à raiz da aplicação | Problema e correção |
| --- | --- |
| `src/components/Tooltip.tsx`, `tooltip.css` | Dica visual compartilhada por foco/hover, persistência ao mover o ponteiro para a dica, Escape sem transferir foco, descrição associada e cleanup. Popover nativo posiciona a dica na camada superior, inclusive dentro de dialog. Não cria wrapper de layout nem troca o controle nativo. |
| `ThemeToggle`, `NotificationsMenu`, `SiteChrome`, `layouts/DashboardLayout` | Tooltips para ícones e links recolhidos; nomes incluem o conteúdo visível; estados expanded/controls preservados. Skip link dentro de landmark e main focalizável. |
| `LearningCourseCarousel`, `LearningPlaylist`, `PrivacyConsent`, `ResearchEditor`, `support/SupportHelpCenter`, `Admin`, `EdivAssistant` | Tooltips nos controles de ícone apropriados; controles textuais comuns não receberam dicas indiscriminadas. Botões nativos/disabled mantidos. Assistente preserva contraste branco sobre fundo primário quando habilitado no ambiente permitido. |
| `PageContent.tsx` | Após troca de rota sem hash, foco no h1 quando disponível, sem invadir dialog aberto. Query/hash preservam o componente e intenção existente. |
| `App.tsx` |404 usa layout público/main e h1; retorno ao início preservado. |
| `components/auth/AuthShell.tsx`, páginas auth e `Configuracoes.tsx` | Erros com IDs associados aos campos; política de senha e confirmação sinalizam aria-invalid apenas para a falha correspondente. Confirmação divergente recebe foco. Autocomplete/paste/visibilidade de senha e contratos mantidos. |
| `Conversas.tsx`, `ResearchEditor.tsx` | Erros de criação/limite e do editor associados aos respectivos campos; required vazio do editor sinalizado após validação, sem alterar o contrato de envio. |
| `AccountGate`, `Assessoria`, `RankingFundamentals` | Hierarquia de headings sem saltos observados. Badge amarelo de pré-lançamento substituído pelo token semântico legível nos dois temas. |
| `LearningJourney.tsx` | Nome de região distinto do título da aula, evitando landmarks duplicados. |
| `ResearchRankingTable.tsx`, `research-ranking-table.css` | Nome deriva do conteúdo visível com contexto adicional oculto; não substitui o resumo. Contenção posicionada do texto oculto mantém scroll dentro da tabela. Identidade, módulos e destinos preservados. |
| `StockResearch.tsx` | Ajuda do indicador pertence a dd, mantendo dt/dd válidos e o valor isolado consultável. |
| `Aprender.tsx` | Links das fontes com cor semântica explícita e área mínima de24px; aviso de nova guia preservado. |
| `Aprender.tsx` (intenção de navegação) | Frame antigo deixa de consumir a intenção de uma seleção mais recente da playlist. Regressão real preserva foco e scroll com alternância rápida por teclado. |
| `segmented-control.css`, `index.css` | Fundo dos seletores por token e borda de campos distinguível a3:1 nos dois temas; margens de scroll para acomodar cabeçalhos/barras fixas. |
| `tests/accessibility.browser.mjs` | Axe-core, rotas/temas, teclado e reflow com APIs fictícias e relatório detalhado. |
| `tests/theme.test.mjs` | Regressão de contraste3:1 de bordas dos campos nas superfícies principais, junto das verificações existentes4,5:1 de texto. |
| `tests/browser-experience.mjs`, `session.browser.mjs` | Seletores atualizados para o nome acessível final, preservando identidade/destino e demais assertivas. |

Ícones Lucide decorativos já usam aria-hidden por padrão, com atributos explícitos
nos componentes relevantes. As imagens existentes foram inspecionadas: logos ao
lado de marca/ticker usam alt vazio; arte da home fica em região decorativa;
CompanyLogo tem fallback e é decorativo junto do nome. Não foram inventadas
descrições para imagens ausentes nem modificados logos baixados.

Os gráficos ativos oferecem descrição do cenário, valores/períodos em texto e
tabela de receita alternativa. Não há ordens financeiras nem resultados reais
inventados. Vídeos estão em preparação; legendas/audiodescrição não podem ser
certificadas antes de receber a mídia definitiva.

## Método e resultados

Referências: [WCAG2.2 oficial](https://www.w3.org/TR/WCAG22/),
[tradução pt-BR](https://www.w3c.br/traducoes/wcag/wcag22-pt-BR/) e
[APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).

- Node22.23.3 existente, runtime em `.test-artifacts/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe`.
- Axe-core4.14.0 obtido por `npm pack --ignore-scripts` apenas nos artefatos; não
  entrou em package.json/lock/config. Foi removida a declaração TypeScript do
  pacote de ferramenta que o ESLint inicialmente tentava auditar como produto.
- Execução: `node tests/accessibility.browser.mjs` com Vite somente127.0.0.1:4194
  e Playwright/Chrome headless. Caminho do axe pode ser informado por EDIV_AXE_PATH.
  O runner rejeita APIs não cobertas e exceções JavaScript; não mascara violações.
- Bateria final: **78 varreduras, zero violações automáticas, oito jornadas
  de teclado/interação, zero erros JS e zero APIs inesperadas**. JSON contém
  também36 ocorrências de regra inconclusiva, não interpretadas como aprovação.
  Inclui formulários de edição de acesso/exclusão, validação do editor e tour:
  Escape não dispensa a introdução obrigatória, que conclui por avanço explícito.
- Os primeiros alertas de contraste ao alternar temas incluíam transições em
  andamento; medições finais aguardam animações finitas. Falhas reais restantes
  de badge, seletor e links foram corrigidas. Não foi alterado o tema para
  esconder controles ou excluir regras do axe.
- `npm test`:99/99 passaram. TypeScript `tsc -b`: passou. Lint do produto e
  scanner: passou após retirar o d.ts externo. Build cliente/SSR: passou,8rotas.
- 29 testes focados de tema/tour/logos/módulos/progresso passaram; são subconjunto
  dos99, não devem ser somados como cobertura independente.
- Lighthouse Accessibility13.5.0, ferramenta temporária no cache npm, executado
  no Chrome headless em127.0.0.1:4196 com API de visitante simulada: home,
  aprender e cadastro pontuaram100/100, sem auditorias automáticas reprovadas.
  Os itens manuais do Lighthouse não equivalem a aprovação e a pontuação não
  certifica a aplicação integral. Relatórios JSON e resumo nos artefatos.
- MySQL9.3 temporário em loopback13318, schemas `ediv_test_*`, migrations001..007
  apenas descartáveis. Integração17/17 e sessões da API7/7 passaram nesta base.
  Browser principal30/30 e sessões7/7 passaram após alinhar nomes dos controles.
  A suite de experiência revelou uma corrida de navegação da playlist: antes
  scroll1237→1159, após o ajuste19/19 passaram mantendo tolerância de4px e foco.
  Backup/restauração criptografado, chave incorreta, destino preenchido e ausência
  de sessões restauradas passaram. Banco/processos temporários encerrados e
  datadir removido; portas de teste conferidas livres.

Fonte inicial revisada em `.test-artifacts/accessibility/source-manifest.json`:
SHA256 agregado `14456a5cb58f66f261ac323e5e7f01435988fb907d88410c6b12600e64da2045`,
38arquivos de produto/teste do escopo. Não é commit nem prova de equivalência à
main. A correção final do frame foi reexercitada na suite de experiência; as
últimas associações ARIA do editor/suporte passaram na varredura final, lint/build.
Não foram repetidos os fluxos de backend que essas associações não alteram.

Após os três P2 do QA, o manifesto atualizado está em
`.test-artifacts/accessibility-tooltip-fix/source-manifest.json` (38arquivos;
somente `Tooltip.tsx` e `tests/accessibility.browser.mjs` mudaram em produto/teste).
O algoritmo de agregação está nesse JSON. SHA256 agregado atual:
`4e88b9c56dc4bdbe5210d381626a7393c7d818d7a78d2b50c4417c1ca38b098d`.
O runner versionado aceita `EDIV_A11Y_TOOLTIP_ONLY=true`:8jornadas locais,
zero errosJS/APIs inesperadas,
sem nova varredura axe. Inclui travessia em24passos sem foco em ambos os lados,
scroll20px com dica/âncora móveis e foco preservado, Escape1/2 no diálogo real de
cookies e notificações, menu recolhido e tour obrigatório. As posições do botão e
o sticky do cabeçalho são ajustados somente na fixture de geometria e restaurados;
o produto preserva o layout. Cópia dos4checks originais em diretório próprio
também passou, incluindo preservação/restauração de aria-describedby preexistente.
As evidências iniciais do QA e os78scans originais permanecem intactos; não são
apresentados como reexecutados nem como prova suficiente para os três casos.

TypeScript/build/SSR8 repetidos após o ajuste: passaram. O comando padrão de lint
falhou com395erros de parsing por múltiplas raízes nas cópias de integração da
coordenação em `.test-artifacts/a11y-release`. Workaround explícito, sem alteração
de config: API ESLint com as regras existentes, tsconfigRootDir deste projeto e
exclusão dos artefatos, passou (`accessibility-tooltip-fix/lint.mjs` e `lint.txt`).
O workaround não transforma a execução padrão em aprovação. Depois a coordenação
excluiu `.test-artifacts` no globalIgnores de sua configuração e executou o comando
padrão com sucesso; evidência própria em `.test-artifacts/a11y-release/worktree-lint.log`.
Essa alteração de configuração pertence à integração da coordenação, fora do
manifesto38 de produto/teste. SQL/browsers funcionais já verdes não foram repetidos.

Tentativas intermediárias não são apresentadas como sucesso: houve seleção antiga
de avatar/links, erro de fixture administrativa simulada e vazamento de largura
do texto oculto da tabela. Foram corrigidos, com as mesmas assertivas de identidade,
destino, contraste e reflow mantidas. A falha de scroll não foi ignorada nem
substituída por espera cega. Os logs finais estão separados dos diagnósticos privados.

Artefatos: `.test-artifacts/accessibility/audit.json`, logs unit/lint/build,
screenshots e runner MySQL privado. Senha aleatória somente em memória, nenhum
`.env`, certificado ou backup de produção carregado. Processos criados são
encerrados e somente o datadir próprio é removido, validando o caminho real.

## Matriz WCAG2.2 A/AA

“Atendido” abaixo significa **no recorte e evidência descritos**, não conformidade
integral do critério em qualquer estado/conteúdo. “Não verificado” evita atribuir
aprovação automatizada a requisitos que dependem de avaliação humana/externa.

| Critério | Status | Evidência e limite |
| --- | --- | --- |
|1.1.1 Conteúdo não textual|Atendido no recorte|Alt/nomes/gráficos inspecionados; axe e alternativas textuais/tabela. Qualidade final de conteúdo requer revisão editorial.|
|1.2.1 Áudio/vídeo apenas pré-gravado|Não aplicável no conteúdo atual|Sem mídia publicada nos capítulos configurados. Reavaliar quando chegar.|
|1.2.2 Legendas pré-gravadas|Não verificado|Exigir da mídia definitiva e do player.|
|1.2.3 Audiodescrição/alternativa|Não verificado|Leitura atual não certifica equivalência de vídeo futuro.|
|1.2.4 Legendas ao vivo|Não aplicável no recorte|Nenhuma transmissão implementada.|
|1.2.5 Audiodescrição pré-gravada|Não verificado|Depende da mídia definitiva.|
|1.3.1 Informações/relações|Atendido no recorte|Labels, landmarks, headings, dt/dd, tabelas e axe.|
|1.3.2 Sequência significativa|Atendido no recorte|Ordem DOM preservada; teclado e reflow executados. Leitura humana completa pendente.|
|1.3.3 Características sensoriais|Atendido no recorte|Nomes/textos, nenhuma instrução ativa auditada depende só de cor/posição.|
|1.3.4 Orientação|Não verificado|320/768/desktop não substituem dispositivo físico em ambas orientações.|
|1.3.5 Finalidade dos campos|Atendido no recorte|Autocomplete name/email/current-password/new-password preservado.|
|1.4.1 Uso da cor|Atendido no recorte|Estados têm texto/nome/pressed/current; gráficos com descrição/valores.|
|1.4.2 Controle de áudio|Não aplicável no recorte|Nenhum áudio automático implementado.|
|1.4.3 Contraste mínimo|Atendido no recorte|Axe estável nos temas/estados; tokens4,5:1. Inconclusivos e mídia exigem revisão manual.|
|1.4.4 Redimensionar texto|Não verificado integralmente|Reflow executado; zoom/texto200% de todos estados requer verificação humana.|
|1.4.5 Imagens de texto|Atendido no recorte|Conteúdo textual usa HTML; marca é logotipo.|
|1.4.10 Reflow|Atendido no recorte|320/768 sem scroll horizontal da página nos fluxos listados; tabela tem scroll próprio.|
|1.4.11 Contraste não textual|Atendido no recorte|Bordas de campos3:1 e foco semântico; gráficos com dados equivalentes. Estados completos pedem revisão humana.|
|1.4.12 Espaçamento do texto|Não verificado|Testar sobreposição/truncamento com valores WCAG em todos os estados.|
|1.4.13 Conteúdo por hover/foco|Atendido no recorte retestado; QA final pendente|Corrigidos dois P2 do QA: percurso contínuo sem foco acima/abaixo em24passos e persistência/reposicionamento após scroll20px com foco. Escape dispensa só a dica, preservando foco; segundo Escape mantém fechamento normal do contêiner. Não generaliza para todos os estados/tecnologias assistivas.|
|2.1.1 Teclado|Atendido no recorte|Jornadas descritas e controles nativos; cenários funcionais complementares no browser. Não cobre tecnologia assistiva real.|
|2.1.2 Sem armadilha de teclado|Atendido no recorte|Menus Escape e modal nativo; browser pode levar foco à própria UI, não ao fundo inerte. Tour obrigatório preserva progressão autorizada.|
|2.1.4 Atalhos de caracteres|Não aplicável no recorte|Sem atalhos globais de caractere único encontrados.|
|2.2.1 Ajuste de tempo|Não verificado|Expiração de sessão/token é contrato de segurança; revisar aplicabilidade/exceção e comunicação com especialista.|
|2.2.2 Pausar/parar/ocultar|Atendido no recorte|Home possui pausa, animações respeitam reduced-motion; não são informações financeiras atualizando automaticamente.|
|2.3.1 Três flashes|Não verificado|Inspeção não identificou flashes; sem medição específica de fotossensibilidade.|
|2.4.1 Ignorar blocos|Atendido no recorte|Skip link e main focalizável nos layouts.|
|2.4.2 Título da página|Atendido no recorte|PageMetadata e rotas existentes;404 com h1.|
|2.4.3 Ordem do foco|Atendido no recorte|Controles nativos, foco de rota/h1, modal/retorno; leitor real pendente.|
|2.4.4 Propósito dos links|Atendido no recorte|Identidade/módulo/texto do destino preservados, nome inclui conteúdo visível.|
|2.4.5 Várias formas|Atendido no recorte|Menus, links entre páginas, busca/filtros/glossário/central de ajuda.|
|2.4.6 Cabeçalhos e rótulos|Atendido no recorte|Headings/labels corrigidos e axe; qualidade editorial humana continua necessária.|
|2.4.7 Foco visível|Atendido no recorte|Outline global, controles e teclado; não removido para aumentar pontuação.|
|2.4.11 Foco não obscurecido mínimo|Não verificado integralmente|Margens de scroll e layouts testados; conferir todos overlays, zoom e tecnologias assistivas.|
|2.5.1 Gestos de ponteiro|Atendido no recorte|Ações por clique/botões; carrossel não exige arrastar.|
|2.5.2 Cancelamento do ponteiro|Atendido no recorte|Ações nativas por click, sem execução obrigatória em pointerdown.|
|2.5.3 Rótulo no nome|Atendido no recorte|Correção dos links, avatar e minicurso; axe sem violação na execução final.|
|2.5.4 Atuação por movimento|Não aplicável no recorte|Nenhuma ação por agitar/inclinar dispositivo implementada.|
|2.5.7 Arrastar|Atendido no recorte|Controles alternativos ao scroll/arraste; nenhum fluxo depende só de dragging.|
|2.5.8 Tamanho do alvo|Atendido no recorte|Controles principais44px, fontes24px e axe nos layouts testados. Todos estados reais requerem avaliação manual.|
|3.1.1 Idioma da página|Atendido no recorte|Documento pt-BR.|
|3.1.2 Idioma das partes|Não verificado|Revisão editorial de trechos estrangeiros/publicações futuras pendente.|
|3.2.1 Ao receber foco|Atendido no recorte|Foco mostra dica sem navegar/enviar; teclado executado.|
|3.2.2 Ao receber entrada|Atendido no recorte|Formulários com envio explícito; filtros/selects alteram resultado no contexto.|
|3.2.3 Navegação consistente|Atendido no recorte|Layouts público/conta compartilhados, menus/destinos preservados.|
|3.2.4 Identificação consistente|Atendido no recorte|Controles comuns reutilizados e nomenclatura conferida.|
|3.2.6 Ajuda consistente|Atendido no recorte|Central/conversas e links consistentes. Contato público alternativo ainda depende da operação.|
|3.3.1 Identificação de erros|Atendido no recorte|Alertas e associação por ID; política/confirmar senha com invalid específico.|
|3.3.2 Rótulos/instruções|Atendido no recorte|Labels nativos/required e instruções de senha; não substituídos por placeholder.|
|3.3.3 Sugestão de erro|Atendido no recorte|Política de senha/igualdade e recuperação/retry existentes.|
|3.3.4 Prevenção de erros|Não verificado integralmente|Publicação/exclusão têm confirmação; revisão completa de dados controlados depende dos gates finais/avaliação humana.|
|3.3.7 Entrada redundante|Atendido no recorte|Rascunhos/valores conservados nos erros; confirmação de senha ligada à segurança. Avaliar novos fluxos.|
|3.3.8 Autenticação acessível mínimo|Não verificado integralmente|Paste/autocomplete/mostrar senha mantidos. Turnstile real e gerenciadores/leitor exigem ensaio próprio.|
|4.1.2 Nome/função/valor|Atendido no recorte|Nativos/ARIA, estados, axe e teclado. Leitores reais não executados.|
|4.1.3 Mensagens de status|Atendido no recorte|Alert/status existentes e adicionados; anúncio real em leitor não verificado.|

## Pendências e manutenção

1. Reexecutar a bateria com conteúdo/publicações reais de teste e revisão QA
   independente do estado final; não usar produção como banco de testes.
2. NVDA/Firefox e VoiceOver/Safari: ordem de leitura, tabelas extensas, nomes,
   anúncios, tooltips/popover e retorno de foco. Compatibilidade popover requer
   navegadores modernos; avaliar fallback se suporte legado virar requisito.
3. Conferir zoom200/400%, espaçamento WCAG, alto contraste/cores forçadas e
   operações touch em hardware real; varredura automática não substitui esses ensaios.
4. Exigir legendas/transcrições/audiodescrição conforme o conteúdo audiovisual
   definitivo. Validar Turnstile e autenticação assistida em ambiente próprio.
5. Indicador ativo de Fontes no final do caderno é limite P3 já registrado:
   URL/destino e seção funcionam; a linha de leitura pode destacar a seção anterior.
   Não foi alterado neste escopo.
6. Manter novos controles nativos/nomeados; reutilizar Tooltip somente para ícones
   ou conteúdo realmente truncado e preservar texto visível no nome acessível.
   Executar scanner, contraste, lint/build e regressões ao alterar o layout.
7. Integração à main exige reconciliar o checkout atual e PR com checks obrigatórios;
   este trabalho não autoriza publicação nem comprova produção/LGPD/entrega SMTP.


## Integração e revisão independente para publicação

A entrega do implementador acima foi integrada à main9cacd5f em árvore isolada,
com mescla de três versões, preservando o hook de notificações, a paginação,
as leituras e as demais atualizações posteriores à base original. O quadro
operacional e credenciais não foram copiados.

O QA independente confirmou os38hashes antes/depois, repetiu31checks principais,
19de experiência,7de sessão e backup/restauração. Encontrou trêsP2 no Tooltip:
percurso de mouse sem foco, persistência na rolagem e Escape do diálogo. A
correção compartilhada mudou somente Tooltip.tsx e o runner de acessibilidade
no manifesto38, gerando o identificador
4e88b9c56dc4bdbe5210d381626a7393c7d818d7a78d2b50c4417c1ca38b098d.

No reteste independente,4reproduções originais,8jornadas focais e a página real
local de preferências passaram. Escape1fecha só a dica; Escape2fecha o diálogo;
o tour obrigatório permanece. Esses três achados estão fechados no recorte
verificado. Os36inconclusivos e testes humanos pendentes continuam pendentes;
não há certificação de conformidade integral.

A integração também atualiza Vite8.3.0→8.3.3 para corrigir o advisory
[GHSA-587h-7wmj-h5pm](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm),
com lock gerado sem scripts. A política de origem do lock aceita pacotes
embutidos somente quando declarados pelo pacote pai com origem npm e SHA512,
com regressões de rejeição; isso preserva a validação dos tarballs. Instalação
limpa Node22, audit0 e assinaturas verificadas foram executados na área isolada.
ESLint ignora artefatos locais, mantendo as regras do produto.

Publicação depende de PR e dos checks quality/dependency-security no head final,
sem bypass. Resultados dos checks e commit publicado constam no PR de integração.
O que foi testado em banco descartável não representa uso de produção como fixture.
