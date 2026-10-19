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

## Rodada 4 — contrato frontend do tour (em implementação)

`GuidedTour` recebe `active`, `step`, `onStepChange`, `onComplete`,
`completing?`, `error?` e `notice?`. Seis etapas em `src/lib/guidedTourSteps.ts`:
tema/boas-vindas, início, ranking, análises, aprender e conta (inclui suporte).
Navegação interna por etapa usa replace, sem nova entrada de histórico.
Controlador `AccountOnboarding.tsx` da coordenação decide gatilho/persistência,
captura destino inicial e o restaura ao concluir; esta sessão não modifica auth.
Layout terá targets data-tour inicio/tema/ranking/analises/aprender/conta nos
elementos desktop e mobile. Native dialog modal bloqueia interação fora,
impede Escape/fundo e oferece Voltar/Continuar/Concluir com foco no conteúdo.
Integração acordada: DashboardLayout renderiza AccountOnboarding e ProfileMenu
chama requestOnboardingReplay() ao selecionar Rever introdução. Wrapper restaura
returnTo ao concluir; GuidedTour não decide elegibilidade nem retorno.

### Entrega frontend do tour

Contrato consolidado final em disco: **seis etapas** (índices0–5), compatível
com `onboardingStepCount = 6` do helper da coordenação. Sequência: tema/boas-vindas
→ início → ranking → análises → aprender → conta. Suporte é explicado na conta;
o target suporte também foi preparado no header para extensões futuras.

Arquivos desta sessão: `GuidedTour.tsx`, `guided-tour.css`,
`guidedTourSteps.ts`, `DashboardLayout.tsx` e este relato.

- Modal nativo `dialog.showModal()` em portal no body: fundo inerte, cancel de
  Escape prevenido, sem botão de fechar/pular nem fechamento no clique externo.
- Voltar/Continuar/Concluir exigem ativação explícita. Não há avanço automático.
  Foco vai ao título a cada etapa e Tab/Shift+Tab circulam pelos controles do
  modal. Ao encerrar, restaura foco anterior conectado ou menu da conta.
- Troca de página por `navigate(..., { replace: true })` interno por etapa.
  Destino original, elegibilidade e conclusão são responsabilidade exclusiva
  do wrapper/helper da coordenação. Cadastro/confirmação/sessão não alterados
  nesta sessão.
- Spotlight mede o primeiro target visível entre desktop/mobile, usa viewport
  e altura real do painel para se posicionar, acompanha resize/scroll e mudança
  de página, com centro como fallback quando o alvo não está disponível.
- Primeira etapa inclui ThemeToggle operável dentro do modal (o header por trás
  continua inerte). Paleta usa os tokens existentes de claro/escuro.
- `notice` aparece com role=status DENTRO do dialog para que storage bloqueado
  seja anunciado. Erro de conclusão é exibido com role=alert e tentativa pode
  ser repetida. Observers/listeners são removidos no cleanup.
- Targets estáveis data-tour nas navegações principal/móvel e nos controles de
  tema/conta/suporte. ProfileMenu oferece Rever introdução pela função de replay
  exportada no helper da coordenação. Layout renderiza AccountOnboarding uma
  única vez, sem key de rota e sem duplicar o hook de gatilho.

### Validações

- Node22: `--test tests/onboarding.test.mjs tests/theme.test.mjs`: **13/13 passaram**.
  Os seis testes de onboarding foram criados pela coordenação; esta sessão os
  executou para conferir elegibilidade, retomada, progressão, isolamento e
  degradação de persistência no contrato compartilhado.
- ESLint focado em GuidedTour, guidedTourSteps e DashboardLayout: **passou**.
- TypeScript `tsc -b` com Node22: **passou** após wrapper/helper estarem no disco.
- Revisão React Best Practices: efeitos com dependências completas, callbacks
  de progressão não usados como dependência instável, geometria medida por RAF,
  observers removidos e nenhum dado de autenticação copiado para o modal.
- Browser de modal/foco/spotlight, zoom/mobile320px, navegação até conclusão e
  build integrado: serão executados pela coordenação. Não declarar reprodução
  visual ou aprovação end-to-end a partir dos testes puros.
- Nenhuma instalação, alteração de banco, Git remoto ou deploy por esta sessão.

Estado de entrega: revisão integrada com coordenação; reservas liberadas.

