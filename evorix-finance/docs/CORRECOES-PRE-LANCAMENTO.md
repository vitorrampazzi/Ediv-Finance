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

O checkpoint integrado passou em 94 testes, lint e build com oito rotas públicas
pré-renderizadas. A primeira CI desta rodada (`39185256419`) passou também em
integração e sessões com MySQL8.4 descartável; o browser revelou cooldown de e-mail
compartilhado entre cenários. A correção reseta as camadas apenas entre casos e
preserva os testes que exigem respostas429 durante o caso. A execução completa
será repetida com esse isolamento e os cenários de progresso visitante.

Chrome local confirmou ajuda→`/app/config`→Conta e segurança, resposta sobre senha
com o mesmo destino, preferência de cookies recusada e link de login com query e
hash de DRE preservados. Ações de ajuda usam tokens semânticos nos dois temas.

## Correções técnicas

- Consentimento: falha ao salvar mantém a escolha durante a sessão, sem reviver
  um consentimento antigo ao recuperar foco; expiração e nova escolha continuam.
- Aula visitante: conclusão em memória, aviso de falha, nova tentativa de salvar
  e recuperação. Cabeçalho, cartão da trilha e exercício compartilham a situação.
  Progresso autenticado continua dependendo da confirmação da API.
- Ajuda: atalhos e respostas abrem a rota existente de conta; links de respostas,
  limpar busca e limpar filtros mantêm legibilidade no tema claro.
- Pesquisa: retorno da autenticação preserva o módulo solicitado no fragmento.
- Limites: fixture verifica o schema descartável e isola SQL, caches de bloqueio
  e rajadas. Limites40escritas/minuto,60requisições/10s e32ativas continuam ativos.
- CSV: expressões como `-1+2` recebem neutralização; números negativos completos
  como `-1.25` e `-1,25` preservam seu valor.
- Autenticação expirada: até100 sessões e100 confirmações por lote, no máximo uma
  tentativa/hora/instância, SQL indexado, singleflight e falha isolada da resposta.
  Não depende de timer após resposta na Vercel. Tokens de reset não são varridos
  sem índice de expiração; a rotina existente continua removendo-os por usuário.

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
