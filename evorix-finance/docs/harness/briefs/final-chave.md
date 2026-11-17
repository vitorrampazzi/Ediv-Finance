# Brief final — Chave: publicação da missão de UX e performance

Para: Chave (release e versionamento). Plano: `docs/harness/briefs/03-plano-final.md`, seção "Publicação — Chave". **Uma PR**, 15 commits separados por assunto, squash no merge. A Chave não tem papel no quadro do harness: **não rode** `claim`, `update` nem `release`.

> **Atualização do Orquestrador (17/11), vale sobre o texto abaixo:** o `gh` agora **está instalado e
> autenticado** na conta do dono (`gh version 2.103.3`; `gh auth status` mostra `vitorrampazzi`,
> escopos `repo` e `workflow`). Use o `gh` no lugar do Chrome:
> - abrir a PR: `gh pr create --base main --head vitorrampazzi/ux-performance-2026-11-16 --title "<título>" --body-file <arquivo no seu diretório temporário>`;
> - checks: `gh pr checks <n> --watch` (ou `gh pr checks <n>` repetido);
> - arquivos: `gh pr view <n> --json files --jq '.files | length'` e a lista;
> - merge: `gh pr merge <n> --squash` (só com "pode mergear"). Nunca `--admin`, `--merge` nem `--rebase`.
>
> O Chrome fica de reserva, só se o `gh` falhar. Tudo o mais continua: corpo da PR sem menção a IA,
> sem `Co-Authored-By`, sem "Generated with"; nunca imprima o token.

## Só comece com a autorização do dono

Este brief **não** autoriza nada sozinho. O dono autorizou a publicação completa em 17/11 ("faça tudo"), além da autorização permanente de commit, push e deploy que está na memória do projeto, mas **você só age com as frases do Orquestrador**, repassadas por ele:

- **"pode publicar"**: libera o passo 0, os commits, o push e a abertura da PR. Se a frase não vier na mensagem que despacha este brief, **não faça nada** (nem commit, nem push) e responda: `maestri ask "Orquestrador" "Brief final-chave recebido sem a frase 'pode publicar' do dono. Aguardando."`
- **"pode mergear"**: o Orquestrador a manda **depois dos checks verdes**. Sem ela, **não faça o "Squash and merge"**: termine no passo 7 e espere.

Pré-condições do seu papel (todas verdadeiras, senão pare e devolva): o Orquestrador confirmou que a entrega está aceita; o QA final (`docs/harness/relatos/qa-final-ux-performance-2026-11-17.md`) tem veredito **APTO**; a Lupa aprovou 2H e C3; o dono autorizou publicar. Leia a nota: `maestri note read "Contexto Escola"` (seções 5, ambientes e CI, e 10, segurança). Se a nota não for encontrada, **pare**. Nunca burle proteção de branch.

## Objetivo

Publicar, na branch `vitorrampazzi/ux-performance-2026-11-16`, os 15 commits abaixo, abrir uma PR para `main` pelo Chrome, acompanhar os checks, fazer squash (quando autorizado) e conferir a produção **só com GET** em páginas públicas.

## Contexto mínimo

