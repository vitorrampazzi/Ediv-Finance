# Revisão visual e experiência de ações — 24/10/2026

## Referências e evidências

Os arquivos ficam em `C:/Users/vitor/Pictures/Screenshots/`.

| Captura | O que foi observado | Decisão de produto |
| --- | --- | --- |
| 2026-10-23 182701 | AGF: identidade, seis KPIs, navegação compacta, gráfico de cotação e estatísticas | Hierarquia compacta, navegação logo abaixo da identidade e comparações apenas com a fonte disponível |
| 2026-10-23 182732 | AGF: proventos, gráfico amplo e tabela anual lateral | Gráfico e leitura numérica juntos; calendário habitual real, sem histórico anual inventado |
| 2026-10-23 182753 | AGF: relatórios e grupos financeiros alinhados | Cinco categorias densas, rótulo/valor/ajuda; sem relatórios, autoria ou reuniões fictícias |
| 2026-10-23 182757 | AGF: continuação das categorias e retornos por período | Preservar todas as métricas disponíveis, sem retornos ou indicadores adicionais sem fonte |
| 2026-10-23 182801 | AGF: LPA, resultados, histórico e dados financeiros | Lucro/LPA/CAGR existentes; comparação LPA/DPA na mesma unidade, sem receita/EBITDA fictícios |
| 2026-10-23 182804 | AGF: informações corporativas com navegação lateral | Identidade e dados corporativos existentes, sem completar cadastro com suposições |
| 2026-10-23 183151 | Escola: cabeçalho da tabela excessivamente alto | Preservar altura uniforme e acrescentar empresa fixa e compacta em telas pequenas |
| 2026-10-24 163732 | Escola: contorno no título da home autenticada | Corrigir causa de foco/estilo, preservando o foco dos controles e a orientação na troca de rotas |
| 2026-10-24 172221 | Escola: dica do botão da conta presa sobre o menu; item Início sem ícone | Distinguir ponteiro/teclado e fechar a dica na ativação; adicionar House sem mudar o destino |
| 2026-10-24 172508 | Suno: rentabilidade com várias séries e legenda, proventos e agenda | Referência funcional para séries quando houver fonte autorizada; não transpor valores nem dados pessoais |

As dez imagens foram fornecidas pelo proprietário. Não são uma fonte de dados
financeiros para o produto. Não copiar código, marca, ativos ou textos das plataformas.

## Inspeção nas abas fornecidas

AGF: `https://app.agf.com.br/investimento/carteira/empresa/raio-x/wizc3`.
Estrutura completa enumerada por títulos: cotação, agenda, proventos, análises,
indicadores, resultados, aluguel e informações corporativas. A navegação de
Proventos foi acionada; observou-se barra fixa, gráfico com tabela lateral e
estatísticas. As categorias incluem avaliação, dívida, rentabilidade, eficiência,
crescimento, dividendos, mercado e retornos. Somente categorias compatíveis com
os dados próprios entram na Escola.

Suno: `https://investidor.suno.com.br/macroeconomia`.
A URL enviada é de macroeconomia, não uma página individual de ação. A tabela
de variáveis oferece Ver Gráfico; a interação foi observada abrindo um modal
com gráfico de linha trimestral e fechamento explícito. A captura de rentabilidade
é uma evidência visual separada. Não se alega que o modal observado contém aquela
carteira, nem se utilizam dados pessoais ou números da Suno.

## Limite de REA

O MCP REA está conectado e suas ferramentas de navegador foram inspecionadas.
Elas requerem um endpoint CDP de loopback explícito, que não foi disponibilizado
pelas abas conectadas. A consulta de processos CIM estava indisponível e o
diagnóstico interno do Chrome foi bloqueado pela política de navegação. Não houve
tentativa de contornar esse bloqueio, reconfigurar ou reiniciar o navegador.
A investigação funcional usa o navegador autorizado; não é uma captura do REA.

## Dados e arquitetura preservados

A fonte é a publicação própria importada da planilha, com 21 campos, data de
referência20/10/2026 e premissa histórica6,81%. Não existem contratos de séries
históricas, benchmarks ou novos cadastros corporativos nessa base. Cotação pontual
da brapi não substitui os valores da pesquisa. Eventos privados de carteira não
são proventos corporativos globais; módulos demonstrativos não alimentam o produto real.

