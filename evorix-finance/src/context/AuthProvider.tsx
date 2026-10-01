import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './authContext';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

interface ApiMessage {
  message?: string;
  error?: string;
  user?: AuthUser;
  verificationUrl?: string;
}

async function apiRequest(path: string, init: RequestInit = {}): Promise<ApiMessage> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Inicie a API e tente novamente.');
  }
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a solicitação. Tente novamente.');
  return body;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest('/api/auth/me')
      .then(result => { if (active) setUser(result.user ?? null); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!result.user) throw new Error('Não foi possível iniciar a sessão.');
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await apiRequest('/api/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmation: 'EXCLUIR' }),
    });
    setUser(null);
  }, []);

  const register = useCallback((name: string, email: string, password: string) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }), []);

  const resendVerification = useCallback((email: string) => apiRequest('/api/auth/verification/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }), []);

  const value = useMemo(() => ({ user, loading, login, logout, deleteAccount, register, resendVerification }), [user, loading, login, logout, deleteAccount, register, resendVerification]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