- Raiz Git: `C:/Users/vitor/Evorix-finance`. O projeto Node fica em `evorix-finance/`. **Rode todos os comandos de Git na raiz Git** (os caminhos abaixo já começam com `evorix-finance/`). Remoto `origin` = `https://github.com/vitorrampazzi/Ediv-Finance.git`. Branch de trabalho: `vitorrampazzi/ux-performance-2026-11-16` (criada pela 1D, a partir de `origin/main` `5613939`, sem rastrear a `main`).
- **Fluxo de PR deste projeto (memória do dono):** o trabalho sai com o **nome do dono**: branches `vitorrampazzi/…`, **sem** `Co-Authored-By`, **sem** "Generated with", **sem** menção a Claude, Codex ou qualquer IA em commit, PR, doc ou comentário. **Não há `gh`** e o MCP do GitHub não conecta: a PR abre pelo **Chrome do dono**, com o **link de comparação** (`https://github.com/vitorrampazzi/Ediv-Finance/compare/main...vitorrampazzi/ux-performance-2026-11-16?expand=1&title=<título>&body=<descrição codificada>`), e o merge é **"Squash and merge"** (o histórico da `main` usa squash, ex.: "(#51)"). **Sem force push**, nunca. Status dos checks pela API pública do GitHub com `curl`.
- Os commits seguem o formato do repositório: português, `Verbo + o que muda`, uma linha (opcionalmente um parágrafo curto de contexto). O autor é o do Git local do dono (`git config user.name` deve imprimir `vitorrampazzi`; confirme que `user.email` está configurado e **não o escreva** em PR, relato ou mensagem).
- Os relatos de cada etapa (para conferir o que cada commit leva) estão em `evorix-finance/docs/harness/relatos/`: `interface-etapa2a-…`, `backend-etapa2d-…`, `backend-etapa2e-…`, `interface-etapa2f-…`, `interface-etapa2c-…`, `interface-etapa2b-…`, o relato da 2H e da C3 (nomes **a confirmar** na hora, esperados `interface-etapa2h-2026-11-17.md` e `interface-eixoc-c3-2026-11-17.md`), `interface-eixoc-c2-2026-11-17.md`.

## Nunca entram em commit (lista exata)

1. `evorix-finance/.gitignore` (mudança do dono).
2. `evorix-finance/docs/harness/state.json`.
3. `.gitignore` da raiz Git (`?? .gitignore`).
4. `.maestri/` (inteiro).
5. `docs/estrategia_escola_do_dividendo.pdf` (raiz).
6. Qualquer `.env*`, certificado, chave, backup ou vídeo.
7. `evorix-finance/.test-artifacts/`, `dist/`, `node_modules/` (já ignorados; se algum aparecer no `git status`, **não** adicione: pare e pergunte).

No fim, o `git status --short` deve mostrar **só** estes 5 itens: ` M evorix-finance/.gitignore`, ` M evorix-finance/docs/harness/state.json`, `?? .gitignore`, `?? .maestri/`, `?? docs/estrategia_escola_do_dividendo.pdf`.

## Regras de cada commit (valem para os 15)

1. `git status --short` **antes** (guarde a saída).
2. Adicione **só pelos caminhos da lista do commit**: `git add -- <caminho> <caminho> …`. **Nunca** `git add .`, `git add -A`, `git add -u`, `git commit -a` nem `git add -p` interativo. Exclusões entram com `git add -- <caminho>` (o arquivo já foi apagado do disco).
3. Confira o que está no stage: `git diff --cached --name-only` deve ser **exatamente** a lista do commit (mesmo número de arquivos). Se sobrar ou faltar um, `git restore --staged -- <caminho>` (só tira do stage, não mexe no disco) e corrija. Confira segredos: `git diff --cached | grep -n -i -E "BEGIN (RSA|PRIVATE)|ghp_|AKIA|password *=|secret *="` não pode achar nada.
4. `git commit -m "<assunto>"` (um único `-m`, ou um segundo `-m` para o parágrafo de contexto). **Sem** `--no-verify`, sem `--amend`, sem `Co-Authored-By`. Se um hook falhar, **pare** e relate.
5. `git status --short` **depois** e `git show --stat --format="%h %s" HEAD`. Compare com o "antes": só os arquivos do commit saíram da lista (o resto fica igual). Anote o hash.
6. Se algo não bater, **pare** (não desfaça com `reset`, não use `stash`) e avise o Orquestrador com as duas saídas de `status`.

### Arquivo com dois assuntos (decisão do Orquestrador, 17/11: não dividir por hunk)

Alguns arquivos têm alterações de mais de um assunto. **Não divida por hunk**: não use `git add -p`, `git apply --cached`, nem script que escolha trechos. O arquivo vai **inteiro** no commit do assunto **mais recente da ordem** (o de número maior), e a **mensagem desse commit termina com "inclui também <assunto>"** (por exemplo, `… inclui também 2A`). Com o squash no merge, a separação perfeita não compensa o risco de um erro de stage.

Arquivos com mais de um assunto, no estado de 17/11 (**confirme no passo 0**, porque a C3 e a 2H ainda mexem):

