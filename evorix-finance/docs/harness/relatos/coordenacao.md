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
