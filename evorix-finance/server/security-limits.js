import { isIP } from "node:net";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";
import { MysqlLimitStore } from "./limit-store.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function positiveInteger(name, fallback, maximum) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > maximum
  ) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

export const securityPolicy = Object.freeze({
  apiPerMinute: positiveInteger("SECURITY_API_PER_MINUTE", 240, 3000),
  writesPerMinute: positiveInteger("SECURITY_WRITES_PER_MINUTE", 40, 500),
  registrationsPerHour: positiveInteger(
    "SECURITY_REGISTRATIONS_PER_HOUR",
    100,
    5000,
  ),
  emailPerDay: positiveInteger("SECURITY_EMAIL_PER_DAY", 90, 10000),
});

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const uploadTypes = [
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export function isSpreadsheetUpload(req) {
  // req.path is relative to /api inside that mount; accept no other upload route.
  return (
    req.method === "POST" &&
    /^\/(?:api\/)?(?:rankings(?:\/preview)?|portfolio\/import(?:\/preview)?)\/?$/i.test(
      req.path,
    ) &&
    Boolean(req.is(uploadTypes))
  );
}

export function identifyClient(req, res, next) {
  // Vercel supplies this header itself. Do not trust arbitrary forwarded headers
  // on a local/direct server; req.ip then follows Express's explicit proxy policy.
  const address =
    process.env.VERCEL === "1"
      ? req.get("x-vercel-forwarded-for") || req.get("x-forwarded-for")
      : req.ip;
  if (typeof address !== "string" || !isIP(address.trim())) {
    return res
      .status(400)
      .json({ error: "Não foi possível identificar a solicitação." });
  }
  req.securityIp = address.trim();
  req.securityIpKey = ipKeyGenerator(req.securityIp, 56);
  return next();
}

const bursts = new Map();
const BURST_WINDOW = 10_000;
const BURST_MAXIMUM = 60;
const MAXIMUM_BURST_KEYS = 5000;
const MAXIMUM_ACTIVE_REQUESTS = 32;
let activeRequests = 0;

// This bounded local guard rejects bursts before contacting MySQL. Persistent
// limits below remain authoritative across separate serverless instances.
export function requestAdmission(req, res, next) {
  const now = Date.now();
  let burst = bursts.get(req.securityIpKey);
  if (!burst || burst.expiresAt <= now) {
    if (bursts.size >= MAXIMUM_BURST_KEYS) {
      for (const [key, value] of bursts) {
        if (value.expiresAt <= now) bursts.delete(key);
      }
      if (bursts.size >= MAXIMUM_BURST_KEYS) {
        res.setHeader("Retry-After", "2");
        return res.status(503).json({
          error: "O serviço está ocupado. Tente novamente em instantes.",
        });
      }
    }
    burst = { hits: 0, expiresAt: now + BURST_WINDOW };
    bursts.set(req.securityIpKey, burst);
  }
  burst.hits = Math.min(burst.hits + 1, BURST_MAXIMUM + 1);
  if (burst.hits > BURST_MAXIMUM) {
    res.setHeader(
      "Retry-After",
      String(Math.max(1, Math.ceil((burst.expiresAt - now) / 1000))),
    );
    return res.status(429).json({
      code: "RATE_LIMITED",
      error: "Muitas solicitações. Aguarde alguns segundos.",
    });
  }
  if (activeRequests >= MAXIMUM_ACTIVE_REQUESTS) {
    res.setHeader("Retry-After", "2");
    return res
      .status(503)
      .json({ error: "O serviço está ocupado. Tente novamente em instantes." });
  }
  activeRequests += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeRequests -= 1;
    res.removeListener("finish", release);
    res.removeListener("close", release);
  };
  res.once("finish", release);
  res.once("close", release);
  return next();
}

