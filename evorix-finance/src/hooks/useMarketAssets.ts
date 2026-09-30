import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export type MarketAsset = {
  symbol: string;
  name: string;
  price: string;
  changePercent: string | null;
  volume: string | null;
  marketCap: string | null;
  sector: string | null;
  subSector: string | null;
  type: string;
  subType: string;
  source: string;
};
type Result = { assets: MarketAsset[]; total: number; page: number; pageSize: number; requestedAt: string; availableSectors: string[] };

export function useMarketAssets(filters: { search: string; type: string; sortBy: string; page: number; limit: number }) {
  const params = new URLSearchParams({ search: filters.search, type: filters.type, sortBy: filters.sortBy, sortOrder: filters.sortBy === 'name' ? 'asc' : 'desc', page: String(filters.page), limit: String(filters.limit) });
  const key = params.toString();
  const [state, setState] = useState<{ key: string; result: Result | null; error: string }>({ key: '', result: null, error: '' });

  useEffect(() => {
    let active = true;
    apiRequest<Result>(`/api/market/assets?${key}`)
      .then(result => { if (active) setState({ key, result, error: '' }); })
      .catch(reason => { if (active) setState({ key, result: null, error: reason instanceof Error ? reason.message : 'Não foi possível carregar os ativos.' }); });
    return () => { active = false; };
  }, [key]);

  const current = state.key === key;
  return { assets: current ? state.result?.assets ?? [] : [], total: current ? state.result?.total ?? 0 : 0, requestedAt: current ? state.result?.requestedAt ?? null : null, availableSectors: current ? state.result?.availableSectors ?? [] : [], loading: !current, error: current ? state.error : '' };
}
