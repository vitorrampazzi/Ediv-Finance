// Classifies infrastructure failures without exposing messages, hosts, SQL or
// request data. Only short error codes are ever logged or compared.

export const busyMessage =
  "O serviço está ocupado. Aguarde alguns instantes e tente novamente.";
export const unavailableMessage =
  "O serviço está temporariamente indisponível. Tente novamente em alguns minutos.";

// Real overload: the dependency answered, but this instance or MySQL is full.
const overloadCodes = new Set([
  "PASSWORD_WORK_BUSY",
  "ER_CON_COUNT_ERROR",
  "ER_USER_LIMIT_REACHED",
  "ER_LOCK_WAIT_TIMEOUT",
]);
// The database (or its DNS/network path) cannot be reached at all.
const connectionFailureCodes = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "PROTOCOL_CONNECTION_LOST",
]);
const QUEUE_LIMIT_MESSAGE = "Queue limit reached.";

export function errorCode(error) {
  const code = error?.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(code)
    ? code
    : null;
}

function codesOf(error) {
  // Node may report a dual-stack connection failure as an AggregateError.
  const nested = Array.isArray(error?.errors) ? error.errors : [];
  return [error, ...nested].map(errorCode).filter(Boolean);
}

export function isConnectionFailure(error) {
  return codesOf(error).some((code) => connectionFailureCodes.has(code));
}

function isOverload(error) {
  return (
    codesOf(error).some((code) => overloadCodes.has(code)) ||
    error?.message === QUEUE_LIMIT_MESSAGE
  );
}

// Returns null for failures that are not infrastructure availability problems.
export function classifyServiceError(error) {
  if (!error || typeof error !== "object") return null;
  const cause = error.cause;
  const code =
    errorCode(error) ||
    (error.message === QUEUE_LIMIT_MESSAGE ? "QUEUE_LIMIT" : null);
  const causeCode =
    errorCode(cause) ||
    (cause?.message === QUEUE_LIMIT_MESSAGE ? "QUEUE_LIMIT" : null) ||
    codesOf(cause)[0] ||
    null;
  if (isConnectionFailure(error) || isConnectionFailure(cause))
    return { kind: "unavailable", code, causeCode };
  if (isOverload(error) || isOverload(cause))
    return { kind: "busy", code, causeCode };
  // The shared limit store is required before any route runs. Any other
  // failure there means the API cannot serve requests, not that it is busy.
  if (code === "RATE_LIMIT_STORE_UNAVAILABLE")
    return { kind: "unavailable", code, causeCode };
  return null;
}

export function createApiErrorHandler({
  log = console.error,
  now = Date.now,
  throttleMs = 10_000,
} = {}) {
  const logTimes = new Map();
  function logThrottled(key, line) {
    const time = now();
    if (time - (logTimes.get(key) ?? -Infinity) <= throttleMs) return;
    if (logTimes.size >= 200) logTimes.clear();
    logTimes.set(key, time);
    log(line);
  }
  // Express identifies error middleware by its four declared parameters.
  return function apiErrorHandler(error, req, res, _next) {
    if (res.headersSent) return;
    const service = classifyServiceError(error);
    if (service) {
      const code = service.code || "unknown";
      const cause = service.causeCode || "none";
      logThrottled(
        `${service.kind}:${code}:${cause}`,
        `API request failed: ${req.requestId || "-"} status=503 ${service.kind} ${code} cause=${cause}`,
      );
      res.setHeader("Retry-After", service.kind === "busy" ? "2" : "30");
      return res.status(503).json({
        error: service.kind === "busy" ? busyMessage : unavailableMessage,
      });
    }
    if (error?.type === "entity.too.large")
      return res
        .status(413)
        .json({ error: "A solicitação excede o tamanho permitido." });
    if (error?.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ error: "O conteúdo enviado não é um JSON válido." });
    if (error?.status === 415)
      return res
        .status(415)
        .json({ error: "Formato ou codificação de conteúdo não aceito." });
    console.error(
      "API request failed:",
      req.requestId,
      errorCode(error) || error?.name || "unknown error",
    );
    return res.status(500).json({
      error: "Não foi possível concluir a solicitação. Tente novamente.",
    });
  };
}
