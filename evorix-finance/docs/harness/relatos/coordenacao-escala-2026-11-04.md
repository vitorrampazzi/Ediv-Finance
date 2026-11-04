# Coordenação — escala, segurança e medição (04/11/2026)

## Feito
- Banco: limite geral da API em memória por instância; ranking logado reaproveita a publicação mais recente; `/api/auth/availability` na CDN.
- Região: funções em `sfo1`, ao lado do banco no Aiven (DigitalOcean San Francisco).
- Segurança: limitadores com cabeçalhos draft-7 (sem hash do IP) e cópias da CDN sem contadores de limite.
- Operação: monitor a cada 20 min e teste de carga reproduzível (`tests/load`, workflow Teste de carga). Detalhes em `docs/ESCALABILIDADE.md`.

## Verificado
- `npm test` 132/132, lint, teste de resiliência com os cabeçalhos novos.
- Teste de carga no GitHub Actions (MySQL 1 CPU / 1 GB, 10 mil contas): com o banco a 70 ms, p95 caiu de 3,3 s para 1,4 s com 50 pessoas simultâneas, sem erros; CPU do MySQL ≤ 13%.

## Pendências e decisões do dono
- Turnstile para cadastro e recuperação; cotas de e-mail consumidas só no envio; tempo de resposta igual em cadastro/reenvio/recuperação; `/api/market` exigindo login (auditoria de segurança, severidade média).
- Plano pago do Aiven e Vercel Pro para uso comercial.

## Próximo passo
- Publicar a PR de analytics/SEO (`vitorrampazzi/analytics-seo-2026-11-04`) depois desta.

## Segunda entrega (PR de analytics, SEO e layout)
- GA4: eventos com lista fechada (`click_signup`, `click_login`, `click_stock_card`, `complete_signup`), `utm_*` da página de entrada e novas origens; nada de texto livre, ticker ou identificador.
- SEO: JSON-LD (Organization, WebSite, BreadcrumbList), sem `og:url` vazio, `trailingSlash: false`, CSP com `*.analytics.google.com`.
- Layout: `src/lib/lazyPage.ts` pré-carrega a página pré-renderizada antes do primeiro render (sem "Abrindo página…", que causava CLS 0,39–0,48); foco no título só depois da primeira página; cache `immutable` em `/assets`.
- Verificado: `npm test` 136/136, lint, build; suítes de navegador da home, ranking, página de ação e tema passando localmente.
- Teste de carga com a função ao lado do banco: até 200 pessoas simultâneas com p95 de 174 ms e 0,3% de erros; MySQL ≤ 34% de CPU.
