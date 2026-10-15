# Experiência da Ediv no celular

Referências consultadas em 14 de outubro de 2026. O objetivo é facilitar a leitura de pesquisas de ações e o aprendizado sobre dividendos em telas pequenas.

## Referências públicas

| Referência oficial | Padrões observáveis | Decisão para a Ediv |
| --- | --- | --- |
| [AGF — aplicativo](https://agf.com.br/aplicativo) e [home](https://agf.com.br/) | Busca por empresa ou ticker; funcionalidades apresentadas em blocos curtos; destaque para ranking, filtros e educação. A apresentação inclui uma imagem específica do ranking no celular. | Pesquisa e aulas devem ser destinos claros. A busca precisa estar visível nas páginas de consulta. |
| [Status Invest](https://statusinvest.com.br/) | Busca destacada; listas de altas, baixas e dividendos com ticker, números e acesso a “Ver todos”. | Mostrar resumos fáceis de comparar e levar os detalhes para a página da empresa. |
| [Investidor10](https://investidor10.com.br/) | Rankings resumidos em poucas posições, com ticker, empresa e métrica; links para aprofundamento; dividendos e aprendizagem agrupados por tarefa. | Priorizar ranking e educação. Exibir informações adicionais conforme a pessoa explora. |

### Limite da comparação

Foram consultadas páginas públicas e a apresentação oficial do aplicativo da AGF. As áreas privadas dos concorrentes não foram auditadas. Não foram medidas suas transições, velocidade, acessibilidade ou áreas de toque, nem avaliadas suas práticas de segurança. Os padrões de conteúdo acima orientam o projeto; não comprovam a qualidade de toda a experiência móvel de cada serviço.

## Decisões de interface

- **Leitura compacta:** títulos diretos, uma descrição curta e poucos indicadores por empresa. Tese completa, metodologia e conteúdo complementar ficam no detalhe ou em blocos expansíveis. A lista continua mostrando os rótulos necessários para entender os números.
- **Navegação persistente:** na área da conta, manter Início, Ranking, Análises e Aprender na barra inferior do celular. Cabeçalho e menu permanecem disponíveis durante a troca de conteúdo. No desktop, preservar o menu lateral.
- **Busca e filtros:** deixar a busca por empresa ou ticker visível. Filtros adicionais podem ser recolhidos, com indicação quando houver filtros ativos e ação para limpar.
- **Transições discretas:** animar somente a entrada do conteúdo da página, usando um deslocamento de 5 px e spring sem oscilação. Manter o conteúdo visível desde o HTML inicial. Evitar espera artificial, animação de toda a tela ou movimento a cada digitação. Respeitar a preferência do dispositivo por movimento reduzido. Esses critérios são decisões da Ediv, não características medidas dos concorrentes.
- **Carregamento estável:** carregar o conteúdo dentro do layout existente. Antecipar os módulos dos destinos principais em interações de navegação pode reduzir a espera percebida. Isso não substitui a consulta dos dados nem altera as permissões.
- **Orientação ao navegar:** abrir uma nova pesquisa no começo da página. Para evoluções futuras, considerar preservar filtros e posição ao voltar para a lista. Manter foco acessível e indicação clara do destino ativo.

## Mapa para o desenvolvedor

| Área | Arquivos principais | Papel |
| --- | --- | --- |
| Home pública e da conta | `src/pages/Home.tsx` | Proposta curta e acessos para pesquisa e aulas. |
| Navegação da conta | `src/layouts/DashboardLayout.tsx` | Cabeçalho, menu lateral e quatro destinos da barra inferior. |
| Ranking | `src/pages/IncomeRanking.tsx` | Busca, filtros e resumos clicáveis das pesquisas. |
| Análises | `src/pages/analises.tsx` | Busca de ações e ordenação do catálogo. |
| Cursos | `src/components/LearningCourseCarousel.tsx` | Navegação entre cursos com rolagem horizontal. |
| Rotas e carregamento | `src/App.tsx` | Composição das páginas, módulos carregados sob demanda e comportamento de navegação. |
| Conteúdo da página | `src/components/PageContent.tsx` | Transição do conteúdo e indicadores de carregamento dentro do layout. |
| Intenção de navegação | `src/components/NavigationIntent.tsx` e `src/lib/pageImports.ts` | Antecipação dos módulos JavaScript dos destinos de navegação; não antecipa consultas de dados. |

Essa direção mantém o foco da Ediv em pesquisas e educação sobre dividendos. Funcionalidades de carteira dos concorrentes não precisam ser reproduzidas para cumprir essa proposta.

## Refinamento de interface — 15 de outubro de 2026

Aplicação dos princípios da habilidade `apple-design` à identidade existente da Ediv:

- Grafite `#1c2025` no fundo, superfícies `#242a30` e verde `#a9d9d1` nos detalhes. Os tokens compartilhados ficam em `src/index.css` e `tailwind.config.js`.
- Tipografia do sistema na área da conta e nas aulas, números tabulares e títulos com espaçamento ajustado por tamanho. A home pública conserva os títulos editoriais em serifada.
- Controles com área mínima de 44 px, feedback ao pressionar e indicadores de seleção com spring sem bounce. Abas da home e do início da conta aceitam setas, Home e End.
- Menus surgem junto ao botão de origem; Escape fecha e devolve o foco. O cabeçalho tem fundo quase sólido para evitar que o conteúdo de trás prejudique a leitura.
- Carrossel e playlist usam a rolagem nativa do navegador no celular. A interface não bloqueia novas interações durante as transições.
- Definições do glossário expandem com `details`, sem rotação em 3D. Removidos o pontilhado, o efeito de luz seguindo o mouse e os movimentos decorativos contínuos da home.
- Preferências de movimento reduzido, contraste e transparência têm alternativas. Os vídeos ainda não publicados continuam indicados como em preparação.

Revisão visual local em 360 × 800, 390 × 844 e desktop de 1366 × 900, com dados fictícios. Esta revisão de interface não substitui testes funcionais de cadastro, banco, e-mail ou aparelhos físicos.
