# Relato: color-scheme only light (23/11/2026)

Responsável: Frontend (Pincel). Worktree: `.claude/worktrees/color-scheme-2026-11-23`. Branch `vitorrampazzi/color-scheme-only-light-2026-11-23`, HEAD `cb8eb34`. Sem commit, push, claim no harness ou alteração de `docs/harness/state.json`.

## Objetivo

Impedir que o navegador escureça o tema claro do site (Android force-dark, Samsung Internet com modo escuro). O tema escuro continua opcional, por `data-theme="dark"`.

## Arquivos alterados

1. `evorix-finance/src/index.css`: 5 linhas acrescentadas logo abaixo de `color-scheme: light;` (linha 34), no bloco `:root`. Comentário de 4 linhas e a declaração `color-scheme: only light;`. A reserva `color-scheme: light;` foi mantida.
2. `evorix-finance/index.html`: 1 linha acrescentada depois de `<meta name="theme-color" content="#f7f8f6" />` (linha 19): `<meta name="color-scheme" content="only light" />`.
3. `evorix-finance/docs/harness/relatos/color-scheme-only-light-2026-11-23.md`: este relato (novo).

Diff (`git diff -U0`):

```
index.html
+    <meta name="color-scheme" content="only light" />

src/index.css
+  /* "only" stops browsers from auto-darkening the light theme (Android
+     force-dark, Samsung Internet dark mode). Plain "light" above is the
+     fallback for browsers that do not parse "only". Dark stays opt-in via
+     data-theme="dark". */
+  color-scheme: only light;
```

`git diff --stat`: 2 arquivos, 6 inserções, 0 remoções. A linha `color-scheme: dark;` (dentro de `:root[data-theme="dark"]`) não foi tocada.

## Critérios de aceite

| Critério | Resultado |
|---|---|
| `git diff --stat` com 2 arquivos e só linhas acrescentadas | Passou (2 arquivos, 6+, 0-) |
| `git diff -U0` não toca a linha `color-scheme: dark;` | Passou |
| `npm run lint` código 0 | Passou (`eslint .`, sem problemas) |
| `npm run build` código 0 (inclui `tsc -b`) | Passou (`build_rc=0`; HTML público gerado para 8 rotas) |
| `npm test` código 0 | Passou: 316 testes, 316 passaram, 0 falharam |
| `npm run test:public-home` código 0 | **Falhou** (código 1). Ver seção própria abaixo. |
| `name="color-scheme" content="only light"` em `dist/index.html` = 1 | Passou (1) |
| Mesma meta nas páginas pré-renderizadas | Passou: `dist/ranking/index.html`, `dist/aprender/index.html`, `dist/glossario/index.html` = 1 cada. O build gerou 13 `index.html`; nenhum deles ficou sem a meta. |
| Lista de `color-scheme:` no CSS gerado, antes e depois | Ver seção própria abaixo. Passou (a reserva `light` sobreviveu à minificação). |
| Prettier de `index.html` e `src/index.css` | **Não executado**: `npx --no-install prettier` pediu instalação (prettier não é dependência do projeto). Não instalei. |

## Teste de home pública (`npm run test:public-home`)

Código de saída 1. Saída resumida (9 aprovados, 1 falhou):

```
PASS: HTML pré-renderizado contém título exato
PASS: desktop: etapas, navegação, título e console
PASS: desktop-baixo: etapas, navegação, título e console
PASS: tablet: etapas, navegação, título e console
PASS: mobile: etapas, navegação, título e console
PASS: mobile-320: etapas, navegação, título e console
PASS: mobile-320-baixo: etapas, navegação, título e console
PASS: mobile-paisagem: etapas, navegação, título e console
FAIL: desktop-reduced: etapas, navegação, título e console AssertionError [ERR_ASSERTION]: Pixels pausados/reduzidos precisam permanecer iguais: {"different":30509,"total":330000,"comparisons":[{"different":30509,"maxChannelDelta":3},{"different":30509,"maxChannelDelta":3},{"different":30509,"maxChannelDelta":3},{"different":30509,"maxChannelDelta":3}]}
    at temporalMotion (tests/public-home.browser.mjs:198:12)
PASS: mobile-reduced: etapas, navegação, título e console
```

