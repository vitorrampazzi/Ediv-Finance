# Interface — diagnóstico inicial

Data: 17/10/2026. Sessão: `01a14ae9-3f53-7342-b035-70139d7aed44`.
Objetivo: revisar estaticamente ranking → pesquisa → aprendizado, sem alterar produto.
Aceitação: até três achados verificáveis, próximos passos e evidência de uso do quadro.

## Achados

### I01 — P2: confirmação de persistência mesmo quando o navegador recusa a gravação

Em `src/pages/Aprender.tsx:237`, o efeito que salva o progresso do visitante
captura a falha de `localStorage.setItem` sem atualizar estado de erro
(`:240–243`). O quiz, em `src/components/LearningQuiz.tsx:70–76`, declara
incondicionalmente, após conclusão do visitante, que o progresso foi salvo neste
navegador. A mesma promessa aparece no cabeçalho da página.

Gatilho: visitante com armazenamento indisponível responde corretamente à aula
aberta. A conclusão existe em memória, mas a interface promete persistência que
não aconteceu; ao recarregar, ela se perde.

Próximo passo: distinguir conclusão em memória de gravação local, informar falha
de persistência e manter a aula utilizável. Aceitação proposta: simular `setItem`
lançando uma exceção e verificar aviso explícito, ausência da confirmação de
salvamento e manutenção do exercício concluído durante a sessão atual.

### I02 — P3: retorno após autenticação perde a seção específica da pesquisa

`src/components/RankingAccessLanding.tsx:13–15` monta o destino com pathname e
search, descartando `location.hash`. Esse componente é apresentado a visitantes
em `src/pages/StockResearch.tsx:62`; o destino segue para o `AccountGate` em
`RankingAccessLanding.tsx:55–59`, que o usa para login/cadastro.

Gatilho: visitante abre `/ranking/acao/EXEMPLO?visual=demo#riscos` e entra por
esse gate. O destino entregue ao login preserva empresa e versão, mas já não
contém `#riscos`; o retorno não conserva a intenção de abrir a seção de riscos.

Próximo passo: preservar a âncora ao compor o destino permitido. Aceitação
proposta: teste do link gerado para login e navegação de retorno mantendo
pathname, query e hash, sem enfraquecer a validação de destinos de autenticação.

## Comportamentos positivos conferidos

- `IncomeRanking.tsx:131–145` propaga filtros e modo no link da pesquisa;
  `StockResearch.tsx:121–127` reconstrói a volta ao ranking com esses parâmetros.
- `LearningPlaylist.tsx` implementa setas/Home/End, foco no botão selecionado e
  anúncio de posição; `Aprender.tsx:528–532` reinicia o player por ID da aula.
- Erros do conteúdo e de gravação na conta têm mensagens e ações de recuperação;
  não foi identificado motivo para substituir esses fluxos nesta rodada.

## Verificações e limites

- Leitura de AGENTS, contexto, fluxo, mapeamento e relatos: concluída no cwd correto.
- `node scripts/harness.mjs status`: passou; confirmou os três papéis e atividade
  simultânea das sessões de coordenação e backend.
- `claim interface docs/harness/relatos/interface.md` e `update interface trabalhando`:
  passaram e persistiram reserva/fase no quadro compartilhado.
- `node scripts/harness.mjs check`: passou, sem sobreposição de reservas.
- Leitura por `rg`, trechos numerados e verificação textual com Node confirmaram
  o tratamento silencioso da falha local e ausência do hash no gate.
- Sem execução em browser, leitor de tela, servidor, API ou banco; achados são
  análise do caminho de código, não reprodução visual/end-to-end.
- Não foram instaladas dependências nem executados lint/build/testes do aplicativo.
  Ausência de dependências e divergência CSP já estão sob análise da coordenação/backend.
- Arquivo de produto alterado: nenhum. Arquivo escrito por esta sessão: este relato.

## Encaminhamento

Coordenação deve priorizar I01 e I02 em tarefas futuras delimitadas; nenhuma
correção foi iniciada. Estado ao entregar: `revisao`, reservas liberadas.

