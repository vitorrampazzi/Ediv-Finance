import { randomUUID, createHash } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { requireAuthenticatedUser } from "./auth.js";
import { pool } from "./database.js";
import { getMarketQuotes } from "./market.js";
import { ledger, toUnits, fromUnits } from "./ledger.js";
import {
  portfolioInsights,
  valuePortfolioPositions,
} from "./portfolio-insights.js";
import {
  readUpload,
  fileBody,
  normalizeHeader,
  localizedDecimal,
  ImportError,
  csvDownload,
} from "./spreadsheet.js";
import { MysqlLimitStore } from "./limit-store.js";
const router = Router();
router.use(requireAuthenticatedUser);
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: new MysqlLimitStore("portfolio-import"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const decimal = z.string().regex(/^\d{1,12}(?:\.\d{1,8})?$/);
const transactionSchema = z.object({
  side: z.enum(["BUY", "SELL"]),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.-]{1,16}$/),
  assetName: z.string().trim().min(1).max(120),
  assetType: z.enum(["ACAO", "FII", "ETF", "RENDA_FIXA", "CRYPTO", "OUTRO"]),
  quantity: decimal.refine((x) => toUnits(x) > 0n),
  unitPrice: decimal.refine((x) => toUnits(x) > 0n),
  fees: decimal.default("0"),
  tradedAt: z
    .string()
    .date()
    .refine(
      (x) => x <= new Date().toISOString().slice(0, 10),
      "Use uma data passada ou de hoje.",
    ),
});
async function readLedger(executor, userId) {
  const [transactions] = await executor.execute(
    "SELECT * FROM portfolio_transactions WHERE user_id = ? ORDER BY traded_at, created_at, id",
    [userId],
  );
  const [events] = await executor.execute(
    "SELECT * FROM portfolio_events WHERE user_id = ? ORDER BY occurred_at, created_at, id",
    [userId],
  );
  return { transactions, events };
}
async function readSnapshot(userId) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.beginTransaction();
    const data = await readLedger(connection, userId);
    await connection.commit();
    return data;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
const txRow = (tx) => ({
  id: randomUUID(),
  side: tx.side,
  ticker: tx.ticker,
  asset_name: tx.assetName,
  asset_type: tx.assetType,
  quantity: tx.quantity,
  unit_price: tx.unitPrice,
  fees: tx.fees,
  traded_at: tx.tradedAt + " 12:00:00.000",
  created_at: new Date().toISOString().slice(0, 23).replace("T", " "),
});
async function writeTransaction(connection, userId, row) {
  await connection.execute(
    "INSERT INTO portfolio_transactions (id, user_id, side, ticker, asset_name, asset_type, quantity, unit_price, fees, traded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      row.id,
      userId,
      row.side,
      row.ticker,
      row.asset_name,
      row.asset_type,
      row.quantity,
      row.unit_price,
      row.fees,
      row.traded_at,
    ],
  );
}
async function mutate(userId, work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [
      userId,
    ]);
    const result = await work(connection, await readLedger(connection, userId));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