## Rodada 5 — senha e espaçamento de recuperação (em implementação)

Escopo desta sessão: RegisterPage, ResetPasswordPage, Configuracoes (nova senha),
LoginPage e componente PasswordRequirements. Coordenação integra termos depois
da liberação. Regra:8–128 caracteres, ao menos uma maiúscula, um número e um
caractere especial; sem exigir minúscula. Login, senha atual e senha usada para
excluir conta não recebem nova regra de criação.

Contrato proposto ao backend: password-policy.mjs/.d.mts exporta limites,
mensagem e função de validação única; frontend importa essa mesma política,
sem manter regex separada. Definição final será registrada ao receber helper.

### Implementação e contrato final

- Helper do backend lido e adotado: `passwordMinLength = 8`,
  `passwordMaxLength = 128`, `passwordPolicyHint` e
  `isValidNewPassword(value: unknown): boolean`.
- Política compartilhada usa maiúscula Unicode Lu, dígito decimal Unicode Nd
  e pontuação/símbolo P/S como especial; espaço não satisfaz especial. Não há
  exigência de letra minúscula, trim ou normalização da senha. Mínimo contado
  em codepoints e máximo128 em UTF16 preservam o contrato do backend.
- RegisterPage, ResetPasswordPage e Configuracoes usam o mesmo helper na
  submissão antes da chamada de API. Erro usa a mensagem compartilhada e
  direciona o foco ao campo de nova senha. Confirmação ainda confere igualdade.
- Inputs de nova senha/confirmação usam as constantes8/128. Login, senha atual
  e senha de exclusão mantiveram max128 e não receberam requisito novo.
- `PasswordRequirements.tsx` apresenta a mensagem compartilhada e lembrete
  de não reutilização; os três campos principais apontam para seu hint por
  aria-describedby. Sem regex duplicada ou medidor enganoso de força.
- Falha local de senha no cadastro não aciona ConfirmationHelp; esse apoio
  continua disponível após erro da tentativa de cadastro no servidor.
- LoginPage: recuperação e reenvio em container próprio com border-top/gap,
  pilha no mobile e quebra em linha no desktop; ambos min44px de altura,
  espaçamento horizontal24px e vertical8px, sem ações inline grudadas.
- Não editei termos/checkbox, payload de aceitação ou API. RegisterPage fica
  liberado para a coordenação completar termos/privacidade após esta entrega.

### Validação

- ESLint focado nos cinco TSX alterados: passou.
- TypeScript `tsc -b` com Node22: passou com o helper/d.mts compartilhado.
- `node22 --test tests/password-policy.test.mjs`: **5/5 passaram**; suíte criada
  pelo backend, executada nesta sessão para conferir contrato compartilhado,
  casos Unicode/limites e preservação de login/senha atual legados.
- Revisão React Best Practices: informação acessível associada ao campo,
  guardas no submit sem efeitos adicionais, sem nova dependência, mensagens
  derivadas do contrato único; tipos e autenticação existente preservados.
- Browser320px, validação real das rotas/formulários, ambos temas e build final
  pertencem à coordenação. Nenhum teste em produção ou banco por esta sessão.
- Não foram feitos Git remoto, deploy ou instalação de dependências.

## Auditoria estática do MVP — 18/10/2026 (somente diagnóstico)

Autorização desta rodada: auditar a interface, acessibilidade, navegação, aulas,
suporte, onboarding e estados/links; não corrigir código, alterar dependências
ou serviços. AGENTS, contexto, fluxo, quadro e relatos conferidos no diretório
registrado. Reserva desta sessão: somente este relato.

O catálogo Análises foi retirado intencionalmente. As rotas antigas redirecionam
ao ranking, o menu atual mantém ranking/escola e o tour atual tem cinco etapas.
Não considerei a ausência de dados reais do ranking um defeito. Ausência de
vídeos preparados tem alternativa de leitura explícita e também não foi tratada
como falha de implementação.

### Achados priorizados

#### AUI-01 — P1: uma revogação de estatísticas pode ser desfeita ao voltar o foco à janela

Evidência: `analytics-policy.mjs:105`–`126` grava a escolha, mantém snapshot em
memória quando setItem falha e depois substitui esse snapshot por `read()` em
reconcile. `src/lib/analytics.ts:32`–`45` chama reconcile no evento window focus.
`src/components/PrivacyConsent.tsx:26`–`29` reaplica o controller ao mudar choice.

