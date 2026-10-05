import { pool } from "./database.js";
export async function readCache(key) {
  const [rows] = await pool.execute(
    "SELECT payload, expires_at FROM provider_cache WHERE cache_key=?",
    [key],
  );
  if (!rows[0]) return null;
  return {
    data:
      typeof rows[0].payload === "string"
        ? JSON.parse(rows[0].payload)
        : rows[0].payload,
    fresh:
      new Date(rows[0].expires_at.replace(" ", "T") + "Z").getTime() >
      Date.now(),
  };
}
export async function saveCache(key, data, ttlMs) {
  await pool.execute(
    "INSERT INTO provider_cache(cache_key,payload,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? MICROSECOND)) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)",
    [key, JSON.stringify(data), ttlMs * 1000],
  );
}
