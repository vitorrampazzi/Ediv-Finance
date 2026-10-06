import { Router } from "express";
import { z } from "zod";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
const router = Router();
router.use(requireAuthenticatedUser);
router.get("/", async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT p.id,p.title,p.created_at,r.read_at,c.changed_tickers FROM ranking_publications p
  LEFT JOIN notification_reads r ON r.publication_id=p.id AND r.user_id=? LEFT JOIN ranking_changes c ON c.publication_id=p.id
  WHERE p.created_at>=? ORDER BY p.id DESC LIMIT 20`,
    [req.authenticatedUser.id, req.authenticatedUser.createdAt],
  );
  const [favorites] = await pool.execute(
    "SELECT ticker FROM user_favorites WHERE user_id=?",
    [req.authenticatedUser.id],
  );
  const set = new Set(favorites.map((row) => row.ticker));
  const notifications = rows.map((row) => {
    const changed =
      typeof row.changed_tickers === "string"
        ? JSON.parse(row.changed_tickers)
        : row.changed_tickers || [];
    return {
      id: String(row.id),
      title: row.title,
      createdAt: row.created_at,
      read: Boolean(row.read_at),
      favoriteTickers: changed.filter((ticker) => set.has(ticker)),
      href: "/app/ranking?publication=" + row.id,
    };
  });
  const [count] = await pool.execute(
    "SELECT COUNT(*) AS total FROM ranking_publications p LEFT JOIN notification_reads r ON r.publication_id=p.id AND r.user_id=? WHERE p.created_at>=? AND r.publication_id IS NULL",
    [req.authenticatedUser.id, req.authenticatedUser.createdAt],
  );
  res.json({ notifications, unreadCount: Number(count[0].total) });
});
router.post("/read", async (req, res) => {
  const parsed = z
    .object({ publicationId: z.string().regex(/^\d{1,20}$/) })
    .strict()
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Notificação inválida." });
  const [result] = await pool.execute(
    "INSERT IGNORE INTO notification_reads(user_id,publication_id) SELECT ?,id FROM ranking_publications WHERE id=? AND created_at>=?",
    [
      req.authenticatedUser.id,
      parsed.data.publicationId,
      req.authenticatedUser.createdAt,
    ],
  );
  res.json({
    message: result.affectedRows
      ? "Notificação lida."
      : "Nenhuma notificação nova para marcar.",
  });
});
router.post("/read-all", async (req, res) => {
  await pool.execute(
    "INSERT IGNORE INTO notification_reads(user_id,publication_id) SELECT ?,id FROM ranking_publications WHERE created_at>=?",
    [req.authenticatedUser.id, req.authenticatedUser.createdAt],
  );
  res.json({ message: "Todas as notificações foram marcadas como lidas." });
});
export { router as notificationsRouter };
