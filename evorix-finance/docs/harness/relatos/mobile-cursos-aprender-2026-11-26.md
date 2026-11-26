# Relato: /aprender e /app/aprender no celular (Brief 2a, Pincel)

Data: 2026-11-26. Branch de trabalho: `mobile-cursos-2026-11-26`, base `fc56928`. Sem commit.

## Arquivos alterados

- `evorix-finance/src/pages/Aprender.tsx`: cabeçalho em camadas (texto à esquerda, animação à direita), barra de progresso do cabeçalho com `hidden sm:block`, espaçamentos do painel (`space-y-7`), link "Todos os minicursos" com `min-h-11`, link da fonte com `min-h-11`.
- `evorix-finance/src/pages/aprender.css` (novo): grid do cabeçalho e tamanho da animação abaixo de 640 px.
- `evorix-finance/src/index.css`: só no bloco `.section-masthead.section-masthead--sem-linha`, `padding-bottom: 0` abaixo de 640 px. A classe é usada apenas em `Aprender.tsx`.
- `evorix-finance/src/components/learning-workspace.css`: trilho da barra de progresso `--ediv-line` → `--ediv-border`.

Não alterados: `LearningQuiz.tsx` (o `aria-hidden` que o brief pedia já estava em uma linha no arquivo; a substituição não encontrou o texto, git diff vazio), `LearningCourseCarousel.tsx`, `LearningJourney.tsx`, `LearningPlaylist.tsx`, `LearningVideo.tsx`.

## Causas (resumo)

- Cabeçalho: a animação ocupava uma linha inteira e empurrava as abas para baixo. Agora fica em coluna à direita, 4,25 rem no celular.
- Barra de progresso: a faixa de 4 px no celular ocupava espaço sem informação útil. Escondida abaixo de 640 px.
- Espaçamento entre blocos: margens e `pt-7` inconsistentes. Agora `space-y-7` e `scroll-mt-24`.
- Padding inferior do masthead: removido só na variante sem linha, abaixo de 640 px.

## Decisões (D1 a D5 do brief)

- D1: "Aulas e exercícios" continua dentro do bloco de texto, sob a descrição, em todas as larguras. A coluna da direita tem só a animação.
- D2: sem mudança em `viewport-fit`.
- D3: trilho com `--ediv-border`; fundo da barra do cabeçalho com `bg-evo-border`.
- D4: título `1.75rem` abaixo de 640 px, `sm:text-5xl` acima.
- D5: links de fonte com `min-h-11`.

## Critérios 1 a 7 (medidos com `auditoria-mobile.mjs`, 127.0.0.1:4194)

| # | Critério | Antes | Depois | Situação |
|---|---|---|---|---|
| 1 | Card "Sua próxima aula" → "Minicursos" (24 a 40 px) | 0 px (logado) | 28 px | Atendido |
| 2 | Cabeçalho → abas (16 a 32 px) | 44 px | 24 px em 320/360/390 | Atendido |
| 3 | Barra do cabeçalho some abaixo de 640 px e aparece a partir de 640 | Visível em todas as larguras | Oculta em 320/360/390; visível em 768 e 1280 | Atendido |
| 4 | Animação de 60 a 72 px de largura no celular | Maior que 72 px | 68 × 64 em 320/360/390; 128 × 118 em 1280 | Atendido |
| 5 | CLS ≤ controle + 0,01 | Logado: 360 (3 aulas) 0,0622; 390 (sem aulas) 0,0649 | Logado: 360 (3 aulas) 0,0774 (+0,0152); 360 (sem aulas) 0 (sem mudança); 390 (sem aulas) 0,0791 (+0,0142); 390 (3 aulas) 0,0718 (+0,0069) | **Não atendido** em 360 e 390 para o logado. Visitante: +0,002 (dentro do limite). Ver nota abaixo |
| 6 | Carrossel íntegro em 320; setas com 44 px | Íntegro | Íntegro (cartão inteiro na tela), setas 44 × 44 | Atendido |
| 7 | Espaçamento uniforme ≥ 16 px entre blocos | 0 a 20 px | 28 px | Atendido |

Nota do critério 5: o deslocamento ocorre quando o painel de aulas troca o esqueleto do carrossel pelo conteúdo carregado (`section.space-y-7` sobe de 579 para 443 px e cresce de 265 para 401 px; o viewport do carrossel passa de 93 para 0 px). Esse deslocamento existe também na versão anterior. O aumento vem de o cabeçalho ter ficado mais baixo, o que aproxima o painel do topo da tela e amplia a área afetada. Não confirmei a causa com a versão anterior medida na mesma sessão. Corrigir exige reservar altura para o carrossel durante o carregamento, o que é mudança de layout fora da lista aprovada; deixo para decisão do Orquestrador.

Medições repetidas (duas rodadas de antes e de depois, 360 e 390, logado): os valores ficaram estáveis dentro de 0,001 em cada build.

## Testes e comandos

- `npm run lint`: passou (0 erros) após as edições.
- `npx tsc -b`: passou.
- `npm run build`: passou após as edições. Verificado `research-visual` em `dist/aprender/index.html` (1 ocorrência, pré-renderizado).
- `npm test`: 318/318.
- `node --test tests/seo.dist.mjs`: 9/9.
- `node --check` em `tests/browser.mjs`, `tests/browser-experience.mjs`, `tests/accessibility.browser.mjs`: OK.
- `npm run test:public-home`: **falhou de forma intermitente**. Rodada 1: desktop com diferença de pixels no modo reduzido e falha de "desktop". Rodada 2: só falha de "desktop", por uma requisição a `/api/support/information` que o teste não espera; o modo reduzido passou. Não alterei a home. A classe alterada não aparece nela. Não verifiquei se a falha existe também na versão anterior.
- Auditoria completa "depois": 0 falhas, sem rolagem horizontal, axe sem violações graves ou críticas.
- Movimento reduzido: animação sem animações ativas. Movimento normal: 6 de 42 filhos animados.
- Testes de navegador (`browser.mjs`, `browser-experience.mjs`) não rodaram aqui (dependem de banco). Não encontrei texto ou seletor que precise mudar: a barra some só abaixo de 640 px e os testes de desktop leem em 1366 px. Confirmar na CI.

## Prints

Fora do repositório, na pasta de capturas da auditoria do 2a (nome `pincel-2a/shots`):
- `antes-aprender-{320,360,390,768}.png`, `antes-aprender-360-escuro.png`, `antes-aprender-390-escuro.png`
- `antes-app-aprender-3ex-{320,360,390,768}.png`, `antes-app-aprender-0ex-{320,360,390,768}.png`
- `depois-…` com os mesmos nomes.

## Testes de texto

Nenhum texto de produto foi alterado. "Aulas e exercícios" continua na mesma posição (D1). Nenhum travessão foi adicionado; não há novas linhas de divisória, `hr`, `border-t`/`border-b` ou `divide-y`.

## Dúvidas abertas

1. CLS do logado em 360 e 390 acima do limite (critério 5). Preciso de decisão: reservar altura do carrossel (mudança de layout) ou aceitar.
2. Falha intermitente de `test:public-home` (requisição a `/api/support/information`). Não verificada na versão anterior.
3. Testes de navegador não executados localmente.
