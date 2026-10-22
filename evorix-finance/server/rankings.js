import { parseRankingUpload } from "./dividend-import.js";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "./database.js";
import { requireAuthenticatedUser } from "./auth.js";
import { MysqlLimitStore } from "./limit-store.js";
import {
  hasPermission,
  lockActiveUser,
  lockAccessControl,
} from "./permissions.js";
import { compareResearch, readEntries } from "./research-diff.js";
import { researchStatus } from "./research-status.js";
import {
  createResearchEvent,
  researchFingerprint,
} from "./notification-events.js";
import { fileBody, readUpload, ImportError } from "./spreadsheet.js";

const router = Router();
router.get("/status", async (_req, res) => res.json(await researchStatus()));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  store: new MysqlLimitStore("ranking-upload"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas importações. Aguarde alguns minutos." },
});
export const canManageRankings = (user) =>
  hasPermission(user, "rankings:write");
function publication(row) {
  return {
    id: String(row.id),
    title: row.title,
    authorName: row.author_name,
    professionalCategory: row.professional_category,
    professionalRegistration: row.professional_registration,
    sourceFileName: row.source_file_name,
    updatedAt: row.created_at,
    entries: (typeof row.entries_json === "string"
      ? JSON.parse(row.entries_json)
      : row.entries_json
    ).sort((a, b) => a.rank - b.rank),
  };
}
router.get("/compare", requireAuthenticatedUser, async (req, res) => {
  const { from, to } = req.query;
  if (
    typeof from !== "string" ||
    typeof to !== "string" ||
    !/^\d{1,20}$/.test(String(from)) ||
    !/^\d{1,20}$/.test(String(to)) ||
    BigInt(from) >= BigInt(to)
  )
    return res
      .status(400)
      .json({ error: "Selecione uma versão anterior e uma mais recente." });
  const [rows] = await pool.execute(
    "SELECT * FROM ranking_publications WHERE id IN (?,?)",
    [from, to],
  );
  const before = rows.find((row) => String(row.id) === from);
  const after = rows.find((row) => String(row.id) === to);
  if (!before || !after)
    return res.status(404).json({ error: "Publicação não encontrada." });
  res.json({
    from: publication(before),
    to: publication(after),
    ...compareResearch(
      readEntries(before.entries_json),
      readEntries(after.entries_json),
    ),
  });
});
router.get("/", requireAuthenticatedUser, async (req, res) => {
  const user = req.authenticatedUser;
  const id = req.query.publication;
  if (id && (typeof id !== "string" || !/^\d{1,20}$/.test(id)))
    return res.status(400).json({ error: "Publicação inválida." });
  const [rows] = await pool.execute(
    id
      ? "SELECT * FROM ranking_publications WHERE id = ?"
      : "SELECT * FROM ranking_publications ORDER BY id DESC LIMIT 1",
    id ? [id] : [],
  );
  const [history] = await pool.execute(
    "SELECT id, title, author_name, created_at FROM ranking_publications ORDER BY id DESC LIMIT 50",
  );
  let data = rows[0]
    ? publication(rows[0])
    : {
        id: null,
        title: "Ranking de cenários",
        authorName: null,
        professionalCategory: null,
        professionalRegistration: null,
        updatedAt: null,
        sourceFileName: null,
        entries: [],
      };
  if (!rows[0] && id)
    return res.status(404).json({ error: "Publicação não encontrada." });
  if (!rows[0] && !id) {
    const [legacy] = await pool.execute(
      "SELECT * FROM income_ranking_entries ORDER BY rank_position",
    );
    data = {
      ...data,
      updatedAt: legacy[0]?.created_at || null,
      sourceFileName: legacy[0]?.source_file_name || null,
      entries: legacy.map((row) => ({
        rank: row.rank_position,
        ticker: row.ticker,
        companyName: row.company_name,
        expectedReturnPercent: String(row.expected_return_percent),
        targetPrice: row.target_price,
        horizonMonths: row.horizon_months,
        thesis: row.thesis,
        risks: null,
        sector: null,
      })),
    };
  }
  return res.json({
    ...data,
    access: "full",
    totalEntries: data.entries.length,
    canManage: canManageRankings(user),
    history: history.map((row) => ({
      id: String(row.id),
      title: row.title,
      authorName: row.author_name,
      createdAt: row.created_at,
    })),
  });
});
async function manage(req, res, next) {
  if (!canManageRankings(req.authenticatedUser))
    return res
      .status(403)
      .json({ error: "Sua conta não pode publicar análises." });
  return next();
}
router.post(
  ["/preview", "/"],
  requireAuthenticatedUser,
  manage,
  limiter,
  fileBody,
  async (req, res, next) => {
    try {
      const sourceFileName = req.get("x-file-name")
        ? decodeURIComponent(req.get("x-file-name"))
            .replace(/[\x00-\x1f<>:"/\\|?*]/g, "_")
            .slice(-255)
        : null;
      const entries = parseRankingUpload(
        await readUpload(req, { allSheets: true }),
        sourceFileName,
      );
      if (!entries.length) throw new ImportError("A planilha não tem ativos.");
      if (req.path === "/preview")
        return res.json({ entries, count: entries.length });
      let metadata;
      try {
        metadata = JSON.parse(
          decodeURIComponent(req.get("x-publication-meta") || "%7B%7D"),
        );
      } catch {
        throw new ImportError("Os dados da publicação estão inválidos.");
      }
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
        throw new ImportError("Dados da publicação inválidos.");
      const text = (value, max) => {
        const output = typeof value === "string" ? value.trim() : "";
        if (output.length > max)
          throw new ImportError("Os dados da publicação excedem o limite.");
        return output || null;
      };
      const fileName = decodeURIComponent(
        req.get("x-file-name") || "ranking.csv",
      )
        .replace(/[\x00-\x1f<>:"/\\|?*]/g, "_")
        .slice(-255);
      const connection = await pool.getConnection();
      let result;
      let reused = false;
      try {
        await connection.beginTransaction();
        await lockAccessControl(connection);
        if (
          !canManageRankings(
            await lockActiveUser(connection, req.authenticatedUser.id),
          )
        ) {
          await connection.rollback();
          return res.status(403).json({
            error: "Seu acesso à publicação foi alterado. Entre novamente.",
          });
        }
        const editorial = [
          text(metadata.title, 160) || "Ranking de cenários",
          text(metadata.authorName, 120),
          text(metadata.professionalCategory, 120),
          text(metadata.professionalRegistration, 120),
        ];
        const fingerprint = await researchFingerprint(
          connection,
          editorial,
          entries,
        );
        const [existing] = await connection.execute(
          "SELECT CAST(publication_id AS CHAR) AS id FROM research_publication_keys WHERE fingerprint=?",
          [fingerprint],
        );
        if (existing.length) {
          result = { insertId: existing[0].id };
          reused = true;
          await createResearchEvent(connection, existing[0].id);
        } else {
          const [previous] = await connection.execute(
            "SELECT entries_json FROM ranking_publications ORDER BY id DESC LIMIT 1",
          );
          await connection.execute(
            "INSERT INTO ranking_publications (title, author_name, professional_category, professional_registration, source_file_name, entries_json, imported_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              ...editorial,
              fileName,
              JSON.stringify(entries),
              req.authenticatedUser.id,
            ],
          );
          const [inserted] = await connection.execute(
            "SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id",
          );
          result = { insertId: inserted[0].id };
          const changes = compareResearch(
            readEntries(previous[0]?.entries_json),
            entries,
          );
          const tickers = [
            ...new Set(
              [...changes.added, ...changes.removed, ...changes.changed].map(
                (entry) => entry.ticker,
              ),
            ),
          ];
          await connection.execute(
            "INSERT INTO ranking_changes(publication_id,changed_tickers) VALUES(?,?)",
            [String(result.insertId), JSON.stringify(tickers)],
          );
          await connection.execute(
            "INSERT INTO research_publication_keys(fingerprint,publication_id) VALUES(?,?)",
            [fingerprint, result.insertId],
          );
          await createResearchEvent(connection, result.insertId);
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return res.status(reused ? 200 : 201).json({
        message: reused
          ? "Publicação já existente. Histórico preservado."
          : "Publicação salva. O histórico anterior foi preservado.",
        publicationId: String(result.insertId),
        reused,
      });
    } catch (error) {
      if (error instanceof ImportError || error instanceof URIError)
        return res.status(400).json({ error: error.message });
      return next(error);
    }
  },
);
export { router as rankingRouter };
