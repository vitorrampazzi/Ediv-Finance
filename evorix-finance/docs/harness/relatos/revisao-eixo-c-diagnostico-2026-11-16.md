# Eixo C, C1: diagnóstico de organização do código (16/11/2026)
Autora: Lupa (revisão de código). Brief `docs/harness/briefs/eixoC-C1-lupa.md`. Somente leitura: este relato é o único arquivo que escrevi. Nada foi apagado, movido, commitado nem postado em PR.
Nota "Contexto Escola" lida (seções 3, 4 e 10). Li **inteiros** `SKILL.md` (382 linhas) e `dead-code.md` (204 linhas) da skill `code-quality` e usei só o que está neles: três regras duras (um arquivo, uma responsabilidade; legível por júnior; mesmo ritmo para o mesmo tipo de trabalho), a pergunta "reduz complexidade ou só muda de lugar?", três ocorrências antes de um helper compartilhado, e a prova de morte do `dead-code.md` (passos 1 a 4). Na dúvida: sinalizar, não declarar morto.
**Linha de base (Step 0 do `dead-code.md`): não executada, sem exclusão nesta etapa.** Não rodei lint, tsc nem testes aqui; a árvore está em edição pelo Pincel (2F) e tem alterações da 2A/2D ainda não commitadas.
Como medi: contagem de linhas por script Node (sem `wc` no Windows); estrutura por declarações de topo e marcadores JSX; alcançabilidade dos arquivos de `src/` por um grafo de importações (raízes: `src/main.tsx`, `src/entry-server.tsx` e todo arquivo fora de `src/`); busca por nome em 522 arquivos de texto do projeto (`src/`, `server/`, `tests/`, `scripts/`, `public/`, `docs/`, `index.html`, `vercel.json`, `site-pages.mjs`, configs). Calibrei o detector com símbolos que sei que estão em uso (`StockMake`: 27 ocorrências; `ediv-icon-clean-192.png`: 14 ocorrências).
## Resumo para escolher fatias
- **Código morto em `src/` é o maior ganho:** 22 arquivos que ninguém importa (cerca de 4.300 linhas), sem rota, sem teste, sem importação dinâmica. Três dos 16 arquivos da tabela do Item 1 (`Carteira.tsx`, `PortfolioExtras.tsx`, `DividendDashboard.tsx`) estão nesse grupo: **dividir esses três seria trabalho jogado fora.**
- **A "pendência conhecida" do Item 2 está num componente que ninguém monta:** `DividendDashboard.tsx` não é importado por nada. O que muda é excluir, não alinhar textos.
- Dos 16 arquivos: **6 pedem divisão com ganho real** (reduzem complexidade), **3 são mistos**, **3 só mudariam de lugar** (ou são justificáveis como estão) e **4 não devem ser divididos** (cluster sem uso, a decidir).
- Nenhum cálculo de margem fora de `safety-margin.mjs` foi visto nos arquivos lidos (`marketData.ts` só importa `safetyMarginFormula` para o texto: `marketData.ts:9-10`, `:283`, `:560`).
## 1. Arquivos acima do limite
Tabela de linhas atuais (medidas em 17/11/2026 às 03:02 UTC). Todas batem com o brief, **exceto `DashboardLayout.tsx`: 590 (brief: 586), diferença de +4** causada pelas duas tags `<img>` da 2A com `width`/`height` (alteração ainda não commitada, ver seção 6).
| # | Arquivo | Linhas | Veredito |
|---|---|---|---|
| 1 | `src/components/stock-make/StockMake.tsx` | 1052 | só muda de lugar |
| 2 | `src/pages/IncomeRanking.tsx` | 955 | reduz complexidade |
| 3 | `src/pages/Aprender.tsx` | 950 | reduz complexidade (hooks); seções só mudam de lugar |
| 4 | `src/components/stock-make/Charts.tsx` | 916 | só muda de lugar |
| 5 | `src/components/PortfolioExtras.tsx` | 631 | não dividir: sem uso (ver Item 4, cluster A) |
| 6 | `src/components/DividendDashboard.tsx` | 617 | não dividir: sem uso (ver Item 4, cluster B) |
| 7 | `src/components/ResearchEditor.tsx` | 613 | reduz complexidade |
| 8 | `src/pages/StockResearch.tsx` | 603 | misto |
| 9 | `src/layouts/DashboardLayout.tsx` | 590 (brief 586) | misto (em edição, 2A) |
| 10 | `src/pages/Admin.tsx` | 584 | misto |
| 11 | `src/pages/Configuracoes.tsx` | 579 | reduz complexidade |
| 12 | `src/pages/Carteira.tsx` | 573 | não dividir: sem uso (ver Item 4, cluster A) |
| 13 | `src/lib/marketData.ts` | 572 | reduz complexidade |
| 14 | `server/auth.js` | 926 | reduz complexidade |
| 15 | `server/market/quote-service.js` | 633 | só muda de lugar (justificável como está; corte pequeno opcional) |
| 16 | `server/portfolio.js` | 595 | não dividir: decisão do dono pendente (ver Item 4, código antigo) |
Detalhe por arquivo (responsabilidades com `arquivo:linha-inicial..linha-final`, veredito e corte proposto).
### 1.1 `src/components/stock-make/StockMake.tsx` (1052)
- Responsabilidades: constantes/`Stat` 47..100; `Header` 108..198; `Nav` 199..229; aba Visão geral `Overview` 230..458 (+ `Gauge` 459..490); aba Indicadores `Indicators` 500..669; aba Empresa `Company` 670..760; aba Aprender `Learn` 761..892; `CompanyQuote` 893..905; casca `StockMake` 906..948; montagem da página `StockPage` 949..1053.
- É **uma tela com sete componentes folha**, cada um com props próprias. Cada aba mexe num assunto, mas todas são apresentação.
- **Só muda de lugar:** mover `Overview`, `Indicators`, `Learn` e `StockPage` para arquivos próprios não elimina nenhum ramo nem estado; só encurta o arquivo. Baixa prioridade.
- Corte (se for feito): `stock-make/Overview.tsx`, `Indicators.tsx`, `Learn.tsx`, `StockPage.tsx`; `Stat`, `Header`, `Nav`, `Gauge` ficam em `stock-make/ui.tsx` (já existe pelo "Contexto Escola"). Cuidado: `StockMake.tsx` lê `indicatorHelp` (`:22`) para as dicas; manter a fonte única.
### 1.2 `src/pages/IncomeRanking.tsx` (955)
- Responsabilidades dentro de `MemberIncomeRanking` (`:53..956`, **uma função de 904 linhas**): (a) estado e filtros pela URL `:54..146`, `:151..246`; (b) células de mercado `:108..126`; (c) **fluxo de publicação da equipe**: estado `:79..87`, `retryPublication :247..264`, `sendFile :298..350`, painel `:481..592` (inclui `ResearchEditor`); (d) comparação de versões `:593..677`; (e) lista, busca e filtros para todos `:678..956`.
- **Reduz complexidade:** (c) é usado só por Analista/Administrador e carrega 8 estados e 3 handlers que o leitor comum do ranking nunca vê. Separar remove essa carga da função principal. (a) como hook `useRankingFilters` tira ~120 linhas de estado derivado.
- Corte: `ranking/RankingPublishTools.tsx` (c, com callback para recarregar a publicação, `:333`), `hooks/useRankingFilters.ts` (a). Em (c) há um `fetch` bruto (`:306`) porque envia o arquivo como corpo; ver Item 3.
### 1.3 `src/pages/Aprender.tsx` (950)
- `LearningSession` (`:104..951`, 848 linhas): (a) carga do conteúdo com `revision`/`loadedRevision` `:113..262`; (b) progresso e quiz `handleExpiredSession :263`, `chooseAnswer :278`, `resetProgress :318`; (c) derivados da trilha `:344..392`; (d) cabeçalho `:398..539`, jornada e carrossel `:540..563`, sala de aula `:564..766`, quiz e prática `:767..827`, glossário `:828..897`, diálogo de reinício `:898..951`.
- **Reduz complexidade:** (a) e (b) são lógica de dados, independente do desenho; como hooks (`useLearningContent`, `useLearningProgress`) a tela vira composição. (d) só muda de lugar.
- Corte: `hooks/useLearningContent.ts` (a; ver Item 2: mesma chamada em `Glossario.tsx:61` e `Perfil.tsx:38`), `hooks/useLearningProgress.ts` (b), e depois `learning/ClassroomSection.tsx`, `learning/GlossarySection.tsx`, `learning/ResetProgressDialog.tsx`.
### 1.4 `src/components/stock-make/Charts.tsx` (916)
- Responsabilidades: `PublicationChart :50..168`; `DividendChart :169..195`; `DividendCalendar :211..264`; `ResultFigure :265..322`; auxiliares de eixo `scale/Axis/Pin/Swatch :323..390`; `EarningsToDividend :391..523`; `EarningsGrowth :524..626`; `Leverage :627..697`; `NetIncomeHistory :698..819`; `ResultsCharts :820..831`; `ValuationChart :832..906`; `ChartUnavailable :907..917`.
- São gráficos **independentes** que compartilham só as auxiliares. **Só muda de lugar:** dividir por gráfico é mecânico e seguro, mas não reduz nenhum conceito. Justificável mantê-lo até alguém mexer num gráfico.
- Corte (quando tocar): `charts/chartParts.tsx` (`:323..390` e constantes `:33..49`) + um arquivo por gráfico.
### 1.5 `src/components/PortfolioExtras.tsx` (631), `src/pages/Carteira.tsx` (573)
- `PortfolioExtras` (`:68..632`, uma função de 565 linhas): painel de importação com prévia `:164..282`; resumo `:283..307`; histórico `:308..435`; formulário de evento `:436..554`; listas por status `:555..632`. `Carteira` (`:25..574`): cabeçalho `:46..90`, formulário de lançamento `:101..266`, tabela de posições `:267..372`, tabela de histórico `:373..574`.
- **Não dividir.** `Carteira.tsx` não é importado por nada e `/app/carteira` redireciona para `/app/ranking` (`src/App.tsx:190`); `PortfolioExtras` só é importado por `Carteira.tsx:14`. Ver Item 4, cluster A.
### 1.6 `src/components/DividendDashboard.tsx` (617)
- `DividendDashboard` (`:202..618`, 417 linhas) com `explanations` (`:69..100`), `MetricRow` (`:101..155`), `Calendar` (`:170..201`).
- **Não dividir.** Nenhum arquivo importa o componente. Ver Item 4, cluster B e Item 2.
### 1.7 `src/components/ResearchEditor.tsx` (613)
- `ResearchEditor` (`:50..614`, 565 linhas): estado do rascunho `:63..74`; operações `resetWorking :94`, `updateField :101`, `confirm :106`, `edit :115`, `add :134`, `prepare :174`; envoltório `<details>` `:211..245`; formulário por seção `:246..407`; lista das entradas `:408..614`.
- **Reduz complexidade:** `:63..209` é uma máquina de rascunho (estado + operações) sem JSX; como `useResearchDraft` o componente fica só com apresentação. A lista (`:408..614`) só muda de lugar.
- Corte: `hooks/useResearchDraft.ts` (`:63..209`) e `ResearchEntryList.tsx` (`:408..614`). **Sem teste automático** do editor (nenhum teste cita `ResearchEditor`): teste novo necessário.
### 1.8 `src/pages/StockResearch.tsx` (603)
- `MemberStockResearch` (`:63..604`): dados e modo demonstração `:64..146`; estados de carregamento, erro e vazio `:155..221`; cabeçalho e leitura guiada `:225..317`; seções `tese :322`, `riscos :331`, `historia :344`, `estatisticas :401`, `fundamentos :439`, `fontes :457`; lateral "Sobre esta versão" `:485..540`; navegação final `:540..`.
- **Misto:** extrair os dados de `:64..146` como `useStockResearchEntry` reduz (a função hoje mistura URL, demo, ranking e retry); as seis seções só mudam de lugar.
### 1.9 `src/layouts/DashboardLayout.tsx` (590) — **em edição pela 2A (não commitada)**
- Constantes de navegação `:38..83`; `NavigationLink :84..133`; `ProfileMenu :134..334` (201 linhas, com 3 `useState`, 2 refs, efeitos de fechamento e navegação); `DashboardLayout :335..541`; `MobileNavigation :542..591`.
- **Misto:** `ProfileMenu` isolado reduz o que `DashboardLayout` segura (estado de menu e logout); o resto só muda de lugar.
- Corte: `layouts/ProfileMenu.tsx`, `layouts/navigation.ts` (`:38..83`), `layouts/MobileNavigation.tsx`. Sem teste: **teste novo necessário** (nenhum teste cita `DashboardLayout`).
### 1.10 `src/pages/Admin.tsx` (584)
- Tipos `:11..46`; `Pages :69..104` (paginação); `AccessEditor :105..262` (158 linhas); `AdminPage :263..585`: estados `:264..290`, três efeitos de carga (resumo, lista, auditoria) `:291..345`, resumo `:346..403`, tabela de contas `:404..529`, auditoria `:530..585`.
- **Misto:** os três efeitos de carga viram `useAdminData` (reduz); `AccessEditor` e `Pages` só mudam de lugar.
### 1.11 `src/pages/Configuracoes.tsx` (579)
- `Configuracoes` (`:83..580`, 498 linhas, **16 `useState` de formulários sem relação**): nome `:95..99` + `saveName :117`; senha `:87..89` + `change :162`; exclusão `:90..92`, `:100`; `busy/error :93..94` + `action :147`; seções `Conta :199..302`, `Segurança :303..437`, `Preferências :438..475`, `Seus dados :476..497`, `Excluir conta :498..580`.
- **Reduz complexidade:** hoje todo estado de todos os formulários vive numa função. Uma seção por componente reparte esses estados (cada um só conhece o seu) sem mudar nenhum comportamento.
- Corte: `settings/AccountSection.tsx`, `SecuritySection.tsx`, `PreferencesSection.tsx`, `DataExportSection.tsx`, `DeleteAccountSection.tsx` (mantendo `Section`/`Row` `:32..82`). **Sem teste automático** de `Configuracoes`: teste novo necessário.
### 1.12 `src/lib/marketData.ts` (572)
- Três razões para mudar: **leitura/validação do que a API devolve** `:27..195` (`parseSafetyMargin`, `parseMarketBlock`, `parseRankingMarket`, `parsePublicRanking`); **textos e estados de tela** `:196..468` (`marketView :298..448` com 151 linhas, `marginTitle`, legendas); **mercado por publicação** `:469..573` (`publicationMarket`, `rankingMarketNote`).
- **Reduz complexidade** (mudar um texto de tela não deveria passar por código que valida a resposta da API), com baixo risco: funções puras e **testes existentes** (`tests/market-ui.test.mjs`, `tests/qa-margem.test.mjs`, ambos em `npm test`). Atenção: é arquivo de honestidade financeira. Mover sem alterar nenhuma linha; 14 arquivos importam daqui.
- Corte: `lib/marketParsing.ts` (`:27..195`); o restante fica.
### 1.13 `server/auth.js` (926)
- (a) limitadores e configuração `:33..106`; (b) token/verificação e envio de e-mail `:107..207`; (c) **sessão**: cookie, `publicUser`, `currentUser`, `requireAuthenticatedUser` `:208..301`; (d) cadastro e verificação `:302..453`; (e) login, `/me`, perfil e logout `:454..533`, `:533..633`, `:915..925`; (f) recuperação e redefinição de senha `:634..851`; (g) exportação dos dados `:852..914`.
- **Reduz complexidade:** (c) é consumido por **10 arquivos** (`server/admin.js:6`, `app.js:4`, `assistant.js:6`, `favorites.js:3`, `learning.js:2`, `notifications.js:4`, `portfolio.js:5`, `rankings.js:14`, `research-drafts.js:6`, `support.js:7`), todos só para checar sessão, mas hoje importam o arquivo inteiro de rotas de cadastro e recuperação. Separar o contrato de sessão do arquivo de rotas desfaz esse acoplamento. (f) e (g) só mudam de lugar.
- Corte: `server/session.js` (`:208..301`, 94 linhas; mexe nas 10 importações), depois `server/auth-recovery.js` (`:634..851`). Arquivo de segurança: cada corte exige os testes de sessão verdes.
### 1.14 `server/market/quote-service.js` (633)
- `createQuoteService` (`:115..634`, 520 linhas) é **uma fábrica com estado em fechamento** (`memory`, `inFlight`, `blocked`, fila, orçamento, cooldown `:141..149`) e dependências injetadas (`:111`, comentário de cabeçalho `:8..16`): infraestrutura de cache/orçamento/fila `:151..367`; formatação pura `catalogItem/summaryQuote/sessionData/canonicalQuote :368..444` (+ `unavailableQuote :55..82`); catálogo `:445..481`; operações públicas `quotes/quote/canonicalQuotes/series/history :482..622`.
- **Só muda de lugar**, exceto a formatação pura (`:55..82` e `:368..444`, ~105 linhas), que não depende do estado e poderia ir para `quote-shape.js` sem tocar a infraestrutura. As demais partes compartilham o estado do fechamento; separá-las exigiria passar esse estado de um lado para o outro. **Justificado como está**: um motivo para mudar (política de cotação), com testes fortes (`quote-service.test.mjs`, `ranking-market.test.mjs`). `canonicalQuote` define o preço mostrado: não mexer sem necessidade.
### 1.15 `server/portfolio.js` (595)
- Ajuda de banco `:57..160`; rotas de atividade `:145..161`, carteira `:162..209`, lançamentos `:210..288`, eventos `:289..373`, importação `:374..510`, exportação `:511..543`, preferências `:544..596`.
- **Não dividir agora.** Todos os chamadores no front estão em arquivos sem uso (`PortfolioExtras.tsx`, `usePortfolio.ts`, `lib/portfolio.ts`, `Dashboard.tsx`). A decisão é do dono: aposentar ou manter por contrato. Ver Item 4, "código antigo".
## 2. Duplicação real
Critério da skill: três ocorrências, ou duas que precisam andar juntas.
**2.1 Pendência conhecida confirmada, com uma reviravolta.** `src/components/DividendDashboard.tsx:69..100` (`explanations`) tem textos próprios para 17 indicadores. Todos têm chave equivalente em `src/lib/indicatorDefinitions.ts`: `projectedPE` (`:125`), `averagePE10Years` (`:151`), `peDeviation` (`:169`), `referencePrice` (`:85`), `ceilingPrice` (`:195`), `safetyMargin` (`:221`), `netDebtToEbitda` (`:265`), `estimatedNetIncome` (`:291`), `estimatedEps` (`:309`), `earningsCagr5Years` (`:331`), `expectedPayout` (`:357`), `projectedGrossDividendPerShare` (`:383`), `estimatedGrossDividendYield` (`:99`), `announcementFrequency` (`:405`), `announcementMonths` (`:423`), `marketValue` (`:437`), `totalShares` (`:455`). Os textos são lidos em `DividendDashboard.tsx:123` (dica da linha) e `:410` (`explanations.ceilingPrice`, nota sobre o preço-teto). O texto do preço-teto aqui diz "Premissa histórica de yield de 6,81%…" e o oficial está em `indicatorDefinitions.ts:204`; os demais são frases curtas de uma camada, enquanto a fonte única tem camadas e título.
- **O que mudaria:** `explanations[field]` (`:123`) viraria `indicatorHelp[field]` (ou `columnHelp(...)`, `indicatorDefinitions.ts:701`) e `explanations.ceilingPrice` (`:410`) viraria `indicatorHelp.ceilingPrice.layers[0].text` ou `indicatorSummary("ceilingPrice")` (`:669`). Os textos mudariam de uma frase para camadas.
- **Mas o componente não é importado por ninguém** (Item 4, cluster B). Alinhar textos de um arquivo sem uso é esforço desperdiçado: a ação correta é **excluir**, o que resolve a pendência e remove ~1.470 linhas (com `ComparativeDividendChart.tsx` e `fundamental-center.css`). Só se o dono decidir religar o painel, alinhar antes de religar.
**2.2 `apiRequest` existe em duas cópias que precisam andar juntas.** `src/lib/api.ts:19..65` e `src/context/AuthProvider.tsx:23..61`. Diferenças: tempo limite de 30 s (`AuthProvider.tsx:34-35`) contra 45 s (`api.ts:29-30`), e a cópia da sessão não lê `Retry-After`. Outros dois `fetch` à mão reimplementam o mesmo mapeamento de erro: `src/pages/IncomeRanking.tsx:306` (corpo é um arquivo) e `src/pages/auth/VerifyEmailPage.tsx:38` (a requisição não pode ser reexecutada: consome um token de uso único, comentário `:35..36`). **Cuidado:** unificar muda o tempo limite da sessão de 30 para 45 s; é mudança de comportamento, decisão do dono, não faxina.
**2.3 `/api/learning` buscado por três telas, cada uma do seu jeito:** `src/pages/Aprender.tsx:188` (com `revision`), `src/pages/Glossario.tsx:61` (só o glossário) e `src/pages/Perfil.tsx:38` (só `completed`). Três ocorrências. Um `useLearningContent` único resolveria (ver fatia 6). `Glossario.tsx` está em edição pela 2F.
**2.4 Formatador de reais repetido:** `src/pages/StockResearch.tsx:32..35` e `src/components/StockResearchInsight.tsx:10..13` são idênticos (`Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})`), e `src/lib/liveQuotes.ts:191..196` faz o mesmo e já exporta `quoteMoney` (`:213`). Duas cópias idênticas mais uma que serve: três ocorrências. **Atenção:** `quoteMoney` passa por `tidy(...)` (`:213`); trocar pode mudar espaços no texto exibido, então só com teste de texto. Prioridade baixa.
**2.5 Classes de campo e botão copiadas por arquivo, sem serem iguais:** `input`/`button` em `IncomeRanking.tsx:40..43`, `Admin.tsx:47..50`, `ResearchEditor.tsx:28..31`, `ResearchTools.tsx:164`, `SavedResearchDrafts.tsx:20`. São **cinco variantes diferentes** (`px-3` ou `px-4`, `py-2` ou não, com ou sem `hover`/`focus`). O projeto já tem classes compartilhadas (`action`, `action-secondary`, usadas em `PublicStock.tsx:173`). Unificar **muda a aparência**, então não é refatoração de comportamento preservado: **não recomendo como fatia**; vale ser decisão de design.
**Descartei como não duplicação:** `Intl` de datas em `liveQuotes.ts:155..170` e `marketData.ts:204` (formatos diferentes); os botões "Tentar novamente" (12 ocorrências) usam cada um o componente da tela e deveriam ser tratados no Item 3, não aqui.
## 3. Ritmo (carregamento, erro e vazio)
**Padrão mais comum do projeto:** hook de leitura que devolve `{ dados, loading, error, retry }`, com `apiRequest` (`src/lib/api.ts:19`) e `AbortController`, mensagem de erro em português, tela com "Tentar novamente". Exemplos: `src/hooks/useStockHistory.ts:5..46` (`attempt` como contador de nova tentativa), `useSupportInformation.ts:5..42` (`revision`), `useRegistrationAvailability.ts:4..35` (`revision`), e a família de **leitura periódica** `createPolledStore` (`usePublicRanking.ts:26..38`, `useLiveQuotes.ts:37..46`, `useRankingMarket.ts:21..25`).
**Desvios (com `arquivo:linha`):**
1. **Contador de nova tentativa com três nomes** para a mesma ideia: `attempt` (`useStockHistory.ts:6`), `revision` (`useSupportInformation.ts:6`, `useRegistrationAvailability.ts:5`, `Aprender.tsx:116`), mais `resolvedRevision` (`useSupportInformation.ts:7`) e `loadedRevision` (`Aprender.tsx:117`). Quem lê um hook não prevê o próximo.
2. **Telas que buscam dados dentro do componente, sem hook:** `Aprender.tsx:185..262`, `Glossario.tsx:60..72` (**em edição, 2F**), `Perfil.tsx:37..46` (sem estado de erro visível no trecho: `.catch` em `:46`), `Admin.tsx:291..345` (três efeitos), `RankingHighlights.tsx:99..124`, `LaunchReadiness.tsx:36..41`, `SavedResearchDrafts.tsx:74..140`.
3. **Mensagem de erro com origens diferentes:** texto fixo (`useSupportInformation.ts:26`: "Não foi possível carregar os contatos da equipe."), `error.message` do `ApiError` (`useStockHistory.ts:30..33`), função `failure(...)` (`useRankingPublication.ts:59`). Sem decisão central de qual vale quando.
4. **`fetch` bruto onde `apiRequest` caberia:** `IncomeRanking.tsx:306` (envio de planilha com `Content-Type` de arquivo; `apiRequest` aceita sobrescrever o cabeçalho, `api.ts:31..35`, então caberia) e `VerifyEmailPage.tsx:38` (justificado: a requisição consome token de uso único e precisa ser reutilizada, `:35..36`). Também `EdivAssistant.tsx` (experimental; fora do escopo).
5. **Hook sem estados de carregamento/erro:** `useResearchStatus.ts` (19 linhas) só tem `abort`; **sem uso** (Item 4).
6. **Vazio sem tratamento padronizado:** a mensagem de lista vazia aparece escrita à mão em cada tela (`IncomeRanking.tsx:909` "Nenhuma ação corresponde à busca"; `Admin`, `Glossario` e `SavedResearchDrafts` com textos próprios). Não há componente `EmptyState`. Não medi cada texto.
**O que NÃO propor:** a skill diz que "um padrão melhor é uma migração, não uma melhoria local". Padronizar o ritmo é migrar **todas** as instâncias de uma vez, em fatias próprias, e hoje isso é maior do que a pergunta "reduz complexidade". Recomendo só o `useLearningContent` (três ocorrências concretas) e deixar o resto como decisão do Orquestrador.
## 4. Candidatos a código morto
Veredito por candidato. "Onde procurei" vale para todos: 522 arquivos de texto do projeto (`src/`, `server/`, `tests/`, `scripts/`, `public/*.txt`, `docs/`, `index.html`, `vercel.json`, `site-pages.mjs`, `vite.config.ts`, `tsconfig.app.json`, `eslint.config.js`, `package.json`), nome limpo e formas em texto (`/assets/`, `import(`, `import.meta.glob`), CSS, JSON-LD e modelos de e-mail do servidor. Não há `import.meta.glob`, `require.context` nem `import(` com nome montado em `src/`. Detector calibrado (14 ocorrências do ícone em uso). Para `docs/harness/briefs/`, o plano do Eixo C (`02-plano-eixo-c.md:41..43`) e este brief citam os nomes; **isso é menção, não uso**.
| # | Candidato | Onde procurei | O que encontrei e descartei | Veredito |
|---|---|---|---|---|
| 1 | `src/assets/hero.png` (13 KB) | todo o projeto; `assets/` em `src`, CSS, HTML, scripts e `vite.config.ts` | nenhuma importação, nenhum `url(...)`, nenhuma menção fora do plano do Eixo C; só existe desde o commit inicial `0cf2222` (14/09/2026) | **morto com prova** |
| 2 | `src/assets/vite.svg` (8,7 KB) | idem | idem; o favicon usa `public/favicon.svg`, não este | **morto com prova** |
| 3 | `src/assets/react.svg` (4,1 KB) | idem | idem | **morto com prova** |
| 4 | `public/ediv-logo.png` (165 KB) | todo o projeto, `index.html`, `og:image`, `site-pages.mjs` (`logo:` usa o ícone de 192), `server/`, `public/*.txt`, histórico git | nenhum uso no código. `docs/LOGO.md:3` diz que a imagem original "permanece preservada como referência". Última referência em código foi em `7301620` (08/10/2026). Fica em `public/`, então tem URL pública: pode estar em e-mail enviado, rede social ou cache externo | **não provado (sinalizar)** |
| 5 | `public/ediv-logo-transparent.png` (184 KB) | idem | nenhum uso no código (última citação em `43bec27`, 09/10/2026). `docs/LOGO.md` diz que "os arquivos anteriores permanecem como referência; novos nomes evitam usar a imagem antiga do cache". Mesma razão de URL pública | **não provado (sinalizar)** |
| 6 | ramo não-membro de `src/components/home/AccountHomeContent.tsx:111` (`{member ? <MemberHomeBrand /> : <RankingPreview />}`) | todos os chamadores de `HomeContent` | único chamador: `src/pages/MemberHome.tsx:6` (`<HomeContent member />`). Com a remoção do reexport em `src/pages/Home.tsx` pela 2A (**ainda não commitada**), `member` é sempre verdadeiro. `awaitingRegistration` (`:24`, `:102`) nunca é passado. `RankingPreview.tsx` só é importado em `:7` deste arquivo; virará órfão. Testes não renderizam `HomeContent` | **morto com prova depois que a 2A for commitada** (no HEAD, `Home.tsx` ainda reexporta `HomeContent`) |
| 7a | "código antigo de cotações": rotas e catálogo | `server/market.js`, `server/market/asset-catalog.js`, `src/`, `tests/`, `docs/COTACOES.md` | `GET /api/market/assets` (`market.js:65..119`) e `server/market/asset-catalog.js` (71 linhas, do catálogo de ações aposentado, commit `a87156d`, 18/10/2026): nenhum chamador no front; mantidos por `tests/market-hardening.test.mjs:8`. `GET /api/market/quotes` (lote, `market.js:121..137`) e `getMarketQuotes` (`:56..63`): chamadores são `src/hooks/useMarketQuotes.ts:43` (**arquivo sem uso**), `server/portfolio.js:171` (rota da carteira sem uso no front) e `tests/ranking-market.test.mjs:819`, `:1001`; `docs/COTACOES.md:118` os declara contrato. `tests/dividend.browser.mjs:511` até **exige** que a interface não chame `/quotes`. Viva por contrato e teste | **não provado (sinalizar)**. Só seria provável com a exclusão do cluster A e a lista explícita de consumidores, informada pelo dono (modo "consumer-bounded" do `dead-code.md`) |
| 7b | `server/market-closes.js`, `server/market/daily-closes.js`, `server/market-service.js` | importadores no servidor | `market-service.js:6` e `:14` os importam; `rankings.js:8` e `market.js:5` usam `market-service`; histórico e série de preço dependem deles | **vivo** |
Como a lista do brief tem 7 itens, desdobrei "código antigo de cotações" em 7a e 7b para fechar os 8 pedidos.
### Achado adicional: arquivos de `src/` sem importador (não estavam no brief)
Grafo de importações partindo de `src/main.tsx`, `src/entry-server.tsx` e de todo arquivo fora de `src/` (testes, scripts, servidor): **22 arquivos de `src/` não são alcançados** (4.314 linhas: cluster A 2.539, B 1.470, C 305). `RankingPreview.tsx` (152) fica fora da conta: só vira órfão com a fatia 4. Para cada um conferi: sem importação estática, sem `import()`, sem rota (`src/App.tsx`), fora de `pageImports.ts` e de `NavigationIntent.tsx` (as rotas `/app/carteira` e `/app/favoritos` só redirecionam, `App.tsx:190`, `:194`; `NavigationIntent.tsx:31..32` só mapeia o redirecionamento), sem teste, sem configuração, sem texto de e-mail. Documentos dizem que o recurso foi retirado (`docs/POC-PESQUISA-E-DIVIDENDOS.md:41`: "Visão geral, Carteira e Favoritos saíram da experiência"; `docs/ACESSIBILIDADE-WCAG-2026-10-21.md:44`; commit `a87156d`, "retire stock catalogue").
**Cluster A: carteira, painel e favoritos retirados (2.539 linhas):**
`src/pages/Carteira.tsx` (574), `src/pages/Dashboard.tsx` (276), `src/pages/Favoritos.tsx` (255), `src/components/PortfolioExtras.tsx` (632), `src/components/PortfolioPulse.tsx` (388), `src/hooks/usePortfolio.ts` (194), `src/hooks/useFavoritos.ts` (11), `src/hooks/useMarketQuotes.ts` (79), `src/lib/portfolio.ts` (72), `src/lib/portfolioInsights.ts` (58).
- As ocorrências de "portfolio" no servidor, em testes e no README eram ruído de nome: conferi `server/portfolio-insights.js` e `tests/portfolio-insights.test.mjs`, que importam a **versão do servidor** (`../server/portfolio-insights.js`), não `src/lib/portfolioInsights.ts`.
- **Os únicos chamadores das rotas `/api/portfolio*` e `/api/market/quotes` em `src/` são estes arquivos** (`PortfolioExtras.tsx:85,90,120,147,215,605`; `usePortfolio.ts:108,151`; `lib/portfolio.ts:56`; `Dashboard.tsx:23,25`; `useMarketQuotes.ts:43`). `FavoritesProvider.tsx` ainda é montado no pré-render (`entry-server.tsx:4,36`), mas o único consumidor do contexto é `useFavoritos.ts` (sem uso): o provedor do pré-render é vestigial (não provado, sinalizar).
- Veredito: **morto com prova em `src/`**, com a ressalva de ser decisão de produto (o dono precisa confirmar que carteira e favoritos não voltam) e de o servidor continuar com as rotas (ver 7a).
**Cluster B: painel fundamentalista antigo (1.470 linhas):** `src/components/DividendDashboard.tsx` (618), `src/components/ComparativeDividendChart.tsx` (230, só importado por ele: `DividendDashboard.tsx:18`), `src/components/fundamental-center.css` (622, só importado em `:19`). Os testes de navegador chamam "Dashboard" um passo de `tests/dividend.browser.mjs:723`, mas ele percorre `.fmk-stats` e `#dividendos` da `StockMake` (`:730`, `:746`), não este componente. Veredito: **morto com prova em `src/`**; `docs/CENTRAL-FUNDAMENTALISTA.md:42`, `docs/DASHBOARD-DIVIDENDOS.md:81` e outros ainda descrevem o componente: atualizar na mesma mudança.
**Cluster C: pequenos órfãos (≈300 linhas):** `src/components/ScoreIndicator.tsx` (22), `AlgoInsight.tsx` (39), `src/data/mockData.ts` (66), `src/pages/Autenticacao.tsx` (6), `src/components/ResearchAvailability.tsx` (14) + `src/hooks/useResearchStatus.ts` (19), `src/components/home/LearningTerms.tsx` (56) + `src/lib/publicHomeTerms.ts` (31), `src/components/home/ReadingChecklist.tsx` (52). Sem referência alguma fora de documentos, exceto os pares (um só importa o outro). Veredito: **morto com prova em `src/`**. CSS que só esses arquivos usavam não foi medido (pode sobrar).
**Amostragem (`arquivo:linha` abertos e conferidos):** `src/components/home/AccountHomeContent.tsx:111` (ramo e chamador `MemberHome.tsx:6`); `src/components/DividendDashboard.tsx:69..100` e uso em `:123`, `:410`; `server/market.js:121..137` (rota `/quotes` e `getMarketQuotes` em `:56`); `src/pages/IncomeRanking.tsx:306` (`fetch` bruto).
## 5. Plano em fatias
Ordem por ganho (linhas e simplicidade). Todas são mudanças pequenas e independentes entre si, exceto onde indicado. Cada exclusão em commit próprio, sem refatoração junto (`SKILL.md`: "deletions get their own commit").
**Fatia 1: excluir o cluster A (carteira, painel e favoritos retirados)**
- Arquivos: os 10 do cluster A. Mantêm-se os redirecionamentos `Navigate` de `src/App.tsx:189..196`, o mapeamento em `NavigationIntent.tsx:31..32` e todo o servidor.
- Tamanho: −2.539 linhas, 0 linhas novas. Executor: Pincel.
- Teste que prova que nada mudou: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm test`, `npm run build` (falha se sobrar importação). Sem teste novo.
- **Exclusão** (commit próprio). Depende de o dono confirmar que a carteira não volta. Conflito com arquivo em edição: nenhum.
**Fatia 2: excluir o painel fundamentalista antigo (cluster B)**
- Arquivos: `src/components/DividendDashboard.tsx`, `src/components/ComparativeDividendChart.tsx`, `src/components/fundamental-center.css`; docs citados na seção 4 em commit separado.
- Tamanho: −1.470 linhas. Executor: Pincel.
- Teste: tsc, lint, `npm test`, build (o build revela CSS importado por engano). **Exclusão.** Conflito: nenhum. Resolve a pendência do Item 2.
**Fatia 3: excluir pequenos órfãos e os três assets do template Vite (cluster C + candidatos 1 a 3)**
- Arquivos: `ScoreIndicator.tsx`, `AlgoInsight.tsx`, `data/mockData.ts`, `pages/Autenticacao.tsx`, `ResearchAvailability.tsx`, `hooks/useResearchStatus.ts`, `home/LearningTerms.tsx`, `lib/publicHomeTerms.ts`, `home/ReadingChecklist.tsx`, `src/assets/hero.png`, `vite.svg`, `react.svg`.
- Tamanho: −300 linhas e 3 imagens (≈26 KB). Executor: Pincel.
- Teste: tsc, lint, `npm test`, build. **Exclusão.** Conflito: nenhum.
**Fatia 4: excluir o ramo não-membro da home da conta e o `RankingPreview`**
- Arquivos: `src/components/home/AccountHomeContent.tsx` (`:23..28` parâmetros, `:34`, `:38`, `:97..109`, `:111`), `src/components/RankingPreview.tsx`.
- Tamanho: ≈ −190 linhas (e simplificar a assinatura de `HomeContent`). Executor: Pincel.
- Teste: tsc, lint, `npm test`, build; conferir `/app` a olho depois (nenhum teste cobre a home da conta). **Exclusão.**
- **Conflito:** só vale depois que a 2A (remoção do reexport em `src/pages/Home.tsx`) for commitada; senão o HEAD ainda exporta `HomeContent`. Nenhuma sobreposição com os arquivos da 2F.
**Fatia 5: `useLearningContent` único para `/api/learning`**
- Arquivos: novo `src/hooks/useLearningContent.ts`; `src/pages/Aprender.tsx:113..262`, `src/pages/Glossario.tsx:60..72`, `src/pages/Perfil.tsx:37..46`.
- Tamanho: ≈ −90 linhas líquidas (≈ 250 de diferença total). Executor: Pincel.
- Teste: servidor já coberto por `tests/learning.test.mjs` (npm test); **teste novo necessário** para o comportamento do hook (carregar, erro, tentar de novo) ou rodada do `tests/browser.mjs`. **Refatoração.**
- **Conflito: `src/pages/Glossario.tsx` está em edição pela 2F** (reservado pelo papel `interface`). Esperar a 2F ser liberada.
**Fatia 6: `Configuracoes.tsx` por seção**
- Arquivos: `src/pages/Configuracoes.tsx`, novos `src/pages/settings/*Section.tsx` (5).
- Tamanho: ≈ 580 linhas movidas; fazer em dois PRs de cerca de 300 (Conta+Segurança; Preferências+Dados+Excluir). Executor: Pincel.
- Teste: **teste novo necessário** (nenhum teste cobre `Configuracoes`): cobrir pelo navegador a troca de nome, a troca de senha e a exclusão antes de mexer. **Refatoração.** Conflito: nenhum.
**Fatia 7: `server/session.js` separado de `server/auth.js`**
- Arquivos: `server/auth.js:208..301`, novo `server/session.js`, e as 10 importações de `admin.js`, `app.js`, `assistant.js`, `favorites.js`, `learning.js`, `notifications.js`, `portfolio.js`, `rankings.js`, `research-drafts.js`, `support.js`.
- Tamanho: ≈ 94 linhas movidas + 10 linhas de importação. Executor: Tijolo.
- Teste: `tests/session.test.mjs`, `tests/auth-cleanup.test.mjs`, `tests/api-resilience.test.mjs`, `tests/analytics.test.mjs` (todos em `npm test`). O `integration.test.mjs` exige MySQL descartável (porta 3307): **não roda nesta máquina**, então vira lacuna declarada. **Refatoração.**
- **Conflito:** `server/support.js` tem alteração da 2D ainda não commitada (cache de `/information`); mexer na linha 7 desse arquivo antes do commit da 2D gera sobreposição. Nenhum arquivo do Pincel.
**Fatia 8: painel de publicação da equipe fora de `IncomeRanking.tsx`**
- Arquivos: `src/pages/IncomeRanking.tsx` (`:79..87`, `:247..264`, `:298..350`, `:481..592`), novo `src/components/ranking/RankingPublishTools.tsx`.
- Tamanho: ≈ 230 linhas movidas, ~20 de contrato novo (callback de recarga, `:333`). Executor: Pincel.
- Teste: só navegador (`tests/browser.mjs`, `tests/dividend.browser.mjs`, fora de `npm test`): **teste novo necessário** ou rodar esses dois em ambiente com navegador. **Refatoração.** Conflito: nenhum arquivo em edição; `IncomeRanking.tsx` não foi tocado desde 09/11.
**Fora das 8 (decidir antes):** unificar `apiRequest` (muda o tempo limite de 30 para 45 s, Item 2.2); padronizar classes de campo/botão (muda a aparência, Item 2.5); excluir `public/ediv-logo.png` e `ediv-logo-transparent.png` e o código antigo de cotações (precisam da resposta do dono, Item 4); dividir `StockMake`, `Charts`, `quote-service` (só mudam de lugar).
## 6. Estado da árvore e limites
**Início (17/11/2026, 03:02 UTC) e fim (03:09 UTC): idênticos.** Na conferência final (depois de gravar este relato) a árvore ganhou dois arquivos novos: este relato (meu) e `docs/harness/relatos/interface-etapa2f-2026-11-16.md` (do Pincel, que apareceu no meio da tarefa; não o li). Nenhum arquivo foi removido nem alterado por mim. `node scripts/harness.mjs check`: quadro válido, sem conflito de reservas.
`git status --short` (início = fim):
```
 M .gitignore
 M docs/harness/state.json
 M package.json
 M scripts/prerender.mjs
 M server/support.js
 M src/App.tsx
 M src/components/NavigationIntent.tsx
 M src/components/SiteChrome.tsx
 M src/components/auth/AuthShell.tsx
 M src/components/home/PublicHeroBrand.tsx
 M src/layouts/DashboardLayout.tsx
 M src/pages/Glossario.tsx
 M src/pages/Home.tsx
 M src/pages/PublicStock.tsx
 M tests/seo.dist.mjs
?? ../.gitignore
?? ../.maestri/
?? ../docs/estrategia_escola_do_dividendo.pdf
?? docs/UX-PERFORMANCE-2026-11-16.md
?? docs/harness/briefs/
?? docs/harness/relatos/backend-auditoria-performance-2026-11-16.md
?? docs/harness/relatos/backend-etapa2d-2026-11-16.md
?? docs/harness/relatos/interface-auditoria-ux-2026-11-16.md
?? docs/harness/relatos/interface-etapa2a-2026-11-16.md
?? docs/harness/relatos/qa-base-ux-performance-2026-11-16.md
?? docs/harness/relatos/qa-cls-2026-11-16.md
?? docs/harness/relatos/qa-etapa2a-2d-2026-11-16.md
?? public/ediv-logo-clean.webp
?? src/components/PublicCompanySkeleton.tsx
?? tests/perf-baseline.mjs
?? tests/public-cache.test.mjs
```
`node scripts/harness.mjs status` (início e fim iguais): `coordenacao` trabalhando (2A+2D aceitas; 2F com o Pincel); `interface` **trabalhando**, 2F, reservas `src/pages/glossario.tsx`, `src/pages/publicstock.tsx`, `src/components/publiccompanyskeleton.tsx`, `src/app.tsx`, `scripts/prerender.mjs`; `backend` revisao, sem reservas; `qa` revisao, sem reservas.
**Arquivos marcados "em edição" quando os li** (alteração não commitada ou reserva do papel `interface`):
- `src/pages/Glossario.tsx` (reserva da 2F; última gravação 03:00 UTC), citado em Item 2.3, Item 3 e fatia 5.
- `src/pages/PublicStock.tsx` e `src/components/PublicCompanySkeleton.tsx` (2F): lidos só para conferir uso, nenhum achado depende deles.
- `src/App.tsx` e `scripts/prerender.mjs` (2F reservados; também com 2A): lidos para as rotas de redirecionamento `:181..196`.
- `src/layouts/DashboardLayout.tsx` (alteração da 2A, sem reserva; gravado 02:28 UTC): linha 590 em vez de 586; item 1.9.
- `src/pages/Home.tsx` (alteração da 2A, remoção do reexport): base do veredito 6 e da fatia 4.
- `server/support.js` (2D, sem commit): conflito da fatia 7.
Todos os demais arquivos citados estavam sem alteração (última gravação anterior a 16/11), inclusive os 16 da tabela do Item 1, exceto `DashboardLayout.tsx`, `StockMake.tsx` (16/11 02:33) e `Aprender.tsx` (16/11 02:27), ambos já commitados no HEAD.
**O que não foi executado e por quê:**
- `npm run build`, `vite preview`: proibido pelo brief (Pincel e Vigia dependem do `dist/`).
- Linha de base verde (lint, tsc, `npm test`): não executada, **sem exclusão nesta etapa**.
- Nenhum teste de navegador nem `tests/integration.test.mjs` (exigem navegador e MySQL descartável, indisponíveis).
- Nenhuma medição de CSS sobrando depois das exclusões, nem de bytes economizados no `dist/`.
- Nada de produção, nada de PR, `scripts/post-review.sh` não usado. Não abri `.env*`.
**Limites do diagnóstico:**
- A alcançabilidade foi calculada por um grafo de importações escrito por mim. Ele ignora (por desenho) importações montadas em texto, que não existem em `src/`. Cada arquivo do grupo foi reconferido por nome em todo o projeto.
- "Morto com prova" vale para o código da **branch atual** e para este repositório. Nenhuma API de biblioteca publicada está envolvida; o consumidor externo possível é só o das imagens de `public/` (por isso ficaram "não provado").
- As faixas de linhas das responsabilidades vêm dos marcadores JSX e declarações; confirmei por leitura os trechos citados na amostragem. Em arquivos longos, o limite entre duas responsabilidades pode variar em algumas linhas.
- Orçamento de acertos: a skill pede contar que um terço dos achados de primeira passada pode estar errado. Por isso o veredito de 7a ficou "não provado" e o das imagens de marca também.
**Próximo passo sugerido:** o Orquestrador decide (1) se carteira e favoritos estão encerrados (libera as fatias 1 e 2); (2) o destino das duas imagens de marca em `public/` e do código antigo de cotações; (3) se o Pincel faz as fatias 3, 4, 5, 6, 8 depois que a 2F for liberada e a 2A commitada. As exclusões (1 a 4) são as de maior retorno e menor risco; começar por elas.
