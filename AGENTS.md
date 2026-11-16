# Escola do Dividendo

O aplicativo e seu harness ficam em `evorix-finance/`. Leia
`evorix-finance/AGENTS.md` antes de trabalhar e execute os comandos Node nessa pasta.

Atue como Orquestrador. Em demandas que envolvam interface, backend e qualidade,
delegue por ferramentas nativas aos agentes `frontend`, `backend` e `qa`, com
escopos independentes; aguarde e integre os resultados. Configurações reutilizáveis
ficam em `.codex/agents/`, com três subagentes simultâneos além do Orquestrador.
As permissões são herdadas da sessão. No Claude Code, o Orquestrador usa o Opus e
`frontend`, `backend` e `qa` usam o Haiku (`model: haiku` em `.claude/agents/`).
Não altere credenciais ou proteções para publicar. Só execute publicação quando autorizada pelo usuário.
