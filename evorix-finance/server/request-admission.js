// Pure, per-instance admission guard. Each fixture can reset its own guard
// between cases without weakening the actual production limits.
export function createRequestAdmission({ now = Date.now } = {}) {
  const bursts = new Map();
  const windowMs = 10_000;
  const maximum = 60;
  const maximumKeys = 5000;
  const maximumActive = 32;
  let active = 0;
  const middleware = (req, res, next) => {
    const time = now();
    let burst = bursts.get(req.securityIpKey);
    if (!burst || burst.expiresAt <= time) {
      if (bursts.size >= maximumKeys) {
        for (const [key, value] of bursts)
          if (value.expiresAt <= time) bursts.delete(key);
        if (bursts.size >= maximumKeys) {
          res.setHeader("Retry-After", "2");
          return res.status(503).json({
            error: "O serviço está ocupado. Tente novamente em instantes.",
          });
        }
      }
      burst = { hits: 0, expiresAt: time + windowMs };
      bursts.set(req.securityIpKey, burst);
    }
    burst.hits = Math.min(burst.hits + 1, maximum + 1);
    if (burst.hits > maximum) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((burst.expiresAt - time) / 1000))),
      );
      return res.status(429).json({
        code: "RATE_LIMITED",
        error: "Muitas solicitações. Aguarde alguns segundos.",
      });
    }
    if (active >= maximumActive) {
      res.setHeader("Retry-After", "2");
      return res.status(503).json({
        error: "O serviço está ocupado. Tente novamente em instantes.",
      });
    }
    active++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      res.removeListener("finish", release);
      res.removeListener("close", release);
    };
    res.once("finish", release);
    res.once("close", release);
    return next();
  };
  middleware.isIdle = () => active === 0;
  middleware.waitForIdle = async (timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;
    while (!middleware.isIdle()) {
      const remaining = deadline - Date.now();
      if (remaining <= 0)
        throw new Error("Tempo esgotado aguardando solicitações do cenário.");
      await delay(Math.min(25, remaining));
    }
  };
  middleware.reset = () => {
    if (active !== 0)
      throw new Error(
        "Aguarde as solicitações terminarem antes de limpar o cenário.",
      );
    bursts.clear();
  };
  return middleware;
}

export const requestAdmission = createRequestAdmission();
import { setTimeout as delay } from "node:timers/promises";