Reprodução isolada em Node, com storage falso e nenhum serviço externo:

```text
choose(granted) salva uma autorização.
Simular quota/negação somente nas próximas escritas.
choose(denied) => {choice: "denied", persisted: false}.
reconcile()   => {choice: "granted", persisted: true}.
```

O registro antigo continua legível e vence a revogação nova em memória. Na
integração React, o retorno de granted pode reativar o controller após o foco,
sem nova permissão do usuário. Com storage totalmente bloqueado, a variação
reproduzida foi denied → null ao reconciliar; a preferência da sessão se perde
e o banner pode voltar. A interface anuncia que a escolha vale nesta sessão,
mas esse caminho não a preserva.

Próxima correção proposta, sem execução nesta auditoria: preservar a escolha
local não persistida ao reconciliar, especialmente a negativa, impedindo que
um registro antigo reautorize a medição. Aceitação futura: conceder, falhar a
escrita ao revogar, disparar foco e confirmar denied/GA desabilitado; conferir
também storage completamente indisponível e sincronização entre abas.

#### AUI-02 — P2: atalhos de segurança/dados da ajuda levam a uma rota sem página

`src/components/support/SupportHelpCenter.tsx:70` aponta Conta e segurança para
`/app/configuracoes`. As respostas Trocar senha e Dados da conta em
`src/lib/supportHelp.ts:133` e `:143` usam o mesmo endereço.
`src/App.tsx:203` registra somente `/app/config`, e `:211` trata o restante
como NotFound; não existe alias para `/app/configuracoes`.

Consequência: ao seguir esses três caminhos, o aluno não chega à troca de senha,
exportação/exclusão ou revogação de sessões. Na ajuda pública, as respostas
autenticadas também podem gerar login com esse destino inválido. O caminho
correto existe no menu da conta e em Perfil; o problema é a navegação da ajuda.

Aceitação futura: os três atalhos chegam à tela existente e seus destinos de
autenticação continuam corretos para visitantes. Diagnóstico por fonte/roteador,
sem navegação de browser nesta sessão.

#### AUI-03 — P2: conclusão da aula do visitante promete salvamento mesmo quando ele falha

Reconfirmação do antigo I01, ainda presente: `src/pages/Aprender.tsx:237`–`244`
captura silenciosamente falha de localStorage.setItem. O estado completed é
atualizado em memória, e o cabeçalho em `:400` e
`src/components/LearningQuiz.tsx:70`–`76` dizem que o progresso foi salvo neste
navegador sem receber resultado da persistência.

Gatilho: visitante conclui a primeira aula com armazenamento bloqueado/quota.
Durante a página aparece a confirmação de salvamento; ao recarregar, a conclusão
se perde. Não afeta a regra de salvamento autenticado por API identificada nesta
leitura. Aceitação futura: distinguir conclusão em memória de persistência e
avisar quando não for possível guardar, mantendo o exercício utilizável.

#### AUI-04 — P2: controles da ajuda mudam para branco sobre fundos claros no hover

`src/components/support/SupportHelpCenter.tsx:158` (Limpar busca), `:242`
(links das respostas) e `:290` (Limpar filtros) usam hover:text-white, sem trocar
o fundo para escuro. `src/index.css:37`–`39` define os fundos do modo claro como
#f7f8f6, #ffffff e #edf1ee. Cálculo estático com essas cores produziu contraste
do branco de **1,07:1**, **1,00:1** e **1,14:1**, respectivamente.

Consequência: passar o ponteiro nesses textos/ícones torna a ação quase invisível
no tema claro; no escuro, o branco continua legível. Não é diagnóstico de toda
a paleta: os testes de tokens passam, mas esse estado ignora os tokens.
Aceitação futura: manter cor semântica legível no hover e validar as três ações
no browser nos dois temas, inclusive foco por teclado.

#### AUI-05 — P3: link de login da pesquisa pública perde a seção que o visitante abriu

Reconfirmação do antigo I02: `src/components/RankingAccessLanding.tsx:13`–`15`
monta next apenas com pathname+search, e passa-o ao AccountGate em `:51`.
`src/pages/StockResearch.tsx:63` usa esse gate para visitante. Um endereço como
`/ranking/acao/DEMO1?visual=demo#pesquisa-dre` gera next sem #pesquisa-dre.

