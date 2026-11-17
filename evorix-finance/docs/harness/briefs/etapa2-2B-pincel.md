# Brief 2B — Pincel: tokens de movimento e consistência

Para: Pincel (interface). Etapa 2. Ordem do Pincel: 2F, 2C, depois **2B**. **Só comece depois que a 2C passou na revisão** e o Pincel liberou os caminhos dela.

## Comece por aqui (antes de ler ou editar qualquer coisa)

```
maestri note read "Contexto Escola"
node scripts/harness.mjs status
node scripts/harness.mjs claim interface src/index.css src/components/learning-workspace.css src/components/navigation-chrome.css src/layouts/DashboardLayout.tsx docs/harness/relatos/interface-etapa2b-2026-11-16.md
node scripts/harness.mjs update interface trabalhando "2B: tokens de movimento e consistência"
```

Leia da nota as seções 3, 4 e 10. Se `maestri note read` não achar a nota, **pare** e avise o Orquestrador. Se `status` mostrar outro papel com um desses caminhos, **pare** e avise. Ao terminar:

```
node scripts/harness.mjs update interface revisao "2B pronto para revisão da Lupa"
node scripts/harness.mjs release interface
```

## Objetivo

Dar nomes (tokens) às durações e easings que já existem, sem mudar a aparência, e fechar duas pequenas inconsistências apontadas na auditoria (alvo de toque e CSS que não é usado).

> **Item removido em 17/11 (decisão do Orquestrador): `src/components/PortfolioPulse.tsx:148` (`motion-reduce:animate-none`).** Motivo: `PortfolioPulse.tsx` é um arquivo órfão (nenhuma tela o importa; só `src/pages/Carteira.tsx` e `src/pages/Dashboard.tsx`, também órfãos) e será **apagado** na entrega C2 do Eixo C (`docs/harness/briefs/eixoC-C2-pincel.md`, grupo 1; decisão do dono em 17/11). Editar um arquivo que vai ser apagado é trabalho jogado fora e criaria conflito com a C2. **Não toque em `PortfolioPulse.tsx` nesta entrega.** O passo 5 e os critérios que o citavam foram retirados abaixo.

## Contexto mínimo

- Plano: `docs/harness/briefs/01-plano-etapa2.md`, seção 2B. Relato 1A: `docs/harness/relatos/interface-auditoria-ux-2026-11-16.md`, seções 2, 3 e 4, e recomendações 3, 4 e 8.
- Hoje só existe um token de movimento: `--ediv-ease: cubic-bezier(0.2, 0.8, 0.2, 1)` em `src/index.css:34`.
- Durações literais a tokenizar (valores que **já existem**, relato 1A, seção 2): 140, 150, 160, 180 e 250 ms. Outras (0 ms, 65 ms, 120 ms, 220 ms, 260 ms, 350 ms) e as longas decorativas (3 s a 18 s) **não** entram nos tokens: ficam como estão, listadas no relato como "casos justificados". Easings existentes: `var(--ediv-ease)`, `cubic-bezier(0.2, 0, 0, 1)` (`index.css:270,278`), `cubic-bezier(0.22, 1, 0.36, 1)` (`index.css:814`, `learning-workspace.css`, `home/public-home.css`, `home/hero-brand.css`), `cubic-bezier(0.2, 0.65, 0.3, 1)` (`index.css:340`), `ease-out` e `ease-in-out`.
- Proposta de nomes do relato 1A (seção 2): `--ediv-dur-fast` (140 ms), `--ediv-dur-base` (180 ms), `--ediv-dur-slow` (260 ms), `--ediv-ease-out` (`cubic-bezier(0.2, 0, 0, 1)`), `--ediv-ease-emphasis` (`cubic-bezier(0.22, 1, 0.36, 1)`). **Atenção:** o plano manda usar "os mesmos valores que já existem, sem mudança visual", e a proposta do relato junta 150 e 160 ms em 140 ms, e 250 ms em 260 ms (mudaria o valor). Siga o plano: um token para **cada valor existente**, sem arredondar.
- Regra global de movimento reduzido já existe em `src/index.css:817-826`; não mexa nela.
- Tailwind 4.3.3, `@config "../tailwind.config.js"` e `@source "./components/stock-make"` já estão no topo de `src/index.css` (linhas 1-5).

