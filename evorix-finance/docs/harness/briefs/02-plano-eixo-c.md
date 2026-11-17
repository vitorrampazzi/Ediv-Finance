# Plano do Orquestrador — Eixo C (organização do código)

Skill escolhida pelo dono: `zizi-skills:code-quality`, em
`C:/Users/vitor/.claude/plugins/synced/e8a32b2e-8616-4d23-ba7a-3c77461c316a_cb34b0bb-9950-46ae-9789-1cfb8f5028c3/11922719-c2b0-4b58-9751-2dd37b3f91f9/skills/code-quality/`
(`SKILL.md` e `dead-code.md`). Quem faz o diagnóstico lê os dois arquivos inteiros antes de começar
e segue o procedimento deles. Não inventar regra que não esteja lá.

Princípios da skill que valem para esta missão:
- Três regras duras: um arquivo, uma responsabilidade (componente > ~200 linhas ou outro arquivo
  > ~300 linhas precisa justificar ou ser dividido); legível por um júnior; o mesmo ritmo para o
  mesmo tipo de trabalho (tela, endpoint, formulário: mesmas etapas, nomes, estados de
  carregamento e erro).
- Código morto só sai com prova (todos os caminhos descartados: import, string, rota, build, teste,
  configuração), em commit separado. Na dúvida, sinalizar, não apagar.
- Refatoração preserva comportamento; ~100 linhas por mudança é bom, ~300 aceitável; acima disso,
  dividir. Pergunta-chave: reduz complexidade ou só muda de lugar?
- Reaproveitar o que existe antes de criar.

## C1 — Lupa: diagnóstico de organização (só leitura; roda em paralelo com a 2F)

Arquivo permitido: só o relato `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md`
(Lupa não tem papel no quadro do harness; não reserva caminho e não edita mais nada).

Entregar:
1. **Arquivos acima do limite de tamanho** — começar por estes (linhas medidas em 16/11):
   `src/components/stock-make/StockMake.tsx` (1052), `src/pages/IncomeRanking.tsx` (955),
   `src/pages/Aprender.tsx` (950), `src/components/stock-make/Charts.tsx` (916),
   `src/components/PortfolioExtras.tsx` (631), `src/components/DividendDashboard.tsx` (617),
   `src/components/ResearchEditor.tsx` (613), `src/pages/StockResearch.tsx` (603),
   `src/layouts/DashboardLayout.tsx` (586), `src/pages/Admin.tsx` (584),
   `src/pages/Configuracoes.tsx` (579), `src/pages/Carteira.tsx` (573), `src/lib/marketData.ts`
   (572), `server/auth.js` (926), `server/market/quote-service.js` (633), `server/portfolio.js` (595).
   Para cada um: quantas responsabilidades (com as linhas de cada uma), se a divisão reduz
   complexidade ou só muda de lugar, e o corte proposto (nomes dos arquivos novos). Arquivo de dados
   (ex.: `src/lib/indicatorDefinitions.ts`) e `EdivAssistant.tsx` (experimental, só na QA) ficam fora.