Empresa/versão são preservadas, mas a intenção de abrir a DRE/risco/fonte se perde
após autenticação. O guard de `/app` preserva hash; esse achado é específico do
gate público da pesquisa. Aceitação futura: preservar hash válido no destino,
sem alterar a allowlist de autenticação nem os controles de acesso.

### Verificações executadas e resultados

- Leitura de App, chrome/layouts, PageContent/NavigationIntent/error boundary,
  RequireAuth, auth/recuperação/confirmação, pesquisa/âncoras, aulas/quiz/player,
  playlist/cursos, ajuda/conversas/hooks, tour/store e consentimento/store.
- Reprodução de AUI-01 pelo helper real com storage falso em memória: resultado
  exato registrado acima. Nenhum acesso ao GA, API, conta ou banco.
- Cálculo estático de contraste dos estados brancos com cores atuais do CSS.
- Node22: `--test tests/analytics.test.mjs tests/onboarding.test.mjs
  tests/theme.test.mjs`: **25/25 passaram** (10 analytics,8 onboarding,7 tema).
  Os testes existentes não exercitam a sequência revogar com escrita falha e
  reconciliar foco. Sucesso dessas suítes não invalida o achado reproduzido.
- Não foram adicionados testes, corrigidos arquivos de produto ou instaladas
  dependências. Não executei build/tsc (podem gerar artefatos), Git ou deploy.

### Aspectos positivos conferidos por fonte

- Retirada do catálogo aparece em rotas/menus/preload; destinos antigos têm
  redirecionamento explícito. Não há proposta de reintroduzir a funcionalidade.
- Tour e store usam cinco etapas consistentes; testes cobrem login comum sem
  abertura, retomada, migração dos seis passos antigos e isolamento por usuário.
- GuidedTour impede Escape/fundo, usa modal nativo, foco inicial e ciclo de Tab,
  cleanup de observers/listeners e fallback central. Replay é voluntário.
- Aulas têm carregamento, retry, sessão expirada, progresso autenticado com
  erro/tentativa e conteúdo escrito quando não há vídeo. Playlist tem teclas
  de navegação e seleção indicada; não se marca conclusão só por assistir vídeo.
- Conversas preservam rascunhos de resposta por thread, bloqueiam mutações
  simultâneas e mantêm mensagem de envio bem-sucedido quando só a atualização
  da lista falha; permissões continuam conferidas pela API, fora desta auditoria.
- Logos são decorativos ao lado do nome, com dimensões fixas e fallback de ticker.

### Não verificado nesta sessão

Browser real, leitores de tela, zoom, touch/teclado efetivos, layout320px,
contraste composto de todas as transparências, entrega de e-mail/Turnstile,
players de terceiros, GA/rede/cookies reais, banco/isolamento HTTP entre contas,
operações da equipe com dados reais e ambiente publicado. A coordenação faz
a validação de browser; esta auditoria não a duplica nem declara homologação
integral. Achados AUI-02/03/04/05 têm evidência estática e critérios para
reprodução posterior; AUI-01 foi reproduzido isoladamente no helper real.

Próxima etapa: coordenação incorporar achados ao relatório consolidado, sem
correções automáticas. Somente relato/quadro desta sessão foram atualizados.

## Rodada 9 — correções A03/A04/A05/A09

Escopo autorizado pela coordenação: corrigir os quatro achados de interface da
auditoria, preservando o contrato de progresso autenticado e o escopo do produto.

### Aceitação e decisões

- Ajuda aponta para a rota existente `/app/config` nas respostas e links úteis.
- Visitante recebe confirmação de gravação somente quando o storage aceita a
  operação. Falhas de leitura/gravação mostram aviso e ação para tentar salvar.
  A conclusão permanece em memória durante a navegação nesta sessão do site;
  recarregar/fechar a página pode perder mudanças não gravadas.
- Os três estados hover da ajuda usam `text-evo-textMain`, respeitando os tokens
  dos temas claro e escuro.
- O gate público do ranking preserva pathname, query e hash no destino de login,
  sem mudar a sanitização dos destinos de autenticação.

### Arquivos

- `src/lib/supportHelp.ts`, `src/components/support/SupportHelpCenter.tsx`:
  destinos da ajuda e cores semânticas no hover.
- `src/components/RankingAccessLanding.tsx`: hash incluído no destino.
- `src/pages/Aprender.tsx`, `src/components/LearningQuiz.tsx`: confirmação fiel
  ao estado de persistência e aviso recuperável para visitantes.
