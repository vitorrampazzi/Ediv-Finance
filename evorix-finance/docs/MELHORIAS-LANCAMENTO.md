# Preparação técnica e divulgação

## Entregas técnicas

- Cabeçalhos no frontend: CSP sem scripts inline/eval, bloqueio de frames,
  Referrer-Policy, nosniff e Permissions-Policy. CSS inline é permitido porque
  gráficos e animações usam estilos calculados; imagens HTTPS externas continuam
  permitidas para os logos dos ativos. Não há mudança nas permissões da API.
- HTML estático das oito páginas públicas, gerado a partir dos componentes React.
  Nenhuma conta, sessão, cotação ou pesquisa privada é consultada no build.
  JavaScript atualiza o conteúdo depois de carregar; cotações não são gravadas no HTML.
- Títulos/descrições por rota, canonical, sitemap e imagem de compartilhamento
  1200 × 630. QA, contas, área autenticada e páginas desconhecidas usam noindex.
- Removida a reescrita geral para index.html. Endereços públicos desconhecidos
  recebem 404 da hospedagem; as rotas da área /app continuam sob autenticação.
- Home com hierarquia mais clara, apresentação editorial e exemplo do formato
  de pesquisa. Não mostra tickers, valores ou projeções reais sem login.
- Glossário público próprio e autenticação dividida por etapa. A lógica de
  carteira e carregamento de publicações foi extraída para hooks específicos.
- CI em pushes e PRs main/QA: lint, TypeScript/build, testes unitários, integração,
  navegador e backup. O MySQL é criado e destruído no runner. Nenhum segredo
  Aiven, SMTP, IA ou de produção é fornecido ao workflow.

## Compartilhar o código

Depois de fazer commit, execute `npm run export:source`. O ZIP fica em
`.test-artifacts/ediv-source.zip` e representa o último commit, não alterações
locais ainda sem commit. Nunca compacte a pasta inteira pelo Explorador.
O comando recusa arquivos privados versionados e o Git Archive inclui apenas
arquivos do repositório. Confira o conteúdo antes de enviar. Os exemplos .env
contêm apenas placeholders; arquivos .env reais e backups não entram.

O usuário pediu para manter as credenciais atuais. Nenhum segredo foi substituído.
Se um ZIP anterior continha senhas/chaves reais, a exportação segura não revoga
as cópias já enviadas. Uma futura substituição precisa atualizar local e Vercel,
validar conexões e preservar/recriptografar os backups antes de descartar chaves.

## Informações que a equipe precisa fornecer

Não preencher com exemplos fictícios na produção:

| Informação | Onde será usada |
| --- | --- |
| Nome, categoria e registro profissional | PROFESSIONAL_NAME, PROFESSIONAL_CATEGORY, PROFESSIONAL_REGISTRATION |
| Contato público e horário de resposta | SUPPORT_EMAIL, SUPPORT_HOURS |
| Identificação do responsável pela plataforma e canal de privacidade | Política de privacidade |
| Prazos aprovados de retenção, backups e exclusão | Política e rotina operacional |
| Pesquisa real, fontes, data, horizonte, premissas e riscos | Importação e revisão do ranking |

Não publicar um "histórico de acerto" com versões ou valores ilustrativos.
Primeiro definir metodologia: preço/data inicial e final, dividendos, custos,
benchmark, mudanças de tese, amostra completa e fontes verificáveis.

## Analytics

O painel administrativo já informa contas criadas e confirmadas. Não há coleta
nova de visitas ou rastreamento de carteiras neste pacote. Analytics de navegação
precisa escolher a hospedagem/provedor, custos e política de privacidade antes
de enviar dados a terceiros. É opcional para abrir uma beta pequena.

## Verificação antes de divulgar

Concluir cadastro real → confirmação recebida → login em produção, além de
avaliar a experiência no celular. Recuperação já entregou e-mail ao usuário;
isso não substitui a conclusão do cadastro de uma conta nova. Conferir autoria
e pesquisa com o profissional antes de divulgar o ranking real.
