import express from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import { authRouter } from "./auth.js";
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

const app = express();
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);
app.use(helmet());
app.use("/api", (req, res, next) => {
  const id = randomUUID();
  const started = Date.now();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  res.on("finish", () => {
    if (res.statusCode >= 400)
      console.info(
        JSON.stringify({
          requestId: id,
          method: req.method,
          status: res.statusCode,
          durationMs: Date.now() - started,
        }),
      );
  });
  next();
});
app.use(express.json({ limit: "16kb", type: "application/json" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", (req, res, next) => {
  if (safeMethods.has(req.method)) return next();

  const origin = req.get("origin");
  let requestOrigin;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    requestOrigin = null;
  }
  if (
    !requestOrigin ||
    !config.appOrigins.includes(requestOrigin) ||
    req.get("sec-fetch-site") === "cross-site"
  ) {
    return res
      .status(403)
      .json({ error: "Origem da solicitação não permitida." });
  }
  return next();
});

app.get("/api/health", async (_req, res) => {
  await pool.execute("SELECT 1");
  return res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/market", marketRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/rankings", rankingRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/support", supportRouter);
app.use("/api/learning", learningRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Rota de API não encontrada." }),
);

app.use((error, _req, res, _next) => {
  console.error(
    "API request failed:",
    _req.requestId,
    error.code || error.name || "unknown error",
  );
  if (res.headersSent) return;
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "A solicitação excede o tamanho permitido." });
  if (error.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ error: "O conteúdo enviado não é um JSON válido." });
  return res.status(500).json({
    error: "Não foi possível concluir a solicitação. Tente novamente.",
  });
});

export { app };
