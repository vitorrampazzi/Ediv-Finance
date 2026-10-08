# Central de ajuda da Ediv

A ajuda pública fica em `/suporte`. Na conta, use `/app/conversas`; a fila da
equipe permanece em `/app/atendimentos`, restrita a Administrador e Analista.

## Experiência

- Cinco temas: pesquisas, dividendos, conta, problemas técnicos e sugestões.
- Quinze respostas pesquisáveis, com cinco perguntas principais inicialmente.
- Atalhos para ranking, análises, aulas, glossário e gestão da própria conta.
- Formulário guiado por tema, assunto e mensagem.
- Busca de conversas por assunto (e aluno, na equipe), filtros de situação,
  última atualização e separação visual de mensagens do aluno e da equipe.
- Ao selecionar um atendimento no celular, o foco vai para a conversa.
- Rascunhos das respostas são mantidos por conversa enquanto a página estiver
  aberta. Não são persistidos no navegador nem enviados antes da confirmação.
- Falhas ao carregar têm opção de nova tentativa; um envio confirmado permanece
  confirmado mesmo se a atualização da lista falhar depois.

## Conteúdo e atendimento

`src/lib/supportHelp.ts` concentra os temas e respostas. Horários, e-mail e
identificação profissional continuam vindo de `/api/support/information`.
Campos não configurados não geram informações fictícias. Nenhum telefone,
WhatsApp, prazo garantido ou disponibilidade humana imediata foi criado.

As categorias de novas perguntas são incluídas como `[Título do tema]` no assunto
existente e identificadas pela interface. Conversas antigas continuam legíveis.
O limite total do assunto permanece em 160 caracteres. A lista atual considera
as 100 conversas mais recentes retornadas pela API; os filtros são locais.

## Acesso e dados

Não há migração de banco ou alteração nas permissões da API. As mensagens do
aluno continuam privadas para ele e a equipe autorizada. Perguntas novas não
compartilham registros de carteira. O titular ainda pode revogar autorizações
de registros antigos. Respostas rápidas não dependem da IA.