## Pode ler primeiro / pode editar

- Ler primeiro: `src/index.css`, `src/components/learning-workspace.css`, `src/components/navigation-chrome.css`, `src/layouts/DashboardLayout.tsx` (linhas 250-330).
- **Pode editar:** `src/index.css`, `src/components/learning-workspace.css`, `src/components/navigation-chrome.css`, `src/layouts/DashboardLayout.tsx` (só os três `min-h-10`).
- **Pode criar:** o relato `docs/harness/relatos/interface-etapa2b-2026-11-16.md`.

## Fora do escopo

- Mudar qualquer valor de duração ou easing, trocar fonte ou paleta, trocar framer-motion por CSS.
- Tokenizar as durações longas decorativas e os valores fora da lista (65, 120, 220, 350 ms etc.).
- Os outros CSS que usam easings (`home/public-home.css`, `home/hero-brand.css`, `home/teaching-journey.css`): **não editar**, nesta entrega só os três arquivos da lista.
- `src/components/PortfolioPulse.tsx` (arquivo órfão, será apagado na C2; ver o aviso no Objetivo).
- Skeletons (2C), CLS (2F), qualquer texto legal, regra financeira ou número exibido.
- Editar `tests/`, `package.json`, `server/`. Instalar dependência.

## Passos

1. **Antes de editar:** com o `dist/` atual servido em `npx vite preview --port 4173`, tire capturas "antes" (320, 768 e 1280 px, claro e escuro; forçar o tema como `public/theme-init.js` faz) de `/`, `/ranking`, `/aprender`, `/glossario` e `/entrar`, e registre `getComputedStyle(...).transitionDuration` e `transitionTimingFunction` de um elemento por regra alterada (botão, link do menu, card, aba). Script Playwright **descartável fora do repositório**, apagado ao terminar. Rode também: `grep -nE "[0-9]+(\.[0-9]+)?ms" src/index.css src/components/learning-workspace.css src/components/navigation-chrome.css` e guarde a lista (linha e valor).
2. **Item 1: tokens.** > **Decisão do Orquestrador (17/11), substitui o texto abaixo e a última frase da linha 32:** três tokens de duração, não cinco: `--ediv-duration-fast: 150ms` (substitui 140, 150 e 160 ms; diferença de no máximo 10 ms, abaixo do perceptível), `--ediv-duration-base: 180ms` e `--ediv-duration-slow: 250ms`. Easings: `--ediv-ease-out` (`cubic-bezier(0.2, 0, 0, 1)`) e `--ediv-ease-emphasis` (`cubic-bezier(0.22, 1, 0.36, 1)`). Cinco tokens para valores quase iguais não formam escala. As únicas mudanças de valor permitidas são 140 → 150 e 160 → 150; liste no relato cada linha que mudou de valor. Texto original: Em `src/index.css`, ao lado de `--ediv-ease` (`:34`), crie um token para cada duração existente (140, 150, 160, 180 e 250 ms) e para cada easing `cubic-bezier` que se repete (`0.2, 0, 0, 1` e `0.22, 1, 0.36, 1`), todos com prefixo `--ediv-`. Os nomes são seus; use os da proposta do relato quando o valor coincidir (140 → `--ediv-dur-fast`, 180 → `--ediv-dur-base`) e registre a tabela valor → token no relato. Troque os literais correspondentes **somente** em `src/index.css`, `src/components/learning-workspace.css` e `src/components/navigation-chrome.css`. `--ediv-ease` continua como está.
3. **Item 2: Tailwind lendo `docs/`.** Em `src/index.css`, junto das diretivas do topo (linhas 1-5), acrescente `@source not "../docs";`. Antes, confirme com `grep -rn "ease-in-out" src --include=*.tsx --include=*.ts` que **nenhum** arquivo `.tsx` ou `.ts` de `src/` usa a classe `ease-in-out` (os usos em `src/` são valores dentro de arquivos `.css`, que o Tailwind não escaneia). Se algum `.tsx` ou `.ts` usar a classe, **pare** e pergunte.
4. **Item 3: alvo de toque.** `src/layouts/DashboardLayout.tsx:259`, `:286` e `:322`: troque `min-h-10` por `min-h-11` (44 px). Nenhuma outra classe muda.
5. **Item 4: removido** (17/11). Não faça nada aqui: `PortfolioPulse.tsx` é órfão e será apagado na C2. No relato, registre "item 4 retirado do brief: arquivo órfão, apagado na C2".
6. **Item 5: microinterações.** O relato 1A não lista nenhum achado de falta de feedback de toque ou foco. **Não faça nada neste item** a menos que o despacho do Orquestrador ou a revisão da Lupa traga uma lista de achados; sem lista, registre "nenhum achado, não executado". Se houver lista: use só os tokens novos, sem animação longa ou repetitiva.
7. **Validação** (comandos abaixo) e capturas "depois" no `dist/` novo.

