# Relato: linhas divisórias entre seções (interface, 24/11/2026)

Responsável: Frontend (Pincel). Brief 2c, depois do 2b. Worktree com o sufixo `aulas-ordem-2026-11-24` (projeto em `evorix-finance/`), base `bedcb5f`. Sem commit, sem push, sem `harness claim`, sem edição em `docs/harness/state.json`. Pasta principal intocada.

## 1. Resumo

- **Saíram 29 linhas** de borda horizontal: 27 classes `border-t`/`border-b`/`border-y`/`divide-y` em `.tsx` (contando `border-t-0` e `lg:border-t-0` como pares de remoção) e 2 regras `border-top`/`border-bottom` em CSS (`.ph-hero` e `.ph-final`). Espaçamento (`pt`, `pb`, `py`) ficou como estava. Nenhuma linha, sombra ou fundo novo.
- **Ficaram** as linhas de lista, de tabela, de aba, de moldura, de card, de componente compartilhado e a de cabeçalho compartilhado (`.section-masthead`, usada também em `/ranking`).
- **O que o dono vai notar:** as faixas de seção das páginas da Escola (Metodologia, Suporte, Perfil, Configurações, empresa logada, Aprender, home) ficam sem a linha cinza que separava um bloco do próximo. Os blocos continuam separados pelo espaçamento. As listas (roteiro, FAQ, passos, linhas de configuração) mantêm as suas linhas.

## 2. Tabela (arquivo:linha | página | saiu/ficou | motivo)

Linhas de `bedcb5f`, que continuam valendo porque nenhuma linha foi removida nem incluída nesses arquivos (só o conteúdo das classes mudou).

### Páginas do escopo

