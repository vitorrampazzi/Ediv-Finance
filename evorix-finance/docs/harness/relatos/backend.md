# Backend e qualidade — diagnóstico inicial

Data: 17/10/2026. Sessão: `01a14ae9-7754-7ca3-b7f6-8c2188479df7`.
Coordenação: `01a14ae7-1df4-74c0-b1eb-9b1c97ad99a7`.

## Objetivo e escopo

Revisar API, permissões e a divergência de CSP; apresentar até três constatações
com evidência e próximos passos. Somente este relato foi criado pela sessão.
Nenhum código de produto, dependência, credencial ou banco foi alterado.

## Constatações

1. **A expectativa de CSP do teste não acompanha a integração Turnstile.**
   `tests/site.test.mjs:49` exige o trecho literal `script-src 'self';`.
   `vercel.json:82` e `server/app.js:55` permitem também
   `https://challenges.cloudflare.com`; esse domínio é usado pelo carregador
   `src/components/auth/RegistrationChallenge.tsx:36` e a verificação ocorre no
   servidor em `server/registration-challenge.js:29`. A falha por si só não
   demonstra uma vulnerabilidade. Próximo passo proposto: testar as diretivas
   como listas, exigir a allowlist exata de scripts e recusar origens adicionais,
   curingas, `unsafe-inline` e `unsafe-eval` na diretiva de scripts; manter
   verificações independentes de `frame-ancestors`, `object-src` e demais limites.
   Não remover a origem do Turnstile apenas para fazer o teste passar.

2. **Controles de autorização estão na API e há isolamento dos rascunhos no SQL.**
   `server/auth.js:284`–`319` consulta sessão válida, e-mail confirmado e conta não
   bloqueada antes de fornecer usuário autenticado. `server/permissions.js`
   rejeita papéis desconhecidos e contas bloqueadas. `server/admin.js:18` exige
   `users:read`; mudanças administrativas exigem `users:manage` em `:141`.
   `server/research-drafts.js:14` exige `rankings:write`; leitura por ID inclui
   `user_id` em `:76` e atualização inclui proprietário e versão em `:130`.
   `server/rankings.js:308`–`350` autentica, confere perfil e revalida acesso dentro
   da transação de publicação. `server/security-limits.js:213`–`234` rejeita origem
   ausente/inválida ou cross-site nas escritas. Esses pontos foram conferidos por
   leitura estática; não constituem aprovação completa da segurança.
   Próximo passo proposto: no ambiente QA, validar matriz HTTP 401/403 por perfil,
   leitura/edição cruzada de rascunhos, conflito 409 e revogação de acesso durante
   publicação. Reaproveitar testes existentes antes de adicionar novos.

3. **O ambiente atual impede usar a suíte completa como evidência de aprovação.**
   `package.json:39` pede Node 22.x; `node --version` retornou v24.20.0.
   A importação direta de `express` retornou `ERR_MODULE_NOT_FOUND`.
   `tests/unit.test.mjs:10` importa o módulo de planilhas, que importa Express
   (`server/spreadsheet.js:1`), portanto a ausência impede carregar esse arquivo
   inteiro de testes, inclusive casos de funções que não usam Express.
   A coordenação informou 16 testes passando e duas falhas na execução anterior
   de `npm test`: esse carregamento e a expectativa CSP. Não repeti a suíte inteira.
   Próximo passo proposto: provisionar Node 22 e dependências do lockfile em
   ambiente apropriado, então rodar suíte, lint e build. Avaliar separação dos
   testes puros por arquivo para reduzir o impacto de falhas de carregamento.

## Verificações executadas nesta sessão

- `node scripts/harness.mjs status`: leitura bem-sucedida; diretório igual ao do quadro.
- `claim backend docs/harness/relatos/backend.md` e `update backend trabalhando ...`:
  reserva e persistência funcionaram pelo CLI, sem edição manual do quadro.
- `node scripts/harness.mjs check`: passou, três papéis e reservas sem conflito.
- Verificação direta com `node --input-type=module -e ...`, importando apenas
  `node:assert/strict`, `node:fs` e `server/permissions.js`: **7 asserções passaram**.
  Foram conferidos a lista exata de `script-src`; USER sem publicação; ANALYST com
  publicação e sem administração; ADMIN bloqueado sem administração; papel
  `__proto__` sem permissões; middleware administrativo retornando 403 para USER.
