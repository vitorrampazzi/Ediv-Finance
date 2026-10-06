# Pesquisa, aprendizado e testes

Resultado da rodada executada: [RELATORIO-TESTES.md](RELATORIO-TESTES.md).

## Recursos novos

- **Rascunhos privados:** salve os ativos adicionados, metadados e campos ainda em edição no MySQL. Só o autor abre seus rascunhos. Revisões impedem sobrescrita silenciosa entre janelas. Salvar não publica; a prévia e a confirmação continuam obrigatórias.
- **Comparação de versões:** ativos adicionados/removidos e mudanças de posição, potencial, preço-alvo, prazo, tese, riscos e módulos. Preserva as publicações; não mede rentabilidade realizada.
- **Comparação de empresas:** duas empresas da mesma publicação aparecem lado a lado. A demonstração continua identificada como fictícia.
- **Explicações de indicadores:** potencial, preço-alvo, prazo e módulos possuem explicação educativa e atalho para o assistente. O atalho apenas prepara uma pergunta sobre o conceito; não envia dados da carteira nem dispara a IA automaticamente.
- **Notificações internas:** pesquisas publicadas desde o cadastro, com destaque para mudanças nos favoritos. Leitura individual persistida. Mostra as últimas 20, com contagem total e opção de marcar todas. Atualiza ao entrar na área e abrir/fechar o sino. Não envia e-mail ou push.
- **Aprendizado na conta:** respostas corretas são validadas no servidor e o progresso acompanha a conta em outros dispositivos. Visitantes guardam somente a primeira aula no navegador. O progresso local antigo não é atribuído automaticamente a uma conta.

## Publicar

```powershell
npm run db:backup:aiven
npm run db:migrate:aiven
```

A migração 007 cria tabelas sem remover registros existentes. Backup e exportação pessoal incluem os dados novos pertinentes. Nenhuma variável adicional de produção é necessária. Depois faça commit/push para o GitHub conectado à Vercel.

## Verificações repetíveis

```powershell
npm test
npm run test:integration:aiven
npm run test:backup:aiven
npm run build
npm run lint
```

O runner unitário é o nativo do Node. Integração e navegador usam as credenciais administrativas de `.env.aiven` para criar schemas `ediv_test_` seguidos de 12 caracteres hexadecimais e contas fictícias. Não aceitam o nome do banco de produção como destino e não alteram usuários/senhas MySQL. Precisam de acesso de rede e permissão para criar schemas.

As execuções normais e falhas tratadas fecham servidores e removem seus próprios schemas. Se o processo for encerrado à força, a limpeza pode não ocorrer: identifique a execução antes de qualquer remoção manual de `ediv_test_*`.

### Navegador

Usa Playwright instalado no projeto ou fornecido pelo ambiente:

```powershell
$env:EDIV_PLAYWRIGHT_PATH = 'CAMINHO_DO_PLAYWRIGHT/index.mjs'
npm run test:browser:aiven
```

O script inicia a API em porta livre e Vite em `127.0.0.1:4180`; a porta precisa estar livre. Tenta Chromium e depois Chrome local, em sessão isolada. Testa 360, 768 e 1366 px, login, senha, permissões, ranking, rascunhos, aulas, atendimento e alternativa à IA. Relatório e imagens ficam em `.test-artifacts`, ignorado pelo Git. Esses tamanhos não cobrem todos os aparelhos e navegadores.

`EDIV_API_PROXY_TARGET` configura somente o proxy do Vite para esses testes; o padrão de desenvolvimento continua `http://127.0.0.1:3001`.

### Serviços externos e limites da evidência

API e MySQL são reais, em bancos isolados. brapi e Gemini são simulados para reproduzir sucesso, ausência de cotação, falhas e quotas sem consumir serviços reais. SMTP fica desativado: confirmação/recuperação usam links de desenvolvimento para testar tokens e sessões. Isso não comprova entrega real de e-mails, qualidade de um modelo real ou configuração do deploy publicado na Vercel.

O teste de backup cifra dados fictícios com chave temporária, recusa destino preenchido e chave errada, restaura em schema novo e verifica contas, perfis, rascunhos, progresso, notificações e ausência de sessões. Arquivos de teste ficam em `.test-artifacts/backups`; a chave temporária não substitui `.env.backup`.

## Cobertura

- Decimais, taxas, cronologia, compra/venda, correção/exclusão, venda negativa, proventos, desdobramento e bonificação.
- Cadastro, confirmação, recuperação/troca de senha e revogação de sessões.
- Origem da solicitação, visitantes, perfis, contas bloqueadas, promoção de contas pendentes e último Administrador.
- Isolamento de carteira, conversas, rascunhos, progresso e notificações; compartilhamento opcional e revogável.
- Prévia sem publicação, arquivos inválidos/repetidos, versões e comparação.
- Persistência de rascunhos grandes e conflito entre revisões.
- IA: dados pessoais, histórico, tentativa adicional, indisponibilidade e limites de IP/conta/projeto.
- Navegação, responsividade, erros de JavaScript e backup/restauração protegida.
