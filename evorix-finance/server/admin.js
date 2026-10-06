import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
import { MysqlLimitStore } from "./limit-store.js";
import {
  requirePermission,
  lockAccessControl,
  activeAdministratorCount,
} from "./permissions.js";

const router = Router();
router.use(requireAuthenticatedUser, requirePermission("users:read"));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  store: new MysqlLimitStore("admin-access"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas alterações de acesso. Aguarde alguns minutos." },
});
const roles = z.enum(["USER", "ANALYST", "ADMIN"]);
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(120).default(""),
  role: roles.optional(),
  status: z.enum(["active", "blocked", "pending"]).optional(),
});
const profile = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at,
  emailVerified: Boolean(row.email_verified_at),
  role: row.role || "USER",
  blocked: Boolean(row.blocked_at),
});

router.get("/summary", async (_req, res) => {
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total,
    COALESCE(SUM(u.email_verified_at IS NOT NULL),0) AS verified,
    COALESCE(SUM(a.blocked_at IS NOT NULL),0) AS blocked,
    COALESCE(SUM(a.role='ADMIN' AND a.blocked_at IS NULL AND u.email_verified_at IS NOT NULL),0) AS admins,
    COALESCE(SUM(a.role='ANALYST' AND a.blocked_at IS NULL AND u.email_verified_at IS NOT NULL),0) AS analysts
    FROM users u LEFT JOIN user_access a ON a.user_id=u.id`);
  return res.json(
    Object.fromEntries(
      Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]),
    ),
  );
});
router.get("/users", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: "Filtros inválidos." });
  const { page, q, role, status } = parsed.data;
  const conditions = [];
  const values = [];
  if (q) {
    // LOCATE treats wildcard characters literally.
    conditions.push("(LOCATE(?,u.name)>0 OR LOCATE(?,u.email)>0)");
    values.push(q, q);
  }
  if (role) {
    conditions.push("COALESCE(a.role,'USER')=?");
    values.push(role);
  }
  if (status === "blocked") conditions.push("a.blocked_at IS NOT NULL");
  if (status === "active")
    conditions.push("a.blocked_at IS NULL AND u.email_verified_at IS NOT NULL");
  if (status === "pending")
    conditions.push("u.email_verified_at IS NULL AND a.blocked_at IS NULL");
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  const from =
    " FROM users u LEFT JOIN user_access a ON a.user_id=u.id" + where;
  const [count] = await pool.execute("SELECT COUNT(*) AS total" + from, values);
  const [rows] = await pool.query(
    "SELECT u.id,u.name,u.email,u.created_at,u.email_verified_at,a.role,a.blocked_at" +
      from +
      " ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?",
    [...values, 20, (page - 1) * 20],
  );
  return res.json({
    users: rows.map(profile),
    total: Number(count[0].total),
    page,
    pageSize: 20,
  });
});

router.patch(
  "/users/:id/access",
  requirePermission("users:manage"),
  limiter,
  async (req, res) => {
    const parsed = z
      .object({ role: roles.optional(), blocked: z.boolean().optional() })
      .strict()
      .refine(
        (value) => value.role !== undefined || value.blocked !== undefined,
      )
      .safeParse(req.body);
    if (!z.string().uuid().safeParse(req.params.id).success || !parsed.success)
      return res.status(400).json({ error: "Conta ou alteração inválida." });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await lockAccessControl(connection);
      const [actors] = await connection.execute(
        "SELECT u.email_verified_at,a.role,a.blocked_at FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.id=? FOR UPDATE",
        [req.authenticatedUser.id],
      );
      const actor = actors[0];
      if (
        !actor ||
        actor.role !== "ADMIN" ||
        actor.blocked_at ||
        !actor.email_verified_at
      ) {
        await connection.rollback();
        return res
          .status(403)
          .json({
            error: "Seu acesso administrativo foi alterado. Entre novamente.",
          });
      }
      const [targets] = await connection.execute(
        "SELECT u.id,u.name,u.email,u.created_at,u.email_verified_at,a.role,a.blocked_at FROM users u LEFT JOIN user_access a ON a.user_id=u.id WHERE u.id=? FOR UPDATE",
        [req.params.id],
      );
      const target = targets[0];
      if (!target) {
        await connection.rollback();
        return res.status(404).json({ error: "Conta não encontrada." });
      }
      const before = {
        role: target.role || "USER",
        blocked: Boolean(target.blocked_at),
      };
      const after = {
        role: parsed.data.role ?? before.role,
        blocked: parsed.data.blocked ?? before.blocked,
      };
      if (before.role === after.role && before.blocked === after.blocked) {
        await connection.rollback();
        return res.json({
          user: profile(target),
          message: "O acesso já está configurado dessa forma.",
        });
      }
      if (target.id === req.authenticatedUser.id) {
        await connection.rollback();
        return res
          .status(409)
          .json({
            error:
              "Altere seu perfil ou bloqueio usando outra conta Administrador. Você não pode remover seu próprio acesso aqui.",
          });
      }
      if (after.role !== "USER" && !target.email_verified_at) {
        await connection.rollback();
        return res
          .status(409)
          .json({
            error:
              "A conta precisa confirmar o e-mail antes de receber acesso à equipe.",
          });
      }
      if (
        before.role === "ADMIN" &&
        !before.blocked &&
        target.email_verified_at &&
        (after.role !== "ADMIN" || after.blocked) &&
        (await activeAdministratorCount(connection)) <= 1
      ) {
        await connection.rollback();
        return res
          .status(409)
          .json({
            error:
              "Mantenha ao menos um Administrador ativo com e-mail confirmado.",
          });
      }
      await connection.execute(
        "INSERT INTO user_access(user_id,role,blocked_at) VALUES(?,?,IF(?,UTC_TIMESTAMP(3),NULL)) ON DUPLICATE KEY UPDATE role=?,blocked_at=IF(?,COALESCE(blocked_at,UTC_TIMESTAMP(3)),NULL)",
        [target.id, after.role, after.blocked, after.role, after.blocked],
      );
      await connection.execute("DELETE FROM user_sessions WHERE user_id=?", [
        target.id,
      ]);
      const actions = [];
      if (before.role !== after.role) actions.push("ROLE_CHANGED");
      if (before.blocked !== after.blocked)
        actions.push(after.blocked ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED");
      for (const action of actions)
        await connection.execute(
          "INSERT INTO admin_audit_events(id,actor_id,target_id,action,before_state,after_state) VALUES(?,?,?,?,?,?)",
          [
            randomUUID(),
            req.authenticatedUser.id,
            target.id,
            action,
            JSON.stringify(before),
            JSON.stringify(after),
          ],
        );
      await connection.commit();
      return res.json({
        user: { ...profile(target), ...after },
        message: "Acesso atualizado. As sessões dessa conta foram encerradas.",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
);
router.get("/audit", requirePermission("audit:read"), async (req, res) => {
  const parsed = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(1)
    .safeParse(req.query.page);
  if (!parsed.success)
    return res.status(400).json({ error: "Página inválida." });
  const page = parsed.data;
  const [count] = await pool.execute(
    "SELECT COUNT(*) AS total FROM admin_audit_events",
  );
  const [events] = await pool.query(
    `SELECT e.id,e.action,e.before_state,e.after_state,e.created_at,
    actor.name AS actor_name,target.name AS target_name FROM admin_audit_events e
    LEFT JOIN users actor ON actor.id=e.actor_id LEFT JOIN users target ON target.id=e.target_id
    ORDER BY e.created_at DESC,e.id DESC LIMIT ? OFFSET ?`,
    [20, (page - 1) * 20],
  );
  return res.json({
    events,
    page,
    pageSize: 20,
    total: Number(count[0].total),
  });
});
export { router as adminRouter };
