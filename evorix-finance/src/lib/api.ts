export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
      body.error || "Não foi possível concluir a solicitação. Tente novamente.",
      response.status,
    );
  return body as T;
}