| Arquivo | Assuntos | Vai inteiro no commit |
|---|---|---|
| `evorix-finance/scripts/prerender.mjs` | 2A (padrão de CSS da home e guarda) e 2F (JSON do glossário) | **4 (2F)**, "inclui também 2A" |
| `evorix-finance/tests/seo.dist.mjs` | 2A (teste da folha com `.home-areas`) e 2F (teste do glossário) | **4 (2F)**, "inclui também 2A" |
| `evorix-finance/src/layouts/DashboardLayout.tsx` | 2A (`width`/`height` das duas `<img>`) e 2B (`min-h-10` → `min-h-11`) | **6 (2B)**, "inclui também 2A" |
| `evorix-finance/package.json` | 2D (linha 19, `scripts.test`), 2E (`autoprefixer` e `prettier`) e, se a C3 mexer, C3 (mesma linha 19) | **8 (C3)** se a C3 mexer nele, "inclui também 2D e 2E"; **senão 3 (2E)**, "inclui também 2D" |
| `evorix-finance/src/index.css` | 2B (tokens, `@source not`) e, se a 2H mexer, 2H (comentário dos tokens) | **7 (2H)** se a 2H mexer nele, "inclui também 2B"; **senão 6 (2B)** |

Consequências: o commit 1 (2A) **não leva** `scripts/prerender.mjs`, `tests/seo.dist.mjs` nem `DashboardLayout.tsx`; o commit 2 (2D) **não leva** `package.json`. Se, no passo 0, outro arquivo aparecer com dois assuntos (os relatos dizem quais), aplique a mesma regra e, se não tiver certeza do assunto, **pare e pergunte**.

## Passo 0 — refazer a lista com o `git status` do momento (obrigatório)

A C3 e a 2H ainda vão mudar arquivos. A tabela abaixo é do estado de 17/11 e **não vale cegamente**.

1. `git branch --show-current` deve imprimir `vitorrampazzi/ux-performance-2026-11-16`. Nunca commite na `main`. `git fetch origin` e `git rev-parse --short origin/main`: se **não** for `5613939`, **pare** (a `main` andou; não faça rebase, merge nem force) e relate `git log --oneline 5613939..origin/main`.
2. `git status --short` e `git diff --stat`: guarde a saída como "antes de tudo". Conte arquivos modificados, apagados e novos.
3. Reconcilie com a tabela: para cada caminho do `git status` que **não** aparece em nenhum commit abaixo (nem na lista de "nunca"), **pare e pergunte** ao Orquestrador a qual commit pertence. Para cada caminho da tabela que não está mais no `git status`, **pare e pergunte**. Não atribua por palpite.
4. Preencha os commits **7 (2H)** e **8 (C3)** com os arquivos que os relatos da 2H e da C3 listam como alterados (caminhos exatos, conferidos com o `git status`). Confira se a C3 e a 2H mexeram em `evorix-finance/package.json` e `evorix-finance/src/index.css` (ver a tabela de arquivos com dois assuntos) e decida o commit de cada um por ela.
5. `git config user.name` imprime `vitorrampazzi`; `git config user.email` não está vazio. `git log -1 --format="%an"` do HEAD atual bate com o nome do dono.
6. `git diff HEAD --stat` e a lista de novos (`git status --short | grep '^??'`) vão servir para a conferência final.

## Os 15 commits, em ordem

Mensagens sugeridas (ajuste o texto se precisar, mantendo o formato). Todos os caminhos começam com `evorix-finance/`.

