# Correções pré-lançamento — Escola do Dividendo

Rodada iniciada em 18/10/2026, a partir da auditoria do MVP. Este documento
registra verificações reais; não substitui validação jurídica ou operação externa.

Dados reais do ranking e conteúdo definitivo dos cursos foram excluídos dos
bloqueadores por decisão do responsável. Os exemplos devem continuar identificados.

## Critérios e divisão

- Coordenação: revogação do Analytics com armazenamento indisponível, integração
  das alterações e validação completa antes da publicação autorizada na main.
- Interface: links de ajuda, progresso visitante, contraste e seção no retorno
  à pesquisa após autenticação.
- Backend: isolamento das camadas de rate limit nos testes, neutralização CSV
  e limpeza limitada de registros de autenticação expirados na Vercel.
- Sem testes, contas ou eventos artificiais no banco/Analytics de produção.

## Verificações em andamento

O teste de regressão do consentimento reproduziu três falhas antes da correção.
Depois dela, os 14 testes de Analytics passaram, incluindo revogação sem escrita,
foco repetido, escolha em memória, expiração e recusa recebida de outra aba.
Os 83 testes unitários existentes mais essas regressões passaram no primeiro
checkpoint. A contagem final e os gates completos serão registrados na entrega.

## Instalações locais

- Ponytail 5.3.2: plugin oficial instalado pelo gerenciador do Codex. Fonte:
  https://github.com/DietrichGebert/ponytail ; marketplace consultado no commit
  `09c434ab73ca43761c5d8b0c5d341926c2fba710`.
- `frontend-design` e `webapp-testing`: instaladas pelo instalador oficial de skills
  a partir de https://github.com/anthropics/skills , commit
  `dbd4588f9e1033efb41dad4bef2f7947c8993d44`.

São ferramentas locais de desenvolvimento; não entram no bundle do site. O
catálogo de skills do turno atual não muda retroativamente. Reiniciar o aplicativo
permite carregar o plugin; as skills estarão disponíveis em turnos seguintes.

## Pendências externas já identificadas

Identificação do responsável, contato de privacidade e documentos jurídicos seguem
adiados pelo usuário. Não foram inventados CNPJ, contato ou aceite contratual.
Entrega efetiva de e-mail/recuperação no provedor, execução recorrente de backup
fora da aplicação e alertas de produção precisam de comprovação operacional.
Uma restauração descartável na CI valida a ferramenta, não a rotina de produção.
