# Relato interface — conteúdo e credibilidade (13/11/2026)

Papel: interface (FRONT-2). Reservas feitas com `claim`; `release` e `update` não foram executados, conforme instrução de tarefa. Liberação pendente para a coordenação.

## Reservas

- Reservado: Metodologia, Glossário, Aprender, componentes Learning*, learning-workspace.css, learningCatalog.ts, Assessoria, Transparência, GettingStarted, src/pages/auth, este relato.
- Não reservado (conflito): `src/components/home/LearningTerms.tsx` (diretório `src/components/home` com coordenação) e `server/learning-content.js` (diretório `server` com backend). Por isso o glossário não foi editado no servidor (ver C2).

## Mudanças por arquivo

- `src/pages/Metodologia.tsx`: fluxo em `<ol>` numerado com quatro etapas reais (editar ou importar, preparar o arquivo, conferir a prévia, publicar), conforme `docs/GUIA-DESENVOLVEDOR.md`. Novo bloco "O que a escola procura" a partir da filosofia oficial. Roteiro de leitura agora explica margem de segurança (fórmula de `safety-margin.mjs`, premissa de 6,81% de `dividend-analysis.mjs`), DY e P/L. Contato: linhas vazias são omitidas; sem dados, texto honesto com link para a central de ajuda (`/suporte`). Removida a palavra "preparação" dessas linhas.
- `src/pages/Glossario.tsx`: termos em ordem alfabética (pt-BR), âncora `id` por termo, contagem em `role="status"`, erro não mostra mais "Carregando" indefinidamente. Rota, h1 e textos inalterados.
- `src/pages/Aprender.tsx`: glossário da aba "Termos" também em ordem alfabética; "Teste:" virou "Exercício:" no título e no texto de instrução; aviso "(abre em nova guia)" no link do Portal do Investidor.
- `src/components/LearningVideo.tsx`: "Vídeos em preparação" virou "Vídeo em preparação" com "O texto e o exercício desta aula já estão disponíveis. O vídeo desta aula ainda não foi publicado." Sem data.
- `src/components/LearningPlaylist.tsx`: número da aula visível (`aria-hidden`, o rótulo acessível segue com "Aula N" no sr-only).
- `src/components/LearningCourseCarousel.tsx`: "Vídeos em preparação. Texto e exercícios já disponíveis".
- `src/components/LearningQuiz.tsx`: hover `bg-white/5` trocado por token `bg-evo-card` (cor fixa removida).
- `src/pages/Assessoria.tsx`: removidas as referências a "carteira" cadastrada/acompanhada (carteira saiu da navegação). Títulos e textos agora falam em dúvidas, objetivos e dados. Preço R$ 29,90 e "Assinatura ainda não disponível" mantidos.
- `src/components/GettingStarted.tsx`: "ainda está em preparação" virou "ainda não está disponível" (assessoria); pergunta "pesquisa do corretor" virou "pesquisas publicadas" (alinha com "pesquisas reais publicadas pela equipe").
- `src/pages/auth/LoginPage.tsx`: `aria-invalid` nos campos de e-mail e senha quando há erro.
- `src/pages/auth/RegisterPage.tsx`: `aria-invalid` no e-mail quando há erro.
- `src/pages/auth/ForgotPasswordPage.tsx`: `aria-invalid` no e-mail; link "Voltar ao login" com alvo mínimo de 44px.
- `src/pages/auth/ResetPasswordPage.tsx`: "Entrar novamente" usa `Link` (navegação SPA em vez de `<a href>`).

Não alterados de propósito: lógica de envio, validação, textos de erro vindos do servidor, rotas, IDs, a aba "Testes" e o título "Entre para fazer os testes" (usados pelos testes de navegador), e "conta gratuita" (consistente com a home).

## Vídeos (C3)

`learningCatalog.ts` tem `videoEmbedUrl: null` nas quatro aulas (ranking, risco, dividendos, carteira). Não há URL para consultar no oEmbed; nenhum GET foi feito. Nenhum vídeo foi inventado.

| Aula | URL | Status oEmbed |
|---|---|---|
| ranking | null | não aplicável |
| risco | null | não aplicável |
| dividendos | null | não aplicável |
| carteira | null | não aplicável |

## Glossário (C2) — pendente

`server/learning-content.js` (linhas 197 a 248) não foi editado: diretório `server` reservado pelo backend. Propostas para aplicar quando houver reserva. Os 14 termos têm definições corretas; a sugestão abaixo corrige dois pontos:

- Dividend yield: "Proventos por ação nos últimos 12 meses divididos pelo preço de referência. Pode ser histórico ou projetado; sozinho, não indica boa escolha." (fórmula consistente com o exemplo do laboratório, `LearningPractice.tsx`)
- JCP: "Juros sobre capital próprio, uma forma de remuneração ao acionista. Tem imposto de renda retido na fonte, o que reduz o valor recebido."

Demais termos mantidos sem alteração: Preço-alvo, Potencial, Horizonte, Tese, Liquidez, Payout, Data-com, Data-ex, Data de pagamento, Fluxo de caixa, Pagamento extraordinário, Desdobramento.

