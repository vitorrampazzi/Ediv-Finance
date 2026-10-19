const statements = [
  "DELETE FROM user_sessions WHERE expires_at <= UTC_TIMESTAMP(3) ORDER BY expires_at LIMIT 100",
  "DELETE FROM email_verification_tokens WHERE expires_at <= UTC_TIMESTAMP(3) ORDER BY expires_at LIMIT 100",
];

// Both expiry columns already have indexes. Awaited request work also runs in
// serverless functions; it does not rely on timers surviving after a response.
export function createAuthCleanup({
  execute,
  now = Date.now,
  onError = () => {},
}) {
  const interval = 60 * 60 * 1000;
  let lastAttempt = null;
  let inFlight = null;
  return async () => {
    if (inFlight) return inFlight;
    const time = now();
    if (lastAttempt !== null && time - lastAttempt < interval) return false;
    lastAttempt = time;
    inFlight = (async () => {
      try {
        for (const sql of statements) await execute(sql);
        return true;
      } catch (error) {
        onError(error?.code || "AUTH_CLEANUP_FAILED");
        return false;
      }
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}
