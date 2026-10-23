# Central de análise fundamentalista

## Referências analisadas individualmente

| Captura fornecida                     | Observação                                                                   | Implementação com a fonte disponível                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 182701 — cabeçalho e cotação          | Identidade, seis resumos, navegação horizontal, gráfico amplo com comparador | Cabeçalho próprio, seis seções, comparação cotação/teto com controle de referência; nenhum histórico intradiário sem fonte               |
| 182732 — proventos                    | Histórico anual, realizado/projetado, tabela lateral, indicadores            | DY/DPA/payout identificados como estimativas, calendário de anúncios e comparações consolidadas; não criar anos ou pagamentos fictícios  |
| 182753 — análise e indicadores        | Relatórios e reuniões acima de grupos de indicadores em linhas               | Cinco categorias com rótulos/valores e dicas educativas; sem relatório, autor, reunião ou sentimento inventado                           |
| 182757 — continuação de indicadores   | Dividendos, mercado e retornos em grupos consistentes                        | Dividendos e mercado reais; não incluir retornos de 12/36/60 meses ausentes da fonte                                                     |
| 182801 — resultados                   | Lucro por ação, patrimônio, receita e séries históricas                      | Lucro/LPA/CAGR reais e comparações com unidades compatíveis; sem fabricar receita, EBITDA, balanços ou trimestres                        |
| 182804 — empresa                      | Navegação corporativa e dados cadastrais/descrição                           | Empresa, ticker, setor, quantidade de ações, valor de mercado e data; descrição/RI/admin/controladores só quando houver fonte verificada |
| Clipboard adffa71e — tabela da Escola | Títulos longos forçam grande altura no cabeçalho e distribuem mal as colunas | Rótulos curtos, descrições completas em Tooltip, cabeçalho de 72px, larguras explícitas e números alinhados à direita                    |

As imagens são referências de organização e interação. Não se importam marca,
logotipos, fotografias, código, textos ou valores da AGF para o produto. A identidade
usa os tokens existentes: canvas #1c2025, superfície #242a30, texto #f2f3f4,
secundário #bcc6cd e acento #a9d9d1; tema claro e tipografia existentes.
O layout concentra o destaque nos gráficos de comparação, com painéis de leitura
mais densos e alinhados, sem ordinais decorativos ou uma grade de microcards.

## Estrutura implementada

Seis seções: Visão geral, Cotação, Dividendos, Indicadores, Resultados e
Informações da empresa. A navegação acompanha a seção visível e transfere o foco
ao destino; o retorno ao topo recupera o título da empresa.

Os 21 campos canônicos aparecem uma vez. Os resumos e repetições de consulta
preservam os mesmos valores e não se tornam uma segunda fonte de dados.
Os indicadores se distribuem em Avaliação, Caixa e endividamento, Rentabilidade,
Dividendos e Mercado. Resultados apresenta lucro/LPA estimados e CAGR disponível.

Três gráficos pontuais com eixos e valores textuais: cotação versus preço teto,
payout versus referência matemática de 100%, P/L projetado versus média de dez
anos. O controle Mostrar preço teto inclui/remove essa referência do gráfico.
O calendário destaca somente os meses reconhecidos no texto da pesquisa.
Nulos, negativos, zeros e percentuais acima de 100% não são substituídos ou cortados.
Tooltips funcionam com ponteiro/foco e Escape; nenhum gráfico exige distinguir
somente cores. Não há filtro temporal sem uma série que o sustente.

Arquivos de produto: DividendResearch.tsx e dividend-research.css cuidam da
tabela; DividendDashboard.tsx e fundamental-center.css organizam a central;
ComparativeDividendChart.tsx reutiliza Recharts e o Tooltip do projeto.

## Fonte e limites

A fonte oficial continua sendo a publicação da equipe importada da planilha
Lista de Ações analisadas (1).xlsx, aba Informações Completas: 21 campos,
18 métricas mais empresa/ticker/setor. Valores e data permanecem os da pesquisa.
A referência 6,81% é uma premissa histórica do preço teto na planilha, não a taxa
atual do Tesouro nem garantia de rentabilidade.

