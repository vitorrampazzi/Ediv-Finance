# Revisão da 2H (Pincel): texto do rodapé, comentário dos tokens e correção do relato da 2B

Revisora: Lupa (somente leitura). Data: 17/11/2026. Relato do executor: `docs/harness/relatos/interface-etapa2h-2026-11-17.md`. Não rodei build, lint nem testes (o Pincel começou a C3 e vai buildar). Li o código, o diff e o `dist/` que já existia.

## Veredito: aprovado

Os três pontos pedidos passam e o item 3 da 2H (`/aprender` a 1920) não tem mudança de código. Não há achado Crítico nem Obrigatório. Há uma observação menor (Nit) sobre o relato da 2B.

## 1. Rodapé

**Texto na fonte.** `src/components/SiteChrome.tsx`, parágrafo do rodapé (linhas 273–276). Juntando as quebras de linha do JSX, o texto é, caractere por caractere:

> Conteúdo educativo, sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados futuros não são garantidos.

É exatamente o texto aprovado pelo dono. No `HEAD` era "Investir envolve riscos, e resultados passados não garantem resultados futuros." O aviso de que dividendos não são garantidos, que a regra da casa manda manter, continua e agora está explícito.

**O que mais mudou no rodapé.** O diff do arquivo (`git diff -U0`, `6 2`) tem 2 linhas removidas e 2 linhas novas no `<p>` do rodapé (a frase de risco). As outras 4 linhas acrescentadas são `width="192" height="192"` nas duas `<img>` do ícone (`:90` e `:259`). Isso **não é da 2H**: é o item 4 da 2A, registrado em `docs/harness/relatos/interface-etapa2a-2026-11-16.md:27` ("`SiteChrome.tsx` 90, 259: `width="192" height="192"` em cada uma"). O diff contra o `HEAD` mistura as duas etapas, que ainda não foram commitadas. Do que é da 2H, só mudou o texto do parágrafo: classes (`mt-2 max-w-sm text-xs leading-relaxed text-evo-textSec`), cor, fonte e posição estão como estavam.

**`dist/` (build das 07:27:09, depois da última edição de `SiteChrome.tsx` às 07:26:37, então o build é do código atual).** Li os 16 arquivos `.html` de `dist/`, tirando tags e scripts e normalizando espaços:

| Resultado | Páginas |
|---|---|
| Texto novo exato, 1 vez, sem o antigo | `index.html` (`/`), `aprender`, `assessoria`, `glossario`, `metodologia`, `privacidade`, `ranking`, `suporte` (**8 de 8**) |
| Sem rodapé (telas sem o chrome público) e **sem** o texto antigo | `404.html`, `acao.html`, `app.html`, `cadastro`, `entrar`, `recuperar-senha`, `redefinir-senha`, `verificar` |

- "resultados passados" e "não garantem" não aparecem em nenhum dos 16 HTML (busca no HTML inteiro, não só no texto visível) nem em nenhum `dist/assets/*.js`. O texto novo está no bundle do cliente (`index-*.js`), então a página renderizada no navegador também mostra o novo.
- `git grep` por "resultados passados" e "não garantem" em `src`, `server`, `tests`, `scripts`, `site-pages.mjs`, `index.html` e `public`: nenhuma ocorrência. Não sobrou cópia do texto antigo em outro lugar.

## 2. Comentário acima dos tokens de movimento (`src/index.css:36-38`)

```css
/* Escala de movimento: fast 150 ms (cor, transform de toque), base 180 ms
   (bordas, estados), slow 250 ms (abertura de menus). --ediv-ease-out é uma
   curva própria, diferente da palavra-chave ease-out do CSS. */
```

É curto (3 linhas), fica logo acima dos tokens (`:42-44` têm 150ms, 180ms e 250ms; `:40` tem `--ediv-ease-out: cubic-bezier(0.2, 0, 0, 1)`) e é correto:

- **Escala:** os valores 150, 180 e 250 batem com `--ediv-duration-fast`, `-base` e `-slow`.
- **Papéis:** `fast` é usado para cor e transform (`index.css:309-311`, `learning-workspace.css:149-150, 286-287`, `navigation-chrome.css:25`); `base` em borda (`index.css:380`, `border-color`); `slow` na abertura do menu (`index.css:288`, `ediv-menu-open`). Descreve o uso real.
- **A diferença entre o token e a palavra-chave:** `--ediv-ease-out` é `cubic-bezier(0.2, 0, 0, 1)`; a palavra-chave `ease-out` do CSS é `cubic-bezier(0, 0, 0.58, 1)`. São curvas diferentes. A ressalva é útil porque o código ainda mistura as duas: `var(--ediv-duration-fast) ease-out` aparece em `learning-workspace.css:149, 150, 201, 202, 286, 287, 378, 379` e `navigation-chrome.css:25`, e `var(--ediv-ease-out)` em `index.css:288`. Quem lê o comentário entende que isso é intencional e que não são a mesma coisa.
- Só comentário: o diff de `index.css` nessa região não muda nenhum valor (as linhas de token são as da 2B, já revisada). O resto do diff do arquivo é da 2B.

