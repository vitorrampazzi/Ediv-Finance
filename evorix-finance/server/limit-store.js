import { createHash } from "node:crypto";
import { pool } from "./database.js";

// A shared MySQL counter keeps limits consistent across Vercel instances.
export class MysqlLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
  }
  init(options) {
    this.windowMs = options.windowMs;
  }
  bucket(key) {
    return createHash("sha256").update(`${this.prefix}:${key}`).digest("hex");
  }
  async increment(key) {
    if (!this.lastCleanup || Date.now() - this.lastCleanup > 3_600_000) {
      this.lastCleanup = Date.now();
      await pool.execute(
        "DELETE FROM request_limits WHERE expires_at < UTC_TIMESTAMP(3) LIMIT 1000",
      );
    }
    const bucket = this.bucket(key);
    await pool.execute(
      `INSERT INTO request_limits (bucket, hits, expires_at) VALUES (?, 1, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MICROSECOND))
       ON DUPLICATE KEY UPDATE hits = IF(expires_at <= UTC_TIMESTAMP(3), 1, hits + 1),
       expires_at = IF(expires_at <= UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MICROSECOND), expires_at)`,
      [bucket, this.windowMs * 1000, this.windowMs * 1000],
    );
    const [rows] = await pool.execute(
      "SELECT hits, expires_at FROM request_limits WHERE bucket = ?",
      [bucket],
    );
    return {
      totalHits: rows[0].hits,
      resetTime: new Date(rows[0].expires_at.replace(" ", "T") + "Z"),
    };
  }
  async decrement(key) {
    await pool.execute(
      "UPDATE request_limits SET hits = GREATEST(0, hits - 1) WHERE bucket = ?",
      [this.bucket(key)],
    );
  }
  async resetKey(key) {
    await pool.execute("DELETE FROM request_limits WHERE bucket = ?", [
      this.bucket(key),
    ]);
  }
}
