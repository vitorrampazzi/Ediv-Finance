# Brief C1 — Lupa: diagnóstico de organização do código (Eixo C)

Para: Lupa (revisão de código). Só leitura. Roda em paralelo com a 2F do Pincel.

## Comece por aqui (antes de ler o código)

1. Leia a nota: `maestri note read "Contexto Escola"` (seções 3, 4 e 10).
2. **Leia inteiros** os dois arquivos da skill `zizi-skills:code-quality` e siga o procedimento deles. Não invente regra que não esteja lá.
   - `C:/Users/vitor/.claude/plugins/synced/e8a32b2e-8616-4d23-ba7a-3c77461c316a_cb34b0bb-9950-46ae-9789-1cfb8f5028c3/11922719-c2b0-4b58-9751-2dd37b3f91f9/skills/code-quality/SKILL.md` (382 linhas)
   - `C:/Users/vitor/.claude/plugins/synced/e8a32b2e-8616-4d23-ba7a-3c77461c316a_cb34b0bb-9950-46ae-9789-1cfb8f5028c3/11922719-c2b0-4b58-9751-2dd37b3f91f9/skills/code-quality/dead-code.md` (204 linhas)
3. **A Lupa não tem papel no quadro do harness.** Não rode `claim`, `update` nem `release`, e não edite `docs/harness/state.json`. Você só escreve o relato.
4. Registre o estado da árvore agora: `git status --short` (guarde a saída; o relato a cita, e você a repete no fim).

## Objetivo

Diagnosticar, com evidência, onde o código viola as três regras duras da skill (um arquivo, uma responsabilidade; legível por um júnior; mesmo ritmo para o mesmo tipo de trabalho) e quais arquivos são código morto provado, para o Orquestrador escolher fatias pequenas.

## Contexto mínimo

- Plano: `docs/harness/briefs/02-plano-eixo-c.md`, seção C1.
- Princípios da skill que valem aqui:
  - Componente com mais de ~200 linhas, ou outro arquivo com mais de ~300, precisa de justificativa ou de divisão.
  - Código morto só sai com prova de que todos os caminhos foram descartados (import, string, rota, build, teste, configuração); a exclusão é em commit separado. Na dúvida, **sinalizar, não apagar**.
  - Refatoração preserva comportamento. Cerca de 100 linhas por mudança é bom; cerca de 300 é aceitável; acima disso, dividir. Pergunta-chave: reduz complexidade ou só muda de lugar?
  - Reaproveitar o que existe antes de criar.
- **O Pincel está editando `src/` em paralelo** (entrega 2F): `src/pages/Glossario.tsx`, `src/pages/PublicStock.tsx`, `src/App.tsx`, `scripts/prerender.mjs` e o arquivo novo `src/components/PublicCompanySkeleton.tsx`. Pode haver mais arquivos em edição (2A já deixou alterações não commitadas). Você lê o **estado atual** da árvore. No relato, **marque qualquer arquivo que estava em edição** quando você o leu (ver passo 2).
- O que não está neste brief e não deve ser feito: ver "Fora do escopo".

## Pode ler / pode escrever

- Pode **ler** qualquer arquivo do projeto, exceto `.env*`.
- **Único arquivo que pode escrever:** `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`.

## Fora do escopo

- Editar qualquer arquivo além do relato. Apagar, mover ou renomear arquivo (mesmo os candidatos a código morto).
- Mudar regra financeira, margem, cotação, texto legal ou qualquer número exibido.
- Propor reescrita grande ou troca de biblioteca.
- `src/lib/indicatorDefinitions.ts` (arquivo de dados) e `src/components/EdivAssistant.tsx` (experimental, só na QA): ficam fora do item 1.
- Rodar `npm run build` (o Pincel e o Vigia dependem do `dist/`), `npm install`, ou instalar qualquer ferramenta.
- Rodar `scripts/post-review.sh` da skill ou postar qualquer revisão em PR. Esta tarefa não usa a parte "Posting a review to a PR" da skill.
- Medir ou abrir a produção.

