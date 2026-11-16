# QA independente — evolução de 13/11/2026 (relato)

Papel: `qa`. Data da execução: 16/11/2026. Branch `vitorrampazzi/evolucao-2026-11-13`.
Build verificado: `dist/` gerado pela coordenação. Nenhum arquivo de produto foi alterado.
Artefatos: `.test-artifacts/qa-evolucao-2026-11-13/` (scripts, JSON de resultados e capturas).

## Veredito

**NÃO APTO para publicação**, por um único critério falhado: títulos de aba de `/entrar`
e `/cadastro`. Todos os demais critérios medidos passaram (detalhes abaixo). Se o dono
aceitar formalmente a exceção documentada na coordenação (páginas de conta com só a
marca no título), o veredito passa a APTO, sem outro bloqueio conhecido nesta validação.

## Ambiente e método

- Dist local servido com `node node_modules/vite/bin/vite.js preview --port 4310 --strictPort --host 127.0.0.1`.
  Encerrado após a última execução.
- Origem de produção (`https://escoladodividendo.com.br`) interceptada por `page.route` e
  respondida com o dist local. Serve só para o analytics liberar o aviso de cookies, que
  depende dessa origem (`analytics-policy.mjs`, `allowedOrigin`). Nenhuma requisição sai da
  máquina; GA e demais hosts externos são abortados.
- `/api/*` respondido com fixture: `/api/auth/me` 401; demais 503. Em `/entrar` e `/cadastro`
  as rotas de erro foram simuladas com 401 e 400 para o teste de `aria-invalid`.
- Um navegador e um servidor por vez; tudo encerrado ao final. Sem banco, sem `.env*`,
  sem `db:*`, sem deploy, sem git de escrita.
- Script de dicas: cópia de `.test-artifacts/evolucao-empresas/capturas.mjs` em
  `.test-artifacts/qa-evolucao-2026-11-13/capturas-empresas.mjs`, com saída redirecionada
  para a pasta de QA (o original escreve em `evolucao-empresas/`). Servidor de desenvolvimento
  em 5183, como o script espera.
- Já verificados pela coordenação e não repetidos aqui: tsc, eslint, `npm test`, `npm run build`
  e as suítes de navegador listadas no pedido.

## Tabela de verificações

Matriz de páginas: `publicas.mjs` (`resultado-publicas.json`). 9 páginas x 5 larguras
(360, 390, 768, 1280, 1440) x 2 temas = 90 cargas.

| # | Verificação (comando/rota) | Largura | Tema | Resultado |
|---|---|---|---|---|
| 1 | Rolagem horizontal (`scrollWidth - innerWidth`), todas as páginas | 360–1440 | claro e escuro | PASSOU 90/90, excesso 0 px |
| 2 | Exatamente um `h1`, todas as páginas | 360–1440 | claro e escuro | PASSOU 90/90 |
| 3 | Tema aplicado: claro na primeira visita com sistema em escuro (sem storage); escuro com `"dark"` gravado | 360–1440 | claro e escuro | PASSOU 90/90 (`data-theme` = light/dark) |
| 4 | Home no claro não pede `ediv-hero-forest` | 360–1440 | claro | PASSOU 0 pedidos em 45 cargas claras |
| 5 | Home no escuro pede a imagem da floresta (esperado) | 360–1440 | escuro | Informativo: 1 pedido por largura |
| 6 | Fundo do topo claro (lum. relativa 0,936 na home; 0,871 em `/entrar`) | 360–1440 | claro | PASSOU 45/45; home `rgb(247, 248, 246)` |
| 7 | Erros de console/página da aplicação (filtrados só erros de rede esperados) | 360–1440 | claro e escuro | PASSOU 90/90, zero erros |
| 8 | Aviso de cookies na home | 360–1440 | claro e escuro | PASSOU 10/10 visível |
| 9 | Aviso de cookies ausente em `/entrar` e `/cadastro` | 360–1440 | claro e escuro | PASSOU 20/20 ausente |
| 10 | Título da home = "Escola do Dividendo" | 360–1440 | claro e escuro | PASSOU 10/10 |
| 11 | Títulos "Escola do Dividendo \| ..." em metodologia, glossário, aprender, ranking, suporte, privacidade | 360–1440 | claro e escuro | PASSOU 60/60 |
| 12 | Título de `/entrar` e `/cadastro` com prefixo e único | 360–1440 | claro e escuro | **FALHOU 20/20** (ver D1) |
| 13 | Títulos únicos entre as páginas (1440, claro) | 1440 | claro | **FALHOU**: `/entrar` e `/cadastro` repetem o título da home |
| 14 | Foco visível por Tab em `/entrar` (11 paradas, anel `solid 2px`, `:focus-visible`) | 1440 | claro e escuro | PASSOU 2/2 |
| 15 | Foco visível por Tab em `/cadastro` (11 paradas) | 1440 | claro e escuro | PASSOU 2/2 |
| 16 | `aria-invalid="true"` e `aria-describedby="login-error"` após 401 em `/entrar`; mensagem exibida | 1440 | claro e escuro | PASSOU 2/2 |
| 17 | `aria-invalid` após 400 em `/cadastro`; mensagem exibida | 1440 | claro e escuro | PASSOU no e-mail (2/2); nome e senha sem marcação (ver D3) |
| 18 | Movimento: animações infinitas na home a 390 px (`getAnimations`) | 390 | escuro | Sem `reduced-motion`: 2; com `reduce`: 0. PASSOU |
| 19 | Dicas da empresa, área logada (31 botões "O que é"): dica inteira na janela, sem corte vertical, Esc fecha, dica em camadas (EBITDA) | 390 touch e 1440 | claro e escuro | PASSOU (todas as checagens) |
| 20 | Ajuda "Entender este indicador" da área legada (9 ajudas) abre | 390 touch e 1440 | claro e escuro | PASSOU |
| 21 | Dicas na página pública da empresa | 390 touch e 1440 | claro e escuro | Vazio: a página não tem botões "O que é" (0 em 4 execuções). Só o teste de "sem rolagem" e "tema" vale aqui |
| 22 | Rotas fora da fixture no script de dicas | — | — | 0 |
| 23 | Acessibilidade automatizada `tests/accessibility.browser.mjs` (axe) | — | — | NÃO EXECUTADO (ver "Não verificado") |

