export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterMs?: number;
  constructor(
    message: string,
    status: number,
    code?: string,
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 45000;
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
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
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterMs =
      retryAfter === null
        ? undefined
        : /^\d+$/.test(retryAfter.trim())
          ? Number(retryAfter) * 1000
          : Math.max(0, Date.parse(retryAfter) - Date.now());
    throw new ApiError(
      body.error ||
        (response.status === 429
          ? "Muitas solicitações. Aguarde alguns instantes antes de tentar novamente."
          : response.status === 503
            ? "O serviço está ocupado. Tente novamente em instantes."
            : "Não foi possível concluir a solicitação. Tente novamente."),
      response.status,
      typeof body.code === "string" ? body.code : undefined,
      Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
    );
  }
  return body as T;
}

// Session requests (login, logout, /api/auth/me, registration): never cached,
// 30 s timeout. `cache` is set after `...init`, so a caller cannot override it.
export function sessionRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, { ...init, cache: "no-store" }, { timeoutMs: 30000 });
}
