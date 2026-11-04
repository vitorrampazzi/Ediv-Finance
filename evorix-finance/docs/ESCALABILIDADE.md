# Escalabilidade e operação

Atualizado em 4 de novembro de 2026.

## Arquitetura

- **Páginas públicas:** HTML pré-renderizado, servido pela CDN da Vercel (ponto gru1 para o Brasil).
- **API:** Express 5 numa função da Vercel (Fluid compute), região `sfo1` (`vercel.json`, `regions`), ao lado do banco.
- **Banco:** MySQL 8.4 no Aiven, DigitalOcean San Francisco. Cada instância da função abre até 3 conexões, com fila de 30 (`server/database.js`).
- **Região:** a função precisa ficar na mesma região do banco. Se o Aiven mudar o banco de lugar, ajuste `regions` (sfo → `sfo1`, nyc → `iad1`). Com a função em iad1 e o banco em sfo, cada consulta custava cerca de 70 ms de ida e volta.

## Trabalho do banco por chamada

| Chamada | Antes | Agora |
|---|---|---|
| Limite geral da API (240/min por IP) | 1 escrita + 1 leitura no MySQL | memória da instância |
| `GET /api/rankings` (logado) | JSON da publicação + histórico | 1 consulta de versão por índice; JSON e histórico só quando muda |
| `GET /api/auth/availability` | função a cada visita | CDN por 5 min |
| Escrita, login, cadastro e e-mail | contador no MySQL | contador no MySQL (sem mudança) |

O limite geral em memória vale por instância. Os limites que protegem contas e e-mail continuam compartilhados no MySQL, e a Vercel mantém sua própria proteção contra DDoS.

## Medição em produção antes da mudança (4/11/2026)

- `/api/health`: 0,41–0,45 s com a função aquecida; 2,8 s na primeira chamada.
- `/api/rankings/public` sem cache: 0,55–0,62 s.
- Página estática: 0,29 s até o primeiro byte.

## Teste de carga

O workflow **Teste de carga** (`.github/workflows/load-test.yml`) roda no GitHub Actions. Ele nunca usa o Aiven nem a produção.

1. Sobe um MySQL 8.4 descartável limitado a 1 CPU e 1 GB, como o plano grátis.
2. Cria 10 mil contas de teste, 2 mil sessões e 3 publicações com 90 empresas fictícias (`tests/load/seed.mjs`).
3. Inicia a API como 6 instâncias, com o mesmo pool da Vercel.
4. Roda o k6 (`tests/load/api.k6.js`) em 50, 100, 200, 400 e 800 pessoas simultâneas. Cada pessoa abre uma página a cada 3 a 7 segundos, e 70% estão logadas.
5. Compara três cenários: código antigo com o banco a 70 ms, código novo com o banco a 70 ms e código novo com o banco a 1 ms (função ao lado do banco).

Como rodar: GitHub → Actions → Teste de carga → Run workflow, ou um push numa branch `vitorrampazzi/escala-*`. O resultado aparece no resumo e nas anotações da execução.

Resultado de 4/11/2026 (MySQL com 1 CPU e 1 GB, 6 instâncias da API, p95 e erros):

| Pessoas simultâneas | Antes (banco a 70 ms) | Código novo, banco a 70 ms | Agora (função ao lado do banco) |
|---|---|---|---|
| 50 | 3,3 s / 0% | 1,4 s / 0% | 81 ms / 0% |
| 100 | 3,5 s / 2,4% | 1,6 s / 0,7% | 110 ms / 0% |
| 200 | 4,1 s / 22% | 1,9 s / 5,0% | 174 ms / 0,3% |
| 400 | 4,2 s / 63% | 2,5 s / 38,7% | 231 ms / 4,3% |
| 800 | 3,6 s / 83% | 2,2 s / 65,9% | 460 ms / 6,4% |

- A CPU do MySQL ficou em no máximo 34%. O banco não foi o limite.
- Os erros acima de 200 pessoas são respostas 503 "ocupado". Elas vêm do limite de 32 chamadas em andamento por instância. O teste usa 6 instâncias fixas; a Vercel abre mais instâncias sob carga, mas isso não foi medido aqui.
- Capacidade medida: até 200 pessoas usando o site ao mesmo tempo, com p95 abaixo de 1 s e erros abaixo de 1%. Para comparar: 10 mil contas cadastradas costumam gerar dezenas de pessoas simultâneas no pico, não milhares.
- 10 mil pessoas ao mesmo tempo não foram testadas e exigem mais instâncias, mais conexões e um banco maior.

## Monitoramento

- O workflow **Monitor do site** (`.github/workflows/monitor.yml`) roda a cada 20 minutos. Ele abre a home, `/ranking`, `/api/health` (que consulta o banco) e `/api/rankings/public`.
- Quando falha, o GitHub manda e-mail para quem configurou o agendamento.
- O GitHub pausa agendamentos depois de 60 dias sem commits no repositório. Para reativar: Actions → Monitor do site → Enable workflow.

## Rollback e recuperação

- **Deploy ruim:** Vercel → Deployments → no deploy anterior, Instant Rollback. Depois, `git revert` do squash e uma nova PR.
- **API com 503 "temporariamente indisponível" e `cause=ENOTFOUND` no log:** o banco está desligado. Ligue o serviço no console do Aiven.
- **Backups:** o Aiven guarda backups diários. Há também cópia lógica criptografada com `npm run db:backup:aiven` (exige `BACKUP_KEY`) e restauração com `npm run db:restore`.

## Limites conhecidos

- O plano grátis do Aiven pode ser desligado por inatividade, e o Aiven pode mudar a região ou a configuração dele a qualquer momento.
- A Vercel Hobby inclui 4 horas de CPU ativa por mês e 1 milhão de chamadas de função, e não permite uso comercial.
- O limite de 240 chamadas por minuto por IP pode atingir pessoas atrás do mesmo IP de operadora (CGNAT). Acompanhe a taxa de respostas 429.
