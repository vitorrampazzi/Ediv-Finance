# Ediv Finance — guia para desenvolvimento e apresentação

Atualizado em 9 de outubro de 2026.

## O que estamos construindo

Uma plataforma de educação sobre ações e dividendos, apoiada em pesquisas de um
profissional de mercado. O caminho principal é **ranking → pesquisa da empresa →
aprendizado**. A escola explica os indicadores e as premissas; o ranking organiza
os cenários fornecidos pela equipe. A API de mercado fornece preços e catálogo,
mas não cria as previsões.

A versão atual trabalha com ações ordinárias, preferenciais e units. Carteira,
visão geral de patrimônio e favoritos foram retirados da navegação do produto.
O backend e as tabelas dessas funções antigas ainda existem para preservar os
dados, mas não são o foco deste MVP. O site não executa ordens ou movimenta dinheiro.

O ranking de demonstração usa empresas e números fictícios. As pesquisas reais,
a identificação profissional e os vídeos do corretor ainda precisam chegar.
Não há cobrança habilitada. A IA permanece experimental na branch QA e bloqueada
em produção.

## Arquitetura

| Camada           | Tecnologia e responsabilidade                                              | Onde começar                                                                           |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Interface        | React 19, TypeScript, Vite, Tailwind e React Router                        | `src/main.tsx`, `src/App.tsx`                                                          |
| Aparência        | Tokens de cores, componentes compartilhados, layouts público e autenticado | `src/index.css`, `src/components/SiteChrome.tsx`, `src/layouts/DashboardLayout.tsx`    |
| Comunicação      | Fetch com tratamento de erros e cookies de sessão                          | `src/lib/api.ts`, `src/context/AuthProvider.tsx`                                       |
| API              | Node.js 22 e Express 5, módulos por domínio                                | `server/app.js`, `server/index.js`                                                     |
| Persistência     | MySQL gerenciado Aiven, driver mysql2 e SQL explícito                      | `server/database.js`, `server/migrations/`                                             |
| Produção         | Arquivos estáticos e uma função da Vercel que encaminha a API ao Express   | `api/handler.js`, `vercel.json`                                                        |
| Páginas públicas | Pré-renderização no build, metadados por rota e sitemap                    | `scripts/build.mjs`, `scripts/prerender.mjs`, `src/entry-server.tsx`, `site-pages.mjs` |

A raiz Git está um nível acima desta pasta. O projeto Node fica em
`evorix-finance/`; o workflow do GitHub fica na raiz Git, em
`.github/workflows/quality.yml`. O nome antigo da pasta/schema não muda o nome
público Ediv Finance.

### Fluxo de uma solicitação

1. A página usa `apiRequest` e envia o cookie de sessão ao mesmo domínio.
2. A Vercel encaminha `/api/*` ao handler. Localmente o Vite usa um proxy para a API.
3. O Express confere sessão, permissão, origem e dados da solicitação.
4. O módulo consulta o MySQL e devolve JSON; integrações externas ficam no servidor.
5. A interface apresenta o resultado, carregamento, estado vazio ou erro com recuperação.

O HTML público é gerado sem depender de acesso ao banco durante o build. Após
carregar a página, o React consulta os dados atuais pela API. Ao criar outra rota
pública, atualizar **App, entry-server, site-pages e vercel.json** em conjunto.

## Funcionalidades e arquivos importantes

### Pesquisas

- `src/pages/IncomeRanking.tsx`: filtros, versões, comparação, editor e importação.
- `src/pages/StockResearch.tsx`: caderno da empresa, tese, riscos, fundamentos,
  fontes, datas e navegação entre empresas da mesma publicação.
- `src/components/ResearchEditor.tsx` e `research-editor-model.ts`: editor em
  cinco etapas e validações de preenchimento.
- `src/components/SavedResearchDrafts.tsx`: rascunhos privados salvos na conta.
- `src/components/PublicationReview.tsx` e `src/lib/researchCoverage.ts`: conferem
  a presença de 11 campos de leitura. Essa contagem não avalia a ação ou sua qualidade.
- `server/rankings.js`, `server/spreadsheet.js`, `server/research-drafts.js`:
  validação, importação/publicação e controle dos rascunhos.

O fluxo é **editar/importar → preparar arquivo → conferir prévia → publicar**.
Alterar conteúdo ou autoria invalida a prévia anterior. O editor local prepara
um CSV e usa a mesma validação da importação; não grava diretamente uma publicação.

CSV e XLSX aceitam até 300 linhas e arquivo de até 1 MB. Ticker, empresa e potencial
são obrigatórios; outros campos podem ser completados depois. As publicações
preservam versões anteriores. A revisão de um rascunho usa `version` para detectar
conflitos: uma resposta 409 mantém a edição local e permite salvar outra cópia.
Salvar rascunho não publica; rascunhos pertencem à conta que os criou.

### Escola

- `src/pages/Aprender.tsx`: carrega aulas, seleciona capítulo e salva progresso.
- `src/lib/learningCatalog.ts`: cursos, ordem, metadados e URLs dos vídeos.
- `server/learning-content.js`: textos, exercícios e definições das aulas.
- `LearningJourney`, `LearningCourseCarousel`, `LearningPlaylist`, `LearningVideo`
  e `LearningQuiz`: percurso, seleção, player e exercício.
- `server/learning.js`: acesso e persistência das conclusões.

A URL identifica a aula: `/app/aprender?aula=dividendos#sala-de-aula`. Links antigos
como `/aprender#dividendos` continuam funcionando. O visitante acessa a primeira
aula; a conta confirmada libera a trilha. A conclusão representa **exercício
respondido corretamente**, não tempo de vídeo assistido. A conta salva progresso
no banco; o visitante usa o armazenamento deste navegador.

