const DAY_MS = 24 * 60 * 60 * 1000;

export const sessionPolicy = Object.freeze({
  idleDays: 30,
  maximumDays: 90,
  renewalHours: 24,
});

function utcMilliseconds(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const date = value.replace(" ", "T");
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(date) ? date : date + "Z");
}

export function sessionExpiresAt(now = Date.now(), createdAt = now) {
  return new Date(
    Math.min(
      now + sessionPolicy.idleDays * DAY_MS,
      utcMilliseconds(createdAt) + sessionPolicy.maximumDays * DAY_MS,
    ),
  );
}

export function sessionCookieExpiresAt(createdAt = Date.now()) {
  return new Date(
    utcMilliseconds(createdAt) + sessionPolicy.maximumDays * DAY_MS,
  );
}

// Renew at most once a day and never revive an expired/revoked session.
export function sessionRenewalExpiry(session, now = Date.now()) {
  const previous = utcMilliseconds(session.session_expires_at);
  const created = utcMilliseconds(session.session_created_at);
  if (
    !Number.isFinite(previous) ||
    !Number.isFinite(created) ||
    previous <= now
  )
    return null;
  const next = sessionExpiresAt(now, created);
  const threshold =
    sessionPolicy.idleDays * DAY_MS -
    sessionPolicy.renewalHours * 60 * 60 * 1000;
  if (next.getTime() <= previous || previous - now > threshold) return null;
  return next;
}