- Novos `visitor-learning-progress.mjs`, `visitor-learning-progress.d.mts`,
  `src/lib/visitorLearningProgress.ts`: store com snapshot estável, memória
  compartilhada durante a sessão da SPA, filtro da aula pública e retry explícito.
  Mantida a chave `ediv-learning-v1`. PUT/DELETE autenticados permanecem iguais.
- Novo `tests/visitor-learning-progress.test.mjs`: seis testes comportamentais.

### Verificações reais

- Node22: `--test tests/visitor-learning-progress.test.mjs`: **6/6 passaram**.
  Cobrem restauração/filtro, gravação, storage ausente ou bloqueado, quota,
  retry, reset com disco antigo, JSON inválido e inscrições/snapshots.
- ESLint dos seis arquivos TypeScript/TSX alterados: passou, código de saída0.
- TypeScript `tsc -b` com Node22: passou, código de saída0.
- Prettier aplicado aos arquivos de implementação e teste desta rodada.
- `node scripts/harness.mjs check`: passou.
- Revisão de hooks, snapshot estável, cleanup da inscrição e avisos acessíveis.
  Browser real e build integrado ficam com a coordenação; não foram executados
  nesta sessão. Nenhum deploy, migração ou uso de produção.

Próximo passo: coordenação incluir os novos arquivos no manifesto/publicação,
integrar o teste ao gate e validar os quatro fluxos no browser nos dois temas.

### Complemento — regressão E2E de armazenamento do visitante

Aceitação: concluir a primeira aula com quota excedida ou leitura/gravação
bloqueadas, informar sessão sem prometer gravação, sair/voltar por links SPA e
preservar conclusão, permitir gravação e usar retry, recarregar e restaurar.

- `tests/browser-experience.mjs`: dois cenários com contextos isolados e
  `addInitScript`, falhas limitadas à chave de progresso. Verificam erro realmente
  injetado, aviso, ausência de confirmação falsa, conclusão, navegação no mesmo
  documento, retry, valor persistido e restauração. Ignoram páginas sem origem
  no initScript para não produzir exceções em about:blank/iframes opacos.
- Preservado `fixture.clearLimits()` que backend acabara de adicionar no check.
  Helper de progressbar ajustado ao nome acessível atual, `Progresso dos exercícios`.
  Coordenação avisada dos seletores antigos de browser.mjs, corrigidos pelo backend.
- A execução encontrou mensagem falsa adicional em `LearningJourney.tsx`:
  dizia salvo mesmo durante falha. Agora recebe `persisted` de `Aprender.tsx`
  e usa a mesma distinção da confirmação do quiz. A regressão verifica ausência
  dessa promessa no documento inteiro durante falha.
- Revisão de SSR/hook: getServerSnapshot constante evita acesso a window no
  render do servidor; durante authLoading o store pode ler preferência local,
  mas não grava nem transfere conclusão para conta. Não demonstrado defeito
  de SSR ou contaminação de progresso autenticado; nenhum contrato alterado.
- Runner diagnóstico em `.test-artifacts/interface-round9/run-storage-regression.mjs`
  executa o MESMO bloco de cenários extraído do arquivo, contra Vite local4193
  e APIs auth/learning simuladas. Chrome headless: **2/2 passaram**, sem pageerror
  nem API inesperada. Vite encerrado após execução. Sem SQL ou produção.
- Primeiras tentativas locais esbarraram na separação de rede do sandbox;
  execução local autorizada fora do sandbox permitiu o browser. Outra tentativa
  detectou erro do próprio initScript em origem opaca, corrigido e retestado.
- Suite completa com MySQL, build integrado e CI final permanecem com coordenação.
  Não confundir os dois casos locais com aprovação integral do gate SQL/browser.
- `node --check tests/browser-experience.mjs`, ESLint do teste e dos dois TSX,
  `tsc -b` com Node22 e harness check passaram; revisão React aplicada.

### Complemento — alinhamento de dois seletores comprovados

Após revisão somente leitura e autorização da coordenação, ajustado apenas
`tests/browser-experience.mjs`: retry do erro de aulas busca o nome exato atual
`Tentar novamente`; preço-alvo busca um `dd` do `header dl` com regex ancorada
para R$42,75, aceitando o espaço de formatação monetária. Assim não seleciona
o parágrafo narrativo que repete esse valor. Mantidas ambas as assertivas de
visibilidade e todas as demais verificações. Nenhum código de produto alterado.

