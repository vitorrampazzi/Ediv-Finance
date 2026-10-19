import { Router } from "express";
import { z } from "zod";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
import {
  hasPermission,
  requirePermission,
  lockAccessControl,
  lockActiveUser,
} from "./permissions.js";
import { learningCourses, lessons } from "./learning-content.js";

const router = Router();
router.use(requireAuthenticatedUser);
const id = z
  .string()
  .refine(
    (value) =>
      /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n,
  );
const eligible = "e.created_at>=?";
const reads = `LEFT JOIN notification_event_reads r ON r.notification_id=e.id AND r.user_id=?
  LEFT JOIN notification_reads legacy ON legacy.publication_id=e.publication_id AND legacy.user_id=?`;
const unread = "r.notification_id IS NULL AND legacy.publication_id IS NULL";
const pageSize = 20;

router.get("/", async (req, res) => {
  const parsed = z
    .object({ cursor: id.optional() })
    .strict()
    .safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ error: "Cursor inválido." });
  const user = req.authenticatedUser;
  const connection = await pool.getConnection();
  let notifications, unreadCount, nextCursor;
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.beginTransaction();
    const cursor = parsed.data.cursor;
    const [rows] = await connection.execute(
      `SELECT CAST(e.id AS CHAR) AS id,e.type,e.source_id,e.title,e.description,e.href,
        e.created_at,e.changed_tickers,NOT (${unread}) AS is_read
       FROM notification_events e ${reads} WHERE ${eligible} ${cursor ? "AND e.id<?" : ""}
       ORDER BY e.id DESC LIMIT 21`,
      [user.id, user.id, user.createdAt, ...(cursor ? [cursor] : [])],
    );
    const [count] = await connection.execute(
      `SELECT COUNT(*) AS total FROM notification_events e ${reads} WHERE ${eligible} AND ${unread}`,
      [user.id, user.id, user.createdAt],
    );
    const [favorites] = await connection.execute(
      "SELECT ticker FROM user_favorites WHERE user_id=?",
      [user.id],
    );
    const tickers = new Set(favorites.map((row) => row.ticker));
    notifications = rows.slice(0, pageSize).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      createdAt: new Date(row.created_at.replace(" ", "T") + "Z").toISOString(),
      read: Boolean(Number(row.is_read)),
      favoriteTickers: (typeof row.changed_tickers === "string"
        ? JSON.parse(row.changed_tickers)
        : row.changed_tickers
      ).filter((ticker) => tickers.has(ticker)),
      href: row.href,
      sourceId: row.source_id,
    }));
    unreadCount = Number(count[0].total);
    nextCursor = rows.length > pageSize ? notifications.at(-1).id : null;
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ notifications, unreadCount, nextCursor });
});

const readBody = z.union([
  z.object({ notificationId: id }).strict(),
  z.object({ publicationId: id }).strict(),
]);

async function markRead(user, selected) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const selection = selected
      ? selected.notificationId
        ? "AND e.id=?"
        : "AND e.publication_id=?"
      : "";
    const params = [
      user.id,
      user.createdAt,
      ...(selected ? [selected.notificationId || selected.publicationId] : []),
    ];
    await connection.execute(
      `INSERT INTO notification_event_reads(user_id,notification_id)
       SELECT ?,e.id FROM notification_events e WHERE ${eligible} ${selection}
       ON DUPLICATE KEY UPDATE read_at=notification_event_reads.read_at`,
      params,
    );
    await connection.execute(
      `INSERT INTO notification_reads(user_id,publication_id)
       SELECT ?,e.publication_id FROM notification_events e WHERE ${eligible} AND e.publication_id IS NOT NULL ${selection}
       ON DUPLICATE KEY UPDATE read_at=notification_reads.read_at`,
      params,
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

router.post("/read", async (req, res) => {
  const parsed = readBody.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Notificação inválida." });
  await markRead(req.authenticatedUser, parsed.data);
  res.json({ message: "Notificação lida, quando disponível para sua conta." });
});
router.post("/read-all", async (req, res) => {
  await markRead(req.authenticatedUser);
  res.json({ message: "Todas as notificações foram marcadas como lidas." });
});

const learningPublication = z
  .object({
    courseId: z.string().min(1).max(40),
    lessonId: z.string().min(1).max(40).optional(),
    version: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/),
  })
  .strict();

router.post(
  "/publish-learning",
  requirePermission("rankings:write"),
  async (req, res) => {
    const parsed = learningPublication.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Publicação educativa inválida." });
    const { courseId, lessonId, version } = parsed.data;
    const course = learningCourses.find((item) => item.id === courseId);
    const lesson = lessons.find((item) => item.id === lessonId);
    if (
      !course ||
      (lessonId && (!lesson || !course.chapterIds.includes(lessonId)))
    )
      return res.status(400).json({ error: "Curso ou aula fora do catálogo." });
    const type = lessonId ? "lesson" : "course";
    const sourceId = lessonId || course.id;
    const connection = await pool.getConnection();
    let notificationId;
    try {
      await connection.beginTransaction();
      await lockAccessControl(connection);
      if (
        !hasPermission(
          await lockActiveUser(connection, req.authenticatedUser.id),
          "rankings:write",
        )
      ) {
        await connection.rollback();
        return res
          .status(403)
          .json({
            error: "Seu acesso à publicação foi alterado. Entre novamente.",
          });
      }
      await connection.execute(
        `INSERT INTO notification_events(type,source_id,editorial_version,title,description,href,changed_tickers)
       VALUES(?,?,?,?,?,?,JSON_ARRAY()) ON DUPLICATE KEY UPDATE id=notification_events.id`,
        [
          type,
          sourceId,
          version,
          lesson?.title || course.title,
          lessonId
            ? "Uma nova versão desta aula está disponível."
            : "Uma nova versão deste curso está disponível.",
          `/app/aprender?aula=${lessonId || course.chapterIds[0]}#sala-de-aula`,
        ],
      );
      const [rows] = await connection.execute(
        "SELECT CAST(id AS CHAR) AS id FROM notification_events WHERE type=? AND source_id=? AND editorial_version=?",
        [type, sourceId, version],
      );
      notificationId = rows[0].id;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    res.json({ notificationId });
  },
);
export { router as notificationsRouter };