`src/components/home/LearningTerms.tsx` também não foi editado (reserva da coordenação em `src/components/home`).

## Textos "em preparação" encontrados

- Metodologia: "Identificação profissional em preparação" e "Contato em preparação" — removidos; estado vazio honesto.
- LearningVideo, LearningPlaylist, LearningCourseCarousel: "Vídeo(s) em preparação" — mantido com a clarificação de que texto e exercício já estão disponíveis.
- GettingStarted: assessoria — ajustado para "ainda não está disponível".
- Assessoria: "Pré-lançamento" e "Assinatura ainda não disponível" — mantidos (estado real).
- AccountHomeContent.tsx e PublicHome.tsx: "Novos cadastros em preparação" — fora do escopo; estado real.
- RegisterPage: "Novos cadastros em preparação" — estado real do servidor, mantido.

## Links e botões

- `/suporte`, `/recuperar-senha`, `/privacidade`, `/glossario`, `/aprender`, `/ranking`: existem em `App.tsx`.
- `#laboratorio` e `#termos`: tratados por `tabForHash` em `Aprender.tsx`.
- Nenhum `href="#"` sem destino encontrado nas páginas do escopo.

## Acessibilidade

Corrigido: `aria-invalid` em formulários de conta; alvo de 44px no link de volta; número visível da aula; aviso de nova guia no link externo do Aprender; cor fixa removida do quiz.

Restantes, para o dono ou outra etapa:
- `LearningQuiz.tsx`: as alternativas usam `aria-pressed` (toggle) em vez de `radiogroup`. Funciona, mas o padrão semântico seria radio. Mudança de comportamento; não feita.
- `src/components/auth` (AuthShell, ErrorMessage) fora da reserva desta sessão; sem alterações.
- Campo de busca do glossário sem `autoComplete="off"`; não é requisito WCAG.

## Analytics — pontos naturais (não implementados)

- Início de aula: `src/pages/Aprender.tsx:157` (`selectLesson`).
- Play do vídeo: `src/components/LearningVideo.tsx:76` (`setLoadPlayer(true)`).
- Conclusão do exercício: `src/pages/Aprender.tsx:271` (`chooseAnswer`) e `src/components/LearningQuiz.tsx:72` (estado `completed`).
- Busca no glossário: `src/pages/Glossario.tsx:66` e `src/pages/Aprender.tsx:836`.

## Verificações

- `npx tsc -p tsconfig.app.json --noEmit`: passou (sem erros).
- `node node_modules/eslint/bin/eslint.js` nos 13 arquivos alterados: passou.
- `npx prettier --check` nos 13 arquivos: falhou em `src/components/LearningVideo.tsx`. Motivo: 70 linhas já fora do padrão no HEAD, antes desta sessão. Não reformatado para evitar mudança fora do escopo. Os demais arquivos passaram.
- `node --test tests/learning.test.mjs tests/site.test.mjs tests/unit.test.mjs tests/onboarding.test.mjs tests/visitor-learning-progress.test.mjs`: passou, 40 de 40, 0 falhas.
- Capturas (Playwright, `.test-artifacts/evolucao-conteudo/capturas.mjs`): 20 de 20 entradas (metodologia, glossario, aprender, entrar, cadastro × 390 e 1440 × claro e escuro) sem rolagem horizontal e com h1 único. API simulada: `/api/learning` e `/api/support/information` com fixtures GET da produção, `/api/auth/me` com 401. Imagens inspecionadas: metodologia mobile claro, metodologia desktop escuro, glossario mobile claro, entrar mobile escuro — sem corte nem contraste insuficiente.
- Vite na porta 5184: encerrado. Navegador encerrado pelo script.
- `npm run build`: não executado (instrução).

## Pendências do dono

- Dados do responsável, categoria, registro, e-mail público e horário: variáveis do servidor `PROFESSIONAL_NAME`, `PROFESSIONAL_CATEGORY`, `PROFESSIONAL_REGISTRATION`, `SUPPORT_EMAIL`, `SUPPORT_HOURS`. Hoje vazias em produção. Nada inventado.
- Vídeos das quatro aulas: sem URL aprovada.
- Assessoria: preço, "Pré-lançamento" e a oferta de "orientações sobre suas dúvidas" dependem de decisão do dono. Em especial, a expressão "orientação" sobre investimentos pode exigir revisão jurídica; não avaliado aqui.
- `AuthShell`/`ForgotPasswordPage`: link "Link local de desenvolvimento" só aparece quando o servidor devolve `developmentUrl`, que depende de `allowDevelopmentEmailLinks`. Confirmar que a flag está desligada em produção (backend).
- Aprender.tsx: a aba "Testes" e o título "Entre para fazer os testes" podem virar "Exercícios" com alteração coordenada dos testes de navegador (`tests/browser.mjs`, `tests/browser-experience.mjs`).
- Glossário no servidor e `LearningTerms.tsx`: aguardam reserva (backend e coordenação) para aplicar as propostas acima.

## Próximo passo

A coordenação deve liberar as reservas desta sessão (`node scripts/harness.mjs release interface`) e decidir sobre a reserva de `server/learning-content.js` e `src/components/home/LearningTerms.tsx`.
