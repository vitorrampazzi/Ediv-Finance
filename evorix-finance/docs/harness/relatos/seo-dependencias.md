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
- npm test:99/99 aprovados. Lint aprovado antes da formatação final dos testes.
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
- Envio do sitemap e solicitação de indexação em andamento; indexação e posições
  não são garantidas por essas ações.

## Próximo passo

Concluir configuração GitHub, CI Linux, publicação, sitemap e validar os estados
externos. Não houve migração, mudança de credencial nem escrita no banco real.