| # | Assunto | Mensagem | Caminhos (estado de 17/11) |
|---|---|---|---|
| 1 | 2A | Tira o framer-motion da home, serve a logo em WebP e fixa o tamanho dos ícones | `public/ediv-logo-clean.webp`, `src/App.tsx`, `src/components/NavigationIntent.tsx`, `src/components/SiteChrome.tsx`, `src/components/auth/AuthShell.tsx`, `src/components/home/PublicHeroBrand.tsx`, `src/pages/Home.tsx`. **7 arquivos.** (`scripts/prerender.mjs`, `tests/seo.dist.mjs` e `src/layouts/DashboardLayout.tsx` vão nos commits 4 e 6.) |
| 2 | 2D | Guarda em cache de borda as informações de suporte | `server/support.js`, `tests/public-cache.test.mjs`. **2 arquivos.** (`package.json` vai no commit 3 ou 8.) |
| 3 | 2E | Remove autoprefixer e prettier, que nada usa | `package-lock.json` e, **se a C3 não mexer em `package.json`**, `package.json` inteiro (a mensagem termina com "inclui também 2D"). **1 ou 2 arquivos.** |
| 4 | 2F | Reserva o espaço da empresa e do glossário para evitar salto de layout. Inclui também 2A | `scripts/prerender.mjs` (inteiro), `tests/seo.dist.mjs` (inteiro), `src/pages/Glossario.tsx`, `src/pages/PublicStock.tsx`, `src/components/PublicCompanySkeleton.tsx` (novo), `src/components/PageContent.tsx`. **6 arquivos.** |
| 5 | 2C | Troca o texto de carregamento da home e dos destaques do ranking por skeletons | `src/components/RankingHighlights.tsx`, `src/components/home/ResearchSample.tsx`, `src/components/home/public-sections.css`. **3 arquivos.** |
| 6 | 2B | Dá nome às durações e easings, fecha o Tailwind para `docs/` e sobe o alvo de toque do menu. Inclui também 2A | `src/layouts/DashboardLayout.tsx` (inteiro), `src/components/learning-workspace.css`, `src/components/navigation-chrome.css` e `src/index.css` (**só se a 2H não mexer nele**; se mexer, vai no commit 7). **3 ou 4 arquivos.** |
| 7 | 2H | Ajusta o texto do rodapé e o comentário dos tokens (**preencher no passo 0**, a partir do relato da 2H) | texto do rodapé aprovado pelo dono, comentário dos tokens em `src/index.css`, e o que mais a 2H trouxer. Se a 2H mexer em `src/index.css`, ele vai **inteiro** aqui, e a mensagem termina com "inclui também 2B". |
| 8 | C3 | Unifica a apiRequest do cliente em um só lugar | `src/lib/api.ts`, `src/context/AuthProvider.tsx`, `tests/api-client.test.mjs` (novo) e, **se a C3 mexer em `package.json`** (linha de `scripts.test`), `package.json` inteiro, e a mensagem termina com "inclui também 2D e 2E". **Conferir no passo 0.** |
| 9 | C2a | Remove a interface antiga de Carteira, Painel e Favoritos | 10 apagados: `src/pages/Carteira.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Favoritos.tsx`, `src/components/PortfolioExtras.tsx`, `src/components/PortfolioPulse.tsx`, `src/hooks/usePortfolio.ts`, `src/hooks/useFavoritos.ts`, `src/hooks/useMarketQuotes.ts`, `src/lib/portfolio.ts`, `src/lib/portfolioInsights.ts`. |
| 10 | C2b | Remove o painel fundamentalista antigo | 3 apagados: `src/components/DividendDashboard.tsx`, `src/components/ComparativeDividendChart.tsx`, `src/components/fundamental-center.css`. |
| 11 | C2c | Remove componentes sem uso e as três imagens do modelo Vite | 12 apagados: `src/components/ScoreIndicator.tsx`, `src/components/AlgoInsight.tsx`, `src/data/mockData.ts`, `src/pages/Autenticacao.tsx`, `src/components/ResearchAvailability.tsx`, `src/hooks/useResearchStatus.ts`, `src/components/home/LearningTerms.tsx`, `src/lib/publicHomeTerms.ts`, `src/components/home/ReadingChecklist.tsx`, `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/react.svg`. |
| 12 | C2d | Remove o ramo sem uso da home da conta e o RankingPreview | `src/components/home/AccountHomeContent.tsx` (modificado: 1 import e 1 linha), `src/components/RankingPreview.tsx` (apagado). **2 arquivos.** |
| 13 | docs | Normaliza o fim de linha de CENTRAL-FUNDAMENTALISTA.md para LF | `docs/CENTRAL-FUNDAMENTALISTA.md`, **sem mudança de texto** (ver método abaixo). **1 arquivo.** |
| 14 | docs | Marca nos documentos o código retirado em 17/11/2026 | 7 documentos, **3 linhas acrescentadas e 0 removidas em cada** (`git diff --cached --numstat` mostra `3	0`): `docs/CENTRAL-FUNDAMENTALISTA.md`, `docs/DASHBOARD-DIVIDENDOS.md`, `docs/CARTEIRA-E-INSIGHTS.md`, `docs/HOME-PUBLICA.md`, `docs/IDENTIDADE-EDITORIAL.md`, `docs/REVISAO-VISUAL-ACOES.md`, `docs/EVOLUCAO-2026-11-13.md`. |
| 15 | missão | Acrescenta a ferramenta de medição, o documento da missão, os briefs e os relatos | `tests/perf-baseline.mjs`, `docs/UX-PERFORMANCE-2026-11-16.md`, `docs/harness/briefs/` (a pasta inteira, novo), e **todos** os relatos novos da missão em `docs/harness/relatos/` (arquivos `??`; pelo `git status --short`: hoje `backend-auditoria-dependencias-2026-11-17.md`, `backend-auditoria-performance-2026-11-16.md`, `backend-etapa2d-2026-11-16.md`, `backend-etapa2e-2026-11-17.md`, `interface-auditoria-ux-2026-11-16.md`, `interface-eixoc-c2-2026-11-17.md`, `interface-etapa2a-2026-11-16.md`, `interface-etapa2b-2026-11-16.md`, `interface-etapa2c-2026-11-16.md`, `interface-etapa2f-2026-11-16.md`, `qa-base-ux-performance-2026-11-16.md`, `qa-cls-2026-11-16.md`, `qa-etapa2a-2d-2026-11-16.md`, `qa-etapa2f-2026-11-17.md`, `revisao-eixo-c-diagnostico-2026-11-16.md`, `revisao-eixoc-c2-2026-11-17.md`, `revisao-etapa2b-2026-11-17.md`, `revisao-etapa2c-2026-11-17.md`, `revisao-etapa2e-2026-11-17.md`, `revisao-etapa2f-2026-11-17.md`, mais os relatos da 2H, da C3 e do QA final que existirem no passo 0). **Não** entra `docs/harness/state.json`. |

