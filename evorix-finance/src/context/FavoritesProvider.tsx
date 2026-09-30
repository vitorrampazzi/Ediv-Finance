import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FavoritesContext } from './favoritesContext';
import { useAuth } from './authContext';
import { apiRequest } from '../lib/api';

function FavoritesStore({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    apiRequest<{ tickers: string[] }>('/api/favorites')
      .then(result => { if (active) setFavoritos(result.tickers); })
      .catch(() => { if (active) setFavoritos([]); });
    return () => { active = false; };
  }, [userId]);

  const toggleFavorito = useCallback(async (ticker: string) => {
    if (!userId) return;
    setError(null);
    const wasFavorite = favoritos.includes(ticker);
    const previous = favoritos;
    setFavoritos(wasFavorite ? favoritos.filter(value => value !== ticker) : [...favoritos, ticker]);
    try {
      await apiRequest(`/api/favorites/${encodeURIComponent(ticker)}`, {
        method: wasFavorite ? 'DELETE' : 'PUT',
      });
    } catch {
      setFavoritos(previous);
      setError('Não foi possível atualizar seus favoritos. Tente novamente.');
    }
  }, [favoritos, userId]);

  const isFavorito = useCallback((ticker: string) => favoritos.includes(ticker), [favoritos]);
  return <FavoritesContext.Provider value={{ favoritos, toggleFavorito, isFavorito, error }}>{children}</FavoritesContext.Provider>;
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return <FavoritesStore key={user?.id ?? 'signed-out'} userId={user?.id ?? null}>{children}</FavoritesStore>;
};
