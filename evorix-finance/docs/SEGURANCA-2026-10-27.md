# Revisão de segurança — 27/10/2026

Escopo: código frontend, API Express, autenticação, autorização, acesso SQL,
processamento de arquivos e dependências da versão baseada na main `57f869a4`.
As verificações usam fixtures locais e a integração da CI com banco descartável.
Nenhum teste de ataque, conta sintética, migração ou escrita foi feito em produção.

## Achado corrigido

**P2 / moderado — limite de expansão XLSX contornável.** O importador comum
confiava no tamanho declarado pelo diretório central ZIP, enquanto o leitor de
Excel seguia os headers locais. Um usuário autenticado podia fornecer um arquivo
pequeno que expandia acima do teto, aumentando o consumo de CPU e memória.
Não foi demonstrada execução de código, acesso a dados alheios ou exfiltração.

`server/spreadsheet.js` agora verifica também a expansão real antes do leitor,
com `node:zlib` limitado a 5.000.000 bytes por entrada e 10.000.000 no total.
Os limites prévios, CSV, formatos aceitos e respostas de erro foram preservados.
O processamento permanece em memória, sem extração de arquivos no filesystem,
e não exige dependências novas.

O teste `tests/security-audit.test.mjs` reproduziu a aceitação indevida antes da
correção e passou depois. Cobre metadados centrais falsos, centrais e locais
falsos, orçamento agregado, XLSX normal comprimido e armazenado. Está incluído
no `npm test`. A integração existente acrescenta rejeição segura nas duas APIs
de importação e consulta com uma sequência SQL tratada como texto literal.

## Outros controles conferidos

- Consultas com dados do usuário parametrizadas; identificadores dinâmicos nas
  ferramentas administrativas delimitados por allowlist. MySQL com TLS e
  validação do certificado em produção, sem múltiplas instruções ou LOCAL_FILES.
- Sessão opaca com hash persistido, cookie HttpOnly/SameSite Strict/Secure em
  produção, verificação de e-mail, bloqueio e expiração. Senhas Argon2id; tokens
  aleatórios de uso único e consumo em transação. Permissões verificadas na API.
- Recursos privados vinculados ao usuário da sessão; permissões administrativas
  e editoriais revalidadas. Rankings completos e históricos exigem autenticação.
- Escritas exigem origem aprovada e rejeitam solicitações cross-site, formulários
  simples e conteúdos comprimidos. CSP, proteção de frames e no-store mantidos.
- Limites compartilhados para API, escritas, login e cadastro; filas e trabalho
  de senha limitados; falha do armazenamento de limites recusa a solicitação.
- Frontend sem sinks de HTML dinâmico ou eval; conteúdo renderizado como texto,
  destinos de autenticação locais e incorporações de vídeo com hosts aprovados.
  Analytics exclui URLs de conta, identificadores e parâmetros sensíveis.
- Nenhum token/chave conhecido encontrado pela varredura de padrões no código
  atual. Árvore publicada sem `.env` real, certificados ou backups. O ID público
  do GA4 e a chave pública do desafio não são credenciais de servidor.
- `npm audit` de produção e desenvolvimento: zero avisos conhecidos na consulta
  desta rodada; nenhuma atualização de dependência foi necessária.

## Evidências e limites

O backend executou 45 testes locais e 14 verificações dos middlewares reais com
solicitações sintéticas, sem consultas SQL. Build, lint, suíte completa e
integração HTTP/SQL são gates da publicação na CI; resultados finais ficam
associados ao commit do PR, sem flexibilizar os testes.

Não foi confirmado outro vetor explorável nas áreas inspecionadas, nem uma
credencial que exija rotação nesta rodada. Isso não é certificação de segurança:
não inclui varredura de todo o histórico Git, configuração interna dos provedores,
privilégios atuais do banco de produção, teste distribuído de carga ou pentest
externo. Esses limites não devem ser apresentados como verificações concluídas.
