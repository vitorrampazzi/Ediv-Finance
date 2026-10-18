# Google Analytics da Escola do Dividendo

Configuração inicial em17/10/2026. Integração GA4 sem Google Tag Manager/container,
Google Ads ou dependência de biblioteca adicional. Os termos jurídicos próprios
da escola foram adiados por solicitação do responsável; este guia é técnico.

## Acesso e configuração

- [Abrir a propriedade](https://analytics.google.com/analytics/web/#/a412366989p559398730/reports/intelligenthome).
- Conta: Escola do Dividendo. Propriedade: Escola do Dividendo — Site.
- Site: https://escoladodividendo.com.br. Fluxo: Site Escola do Dividendo.
- ID de medição público: `G-M8REFJ819V`; não é senha nem chave secreta.
- Brasil, horário São Paulo, moeda real. Equipe1..10 informada pelo usuário.
- Objetivos: tráfego e engajamento/retenção. Métrica otimizada DESLIGADA,
  conforme autorização expressa; o site controla as visualizações de página.
- O responsável concluiu pessoalmente o aceite dos termos de serviço do Google.
- Não foram criados segredos do Measurement Protocol, usuários, integrações de
  anúncios ou cobranças. Não cole outras tags de Analytics no HTML em paralelo.

## O que olhar primeiro

1. Em **Página inicial**, confira usuários ativos, visualizações e eventos.
2. Em **Relatórios**, acompanhe quais páginas de estudo/pesquisa são mais vistas,
   visitantes novos/recorrentes e os dispositivos utilizados. Use períodos de
   pelo menos uma semana quando houver tráfego suficiente para comparar.
3. **Ver em tempo real** ajuda a observar visitas recentes que permitiram
   estatísticas. A ausência de visitas não prova erro: recusa, bloqueadores,
   ausência de tráfego e exclusão da equipe podem explicar o painel vazio.
4. O Google avisa que a coleta inicial pode levar até48h. Relatórios têm atraso;
   não espere que todos os cartões mudem imediatamente após a publicação.

O site envia `page_view` por mudança de rota conhecida, sem repetir mudanças
apenas de filtro/hash. O GA pode produzir seus eventos automáticos básicos de
sessão/engajamento. Não há medição automática de formulários, downloads, cliques
externos ou vídeos. Não tratamos uma submissão de cadastro como conta criada,
pois o cadastro tem resposta genérica e exige confirmar o e-mail.

## Consentimento e dados

Antes de permitir estatísticas, o Google não é carregado e não recebe eventos
desta integração. Os botões **Somente necessários** e **Permitir estatísticas**
têm destaque equivalente. Criar conta/entrar não equivale a consentimento.
É possível rever ou retirar a permissão em **Preferências de cookies**, nos
rodapés público, autenticado e de autenticação. A escolha versionada é guardada
por180dias neste navegador; se o salvamento falhar, vale apenas nesta sessão.

Depois de permitir, a ferramenta trata identificadores de cookies, informações
técnicas e páginas agregadas, podendo processar dados fora do Brasil. Não afirmar
que isso é anonimização completa. Ao retirar a permissão, o código bloqueia
novos envios e limpa cookies GA acessíveis; não exclui dados já enviados ao Google.

Campos enviados são restritos a rotas e títulos estáticos. Query, fragmentos,
nomes, e-mails, senhas, User-ID, dados de conta, conversas, buscas e tokens não
entram nos eventos. Detalhes de empresas usam a rota agregada `acao/empresa`,
sem o ticker. Origens conhecidas de pesquisa/redes sociais podem ser usadas
como referência, só com protocolo/domínio: sem caminho, consulta ou fragmento.
Campanhas UTM, identificadores de anúncio e referências desconhecidas são
descartados; esta versão não oferece atribuição detalhada de campanhas.

Rotas de login/cadastro/confirmação/recuperação, perfil, configurações, suporte,
administração, as antigas /mercado e /app/analises e rotas desconhecidas não são medidas. Localhost, previews,
QA e contas ADMIN/ANALYST não enviam dados, mesmo com permissão local.
Os consentimentos `ad_storage`, `ad_user_data` e `ad_personalization` ficam
negados; Google Signals e personalização de anúncios são desabilitados no código.

## Manutenção e validação

- ID padrão em `analytics-policy.mjs`; pode ser substituído no build por
  `VITE_GA4_MEASUREMENT_ID`. Valor vazio desativa a integração.
- Não alterar a métrica otimizada para ON sem revisar privacidade e contagem SPA.
- Testes: `npm test`; build e lint seguem os comandos usuais.
- Testes puros usam fila/tag falsas para verificar consentimento, recusa,
  revogação, rotas, campos enviados, expiração e proteção de origens.
- Preview local permite testar o painel de preferências sem poluir a propriedade.
- Não foram gerados eventos artificiais na propriedade de produção para testes.
  Confirmar chegada real no painel após primeiras visitas consentidas.

## Referências oficiais

- [Consent Mode básico](https://developers.google.com/tag-platform/security/concepts/consent-mode).
- [Medição em aplicações SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications).
- [Controles de privacidade da tag](https://developers.google.com/tag-platform/security/guides/privacy).
- [CSP para Analytics sem anúncios](https://developers.google.com/tag-platform/security/guides/csp).
- [Guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais).
