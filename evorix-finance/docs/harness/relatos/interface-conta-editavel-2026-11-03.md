# Interface: conta editável e confirmação de sessões (03/11/2026)

## Arquivos

- `src/pages/Configuracoes.tsx`
- `tests/browser.mjs`

## O que mudou

- Conta: a linha "Nome" ganhou "Editar" (nome acessível "Editar nome"). Em edição, campo
  rotulado pelo próprio "Nome" (`aria-labelledby`), dica "Use de 2 a 100 caracteres.",
  "Cancelar" e "Salvar". Validação no cliente com as regras do cadastro (trim, 2 a 100,
  mesmos `minLength`/`maxLength`); erro do cliente ou do servidor aparece no lugar da dica
  com `role="alert"` e `aria-invalid`, com foco no campo. Durante o envio os botões ficam
  desabilitados e o campo só leitura. Sucesso: `PATCH /api/auth/me` via `apiRequest`,
  `refreshSession()` do AuthProvider (topo, Perfil e home), "Nome atualizado." em
  `role="status"` e foco de volta em "Editar".
- Texto do e-mail: "Para alterar o e-mail, fale com a equipe."
- "Encerrar todas as sessões" abre confirmação inline na própria linha ("Cancelar" e
  "Sim, encerrar", este no estilo vermelho da exclusão). Foco vai para "Cancelar" ao abrir
  e volta ao botão original ao cancelar. Sem `window.confirm`.
- Celular: botões das linhas, dos formulários (senha, nome, exclusão) e da exportação
  ficam empilhados em largura total; a partir de `sm` voltam à direita.
- `tests/browser.mjs`: novo caso de edição de nome (nome só com espaço é barrado; nome
  novo aparece no menu da conta) e o caso de sessões passa por Cancelar (segunda janela
  continua válida) e por "Sim, encerrar".

## Verificações

- `npm test`: 132/132. `npm run lint`: ok. `npm run build`: ok.
- `node --check tests/browser.mjs`: ok. O teste de browser não foi executado localmente
  (exige MySQL descartável da CI).
- Playwright no build em 127.0.0.1 com `/api` mockada, incluindo `PATCH /api/auth/me`,
  em 1440 e 375, tema escuro: foco ao abrir/salvar/cancelar, nome inválido não enviado,
  nome novo no topo e no Perfil, sem rolagem horizontal. Sem erros.
- `/app/perfil` em 375: nada quebrado.

## Pendências

- O menu inferior fixo do celular pode cobrir o elemento focado no fim da tela (não há
  `scroll-padding-bottom` global). Achado preexistente, fora deste escopo (WCAG 2.4.11).
- Se uma checagem de sessão já estiver em andamento no instante do salvamento,
  `refreshSession()` reaproveita essa resposta e o nome novo só aparece na próxima
  checagem. Raro; um setter no AuthProvider resolveria se for observado.
