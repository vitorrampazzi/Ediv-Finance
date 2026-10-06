import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
import {
  requirePermission,
  hasPermission,
  lockActiveUser,
} from "./permissions.js";
import { MysqlLimitStore } from "./limit-store.js";
const router = Router();
router.use(requireAuthenticatedUser, requirePermission("rankings:write"));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  store: new MysqlLimitStore("drafts"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const lengths = {
  ticker: 16,
  empresa: 160,
  potencial_percentual: 30,
  preco_alvo: 30,
  horizonte_meses: 3,
  setor: 120,
  tese: 2000,
  riscos: 2000,
  balanco_patrimonial: 5000,
  dre: 5000,
  fluxo_de_caixa: 5000,
  informacoes_da_empresa: 5000,
  divida_liquida: 5000,
  estatisticas: 5000,
  periodo_referencia: 120,
  fonte_dados: 500,
};
const row = z
  .object(
    Object.fromEntries(
      Object.entries(lengths).map(([key, max]) => [key, z.string().max(max)]),
    ),
  )
  .strict();
const payload = z
  .object({
    metadata: z
      .object({
        title: z.string().max(160),
        authorName: z.string().max(120),
        professionalCategory: z.string().max(120),
        professionalRegistration: z.string().max(120),
      })
      .strict(),
    entries: z.array(row).max(300),
    working: row,
    editing: z.number().int().min(0).max(299).nullable(),
  })
  .strict()
  .refine(
    (data) => data.editing === null || data.editing < data.entries.length,
  );
router.get("/", async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id,title,version,updated_at FROM research_drafts WHERE user_id=? ORDER BY updated_at DESC LIMIT 100",
    [req.authenticatedUser.id],
  );
  res.json({ drafts: rows });
});
router.get("/:id", async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Rascunho inválido." });
  const [rows] = await pool.execute(
    "SELECT id,title,version,updated_at,payload FROM research_drafts WHERE id=? AND user_id=?",
    [req.params.id, req.authenticatedUser.id],
  );
  if (!rows[0])
    return res.status(404).json({ error: "Rascunho não encontrado." });
  res.json({
    ...rows[0],
    payload:
      typeof rows[0].payload === "string"
        ? JSON.parse(rows[0].payload)
        : rows[0].payload,
  });
});
router.post("/", limiter, save);
router.put("/:id", limiter, save);
async function save(req, res) {
  const parsed = z
    .object({ payload, version: z.number().int().min(1).optional() })
    .strict()
    .safeParse(req.body);
  if (
    !parsed.success ||
    (req.params.id &&
      (!z.string().uuid().safeParse(req.params.id).success ||
        !parsed.data.version))
  )
    return res
      .status(400)
      .json({
        error: "Rascunho inválido. Confira os campos e os limites de texto.",
      });
  const value = JSON.stringify(parsed.data.payload);
  if (Buffer.byteLength(value) > 1048576)
    return res.status(413).json({ error: "O rascunho excede 1 MB." });
  const connection = await pool.getConnection();
  const id = req.params.id || randomUUID();
  try {
    await connection.beginTransaction();
    if (
      !hasPermission(
        await lockActiveUser(connection, req.authenticatedUser.id),
        "rankings:write",
      )
    ) {
      await connection.rollback();
      return res
        .status(403)
        .json({ error: "Seu perfil mudou. Entre novamente." });
    }
    const title =
      parsed.data.payload.metadata.title.trim() || "Rascunho de pesquisa";
    let version = 1;
    if (req.params.id) {
      const [result] = await connection.execute(
        "UPDATE research_drafts SET title=?,payload=?,version=version+1 WHERE id=? AND user_id=? AND version=?",
        [title, value, id, req.authenticatedUser.id, parsed.data.version],
      );
      if (!result.affectedRows) {
        const [rows] = await connection.execute(
          "SELECT id FROM research_drafts WHERE id=? AND user_id=?",
          [id, req.authenticatedUser.id],
        );
        await connection.rollback();
        return res
          .status(rows.length ? 409 : 404)
          .json({
            error: rows.length
              ? "Esse rascunho mudou em outra janela. Abra novamente antes de salvar; sua edição local foi mantida."
              : "Rascunho não encontrado.",
          });
      }
      version = parsed.data.version + 1;
    } else {
      const [count] = await connection.execute(
        "SELECT COUNT(*) AS total FROM research_drafts WHERE user_id=?",
        [req.authenticatedUser.id],
      );
      if (Number(count[0].total) >= 100) {
        await connection.rollback();
        return res
          .status(409)
          .json({
            error:
              "Limite de 100 rascunhos. Exclua um rascunho antigo para continuar.",
          });
      }
      await connection.execute(
        "INSERT INTO research_drafts(id,user_id,title,payload) VALUES(?,?,?,?)",
        [id, req.authenticatedUser.id, title, value],
      );
    }
    await connection.commit();
    res
      .status(req.params.id ? 200 : 201)
      .json({
        id,
        version,
        message:
          "Rascunho salvo na sua conta. A pesquisa ainda não foi publicada.",
      });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
router.delete("/:id", limiter, async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Rascunho inválido." });
  const [result] = await pool.execute(
    "DELETE FROM research_drafts WHERE id=? AND user_id=?",
    [req.params.id, req.authenticatedUser.id],
  );
  return result.affectedRows
    ? res.status(204).end()
    : res.status(404).json({ error: "Rascunho não encontrado." });
});
export { router as researchDraftRouter };