### Commit 13 — normalizar `CENTRAL-FUNDAMENTALISTA.md` para LF (método a confirmar com o Orquestrador)

O arquivo foi gravado no HEAD com fim de linha CRLF; hoje o `git diff` mostra 124 linhas somadas e 121 removidas (mudança de fim de linha misturada com as 3 linhas do commit 14). O repositório normaliza para LF (`.gitattributes` com `* text=auto`). Para o commit 13 virar só o fim de linha, **sem tocar o arquivo do disco**:

```
git show HEAD:evorix-finance/docs/CENTRAL-FUNDAMENTALISTA.md | sed 's/\r$//' > <temp>/central-lf.md
h=$(git hash-object -w <temp>/central-lf.md)
git update-index --cacheinfo 100644,$h,evorix-finance/docs/CENTRAL-FUNDAMENTALISTA.md
git diff --cached --name-only                         # só esse arquivo
git diff --cached --ignore-cr-at-eol --stat           # deve sair VAZIO (nenhuma mudança de texto)
```

Se o segundo comando mostrar qualquer linha, **pare**: tem mudança de texto. Simulado em 17/11 com um índice temporário (o índice real não foi tocado): o commit 13 mostrou `121	121` no `--numstat` e **vazio** com `--ignore-cr-at-eol`; o `git add` seguinte mostrou `3	0`. O aviso "CRLF will be replaced by LF" do Git é esperado, não é erro. Depois do commit 13, `git add -- evorix-finance/docs/CENTRAL-FUNDAMENTALISTA.md` (commit 14) deve mostrar `3	0` em `git diff --cached --numstat`. Se o Git recusar ou o número for outro, **pare e pergunte**; não improvise com `core.autocrlf` nem reescreva o arquivo.

## Passo a passo depois dos commits

