# Plano do Orquestrador — QA final e publicação (missão UX e performance, 17/11)

Ordem: 2H (Pincel) → revisão da Lupa → C3 (Pincel) → revisão da Lupa → **QA final (Vigia)** → pedido
de autorização ao dono → **publicação (Chave)**, só depois do "pode publicar".

## QA final — Vigia

Só começa quando o Pincel tiver liberado o quadro e ninguém estiver buildando. Base do "antes":
`.test-artifacts/dist-base` (build do `HEAD` de 16/11). Relato: `docs/harness/relatos/qa-final-ux-performance-2026-11-17.md`.

1. **Prova da 2E (dependências):** copie o `dist/` atual para `.test-artifacts/dist-pre-ci`; rode
   `npm ci` (limpo, sem `--force`); `npm run build`; compare os CSS gerados com os da cópia
   (mesmo conteúdo; os nomes com hash devem bater). `npm ls autoprefixer prettier` sem os dois.
2. **Portões:** `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit` (e as outras configs que o
   projeto tiver), `npm test` (contagem), `npm run build`, `node --test tests/seo.dist.mjs`,
   `node scripts/harness.mjs check`.
3. **Suítes de navegador sem banco**, as mesmas do QA da 2A (public-home, stock-theme,
   public-rankings, behaviors), com a contagem de cada uma. Fluxos logados que exigem MySQL: não
   executados (o CI cobre); registrar.
4. **CLS antes/depois** (comando oficial, `MOCK_API=1`, `RUNS=3`): `/`, `/ranking`, `/aprender`,
   `/glossario`, `/entrar`, `/cadastro`, `/ranking/acao/TIMS3` em 390 e 1280 px; `/aprender` e
   `/ranking` em 1920 px. Aceite: nenhuma rota pior que o antes em mais de 0,01; meta < 0,1, exceto o
   que a 2H tiver registrado como limite.
5. **Peso da home** (visitante, 390 px): JS transferido antes e depois (2A: 165,8 → 116,8 KB) e LCP
   local. O chunk com framer-motion (`onboarding-*.js`, ~124 KB) **não** é baixado por visitante em
   `/`, `/entrar` e `/cadastro`, nem passando o mouse nos links públicos.
6. **Texto e regras:** nas 8 páginas pré-renderizadas, o rodapé traz exatamente "Conteúdo educativo,
   sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados
   futuros não são garantidos."; nenhum "tempo real" nem "com atraso" no `dist/`; nenhum número na
   tela de carregamento (skeletons só com barras).
7. **Visual e acessibilidade:** capturas 320, 768 e 1280 px, tema claro e escuro, de `/`, `/ranking`,
   `/aprender`, `/glossario`, `/entrar`, `/ranking/acao/TIMS3`; sem rolagem horizontal; com
   `prefers-reduced-motion: reduce`, nenhum skeleton anima; os skeletons têm `role="status"` com texto.
8. Veredito APTO ou NÃO APTO, com tabela antes/depois e a lista do que não foi executado.

## Publicação — Chave (só depois do "pode publicar" do dono)

**Uma PR**, com commits separados por assunto. Duas PRs (exclusões à parte) foram descartadas: a
primeira iria para produção num estado do código que o QA nunca testou (sem a C2). O QA final testa
a árvore inteira, e é ela que vai para produção. Com o squash, o `main` recebe um commit só, mas a PR
guarda os commits separados, e as exclusões podem ser revertidas a partir deles.

Ordem dos commits (todos com o nome do dono):
1. 2A: home sem framer-motion, logo WebP, dimensões dos ícones, guarda de CSS do prerender e teste.
2. 2D: cache de borda das informações de suporte e teste.
3. 2E: remoção de `autoprefixer` e `prettier`.
4. 2F: salto de layout da empresa e do glossário (skeleton, JSON do glossário, `PageLoading`) e teste.
5. 2C: skeletons da home e dos destaques do ranking.
6. 2B: tokens de movimento, `@source not "../docs"`, `min-h-11`.
7. 2H: texto do rodapé (aprovado pelo dono), comentário dos tokens e o que mais a 2H trouxer.
8. C3: `apiRequest` única e teste do cliente.
9. C2a: exclusão do cluster A (Carteira, Painel, Favoritos).
10. C2b: exclusão do cluster B (painel fundamentalista antigo).
11. C2c: exclusão dos órfãos pequenos e das 3 imagens do template.
12. C2d: ramo não-membro de `AccountHomeContent` e `RankingPreview`.
13. Normalização de `docs/CENTRAL-FUNDAMENTALISTA.md` para LF (sem mudança de texto).
14. Linhas de status nos 7 docs (conferir 3/0 em cada).
15. Ferramenta de medição (`tests/perf-baseline.mjs`), documento da missão, briefs e relatos.

Se separar os commits por assunto ficar arriscado onde dois assuntos tocam o mesmo arquivo (ex.:
`src/App.tsx`, `src/pages/Glossario.tsx`), a Chave junta os assuntos vizinhos num commit só e diz
qual juntou; nunca usa `git add -p` interativo.

Nunca entram em commit: `evorix-finance/.gitignore` (mudança do dono), `docs/harness/state.json`, o
`.gitignore` da raiz, `.maestri/`, `docs/estrategia_escola_do_dividendo.pdf`, `.env*`, `.test-artifacts/`.
Autoria só do dono, sem linha de IA. PR pelo Chrome com link de comparação; squash; sem force push.
Depois do merge: conferir o deploy e as páginas públicas em produção (GET, sem login).
