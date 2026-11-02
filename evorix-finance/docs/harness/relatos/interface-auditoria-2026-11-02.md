# Interface — auditoria e correções de 02/11/2026

Papel: `interface`. Escopo autorizado pela coordenação: `src/**` e `public/**`,
mais este relato. Não houve alteração em `server/`, `vercel.json`, `package.json`
ou nos testes. Nenhum Git, instalação, publicação ou deploy.

Contexto: em produção o banco está inacessível e `/api/auth/me` responde 503.
Por isso a home pública e `/entrar` ficavam presas em "Não foi possível verificar
sua sessão agora".

## Aceitação

- Home pública e `/ranking` aparecem sem esperar a sessão. Com falha de sessão,
  aparece um aviso não bloqueante (`role="status"`) com "Tentar novamente".
- `/entrar` e `/cadastro` exibem o formulário mesmo com falha de sessão.
- Os ícones de explicação respondem a toque e clique; fecham com Escape ou com
  toque fora.
- `/app/ranking` deixa de baixar o pacote de gráficos.
- Rotas, IDs, o nome "Ranking de Ações", dados e fórmulas permanecem iguais.

## O que foi feito

1. **Home sem bloqueio.** `src/pages/Home.tsx` renderiza `PublicHome` sempre que
   não há usuário, inclusive durante a verificação e com `sessionError`. Só
   redireciona para `/app` quando há usuário. Com erro, mostra o novo
   `SessionNotice` (`src/components/SessionStatus.tsx`) acima da home.
2. **`/ranking` público.** `src/pages/IncomeRanking.tsx` exibe
   `RankingAccessLanding`, que é o mesmo HTML pré-renderizado, enquanto não há
   usuário. Some o texto "Verificando seu acesso ao ranking…". Dentro de `/app`,
   o `RequireAuth` continua resolvendo a sessão antes.
3. **Pré-carga em `main.tsx` não aplicada.** O `React.lazy` do React 19.3
   (`lazyInitializer`) sempre suspende na primeira renderização, mesmo com o
   módulo já baixado. O render inicial usa a `DefaultLane` (`renderRootSync`) e
   confirma o fallback. Além disso, a revelação do conteúdo é limitada (cerca de
   300 ms), então só pré-carregar o módulo não remove o "Abrindo página…".
   Fica como pendência um wrapper síncrono para módulos já carregados.
4. **Entrar e cadastro.** `LoginPage.tsx` e `RegisterPage.tsx` só bloqueiam
   durante a primeira verificação sem erro. Com `sessionError`, mostram o
   formulário e o aviso acima dele. O redirecionamento com usuário continua.
5. **Tooltip por toque (item 3).** `Tooltip.tsx` ganhou a prop `toggleOnClick`.
   - Toque, clique, Enter ou Espaço fixam a dica.
   - Uma segunda ativação, Escape ou toque fora fecham.
   - Usada em `InfoTip` (`stock-make/ui.tsx`) e nos cabeçalhos da tabela de
     dividendos.
6. **Tooltip sem repetição (item 14).** O `Tooltip` não acrescenta
   `aria-describedby` quando o texto é igual ao nome acessível do controle.
7. **Tabela separada (item 4).** `DividendRankingTable` foi movida para
   `src/components/DividendRankingTable.tsx`. `DividendResearch.tsx` ficou só
   com a página da empresa, que carrega o recharts.
8. **Tour (item 6).** O texto em `src/lib/guidedTourSteps.ts` passou a citar as
   colunas reais, sem mencionar demonstração.
9. **Erro na home logada (item 7).** Em `RankingHighlights.tsx`, o erro oferece
   "Tentar novamente" e "Abrir o Ranking de Ações", e não mais dados fictícios.
10. **Corrida do 401 (item 9).** Depois de um 401 com sessão ainda válida,
    `useRankingPublication.ts` e `RankingHighlights.tsx` carregam a publicação
    mais uma vez. Antes, caíam silenciosamente na demonstração ou ficavam
    carregando para sempre.