1. **Conferência dos 15.** `git log --oneline origin/main..HEAD` mostra os 15 commits. Todos com o autor do dono: `git log origin/main..HEAD --format="%an" | sort -u` imprime só `vitorrampazzi`. Nenhuma mensagem com "Co-Authored-By", "Generated" ou nome de IA: `git log origin/main..HEAD --format="%B" | grep -i -E "co-authored|generated|claude|codex|anthropic|openai"` não acha nada.
2. **Integridade da árvore.** `git diff HEAD --name-only` mostra **só** `evorix-finance/.gitignore` e `evorix-finance/docs/harness/state.json`; `git status --short` mostra só os 5 itens da lista "nunca". Qualquer outra linha: **pare**.
3. **Push.** `git push -u origin vitorrampazzi/ux-performance-2026-11-16`. **Nunca** `--force` nem `--force-with-lease`; nunca para a `main`. Se for recusado, relate o erro exato e pare.
4. **PR pelo Chrome**, no link de comparação (título e descrição codificados na URL; se a descrição for longa, abra o link só com o título e cole o texto no campo). Título sugerido: `UX e performance: home mais leve, menos salto de layout, tokens de movimento e limpeza de código sem uso`. Descrição, em português, **sem linha de IA**: (a) o que mudou, em uma frase por commit (os 15); (b) o resultado do QA final **copiado** do relato (veredito, CLS antes e depois, JS da home antes e depois, contagens de teste): **não invente número**, copie do `qa-final-ux-performance-2026-11-17.md`; (c) "sem migração de banco, sem mudança de regra financeira, margem, cotação ou texto legal; o texto do rodapé foi aprovado pelo dono"; (d) "squash no merge; as exclusões (commits 9 a 12) podem ser revertidas a partir dos commits da PR".
5. **Checks.** Pela API pública: `curl -s https://api.github.com/repos/vitorrampazzi/Ediv-Finance/commits/<sha do HEAD>/check-runs` e `.../status`. Os obrigatórios são qualidade, segurança das dependências e Vercel. Espere terminarem (sem loop apertado: confira a cada minuto, no máximo 15 vezes). Se algum falhar: leia o log, relate a **causa exata** e devolva ao Orquestrador; não reexecute em loop, não desative check.
6. **Conferir os arquivos da PR** no Chrome (aba "Files changed"): o número de arquivos bate com `git diff --stat origin/main HEAD` e **nenhum** item da lista "nunca" aparece.
7. **Relate e peça o merge** (se a mensagem de despacho **não** trouxe "pode mergear"): `maestri ask "Orquestrador" "PR #<n> aberta: <link>. Checks: <estado>. Aguardando 'pode mergear'."`
8. **Merge** (só com "pode mergear", checks verdes): botão **"Squash and merge"** (o título do squash é o da PR). Nunca "Merge commit" nem "Rebase and merge".
9. **Produção** (ver a seção abaixo), depois do deploy da Vercel (projeto `prj_yGHHN3LNiYuXMaCtB7tPGruYC9tT`, time `team_gOVp2elP6vNGN6k2mqp5ir1g`).
10. **Relato final** ao Orquestrador (ver "Formato do relato").

## Conferência da produção depois do merge (só GET, só páginas públicas)

Espere o deploy (o status do commit da `main` na API do GitHub mostra a Vercel concluída). Depois, **somente** `curl` com GET em páginas e arquivos públicos, **sem login, sem formulário, sem POST, sem navegador que execute JavaScript** (um navegador dispararia analytics em produção; **não** rode `tests/perf-baseline.mjs` nem Playwright contra produção). Base: `https://escoladodividendo.com.br`.

```
for p in / /ranking /aprender /glossario /assessoria /privacidade /suporte /metodologia /entrar /cadastro /ranking/acao/TIMS3; do curl -s -o /dev/null -w "%{http_code} %{content_type} $p\n" "https://escoladodividendo.com.br$p"; done
curl -s "https://escoladodividendo.com.br/" | grep -c "Conteúdo educativo, sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados futuros não são garantidos."
curl -s "https://escoladodividendo.com.br/glossario" | grep -c 'id="ediv-glossario"'
curl -s "https://escoladodividendo.com.br/" | grep -c -i "tempo real\|com atraso"
curl -s -D - -o /dev/null "https://escoladodividendo.com.br/ediv-logo-clean.webp" | grep -i -E "^(HTTP|content-type)"
curl -s -D - -o /dev/null "https://escoladodividendo.com.br/api/support/information" | grep -i -E "^(HTTP|cache-control)"
curl -s -D - -o /dev/null "https://escoladodividendo.com.br/api/health" | grep -i -E "^HTTP"
```

