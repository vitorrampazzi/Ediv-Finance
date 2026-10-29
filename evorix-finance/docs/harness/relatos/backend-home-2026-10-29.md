# Backend — homepage e multiagentes — 29/10/2026

## Escopo e aceitação

Auditoria das implicações de título/animação para APIs, rotas, build, produção e
exposição de configuração. Aceitação: identificar dependências reais, preservar
contratos e não adicionar segredos ou arquivos operacionais aos assets públicos.
O usuário autorizou quatro agentes neste checkout. O harness v2 já permite a
reserva do relato com papel backend; delegação recebida e executada.

## Achados

- `site-pages.mjs` fornece os metadados tanto a `PageMetadata.tsx` quanto a
  `scripts/prerender.mjs`. Corrigir a fonte compartilhada mantém HTML inicial e
  navegação SPA consistentes; alterar apenas `index.html` seria insuficiente.
- `TeachingJourney.tsx` é uma ilustração local com estado, observers e CSS, sem
  fetch, variáveis de ambiente, autenticação ou persistência. Não há necessidade
  demonstrada de alterar APIs, banco, integrações, CORS, CSP ou migrações.
- Vercel usa raiz `evorix-finance`, `npm run build`, saída `dist` e a função
  `api/handler.js`; as rotas de produção existentes não precisam mudar.
- `docs/SEGURANCA-DEPENDENCIAS.md` e o relato SEO registram proteção da main com
  PR e checks quality/dependency-security obrigatórios, inclusive administradores.
  A coordenação deve confirmar o estado remoto e respeitar eventual proteção.
- `scripts/build.mjs` executa TypeScript, Vite e prerender. Vite não copia a raiz
  do repositório para dist: as configurações `.codex` fora de `public/` e sem
  imports do frontend não entram automaticamente no bundle. O prerender escreve
  somente HTML público, sitemap e robots; não lê configurações de agentes.
- `scripts/export-source.mjs` gera arquivo privado em `.test-artifacts/` usando
  `git archive HEAD`. Configurações versionadas integram esse ZIP de código por
  definição, sem serem assets servidos pelo site. Não há ajuste necessário aqui.
- `.gitignore` exclui ambientes, backups e artefatos; os únicos arquivos de
  ambiente versionados encontrados foram os exemplos. A política de deploy
  mantém o assistente desabilitado em Production.

## Verificações e limites

- Leitura de AGENTS, contexto, fluxo, relatos, build, prerender, configuração Vite,
  export-source, API handler, política de deploy e regras Vercel.
- `git ls-files` para ambientes/chaves/credenciais: somente exemplos de ambiente.
- Busca por padrões de chaves privadas, tokens GitHub e IDs AWS: sem ocorrências.
  Busca por padrões não constitui garantia absoluta de ausência de segredos.
- Harness status/claim/update funcionando após migração v2. Antes da migração,
  status recusava o caminho absoluto antigo; nenhuma edição ocorreu nesse estado.
- Nenhum teste de banco, ação remota ou alteração de configuração de produção.
  Testes completos ficam com QA/coordenação, evitando execução duplicada.

## Revisão independente do diff final

- Produto: título corrigido na fonte SSR/SPA; seleção por centros dos três artigos,
  frame agrupado e listeners removidos no cleanup. CSS mantém figuras estáticas
  sem animação, limita o fluxo a duas passagens e desativa animações/transições
  com reduced-motion. Sem novos contratos, dependências ou acessos ao backend.
- Browser: o novo teste usa build local e APIs explicitamente simuladas. Preserva
  falhas em process.exitCode, captura todos os pageerrors e erros de console, e
  recusa chamadas API fora dos três endpoints simulados. A única exclusão de
  console é o 401 esperado do endpoint auth/me para visitante, também registrado
  como evidência; não é um filtro genérico para erros. Não prova disponibilidade
  real da API, que segue coberta pelas suítes de integração e verificação final.
- Harness: upgrade ocorre sob o mesmo lock de mutate; valida o estado original,
  arquiva com escrita exclusiva antes de retirar as reservas legadas, adiciona
  QA e grava por rename atômico. Upgrade v2 é idempotente. Falhas de validação ou
  conflito mantêm o arquivo anterior. O arquivo legado foi excluído do Git para
  preservar o histórico local sem versionar o caminho absoluto antigo.
- Limite operacional concreto: se o processo de upgrade parar depois de gravar o
  arquivo de arquivo e antes do rename do estado, uma nova tentativa v1 recusará
  sobrescrever o arquivo existente (fail closed). Exige inspeção manual desse
  arquivo preservado; não provoca perda silenciosa. A migração desta rodada já
  terminou e o quadro v2 está em uso pelos quatro papéis.
- Configuração: arquivos .codex de agentes contêm instruções relativas e nenhuma
  credencial. Nenhum import do frontend os inclui nos assets.
- Build presente: percorri 114 arquivos de dist; nenhum caminho .codex, .env,
  AGENTS.md, state.json ou harness. dist/index.html tem o título exato. O build
  foi preparado pela coordenação/QA; esta verificação é inspeção independente
  dos resultados, não uma segunda execução de build.
- `git diff --check`: aprovado. Sem achado bloqueador estático no escopo.

Main protegida confirmada remotamente pela coordenação; a publicação seguirá as
proteções existentes, sem bypass. Build/lint/unidade/browser Node22 pertencem ao
QA; CI remota cobrirá integração SQL. Aptidão final depende desses gates e da
validação efetiva da versão publicada. Não se declara produção atualizada aqui.