Capturas (em `.test-artifacts/qa-evolucao-2026-11-13/capturas/`): home 360–1440 claro e escuro;
`/entrar` e `/cadastro` a 360; `/ranking` a 390; foco de teclado e erro de formulário em 1440.
Foi revisada visualmente a captura `claro-390-home.png`: fundo claro, sem floresta; o aviso
de cookies (fixo, na base da tela) cobre parte do botão principal do herói até ser respondido.

## Defeitos

Severidade pelo impacto no critério pedido.

### D1 — médio (bloqueia pelo critério): título de `/entrar` e `/cadastro`

- Observado: `<title>Escola do Dividendo</title>` em `dist/entrar/index.html` e `dist/cadastro/index.html`
  (confirmado também em execução, nos cinco larguras e nos dois temas). Igual ao da home, sem
  prefixo "Escola do Dividendo | ".
- Critério pedido: demais páginas públicas começam com "Escola do Dividendo | " e são únicas.
- Causa (decisão registrada, não erro de build): `docs/EVOLUCAO-2026-11-13.md` e
  `coordenacao-evolucao-2026-11-13.md` dizem que páginas de conta mantêm só a marca. Isso conflita
  com o critério. Decisão a tomar: aplicar prefixo (ex.: "Escola do Dividendo | Entrar", "... | Criar conta")
  ou registrar a exceção.
- Reproduzir: `node .test-artifacts/qa-evolucao-2026-11-13/publicas.mjs` (linhas "FALHA ... -> titulo"),
  ou abrir `/entrar` e ler `document.title`.

### D2 — baixo: o cadastro não marca nome e senha com `aria-invalid` após erro genérico da API

- Observado: após 400 em `/cadastro`, só `#register-email` recebe `aria-invalid="true"`;
  `#register-name` e `#register-password` ficam sem o atributo. A mensagem `#register-error`
  aparece em ambos os temas.
- Pode ser intencional (erro genérico), mas o usuário não tem indicação de qual campo revisar.

### D3 — baixo: aviso de cookies cobre o CTA do herói em 390 px

- Observado na captura `claro-390-home.png`: o banner fixo na base cobre o botão principal do herói
  até a escolha. Não impede a ação, mas ocupa a área de primeiro uso em celular.

## Observações (não são defeitos pelos critérios)

- O aviso de cookies não aparece em `/suporte` e `/privacidade`: `analyticsPage()` só retorna
  páginas medidas. Coerente com o desenho, mas o visitante dessas páginas só acessa as preferências
  pelo rodapé.
- A página pública da empresa não tem botões "O que é": a verificação de dicas nessa página ficou vazia.
- Na área de cadastro, quando `/api/auth/availability` falha, o formulário é substituído por erro e
  botão de nova tentativa (`RegisterPage.tsx`). Comportamento intencional, confirmado no código.

## Não verificado e por quê

- `tests/accessibility.browser.mjs` (axe): NÃO EXECUTADO. Exige `.test-artifacts/accessibility/package/axe.min.js`,
  que não existe, e `axe-core` não está em `node_modules`. Além disso, o script grava saída em
  `.test-artifacts/accessibility/`, fora da pasta permitida para QA. Não forçado.
- `browser.mjs` e `browser-experience.mjs`: exigem MySQL; rodam só no CI. Não executados.
- WebKit/iPhone e outros navegadores: não executados (só Chromium/Chrome).
- Dados reais da API, carteira, ranking com cotações, login de conta real: não verificados (APIs simuladas).
- Teclado completo em todas as páginas: verificado em `/entrar` e `/cadastro`. Demais páginas não.
- Reduced-motion em todas as páginas: medido só na home a 390 px no escuro.
- Dicas da página pública da empresa: sem botões (ver observações).
- Produção: não acessada. A origem de produção foi interceptada e servida localmente.
- Lighthouse, performance e SEO de indexação: fora do escopo desta rodada.

## Próximo passo

1. Decidir D1 (prefixo nos títulos de conta ou exceção formal do dono) e, se corrigido, repetir `publicas.mjs`.
2. Opcional: D2 e D3 para a próxima rodada de interface.
3. Rodar `tests/accessibility.browser.mjs` quando o axe estiver disponível em `.test-artifacts/accessibility/package/`
   e a saída puder ser gravada na pasta de QA.
