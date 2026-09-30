import { createContext, useContext } from 'react';
import type { AuthUser } from './AuthProvider';

export const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ message?: string; verificationUrl?: string }>;
  resendVerification: (email: string) => Promise<{ message?: string; verificationUrl?: string }>;
} | undefined>(undefined);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return value;
}
