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
      cache: "no-store",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
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
  const [sessionError, setSessionError] = useState("");
  const sessionRevision = useRef(0);
  const mounted = useRef(false);
  const userRef = useRef<AuthUser | null>(null);
  const sessionErrorRef = useRef("");
  const pendingMutation = useRef(false);
  const pendingRefresh = useRef<{
    revision: number;
    promise: Promise<void>;
    controller: AbortController;
  } | null>(null);
  const lastRefreshAt = useRef(0);
  const sessionChannel = useRef<BroadcastChannel | null>(null);

  const applyUser = useCallback((next: AuthUser | null) => {
    userRef.current = next;
    setUser(next);
  }, []);
  const applySessionError = useCallback((message: string) => {
    sessionErrorRef.current = message;
    setSessionError(message);
  }, []);
  const notifySessionChanged = useCallback(() => {
    try {
      sessionChannel.current?.postMessage({ type: "session-changed" });
    } catch {
      // Other tabs also reconcile their session when they become visible.
    }
  }, []);
  const invalidateRefresh = useCallback(() => {
    sessionRevision.current += 1;
    pendingRefresh.current?.controller.abort();
    pendingRefresh.current = null;
  }, []);

  const refreshSession = useCallback((): Promise<void> => {
    if (pendingMutation.current) return Promise.resolve();
    const revision = sessionRevision.current;
    if (pendingRefresh.current?.revision === revision)
      return pendingRefresh.current.promise;
    lastRefreshAt.current = Date.now();
    const controller = new AbortController();
    const promise: Promise<void> = apiRequest("/api/auth/me", {
      signal: controller.signal,
    })
      .then((result) => {
        if (!result.user)
          throw new Error(
            "Não foi possível validar sua sessão. Tente novamente.",
          );
        if (mounted.current && revision === sessionRevision.current) {
          applyUser(result.user);
          applySessionError("");
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (mounted.current && revision === sessionRevision.current) {
          if (error instanceof ApiError && error.status === 401) {
            applyUser(null);
            applySessionError("");
          } else {
            applySessionError(
              "Não foi possível verificar sua sessão agora. Sua conta não foi desconectada. Confira sua conexão e tente novamente.",
            );
          }
          setLoading(false);
        }
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      })
      .finally(() => {
        if (pendingRefresh.current?.promise === promise)
          pendingRefresh.current = null;
      });
    pendingRefresh.current = { revision, promise, controller };
    return promise;
  }, [applyUser, applySessionError]);

  const retrySession = useCallback(async () => {
    if (!userRef.current) setLoading(true);
    await refreshSession().catch(() => {});
  }, [refreshSession]);

  useEffect(() => {
    mounted.current = true;
    void refreshSession().catch(() => {});
    const reconcile = (force = false) => {
      if (document.visibilityState === "hidden" || pendingMutation.current)
        return;
      const interval = sessionErrorRef.current ? 5000 : 60000;
      if (!force && Date.now() - lastRefreshAt.current < interval) return;
      void refreshSession().catch(() => {});
    };
    const onFocus = () => reconcile();
    const onVisibility = () => reconcile();
    const onOnline = () => reconcile(true);
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("ediv-account-session");
        sessionChannel.current = channel;
        channel.onmessage = (event: MessageEvent<unknown>) => {
          if (
            !event.data ||
            typeof event.data !== "object" ||
            !("type" in event.data) ||
            event.data.type !== "session-changed" ||
            pendingMutation.current
          )
            return;
          invalidateRefresh();
          // The shared cookie may now belong to a different account.
          applyUser(null);
          applySessionError("");
          setLoading(true);
          void refreshSession().catch(() => {});
        };
      }
    } catch {
      sessionChannel.current = null;
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
      if (sessionChannel.current === channel) sessionChannel.current = null;
    };
  }, [refreshSession, applyUser, applySessionError, invalidateRefresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      invalidateRefresh();
      pendingMutation.current = true;
      try {
        const result = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (!result.user) throw new Error("Não foi possível iniciar a sessão.");
        sessionRevision.current += 1;
        applyUser(result.user);
        applySessionError("");
        setLoading(false);
        notifySessionChanged();
      } finally {
        pendingMutation.current = false;
      }
    },
    [applyUser, applySessionError, notifySessionChanged, invalidateRefresh],
  );

  const logout = useCallback(async () => {
    invalidateRefresh();
    pendingMutation.current = true;
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      sessionRevision.current += 1;
      applyUser(null);
      applySessionError("");
      setLoading(false);
      notifySessionChanged();
    } finally {
      pendingMutation.current = false;
    }
  }, [applyUser, applySessionError, notifySessionChanged, invalidateRefresh]);

  const deleteAccount = useCallback(
    async (password: string) => {
      invalidateRefresh();
      pendingMutation.current = true;
      try {
        await apiRequest("/api/auth/me", {
          method: "DELETE",
          body: JSON.stringify({ password, confirmation: "EXCLUIR" }),
        });
        sessionRevision.current += 1;
        applyUser(null);
        applySessionError("");
        setLoading(false);
        notifySessionChanged();
      } finally {
        pendingMutation.current = false;
      }
    },
    [applyUser, applySessionError, notifySessionChanged, invalidateRefresh],
  );

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
      sessionError,
      refreshSession,
      retrySession,
      login,
      logout,
      deleteAccount,
      register,
      resendVerification,
    }),
    [
      user,
      loading,
      sessionError,
      refreshSession,
      retrySession,
      login,
      logout,
      deleteAccount,
      register,
      resendVerification,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
