import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FavoritesContext } from './favoritesContext';
import { useAuth } from './authContext';

const STORAGE_KEY = 'evorix_favoritos';

function FavoritesStore({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [favoritos, setFavoritos] = useState<string[]>(() => {
    if (!userId) return [];
    try {
      const salvo = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
      const favoritosSalvos: unknown = salvo ? JSON.parse(salvo) : [];
      return Array.isArray(favoritosSalvos)
        ? favoritosSalvos.filter((ticker): ticker is string => typeof ticker === 'string')
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(favoritos));
    } catch {
      // localStorage indisponível (ex: modo privado) — ignora silenciosamente
    }
  }, [favoritos, userId]);

  const toggleFavorito = (ticker: string) => {
    setFavoritos(prev => prev.includes(ticker) ? prev.filter(value => value !== ticker) : [...prev, ticker]);
  };
  const isFavorito = (ticker: string) => favoritos.includes(ticker);

  return <FavoritesContext.Provider value={{ favoritos, toggleFavorito, isFavorito }}>{children}</FavoritesContext.Provider>;
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return <FavoritesStore key={userId ?? 'signed-out'} userId={userId}>{children}</FavoritesStore>;
};
