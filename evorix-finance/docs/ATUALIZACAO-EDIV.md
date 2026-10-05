# Atualização Ediv Finance — educação e previsões

## Publicação

1. Instale o lockfile com npm ci.
2. Faça o backup e aplique a migração antes de publicar: npm run db:backup:aiven e npm run db:migrate:aiven. A migração 005 cria tabelas e copia o ranking antigo para uma publicação histórica, sem apagar os registros existentes.
3. A conta da aplicação precisa de SELECT, INSERT, UPDATE e DELETE no schema, sem DDL. Use a conta administrativa local para migrações.
4. No Vercel, os campos opcionais SUPPORT_EMAIL, SUPPORT_HOURS, PROFESSIONAL_NAME, PROFESSIONAL_CATEGORY e PROFESSIONAL_REGISTRATION podem ficar vazios.
5. RANKING_ADMIN_EMAILS define as contas confirmadas autorizadas a publicar rankings e atender conversas. Restrinja a lista à equipe responsável.
6. AI_DAILY_LIMIT limita a IA em uma janela global de 24 horas; padrão 100. AI_ASSISTANT_ENABLED, GEMINI_API_KEY e GEMINI_MODEL ficam no servidor. O guia local e as aulas funcionam sem chave.
7. Suba o código e o lockfile ao GitHub. O projeto conectado recebe um novo deploy no Vercel. Arquivos .env, certificados e backups nunca vão ao Git.

Build: npm run build define NODE_ENV=production para que o arquivo de desenvolvimento da API não produza um bundle React de desenvolvimento.

Node: 22.x. Tailwind 4 remove dependências vulneráveis da ferramenta anterior e requer Safari 16.4+, Chrome 111+ ou Firefox 128+. A paleta continua em tailwind.config.js.

## Funcionalidades

- Ranking público: histórico, busca, filtros por setor e prazo, potencial, tese e riscos. CSV/XLSX da primeira aba, até 1 MB e 300 ativos, com prévia antes de publicar. Autoria e registro podem ficar vazios; nenhum dado profissional é inventado.
- Aprender: quatro aulas, perguntas de compreensão, progresso local, glossário e comparação de preços hipotéticos. O assistente ajuda a explicar conceitos.
- Carteira: compras/vendas, correção e exclusão com recálculo cronológico, importação com prévia e identificação de repetições, exportação CSV, proventos recebidos/anunciados, desdobramentos e bonificações.
- Conta: confirmação e recuperação por e-mail, troca de senha, encerramento de sessões, exportação JSON e exclusão.
- Atendimento: mensagens persistidas e fila com estados recebida/em atendimento/respondida. Compartilhar operações depende de autorização do titular e pode ser revogado. Atualize a conversa para buscar novas respostas.
- IA: envio após confirmação, limites por IP e global, uma tentativa adicional em falhas transitórias, alternativa educativa local quando o provedor falha. Não recebe automaticamente dados da carteira.

## Limites dos números

Valores são calculados no servidor em unidades decimais com BigInt. Vendas não podem exceder a posição na data informada. Em horários iguais, compras antecedem vendas; planilhas contendo apenas dias não reconstituem a ordem intradiária. Desdobramentos e bonificações são aplicados ao início do dia, antes das compras e vendas. Proventos são registrados ao fim do dia. Confira a data efetiva no extrato.

Proventos usam o total líquido registrado, não valor por ação. Anúncios não entram no total recebido. Desdobramento altera quantidade e mantém custo; bonificação aplica o multiplicador total e soma o custo atribuído informado. Não há apuração de impostos.

O gráfico mostra custo das posições abertas, resultado realizado e proventos acumulados em meses com movimentação. Não representa rentabilidade ou patrimônio histórico de mercado. A distribuição por classe usa custo registrado. Ativos sem cotação não entram no total de mercado, e a estimativa parcial é identificada.

A importação aceita o modelo e colunas compatíveis de movimentação. Não aceita automaticamente todo arquivo B3, posições sem custo ou tipos de evento fora do modelo. Operações idênticas no mesmo dia são consideradas repetidas; se forem negociações distintas, registre-as manualmente. A assinatura de uma linha importada permanece mesmo depois da exclusão, evitando reimportação acidental.

Não há cobrança, assinatura ativa, conexão automática com corretoras ou calendário automático de dividendos. Identificação profissional, horários, contato, contrato e retenção precisam ser definidos antes do lançamento comercial.

## Operação

Contadores e cache ficam no MySQL e são compartilhados entre instâncias. Cache não garante cotação atual. Erros registram ID da solicitação, método, status e duração, sem mensagens, carteira ou senhas. O cabeçalho X-Request-Id ajuda a investigar os logs do Vercel. /api/health consulta a conexão sem criar registros de usuário.

Contadores expirados são removidos em lotes durante o uso. O operador deve limpar sessões e tokens expirados, definir retenção de backups e monitorar disponibilidade. O cache contém apenas preços e catálogo públicos. Revogar compartilhamento impede consultas futuras, mas não apaga informações já copiadas ou discutidas pela equipe.