## Rodada 2 — alternância claro/escuro

Autorização recebida da coordenação em 17/10/2026: card darkmode
`https://trello.com/c/qdn5nYW9`; implementar e entregar para integração/publicação
pela coordenação. I01 e I02 permanecem fora desta rodada.

### Implementação

- `public/theme-init.js`: bootstrap externo síncrono no head de `index.html`,
  antes de estilos/markup; respeita `script-src 'self'`, sem precisar liberar
  inline scripts. Resolve escolha local ou preferência do sistema antes da
  primeira pintura; atualiza `data-theme` e meta theme-color.
- `src/lib/theme.ts`: hook `useSyncExternalStore`, snapshot estável para SSR e
  um único store/listener global. Sem Provider obrigatório para prerender.
- `src/components/ThemeToggle.tsx`: controle nativo de aparência com alvo 44px,
  rótulo acessível e opções sistema/claro/escuro; teclado e touch usam o select
  do navegador. Ícones dependem de CSS, preservando markup de SSR.
- `SiteChrome.tsx` e `DashboardLayout.tsx`: controle no header público e no
  header autenticado, também em viewport móvel. Não alterei `PublicHome.tsx`.
- `RegistrationChallenge.tsx`: tema do Turnstile acompanha o site e token é
  invalidado ao recriar o widget; controles de segurança preservados.
- `tailwind.config.js` e `src/index.css`: paletas semânticas para fundos,
  superfícies, texto, bordas, acento e estados; claro verde suave e escuro
  preservando a identidade. Cor de seleção/foco/scrollbar também usa tokens.
- Onze CSS existentes convertidos: navegação, listas de mercado, índice de
  pesquisa, segmented control, workspace de aulas, ranking e cinco CSS da home
  (`public-home`, `public-sections`, `hero-brand`, `hero-panel`, `teaching-journey`).
- SVGs legados seguem os tokens por seletor dos atributos de apresentação;
  tooltips/eixos de gráficos usam superfície/texto do tema. Logos externas
  não são recoloridas. A foto do hero recebe overlay claro no tema claro.

### Persistência e integração

Chave versionada `ediv-appearance-v1`. Escolha explícita persiste; sistema remove
o override e acompanha mudanças live. Eventos storage sincronizam outras abas.
Armazenamento bloqueado/quota não lança erro para o React: mantém escolha em
memória nesta página. Snapshot SSR é constante; o bootstrap controla a pintura
pela raiz, sem acessar window durante render servidor.

Logos e seus TSX/CSS dedicados pertencem ao backend. Apenas tokens foram
comunicados a essa sessão. `src/main.tsx` foi reservado para eventual integração,
mas não precisou de mudança. Package scripts/test gates pertencem à coordenação.

### Verificações desta rodada

- `node --test tests/theme.test.mjs`: **7/7 passaram**, também no Node **22.23.3**
  disponibilizado localmente pela coordenação. Cobre escolha antes de React,
  persistência/reload, dados inválidos, storage indisponível, mudança do sistema,
  override, sincronização entre abas, assinaturas e contraste das duas paletas.
- Contraste calculado dos tokens text/muted/accent/green/red contra canvas,
  surface e inset: **todas as combinações ≥ 4,5:1**. Isso verifica as paletas,
  não substitui auditoria de cada composição/transparência no navegador.
- ESLint focado em hook, controle, chrome, layout autenticado e Turnstile:
  **passou sem avisos/erros**.
- `npm run build`: **passou**, incluindo TypeScript, Vite cliente e SSR,
  pré-renderização das nove rotas públicas (ambiente Node24 global nessa execução;
  coordenação fará gate final Node22).
- Revisão da skill React Best Practices: hooks com dependências completas,
  listeners únicos, snapshot estável/SSR seguro, imports diretos, nenhum fetch
  extra no controle, select nativo rotulado com foco e forced-colors.
- `node scripts/harness.mjs check`: passou, sem sobreposição de reservas.
- Browser final e validação integrada foram encaminhados à coordenação; não
  afirmar reprodução em leitor de tela ou execução de Turnstile real nesta sessão.

