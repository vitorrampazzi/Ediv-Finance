# Escola do Dividendo — quatro agentes

## Entrada obrigatória em cada turno

1. Leia `docs/harness/CONTEXTO.md` e `docs/harness/FLUXO.md`.
2. Execute `node scripts/harness.mjs status` e leia os relatos em `docs/harness/relatos/`.
3. Confira os arquivos atuais antes de agir: o histórico de outro chat não substitui o código.
4. O quadro versão 2 usa `workspace: "."`, relativo à pasta deste projeto. Reaproveite o checkout aberto e preserve alterações preexistentes.

## Responsabilidades

- `coordenacao` (Orquestrador): prioridades, delegação, contratos compartilhados, integração, revisão e publicação autorizada.
- `interface`: experiência, acessibilidade e frontend; mudanças de contrato passam pela coordenação.
- `backend`: API, persistência, integrações, autenticação e segurança.
- `qa`: testes, regressão e validação visual/funcional independente; informa aptidão e limites.
- Para demandas que envolvam os quatro papéis, o Orquestrador deve usar as ferramentas nativas de subagentes para delegar a frontend, backend e QA, com escopos separados; deve esperar e integrar seus resultados. Os agentes herdam o modelo e as permissões da sessão.
- Mapeamento dos chats: `docs/harness/SESSOES.md`.

## Antes de editar e ao entregar

- Reserve TODOS os caminhos que vai editar com `node scripts/harness.mjs claim <papel> <caminho...>`; inclua o relato. Caminhos são relativos à pasta do projeto. Uma reserva de diretório inclui seus descendentes.
- Conflito de reserva exige combinar escopo com a sessão responsável. Não force a liberação de outro papel.
- Atualize o quadro com `node scripts/harness.mjs update <papel> <fase> "resumo"`, fases: `pronto`, `trabalhando`, `bloqueado`, `revisao`, `concluido`.
- O quadro só é alterado pelo script, que serializa gravações. Não edite `state.json` manualmente.
- Ao concluir uma etapa, registre arquivos, decisões, verificações reais, impedimentos e próximo passo no próprio relato. Depois libere suas reservas com `node scripts/harness.mjs release <papel>`.
- Consulte o quadro antes de começar, depois de receber mensagem e antes de entregar. Publique mudanças relevantes e comunique a coordenação; ela encaminha decisões às sessões afetadas quando houver trabalho a executar. Sem mensagens recursivas de confirmação.
- Não inicie outra sessão, subagente ou tarefa recorrente sem solicitação do usuário.

## Configuração reutilizável

- Agentes nativos em `../.codex/agents/*.toml`; limites em `../.codex/config.toml`.
- Inicie o Codex na raiz Git e confie no projeto pelo mecanismo normal do cliente para carregar sua configuração. Mudanças de configuração podem exigir nova sessão; a delegação da sessão atual é validada por criação, mensagem e retorno reais dos subagentes.
- Estado operacional em `docs/harness/state.json`; caminhos de reservas são relativos. `upgrade` migra quadros v1 e arquiva o original, sem editá-lo manualmente. A migração só deve ocorrer na retomada explicitamente autorizada, após conferir as reservas antigas.

## Qualidade e limites do projeto

- Mapa de arquitetura: `docs/GUIA-DESENVOLVEDOR.md`; regras de produto: `docs/harness/CONTEXTO.md`.
- Defina aceitação observável antes de implementar. Rode testes adequados à mudança; relate falhas e verificações indisponíveis.
- Comandos locais: `npm test`, `npm run lint`, `npm run build`. Verificações do harness: `node --test tests/harness.test.mjs` e `node scripts/harness.mjs check`.
- Integração/browser/banco exigem ambiente de teste configurado; não use produção como ambiente de testes.
- Preserve mudanças de outras sessões. Não faça reset, exclusão de trabalho, alteração de credenciais, migração, publicação ou deploy por consequência da configuração deste grupo.
- Falha recorrente deve virar uma melhoria pequena de teste, ferramenta ou documentação. Não acrescente regras extensas sem evidência.
