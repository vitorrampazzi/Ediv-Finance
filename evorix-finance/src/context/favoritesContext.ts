// src/context/favoritesContext.ts
import { createContext } from 'react';

export interface FavoritesContextType {
  favoritos: string[];
  toggleFavorito: (ticker: string) => Promise<void>;
  isFavorito: (ticker: string) => boolean;
  error: string | null;
}

export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