| arquivo:linha | página | saiu/ficou | motivo |
|---|---|---|---|
| `src/pages/Aprender.tsx:444` | /aprender | ficou | barra de abas (sublinhado da aba ativa), fica por regra |
| `src/pages/Aprender.tsx:554` | /aprender | saiu | divisória entre o cabeçalho da aula e a sala de aula; `pt-7` mantido |
| `src/pages/Aprender.tsx:711` | /aprender | saiu | divisória antes dos botões Aula anterior/Próxima; `pt-5` mantido |
| `src/pages/Aprender.tsx:796` | /aprender | saiu | divisória antes do rodapé de links; `pt-6` mantido |
| `src/components/learning-workspace.css:305` | /aprender | ficou | borda superior do painel de aulas (`.ediv-learning-playlist`): é a moldura do painel escuro da lista, não linha de seção |
| `src/components/learning-workspace.css:483` | /aprender | ficou | reset do `@media` que pertence à regra acima |
| `src/components/LearningQuiz.tsx:32` | /aprender, aba Testes | saiu | duas linhas (`border-y`) que enquadravam o bloco de exercício; a legenda ("Confira o que aprendeu") continua |
| `src/pages/Metodologia.tsx:68` | /metodologia | saiu | divisória entre o cabeçalho e o conteúdo |
| `src/pages/Metodologia.tsx:89` | /metodologia | ficou | acento `border-t-2` de cada item da lista de passos; é destaque do item, não separador de seção |
| `src/pages/Metodologia.tsx:98` | /metodologia | saiu | divisória de seção (Da pesquisa à publicação / O que a escola procura) |
| `src/pages/Metodologia.tsx:119` | /metodologia | saiu | divisória de seção |
| `src/pages/Metodologia.tsx:124` | /metodologia | ficou | `divide-y` da lista de perguntas |
| `src/pages/Metodologia.tsx:137` | /metodologia | saiu | divisória de seção (Critérios, autoria e fontes) |
| `src/pages/Metodologia.tsx:165` | /metodologia | ficou | `border-b` de cada item da lista do roteiro (linhas entre itens) |
| `src/pages/Metodologia.tsx:190` | /metodologia | saiu | divisória antes do rodapé de botões |
| `src/pages/Transparencia.tsx:20` | /suporte | saiu | divisória entre o cabeçalho e o conteúdo |
| `src/pages/Transparencia.tsx:44` | /suporte | saiu | divisória de seção (Como falar com a Escola) |
| `src/pages/Transparencia.tsx` (Privacidade) | /privacidade | — | a página não tem linha horizontal de seção no arquivo; nada a tirar |
| `src/components/SupportHelpCenter.tsx:225`, `:321` | /suporte | ficou | `divide-y` de lista de perguntas e de caminhos (lista) |
| `src/components/support/*` (`border-t`/`border-b`) | /suporte, conversas | ficou | atendimento e conversas, fora do escopo |
| `src/components/GettingStarted.tsx:140` | conta (`/app`), home | saiu | divisória entre o texto de introdução e a lista de passos; `mt-5`/`sm:mt-6` mantidos |
| `src/components/GettingStarted.tsx:161` | conta (`/app`), home | ficou | `border-b` de cada item da lista (linha entre itens) |
| `src/pages/Perfil.tsx:65` | /app/perfil | saiu | divisória entre o cabeçalho e o conteúdo |
| `src/pages/Perfil.tsx:102` | /app/perfil | saiu | divisória de seção (aprendizado) |
| `src/pages/Perfil.tsx:168` | /app/perfil | ficou | borda superior da lista de links (topo da lista, como em tabela) |
| `src/pages/Perfil.tsx:170` | /app/perfil | ficou | `border-b` de cada linha da lista |
| `src/pages/Perfil.tsx:82` (`"—"`) | /app/perfil | — | marcador de dado ausente, não é linha |
| `src/pages/Configuracoes.tsx:46` | /app/config | saiu | divisória de seção (`last:border-b-0` removido junto) |
| `src/pages/Configuracoes.tsx:71` | /app/config | ficou | borda das linhas de configuração (lista; `first:border-t-0` faz parte da lista) |
| `src/pages/Configuracoes.tsx:184` | /app/config | saiu | divisória entre o cabeçalho e o conteúdo |
| `src/pages/Configuracoes.tsx:204` | /app/config | ficou | `divide-y` da lista de dados |
| `src/pages/Configuracoes.tsx:281` (`"—"`) | /app/config | — | marcador de dado ausente |
| `src/pages/Configuracoes.tsx:382` | /app/config | saiu | divisória antes do bloco "Sessões abertas" |
| `src/pages/StockResearch.tsx:37` (constante `section`) | empresa logada `/app/ranking/acao/:ticker` | saiu | divisória de topo das seções Tese, Riscos, História, Estatísticas, Fundamentos e Fontes (seis usos da mesma constante) |
| `src/pages/StockResearch.tsx:250` | empresa logada | ficou (moldura dos indicadores, decisão do Orquestrador) | faixa de indicadores (`dl` com Potencial, preço-teto e margem) é moldura de dados; `border-y` restaurado exatamente como em `bedcb5f` |
| `src/pages/StockResearch.tsx:322` | empresa logada | saiu | `border-t-0` da seção Tese, que existia por causa da linha; removido junto |
| `src/pages/StockResearch.tsx:410` | empresa logada | ficou | `divide-y` da lista de indicadores |
| `src/pages/StockResearch.tsx:486` | empresa logada | saiu | divisória de topo do aside no celular (`border-t`); `lg:border-t-0` removido junto; `lg:border-l` (vertical) fica |
| `src/pages/StockResearch.tsx:542` | empresa logada | saiu | divisória antes da navegação "Outras pesquisas" |
| `src/components/StockResearchInsight.tsx:108` | empresa logada | saiu | divisória de seção (Leitura visual) |
| `src/components/StockResearchInsight.tsx:172` | empresa logada | saiu | divisória de seção do insight |
| `src/components/StockResearchInsight.tsx:313` | empresa logada | ficou | `border-t` do grupo de etapas do gráfico (parte do componente visual) |
| `src/components/ResearchCoverage.tsx:8` | empresa logada | saiu | duas linhas (`border-y`) do bloco de conteúdo disponível |
| `src/components/PageState.tsx:25` | /metodologia (estado de carregamento/erro/vazio) | saiu | duas linhas (`border-y`); único uso fora de estado é o da página de Metodologia |
| `src/components/RankingHighlights.tsx:198`, `:255` | conta (`/app`), home | ficou | `mt-3 border-t` do topo de cada lista de linhas do ranking (lista, como tabela) |
| `src/components/RankingHighlights.tsx:202`, `:274` | conta (`/app`), home | ficou | `border-b` das linhas do ranking (lista) |
| `src/components/RankingHighlights.tsx:26,38,47,62,66` (`"—"`) | — | — | marcadores de dado ausente |
| `src/components/StockResearchInsight.tsx` (demais) | — | — | sem outras linhas |
| `src/components/home/*.tsx` | home | — | nenhum `border-t`/`border-b` nos `.tsx` da home; as linhas da home estão em CSS (abaixo) |

### CSS (regras de borda)