2. **Duplicação real** (três ocorrências ou duas que precisam andar juntas). Pendência conhecida:
   `src/components/DividendDashboard.tsx` tem textos de explicação próprios que deveriam vir de
   `src/lib/indicatorDefinitions.ts` (fonte única desde a PR #51). Confirmar e dizer o que muda.
3. **Ritmo**: hooks e telas que buscam dados com formas diferentes de carregamento, erro e vazio
   (comparar com o padrão mais comum do projeto). Listar os desvios.
4. **Candidatos a código morto, com a prova do `dead-code.md`**: começar por `src/assets/hero.png`,
   `src/assets/vite.svg`, `src/assets/react.svg`, `public/ediv-logo.png`,
   `public/ediv-logo-transparent.png` (atenção: arquivo em `public/` pode ser usado por URL externa,
   e-mail, JSON-LD ou rede social; tratar como "sinalizar" se não houver prova), o ramo não-membro
   de `src/components/home/AccountHomeContent.tsx:111` (`RankingPreview`), e o "código antigo de
   cotações" citado na nota como mantido "para contrato e testes". Para cada um: veredito
   "morto com prova", "vivo" ou "não provado (sinalizar)".
5. **Plano em fatias**: de 4 a 8 mudanças pequenas e independentes, em ordem de ganho, cada uma com
   arquivos exatos, tamanho estimado (linhas), executor (Pincel ou Tijolo), teste que prova que o
   comportamento não mudou, e se é exclusão (commit próprio) ou refatoração.

Fora do escopo: editar qualquer arquivo; mudar regra financeira, margem, cotação, texto legal; propor
reescrita grande ou troca de biblioteca.

Validação: o relato cita `arquivo:linha` que existe (amostragem de 3); cada candidato a código morto
traz onde procurou e o que descartou.

## Fatias escolhidas pelo Orquestrador (17/11), a partir do relato C1

Relato: `docs/harness/relatos/revisao-eixo-c-diagnostico-2026-11-16.md` (Lupa). Decisões do dono em
17/11: **apagar** a interface antiga da Carteira, Painel e Favoritos (cluster A) e o painel
fundamentalista antigo (cluster B).

### 2E — Tijolo: dependências sem uso (pode rodar já, em paralelo ao Pincel)

Arquivos: `package.json`, `package-lock.json`, relato `docs/harness/relatos/backend-etapa2e-2026-11-17.md`.
- Provar de novo, no estado atual, que `autoprefixer` e `prettier` não são usados (imports, scripts,
  configs `postcss.config.*`, `vite.config.*`, `.prettierrc*`, `.github/workflows/*.yml`,
  `tests/dependencies.test.mjs`, editor configs versionados).
- Remover com `npm uninstall --package-lock-only autoprefixer prettier` (não mexe em
  `node_modules`, para não atrapalhar os builds do Pincel).
- Aceite: `git diff package-lock.json` só tem remoções ligadas a esses dois pacotes e às dependências
  exclusivas deles; nenhuma versão de outro pacote muda; `npm test` e `npm run lint` passam. O
  `npm ci` limpo fica para o QA final, quando ninguém estiver buildando.

### C2 — Pincel: exclusões com prova (commit próprio; depois da 2F)

1. Apagar os 22 arquivos órfãos de `src/` (clusters A, B e C do relato C1, lista exata no relato) e
   `src/assets/hero.png`, `vite.svg`, `react.svg`.
2. Remover o ramo não-membro de `src/components/home/AccountHomeContent.tsx:111` e
   `src/components/RankingPreview.tsx`, que só ele usa (prova no relato C1, item 6). Conferir antes se
   `SegmentedControl` continua usado (`Configuracoes.tsx`), para não apagá-lo.
3. Antes de cada exclusão, refazer a prova do `dead-code.md` no estado atual (grep de importadores,
   rotas, testes, scripts, `site-pages.mjs`, `index.html`), porque a árvore mudou desde o C1.
4. Não apagar nada em `public/` (logos antigas ficam como "sinalizar"), nada em `server/` (as rotas
   `/api/portfolio*` e as de cotação antiga continuam por contrato e testes).
5. Aceite: `npm run lint`, `tsc`, `npm test`, `npm run build` e `node --test tests/seo.dist.mjs` passam;
   o build gera os mesmos chunks de página (só some o que era órfão, se algum chunk o incluía);
   `grep` dos nomes apagados em `src/`, `tests/`, `scripts/` não acha nada; relato com a prova de cada
   arquivo.

### C3 — Pincel: uma só `apiRequest` (depois da C2)

`src/lib/api.ts:19` e `src/context/AuthProvider.tsx:23` têm duas cópias que precisam andar juntas
(regra da skill: duas cópias que devem ficar iguais compartilham uma base). Unificar em
`src/lib/api.ts`, **preservando o timeout atual de cada chamador** (hoje 30 s e 45 s; sem mudança de
comportamento). Aceite: um só lugar implementa a requisição; testes de sessão e de API verdes
(`tests/session.test.mjs`, `tests/api-resilience.test.mjs` e o `npm test` inteiro); login, sessão
expirada e erro de rede com o mesmo comportamento.

### Fica como recomendação (fora desta missão)

Divisões com ganho real mas maiores ou em área sensível: painel de publicação fora de
`IncomeRanking.tsx`, `Aprender.tsx`, `Configuracoes.tsx` (exige teste novo), `ResearchEditor.tsx`,
sessão fora de `server/auth.js` (segurança; merece rodada própria), `src/lib/marketData.ts`; hook
único para `/api/learning` (Aprender, Glossário, Perfil); troca do filtro de CSS do pré-render pelo
manifesto do Vite.

## Depois do C1

O Orquestrador escolhe as fatias e as ordena depois da fila do Pincel (2F → 2C → 2B). Fatias de
servidor podem ir ao Tijolo antes, se não tocarem arquivos do Pincel. A remoção de `autoprefixer` e
`prettier` (2E) entra junto das fatias de exclusão, quando nenhum build estiver rodando.