Reutilizar Recharts, Lucide, Tooltip, CompanyLogo, dividend-analysis e
dividend-insights existentes. Sem novos pacotes, infraestrutura, credenciais ou
migrações. Público limitado a três empresas/três KPIs e ranking completo autenticado.

Também foram acionados Cotação/1M/checkbox de preços-teto, Indicadores,
Resultados e Info. da empresa na AGF. Período e checkbox mudaram de estado;
isso não certifica entrega ou exatidão das séries externas. Os controles foram
devolvidos a1D/desmarcado. Nenhuma série externa alimenta a Escola.

## Causas e correções

O contorno do título vinha do foco programático em todo H1 na montagem da rota,
combinado à regra global :focus-visible. PageContent evita esse foco na entrada
direta das duas homes. A exceção visual é restrita a títulos não interativos com
tabindex=-1 dentro da página. Controles e orientação na troca de rota continuam
com foco acessível; não foi removido o outline global.

O Tooltip conservava a dica ao sair do ponteiro quando o clique deixava o botão
focado. Agora distingue foco visível de teclado, fecha na ativação e não abre
sobre menu expandido. Escape/blur, aria-describedby e limites do viewport foram
preservados. width:max-content com o limite existente evita a faixa vertical
estreita junto à borda; o teste aguarda o posicionamento final do popover.

Empresa usa sticky left:0 em cabeçalho/corpo, fundo opaco nos dois temas, camadas
3/2 e divisor lateral. Largura144px abaixo de768px/224px nas demais, compartilhada
por colgroup/largura total, inclusive na tabela com posição. Nome/logo/ticker,
ordenação e filtros são preservados. Início no perfil ganhou House16px aria-hidden,
mantendo /app e a mesma ação.

## Composição e gráficos

Identidade, data/fonte e seis KPIs antecedem imediatamente a navegação. Seções:
Visão geral, Cotação, Dividendos, Indicadores, Resultados e Informações da empresa.
Cinco categorias: Avaliação, Caixa e endividamento, Rentabilidade, Dividendos e
Mercado. Os21campos canônicos continuam únicos; resumos não os substituem.

Quatro comparativos pontuais Recharts: cotação/preço teto; payout/referência100%;
P/L projetado/média10anos; LPAestimado/DPAprojetado. O último usa reais por ação
nos dois valores, nunca o lucro total nessa escala. Fonte/data, unidades e oito
valores textuais acompanham os gráficos; Mostrar preço teto altera a comparação.
Null não vira barra zero; negativos, zero e payout acima de100% são preservados.
O calendário mostra somente meses habituais declarados, sem prometer pagamentos.

Gráficos/estatísticas usam proporção2/3+1/3 em telas largas; categorias usam3colunas
a partir de1600px,2intermediárias e1no celular. KPIs usam6/3/2colunas. Navegação e
tabela rolam localmente; âncoras consideram cabeçalho fixo e Voltar ao topo retorna
à identidade com foco. Foram retirados cards contornados, eyebrows, ícones de
categoria e avisos repetidos. Georgia local aparece somente no nome da empresa.
Nenhuma fonte externa ou nova dependência foi adicionada.

Reutilizados React/Router, Recharts, Lucide, Framer Motion, tokens de dois temas,
Tooltip, CompanyLogo e os helpers de análise existentes. Revisão de React:
efeitos com limpeza, tipos, controles nativos, foco e nenhuma requisição nova.

## Arquivos e papéis

Produto: src/components/DividendDashboard.tsx, fundamental-center.css,
ComparativeDividendChart.tsx, DividendResearch.tsx, dividend-research.css,
Tooltip.tsx, tooltip.css, PageContent.tsx; src/index.css e
src/layouts/DashboardLayout.tsx.
Regressões: tests/company-center.browser.mjs, dividend.browser.mjs,
public-rankings.browser.mjs, notifications.browser.mjs e
visual-interactions.browser.mjs. Este relatório completa o escopo publicado.

Coordenação: referências/foco/Tooltip/perfil/integração. Interface: central/tabela
e três testes afetados. Backend: inventário de fontes somente leitura. QA:
revisão independente das dez fontes congeladas, navegador/evidências próprios.
Chats existentes reutilizados, sem duplicar papéis ou reiniciar terminais.

## Verificações da implementação

Node22: typecheck, lint integral e build de produção/prerender passaram.
Coordenação: focal320/1440px×dois temas passou para entrada das homes, títulos,
foco interativo, navegação por teclado, perfil/House/href e dicas mouse/teclado/
Escape. Notificações17/17PASS: carregamento frio Vite excedia5s; só navegação do
teste foi ampliada para30s, mantendo asserts funcionais em5s.

