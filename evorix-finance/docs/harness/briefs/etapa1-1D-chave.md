# Brief 1D — Chave: criar a branch de trabalho

Para: Chave (release). Etapa 1, fazer primeiro. Os outros executores podem começar em paralelo.

## Objetivo

Criar a branch `vitorrampazzi/ux-performance-2026-11-16` a partir de `origin/main`, sem perder nenhuma alteração não commitada do dono.

## Contexto mínimo

- Raiz Git: `C:/Users/vitor/Evorix-finance`. O projeto Node fica em `evorix-finance/`. Rode todos os comandos em `evorix-finance/` e use `git -C ..` para o Git agir na raiz.
- Branch atual: `vitorrampazzi/evolucao-2026-11-13`. `origin/main` deve estar em `5613939`. A árvore dos dois é igual, então as alterações locais acompanham a troca.
- Nota "Contexto Escola", seções 5 (ambientes e autoria) e 10 (segurança).

## Pode ler / pode escrever

- Pode ler: nenhum arquivo. Só a saída do Git.
- Pode escrever: **nenhum arquivo**. O relato vai na resposta (sem arquivo).
- Efeito esperado no Git: apenas criar e trocar para a branch nova.

## Fora do escopo

- Commit, push, stash, reset, clean, checkout de arquivo, rebase, merge.
- Apagar ou mudar a branch `vitorrampazzi/evolucao-2026-11-13`.
- Tocar nos outros worktrees (`.codex/worktrees/*`, `.claude/worktrees/*`).
- Editar `docs/harness/state.json` à mão. Ele já está modificado e outros executores vão reservar caminhos nele.

## Passos

1. Rode `git -C .. status --short`. Guarde a saída como "antes".
2. Rode `git -C .. fetch origin`.
3. Rode `git -C .. rev-parse --short origin/main`. Se não for `5613939`: **pare**, não troque de branch, relate o hash novo e o `git -C .. log --oneline 5613939..origin/main`.
4. Rode `git -C .. diff --stat origin/main HEAD`. Esperado: saída vazia. Se não estiver vazia: **pare** e relate.
5. Rode `git -C .. switch --no-track -c vitorrampazzi/ux-performance-2026-11-16 origin/main` (sem rastrear `origin/main`, para um push futuro nunca ir para a `main` por engano). Se o Git recusar (conflito com alteração local): **pare**, não use stash, reset ou force. Relate a mensagem.
6. Rode `git -C .. status --short`. Compare com o "antes".

## Critérios de aceite (observáveis)

- [ ] `git -C .. branch --show-current` imprime `vitorrampazzi/ux-performance-2026-11-16`.
- [ ] `git -C .. rev-parse --short HEAD` imprime `5613939`.
- [ ] `git -C .. status --short` mostra os mesmos itens do "antes": ` M evorix-finance/.gitignore`, ` M evorix-finance/docs/harness/state.json`, `?? .gitignore`, `?? .maestri/`, `?? docs/estrategia_escola_do_dividendo.pdf`, `?? evorix-finance/docs/UX-PERFORMANCE-2026-11-16.md`, `?? evorix-finance/docs/harness/briefs/`. Itens novos em `evorix-finance/docs/harness/relatos/` ou `evorix-finance/tests/perf-baseline.mjs` são dos outros executores e são aceitáveis. Qualquer outro item novo ou sumido: relate.
- [ ] A branch antiga `vitorrampazzi/evolucao-2026-11-13` continua existindo (`git -C .. branch --list "vitorrampazzi/evolucao-2026-11-13"` imprime uma linha).

## Comandos de validação (em `evorix-finance/`)

```
git -C .. branch --show-current
git -C .. rev-parse --short HEAD
git -C .. status --short
git -C .. branch --list "vitorrampazzi/evolucao-2026-11-13" "vitorrampazzi/ux-performance-2026-11-16"
```

## Formato do relato (na resposta, em português, até 15 linhas)

1. Saída de `status --short` antes e depois, lado a lado.
2. Hash de `origin/main` no fetch.
3. Resultado de cada critério: passou, falhou ou não executado (e por quê).
4. Se parou em algum passo: qual passo e a mensagem do Git.
5. Próximo passo.

Ao terminar, avise o Orquestrador: `maestri ask "Orquestrador" "<o relato acima>"`.

## Regras de segurança

- Nada de segredo, token, `.env*` ou credencial em comando, log ou relato. Não abra `.env*`.
- Não use produção, banco, deploy nem Vercel.
- Não faça commit, push, stash nem reset.
- Não adicione linha de autoria de IA em nada.
