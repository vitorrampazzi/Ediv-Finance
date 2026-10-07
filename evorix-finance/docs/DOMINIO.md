# Domínio da Escola do Dividendo

## Destino e serviços

- Endereço principal: https://escoladodividendo.com.br/
- Endereço alternativo: https://www.escoladodividendo.com.br/
- Projeto de produção: `vitors-projects-7b84bd52/ediv-finance`, branch `main`.
- Hospedagem: Vercel; registro e DNS: Registro.br; envio transacional: Resend.
- QA continua no endereço interno já configurado, com banco próprio e IA experimental.

## Preparação em 06/10/2026

Os dois endereços estão verificados na Vercel; `www` redireciona permanentemente (308) à raiz. O Registro.br foi colocado no modo avançado; a zona estava vazia. Após a transição inicial, os seis registros abaixo foram salvos às 16:34 (Brasília), com autorização explícita de envio pelo Resend. A zona foi reaberta e os registros persistidos foram conferidos. O Resend confirmou DNS às 18:42 e domínio verificado às 18:51 (Brasília).

`APP_BASE_URL`, `APP_ORIGIN` e `MAIL_FROM` foram configurados somente em Production na Vercel com os valores abaixo. A entrega de e-mail e os fluxos da conta devem ser conferidos após o deploy; verificação de domínio não comprova entrega na caixa de entrada.

## Registros exigidos pelos provedores

Valores consultados para este projeto/domínio em 06/10/2026. Reconsulte Vercel e Resend antes de aplicar; os destinos podem mudar. No Registro.br, o nome vazio representa a raiz do domínio. Não é um redirecionamento HTTP.

| Tipo | Nome relativo | Dados |
| --- | --- | --- |
| A | raiz (vazio) | `216.198.79.1` |
| A | raiz (vazio) | `64.29.17.1` |
| CNAME | `www` | `9d54ee7b47e73f79.vercel-dns-017.com.` |
| TXT | `resend._domainkey` | Copie o valor completo de DKIM do painel Resend abaixo. |
| CNAME | `rsend` | `rsend-sae1.forge.rmta.net.` |
| CNAME | `send` | `send.forge.rmta.net.` |

Painel do domínio de envio: https://resend.com/domains/2c026564-0391-4471-bb16-0ea13a555d88

O TXT DKIM é uma chave **pública**, e não a chave privada da API. Copie o conteúdo completo pelo botão do Resend, sem os caracteres `[...]` de abreviação visual. Mantenha recebimento desativado: o envio de confirmação não cria uma caixa postal.

Mantenha os servidores DNS do Registro.br. Não remova registros existentes de outros serviços nem altere contatos ou titularidade.

## Após salvar e verificar os registros

1. Confira os dois endereços em Vercel → Settings → Domains, incluindo certificado HTTPS.
2. No Resend, solicite verificação e aguarde o domínio ficar verificado para envio.
3. Ajuste somente **Production** na Vercel:

   - `APP_BASE_URL`: `https://escoladodividendo.com.br`
   - `APP_ORIGIN`: `https://escoladodividendo.com.br,https://www.escoladodividendo.com.br,https://evorix-finance.vercel.app,https://ediv-finance-vitors-projects-7b84bd52.vercel.app,https://ediv-finance-git-main-vitors-projects-7b84bd52.vercel.app`
   - `MAIL_FROM`: `Ediv Finance <naoresponda@escoladodividendo.com.br>`

4. O arquivo `.env.domain.example` reúne essas três configurações públicas. Preserve `SMTP_URL` e as credenciais atuais. Não copie segredos de produção para QA.
5. Publique os metadados de `index.html` e faça um novo deploy de `main`.
6. Confira cadastro, confirmação e recuperação pelo domínio principal. SMTP autenticado não comprova entrega na caixa de entrada.

O endereço antigo de produção continua disponível: https://evorix-finance.vercel.app/. As novas mensagens usam o domínio principal nos links de confirmação e recuperação. O remetente não é uma caixa postal de suporte: recebimento continua desativado no Resend.