Vídeos são incorporados de YouTube/Vimeo após o clique no player. Não colocar
arquivos de vídeo no Git. Para publicar capítulos novos, atualizar o catálogo e
o conteúdo do servidor, preservando os IDs existentes. Ver [VIDEOS-CURSO.md](VIDEOS-CURSO.md).

### Mercado, ajuda e confiança

- `src/pages/Home.tsx`, `src/pages/analises.tsx`, `useMarketAssets` e
  `server/market.js`: catálogo de ações, consulta ao provedor e tentativa de recarregar.
- `src/components/PageState.tsx`: estados de erro/vazio/carregamento compartilhados.
- `src/pages/Transparencia.tsx`, `Conversas.tsx`, `server/support.js`: central de
  dúvidas e conversas. Usuário vê as próprias; Analista/Administrador gerenciam o atendimento.
- `src/pages/Metodologia.tsx`: processo de publicação, leitura, autoria e contato.
- `src/components/LaunchReadiness.tsx`: pendências de lançamento na Administração.

Nome, categoria, registro, e-mail público e horário são configurações do servidor:
`PROFESSIONAL_NAME`, `PROFESSIONAL_CATEGORY`, `PROFESSIONAL_REGISTRATION`,
`SUPPORT_EMAIL` e `SUPPORT_HOURS`. Continuam vazios até a equipe fornecer os dados.
Salvar essas variáveis na Vercel exige novo deploy. A autoria de cada pesquisa é
preenchida separadamente e fica registrada na versão publicada.

## Contas e segurança

Cadastro exige confirmação por e-mail; recuperação de senha também usa token de
uso único. Senhas usam Argon2id. Sessões ficam no banco; o cookie é HttpOnly,
SameSite Strict e Secure em produção. Escritas verificam a origem. O frontend não
recebe senhas de banco ou chaves de serviços.

Há três perfis: Usuário, Analista e Administrador. Ambos os perfis da equipe podem
publicar pesquisas e atender mensagens; gestão de usuários fica com Administrador.
As verificações importantes estão **na API**, não apenas nos botões ou rotas React.
Consultar `server/permissions.js`, `src/lib/permissions.ts` e [PERMISSOES.md](PERMISSOES.md).

Arquivos `.env*`, certificados locais e backups não devem acompanhar um ZIP do
projeto. Para compartilhar código, usar `npm run export:source` ou `git archive`.
O guia não contém segredos nem requer alterar credenciais existentes.

## Desenvolvimento local

Depois de instalar Node 22 e configurar os arquivos locais com os acessos do
ambiente pretendido:

```powershell
npm ci
```

Em dois terminais, para usar os dados isolados de QA:

```powershell
npm run dev:api:qa
```

```powershell
npm run dev
```

O frontend normalmente abre em `http://localhost:5173`; a API em
`http://127.0.0.1:3001`. Confirmar o endereço mostrado nos terminais. As contas de
QA e de produção são independentes. Não apontar testes ou experimentos ao banco real.

Antes de publicar código:

```powershell
npm run lint
npm run build
```

O build executa TypeScript, Vite e pré-renderização. A integração contínua já
existente executa lint, testes, build e verificações com MySQL descartável, sem
credenciais de produção. Nesta atualização do MVP, a conferência local é lint e
build; não houve execução manual da suíte de testes ou alteração de banco.

## Ambientes e publicação

| Ambiente | Branch | Endereço                                                         |
| -------- | ------ | ---------------------------------------------------------------- |
| Produção | `main` | https://escoladodividendo.com.br/                                |
| QA       | `QA`   | https://ediv-finance-git-qa-vitors-projects-7b84bd52.vercel.app/ |

Um push em main dispara o deploy de Production; em QA, gera Preview. Cada ambiente
tem suas próprias configurações e banco. QA não recebe automaticamente os commits
de main. Consultar [AMBIENTES.md](AMBIENTES.md) antes de sincronizar branches; não
levar experimentos de IA à produção junto com mudanças visuais.

Mudanças atuais não exigem migração. Uma mudança futura de schema precisa de
migração explícita, aplicada com usuário técnico apropriado **antes** de liberar
o código dependente; o usuário da função não deve receber permissão de DDL.

## Roteiro curto para apresentar

1. Home pública: explicar a proposta, mostrar análises e o acesso à escola.
2. Conta confirmada: abrir o ranking de demonstração e explicar que a pesquisa real
   será fornecida pelo corretor.
3. Clicar numa empresa: tese, riscos, fundamentos, período, fontes e versão.
4. Escola: cursos, playlist, leitura e exercício; demonstrar o percurso salvo.
5. Conta de equipe: mostrar editor guiado e conferência da prévia. Salvar um rascunho
   privado se necessário; não publicar exemplos como pesquisas reais.
6. Código: percorrer App → página → apiRequest → módulo Express → MySQL.

## Próximos passos com o corretor e o desenvolvedor

- Receber e revisar pesquisas reais, suas fontes e identificação profissional.
- Receber vídeos, títulos e ordem das aulas; associar ao catálogo atual.
- Completar contato, horários e dados públicos da equipe.
- Revisar a metodologia específica das previsões com o autor; a página atual explica
  o fluxo e a leitura, sem inventar um método de avaliação.
- Planejar edição de aulas pelo painel quando houver conteúdo e fluxo editorial definidos.
- Avaliar e testar a IA separadamente em QA antes de qualquer decisão de liberação.