## Passos

1. **Ritmo de trabalho da Lupa nesta tarefa.** Leia `SKILL.md` e `dead-code.md` inteiros (passo 2 do "Comece por aqui"). A etapa "Step 0" do `dead-code.md` (linha de base verde antes de apagar) vale para quem apagar; como você **não apaga**, registre no relato "linha de base: não executada, sem exclusão nesta etapa". Se quiser provar alguma coisa com `npm run lint`, `npm test` ou `npx tsc -p tsconfig.app.json --noEmit`, pode rodar, mas registre que a árvore estava em edição pelo Pincel.
2. **Marcação de arquivos em edição.** Rode `node scripts/harness.mjs status` (só leitura) e `git status --short` no início e no fim. Todo arquivo que apareça com alteração ou reserva do papel `interface` nesses momentos é marcado no relato como "em edição" em cada achado que o cite, com a data e hora em que o leu.
3. **Item 1: arquivos acima do limite.** Para cada arquivo da lista abaixo, meça as linhas atuais (`wc -l`) e entregue: quantas responsabilidades tem (com as linhas de cada uma, como `arquivo:linha-inicial..linha-final`); se a divisão **reduz complexidade ou só muda de lugar**; e o corte proposto (nomes dos arquivos novos).

   | Arquivo | Linhas em 16/11 |
   |---|---|
   | `src/components/stock-make/StockMake.tsx` | 1052 |
   | `src/pages/IncomeRanking.tsx` | 955 |
   | `src/pages/Aprender.tsx` | 950 |
   | `src/components/stock-make/Charts.tsx` | 916 |
   | `src/components/PortfolioExtras.tsx` | 631 |
   | `src/components/DividendDashboard.tsx` | 617 |
   | `src/components/ResearchEditor.tsx` | 613 |
   | `src/pages/StockResearch.tsx` | 603 |
   | `src/layouts/DashboardLayout.tsx` | 586 |
   | `src/pages/Admin.tsx` | 584 |
   | `src/pages/Configuracoes.tsx` | 579 |
   | `src/pages/Carteira.tsx` | 573 |
   | `src/lib/marketData.ts` | 572 |
   | `server/auth.js` | 926 |
   | `server/market/quote-service.js` | 633 |
   | `server/portfolio.js` | 595 |

   Se a contagem atual diferir da tabela, use a atual e diga a diferença.
