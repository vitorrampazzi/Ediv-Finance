# Home pública: composição e revisão

## Estrutura

`Home.tsx` mantém a verificação de sessão, o estado de recuperação e o redirecionamento
para `/app`. O visitante recebe `PublicHome`. `HomeContent` continua exportado;
seu corpo anterior está em `AccountHomeContent.tsx`, usado diretamente por
`MemberHome`, com o mesmo conteúdo e comportamento.

| Arquivo em `src/components/home/` | Papel |
| --- | --- |
| `PublicHome.tsx`, `public-home.css` | Hero, índice, mercado e CTA final |
| `PublicHeroPanel.tsx`, `hero-panel.css` | Temas Empresa/Pesquisa/Dividendos e calculadora |
| `TeachingJourney.tsx`, `teaching-journey.css` | Narrativa de rolagem e ilustrações |
| `ResearchSample.tsx` | Três exemplos locais, tese e riscos expansíveis |
| `ReadingChecklist.tsx` | Tese, prazo, data, riscos e metodologia |
| `LearningTerms.tsx`, `src/lib/publicHomeTerms.ts` | Quatro definições e controles nativos |
| `PublicQuestions.tsx`, `public-sections.css` | FAQ e estilos das seções |
| `usePublicHomeMotion.ts` | Entradas únicas e pausa dos loops fora da viewport |

O mercado reutiliza `HomeMarketHighlights` sem mudanças, com os mesmos filtros,
consulta e estados. A disponibilidade de cadastro usa o hook existente em `Home`.
Não há nova dependência, fonte externa, consulta, alteração de API ou migração.
Header, footer, autenticação e permissões permanecem com o fluxo existente.

## Design e movimento

Tipografia editorial, fundo escuro, linhas finas e verde nas ações. A home alterna
faixas dos tokens existentes. As entradas usam CSS; observadores de interseção
selecionam a etapa da narrativa e pausam sinais fora da tela. O scroll permanece
nativo. Miniaturas continuam ocupando o mesmo espaço antes e depois do JavaScript.
No celular, os trechos de estudo ficam empilhados.

O painel inicia em Dividendos, com lucro fictício de R$ 100 milhões, 50 milhões de
ações e distribuição de 40%. `100 milhões × 40% ÷ 50 milhões = R$ 0,80 por ação`.
O slider aceita 0–100% em passos de 5. O valor final acessível é separado do
count-up visual. Preferência por movimento reduzido desliga os efeitos.

Textos seguem as orientações do Humanizer: ações diretas e detalhes do produto.
Os rótulos dos exemplos permanecem visíveis. As definições locais foram confrontadas
com as aulas e o glossário existentes; devem acompanhar futuras revisões editoriais.

## Verificação realizada

- Lint, TypeScript, testes unitários e build com pré-renderização.
- HTML de `dist/index.html`: um H1, oito seções, âncoras, labels e R$ 0,80 presentes;
  nenhuma classe de ocultação progressiva no HTML emitido.
- Vite preview revisado em 360, 768 e 1366 px, sem rolagem horizontal.
- Abas, slider por teclado (0%, 5%, 40%, 100%), exemplos, glossário e FAQ.
- Cadastro aberto/fechado e mercado com dados, vazio e erro, usando fixtures locais.
- HTML sem scripts da aplicação: conteúdo completo e FAQ nativo funcionando.
- Movimento reduzido: cenário local que simula `matchMedia` e aplica os blocos CSS
  correspondentes. Entradas, loops e spotlight ficaram desligados; screenshots nas
  três larguras. A preferência do sistema/navegador não foi modificada.
- Console da revisão normal: sem erros JavaScript ou avisos de hidratação.

Os dados de mercado da revisão são simulados. Nenhum teste acessou MySQL/Aiven,
enviou e-mail, criou conta ou usou credenciais. Não foram executadas as suítes de
integração/banco nem os testes de navegador que dependem desses serviços.

## Tamanho dos arquivos

Valores medidos com `gzipSync`, em bytes; chunks individuais, sem representar a soma
de todas as requisições da página.

| Arquivo/grupo | Antes | Depois |
| --- | ---: | ---: |
| JavaScript do chunk Home | 6.762 | 9.102 |
| JavaScript da home compartilhada, extraído | dentro de Home | 6.601 |
| CSS específico da home pública | — | 5.222 |
| JavaScript principal | 75.794 | 75.864 |

O texto, as cenas e as interações aumentam o código da rota. O núcleo praticamente
mantém o tamanho anterior; Framer Motion não foi usado. Dados novos não entram no
bundle por chamadas extras.

## Fora deste trabalho

Lista de espera por e-mail, analytics e edição de conteúdo exigem um trabalho próprio.
A mudança não inclui novas páginas nem redesenho da área da conta.

Referência anterior à mudança: commit `2f0fa8d`. Um rollback deve reverter apenas
os commits desta home, preservando alterações posteriores.