function limiter(prefix, windowMs, limit, options = {}) {
  return rateLimit({
    windowMs,
    limit,
    identifier: prefix,
    store: new MysqlLimitStore(prefix),
    keyGenerator: (req) => req.securityIpKey,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    message: {
      code: "RATE_LIMITED",
      error: "Limite temporário atingido. Aguarde antes de tentar novamente.",
    },
    ...options,
  });
}

export const apiLimiter = limiter(
  "api-total",
  MINUTE,
  securityPolicy.apiPerMinute,
);
export const writeLimiter = limiter(
  "api-writes",
  MINUTE,
  securityPolicy.writesPerMinute,
  {
    skip: (req) => safeMethods.has(req.method),
  },
);
export const registrationEntryLimiter = limiter(
  "registration-entry",
  15 * MINUTE,
  5,
);
export const registrationBudget = limiter(
  "registration-project-hour",
  HOUR,
  securityPolicy.registrationsPerHour,
  {
    keyGenerator: () => "project",
  },
);
export const loginAccountLimiter = limiter("login-account", 15 * MINUTE, 12, {
  keyGenerator: (req) => req.securityEmail,
});
export const emailCooldown = limiter("email-recipient-minute", MINUTE, 1, {
  keyGenerator: (req) => req.securityEmail,
});
export const emailRecipientLimiter = limiter("email-recipient-hour", HOUR, 5, {
  keyGenerator: (req) => req.securityEmail,
});
export const emailBurstBudget = limiter(
  "email-project-ten-minutes",
  10 * MINUTE,
  30,
  {
    keyGenerator: () => "project",
  },
);
export const emailDailyBudget = limiter(
  "email-project-day",
  DAY,
  securityPolicy.emailPerDay,
  {
    keyGenerator: () => "project",
  },
);

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());
export function identifyEmail(req, res, next) {
  const parsed = emailSchema.safeParse(req.body?.email);
  if (!parsed.success)
    return res.status(400).json({ error: "Informe um e-mail válido." });
  req.securityEmail = parsed.data;
  return next();
}

export function requestPolicy(req, res, next) {
  if ((req.originalUrl || req.url).length > 4096) {
    return res
      .status(414)
      .json({ error: "O endereço da solicitação excede o tamanho permitido." });
  }
  if (!safeMethods.has(req.method)) {
    const origin = req.get("origin");
    let allowed = false;
    try {
      allowed =
        origin === new URL(origin).origin && config.appOrigins.includes(origin);
    } catch {
      /* Missing or malformed origins are rejected. */
    }
    if (!allowed || req.get("sec-fetch-site") === "cross-site") {
      return res
        .status(403)
        .json({ error: "Origem da solicitação não permitida." });
    }
    const preparsedBody =
      Buffer.isBuffer(req.body) || typeof req.body === "string"
        ? req.body.length > 0
        : req.body && Object.keys(req.body).length > 0;
    const hasBody =
      Number(req.get("content-length") || 0) > 0 ||
      req.get("transfer-encoding") ||
      preparsedBody;
    if (hasBody && !req.is("application/json") && !isSpreadsheetUpload(req)) {
      return res
        .status(415)
        .json({ error: "Envie o conteúdo no formato JSON." });
    }
    if (
      req.get("content-encoding") &&
      req.get("content-encoding") !== "identity"
    ) {
      return res
        .status(415)
        .json({ error: "Conteúdo compactado não é aceito nesta API." });
    }
  }
  return next();
}

export function bodySizeLimit(maximum) {
  return (req, res, next) => {
    const declared = Number(req.get("content-length") || 0);
    // Some serverless adapters preparse JSON. Apply the same size ceiling there.
    const preparsed =
      req.body == null
        ? 0
        : Buffer.byteLength(
            Buffer.isBuffer(req.body) || typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body),
          );
    if (
      !Number.isFinite(declared) ||
      declared < 0 ||
      Math.max(declared, preparsed) > maximum
    ) {
      return res
        .status(413)
        .json({ error: "A solicitação excede o tamanho permitido." });
    }
    return next();
  };
}
