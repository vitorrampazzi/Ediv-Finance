import { pool } from "./database.js";
import { createAuthCleanup } from "./auth-cleanup-policy.js";

const cleanup = createAuthCleanup({
  execute: (sql) => pool.execute(sql),
  onError: (code) =>
    console.warn("Expired authentication cleanup failed:", code),
});

export async function cleanupExpiredAuth(_req, _res, next) {
  await cleanup();
  return next();
}
