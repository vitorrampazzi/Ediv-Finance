# Brief 1A — Pincel: auditoria de UX, animação e performance da interface

Para: Pincel (interface). Etapa 1, só leitura de código. Pode começar em paralelo com 1D.

## Objetivo

Entregar um relato com evidência de onde há ganho real de UX e de performance na interface, sem editar nenhum código.

## Contexto mínimo

- Missão: `docs/UX-PERFORMANCE-2026-11-16.md` (seções 1 e 2, com os números de base). Plano: `docs/harness/briefs/00-plano-etapa1.md`, seção 1A.
- Nota "Contexto Escola": seção 3 (nunca mostrar zero no lugar de dado ausente; proibido "tempo real" e "com atraso"; textos legais continuam visíveis) e seção 4 (rota pública: App, entry-server, site-pages e vercel.json).
- Já existe e não se refaz: lazy loading por rota (`src/lib/lazyPage.ts`), `--ediv-ease` em `src/index.css`, `prefers-reduced-motion` em cerca de 20 arquivos. A lacuna a medir está no item 3 abaixo.
- Não há API local: seções que dependem da API ficam vazias ou com erro. Anote, não conserte.
- Use o `dist/` como está. **Não rode `npm run build`.**

## Pode ler primeiro / pode escrever

- Ler primeiro: `src/index.css`, `src/App.tsx`, `src/lib/lazyPage.ts`, `src/components/SegmentedControl.tsx`, `src/components/RankingPreview.tsx`, `src/components/PageContent.tsx`, `src/pages/PublicStock.tsx`, `src/pages/StockResearch.tsx`, `src/components/stock-make/`, `src/lib/api.ts`, `src/lib/marketData.ts`, `tests/polled-store.test.mjs`, `src/context/AuthProvider.tsx`, `public/ediv-logo-clean.png`, `dist/assets/`. Depois siga só o que a pergunta exigir. Não leia o repositório inteiro.
- Páginas: `/`, `/ranking`, `/ranking/acao/:ticker` (`PublicStock.tsx`), página logada da empresa (`StockResearch.tsx`, `stock-make/`), `/aprender`, `/glossario`, `/entrar`, `/cadastro`.
- **Único arquivo que pode escrever:** `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`.

## Fora do escopo

- Editar qualquer arquivo em `src/`, `public/`, `server/`, `tests/`, `package.json`, `package-lock.json`.
- Mexer em cálculo de margem, textos legais ou regras financeiras.
- Trocar fonte ou paleta.
- Rodar `npm run build`, instalar ou remover dependência.
- Medir produção.

## Passos

1. Reserve: `node scripts/harness.mjs claim interface docs/harness/relatos/interface-auditoria-ux-2026-11-16.md` e `node scripts/harness.mjs update interface trabalhando "auditoria de UX e performance da interface"`.
2. Se precisar ver a rede no navegador, sirva o `dist/` com `npx vite preview --port 4174`. Pare o servidor ao terminar.
3. Escreva o relato com **exatamente** estes títulos de seção, em português:
   - `## 1. Achados`: tabela com `arquivo:linha` → problema observado → princípio (o dono não enviou a lista completa dos 20; use os 9 que ele citou: Snappy Timing, Slow In & Slow Out, Exaggerated Feedback, Anticipation, Fitts, Hick, Jakob, Doherty, Postel. Outro princípio só se for amplamente conhecido pelo nome, como os 12 princípios de animação da Disney ou as Laws of UX, e com justificativa na linha) → mudança proposta → ganho esperado → risco → prioridade (P1 ganho claro, P2 bom, P3 cosmético). Princípio sem ganho real não entra.
   - `## 2. Durações e easings`: inventário de durações e easings soltos (CSS e classes Tailwind): quantos e onde. Proposta de tokens `--ediv-*` de duração e easing para `src/index.css`, reaproveitando `--ediv-ease`.
   - `## 3. Reduced motion`: animações sem a regra `prefers-reduced-motion`.
   - `## 4. Áreas de toque`: alvos menores que 44×44 px em 320–390 px (ícones, menu, fechar, abas).
   - `## 5. Skeletons`: onde hoje aparece `PageLoading`, spinner, espaço em branco ou salto de layout, com a forma e as dimensões do conteúdo final. Inclua os estados de erro e de dado ausente que o skeleton precisa respeitar ("não informado" / "indisponível", nunca zero).
   - `## 6. Imagens`: para cada `<img>` e imagem de CSS das páginas acima: tamanho do arquivo, dimensão natural, dimensão exibida, se tem `width`/`height`, `loading` e `decoding`. Destaque `public/ediv-logo-clean.png` (138 kB, herói da home). Só proponha conversão com ganho estimado.
   - `## 7. JavaScript por página`: quais chunks cada página pública baixa (pelo `dist/` e pelos imports). Confirme: (a) se a home baixa o chunk do framer-motion (40 kB gzip) por causa de `SegmentedControl` em `RankingPreview`, e se dá para trocar por CSS sem perder a animação; (b) se `recharts` entra só na página da empresa; (c) se `PublicStock` puxa `StockResearch` (137 kB gzip).
   - `## 8. Requisições duplicadas`: para cada hook ou store de dados (comece por `src/lib/api.ts`, `src/lib/marketData.ts`, a store testada em `tests/polled-store.test.mjs`, `src/context/AuthProvider.tsx`): endpoints chamados, componentes que usam, e se duas montagens ao mesmo tempo geram duas requisições iguais. Inclua renders desnecessários evidentes (efeito sem dependência correta, objeto novo a cada render passado a contexto).
   - `## 9. Recomendações`: de 5 a 8 mudanças para as etapas 2.1 a 2.4, cada uma com arquivos exatos e critério de aceite observável.
4. Ao terminar: `node scripts/harness.mjs update interface revisao "relato da auditoria de UX pronto"` e `node scripts/harness.mjs release interface`.

## Critérios de aceite (observáveis)

- [ ] O arquivo `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md` existe e tem as 9 seções numeradas.
- [ ] Cada achado da seção 1 tem `arquivo:linha` que existe (confira por amostragem: abra 3 linhas citadas e confirme).
- [ ] As confirmações (a), (b) e (c) da seção 7 têm resposta sim ou não, com a evidência (arquivo e linha de import, ou nome do chunk em `dist/assets/`).
- [ ] A seção 9 tem de 5 a 8 itens, e cada um tem arquivo exato e critério observável.
- [ ] Nenhum arquivo de código mudou: o comando de `git status` abaixo não lista nada em `src/`, `public/`, `server/`, `tests/`, `package.json`.

## Comandos de validação (em `evorix-finance/`)

```
grep -cE "^## [1-9]\." docs/harness/relatos/interface-auditoria-ux-2026-11-16.md
git status --short -- src public server tests package.json package-lock.json
node scripts/harness.mjs check
```

Esperado: `9`; nenhuma linha, exceto `?? tests/perf-baseline.mjs` (arquivo do Vigia, criado em paralelo); `check` sem erro.

## Formato do relato

Em português, curto. O relato é o arquivo acima. Na resposta ao Orquestrador (até 15 linhas): arquivos lidos, os 3 achados P1 mais importantes com `arquivo:linha`, comandos rodados e resultado (passou, falhou ou não executado e por quê), limites (o que ficou vazio por falta de API), próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em relato. Não abra `.env*`.
- Não use produção. Teste só contra o `dist/` local.
- Não faça commit, push nem deploy.
- Não adicione linha de autoria de IA.
