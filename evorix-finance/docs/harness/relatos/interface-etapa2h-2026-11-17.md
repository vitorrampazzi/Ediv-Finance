# Relato da interface, etapa 2H (17/11/2026)

**Resultado em uma linha:** texto do rodapé trocado (aprovado pelo dono), comentário da escala de movimento adicionado, relato da 2B corrigido; CLS de `/aprender` a 1920×1080 diagnosticado (causa identificada), **não corrigido**, porque a correção não é pequena (exige decisão de layout do estado de carregamento).

## 1. Texto do rodapé

- Arquivo: `src/components/SiteChrome.tsx` (parágrafo do rodapé, antes linhas 274–276).
- Texto agora: "Conteúdo educativo, sem recomendação individual de investimento. Investir envolve riscos; dividendos e resultados futuros não são garantidos."
- Nada mais do rodapé mudou.
- Conferência no `dist/` após `npm run build`: 8 páginas pré-renderizadas trazem o texto novo (`/`, `/aprender`, `/assessoria`, `/glossario`, `/metodologia`, `/privacidade`, `/ranking`, `/suporte`). Nenhum HTML gerado traz o texto antigo ("resultados passados não garantem").

## 2. Ajustes da revisão da 2B

- `src/index.css` (acima dos tokens `--ediv-*` de movimento): comentário curto explicando a escala (fast 150 ms, base 180 ms, slow 250 ms) e que `--ediv-ease-out` é uma curva própria, diferente da palavra-chave `ease-out`. Só comentário; nenhum valor mudou.
- `docs/harness/relatos/interface-etapa2b-2026-11-16.md`: corrigida a frase "antes 40 px". Os itens já tinham 44 px pela regra `min-height: 2.75rem` em `src/components/navigation-chrome.css:111–112` (`.ediv-profile-popover :is(a, button)`). A Lupa mediu 44 px antes e depois. A troca para `min-h-11` só alinha a classe à altura real; não mudou a área de toque. A mesma correção foi feita no resumo do início do relato.

## 3. CLS de `/aprender` em 1920×1080

**Medição (script oficial `tests/perf-baseline.mjs`, `MOCK_API=1 RUNS=3 ONLY=/aprender ATTRIBUTION=1`, `DIST_DIR=dist`, `BASE_URL=http://localhost:4173`):**

| Viewport | CLS | Layout-shift atribuído |
|---|---|---|
| 390 px | 0,020 | `section#learning-panel-curso`: y 607 → 555 (−52 px) |
| 1280 px | 0,022 | `section#learning-panel-curso`: y 606 → 514 (−92 px); altura 194 → 286 |
| 1920 px (script descartável, fora do repo) | **0,227** | `section#learning-panel-curso`: y 606 → 514 (−92 px); altura 430 → 566. Também `footer` de `#pagina-conteudo` 8 px → 0 |

O 0,227 reproduziu nas 3 cargas, no mesmo instante (~1406–1446 ms), em um único evento de layout-shift sem `hadRecentInput`.

**Causa (verificada no código e na atribuição):**
- Em `src/pages/Aprender.tsx`, o bloco `role="status"` do carregamento (bloco `{loading && …}`, abaixo das abas) tem um esqueleto `<div className="h-20 …">` que só existe enquanto `!content`, dentro de um `space-y-3`.
- Quando `content` chega enquanto `loading` ainda é `true`, o esqueleto sai do fluxo. Ele mede 80 px (`h-20`) mais 12 px de espaçamento (`space-y-3`) = **92 px**, exatamente o deslocamento que a atribuição mostra em 1280 e 1920. Essa soma é aritmética sobre o código, não uma medição direta do elemento isolado.
- Tudo abaixo (o painel de aulas) sobe 92 px. O painel cresce depois com o conteúdo real do carrossel.

**Por que só 1920 aparece com 0,227:** o deslocamento existe nas três larguras (52, 92 e 92 px), mas o CLS depende da fração da viewport coberta pelo painel antes e depois do salto. Em 1920×1080 o painel é alto (430 px antes do salto) e ocupa boa parte da metade inferior da tela; em 1280×800 ele é baixo (194 px) e a área afetada é menor. Não recalculei a fórmula exata do navegador. O que está medido: a mesma origem, o mesmo tipo de salto, e o painel maior antes do salto em 1920.

**Por que não corrigi:** a correção natural (manter o espaço do esqueleto até o fim do carregamento) não é pequena. Se o espaço for mantido também depois do carregamento, cria um vão de 92 px permanente em 390 e 1280 px (mudança de layout que a instrução proíbe). Se o esqueleto sair do fluxo (absoluto), o painel já começa na posição final, mas o estado de carregamento passa a se sobrepor ao painel, o que muda o comportamento visual do carregamento. Isso é decisão de layout/UX, não ajuste de reserva de altura.

**Correção proposta (para decisão do Orquestrador):**
1. Preferida: o estado de carregamento não ocupa altura no fluxo. O esqueleto fica dentro de um contêiner de altura fixa que já existe na posição final (por exemplo, o próprio painel `#learning-panel-curso` com `min-height` fixo durante o carregamento), e o painel de aulas mantém a mesma posição antes e depois. Exige desenhar o estado de carregamento e medir 390, 1280 e 1920.
2. Alternativa: trocar o esqueleto por um placeholder do mesmo tamanho do conteúdo final e só remover quando `loading` terminar, para que o salto de 92 px não ocorra junto com a chegada de `content`. Também altera o carregamento; precisa de QA visual.
3. A linha do rodapé (`footer` 8 px → 0) é outro salto pequeno do mesmo evento; entra na mesma correção.

Tarefa separada recomendada, com a Lupa medindo antes e depois em 390, 1280 e 1920.

## Validação

- `npm run lint`: passou (exit 0).
- `npx tsc -b`: passou (exit 0).
- `npm test`: 298 testes, 298 passaram, 0 falharam.
- `npm run build`: passou (8 rotas pré-renderizadas, `QA=false`).
- `node --test tests/seo.dist.mjs`: 9 testes, 9 passaram, 0 falharam.
- Medição CLS: executada (ver seção 3). Antes e depois não se aplicam, porque nenhuma correção de layout foi feita.

**Limites:**
- O preview foi servido na porta 4173 e acessado por `localhost`; `127.0.0.1` não respondeu neste ambiente Windows. Por isso o `BASE_URL` usado foi `http://localhost:4173`.
- Não foi rodado teste de navegador nos 320/768/1280 px porque a mudança é só texto de rodapé e comentário CSS; não há mudança de layout nem de cor.
- Script descartável do 1920 em `C:\Users\vitor\AppData\Local\Temp\claude\d3173e2dd37df12c\c1906637-a032-4d53-b83b-e8b6a5b2209a\scratchpad\perf-1920.mjs`; fora do repositório.
- Nenhum arquivo apagado, nenhum doc da C2 e nenhuma regra financeira foram tocados.

**Arquivos alterados nesta etapa:** `src/components/SiteChrome.tsx`, `src/index.css` (só comentário), `docs/harness/relatos/interface-etapa2b-2026-11-16.md` (correção), `docs/harness/relatos/interface-etapa2h-2026-11-17.md` (este relato).

**Próximo passo:** decidir a abordagem do CLS de `/aprender` (opções 1 ou 2 acima) e abrir tarefa separada.