11. **Botão de demonstração (item 8).** Só aparece quando não há publicação
    real, ou quando já se está na demonstração, para permitir voltar.
12. **Título e contagem (item 16).** O h2 passou a "Empresas da publicação". O
    `#ranking-count` mantém o texto, e o anúncio vai para uma região `sr-only`
    com espera de 800 ms.
13. **Botão de pausa (item 11).** Removido o `aria-pressed` de `TeachingJourney`.
    O rótulo continua alternando, como em `PublicHeroBrand`.
14. **Rodapé (item 12).** "Ranking de Ações" e "Aprender" apontam para `/app/...`
    quando há usuário.
15. **`aria-controls` (item 13).** Só aparece com o menu aberto, nos três menus.
    IDs preservados.
16. **Logo (item 17).** `ediv-icon-clean-192.png` (23 KB) substitui
    `ediv-logo-clean.png` (138 KB) no cabeçalho, rodapé, menu lateral e telas de
    conta. A comparação por pixels mostrou o mesmo recorte (cerca de 9–91%), a
    mesma área preenchida (37,2%) e a mesma cor média. O hero mantém o arquivo
    grande.
17. **Reenvio de confirmação (item 18).** `ConfirmationHelp` usa `aria-disabled`
    em vez de `disabled`, então o foco permanece no botão durante a contagem.

## Verificações

| Verificação | Resultado |
|---|---|
| `npm run lint` | passou |
| `tsc -p tsconfig.app.json --noEmit` | passou |
| `npm test` | passou, 131/131 |
| `npm run build` | passou, com prerender de 8 rotas |
| `node scripts/harness.mjs check` | passou |
| Testes de navegador | não executados (exigem servidor e banco de teste) |

### Chunks de `/app/ranking`

O "antes" vem do build de hoje às 14:08, anterior às mudanças.

- **Antes:** `IncomeRanking` com 54,1 KB (15,9 KB gzip), mais `DividendResearch`
  com recharts, 469,2 KB (131,8 KB gzip). Total específico da rota: cerca de
  543 KB (cerca de 157 KB gzip).
- **Depois:** `IncomeRanking` com 58,2 KB (17,2 KB gzip), mais
  `dividend-research` com 21,7 KB (7,1 KB gzip) e chunks pequenos. Total
  específico da rota: 99,2 KB (33,9 KB gzip). O recharts não aparece no grafo.
- **Página da empresa:** o recharts foi para `StockResearch`, com 475,8 KB
  (134,9 KB gzip).
- **Entry:** `index` passou de 387,5 KB para 388,8 KB.

## Pendências (não implementadas por decisão da coordenação)

- **5:** framer-motion no bundle inicial.
- **10:** fechamento forçado do `GuidedTour`.
- **15:** landmarks da área logada.
- **Fallback do lazy:** "Abrindo página…" sobre o HTML pré-renderizado (ver o
  item 3 acima).

## Para o QA conferir no navegador

- **Home e `/ranking` sem sessão (`/api/auth/me` em 503):**
  - O conteúdo permanece visível.
  - O aviso aparece com "Tentar novamente".
  - Não há "Verificando…".
  - O console fica sem erros.
- **`/entrar` e `/cadastro` com 503:** o formulário aparece e o envio mostra o
  erro do servidor.
- **Tooltips por toque (320 e 375px):**
  - Tocar no "i" e nos cabeçalhos da tabela abre e fecha a dica.
  - Escape e toque fora fecham.
  - Os testes atuais de foco e Escape continuam válidos.
- **`/app/ranking`:**
  - O recharts não é baixado.
  - O h2 é "Empresas da publicação".
  - O `#ranking-count` mantém o texto.
  - O botão de demonstração some quando há publicação.
- **Reenvio de confirmação:** depois de clicar, o foco continua no botão. O teste
  usa `toBeDisabled`, que também considera `aria-disabled`.
- **Logos:** comparar nos dois temas e em telas de alta densidade.
- **Home de quem está logado:** a home pública aparece por um instante antes do
  redirecionamento, o que é esperado.