Syntax Node22, ESLint do runner e harness check passaram. Browser/SQL não
reexecutados nesta etapa; coordenação agrupará o complemento na próxima CI.

### Complemento — diagnóstico CI e cleanup das falhas simuladas

- `check()` em browser-experience agora imprime stack/message completo em vez
  de cortar na primeira linha. `PAGE_ERRORS` com JSON completo é impresso no
  finally global, mantendo relatório, assertiva final de erros vazios e saída1.
- Comprovado por fonte: falha antes de unroute deixava a interceptação503 ativa.
  Os dois trechos de falha simulada (GET aulas e gravação de progresso) agora
  usam try/finally para remover a própria rota antes de propagar falha. Retry e
  todas as assertivas existentes preservados; nenhuma exceção ignorada.
- Self-check Node22 executou os dois corpos reais extraídos com stub de página,
  lançou falha depois da instalação de cada rota e conferiu tanto propagação
  do erro quanto unroute: **2/2 passaram**. O primeiro rascunho desse self-check
  lançava cedo demais no segundo cenário; corrigido para falhar com rota ativa.
- Syntax Node22, ESLint do runner e harness check passaram. Nenhuma alteração
  de produto, SQL/browser real ou deploy nesta etapa; CI completa com coordenação.

### Complemento — IntersectionObserver com viewport mínimo

- Aceitação: o componente real de navegação da pesquisa não lança exceção com
  viewport de1px e retoma seleção de seção após resize normal.
- Causa reproduzida: ResearchSectionNav calculava readingLine=-1 para altura1
  (ou -2 para altura0), gerando rootMargin `--1px`/`--2px`. Unidades já eram px;
  o sinal duplicado tornava o valor inválido. Correção de uma linha limita a
  altura disponível a zero antes do Math.min; cálculos normais não mudam.
- `tests/browser-experience.mjs`: contexto isolado do membro, pesquisa real da
  fixture, viewport360x1, ausência de pageerror, resize1366x900 e seleção de
  Fontes e versão. Assertiva global de erros preservada. Nenhum outro componente
  de observação ou runner reservado à coordenação alterado.
- Chrome headless local executou o componente REAL servido pelo Vite em HTML
  mínimo sem API/SQL. Interceptação do módulo restaurou só a expressão antiga:
  erro nativo reproduzido e margem `--1px` capturada. Código corrigido: sem erro,
  observador construído, resize e aria-current da navegação corretos. **2/2**.
  Harness diagnóstico em `.test-artifacts/interface-round9/check-research-nav.mjs`
  e `research-nav.html`, fora do produto/publicação; browser e servidor encerrados.
- A mensagem do Chrome local usa “absolute length units or percent”, equivalente
  ao “pixels or percent” da CI. O regex do diagnóstico foi ajustado a essa versão;
  não foi alterado nenhum tratamento de erros do produto ou assertiva da CI.
- Syntax do teste, ESLint dos dois arquivos, TypeScript Node22 e harness passaram.
  Reaplicada revisão React: nenhuma mudança de hooks/listeners/cleanup.
- A CI6 não guardou stack do PageError; este é um defeito real reproduzido com
  mesma classe de erro, mas não prova qual evento reduziu a altura naquela run.
  Coordenação melhora diagnóstico e executará CI7/SQL/backup completos.

### Alinhamento final da regressão após CI7

Coordenação informou zero pageerrors nas três suítes,30/30 do browser principal,
18/18 cenários anteriores de experiência e7/7 de sessão. Apenas a nova assertiva
de aria-current do cenário de viewport falhou na pesquisa completa: ao final do
documento a seção Fontes pode não alcançar a linha de leitura e o indicador volta
à seção anterior. Registrado como limite **P3 do indicador ativo**, fora do erro
do construtor; não houve nova alteração no componente.

A pedido da coordenação, o teste agora exige URL terminada em `#fontes`, seção
`#fontes` visível e zero erros após resize. Preserva a verificação de viewport1px
e a navegação funcional, sem exigir um estado adicional do indicador. Syntax
Node22, ESLint do runner e harness passaram. Suite completa/SQL/backup aguardam
próxima CI; não foram reexecutados localmente nesta etapa.
