# QA: login e confirmação de e-mail (05/11/2026)

## Objetivo
Pedido do usuário: verificar a confiabilidade do login e da confirmação de e-mail.
Seguindo o AGENTS.md, não usei produção como ambiente de teste.

## Ambiente
- Produção (`escoladodividendo.com.br`, `*.vercel.app`): **não executado**. A política de rede
  desta sessão recusou a conexão (proxy 403), então nem o smoke test somente leitura
  (`npm run test:production`) conseguiu rodar.
- Local: API real, MySQL 8.4 descartável em Docker (mesmas variáveis da CI) e Chromium.
  Não usei SMTP: o link de confirmação vem pelo modo de desenvolvimento da fixture.

## Verificações
| Comando | Resultado |
|---|---|
| `npm test` | 138/138 |
| `node tests/integration.test.mjs` | 19/19 (inclui cadastro exige confirmação, recuperação de senha e bloqueio revogando sessões) |
| `node tests/session.integration.mjs` | 7/7 |
| `node tests/session.browser.mjs` | 7/7, sem erro JavaScript |
| `node tests/auth-qa.integration.mjs` (novo) | 15 cenários aprovados |

Cenários novos em `tests/auth-qa.integration.mjs`:
1. Conta pendente: com a senha certa, o login avisa `EMAIL_NOT_VERIFIED`. Com a senha errada, a resposta é idêntica à de um e-mail inexistente, sem revelar a conta.
2. O reenvio invalida o link anterior, e o link novo confirma a conta.
3. O reenvio responde igual para e-mail já confirmado e para e-mail inexistente.
4. Link expirado é recusado e a conta continua pendente.
5. Tokens malformados (vazio, 5 mil caracteres, SQL, número, objeto, lista) retornam 400, nunca 500.
6. Cinco aberturas simultâneas do mesmo link geram exatamente uma confirmação.
7. Cadastro repetido de e-mail existente não revela a conta nem troca a senha.
8. Maiúsculas e espaços no e-mail apontam para a mesma conta, sem duplicar.
9. O cookie é HttpOnly e SameSite=Strict, e sair revoga o cookie antigo.
10. Login vindo de outra origem (CSRF) retorna 403.
11. Força bruta: o 429 aparece na 9ª tentativa, e a senha correta também espera o bloqueio.
12. JSON quebrado, senha de 100 mil caracteres e tipos errados retornam 4xx, não derrubam a API.
13. O limite da confirmação não bloqueia o reenvio (contadores separados).
14. Confirmar o e-mail não cria sessão sozinho.
15. O link usa o domínio configurado e descarta `next` externo (`https://evil.test`).

## Achado
**Média (UX), interface:** o botão “Reenviar confirmação” aparece liberado logo depois do
cadastro, mas o servidor aceita só 1 e-mail por endereço por minuto (`emailCooldown`,
compartilhado por cadastro, reenvio e recuperação). Quem clica nesse primeiro minuto recebe
429 com a mensagem genérica “Limite temporário atingido. Aguarde antes de tentar novamente.”,
sem contagem regressiva.
- Evidência: o cenário 2 registra `429 · RateLimit: limit=1, remaining=0, reset=60`.
- Código: `src/components/auth/ConfirmationHelp.tsx` inicia `remaining` em 0, e a contagem
  só começa depois de um reenvio bem-sucedido. O 429 não lê o cabeçalho `RateLimit`.
- Sugestão para a interface: começar a contagem em 60 s quando o componente abre depois
  do cadastro e, num 429, usar `reset` do cabeçalho para mostrar “Reenviar em Ns”.
- QA não corrige código. Aguarda decisão da coordenação.

## Limites
- Entrega real de e-mail (SMTP/domínio) e o comportamento em produção não foram verificados.
- `tests/auth-qa.integration.mjs` ainda não está em `npm run test:integration`
  (o `package.json` é da coordenação).

## Próximo passo
- Liberar a rede da sessão para `escoladodividendo.com.br` e rodar `npm run test:production` (somente leitura).
- Coordenação: decidir a correção do botão de reenvio e incluir o teste novo na CI.
