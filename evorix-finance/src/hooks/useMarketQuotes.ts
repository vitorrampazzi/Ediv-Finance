import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export type MarketQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: string | null;
  change: string | null;
  changePercent: string | null;
  marketTime: string | null;
  checkedAt?: string | null;
  source: string;
  stale?: boolean;
  unavailable?: boolean;
};

export function useMarketQuotes(symbols: string[]) {
  const symbolKey = [...new Set(symbols.map(symbol => symbol.toUpperCase()))].slice(0, 8).join(',');
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(Boolean(symbolKey));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!symbolKey) return;
    let active = true;
    apiRequest<{ quotes: MarketQuote[] }>(`/api/market/quotes?symbols=${encodeURIComponent(symbolKey)}`)
      .then(result => { if (active) { setQuotes(result.quotes); setError(''); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as cotações.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [symbolKey]);

  return { quotes: symbolKey ? quotes : [], loading: Boolean(symbolKey) && loading, error };
}
