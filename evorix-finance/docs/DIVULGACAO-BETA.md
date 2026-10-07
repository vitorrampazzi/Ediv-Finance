# Divulgação da Ediv Finance

## Endereços

- Produção, para visitantes: https://escoladodividendo.com.br/
- Endereço anterior, ainda funcional: https://evorix-finance.vercel.app/
- QA, para avaliação interna: https://ediv-finance-git-qa-vitors-projects-7b84bd52.vercel.app/

O domínio `escoladodividendo.com.br` está verificado na Vercel e no Resend. Consulte [o estado e os registros configurados](DOMINIO.md). O site publicado funciona sem o computador do desenvolvedor ligado.

**Configuração em 06/10/2026:** o domínio real foi verificado no Resend, e Production foi configurado com `Ediv Finance <naoresponda@escoladodividendo.com.br>` como remetente. O bloqueio conhecido do remetente `resend.dev` é retirado pelo novo deploy. Ainda é preciso conferir o fluxo real e a entrega dos e-mails antes da divulgação. QA mantém os cadastros de avaliação com links locais de confirmação.

Após verificar o domínio no Resend, atualize `MAIL_FROM` em Production e faça um deploy. A restrição conhecida sai automaticamente; ainda é necessário conferir a entrega real, o cadastro e a recuperação. A conexão SMTP não comprova entrega. Fonte: [Resend — limitações do domínio de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## O que foi preparado

- Home com chamada para conta gratuita, primeiros passos e perguntas frequentes.
- Identificação de versão beta e aviso do ranking demonstrativo para visitantes.
- Disponibilidade de pesquisa consultada no banco: publicar a primeira pesquisa retira o aviso de demonstração automaticamente.
- Empresas e previsões continuam protegidas pelo login. `/api/rankings/status` informa somente se há uma publicação.
- Metadados de título, descrição e logo para prévias de links. Cada rede controla seu cache de prévias.
- Cadastro com etapa de confirmação, orientações de caixa de entrada/spam, reenvio e retorno ao destino escolhido.
- Confirmação e recuperação de senha com HTML e alternativa em texto.
- Painel de preparação em **Minha conta → Administração**, exclusivo do Administrador. Mostra ambiente, link e pendências; verifica conexão SMTP sem enviar mensagens.
- IA exclusiva da QA; nenhuma cobrança ativada.

## Antes de divulgar para muita gente

### 1. Conferir um cadastro real

1. Abra produção em uma janela anônima.
2. Crie uma conta com um e-mail seu ao qual tenha acesso.
3. Confira se a confirmação chega e se o remetente é o esperado. Verifique spam também.
4. Abra o link e entre. Confira se retorna ao ranking ou à carteira escolhida no cadastro.
5. Saia e use **Esqueci minha senha**. Abra a mensagem, escolha uma senha nova e entre novamente.
6. Nas configurações, confira exportação e opções de controle da conta.

O diagnóstico SMTP não comprova que o remetente está autorizado, que o domínio foi verificado ou que a mensagem chegou. Essas etapas precisam ser concluídas no provedor e na caixa de entrada. Não considere a entrega concluída somente porque as variáveis existem ou o diagnóstico deu sucesso.

No Resend, o domínio do `MAIL_FROM` precisa estar autorizado para envio. O dono do domínio deve adicionar os registros DNS gerados pela própria conta Resend e conferir a verificação. O domínio de e-mail é independente do endereço Vercel do site.

### 2. Receber a pesquisa

- Baixe o modelo em `/modelos/ranking.csv` ou `/ediv-ranking-modelo.csv`.
- Uma linha por ativo; uma lista de campos não é uma publicação.
- Campos mínimos: `ticker`, `empresa`, `potencial_percentual`. Inclua prazo, tese, riscos, período, fontes e módulos de pesquisa sempre que disponíveis.
- Em **Ranking → preparar pesquisa**, importe, confira dados e autoria, revise a prévia e publique somente o material aprovado pelo corretor.
- O corretor cria uma conta e confirma o e-mail. Na Administração, atribua **Analista**: ele poderá publicar pesquisas e responder atendimentos. O Administrador também gerencia usuários.

Não foram criadas previsões reais nem credenciais profissionais fictícias.

### 3. Preencher os dados públicos

Na Vercel, configure em **Production** os dados que o responsável autorizar publicar:

| Variável                    | Conteúdo                                   |
| --------------------------- | ------------------------------------------ |
| `PROFESSIONAL_NAME`         | Nome profissional                          |
| `PROFESSIONAL_CATEGORY`     | Categoria de atuação                       |
| `PROFESSIONAL_REGISTRATION` | Registro correspondente                    |
| `SUPPORT_EMAIL`             | Contato público para suporte               |
| `SUPPORT_HOURS`             | Horário em que a equipe consegue responder |

Faça um novo deploy e confira `/suporte`. Preencher as variáveis não verifica a validade do registro: a equipe deve revisar os dados.

Finalize a identificação do responsável pela plataforma e a política de retenção e de backups descritas em `/privacidade`. Essas condições dependem do responsável e não foram inventadas pelo desenvolvimento.

### 4. Domínio próprio

1. Domínio confirmado: `escoladodividendo.com.br`; DNS administrado pelo Registro.br. Estado da configuração em [DOMINIO.md](DOMINIO.md).
2. Adicione o domínio ao projeto **ediv-finance** na Vercel.
3. O dono configura os registros que a Vercel mostrar, preservando os registros de e-mail existentes.
4. Após a validação, ajuste `APP_BASE_URL` e `APP_ORIGIN` para o HTTPS final em Production e faça novo deploy.
5. Atualize as URLs de compartilhamento em `index.html` e este guia.
6. Confira cadastro, confirmação, recuperação e os links divulgados.

## Texto para um convite inicial

> Conheça a versão beta da Ediv Finance, uma plataforma da Escola do Dividendo para aprender conceitos e acompanhar o mercado. A primeira aula e o glossário estão abertos, e a primeira pesquisa do ranking está em preparação. Explore: https://escoladodividendo.com.br/

Após publicar a pesquisa real, revise o trecho do ranking e as condições de acesso. Nenhum convite foi enviado ou publicado automaticamente.

## Acompanhar os primeiros acessos

Compare o número de contas com o de e-mails confirmados na Administração e acompanhe as conversas. Contas criadas não significam usuários ativos nem visitas. Se muitas ficarem pendentes, confira a entrega dos e-mails. Não foi instalado rastreamento publicitário ou analytics pago.

Comece com um grupo pequeno e amplie depois de conferir o acesso e publicar a pesquisa real.
