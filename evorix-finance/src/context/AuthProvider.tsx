import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import { ApiError } from "../lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  role: "USER" | "ANALYST" | "ADMIN";
  permissions: string[];
}

interface ApiMessage {
  message?: string;
  error?: string;
  user?: AuthUser;
  verificationUrl?: string;
}

async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<ApiMessage> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.",
    );
  }
  const body =
    response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      body.error || "Não foi possível concluir a solicitação. Tente novamente.",
      response.status,
    );
  return body;
}

export function AuthProvider({
  children,
  initialLoading = true,
}: {
  children: ReactNode;
  initialLoading?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(initialLoading);
  const sessionRevision = useRef(0);
  const refreshSession = useCallback(async () => {
    const revision = sessionRevision.current;
    try {
      const result = await apiRequest("/api/auth/me");
      if (revision === sessionRevision.current) setUser(result.user ?? null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (revision === sessionRevision.current) {
          sessionRevision.current += 1;
          setUser(null);
        }
      } else throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const revision = sessionRevision.current;
    apiRequest("/api/auth/me")
      .then((result) => {
        if (active && revision === sessionRevision.current)
          setUser(result.user ?? null);
      })
      .catch(() => {
        if (active && revision === sessionRevision.current) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!result.user) throw new Error("Não foi possível iniciar a sessão.");
    sessionRevision.current += 1;
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    sessionRevision.current += 1;
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await apiRequest("/api/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password, confirmation: "EXCLUIR" }),
    });
    sessionRevision.current += 1;
    setUser(null);
  }, []);

  const register = useCallback(
    (name: string, email: string, password: string, next?: string) =>
      apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, next }),
      }),
    [],
  );

  const resendVerification = useCallback(
    (email: string, next?: string) =>
      apiRequest("/api/auth/verification/resend", {
        method: "POST",
        body: JSON.stringify({ email, next }),
      }),
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshSession,
      login,
      logout,
      deleteAccount,
      register,
      resendVerification,
    }),
    [
      user,
      loading,
      refreshSession,
      login,
      logout,
      deleteAccount,
      register,
      resendVerification,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