- `node --test tests/session.test.mjs`: **7/7 passaram** (expiração, renovação,
  limite absoluto e rejeição de datas inválidas).
- `node --version`: v24.20.0. Importação de Express: indisponível neste checkout.
- Leituras por `rg` e `Get-Content` localizaram as evidências acima.
- Não executados: integração HTTP/SQL, navegador, produção, lint ou build.
  Não foram instaladas dependências nem iniciado servidor.

## Decisões e próximo passo

Preservar a política CSP e os controles atuais até revisão coordenada. Priorizar
alinhamento do teste CSP e preparação do ambiente; depois validar autorização
de ponta a ponta em QA. O quadro será marcado `revisao`, a reserva liberada e
a coordenação receberá uma única mensagem de entrega. Aguardar nova demanda.

## Rodada de logos — 17/10/2026

### Resultado e alcance

Implementado `CompanyLogo` reutilizável e decorativo ao lado do ticker/nome já
visível. Imagem com `object-fit: contain`, quadro fixo de 28/40/64 px, fundo branco
para preservar as marcas nos dois temas, lazy por padrão e eager no cabeçalho de
pesquisa. `onError` troca somente a imagem pelo ticker, sem alterar as dimensões.
Mudança de URL remonta o estado da imagem; não há efeito de busca por cartão.

As demos de empresas fictícias recebem `demo` explicitamente e não produzem
`img` nem requisição de logo. O fallback é texto do ticker, nunca uma marca criada.
Os nomes/tickers existentes continuam acessíveis; a imagem usa `alt=""` dentro
de um contêiner `aria-hidden` para evitar leitura duplicada.

Superfícies integradas:

- Home: `HomeMarketHighlights`, `RankingHighlights` e exemplos de `home/ResearchSample`.
- Mercado e resultados/busca: `MarketAssetList`, compartilhado pelas análises públicas e da conta.
- Ranking: linhas e prévia de importação em `IncomeRanking`.
- Pesquisa: identidade do cabeçalho e navegação anterior/próxima em `StockResearch`.
- Ferramentas: comparação de empresas/versões em `ResearchTools`, lista do editor
  em `ResearchEditor` e pendências por empresa em `PublicationReview`.
- Superfícies legadas de ativos preservadas: `Favoritos`, posições/transações de
  `Carteira`, posições de `Dashboard`, contribuições de `PortfolioPulse`, importação
  e eventos de `PortfolioExtras`, operações compartilhadas de `support/ConversationPanel`.
- Não foram colocadas imagens em opções de select, texto corrido ou rótulos de gráficos.

### Fontes e dados

