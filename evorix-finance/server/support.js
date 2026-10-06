import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool } from "./database.js";
import { config } from "./config.js";
import { requireAuthenticatedUser } from "./auth.js";
import { hasPermission, lockActiveUser } from "./permissions.js";
import { MysqlLimitStore } from "./limit-store.js";
const router = Router();
router.get("/information", (_req, res) =>
  res.json({
    email: config.supportEmail,
    hours: config.supportHours,
    professionalName: config.professionalName,
    category: config.professionalCategory,
    registration: config.professionalRegistration,
    subscriptionsAvailable: false,
  }),
);
router.use(requireAuthenticatedUser);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  store: new MysqlLimitStore("support"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const bodySchema = z.string().trim().min(2).max(3000);
const isStaff = (req) => hasPermission(req.authenticatedUser, "support:manage");
router.get("/", async (req, res) => {
  const staff = isStaff(req);
  const [threads] = await pool.execute(
    `SELECT t.id,t.subject,t.status,t.share_portfolio,t.created_at,t.updated_at,u.name FROM support_threads t JOIN users u ON u.id=t.user_id ${staff ? "" : "WHERE t.user_id=?"} ORDER BY t.updated_at DESC LIMIT 100`,
    staff ? [] : [req.authenticatedUser.id],
  );
  return res.json({ canManage: staff, threads });
});
router.post("/", limiter, async (req, res) => {
  const parsed = z
    .object({
      subject: z.string().trim().min(3).max(160),
      body: bodySchema,
      sharePortfolio: z.boolean().default(false),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error: "Confira o assunto e a mensagem (até 3.000 caracteres).",
    });
  const id = randomUUID();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "INSERT INTO support_threads(id,user_id,subject,share_portfolio) VALUES(?,?,?,?)",
      [
        id,
        req.authenticatedUser.id,
        parsed.data.subject,
        parsed.data.sharePortfolio,
      ],
    );
    await connection.execute(
      "INSERT INTO support_messages(id,thread_id,author_id,body) VALUES(?,?,?,?)",
      [randomUUID(), id, req.authenticatedUser.id, parsed.data.body],
    );
    await connection.commit();
    return res.status(201).json({ id });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
async function access(req, res, next) {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Conversa inválida." });
  const [rows] = await pool.execute(
    "SELECT * FROM support_threads WHERE id=?",
    [req.params.id],
  );
  if (
    !rows[0] ||
    (rows[0].user_id !== req.authenticatedUser.id && !isStaff(req))
  )
    return res.status(404).json({ error: "Conversa não encontrada." });
  req.thread = rows[0];
  return next();
}
router.get("/:id", access, async (req, res) => {
  const [messages] = await pool.execute(
    "SELECT id,is_staff,body,created_at FROM support_messages WHERE thread_id=? ORDER BY created_at,id",
    [req.thread.id],
  );
  let portfolio = null;
  if (isStaff(req) && req.thread.share_portfolio) {
    const [rows] = await pool.execute(
      "SELECT p.ticker,p.side,p.asset_name,p.quantity,p.unit_price,p.fees,p.traded_at FROM portfolio_transactions p JOIN support_threads t ON t.user_id=p.user_id WHERE t.id=? AND t.share_portfolio=TRUE ORDER BY p.traded_at",
      [req.thread.id],
    );
    portfolio = rows;
  }
  return res.json({ thread: req.thread, messages, portfolio });
});
router.post("/:id/messages", limiter, access, async (req, res) => {
  const parsed = z
    .object({
      body: bodySchema,
      status: z.enum(["IN_PROGRESS", "ANSWERED"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Mensagem inválida." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const actor = await lockActiveUser(connection, req.authenticatedUser.id);
    const staff = hasPermission(actor, "support:manage");
    const [threads] = await connection.execute(
      "SELECT id,user_id FROM support_threads WHERE id=? FOR UPDATE",
      [req.thread.id],
    );
    if (
      !actor ||
      !threads[0] ||
      (!staff && threads[0].user_id !== req.authenticatedUser.id)
    ) {
      await connection.rollback();
      return res
        .status(403)
        .json({ error: "Seu acesso à conversa mudou. Entre novamente." });
    }
    await connection.execute(
      "INSERT INTO support_messages(id,thread_id,author_id,is_staff,body) VALUES(?,?,?,?,?)",
      [
        randomUUID(),
        req.thread.id,
        req.authenticatedUser.id,
        staff,
        parsed.data.body,
      ],
    );
    await connection.execute(
      "UPDATE support_threads SET status=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?",
      [staff ? parsed.data.status || "ANSWERED" : "RECEIVED", req.thread.id],
    );
    await connection.commit();
    return res.status(201).json({ message: "Mensagem salva." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
router.patch("/:id/consent", limiter, access, async (req, res) => {
  if (req.thread.user_id !== req.authenticatedUser.id)
    return res
      .status(403)
      .json({ error: "Só o titular pode alterar o compartilhamento." });
  const parsed = z.object({ sharePortfolio: z.boolean() }).safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Escolha inválida." });
  await pool.execute(
    "UPDATE support_threads SET share_portfolio=? WHERE id=?",
    [parsed.data.sharePortfolio, req.thread.id],
  );
  return res.json({ message: "Compartilhamento atualizado." });
});
export { router as supportRouter };
