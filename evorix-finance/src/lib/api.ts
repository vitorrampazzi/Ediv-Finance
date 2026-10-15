export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      signal: init.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(45000)])
        : AbortSignal.timeout(45000),
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
      body.error ||
        (response.status === 429
          ? "Muitas solicitações. Aguarde alguns instantes antes de tentar novamente."
          : response.status === 503
            ? "O serviço está ocupado. Tente novamente em instantes."
            : "Não foi possível concluir a solicitação. Tente novamente."),
      response.status,
      typeof body.code === "string" ? body.code : undefined,
    );
  return body as T;
}