## Critérios de aceite (observáveis)

- [ ] `grep -nE "[0-9]+(\.[0-9]+)?ms" src/index.css src/components/learning-workspace.css src/components/navigation-chrome.css` mostra só: as definições dos tokens e os "casos justificados" (valores fora da lista, listados no relato com linha e motivo). Nenhum literal de 140, 150, 160, 180 ou 250 ms fora da definição dos tokens.
- [ ] Capturas "depois" iguais às "antes" nas 5 páginas, em 320, 768 e 1280 px, claro e escuro; `transitionDuration` e `transitionTimingFunction` calculados iguais antes e depois nos elementos amostrados.
- [ ] Depois do build: `grep -c "\.ease-in-out{" dist/assets/index-*.css` imprime `0` (hoje a classe aparece, vinda de `docs/`), e `grep -rn "ease-in-out" src --include=*.tsx --include=*.ts` não mostra uso da classe. O visual continua igual.
- [ ] Em `DashboardLayout.tsx`, os 3 itens medem 44 px ou mais de altura em 390 px (`boundingBox().height`), num navegador com o menu aberto e sessão simulada (`GET /api/auth/me` 200 com usuário fictício, via `page.route`). Se a simulação não funcionar, relate "medição não executada" e o motivo; o critério então fica comprovado só pelo `git diff` (`min-h-10` → `min-h-11`).
- [ ] `git diff -- src/components/PortfolioPulse.tsx` vazio (o arquivo não é tocado nesta entrega).
- [ ] `npm run lint`, `npm test`, `npx tsc -p tsconfig.app.json --noEmit` e `npm run build` passam.
- [ ] `git status --short` lista só os caminhos permitidos, mais `docs/harness/state.json` e os arquivos dos outros executores.

## Comandos de validação (em `evorix-finance/`)

```
grep -nE "[0-9]+(\.[0-9]+)?ms" src/index.css src/components/learning-workspace.css src/components/navigation-chrome.css
grep -rn "ease-in-out" src --include=*.tsx --include=*.ts
npm run lint
npm test
npx tsc -p tsconfig.app.json --noEmit
npm run build
grep -c "\.ease-in-out{" dist/assets/index-*.css
npx vite preview --port 4173
git diff --stat
git status --short
node scripts/harness.mjs check
```

Porta do Pincel: **4173** (a 4175 é do Vigia). Medições e capturas só contra `localhost`.

## Formato do relato

Arquivo `docs/harness/relatos/interface-etapa2b-2026-11-16.md`, em português, com estas seções numeradas:

1. Tabela valor → token (durações e easings), com `arquivo:linha` da definição.
2. Literais trocados: quantos por arquivo, antes e depois, e a lista dos "casos justificados" que sobraram.
3. Item 2 (`@source not`): prova de que nenhum `.tsx`/`.ts` usa a classe, e o resultado do `grep` no CSS do build, antes e depois.
4. Item 3: `arquivo:linha` alterado e a medição de 44 px (ou "não executada" com o motivo). Item 4: "retirado do brief: `PortfolioPulse.tsx` é órfão e será apagado na C2".
5. Capturas e valores calculados, antes e depois.
6. Item 5: "nenhum achado, não executado", ou a lista recebida e o que foi feito.
7. Comandos rodados e resultado (passou, falhou, não executado e por quê).
8. Limites e próximo passo.

Ao terminar: `maestri ask "Orquestrador" "<resumo de até 15 linhas + caminho do relato>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em código, log ou relato. Não abra `.env*`.
- Usuário simulado só fictício, só no script descartável. Não meça nem abra a produção.
- Não faça commit, push, deploy, stash nem reset. Deixe o diff na árvore para a Lupa.
- Não adicione linha de autoria de IA.
