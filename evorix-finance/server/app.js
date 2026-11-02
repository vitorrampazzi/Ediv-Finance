import express from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import { authRouter, requireAuthenticatedUser } from "./auth.js";
import { config } from "./config.js";
import { pool } from "./database.js";
import { portfolioRouter } from "./portfolio.js";
import { favoritesRouter } from "./favorites.js";
import { marketRouter } from "./market.js";
import { rankingRouter } from "./rankings.js";
import { assistantRouter } from "./assistant.js";
import { supportRouter } from "./support.js";
import { learningRouter } from "./learning.js";
import { adminRouter } from "./admin.js";
import { researchDraftRouter } from "./research-drafts.js";
import { notificationsRouter } from "./notifications.js";
import { requirePermission } from "./permissions.js";
import { requireRegistrationChallenge } from "./registration-challenge.js";
import { cleanupExpiredAuth } from "./auth-cleanup.js";
import { createApiErrorHandler } from "./api-errors.js";
import {
  identifyClient,
  requestAdmission,
  requestPolicy,
  bodySizeLimit,
  isSpreadsheetUpload,
  apiLimiter,
  writeLimiter,
  registrationEntryLimiter,
  registrationBudget,
  identifyEmail,
  loginIpLimiter,
  loginAccountLimiter,
  loginEmailCeiling,
  emailEntryLimiter,
  emailCooldown,
  emailRecipientLimiter,
  emailBurstBudget,
  emailDailyBudget,
} from "./security-limits.js";

const app = express();
const allowedMethods = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
const failureLogTimes = new Map();

app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://www.googletagmanager.com",
        ],
        scriptSrcAttr: ["'none'"],
        frameSrc: [
          "https://www.youtube-nocookie.com",
          "https://player.vimeo.com",
          "https://challenges.cloudflare.com",
        ],
        connectSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://www.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://www.google.com",
        ],
      },
    },
  }),
);
app.use("/api", (req, res, next) => {
  const id = randomUUID();
  const started = Date.now();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  res.setHeader("Cache-Control", "no-store");
  res.on("finish", () => {
    const now = Date.now();
    const method = allowedMethods.has(req.method) ? req.method : "OTHER";
    const key = `${method}:${res.statusCode}`;
    // Keep attack traffic from amplifying logging costs. No body, token or IP.
    if (
      res.statusCode >= 400 &&
      now - (failureLogTimes.get(key) || 0) > 10_000
    ) {
      failureLogTimes.set(key, now);
      console.info(
        JSON.stringify({
          requestId: id,
          method,
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      );
    }
  });
  next();
});
app.use("/api", identifyClient, requestAdmission, requestPolicy);
app.use("/api", (req, res, next) => {
  if (!allowedMethods.has(req.method)) {
    res.setHeader("Allow", [...allowedMethods].join(", "));
    return res.status(405).json({ error: "Método não permitido." });
  }
  return next();
});
app.use("/api", apiLimiter, writeLimiter);
app.use("/api", cleanupExpiredAuth);
app.post("/api/auth/register", registrationEntryLimiter);
app.use("/api", (req, res, next) => {
  if (!isSpreadsheetUpload(req)) return next();
  // Files keep their dedicated 1 MB raw parser in the existing routers.
  return bodySizeLimit(1024 * 1024)(req, res, () =>
    requireAuthenticatedUser(req, res, (error) => {
      if (error) return next(error);
      if (/^\/rankings(?:\/|$)/i.test(req.path))
        return requirePermission("rankings:write")(req, res, next);
      return next();
    }),
  );
});
app.use(
  "/api/rankings/drafts",
  requireAuthenticatedUser,
  requirePermission("rankings:write"),
  bodySizeLimit(1100 * 1024),
  express.json({ limit: "1100kb", inflate: false, type: "application/json" }),
);
app.use("/api", (req, res, next) => {
  // Staff draft payloads were already parsed under their dedicated ceiling.
  if (isSpreadsheetUpload(req) || /^\/rankings\/drafts(?:\/|$)/i.test(req.path))
    return next();
  return bodySizeLimit(16 * 1024)(req, res, next);
});
app.use(
  express.json({ limit: "16kb", inflate: false, type: "application/json" }),
);

app.post(
  "/api/auth/register",
  requireRegistrationChallenge,
  identifyEmail,
  registrationBudget,
);
// Per-IP limits run first so one client cannot exhaust a per-account or
// project-wide counter that other people depend on.
app.post(
  "/api/auth/login",
  loginIpLimiter,
  identifyEmail,
  loginAccountLimiter,
  loginEmailCeiling,
);
app.post(
  [
    "/api/auth/register",
    "/api/auth/verification/resend",
    "/api/auth/password/forgot",
  ],
  emailEntryLimiter,
  identifyEmail,
  emailCooldown,
  emailRecipientLimiter,
  emailBurstBudget,
  emailDailyBudget,
);

app.get("/api/health", async (_req, res) => {
  await pool.execute("SELECT 1");
  return res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/market", marketRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/rankings/drafts", researchDraftRouter);
app.use("/api/rankings", rankingRouter);
if (config.assistantFeatureEnabled) {
  app.use("/api/assistant", assistantRouter);
}
app.use("/api/support", supportRouter);
app.use("/api/learning", learningRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);

app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Rota de API não encontrada." }),
);

app.use(createApiErrorHandler());

export { app };
