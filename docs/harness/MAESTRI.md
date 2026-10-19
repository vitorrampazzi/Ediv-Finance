# Maestri — Escola do Dividendo

Configuração operacional de 19/10/2026. Reutilizar os quatro terminais existentes,
preservando históricos. Atuação sob demanda; nenhuma rotina permanente.

## Diretórios e fonte

- Workspace Git: `C:/Users/vitor/Evorix-finance`.
- Aplicação Node: `C:/Users/vitor/Evorix-finance/evorix-finance`.
- Fonte histórica lida: `C:/Users/vitor/.codex/worktrees/11a6/Evorix-finance/evorix-finance/docs/harness/MAESTRI.md`.

A fonte pertence ao projeto, mas seu procedimento pressupõe outro checkout,
AGENTS.md, papéis, relatos e scripts de harness ausentes neste workspace.
Seu quadro versão 2 foi consultado com `node scripts/harness.mjs status`:
quatro papéis, sem reservas. Isso não comprova que os chats antigos estejam
encerrados. Não transferir seus papéis nem alterar aquele worktree.

Não copiar state.json, scripts ou o conjunto histórico para este checkout:
quadros separados não compartilham reservas. As referências históricas a três
chats, conexão indisponível e commits/publicações não descrevem a sessão atual
nem autorizam ações. Este documento é a entrada operacional do Maestri aqui;
não exige carregar o histórico extenso do worktree.

## Equipe existente

| Nome exato no Maestri | Papel | Responsabilidade |
| --- | --- | --- |
| Orquestrador | coordenacao | Escopo, contratos, distribuição e integração autorizada |
| Frontend Agent | interface | Interfaces, UX/UI, acessibilidade e responsividade |
| Backend Agent | backend | APIs, banco, autenticação e regras de negócio |
| QA Agent | qa | Validação independente, testes e bugs; sem correções espontâneas |

Os quatro nomes e as três conexões foram confirmados por `maestri list`;
Orquestrador tem `maestro: true`. Shell permanece independente.
Papéis são instruídos por mensagem; não há presets de papel definidos.
Não usar role assign/edit/write, recruit/replace, dismiss ou reinício nesta etapa.

## Comunicação

Antes de mensagens, executar `maestri list` e usar os nomes retornados.
No PowerShell, usar `& $env:MAESTRI_CLI list` se maestri não estiver no PATH.
Se a variável também não estiver disponível, o executável validado nesta máquina
é `C:/Users/vitor/AppData/Local/Programs/Maestri/resources/cli/maestri.exe`;
invocá-lo com `&` e o caminho entre aspas, sem alterar PATH ou configuração global.
Se houver erro de transporte, executar `& $env:MAESTRI_CLI debug` primeiro.
O sandbox pode exigir aprovação para executar o CLI; não ampliar permissões globais.

Delegar com `maestri ask "Nome exato" "tarefa"`. Para respostas completas,
incluir: retorne com `maestri ask "Orquestrador" "resultado"` e não espere
uma nova confirmação. O Orquestrador coleta o retorno sem criar ciclos de ACK.
Após timeout, consultar `maestri check "Nome exato"`; não reenviar nem interromper.

## Economia de tokens e coordenação

- Simples: um agente, análise curta e verificação proporcional.
- Média: especialista correspondente; QA apenas quando trouxer validação adicional necessária.
- Complexa: Orquestrador distribui somente aos especialistas necessários;
  paralelizar apenas escopos independentes. QA valida a implementação integrada
  quando houver risco ou necessidade de revisão independente.
- Enviar objetivo, arquivos permitidos, dependências, aceitação, ambiente e formato
  de retorno. Fornecer só contexto relevante; reutilizar documentação, sem repetir chats.
- Antes de delegar, conferir a arquitetura nos arquivos relevantes e, quando útil,
  em `evorix-finance/docs/GUIA-DESENVOLVEDOR.md`.
- Orquestrador atribui um único responsável por caminho editável. Antes de editar,
  o agente confirma pasta absoluta, escopo e ausência de edição concorrente;
  conflitos ou contratos compartilhados voltam à coordenação. Sem quadro automático
  neste checkout: não presumir que reservas do worktree protegem estes arquivos.
- Ao entregar: resultado, arquivos, verificações reais, limitações e próximo passo.
  Não iniciar novas tarefas nem acionar outros agentes por iniciativa própria.
- Respostas curtas; logs extensos e leituras históricas apenas quando necessários.

## Limites

Sem criação, substituição, reinício ou remoção de agentes. Sem conexão do Shell.
Preservar mudanças existentes, históricos e configurações. Sem commits, pushes,
merge, deploy, migração, instalação, exclusão ou mudança global de Codex/modelos
como consequência da ativação. Não usar produção como ambiente de testes.
Mudança estrutural ou risco de perda exige autorização específica.

## Evidências desta ativação

- CLI list/debug: quatro agentes identificados, transporte HTTP 200.
- check: três terminais existentes acessíveis, apontando para a raiz principal.
- ask individual: três respostas recebidas; captura inicial limitada à tela final.
- Frontend Agent: retorno completo recebido por mensagem Maestri; confirmou nome,
  função, pasta principal, recebimento, regras adotadas e ausência de edições.
  Resolvida dificuldade de localizar o CLI com o caminho absoluto, sem mudar PATH.
- Backend Agent: retorno completo recebido por mensagem Maestri; confirmou nome,
  função, pasta principal, recebimento, regras adotadas e ausência de edições.
- QA Agent: retorno completo recebido por mensagem Maestri; confirmou nome,
  função, pasta principal, recebimento, regras adotadas e ausência de edições/testes.
  Revisou o protocolo e não encontrou conflitos nos limites solicitados.
- list/debug final: mesma topologia, três subagentes conectados e HTTP 200;
  nenhuma conexão do Shell adicionada. Comunicação de ida e volta testada,
  não apenas conferência visual. Equipe pronta para receber demandas sob demanda.
- Não há garantia automática de reservas neste checkout; o Orquestrador deve
  coordenar responsáveis e caminhos antes de autorizar qualquer edição paralela.
- Builds, instalações e testes da aplicação não executados nesta ativação.
