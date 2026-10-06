import { pool } from "./database.js";

// Only availability is public; entries and forecasts still require an account.
export async function researchStatus() {
  const [rows] = await pool.execute(
    "SELECT JSON_LENGTH(entries_json) AS entries FROM ranking_publications ORDER BY id DESC LIMIT 1",
  );
  if (rows.length) return { published: Number(rows[0].entries) > 0 };
  const [legacy] = await pool.execute(
    "SELECT EXISTS(SELECT 1 FROM income_ranking_entries) AS published",
  );
  return { published: Boolean(Number(legacy[0].published)) };
}