| arquivo:linha | página | saiu/ficou | motivo |
|---|---|---|---|
| `src/components/home/public-home.css:103` (`.ph-hero`) | home pública | saiu | divisória entre o herói e a seção seguinte; `padding-top` mantido |
| `src/components/home/public-home.css:218` (`.ph-final`) | home pública | saiu | divisória de topo da faixa final; o fundo `--ediv-inset` já separa a faixa |
| `src/components/home/public-sections.css:108` | home | ficou | linhas de `.ph-ranking-locked-rows li` (lista) |
| `src/components/home/public-sections.css:188`, `:191` | home | ficou | lista de amostra e suas linhas (lista) |
| `src/components/home/public-sections.css:301`, `:305` | home | ficou | lista de pontos do checklist (lista) |
| `src/components/home/public-sections.css:403` | home | ficou | divisória interna de um termo (resumo x definição), não é seção |
| `src/components/home/public-sections.css:409`, `:412` | home | ficou | lista de perguntas frequentes (lista, como em Metodologia) |
| `src/components/home/teaching-journey.css:47` | home | ficou | sublinhado da aba ativa |
| `src/components/home/teaching-journey.css:130`, `:260`, `:262` | home | ficou | divisórias entre os passos da trilha (lista de itens) |
| `src/index.css:247` (`.section-masthead`) | empresa pública, `/ranking`, IncomeRanking; `/aprender` | ficou nas outras páginas; saiu em `/aprender` por decisão do Orquestrador | o masthead é compartilhado com `RankingAccessLanding` (`/ranking`), `IncomeRanking` e `PublicStock`, então a regra base não mudou. Em `/aprender` o `<header>` recebe o modificador `section-masthead--sem-linha` (`border-bottom: 0`, `index.css`, logo após a regra base), mesmo padding. Confirmado: `/aprender` sem linha; empresa pública com a linha (`base` em 400 px/473 px). Cabeçalho compartilhado: é a única linha de seção que sobra na empresa pública |
| `src/index.css:382` (`.research-insight-stage`) | empresa logada | ficou | divisória das etapas do insight (lista de etapas) |
| `src/components/dividend-research.css:50` | `/ranking` e pesquisa | ficou | célula de tabela, compartilhada com `/ranking` |
| `src/components/research-ranking-table.css:44`, `:56` | tabela | ficou | linhas de tabela |
| `src/components/research-section-nav.css:23`, `:33` | navegação de seções | ficou | barra de navegação e sublinhado da aba ativa |
| `src/components/navigation-chrome.css:275` | moldura | ficou | rodapé da conta (moldura) |
| `src/components/tooltip.css:60` | tooltip | ficou | tooltip |
| `src/components/stock-make/stock-make.css:273`, `:277`, `:280`, `:283`, `:286`, `:311` | stock-make | ficou | fora do escopo (`stock-make/`) |

### Componentes compartilhados ou fora do escopo (ficam, sem tocar)

| arquivo:linha | motivo |
|---|---|
| `src/components/LiveQuote.tsx:81`, `:89` | usado também em `stock-make/StockMake.tsx`, `DividendRankingTable.tsx` e `/ranking` |
| `src/components/RankingFundamentals.tsx:135`, `:166` (eixo), `:237` | usado também em `/ranking` e `IncomeRanking.tsx` |
| `src/components/Card.tsx:21`, `:29` | usado em `Assessoria.tsx` e `IncomeRanking.tsx` (fora) |
| `src/components/PageContent.tsx:21` | moldura (`App.tsx`, `SiteChrome.tsx`, `DashboardLayout.tsx`) |
| `src/components/SiteChrome.tsx:386`, `src/layouts/DashboardLayout.tsx:230`, `:395`, `:448`, `src/App.tsx:122`, `src/entry-server.tsx:31` | moldura e navegação |
| `src/components/EdivAssistant.tsx:363`, `:472` | assistente, fora do escopo |
| `src/components/LaunchReadiness.tsx:253`, `src/pages/Admin.tsx:530` | área administrativa |
| `src/pages/Conversas.tsx:80`, `:149`, `:322`, `src/components/support/*` | atendimento e conversas |
| `src/pages/IncomeRanking.tsx:620`, `:870`, `:879` | `/ranking`, fora do escopo |
| `src/components/PublicationReview.tsx:118`, `:154`, `src/components/ResearchEditor.tsx:409` | fora do escopo |
| `src/components/stock-make/*.tsx` (demais linhas) | `stock-make/`, fica |
| `src/pages/auth/LoginPage.tsx:133` | login, fora do escopo |
| `src/components/LearningQuiz.tsx` (removido, item 32 acima) | — |
| `src/components/support/SupportHelpCenter.tsx` (`divide-y`) | lista, fica |

