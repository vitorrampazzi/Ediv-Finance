import { pool } from "./database.js";
export async function readCache(key) {
  const [rows] = await pool.execute(
    "SELECT payload, expires_at FROM provider_cache WHERE cache_key=?",
    [key],
  );
  if (!rows[0]) return null;
  const expiresAt = new Date(
    rows[0].expires_at.replace(" ", "T") + "Z",
  ).getTime();
  return {
    data:
      typeof rows[0].payload === "string"
        ? JSON.parse(rows[0].payload)
        : rows[0].payload,
    fresh: expiresAt > Date.now(),
    expiresAt,
  };
}
export async function saveCache(key, data, ttlMs) {
  await pool.execute(
    "INSERT INTO provider_cache(cache_key,payload,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND)) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)",
    [key, JSON.stringify(data), ttlMs * 1000],
  );
}
// Daily provider usage in one row: {"perTicker": n, "catalog": n}. The
// per-ticker increment is conditional in a single UPDATE, so concurrent
// instances can never pass the budget; the general list is only counted.
const usageCounter = {
  perTicker: "$.perTicker",
  catalog: "$.catalog",
};
export async function reserveProviderCall(key, kind, budget) {
  const path = usageCounter[kind];
  if (!path) throw new Error("Unknown provider usage counter");
  await pool.execute(
    "INSERT INTO provider_cache(cache_key,payload,expires_at) VALUES(?,JSON_OBJECT('perTicker',0,'catalog',0),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 40 DAY)) ON DUPLICATE KEY UPDATE cache_key=cache_key",
    [key],
  );
  const current = `COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(payload,'${path}')) AS UNSIGNED),0)`;
  const [result] = await pool.execute(
    kind === "perTicker"
      ? `UPDATE provider_cache SET payload=JSON_SET(payload,'${path}',${current}+1) WHERE cache_key=? AND ${current}<?`
      : `UPDATE provider_cache SET payload=JSON_SET(payload,'${path}',${current}+1) WHERE cache_key=?`,
    kind === "perTicker" ? [key, budget] : [key],
  );
  return result.affectedRows === 1;
}
