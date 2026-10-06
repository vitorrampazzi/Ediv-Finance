# Resultado dos testes — 6 de outubro de 2026

## Desenvolvimento concluído

- Rascunhos privados de pesquisas persistidos na conta, com proteção contra sobrescrita entre janelas.
- Comparação de publicações, preservando o histórico e mostrando os campos alterados.
- Comparação de duas empresas da mesma pesquisa.
- Explicações educativas dos indicadores e perguntas preparadas para o assistente.
- Notificações internas de publicações, destaque para mudanças nos favoritos e leitura persistida.
- Progresso das aulas salvo na conta e respostas validadas pelo servidor.

Detalhes, comandos e limitações dos recursos: [TESTES-E-MELHORIAS.md](TESTES-E-MELHORIAS.md).

## Execuções aprovadas

| Verificação                                     | Resultado                                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                      | 15 testes unitários aprovados                                                                                                                                       |
| `npm run test:integration:aiven`                | 15 cenários de integração aprovados; o Node contabiliza também o teste pai, totalizando 16                                                                          |
| `npm run test:browser:aiven`                    | 19 cenários aprovados, sem erros de JavaScript capturados nas páginas visitadas                                                                                     |
| `npm run test:backup:aiven`                     | Backup cifrado e restauração de contas, perfis, rascunhos, progresso e notificações aprovados; chave errada e destino preenchido recusados; sessões não restauradas |
| `npm run build`                                 | Compilação de produção aprovada                                                                                                                                     |
| `npm run lint`                                  | Aprovado                                                                                                                                                            |
| `node --check` em arquivos do servidor e testes | Aprovado                                                                                                                                                            |
| `git diff --check`                              | Aprovado                                                                                                                                                            |

Os testes de navegador cobrem páginas públicas e privadas em larguras de 360, 768 e 1366 px; cadastro/login com alternância de senha; bloqueio de Administração e Atendimentos para usuário comum; comparação de pesquisas; leitura de notificações; progresso entre sessões; pergunta privada e resposta da equipe; recuperação de rascunho com campo incompleto; prévia e publicação; alternativa educativa à falha da IA; persistência de favoritos; inclusão/correção/exclusão de investimento; alteração de perfil e auditoria pelo administrador no celular.

## Problemas corrigidos durante os testes

- A comparação podia fechar ao concluir o carregamento do ranking. Agora os controles são montados após o carregamento dos dados.
- O assistente podia fechar enquanto a identidade da sessão era resolvida. Agora aguarda essa identificação antes de aparecer.
- Consultas de versões com parâmetros em formato inesperado são rejeitadas, evitando erro interno.
- Perfis desconhecidos, inclusive nomes de propriedades do protótipo JavaScript, não recebem permissões.
- Históricos do assistente precisam começar com mensagem do usuário e respeitar a alternância de papéis.

## Banco real e publicação

Foi salvo backup criptografado do Aiven antes da alteração. A migração `007_research_workflow.sql` foi aplicada com sucesso, adicionando as quatro tabelas novas sem remover registros existentes. Outro backup foi salvo depois da migração.

Os testes funcionais usaram schemas temporários com contas e pesquisas fictícias; esses schemas foram removidos ao final das execuções. As senhas existentes não foram alteradas.

O código ainda precisa de commit e push ao repositório conectado à Vercel. Nenhum deploy foi realizado nesta rodada.

## Limites da evidência

API e MySQL foram executados de verdade em bancos isolados. brapi e Gemini foram simulados, incluindo sucesso, cotação ausente, falhas e limites de uso. A confirmação e recuperação de conta usaram links de desenvolvimento, com SMTP desativado.

Portanto, esta rodada não verifica entrega real de e-mail, disponibilidade dos provedores, qualidade das respostas do modelo real, configuração do ambiente de produção, testes de carga nem todos os aparelhos/navegadores. Os tamanhos verificados não garantem funcionamento em todas as telas.

Relatório automático e capturas locais ficam em `.test-artifacts`, ignorado pelo Git. Os testes não publicam pesquisas fictícias no banco real.
