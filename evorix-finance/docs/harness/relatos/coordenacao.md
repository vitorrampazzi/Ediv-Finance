# Coordenação

Objetivo: configurar três sessões e um harness verificável.

Achado de ambiente: Git não conseguiu resolver a pasta pai deste worktree.
Não foram alterados metadados Git.

## Entrega em 17/10/2026

- Criados os forks de interface e backend no mesmo diretório; IDs em SESSOES.md.
- Enviados contexto, papéis, autorização de comunicação e escopo de diagnóstico.
- AGENTS.md estabelece consulta do quadro em cada turno, reservas antes de edição,
  evidências e entrega. FLUXO.md descreve mensagens, retomada e limites.
- CLI scripts/harness.mjs: status, check, claim, release e update; lock exclusivo,
  gravação atômica e recusa de sobreposição entre diretórios/arquivos no Windows.
- package.json oferece harness:status, harness:check e test:harness; npm test
  também inclui os testes do harness.

## Verificações

- `npm run test:harness`: 4/4 passaram.
- `npm run harness:check`: quadro válido, três papéis e sem conflito de reservas.
- `node --check scripts/harness.mjs`: passou.
- `npm test` antes de incluir a suíte do harness: 16 passaram e 2 falharam.
  `unit.test.mjs` não conseguiu importar express (dependências ausentes);
  `site.test.mjs:49` espera uma CSP sem o domínio de desafio Cloudflare presente
  em vercel.json. Diagnóstico encaminhado ao backend; código de produto intacto.
- Node disponível v24.20.0; package.json declara 22.x. Build/lint e testes de
  integração não foram executados nesta configuração, por dependências/ambiente ausentes.
- A primeira execução dos testes do harness encontrou EPERM ao renomear arquivo
  no temporário do sandbox. Fixtures foram movidas para .test-artifacts dentro
  deste workspace; a gravação real do quadro e os testes passaram depois disso.

## Limites e próximos passos

Reservas são cooperativas, não impedem um editor externo de gravar. O quadro não
replica históricos nem acorda chats ociosos. Não foi criada automação recorrente.
As sessões fazem agora seus diagnósticos e atualizam relatos próprios; a
coordenação consolida os achados e comunica dependências antes de novas mudanças.

## Consolidação

Recebidos e lidos os relatos de interface e backend. Ambos confirmaram o uso
do mesmo quadro por status/claim/update/release/check. Achados I01 e I02 e o
alinhamento do teste CSP foram registrados na fila proposta em CONTEXTO.md;
há dependências explícitas entre frontend e backend para progresso/autenticação.
As duas sessões recebem o consolidado e o caminho do relato da outra para a
sincronização inicial. Nenhuma correção de produto foi iniciada nessa primeira rodada.

## Rodada Trello — temas e logos (17/10/2026)

Usuário autorizou implementar dark mode e logos em todas as superfícies de
empresas e publicar diretamente na main. Cards lidos no Chrome: qdn5nYW9 e
hzIa42yb; sem descrição adicional. O escopo amplo também cobre logos da home
(card 9XwWNghO), sem executar outros cards ou modificar o quadro.

Interface entregou sistema/claro/escuro, tokens, bootstrap externo anterior ao
primeiro paint e controle nos headers público/autenticado/mobile. Backend
entregou CompanyLogo, dados brapi e integrações nas superfícies de empresas.
Coordenação incluiu as suítes no npm test e CSS CompanyLogo no prerender para
preservar dimensões já no primeiro HTML público. Relatos das sessões atualizados.

### Validação integrada

- Runtime Node22.23.3 obtido do pacote oficial node no npm; npm ci concluído.
  Sem novas dependências de produto ou mudanças no lockfile.
- npm test: **47/47 passaram**; npm run lint: passou; npm run build: passou
  com Node22, TypeScript, Vite cliente e SSR de nove rotas públicas.
- Build repetido após o ajuste CSS passou; HTML tem CompanyLogo CSS e bootstrap
  de tema antes dos estilos.
- Chrome com build e fixtures locais, sem banco/produção: home e mercado nos
  dois temas; escolha clara preservada após reload; logos PETR4/VALE3/ITUB4
  carregadas (naturalWidth>0); pesquisa com logo64px; navegação autenticada
  e troca de tema funcionando.
- Mercado e ranking autenticado em320px: scrollWidth=clientWidth=320, sem
  overflow horizontal. Controle e navegação móvel visíveis.
- Imagem inexistente ZZZZ4: fallback textual sem img restante, quadro40x40.
  Demo: seis identidades DEMO1–DEMO6, zero imagens.
- Capturas na pasta de visualizações da coordenação: ediv-logos-claro.png,
  ediv-logos-escuro.png e ediv-mobile-claro.png; preços são fixtures.
- Não executados: integração MySQL, Turnstile real e leitor de tela. O CI
  existente inclui MySQL descartável, integração, browser e backup.

### Publicação

Checkout base15a3923; main remota88107aca. Comparação mostrou quatro arquivos
posteriores (READMEs e PublicHome). Preservados os READMEs remotos e o título
Aprenda a olhar a raiz, não só o fruto. Sem alteração de schema/credenciais/
permissões ou conteúdo de pesquisas.

Git compartilhado não foi reparado. Um bare temporário dentro de .test-artifacts
recebeu main para comparação; publicação atômica pelo GitHub usa a árvore/pai
da main e expected_sha. Fixtures, dependências, dist, logs e cache não são enviados.
Vercel MCP retornou403; CLI ausente. Confirmação do deploy pelo status Vercel
do commit no GitHub e leitura pública do resultado.

### Resultado e complemento fracionário

