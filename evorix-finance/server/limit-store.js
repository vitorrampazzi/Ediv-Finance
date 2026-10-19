import { createHash } from "node:crypto";
import { pool } from "./database.js";

let lastCleanup = 0;
const MAXIMUM_CACHED_BLOCKS = 1000;
const instances = new Set();

// A shared MySQL counter keeps limits consistent across Vercel instances.
export class MysqlLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
    this.blocked = new Map();
    instances.add(this);
  }
  init(options) {
    this.windowMs = options.windowMs;
    this.maximum = typeof options.limit === "number" ? options.limit : null;
  }
  bucket(key) {
    return createHash("sha256").update(`${this.prefix}:${key}`).digest("hex");
  }
  async increment(key) {
    const bucket = this.bucket(key);
    const now = Date.now();
    const cached = this.blocked.get(bucket);
    if (cached && cached.resetTime.getTime() > now) return cached;
    this.blocked.delete(bucket);
    try {
      if (!lastCleanup || now - lastCleanup > 3_600_000) {
        lastCleanup = now;
        await pool.execute(
          "DELETE FROM request_limits WHERE expires_at < UTC_TIMESTAMP(3) LIMIT 1000",
        );
      }
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
      const result = {
        totalHits: Number(rows[0].hits),
        resetTime: new Date(rows[0].expires_at.replace(" ", "T") + "Z"),
      };
      if (
        !Number.isSafeInteger(result.totalHits) ||
        result.totalHits < 1 ||
        !Number.isFinite(result.resetTime.getTime())
      ) {
        throw new Error("Invalid rate limit counter");
      }
      if (this.maximum !== null && result.totalHits > this.maximum) {
        if (this.blocked.size >= MAXIMUM_CACHED_BLOCKS) {
          this.blocked.delete(this.blocked.keys().next().value);
        }
        this.blocked.set(bucket, result);
      }
      return result;
    } catch (cause) {
      throw Object.assign(new Error("Rate limit storage unavailable"), {
        code: "RATE_LIMIT_STORE_UNAVAILABLE",
        cause,
      });
    }
  }
  async decrement(key) {
    this.blocked.delete(this.bucket(key));
    await pool.execute(
      "UPDATE request_limits SET hits = GREATEST(0, hits - 1) WHERE bucket = ?",
      [this.bucket(key)],
    );
  }
  async resetKey(key) {
    this.blocked.delete(this.bucket(key));
    await pool.execute("DELETE FROM request_limits WHERE bucket = ?", [
      this.bucket(key),
    ]);
  }
  static clearLocalCaches() {
    // No HTTP path exposes this: isolated test fixtures call it after resetting
    // their disposable SQL counters. Production requests never invoke it.
    for (const store of instances) store.blocked.clear();
  }
}