4. **Item 2: duplicação real** (três ocorrências, ou duas que precisam andar juntas). Pendência conhecida: `src/components/DividendDashboard.tsx` tem textos de explicação próprios que deveriam vir de `src/lib/indicatorDefinitions.ts` (fonte única desde a PR #51). Confirme e diga o que muda (quais textos, de qual linha para qual chave). Cada outra duplicação que listar traz as ocorrências com `arquivo:linha`.
5. **Item 3: ritmo.** Hooks e telas que buscam dados com formas diferentes de carregamento, erro e vazio. Compare com o padrão mais comum do projeto (diga qual é e onde está) e liste os desvios com `arquivo:linha`.
6. **Item 4: candidatos a código morto, com a prova do `dead-code.md`.** Para cada candidato: onde procurou (busca em todo o projeto, incluindo `src/`, `server/`, `tests/`, `scripts/`, `public/`, `docs/`, `index.html`, `vercel.json`, `site-pages.mjs`, configurações de build, JSON-LD e e-mails), o que encontrou e o que descartou, e o veredito: **"morto com prova"**, **"vivo"** ou **"não provado (sinalizar)"**. Candidatos:
   - `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/react.svg`.
   - `public/ediv-logo.png`, `public/ediv-logo-transparent.png`. Atenção: arquivo em `public/` pode ser usado por URL externa, e-mail, JSON-LD ou rede social. Sem prova de que nada externo o usa, o veredito é "não provado (sinalizar)". Já há menção em `docs/LOGO.md`: leia.
   - O ramo não-membro de `src/components/home/AccountHomeContent.tsx:111` (`{member ? <MemberHomeBrand /> : <RankingPreview />}`): descubra se `member` pode ser falso hoje em algum chamador.
   - O "código antigo de cotações" que a nota "Contexto Escola" diz estar mantido "para contrato e testes" (veja `docs/COTACOES.md`, `server/market/`, `server/market.js`, `server/market-closes.js`, `tests/`): identifique quais arquivos e funções são esse código e o que os mantém vivos.
7. **Item 5: plano em fatias.** De 4 a 8 mudanças **pequenas e independentes**, em ordem de ganho. Cada uma traz: arquivos exatos; tamanho estimado (linhas); executor (Pincel para `src/`, Tijolo para `server/`); o teste que prova que o comportamento não mudou (nome do arquivo de teste existente, ou "teste novo necessário"); se é **exclusão** (commit próprio) ou **refatoração**; e se toca algum arquivo em edição pelo Pincel (conflito).
8. Repita `git status --short` e confira que só o relato foi acrescentado por você.

## Critérios de aceite (observáveis)

- [ ] O relato existe e tem as 6 seções numeradas abaixo.
- [ ] Item 1: as 16 linhas da tabela, cada uma com número de linhas atual, responsabilidades com linhas, veredito "reduz complexidade" ou "só muda de lugar", e corte proposto.
- [ ] Item 4: os 8 candidatos, cada um com "onde procurou", "o que descartou" e veredito (morto com prova, vivo, não provado).
- [ ] Item 5: de 4 a 8 fatias, cada uma com os 6 campos (arquivos, linhas, executor, teste, exclusão ou refatoração, conflito com arquivo em edição).
- [ ] Amostragem: 3 `arquivo:linha` citados no relato, abertos e conferidos.
- [ ] Nenhum arquivo alterado além do relato: a diferença entre o `git status --short` do início e o do fim é só o relato.

## Comandos de validação (em `evorix-finance/`)

```
node scripts/harness.mjs status
git status --short
wc -l src/components/stock-make/StockMake.tsx src/pages/IncomeRanking.tsx src/pages/Aprender.tsx src/components/stock-make/Charts.tsx src/components/PortfolioExtras.tsx src/components/DividendDashboard.tsx src/components/ResearchEditor.tsx src/pages/StockResearch.tsx src/layouts/DashboardLayout.tsx src/pages/Admin.tsx src/pages/Configuracoes.tsx src/pages/Carteira.tsx src/lib/marketData.ts server/auth.js server/market/quote-service.js server/portfolio.js
grep -cE "^## [1-6]\." docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md
node scripts/harness.mjs check
```

Esperado: tabela de linhas; diferença de `git status` = só o relato; `6`; `check` sem erro.

## Formato do relato

Arquivo `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`, em português, com **exatamente** estes títulos:

1. `## 1. Arquivos acima do limite`
2. `## 2. Duplicação real`
3. `## 3. Ritmo (carregamento, erro e vazio)`
4. `## 4. Candidatos a código morto`
5. `## 5. Plano em fatias`
6. `## 6. Estado da árvore e limites` (a saída de `git status --short` e de `harness status` no início e no fim, a lista de arquivos marcados "em edição", o que não foi executado e por quê, e o próximo passo)

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`. O resumo diz: quantos arquivos pedem divisão e quantos só mudariam de lugar, os candidatos "mortos com prova", e as fatias recomendadas.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em relato. Não abra `.env*`.
- Nada de produção. Não faça commit, push, deploy, stash nem reset.
- Nada de alteração em arquivo do projeto, e nada de exclusão (o diagnóstico só sinaliza).
- Não adicione linha de autoria de IA.