Esperado: as 11 rotas com `200` e `text/html`; o texto do rodapé em `/` (1 ou mais); `id="ediv-glossario"` em `/glossario` (1); `tempo real|com atraso` em `/` = **0**; a logo WebP com `200` e `image/webp`; `/api/support/information` com `cache-control` contendo `s-maxage=3600`; `/api/health` com `200`. Contexto: a medição de base da 1C em produção já registrava **1 chamada `/api/...` com status ≥ 400** em todas as páginas (`qa-base-ux-performance-2026-11-16.md`, seção 5): se aparecer erro em `/api/rankings/public` ou parecido, compare com esse registro antes de chamar de regressão.

Se algo falhar: **não** reverta, não faça push de correção, não force nada. Relate o comando, o código HTTP e o texto ao Orquestrador. Uma reversão é outra PR e precisa de autorização do dono.

## Fora do escopo

- Qualquer alteração de código, de texto de documento, de mensagem de commit além do que a tabela manda. Corrigir erro encontrado no QA.
- Deploy manual, mudança na Vercel, migração, comando contra banco de produção, mudança de proteção de branch.
- Apagar branch, `git stash`, `reset`, `clean`, `checkout --`, `rebase`, `--amend`, `push --force`.
- Medir produção além dos `curl` acima.

## Critérios de aceite (observáveis)

- [ ] Passo 0 feito: a lista foi refeita com o `git status` do momento e **nenhum** caminho ficou sem commit atribuído (ou foi perguntado).
- [ ] 15 commits (um arquivo com dois assuntos foi inteiro no commit do assunto mais recente, com "inclui também <assunto>" na mensagem), na ordem da tabela, todos de `vitorrampazzi`, sem trailer de IA e sem a palavra Claude, Codex, Anthropic ou OpenAI.
- [ ] Em cada commit: `git status` antes e depois registrados, e o stage tinha **só** os arquivos do commit.
- [ ] `git diff HEAD --name-only` = só `evorix-finance/.gitignore` e `evorix-finance/docs/harness/state.json`; `git status --short` = os 5 itens da lista "nunca".
- [ ] Commit 13: `git diff --cached --ignore-cr-at-eol --stat` vazio; commit 14: 7 documentos com `3	0`.
- [ ] Push sem `--force`; PR aberta pelo Chrome com o link de comparação; checks obrigatórios com resultado registrado.
- [ ] Merge **só** se a mensagem de despacho trouxe "pode mergear", com "Squash and merge".
- [ ] Depois do merge: os `curl` da conferência com o resultado de cada um (esperado e obtido).

## Comandos de validação (na raiz Git `C:/Users/vitor/Evorix-finance`)

```
git branch --show-current
git status --short
git log --oneline origin/main..HEAD
git log origin/main..HEAD --format="%an" | sort -u
git diff HEAD --name-only
git diff --stat origin/main HEAD
```

## Formato do relato (na resposta, em português, até 15 linhas)

1. Branch, hash de `origin/main` no passo 0 e o resultado da reconciliação (arquivos sem commit atribuído, se houver).
2. Lista dos commits (`git log --oneline origin/main..HEAD`) e quais arquivos foram inteiros em outro commit ("inclui também …").
3. `git status --short` depois do último commit.
4. Número da PR, link, estado dos checks (qualidade, dependências, Vercel).
5. Merge: feito ou aguardando "pode mergear".
6. Conferência da produção: cada `curl`, esperado × obtido.
7. O que ficou pendente e o próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<o relato acima>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em commit, PR, log ou relato. Não abra `.env*`. Não escreva o e-mail do dono em lugar nenhum.
- Testes e conferências nunca usam o banco de produção. Em produção, **só GET** em páginas públicas.
- Não faça force push, reset destrutivo, `git clean`, `stash` nem qualquer operação que apague trabalho. Nunca commite na `main`.
- Não burle proteção de branch nem faça merge sem os checks verdes e a autorização.
- Não adicione linha de autoria de IA (commit, PR, documento, comentário).