Não há séries históricas confiáveis de cotação, dividendos ou resultados, descrição
corporativa, site de RI, administradores ou controladores nessa fonte. O módulo
legado de mercado fornece somente cotação pontual, e não foi ativado para trocar
a referência da planilha. Exemplos de receita/balanço/DRE existentes nos módulos
demonstrativos são fictícios e não alimentam a central real. Proventos pessoais
da carteira também não são dados corporativos globais.

Ausência não vira zero; zeros, valores negativos e payout superior a 100% continuam
visíveis. Dívida/EBITDA negativa isoladamente não comprova caixa líquido.
Comparações determinísticas usam os helpers existentes e explicitam unidades e
referências; não há recomendação personalizada de compra ou venda.

REA está conectado na sessão, mas a aba da referência não expõe o endpoint CDP
necessário à captura de runtime. A investigação desta rodada usa as sete imagens
fornecidas e o código disponível; não se declara captura de execução pelo REA.

## Acesso preservado

A API pública e a home continuam limitadas às três primeiras empresas e aos
três KPIs DY estimado/P-L projetado/margem de segurança, com convite ao cadastro.
Parâmetros não ampliam essa resposta. A API completa continua autenticada.
O ranking privado mantém dez ações iniciais e mais dez por clique; o detalhe
preserva ticker, publicação, navegação entre empresas e controles de acesso.

## Bibliotecas e dependências

Reutilizam-se Recharts, Lucide, Tooltip, CompanyLogo e os formatadores/helpers
já presentes. Não há instalação de pacote, serviço pago, migração ou nova API.
A documentação oficial consultada para gráficos responsivos, tooltips e suporte
acessível está em https://recharts.github.io/en-US/api/BarChart/ ,
https://recharts.github.io/en-US/api/Tooltip/ e
https://recharts.github.io/en-US/api/ResponsiveContainer/ .

## Integrações pendentes de dados

Séries históricas demandam fornecedor autorizado com datas, moedas, ajustes e
proveniência; pagamentos precisam distinguir anúncio, data-com, ex e pagamento.
Resultados demandam períodos comparáveis, realizado/projetado e unidades.
Descrição e dados corporativos dependem de fonte editorial ou cadastro verificado.
Nenhum desses contratos foi inventado para reproduzir as capturas.

A implementação foi validada localmente. Depois da aprovação do QA, o proprietário
autorizou a publicação em produção em23/10/2026, pelo fluxo de PR e checks obrigatórios.
Resultados e evidências da validação final ficam nos relatos do harness desta etapa.

## Validação local desta rodada

- Lint completo e build Node22 aprovados, incluindo geração pública de oito rotas.
- Quinze testes de importação/formatadores/insights aprovados; Backend executou
  quatro testes do serializer público, todos aprovados.
- Focal da Interface aprovado em seis cenários: ranking10→20 e cabeçalhos72px;
  três empresas com21campos exatos/seis seções/cinco grupos; gráficos/teclado/Escape
  e controle do teto; âncoras/foco/seção atual;320px nos dois temas sem overflow; valores ausentes,
  zeros, negativos e payout150%. A regressão pública passou sete cenários,
  incluindo erro/vazio/retry, CTA, paginação privada e acesso limitado.
- O runner `tests/company-center.browser.mjs` é manual e usa uma prévia local
  somente leitura em 127.0.0.1:4199 (`EDIV_CENTER_ORIGIN` permite outra porta).
  Ele não integra a CI sem essa prévia. Os contratos das suítes existentes de
  ranking/dashboard foram atualizados; não dependem do novo runner manual.
- Não se executou banco/produção, leitores de tela reais ou certificação WCAG.
  Revisão independente e evidências finais constam do relato QA da central.

A revisão independente aprovou nove grupos funcionais. Identificou a quebra de
cifras em320px; corrigiu-se a apresentação em coluna única nas métricas móveis,
preservando os valores completos. O reteste focal nos dois temas confirmou os
21campos, cifras em uma linha, ausência de overflow e singular “1 indicador”.
P2/P3 fechados; nenhuma pendência concreta no escopo local verificado.
Relato: docs/harness/relatos/qa-central-2026-10-23.md no quadro operacional11a6.
Capturas móveis finais usam sufixo fixed; as anteriores documentam a revisão inicial.