- Fonte existente do produto: brapi. A [documentação de ações](https://brapi.dev/docs/acoes)
  contém `logourl: https://icons.brapi.dev/icons/PETR4.svg`; a
  [resposta pública PETR4](https://brapi.dev/api/quote/PETR4), consultada nesta
  rodada sem credenciais, confirmou esse mesmo campo/URL.
- `server/market.js` preserva `asset.logo` do catálogo e `item.logourl` de cotações
  como `logoUrl`. Tipos `MarketAsset` e `MarketQuote` receberam campo opcional para
  compatibilidade com caches e respostas antigas.
- `company-logo.mjs` e `company-logo.d.mts` centralizam resolução usada por API e UI.
  Para pesquisas sem dados de mercado, usa-se o endpoint de imagens desse mesmo
  provedor com o ticker exato. Não existe busca por domínio corporativo, chave
  enviada ao cliente nem consulta adicional de cotação por linha.
- Somente `https://icons.brapi.dev/icons/<TICKER>.svg` é aceito; origens arbitrárias,
  protocolos inseguros, credenciais, query/hash e logo de outro ticker não são
  propagados. A classe é preservada (PETR3/PETR4/units), incluindo ticker B3SA3.
- A cobertura depende do provedor; ausência/falha mantém identificação pelo ticker.
  A ferramenta web não abriu os SVG diretamente, portanto esta sessão não afirma
  validação visual ou disponibilidade de cada imagem remota.

### Teste CSP preexistente

`tests/site.test.mjs` agora compara a lista exata `script-src` com `'self'` e
`https://challenges.cloudflare.com` e verifica `object-src 'none'`. Mantidas as
demais verificações. Nenhuma CSP de aplicação/deployment foi afrouxada.

### Arquivos e validação

Além das integrações TSX acima: novos `src/components/CompanyLogo.tsx`,
`src/components/company-logo.css`, `company-logo.mjs`, `company-logo.d.mts` e
`tests/company-logo.test.mjs`; alterados `server/market.js`, `useMarketAssets.ts`,
`useMarketQuotes.ts` e `tests/site.test.mjs`. Este relato registra a entrega.
Não foram editados CSS existentes, arquivos de tema, PublicHome, DashboardLayout,
tailwind.config.js ou package.json. A coordenação cuida dos testes no script npm,
reconciliação da main remota e publicação.

Verificações reais desta rodada:

- Node 22.23.3: `--test tests/company-logo.test.mjs tests/site.test.mjs`: **7/7 passaram**.
  Inclui símbolos/classes, bloqueio de URLs, demo sem URL, fallback e CSP exata.
- Node 22.23.3: ESLint focado em todos os TSX/hooks alterados: **passou**.
- Node 22.23.3: `node_modules/typescript/bin/tsc -b`: **passou**.
- Node 22.23.3: `--check server/market.js`: **passou**.
- Validação SSR por Vite + ReactDOMServer: **passou** para URL real, largura/altura,
  lazy, `alt` vazio/decoração acessível e ausência de img nas demos/tickers inválidos.
- `node scripts/harness.mjs check`: **passou**, sem conflitos de reservas.
- Skill `vercel:react-best-practices` aplicada: hooks incondicionais, componente
  de imagem em nível de módulo, estado local de falha isolado por URL, sem fetch
  por instância, identidades estáveis nas listas, dimensões reservadas e nomes
  acessíveis preservados. Sem nova dependência ou alteração do contrato financeiro.
- Browser real, falha de imagem disparada em navegador e revisão visual móvel
  foram encaminhados à coordenação para validação integrada. Não executados nesta sessão.

### Entrega

Reservas liberadas e backend em `revisao`. Próximo passo da coordenação: validar
home/mercado/ranking/pesquisa nos dois temas e em 320 px, imagem quebrada convertendo
em ticker sem salto e demos sem requests; depois reconciliar/publicar conforme
autorização do usuário. Nenhum commit remoto ou deploy feito por esta sessão.

## Complemento: mercado fracionário — 17/10/2026

A coordenação observou MWET4F e FSRF11F na home publicada. A regra anterior de
símbolo aceitava apenas o ticker base, deixando empresas reais fracionárias sem
tentativa de carregar sua marca. `companySymbol` agora aceita um único `F`
terminal após o número da classe e o remove exclusivamente para localizar o
logo da mesma ação/unit: PETR4F → PETR4, TAEE11F → TAEE11. Não há troca de classe,
alteração dos tickers exibidos nem dos símbolos usados em preços/caches.
URLs fornecidas pela brapi são aceitas quando seguras e correspondentes ao base.
O fallback textual foi ampliado a sete caracteres para preservar FSRF11F inteiro.
Demos continuam sem URL; demais sufixos, caminhos e símbolos inválidos são rejeitados.

Arquivos: `company-logo.mjs` e `tests/company-logo.test.mjs`; sem alteração de
componentes ou API. Node22: **5/5 testes focados passaram**, incluindo fracionários
ON/PN/units, B3SA3F, MWET4F, FSRF11F, base seguro, preservação do ticker no fallback
e manutenção das rejeições/demos. `node --check company-logo.mjs` passou.

Tentativas sem credencial de consultar catálogo MWET e URLs MWET4/MWET4F não
conseguiram conexão pelas ferramentas web/fetch deste ambiente. Assim, a
disponibilidade específica do logo MWET4 não foi confirmada nesta sessão;
continua valendo fallback honesto se o provedor não possuir a imagem.
Coordenação fará validação remota e commit complementar; nada publicado por backend.