function failure(error, res, next) {
  if (
    error instanceof ImportError ||
    error.message?.startsWith("A operação") ||
    error.message?.startsWith("Não há posição") ||
    error.message?.startsWith("O fator")
  )
    return res.status(409).json({ error: error.message });
  return next(error);
}
router.get("/activity", async (req, res) => {
  const data = await readSnapshot(req.authenticatedUser.id);
  const calculated = ledger(data.transactions, data.events);
  return res.json({
    ...calculated,
    events: data.events.map((e) => ({
      id: e.id,
      ticker: e.ticker,
      kind: e.kind,
      amount: e.amount,
      factor: e.factor,
      occurredAt: e.occurred_at,
      status: e.status,
      note: e.note,
    })),
  });
});
router.get("/", async (req, res) => {
  const page = Number(req.query.historyPage || 1);
  if (!Number.isSafeInteger(page) || page < 1)
    return res.status(400).json({ error: "Página inválida." });
  const data = await readSnapshot(req.authenticatedUser.id);
  const calculated = ledger(data.transactions, data.events);
  const marketable = calculated.positions.filter((p) =>
    ["ACAO", "FII", "ETF"].includes(p.assetType),
  );
  const quotes = await getMarketQuotes(marketable.map((p) => p.ticker));
  const positions = valuePortfolioPositions(calculated.positions, quotes);
  const historyPages = Math.max(1, Math.ceil(data.transactions.length / 100));
  const historyPage = Math.min(page, historyPages);
  return res.json({
    positions,
    insights: portfolioInsights(positions, calculated.summary),
    summary: calculated.summary,
    monthly: calculated.monthly,
    events: data.events.map((e) => ({
      id: e.id,
      ticker: e.ticker,
      kind: e.kind,
      amount: e.amount,
      factor: e.factor,
      occurredAt: e.occurred_at,
      status: e.status,
      note: e.note,
    })),
    transactions: [...data.transactions]
      .reverse()
      .slice((historyPage - 1) * 100, historyPage * 100)
      .map((t) => ({
        id: t.id,
        side: t.side,
        ticker: t.ticker,
        assetName: t.asset_name,
        assetType: t.asset_type,
        quantity: t.quantity,
        unitPrice: t.unit_price,
        fees: t.fees,
        tradedAt: t.traded_at,
      })),
    transactionCount: data.transactions.length,
    historyPage,
    historyPages,
    transactionHistoryTruncated: data.transactions.length > 100,
  });
});
router.post("/transactions", async (req, res, next) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error:
        "Confira os campos. Use números com ponto decimal e uma data até hoje.",
    });
  try {
    await mutate(req.authenticatedUser.id, async (c, data) => {
      const row = txRow(parsed.data);
      ledger([...data.transactions, row], data.events);
      await writeTransaction(c, req.authenticatedUser.id, row);
    });
    return res.status(201).json({ message: "Operação registrada." });
  } catch (error) {
    return failure(error, res, next);
  }
});
router.put("/transactions/:id", async (req, res, next) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!z.string().uuid().safeParse(req.params.id).success || !parsed.success)
    return res.status(400).json({ error: "Confira os dados da operação." });
  try {
    await mutate(req.authenticatedUser.id, async (c, data) => {
      if (!data.transactions.some((t) => t.id === req.params.id))
        throw new ImportError("Operação não encontrada na sua conta.");
      const row = {
        ...txRow(parsed.data),
        id: req.params.id,
        created_at: data.transactions.find((t) => t.id === req.params.id)
          .created_at,
      };
      ledger(
        [...data.transactions.filter((t) => t.id !== row.id), row],
        data.events,
      );
      await c.execute(
        "UPDATE portfolio_transactions SET side=?, ticker=?, asset_name=?, asset_type=?, quantity=?, unit_price=?, fees=?, traded_at=? WHERE id=? AND user_id=?",
        [
          row.side,
          row.ticker,
          row.asset_name,
          row.asset_type,
          row.quantity,
          row.unit_price,
          row.fees,
          row.traded_at,
          row.id,
          req.authenticatedUser.id,
        ],
      );
    });
    return res.json({ message: "Operação corrigida e carteira recalculada." });
  } catch (error) {
    return failure(error, res, next);
  }
});
router.delete("/transactions/:id", async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Operação inválida." });
  try {
    await mutate(req.authenticatedUser.id, async (c, data) => {
      if (!data.transactions.some((t) => t.id === req.params.id))
        throw new ImportError("Operação não encontrada.");
      ledger(
        data.transactions.filter((t) => t.id !== req.params.id),
        data.events,
      );
      await c.execute(
        "DELETE FROM portfolio_transactions WHERE id=? AND user_id=?",
        [req.params.id, req.authenticatedUser.id],
      );
    });
    return res.status(204).end();
  } catch (error) {
    return failure(error, res, next);
  }
});
const eventSchema = z
  .object({
    ticker: transactionSchema.shape.ticker,
    kind: z.enum(["DIVIDEND", "JCP", "SPLIT", "BONUS"]),
    amount: decimal.default("0"),
    factor: decimal.default("1"),
    occurredAt: z.string().date(),
    status: z.enum(["RECEIVED", "ANNOUNCED"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine(
    (e) =>
      toUnits(e.factor) > 0n &&
      (["DIVIDEND", "JCP"].includes(e.kind)
        ? toUnits(e.amount) > 0n
        : e.status === "RECEIVED"),
  )
  .refine(
    (e) =>
      e.status === "ANNOUNCED" ||
      e.occurredAt <= new Date().toISOString().slice(0, 10),
  );
router.post("/events", async (req, res, next) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error:
        "Confira o valor, fator e data. Eventos realizados não podem ter data futura.",
    });
  const e = parsed.data;
  const row = {
    id: randomUUID(),
    ticker: e.ticker,
    kind: e.kind,
    amount: e.amount,
    factor: e.factor,
    occurred_at: e.occurredAt,
    status: e.status,
    note: e.note || null,
  };
  try {
    await mutate(req.authenticatedUser.id, async (c, data) => {
      ledger(data.transactions, [...data.events, row]);
      await c.execute(
        "INSERT INTO portfolio_events (id,user_id,ticker,kind,amount,factor,occurred_at,status,note) VALUES(?,?,?,?,?,?,?,?,?)",
        [
          row.id,
          req.authenticatedUser.id,
          row.ticker,
          row.kind,
          row.amount,
          row.factor,
          row.occurred_at,
          row.status,
          row.note,
        ],
      );
    });
    return res.status(201).json({ message: "Evento registrado." });
  } catch (error) {
    return failure(error, res, next);
  }
});
router.delete("/events/:id", async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Evento inválido." });
  try {
    await mutate(req.authenticatedUser.id, async (c, data) => {
      if (!data.events.some((e) => e.id === req.params.id))
        throw new ImportError("Evento não encontrado.");
      ledger(
        data.transactions,
        data.events.filter((e) => e.id !== req.params.id),
      );
      await c.execute("DELETE FROM portfolio_events WHERE id=? AND user_id=?", [
        req.params.id,
        req.authenticatedUser.id,
      ]);
    });
    return res.status(204).end();
  } catch (error) {
    return failure(error, res, next);
  }
});
function fingerprint(t) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        t.side,
        t.ticker,
        t.asset_type,
        fromUnits(toUnits(t.quantity)),
        fromUnits(toUnits(t.unit_price)),
        fromUnits(toUnits(t.fees)),
        String(t.traded_at).slice(0, 10),
      ]),
    )
    .digest("hex");
}
function importRows(rows) {
  if (rows.length < 2 || rows.length > 1001)
    throw new ImportError("Use de 1 a 1.000 operações.");
  const h = rows[0].map(normalizeHeader);
  const names = {
    side: ["tipo", "side", "movimentacao", "operacao"],
    ticker: ["ticker", "ativo", "codigo", "produto"],
    assetName: ["empresa", "nome", "asset_name"],
    assetType: ["classe", "asset_type"],
    quantity: ["quantidade", "quantity"],
    unitPrice: ["preco", "preco_unitario", "unit_price"],
    fees: ["taxas", "fees"],
    tradedAt: ["data", "traded_at"],
  };
  const index = Object.fromEntries(
    Object.entries(names).map(([key, alias]) => [
      key,
      h.findIndex((v) => alias.includes(v)),
    ]),
  );
  if (
    ["side", "ticker", "quantity", "unitPrice", "tradedAt"].some(
      (k) => index[k] < 0,
    )
  )
    throw new ImportError(
      "Colunas obrigatórias: tipo, ticker, quantidade, preco, data. Extratos de posições sem preço de compra não servem para calcular custo.",
    );
  return rows
    .slice(1)
    .filter((r) => r.some((v) => String(v).trim()))
    .map((r, i) => {
      const get = (k) => String(r[index[k]] ?? "").trim();
      const side = normalizeHeader(get("side"));
      const ticker = get("ticker").split(" - ")[0].trim().toUpperCase();
      let date = get("tradedAt");
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date))
        date = date.split("/").reverse().join("-");
      const parsed = transactionSchema.safeParse({
        side: ["buy", "compra", "c"].includes(side)
          ? "BUY"
          : ["sell", "venda", "v"].includes(side)
            ? "SELL"
            : side,
        ticker,
        assetName: get("assetName") || ticker,
        assetType: get("assetType").toUpperCase() || "ACAO",
        quantity: localizedDecimal(get("quantity")),
        unitPrice: localizedDecimal(get("unitPrice")),
        fees: get("fees") ? localizedDecimal(get("fees")) : "0",
        tradedAt: date,
      });
      if (!parsed.success)
        throw new ImportError(
          "Confira os dados na linha " +
            (i + 2) +
            ". Use somente compras e vendas.",
        );
      return txRow(parsed.data);
    });
}
router.post(
  ["/import/preview", "/import"],
  importLimiter,
  fileBody,
  async (req, res, next) => {
    try {
      const imported = importRows(await readUpload(req));
      if (!imported.length) throw new ImportError("A planilha está vazia.");
      const result = await mutate(req.authenticatedUser.id, async (c, data) => {
        const [known] = await c.execute(
          "SELECT fingerprint FROM portfolio_imports WHERE user_id=?",
          [req.authenticatedUser.id],
        );
        const seen = new Set([
          ...known.map((r) => r.fingerprint),
          ...data.transactions.map(fingerprint),
        ]);
        const unique = imported.filter((t) => {
          const key = fingerprint(t);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        ledger([...data.transactions, ...unique], data.events);
        if (req.path === "/import")
          for (const row of unique) {
            await writeTransaction(c, req.authenticatedUser.id, row);
            await c.execute(
              "INSERT INTO portfolio_imports (user_id,fingerprint) VALUES(?,?)",
              [req.authenticatedUser.id, fingerprint(row)],
            );
          }
        return {
          count: unique.length,
          duplicates: imported.length - unique.length,
          entries: unique.map((t) => ({
            ticker: t.ticker,
            side: t.side,
            quantity: t.quantity,
            price: t.unit_price,
            date: t.traded_at.slice(0, 10),
          })),
        };
      });
      return res.json({
        ...result,
        message:
          req.path === "/import"
            ? "Importação concluída. Registros repetidos foram ignorados."
            : undefined,
      });
    } catch (error) {
      return failure(error, res, next);
    }
  },
);
router.get("/export", async (req, res) => {
  const { transactions } = await readSnapshot(req.authenticatedUser.id);
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ediv-operacoes.csv"',
  );
  res
    .type("text/csv")
    .send(
      csvDownload([
        [
          "tipo",
          "ticker",
          "empresa",
          "classe",
          "quantidade",
          "preco",
          "taxas",
          "data",
        ],
        ...transactions.map((t) => [
          t.side,
          t.ticker,
          t.asset_name,
          t.asset_type,
          t.quantity,
          t.unit_price,
          t.fees,
          String(t.traded_at).slice(0, 10),
        ]),
      ]),
    );
});
router.get("/preferences", async (req, res) => {
  const [[p], [f]] = await Promise.all([
    pool.execute("SELECT * FROM user_preferences WHERE user_id=?", [
      req.authenticatedUser.id,
    ]),
    pool.execute(
      "SELECT declared_invested_amount FROM user_financial_summaries WHERE user_id=?",
      [req.authenticatedUser.id],
    ),
  ]);
  res.json({
    riskProfile: p[0]?.risk_profile || null,
    emailNotifications: Boolean(p[0]?.email_notifications),
    whatsappNotifications: Boolean(p[0]?.whatsapp_notifications),
    declaredInvestedAmount: f[0]?.declared_invested_amount ?? null,
  });
});
router.put("/preferences", async (req, res) => {
  const parsed = z
    .object({
      riskProfile: z.enum(["CONSERVADOR", "MODERADO", "ARROJADO"]).nullable(),
      emailNotifications: z.boolean(),
      whatsappNotifications: z.boolean(),
      declaredInvestedAmount: z
        .string()
        .regex(/^\d{1,16}(?:\.\d{1,2})?$/)
        .nullable()
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Preferências inválidas." });
  const p = parsed.data;
  await mutate(req.authenticatedUser.id, async (c) => {
    await c.execute(
      "INSERT INTO user_preferences(user_id,risk_profile,email_notifications,whatsapp_notifications) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE risk_profile=VALUES(risk_profile),email_notifications=VALUES(email_notifications),whatsapp_notifications=VALUES(whatsapp_notifications)",
      [
        req.authenticatedUser.id,
        p.riskProfile,
        p.emailNotifications,
        p.whatsappNotifications,
      ],
    );
    if (Object.hasOwn(p, "declaredInvestedAmount"))
      await c.execute(
        "INSERT INTO user_financial_summaries(user_id,declared_invested_amount) VALUES(?,?) ON DUPLICATE KEY UPDATE declared_invested_amount=VALUES(declared_invested_amount)",
        [req.authenticatedUser.id, p.declaredInvestedAmount],
      );
  });
  return res.json({ message: "Preferências salvas." });
});
export { router as portfolioRouter };
