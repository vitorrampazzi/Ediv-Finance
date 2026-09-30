// src/data/mockData.ts
export const mockPortfolio = {
  totalEquity: 145230.50,
  investedValue: 120000.00,
  totalReturn: 25230.50,
  returnPercentage: 21.02,
  distribution: {
    acoes: 35,
    fiis: 20,
    rendaFixa: 35,
    etfs: 10
  }
};

export const mockAssets = [
  {
    ticker: 'PETR4',
    name: 'Petrobras PN',
    price: 38.45,
    change: 1.2,
    score: 92,
    category: 'Excelente',
    indicators: {
      valuation: 88,
      fundamentos: 96,
      risco: 72,
      dividendos: 81
    }
  },
  {
    ticker: 'ITUB4',
    name: 'Itaú Unibanco',
    price: 34.12,
    change: -0.5,
    score: 87,
    category: 'Muito Bom',
    indicators: {
      valuation: 75,
      fundamentos: 90,
      risco: 85,
      dividendos: 70
    }
  }
];

export const mockRecomendados = [
  {
    ticker: 'BTLG11',
    name: 'BTG Pactual Logística',
    score: 88,
    motivo: 'Texto e indicadores fictícios usados apenas para demonstrar o formato de um cartão.'
  },
  {
    ticker: 'WEGE3',
    name: 'WEG S.A.',
    score: 91,
    motivo: 'Texto e indicadores fictícios usados apenas para demonstrar o formato de um cartão.'
  },
  {
    ticker: 'IVVB11',
    name: 'iShares S&P 500',
    score: 85,
    motivo: 'Texto e indicadores fictícios usados apenas para demonstrar o formato de um cartão.'
  }
];