### Entrega

Arquivos prontos para revisão integrada. Não fiz commit remoto ou deploy.
A coordenação deve validar home, formulário, painel móvel e pesquisa nos dois
temas, incluindo teclado, persistência após reload e sistema sem override.

## Rodada 3 — botão de tema e remoção de numeração ornamental

Autorização de 17/10/2026: alternar claro/escuro clicando no mesmo ícone, escuro
como padrão independente do SO e retirar números decorativos em todo site.
A nova regra substitui a preferência inicial pelo sistema da rodada anterior.
Ranking tabular e seus módulos permanecem com backend.

### Mudanças

- `ThemeToggle.tsx`: select substituído por botão nativo44px na mesma posição,
  title/aria-label indicam a próxima ação (Ativar tema claro/escuro). Clique,
  Enter e Espaço usam a ativação nativa; foco e forced-colors preservados.
- `theme-init.js` e `theme.ts`: padrão escuro também para valor inválido/legado
  `system`; não consulta matchMedia nem acompanha o SO. Somente light/dark são
  salvos. Persistência, armazenamento indisponível em memória, clear e eventos
  cross-tab continuam tratados. CSS do select removido de `index.css`.
- Removidos prefixos/selos ornamentais de PublicHome (índices), TeachingJourney
  (Empresa/Pesquisa/Dividendos), ResearchSample, ReadingChecklist, LearningTerms,
  GettingStarted (dois layouts), RankingHighlights, Metodologia, ResearchSectionNav,
  StockResearch (04/05), StockResearchInsight e LearningCourseCarousel.
- `learningCatalog.ts`: retirado Curso01/02 das sobrancelhas. Cartões continuam
  com status útil (Disponível/Em estudo/Concluído) e contagem de aulas/exercícios.
- A pedido complementar da coordenação, LearningPlaylist perdeu o badge visual
  redundante01/02 e ResearchEditor perdeu o ordinal ao lado do ticker da lista.
  Ordem acessível AulaX, contagem de aulas, progresso, duração, dados financeiros,
  linhas de erro de importação e passos operacionais do formulário preservados.
- `PublicHeroPanel` mantém selected/03 por ser posição funcional do carrossel.
- CSS de home/public-sections, teaching-journey, research-section-nav e
  learning-workspace ajustado: sem colunas/margens vazias após retirar números.
  Componentes de exemplo mantêm marca, empresa, percentuais e prazo.
- Combinação com backend: adicionados os seis hashes pesquisa-* à whitelist de
  StockResearch para scroll após carga; RankingFundamentals já tem initiallyOpen
  e permanece assim. Não editei RankingFundamentals, IncomeRanking, income-ranking
  ou novos arquivos RankingTable.

### Validação e revisão

- `node22 --test tests/theme.test.mjs`: **7/7 passaram** com escuro padrão
  independente do SO, reload, legado system, storage bloqueado, cross-tab e
  contraste das duas paletas. Nenhuma alteração na paleta desta rodada.
- `tsc -b`: **passou** após os componentes alterados.
- ESLint focado em todos TS/TSX modificados: **passou**, incluindo LearningPlaylist
  e ResearchEditor após a ampliação do escopo.
- Prettier aplicado apenas aos arquivos reservados desta sessão.
- Revisão React Best Practices reaplicada: botão nativo rotulado, props derivadas
  sem estado duplicado, listeners globais deduplicados e sem listener SO, keys
  estáveis preservadas; operações de edição/progresso sem mudança de contrato.
- Busca dos padStart/prefixos restantes identificou somente formatação monetária,
  contador funcional da playlist e posição do carrossel nas áreas desta sessão.
- Browser, build integrado e publicação são da coordenação. Nenhum Git remoto,
  deploy, instalação ou alteração de dados feito nesta sessão.

### Entrega

Arquivos finalizados para revisão integrada. Validar botão nos dois headers,
teclado/touch, escuro inicial com SO claro, persistência/reload, home/metodologia/
pesquisa/aprender sem ornamentos e layout320px depois de retirar colunas.
