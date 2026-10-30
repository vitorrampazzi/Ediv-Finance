# Ajustes de destaque nas ações — 30/10/2026

Removido da visão geral o número grande “Cotação em relação ao teto” e sua fórmula. Mantidos os valores originais, a comparação gráfica preço/teto e as informações da pesquisa.

Cores por categoria no resumo; cartão de valor de mercado com azul discreto; estimativas de lucro em dourado, crescimento positivo em verde e DY positivo em teal. Crescimento/lucro/DY negativos mantêm vermelho e ausências/zero não recebem destaque positivo. Endividamento sem juízo automático de favorabilidade. Insights com fundo e borda suaves. Tokens globais claro/escuro preservados.

Arquivos: StockMake.tsx, stock-make.css, stock-theme.browser.mjs e este relato; quadro pelo script. Dados Excel/AGF, API, dependências e metodologia inalterados. Dois arquivos Java não rastreados do usuário preservados.

Validação: build Node22 (8 rotas) PASS; lint PASS; navegador isolado 6/6 (1440,390,320 nos dois temas), 42 seções sem overflow/erros inesperados. Teste focal confirma ausência do bloco e cor de CAGR positivo/negativo/zero/nulo. Capturas em .test-artifacts/stock-theme, dados sintéticos. Inspeção visual desktop dark aprovada. Sem banco/contas/produção nos testes. Sem leitores de tela reais ou nova auditoria financeira.