Observação (FYI, não pede ação): o comentário diz "escala" e há durações fora dela no CSS (`public-home.css`, `public-sections.css`, `home-area-cards.css`, `teaching-journey.css`: 70, 150 literal, 180 literal, 220, 250, 300, 350 ms) e a animação `ediv-page-rise 260ms` em `index.css`. Isso já estava fora do escopo da 2B (a decisão do Orquestrador foi tokenizar só os casos listados) e o comentário não promete que tudo usa a escala. Só registro para ninguém ler "escala" como "todas as durações do site".

## 3. Correção do relato da 2B (`docs/harness/relatos/interface-etapa2b-2026-11-16.md`)

O arquivo é novo (`??` no git), então não há diff. Li o texto atual:

- Linha 5 (resumo): "3 alvos de toque tiveram a classe trocada de `min-h-10` para `min-h-11` (a altura real já era 44 px pela regra de `navigation-chrome.css:111-112`; a troca só alinha a classe a ela)".
- Linha 99: "**Antes:** 44 px nos três itens, já pela regra `min-height: 2.75rem` em `navigation-chrome.css:111-112`… A Lupa mediu 44 px antes e depois. A troca para `min-h-11` só alinha a classe à altura real; não mudou a área de toque."
- Não sobrou nenhuma frase "antes 40 px" (`grep` por "40 px" no arquivo: 0).

**É factual.** Conferi a regra: `src/components/navigation-chrome.css:111-112` é `.ediv-profile-popover :is(a, button) { min-height: 2.75rem; … }`, 2,75 rem = 44 px. Isso bate com a minha medição na revisão da 2B (`revisao-etapa2b-2026-11-17.md`, tabela: 44 e 44 px, com controle de 40 px sem a regra). As referências de arquivo e linha existem. Os três itens citados (`DashboardLayout.tsx:259, 286, 322`) são os que o diff troca de `min-h-10` para `min-h-11`.

**Nit (baixa).** A tabela das linhas 94–97 lista 3 itens trocados mais "Administração, Início da Escola, Configurações, Rever introdução" (4), e a linha 136 diz "6 de 6 itens com 44 px". A soma da tabela é 7, a linha 136 diz 6. A diferença provavelmente é o item "Administração", que só aparece para conta de administrador (`DashboardLayout.tsx:240`, não verifiquei a condição) e a sessão simulada não é de administrador. Se for isso, vale uma frase no relato ("Administração não aparece na sessão simulada"); se não for, os números estão inconsistentes. Não muda nada no código nem a conclusão.

## 4. Item 3 da 2H (`/aprender` a 1920)

`git status --short -- src/pages/Aprender.tsx`: sem mudança. Nada em `Aprender.tsx` foi alterado, como o Orquestrador decidiu (pendência). O relato registra a causa e as duas propostas; não revisei esse diagnóstico porque o pedido era só confirmar que o código não mudou.

## Por prioridade do papel

1. **Honestidade financeira:** sem achado. O aviso "dividendos e resultados futuros não são garantidos" está no rodapé das 8 páginas públicas. Não há número novo.
2. **Segurança:** sem achado (nenhuma rota, segredo ou resposta tocada).
3. **Regressão:** sem achado. Nenhuma rota pública nova; `site-pages.mjs`, `entry-server.tsx` e `vercel.json` não precisavam mudar.
4. **Textos proibidos:** sem achado. O texto novo não traz "tempo real", "com atraso" nem data ou horário de cotação; sem menção a IA.
5. **Qualidade:** a observação sobre "escala" (FYI) e o Nit do relato da 2B.
6. **Estilo:** sem achado.

## O que não vi

- Não rodei build, lint nem testes. Conferi o `dist/` que o Pincel gerou às 07:27:09; ele pode ser sobrescrito pelo build da C3.
- Não revisei o diagnóstico do CLS de `/aprender`, só que `Aprender.tsx` não mudou.
- As mudanças da C3 em andamento (`src/lib/api.ts`, `src/context/AuthProvider.tsx`, `tests/`, `package.json`) não fazem parte desta revisão.

Único arquivo que escrevi: este relato. Script descartável no scratchpad da sessão, fora do repositório.
