# Agentes do projeto

A rodada de 29/10/2026 substitui o grupo antigo por quatro papéis nativos:

- Orquestrador: sessão principal, papel `coordenacao`.
- Frontend Agent: subagente `frontend`, papel `interface`.
- Backend Agent: subagente `backend`, papel `backend`.
- QA Agent: subagente `qa`, papel `qa`.

Definições em `.codex/agents/` na raiz Git. Diretório operacional: `evorix-finance/`,
relativo à raiz Git; o quadro usa `workspace: "."` relativo ao aplicativo.
Os identificadores efêmeros são obtidos nas ferramentas nativas a cada execução;
não são necessários IDs de chats antigos ou caminhos absolutos de outro computador.

Validação real desta rodada: Orquestrador criou os três subagentes, enviou
instruções específicas e recebeu achados independentes. Frontend implementou;
backend auditou impacto/segredos; QA criou e executou as verificações registradas
nos relatos. Arquivos TOML configuram futuras sessões; não são processos ativos.

Referência: https://learn.chatgpt.com/docs/agent-configuration/subagents
