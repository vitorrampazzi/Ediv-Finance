// Percentages retain the workbook fraction; formatting never recalculates the analysis.
export const dividendColumns = [
  { key: 'companyName', label: 'Empresa', format: 'text', ranking: true },
  { key: 'ticker', label: 'Código', format: 'text', ranking: true },
  { key: 'sector', label: 'Atuação', format: 'text', ranking: true },
  { key: 'totalShares', label: 'Quantidade total de ações', format: 'quantity', ranking: true },
  { key: 'marketValue', label: 'Valor de mercado', format: 'currency', ranking: true },
  { key: 'estimatedNetIncome', label: 'Lucro líquido estimado', format: 'currency', ranking: true },
  { key: 'projectedPE', label: 'P/L projetado', format: 'number', ranking: true },
  { key: 'averagePE10Years', label: 'P/L médio (últ. 10 anos)', format: 'number', ranking: false },
  { key: 'peDeviation', label: 'Desvio do P/L da sua média', format: 'percent', ranking: false },
  { key: 'earningsCagr5Years', label: 'CAGR lucros (últ. 5 anos)', format: 'percent', ranking: false },
  { key: 'netDebtToEbitda', label: 'Dívida líquida/EBITDA', format: 'number', ranking: false },
  { key: 'estimatedEps', label: 'Lucro por ação estimado', format: 'currency', ranking: false },
  { key: 'expectedPayout', label: 'Payout esperado', format: 'percent', ranking: false },
  { key: 'projectedGrossDividendPerShare', label: 'Dividendo por ação bruto projetado', format: 'currency', ranking: false },
  { key: 'estimatedGrossDividendYield', label: 'Dividend Yield bruto estimado', format: 'percent', ranking: false },
  { key: 'referencePrice', label: 'Cotação atual', format: 'currency', ranking: true },
  { key: 'ceilingPrice', label: 'Preço Teto baseado em 6,81% de yield (Taxa do Tesouro IPCA+ 2037 com juros semestrais)', format: 'currency', ranking: true },
  { key: 'safetyMargin', label: 'Margem de segurança', format: 'percentInteger', ranking: true },
  { key: 'announcementFrequency', label: 'Frequência nos anúncios', format: 'text', ranking: false },
  { key: 'announcementMonths', label: 'Meses que costumam anunciar dividendos', format: 'text', ranking: true },
  { key: 'updatedOn', label: 'Última atualização', format: 'date', ranking: false },
];

export function dividendValue(entry, key) {
  return ['companyName', 'ticker', 'sector'].includes(key)
    ? entry[key]
    : entry.dividendAnalysis?.[key];
}

export function formatDividendValue(value, format) {
  if (value === null || value === undefined || value.trim() === '') return 'Não informado';
  if (format === 'text') return value;
  if (format === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Não informado';
  if (format === 'currency')
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (format === 'percent' || format === 'percentInteger') {
    const digits = format === 'percentInteger' ? 0 : 2;
    return number.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: format === 'quantity' ? 2 : 0,
    maximumFractionDigits: format === 'quantity' ? 2 : 10,
  });
}