Análise (não verificada por controle):

- A asserção de `temporalMotion` compara quadros da própria página em movimento reduzido. Ela não compara com a cor do tema. A diferença é pequena (máximo de 3 níveis por canal em 30.509 de 330.000 pixels), típica de ruído de renderização e composição.
- Não tenho evidência de relação com `color-scheme`. A página já é tema claro, e `only light` só afeta cores padrão que o navegador aplica a controles e barras de rolagem, que não entram nessa comparação.
- Não rodei o mesmo teste sobre o controle (build de controle (sem a correção), guardado fora do repositório): o script sobe o próprio preview na porta 4191 apontando para o `dist` do worktree, e não houve tempo de adaptar sem mexer no teste. Por isso a afirmação "não tem relação" fica como hipótese, não como fato.
- Não adaptei o teste nem o limite de pixels, como pede o brief.

Próximo passo sugerido: rodar `desktop-reduced` duas ou três vezes no worktree e, se repetir, rodar o mesmo teste sobre o controle para comparar.

## color-scheme no CSS gerado

Depois (`dist/assets/*.css`):

```
1 Aprender-C9y9enBF.css: color-scheme:inherit
1 Home-CG8xFh8B.css: color-scheme:inherit
2 ResearchSample-zrBbHQG9.css: color-scheme:inherit
1 index-CYKTVoZA.css: color-scheme:dark
1 index-CYKTVoZA.css: color-scheme:light
1 index-CYKTVoZA.css: color-scheme:light only
```

Controle (`dist-controle`):

```
1 Aprender-C9y9enBF.css: color-scheme:inherit
1 Home-CG8xFh8B.css: color-scheme:inherit
2 ResearchSample-zrBbHQG9.css: color-scheme:inherit
1 index-D_HJfCk9.css: color-scheme:dark
1 index-D_HJfCk9.css: color-scheme:light
```

A reserva `light` sobrevive à minificação. A única diferença é a nova regra `color-scheme:light only`, que a minificação preservou como `light only`.

## Testes que dependem do `<head>` ou de `color-scheme`

Sim, um teste depende: `tests/theme.test.mjs` linhas 201-215. Ele exige `color-scheme: light;` no primeiro bloco `:root`, `color-scheme: dark;` no bloco de tema escuro e a meta `<meta name="theme-color" content="#f7f8f6" />` exata. A reserva `light` foi mantida e a meta `theme-color` não foi tocada, então o teste continua verde (`npm test`: 316/316). Nenhum outro arquivo em `tests/` cita `color-scheme` ou `theme-color`.

## Limites

- Não validado em Samsung Internet real nem em Android com modo escuro. O efeito de `only light` só pode ser confirmado nesse aparelho.
- O teste `desktop-reduced` falhou; a causa não foi confirmada (ver análise acima).
- Prettier não executado.
- Nenhum commit, push, deploy ou claim de harness foi feito.

## Próximo passo

Confirmar em aparelho real (Samsung Internet com modo escuro) que o tema claro não escurece. Decidir sobre a falha `desktop-reduced`: repetir o teste ou comparar com o controle antes de publicar.

## Validação posterior (Lupa e Vigia, 23/11)

- Lupa: aprovado com ressalvas; a única ressalva era o caminho absoluto neste relato (corrigido aqui).
- Vigia: no Chrome 157 de computador com escurecimento forçado (WebContentsForceDark), o pixel do fundo continuou #20211f com e sem a correção. Nesse ambiente a correção não fez efeito.
- Vigia: tema claro normal e tema escuro escolhido idênticos ao controle; sem rolagem horizontal em 320, 768 e 1280 px; avisos educativo e de dividendos não garantidos visíveis; erros de console iguais ou menores que no controle.
- test:public-home desktop-reduced: com a correção, 1 falha em 3 rodadas (ERR_CONNECTION_REFUSED, servidor ainda subindo); no controle, 0 em 3. A causa da falha de pixels anterior não foi provada.
- Próximo passo: o dono testa num celular real por uma prévia da Vercel.
