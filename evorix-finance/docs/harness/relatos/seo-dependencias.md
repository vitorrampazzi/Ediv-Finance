# SEO e dependências — 20/10/2026

## Autorização e coordenação

Usuário pediu executar o plano de llms.txt, Search Console, Perfil da Empresa e
segurança das dependências nesta pasta. A coordenação foi informada dos caminhos.
O harness continua recusando status/claim no checkout principal porque o quadro
aponta para11a6. O state e os arquivos das outras sessões foram preservados.
Os workflows/Dependabot ficam em .github na raiz Git (pasta pai do aplicativo).

## Mudanças e aceitação

- public/llms.txt descreve o produto com links públicos canônicos, sem dados de
  usuários ou conteúdo restrito. Teste valida URLs e sinalização de exemplos.
- .npmrc bloqueia scripts de instalação. Vercel usa npm ci explicitamente.
- tests/dependencies.test.mjs verifica origem/integridade do lock e Argon2.
- Workflow independente audita vulnerabilidades/assinaturas a cada PR/push e
  semanalmente. Dependabot abre PRs npm/Actions, sem integração automática.
- Documentação operacional em docs/SEGURANCA-DEPENDENCIAS.md.

## Verificações locais

- npm audit: zero vulnerabilidades conhecidas; npm audit signatures: invalid[]
  e missing[] vazios na auditoria inicial.
- Instalação limpa isolada em .test-artifacts/dependency-clean com npm ci
  --ignore-scripts:317pacotes instalados, zero vulnerabilidades. Teste do hash
  e lock nesse ambiente:2/2, sem arquivos do node_modules original alterados.
- npm test:99/99 aprovados. Lint e build aprovados, inclusive após a formatação.
- Node local24.20.0/npm11.19.0; CI/produção usam Node22. Validar em Linux na CI
  antes de integrar à main. Build e resultados remotos serão registrados abaixo.

## Google

- Usuário confirmou funcionamento exclusivamente online. Não é elegível para
  Perfil da Empresa segundo as regras de atendimento presencial; nenhum endereço
  ou atendimento fictício foi cadastrado.
- Domínio escoladodividendo.com.br adicionado ao Search Console. Usuário autorizou
  explicitamente TXT/posse; login Registro.br feito pelo próprio usuário.
- TXT salvo preservando os seis registros DNS anteriores; Google confirmou
  “Propriedade verificada” pelo provedor de domínio. Não remover o TXT.
- Evidência local: .test-artifacts/seo-dependencies/search-console-verified.png.
- Sitemap enviado e confirmado como “Processado”, com8páginas encontradas.
  Inspeção da home confirmou “O URL está no Google / A página está indexada”.
  Não foi consumida outra solicitação de indexação para uma página já indexada.
  Evidências locais sitemap-processed.png e home-indexed.png na mesma pasta.
- Perfil da Empresa não criado, conforme elegibilidade confirmada pelo usuário.

## GitHub e CI

- Grafo de dependências, Dependabot alerts/security updates e Malware alerts
  habilitados no painel. Secret Protection e Push protection já estavam ativos.
- Regra main salva e reaberta para conferência após confirmação de acesso feita
  pelo usuário: PR obrigatório, checks quality e dependency-security, branch
  atualizada, sem bypass de administradores, forcepush ou exclusão. Aprovação de
  outro revisor não é exigida enquanto houver apenas o mantenedor atual.
  Evidências locais main-protection.png e github-security-enabled.png.
- PR4: https://github.com/vitorrampazzi/Ediv-Finance/pull/4.
- Primeira CI Linux/Node22 de dependências39365806067:success, incluindo instalação
  sem scripts, audit, assinaturas e hashArgon2. A CI geral passou99unitários,
  lint/build e15cenáriosSQL, mas o cenário de limite falhou.
- Causa da falha: tests/fixture.mjs repetia qualquer429 RATE_LIMITED. O helper
  aguardava a janela e convertia a resposta esperada em sucesso. Agora preserva
 429 do middleware SQL (headerRateLimit) e permite desabilitar explicitamente
  o retry de admission no teste desse próprio limite. Limites de produção intactos.
- Regressão SQL local após ajuste:17/17; CI39366458841 também aprovou integração
  completa e a instalação/Linux. O browser antigo esperava o heading retirado
  “Notificações de pesquisas”; seletor atualizado para o título atual “Notificações”,
  preservando navegação para a publicação correta e leitura persistente.
- Nova execução remota obrigatória antes do merge; sem bypass da proteção.

## Entrega e operação

Os checks e o resultado de integração/publicação ficam registrados na PR4. A main
só recebe esta alteração quando as duas verificações estiverem aprovadas. O
domínio verificado, sitemap processado e alertas GitHub foram confirmados no painel.
Não houve migração, mudança de credencial nem escrita no banco real. Perfil da
Empresa permanece indisponível para operação exclusivamente online.

Depois da integração, conferir /llms.txt e /api/health no domínio oficial. Para
atualizações futuras, usar PRs: a proteção da main também se aplica ao proprietário.