Observação: `src/pages/PublicStock.tsx` (empresa pública `/ranking/acao/:ticker`) não tem `border-t`/`border-b` no `.tsx`. A única linha que ela mostra é a do `.section-masthead` (compartilhado, fica).

## 3. Números

| Contagem | Antes (`bedcb5f`) | Depois |
|---|---|---|
| Ocorrências de `border-t|border-b|divide-y|border-y` em `src/*.tsx` | 96 | 69 (−27) |
| Regras `border-top`/`border-bottom` em `src/*.css` | 26 | 25 (−2 removidas nas home, +1 do modificador `section-masthead--sem-linha`, que tem `border-bottom: 0`) |
| `git grep "<hr" -- src` | vazio | vazio |

Por arquivo, o que saiu (ocorrências de `.tsx`): `Aprender.tsx` 3; `Metodologia.tsx` 5; `Transparencia.tsx` 2; `Perfil.tsx` 2; `Configuracoes.tsx` 4 (incluindo `last:border-b-0`); `StockResearch.tsx` 5 (incluindo `border-t-0` e `lg:border-t-0`; a faixa de indicadores ficou); `StockResearchInsight.tsx` 2; `GettingStarted.tsx` 1; `ResearchCoverage.tsx` 1; `PageState.tsx` 1; `LearningQuiz.tsx` 1. Soma: 27.

Por arquivo, o que saiu (CSS): `home/public-home.css` 2. Entrou 1 regra nova em `src/index.css` (`.section-masthead.section-masthead--sem-linha`, `border-bottom: 0`), que soma ao total: 26 − 2 + 1 = 25.

## 4. Sobra por página de conteúdo

| Página | Linha de seção que sobrou | Motivo |
|---|---|---|
| Home pública `/` | nenhuma | as linhas que sobraram são de listas (passos, amostra, FAQ, termo) |
| Home da conta `/app` | nenhuma | mesmas listas, mais as linhas do ranking e dos itens de introdução |
| `/aprender` (visitante e conta) | nenhuma de seção | sobram a barra de abas (fica) e a moldura do painel de aulas (fica) |
| `/metodologia` | nenhuma de seção | sobram acento de item, lista de perguntas e linhas do roteiro |
| `/suporte` | nenhuma de seção | sobram listas e a moldura de atendimento |
| `/privacidade` | nenhuma | sem linhas de seção |
| Empresa pública `/ranking/acao/:ticker` | **uma: a do `.section-masthead`** | cabeçalho compartilhado com `/ranking`; é a única linha que o meta permite |
| Empresa logada `/app/ranking/acao/:ticker` | nenhuma de seção | sobram a faixa de indicadores (`border-y`, moldura dos indicadores, decisão do Orquestrador), a lista de indicadores (`divide-y`) e as etapas do gráfico |
| `/app/perfil` | nenhuma | sobram a lista de links e as linhas da lista |
| `/app/config` | nenhuma | sobram as linhas de configuração e a lista de dados |

## 5. Prints e medidas

