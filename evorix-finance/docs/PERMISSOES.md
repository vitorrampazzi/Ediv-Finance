# Perfis e administração

| Recurso                                             | Usuário  | Analista                | Administrador           |
| --------------------------------------------------- | -------- | ----------------------- | ----------------------- |
| Ranking, aulas e assistente                         | Sim      | Sim                     | Sim                     |
| Carteira, favoritos e configurações                 | Próprios | Próprios                | Próprios                |
| Criar pesquisa, importar CSV/XLSX, publicar versões | Não      | Sim                     | Sim                     |
| Conversas                                           | Próprias | Atendimentos da equipe  | Atendimentos da equipe  |
| Consultar operações de outra pessoa                 | Não      | Autorização na conversa | Autorização na conversa |
| Listar contas, alterar perfis, bloquear/desbloquear | Não      | Não                     | Sim                     |
| Histórico de alterações de acesso                   | Não      | Não                     | Sim                     |

Novos cadastros recebem Usuário. O servidor consulta o perfil no banco em cada solicitação e confere novamente o acesso dentro da transação antes de publicar ou responder como equipe. O cadastro não permite escolher um perfil privilegiado.

## Configurar o primeiro Administrador

A migração 006 cria `user_access`, `admin_control` e `admin_audit_events`, sem alterar senhas nem remover registros existentes.

```powershell
npm run db:backup:aiven
npm run db:migrate:aiven
npm run access:preserve-team:aiven
npm run access:grant-admin:aiven -- EMAIL_DA_CONTA_CONFIRMADA
```

O comando usa as credenciais locais em `.env.aiven.runtime` e exige conta existente, ativa e confirmada. Quando já existe um Administrador ativo, os próximos acessos são concedidos pelo painel. Executá-lo novamente para a mesma conta já Administrador não altera o acesso.

Para MySQL local, aplique `npm run db:migrate` e execute `node --env-file=.env server/setup-access.js admin EMAIL_DA_CONTA_CONFIRMADA`.

`RANKING_ADMIN_EMAILS` é uma configuração antiga. O comando `legacy` importa uma única vez as contas confirmadas dessa lista como Analista, sem rebaixar perfis existentes. Execute-o com o ambiente que contém a lista usada anteriormente; `.env.aiven.runtime` pode ter uma lista diferente da Vercel. A variável não concede acessos automaticamente no servidor atualizado.

## Liberar o corretor

1. Ele cria a conta e confirma o e-mail.
2. Você entra como Administrador depois do deploy.
3. Abra **Administração** na barra lateral ou no menu da conta, inclusive no celular.
4. Busque o e-mail, escolha **Gerenciar acesso** e selecione **Analista**.
5. Revise e confirme. Ele entra novamente para usar **Publicar pesquisa** e **Atendimentos**.

O painel `/app/admin` mostra contagens reais, contas com filtros/paginação e histórico. Não mostra senhas, hashes, tokens ou acesso geral às carteiras. A pesquisa pode ser criada no editor temporário do ranking ou importada de planilha; ambas exigem validação e confirmação da prévia.

**Atendimentos** em `/app/atendimentos` e as rotas `/api/support/team` são exclusivos de Administradores e Analistas. Só esses perfis consultam a fila completa, respondem como equipe e alteram a situação do atendimento. `/app/conversas` e `/api/support` mostram apenas as próprias conversas, inclusive para contas da equipe. Usuários comuns podem abrir perguntas, acompanhar respostas e continuar suas conversas; não acessam conversas de outras pessoas nem enviam respostas identificadas como equipe. O servidor define a autoria e verifica o perfil novamente antes de gravar uma resposta. O compartilhamento de operações continua opcional e só o titular pode alterá-lo.

## Revogação e proteção

Alterar perfil ou bloqueio encerra todas as sessões da conta. Contas bloqueadas não iniciam novas sessões nem acessam rotas privadas. O perfil fica salvo e o bloqueio pode ser revertido.

Não é permitido mudar seu próprio perfil ou bloqueio no painel. Para excluir a conta do último Administrador, conceda esse perfil a outra conta confirmada antes. Atualizações concorrentes e exclusões usam um bloqueio transacional para manter um Administrador ativo.

O histórico registra identificadores, data, responsável e estados anterior/posterior. Nomes são consultados na conta atual, não copiados para os eventos. Na exclusão de uma conta, seus vínculos nos eventos ficam nulos. Backups criptografados incluem perfis e eventos; `admin_control` é recriado pelas migrações.

## Publicação

O banco pode ser preparado antes do deploy. O menu e as regras novas entram em vigor no site após publicar este código. Faça commit/push para o GitHub conectado à Vercel e entre novamente. Não é necessário configurar seu e-mail em variável de ambiente para obter o perfil já registrado no banco.
