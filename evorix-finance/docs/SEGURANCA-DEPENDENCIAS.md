# Dependências e publicação

## Proteções do projeto

- O package-lock.json define versões e hashes de integridade. CI e Vercel usam
  npm ci; alterações de dependências devem incluir o lockfile revisado.
- .npmrc usa ignore-scripts=true. Instalar dependências não executa seus hooks
  preinstall/install/postinstall. Os comandos explícitos npm run continuam
  disponíveis. Isso reduz execução durante a instalação; não impede código
  malicioso de executar quando uma biblioteca é importada pelo build ou servidor.
- Argon2 fornece binários pré-compilados para Windows e Linux x64. O teste
  test:dependencies verifica criação/validação de hash com essa instalação.
  Novas plataformas ou bibliotecas que precisem compilar exigem revisão; não
  remover o bloqueio de scripts globalmente para contornar uma falha.
- O workflow Segurança das dependências roda em PRs e pushes de main/QA e toda
  segunda às08h17 de Brasília (11h17UTC). Ele verifica vulnerabilidades altas e
  críticas, assinaturas/proveniência disponíveis e o teste nativo. Relatórios
  de severidades menores permanecem visíveis para análise.
- Dependabot verifica npm e GitHub Actions semanalmente, abrindo PRs. Atualizações
  minor/patch npm são agrupadas; majors ficam separadas. Não há merge automático.
- Actions existentes usam referências por SHA e tokens de leitura. Os workflows
  não recebem credenciais de produção. Instalações ainda precisam de acesso ao npm.

## Fluxo de atualização

1. Conferir origem, mantenedores, aviso de segurança e diff do pacote e lockfile,
   inclusive dependências indiretas e novos scripts de instalação.
2. Executar npm ci, npm audit, npm audit signatures, npm test, lint e build.
3. Aguardar CI SQL/browser/backup em MySQL descartável. Nunca validar uma nova
   biblioteca usando credenciais ou dados reais de produção.
4. Integrar a PR aprovada pelas verificações e acompanhar a publicação.

Uma assinatura confirma a associação do artefato ao registro/build declarado,
não ausência de malware. npm audit identifica avisos conhecidos; pode não detectar
um comprometimento recente. Não usar npm audit fix --force automaticamente.

## Evidências e operação externa

O relato docs/harness/relatos/seo-dependencias.md registra resultados locais,
CI, publicação e configurações efetivamente feitas no GitHub e Google.

Fontes:
- https://docs.npmjs.com/cli/v11/commands/npm-ci/
- https://docs.npmjs.com/cli/v11/commands/npm-audit/
- https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/dependabot-quickstart
