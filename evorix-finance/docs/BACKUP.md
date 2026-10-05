# Backup criptografado

O comando lê uma cópia consistente e cifra em memória com AES-256-GCM. Não grava dump aberto. Sessões, tokens e cache são excluídos.

A chave local foi criada em .env.backup sem exibição no terminal; este arquivo e a pasta .backups são ignorados pelo Git. Guarde a chave separadamente, em local protegido. Sem ela não há recuperação. Restrinja as permissões Windows da pasta à sua conta; mode 0600 não substitui uma ACL Windows.

Para criar uma chave em outro ambiente, execute uma vez:

```powershell
node --input-type=module -e "import {randomBytes} from 'node:crypto'; import {writeFileSync} from 'node:fs'; writeFileSync('.env.backup', 'BACKUP_KEY='+randomBytes(32).toString('hex'), {flag:'wx'});"
```

## Fazer backup

```powershell
npm run db:backup:aiven
```

Usa .env.aiven.runtime, o certificado existente e .env.backup. Salva em .backups. Copie o arquivo criptografado para armazenamento separado: uma cópia só no computador não protege contra a perda dele.

## Restaurar

Crie outro schema vazio e aplique as mesmas migrações. Prepare .env.restore com credenciais MYSQL_* e certificado desse destino. Não use o schema em produção.

```powershell
npm run db:restore -- .backups/NOME-DO-ARQUIVO.json.enc
```

A rotina autentica a cifra antes de inserir. Recusa um destino que contenha registros de aplicação, mantém as chaves estrangeiras e insere em transação. Não restaura sessões ou links de acesso.

Defina frequência, retenção e armazenamento das cópias. Automação e monitoramento externo não foram ativados. A restauração ainda precisa ser exercitada em ambiente isolado antes de depender desta rotina em produção.
