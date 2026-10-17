# Escola do Dividendo — trabalho entre três sessões

## Entrada obrigatória em cada turno

1. Leia `docs/harness/CONTEXTO.md` e `docs/harness/FLUXO.md`.
2. Execute `node scripts/harness.mjs status` e leia os relatos em `docs/harness/relatos/`.
3. Confira os arquivos atuais antes de agir: o histórico de outro chat não substitui o código.
4. Se estiver em outro checkout, pare a edição e informe a coordenação. Os três chats deste grupo usam o diretório registrado em `docs/harness/state.json`.

## Responsabilidades

- `coordenacao`: esta conversa; prioridades, contratos compartilhados, integração e validação final.
- `interface`: experiência, acessibilidade e frontend; mudanças de contrato passam pela coordenação.
- `backend`: API, persistência, segurança e revisão da qualidade.
- Mapeamento dos chats: `docs/harness/SESSOES.md`.

## Antes de editar e ao entregar

- Reserve TODOS os caminhos que vai editar com `node scripts/harness.mjs claim <papel> <caminho...>`; inclua o relato. Caminhos são relativos à pasta do projeto. Uma reserva de diretório inclui seus descendentes.
- Conflito de reserva exige combinar escopo com a sessão responsável. Não force a liberação de outro papel.
- Atualize o quadro com `node scripts/harness.mjs update <papel> <fase> "resumo"`, fases: `pronto`, `trabalhando`, `bloqueado`, `revisao`, `concluido`.
- O quadro só é alterado pelo script, que serializa gravações. Não edite `state.json` manualmente.
- Ao concluir uma etapa, registre arquivos, decisões, verificações reais, impedimentos e próximo passo no próprio relato. Depois libere suas reservas com `node scripts/harness.mjs release <papel>`.
- Consulte o quadro antes de começar, depois de receber mensagem e antes de entregar. Publique mudanças relevantes e comunique a coordenação; ela encaminha decisões às sessões afetadas quando houver trabalho a executar. Sem mensagens recursivas de confirmação.
- Não inicie outra sessão, subagente ou tarefa recorrente sem solicitação do usuário.

## Qualidade e limites do projeto

- Mapa de arquitetura: `docs/GUIA-DESENVOLVEDOR.md`; regras de produto: `docs/harness/CONTEXTO.md`.
- Defina aceitação observável antes de implementar. Rode testes adequados à mudança; relate falhas e verificações indisponíveis.
- Comandos locais: `npm test`, `npm run lint`, `npm run build`. Verificações do harness: `node --test tests/harness.test.mjs` e `node scripts/harness.mjs check`.
- Integração/browser/banco exigem ambiente de teste configurado; não use produção como ambiente de testes.
- Preserve mudanças de outras sessões. Não faça reset, exclusão de trabalho, alteração de credenciais, migração, publicação ou deploy por consequência da configuração deste grupo.
- Falha recorrente deve virar uma melhoria pequena de teste, ferramenta ou documentação. Não acrescente regras extensas sem evidência.