Main publicada em `2b155cde71d1bf3f73742c23f2935c24bcacc0ee`; status Vercel
success confirmado no GitHub e site aberto no Chrome com controle Aparência
e logos carregadas. O usuário já tinha sessão válida no navegador; navegação
redirecionou para /app sem novo login. Nenhum dado da conta foi alterado.

Nessa leitura, home retornou MWET4F e FSRF11F. Backend ajustou apenas resolução
da imagem para remover F terminal do mercado fracionário, mantendo classe e
ticker exibido (PETR4F→PETR4 para imagem; não PN→ON). Fallback agora preserva
até sete caracteres. Testes adicionais cobrem fracionários, classes, rejeições e
preservação da identificação. Cobertura de cada imagem continua dependente do
provedor; se ausente, o ticker permanece. Complemento será publicado sobre
a main atual após novo teste/build. Servidores locais de fixtures encerrados.

Complemento publicado em `5673c3fa810eda63bf2bef27dd9fd15e6841f35e` após
**48/48 testes** e novo build completo Node22 passarem. Atualização main com
expected_sha da publicação anterior; somente helper/testes e relatos/quadro
no complemento. Deploy final Vercel **success** confirmado via status GitHub em
17/10/2026. Domínio oficial recarregado no Chrome: controle Aparência presente,
FSRF11F carregando imagem FSRF11 e AZEV3 carregada; MWET4 não tem imagem disponível
nessa consulta e mantém ticker MWET4F inteiro no fallback. Captura final salva em
ediv-publicado-final.png. Nenhuma preferência/dado da conta real foi alterado;
somente navegação de leitura para confirmar a publicação.

## Rodada de refinamento e tabela — 17/10/2026

Pedido: tema alternado por clique no mesmo botão com escuro padrão, remover
numeração decorativa do site e ranking tabular semelhante à referência Suno,
mantendo empresas clicáveis e usando os campos do Excel fornecido.

### Referências e decisão de conteúdo

Planilha lida sem alteração pelo Python pandas do runtime fornecido:
Lista de Ações e modulos necessarios (1).xlsx, Planilha1!F3:H28. F4:F28 lista
25 tickers para pesquisa; H4:H9 lista seis módulos, sem valores/indicadores.
As duas imagens anexadas foram inspecionadas: prefixo01 Empresa e tabela Suno.
Usuário confirmou por resposta explícita que deseja disponibilidade por módulo
com acesso ao conteúdo. Não foram importados tickers como publicação ou criados
dados financeiros. O original Excel permanece intacto.

### Implementação conjunta

Interface entregou botão44px que alterna escuro/claro, preferência persistente
e fallback escuro sem consultar o SO (inclui valor system legado/inválido).
Removidos prefixos, badges e números ornamentais de home, metodologia, cards de
cursos, playlist, índice/etapas da pesquisa, destaques e editor. Dados, contagens,
progresso e passos operacionais foram preservados.

Backend entregou tabela semântica de sete colunas: Empresa/ativo e os seis
módulos. Status textual Disponível ou Não publicado, logo/ticker/nome na primeira
coluna e links normais. Helper research-modules.mjs/.d.mts compartilha labels e
âncoras; RankingFundamentals expande e rola ao hash seguro; StockResearch recebe
whitelist dos mesmos IDs por combinação das sessões.

Coordenação incluiu a suíte no npm test e manifesto de release; ajustou apenas
o CSS integrado em<=359px para coluna fixa144px, tabela1008px e scroll-padding154px
(176px nos demais celulares). Isso deixa uma célula inteira ao lado da empresa
em320px, sem perder o contexto durante rolagem horizontal.

### Verificações reais

- Node22.23.3: **51/51 testes passaram**, incluindo tema e disponibilidade/
  links de módulos; lint completo passou; build TS+Vite+SSR passou com nove rotas.
- Primeiro build detectou formatter money sem uso após a troca de grade; backend
  removeu o código morto e os builds seguintes passaram. Build final repetido
  após o refinamento CSS também passou.
- Chrome em fixture local sem banco/produção: origem nova4182 iniciou escura;
  botão clicado alternou claro, reload preservou claro e Enter voltou para escuro.
  Não existe mais select/dropdown de tema.
- Home exibiu Empresa/Pesquisa/Dividendos e índices sem01/02/03. Busca no código
  encontrou apenas contador funcional de aulas e posição do carrossel como
  padStart restantes; dados financeiros, datas e contagens permanecem.
- Tabela desktop mostra sete headers, três empresas com logos e módulos mistos,
  inclusive dívida textual0 como disponível e conteúdo ausente sem link.
- BuscaPETR+setorEnergia → link DRE abriu a empresa/versão1 e o módulo correto,
  details aberto e headingtop155px com scrollMargin160px; voltar conservou filtros.
- Mobile320px: main.scrollWidth=main.clientWidth=320; só a região da tabela rola
  (viewport288px, conteúdo1008px). Coluna fixa144px. Setas moveram scrollLeft480;
  Tab de volta ao balanço trouxe scrollLeft0 com link à direita da coluna fixa
  (focusLeft170px versus companyRight160px). Empresa acessível por teclado abriu
  a pesquisa normalmente. Os dois temas foram conferidos visualmente.
- Capturas locais: ranking-tabela-escuro.png, ranking-tabela-claro.png e
  ranking-tabela-mobile.png na pasta de visualizações desta conversa. São fixtures.
- Não executados: MySQL/integração real, leitor de tela e Turnstile real. Nada
  nesta rodada alterou schema, permissões, conteúdo publicado ou dados de conta.

### Publicação

Preparada sobre main5673c3f em bare temporário, sem reparar Git compartilhado.
Publicação atômica pelo conector GitHub com expected_sha, preservando a main.
Não entram planilha/imagens de referência, fixtures, node_modules, dist ou caches.
As sessões entregaram claims livres; coordenação fará confirmação do deploy.