npm test na cópia:119/122PASS; três erros ENOENT do quadro excluído de propósito.
Os sete testes do harness e seu check passaram na pasta original. Não foi copiado
state.json para criar outro quadro. CI com checkout completo confirma o conjunto,
incluindo instalação limpa, integração SQL, browser e backup.

Interface: sete grupos únicos PASS, incluindo três empresas×21campos,14combinações
responsivas, oito valores textuais/foco/Escape, âncoras/estado ativo,11colunas,
layout completo22com posição e null/zero/negativo/payout150%/meses indefinidos.
O cenário completo é SSR do componente real: prova layout, não auth/admin real.

Prévia local readonly4210/4211, fixtures auditadas, escrita405 e nenhum banco ou
credencial humana. Sem migração ou escrita em produção. Comparativos não são
históricos; projeções não são resultados realizados. Não executados leitores de
tela reais, Firefox/Safari ou auditoria formal axe/Lighthouse.

## Revisão independente e evidências

QA conferiu duas empresas×21campos,14/14combinações de tamanho/tema,21unitários,
8layouts SSR de tabelas21/22colunas e2casos de dados extremos. Público3/3+CTA,
privado10+10/foco/busca, âncoras e oito valores textuais passaram. Nenhuma escrita,
endpoint inesperado ou pageError nas fixtures. SSR não certifica autorizaçãoHTTP.

A revisão identificou P2 nos quatro gráficos: depois de Escape, blur e retorno,
a seta não reabria a dica. A primeira abertura e os botões textuais funcionavam.
Isso exigiu correção/revisão focal do componente compartilhado; a matriz visual
permanece válida se CSS/composição/fontes não mudarem. A conclusão final consta
no registro de entrega abaixo e no relato do QA, sem converter o resultado
intermediário com falha em aprovação.

Evidências locais em `.test-artifacts/professional-research/qa/before` e `after`:
home pública/membro, ranking após rolagem e detalhe em todas as14combinações;
perfil/cotação em375/1440nos dois temas. Exemplos comparáveis:
`before/1440-dark-member-home.png` → `after/1440-dark-member-home.png`;
`before/375-light-profile-menu.png` → `after/375-light-profile-menu.png`;
`before/1440-dark-ranking-scrolled.png` → `after/1440-dark-ranking-scrolled.png`;
`before/1440-dark-company-price.png` → `after/1440-dark-company-cotacao.png`.
O foco real da seção em capturas de âncora não é o autofocus indevido da home.
Logos externas foram bloqueadas nas fixtures; disponibilidade real não foi
certificada por essas capturas. Relatos independentes ficam em
`docs/harness/relatos/qa-visual-2026-10-24.md` e backend-visual-2026-10-24.md.

## Correção focal dos gráficos e publicação

O Recharts preservava o índice ao perder foco, mas desativava a dica; numa borda,
a seta retornava antes de reativá-la. active/defaultIndex ainda podiam priorizar
o último hover. A solução controla somente seleção/visibilidade por teclado no
componente compartilhado, com o mesmo conteúdo e aria-describedby. O hover
permanece nativo. Escape/blur fecham, o retorno reabre e os valores são exatos.
Não há remount, reset de foco, import privado, dependência nova ou dado novo.

Ao passar o ponteiro sobre a própria dica do segundo valor, uma revisão adicional
encontrou troca pelo dado que estava abaixo. O handler passou a ativar hover só
na área do gráfico; título, rodapé e própria dica preservam a leitura. Os valores
textuais dispensam a dica do SVG antes de abrir a própria, evitando duplicação.
Regressão cobre conteúdo, posição, foco, descrição, Escape e ambos os valores.

Antes da integração são exigidos parecer final do QA sobre o arquivo afetado,
quality e dependency-security no mesmo head, main atualizada e revisão dos16paths.
A proteção exige PR: não há push direto, force-push, bypass, deploy manual ou
alteração de infraestrutura. A integração main aciona a publicação automática
existente na Vercel/ediv-finance, conferida na entregaPR19. O SHA e os resultados
finais ficam no registro da PR e no relatório de entrega local, pois um commit
não pode conter seu próprio hash.

Permanecem pendentes de fonte: históricos de cotação/proventos/resultados,
benchmarks e novos dados corporativos. Não foram substituídos por demonstrações,
carteiras privadas nem dados das plataformas de referência.
