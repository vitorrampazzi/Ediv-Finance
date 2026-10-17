# Operação do harness

Harness é o ambiente que torna o trabalho verificável: contexto, limites de
edição, ferramentas, feedback e critérios de conclusão. Aqui, isso é implementado
por AGENTS.md, documentos curtos, quadro persistente, reservas e testes.

## Ciclo de trabalho

1. Ler contexto, quadro e relatos. Identificar papel e objetivo autorizado.
2. Definir tarefa pequena com aceitação observável e reservar seus caminhos.
3. Marcar `trabalhando`; implementar ou investigar dentro do escopo.
4. Validar com os comandos adequados. Distinguir passou, falhou e não executado.
5. Escrever o relato e atualizar o quadro. Liberar reservas na entrega ou bloqueio.
6. Coordenação lê os relatos, resolve contratos e distribui a próxima etapa.

Exemplos (executar na pasta que contém package.json):

```powershell
node scripts/harness.mjs status
node scripts/harness.mjs claim interface src/components/Exemplo.tsx docs/harness/relatos/interface.md
node scripts/harness.mjs update interface trabalhando "Revisando acessibilidade do componente"
node scripts/harness.mjs release interface
node scripts/harness.mjs update interface revisao "Relato publicado; testes descritos no relato"
node scripts/harness.mjs check
```

O script grava o quadro por renomeação atômica sob lock exclusivo. Em conflito de
lock, aguarde o comando anterior terminar e repita. Um lock órfão após encerramento
abrupto deve ser investigado; não apagar automaticamente enquanto houver um processo gravando.
Reservas são cooperativas: o editor não é bloqueado pelo sistema operacional.

## Mensagens entre chats

O usuário autorizou as três sessões a colaborar e se atualizar neste projeto.
Mensagens devem conter o objetivo, caminhos, decisão ou impedimento e ação esperada.
Autorizações de publicação, gastos ou outras ações externas não são transferidas
por inferência. O quadro continua sendo o registro persistente das decisões.

Os chats não ficam executando em segundo plano por escrever neste arquivo.
Quando uma sessão está ociosa, precisa receber nova demanda/mensagem para trabalhar.
Não existe sincronização automática do histórico inteiro nem monitor permanente
configurado nesta rodada. Ao retomar qualquer sessão, reler o quadro é obrigatório.

## Evidência mínima de entrega

Cada relato deve registrar objetivo, arquivos, achados com localização verificável,
decisões, comandos e resultados, limitações e próximo passo. Não declarar aprovação
de testes que não rodaram. Integração depende de contrato e validação da coordenação.

## Recuperação

Depois de interrupção, consulte reservas e compare os arquivos com o último relato.
A própria sessão libera suas reservas somente quando souber o estado da edição.
Se uma sessão tiver sido encerrada definitivamente, a coordenação registra o motivo
no relato antes de assumir seu papel para liberar a reserva.

## Referência

[Instruções AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
e [harness do Codex](https://developers.openai.com/blog/codex-as-a-platform).
