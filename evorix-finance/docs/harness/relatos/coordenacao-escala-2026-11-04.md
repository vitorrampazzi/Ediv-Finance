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
