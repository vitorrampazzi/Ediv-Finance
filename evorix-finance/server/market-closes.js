import { pool } from "./database.js";
import { closesSource } from "./market/daily-closes.js";
import { isValidTicker } from "./market/validation.js";

// SQL of the closes consolidated by the Escola (market_daily_closes, migration
// 009) and of their daily claim `closes:AAAA-MM-DD` in provider_cache. The
// decisions live in server/market/daily-closes.js.

function json(value) {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// "2026-11-05T22:10:00.000Z" -> "2026-11-05 22:10:00.000" (UTC DATETIME(3)).
function datetime(iso) {
  const ms = Date.parse(iso);
  return new Date(Number.isFinite(ms) ? ms : Date.now())
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

const ownedBy = "JSON_UNQUOTE(JSON_EXTRACT(payload,'$.owner'))=?";

// Taken atomically: a new row, or an expired one taken over by a conditional
// UPDATE (InnoDB re-checks the expiry under the row lock). With mysql2's
// FOUND_ROWS flag affectedRows counts matched rows, and the WHERE carries the
// condition, so 1 still means "this call took it".
export async function claimDailyCloses(key, owner, ttlMs) {
  const payload = JSON.stringify({ state: "running", owner });
  const [inserted] = await pool.execute(
    "INSERT IGNORE INTO provider_cache(cache_key,payload,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND))",
    [key, payload, ttlMs * 1000],
  );
  if (inserted.affectedRows === 1) return "claimed";
  const [taken] = await pool.execute(
    "UPDATE provider_cache SET payload=?,expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND) WHERE cache_key=? AND expires_at<=UTC_TIMESTAMP(3)",
    [payload, ttlMs * 1000, key],
  );
  if (taken.affectedRows === 1) return "claimed";
  const [rows] = await pool.execute(
    "SELECT payload FROM provider_cache WHERE cache_key=?",
    [key],
  );
  return json(rows[0]?.payload)?.state === "done" ? "done" : "busy";
}

// Gives the day back (skipped or failed); another list may try after retryMs.
export async function releaseDailyCloses(key, owner, retryMs) {
  await pool.execute(
    `UPDATE provider_cache SET payload=JSON_SET(payload,'$.state','retry'),expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND) WHERE cache_key=? AND ${ownedBy}`,
    [retryMs * 1000, key, owner],
  );
}

export async function finishDailyCloses(key, owner, details, ttlMs) {
  await pool.execute(
    `UPDATE provider_cache SET payload=?,expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND) WHERE cache_key=? AND ${ownedBy}`,
    [
      JSON.stringify({ ...details, state: "done", owner }),
      ttlMs * 1000,
      key,
      owner,
    ],
  );
}

// The last consolidated session before `day`, with its rows by ticker.
export async function previousDailyCloses(day) {
  const [[latest]] = await pool.execute(
    "SELECT MAX(trade_date) AS day FROM market_daily_closes WHERE trade_date<?",
    [day],
  );
  if (!latest?.day) return null;
  const [rows] = await pool.execute(
    "SELECT ticker,close,volume FROM market_daily_closes WHERE trade_date=?",
    [latest.day],
  );
  return {
    day: latest.day,
    rows: new Map(
      rows.map((row) => [
        row.ticker,
        { close: String(row.close), volume: row.volume },
      ]),
    ),
  };
}

// A close already written is never overwritten.
export async function insertDailyCloses(day, rows, capturedAt) {
  if (!rows.length) return 0;
  const [result] = await pool.execute(
    `INSERT IGNORE INTO market_daily_closes(ticker,trade_date,close,volume,source,captured_at) VALUES ${rows
      .map(() => "(?,?,?,?,?,?)")
      .join(",")}`,
    rows.flatMap((row) => [
      row.ticker,
      day,
      row.close,
      row.volume,
      closesSource,
      datetime(capturedAt),
    ]),
  );
  return result.affectedRows;
}

export async function readDailyCloses(ticker) {
  const [rows] = await pool.execute(
    "SELECT trade_date,close FROM market_daily_closes WHERE ticker=? ORDER BY trade_date",
    [ticker],
  );
  return rows.map((row) => ({
    date: String(row.trade_date).slice(0, 10),
    close: String(row.close),
  }));
}

// Only the tickers of the latest publication, not its whole JSON.
export async function latestPublicationTickers() {
  const [rows] = await pool.execute(
    "SELECT JSON_EXTRACT(entries_json,'$[*].ticker') AS tickers FROM ranking_publications ORDER BY id DESC LIMIT 1",
  );
  const tickers = json(rows[0]?.tickers);
  return Array.isArray(tickers)
    ? tickers.filter((ticker) => isValidTicker(ticker))
    : [];
}

export const dailyClosesStore = Object.freeze({
  claim: claimDailyCloses,
  release: releaseDailyCloses,
  finish: finishDailyCloses,
  previousCloses: previousDailyCloses,
  insert: insertDailyCloses,
});