Prints de `ordem-qa\prints-pincel\` (fora do repositório). CLS (carga, sem interação), antes = controle (`bedcb5f`), depois = corrigido:

| Página | Largura | Antes (controle) | Depois | Situação |
|---|---|---|---|---|
| `/` (home) | 1280 | 0 | 0 | igual |
| `/` (home) | 375 | 0 | 0 | igual |
| `/aprender` | 1280 | 0,0268 | 0,0267 | igual (menor) |
| `/aprender` | 375 | 0,0186 | 0,0279 | **subiu 0,0093** (ver abaixo) |
| `/aprender` escuro | 375 | 0,0186 | 0,0279 | mesma subida |
| Empresa pública | 1280 | 0 | 0 | igual |
| Empresa pública | 375 | 0 | 0 | igual |
| `/metodologia`, `/suporte`, `/privacidade` | 1280 e 375 | 0 | 0 | igual |

**Sobre `/aprender` a 375 px:** medi o estado com as quatro linhas do 2c temporariamente restauradas (em build de teste, depois desfeito). O CLS deu 0,0278 do mesmo jeito (na última medição, com o modificador do masthead, deu 0,0279). Logo, a subida vem do 2b (o aviso e os textos da aula aberta), não desta mudança. O brief aceita até controle + 0,01 (0,0286); ficou dentro do limite, mas ficou acima do controle. Recomendo que o Orquestrador decida se isso vale como "não piorou".

Imagens lidas (depois, claro, salvo onde indicado):
- `depois-home-1280.png` e `depois-home-375.png`: blocos separados por espaço; nenhuma linha colada; listas com as linhas de lista; sem rolagem lateral.
- `depois-aprender-1280.png` (regenerado após o ajuste do masthead): aviso do 2b legível; sem linha do masthead, que sumiu; barra de abas com linha; blocos da sala de aula e dos botões separados por espaço; rodapé com Glossário; sem sobreposição.
- `depois-aprender-375.png`: mesma estrutura no celular; a lista de minicursos rola na horizontal dentro do próprio carrossel (comportamento existente, não é rolagem da página); blocos não colados.
- `depois-aprender-375-escuro.png`: mesmo que o claro; sem blocos colados; texto legível.
- `depois-metodologia-1280.png` e `depois-metodologia-375.png`: seções separadas só pelo espaço; as linhas do roteiro (lista) continuam; nada colado.
- `depois-suporte-1280.png` e `depois-suporte-375.png`: sem linha de seção; a lista de perguntas tem as linhas dela; a moldura de atendimento (`border-l`) continua.
- `depois-privacidade-1280.png` e `depois-privacidade-375.png`: texto corrido com espaçamento; sem linhas; sem colagem.
- `depois-empresa-1280.png`: uma linha sob a introdução (cabeçalho compartilhado); faixa de indicadores sem linhas; blocos separados por espaço.
- `depois-empresa-375.png`: mesma estrutura no celular; uma linha sob a introdução; nada colado.

Blocos colados: nenhum observado nas imagens.

Página da empresa logada (`/app/ranking/acao/:ticker`), home da conta e `/app/perfil` e `/app/config`: não têm print neste lote (o script só cobre páginas públicas). As decisões dessas páginas foram tomadas por leitura do código.

## 6. Portões

| Verificação | Resultado |
|---|---|
| `npm run lint` | código 0 |
| `npx tsc -p tsconfig.app.json --noEmit` | código 0 |
| `npm run build` | código 0 (HTML público para 8 rotas) |
| `npm test` | 318 de 318 |
| `node tests/seo.dist.mjs` | 9 de 9 |
| `npm run test:public-home` | código 0; 10 PASS (nenhum limite quebrou) |
| `matriz-ordem.mjs` (corrigido) | 422 de 422, sem FALHA |
| `matriz-ordem.mjs` (controle) | 147 de 147, sem FALHA |
| Testes que citam classe de borda | nenhum (`git grep` em `tests/` vazio) |
| `git grep "<hr" -- src` | vazio |
| Textos "tempo real" / "com atraso" nas linhas adicionadas | nenhum no código |
| `git diff` fora de classes de borda | só a descrição de `primeiros-passos` do 2b; nenhuma mudança de texto, cor ou espaçamento do 2c |
| `test:browser` (suítes com MySQL) | **não executado (sem MySQL)** |

Nenhum teste quebrou por causa de 1 px.

## 7. Compartilhados que ficaram e o que não pôde ser conferido

- Compartilhados que ficaram: `.section-masthead` (`index.css:247`, usado em `/ranking`, `IncomeRanking` e a empresa pública), `LiveQuote`, `RankingFundamentals`, `Card`, `PageContent`, `dividend-research.css`, `tooltip.css`, `research-section-nav.css`, `research-ranking-table.css`, `navigation-chrome.css` e `stock-make/`.
- Não pôde ser conferido em imagem: `/app/perfil`, `/app/config`, `GettingStarted` (conta) e a empresa logada `/app/ranking/acao/:ticker`. As decisões foram por leitura do código.
- Decisão do Orquestrador: a faixa de indicadores da empresa logada (`StockResearch.tsx:250`) ficou com `border-y` (moldura dos indicadores), restaurado exatamente como em `bedcb5f`.

## Ajuste posterior: botão "Abrir minicurso" do visitante

Achado 1 da revisão (Lupa). Em `src/components/LearningCourseCarousel.tsx`, para o visitante, o botão "Abrir minicurso" do curso que contém a aula aberta leva agora a `openLessonId` (Ações), e não à primeira aula da ordem (Corretora, trancada). Para quem tem conta, o cálculo é o mesmo de antes.

- Teste novo: `tests/browser-experience.mjs`, "Visitante clica em Abrir minicurso de Primeiros passos e cai na aula aberta" (espera a URL `aula=acoes` e o título da aula aberta). **Não executado aqui (sem MySQL).** Foi conferido por leitura e `node --check`.
- Os resultados de lint, tsc, build e `npm test` deste ajuste estão na resposta ao Orquestrador.
