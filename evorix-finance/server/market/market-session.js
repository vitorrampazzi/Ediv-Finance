// B3 session in São Paulo time, as defined in docs/COTACOES.md. Pure functions:
// every caller passes the instant, so tests never depend on the real clock.
// B3 holidays are not in the calendar: on a holiday the session reads as open
// and the site keeps the 15-minute cadence with the real quote time.

const zone = "America/Sao_Paulo";
const openMinute = 10 * 60;
const closeMinute = 18 * 60;
// Delayed feeds publish the closing call up to ~30 min after 18:00. Keep the
// short TTL a little longer so the night is not cached with a pre-close price.
const settleMinutes = 45;
const minuteMs = 60_000;
const minimumTtlMs = minuteMs;
const maximumClosedTtlMs = 12 * 60 * minuteMs;

export const refreshSeconds = Object.freeze({ open: 900, closed: 1800 });
export const openTtlMs = Object.freeze({
  catalog: 15 * minuteMs,
  quote: 15 * minuteMs,
  history: 60 * minuteMs,
});

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function zonedParts(ms) {
  const parts = {};
  for (const part of formatter.formatToParts(new Date(ms)))
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  return parts;
}

// Wall-clock time in São Paulo to an instant. Two passes absorb any offset
// change, although Brazil has had no daylight saving time since 2019.
function zonedTime(year, month, day, hour, minute) {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let pass = 0; pass < 2; pass++) {
    const p = zonedParts(guess);
    const shown = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    guess += target - shown;
  }
  return guess;
}

function calendarDay(year, month, day, offset) {
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function saoPauloDate(ms) {
  const p = zonedParts(ms);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function marketSession(ms) {
  const p = zonedParts(ms);
  const today = calendarDay(p.year, p.month, p.day, 0);
  const minute = p.hour * 60 + p.minute;
  const weekday = today.weekday >= 1 && today.weekday <= 5;
  const open = weekday && minute >= openMinute && minute < closeMinute;
  let nextOpenAt = null;
  for (let offset = 0; offset <= 7 && nextOpenAt === null; offset++) {
    const day = calendarDay(p.year, p.month, p.day, offset);
    if (day.weekday < 1 || day.weekday > 5) continue;
    const at = zonedTime(day.year, day.month, day.day, 10, 0);
    if (at > ms) nextOpenAt = at;
  }
  const closesAt = open ? zonedTime(p.year, p.month, p.day, 18, 0) : null;
  const seconds = open ? refreshSeconds.open : refreshSeconds.closed;
  // A closed market wakes the interface at the opening bell, not 30 min later.
  const nextRefreshAt = open
    ? ms + seconds * 1000
    : Math.min(ms + seconds * 1000, nextOpenAt);
  return {
    state: open ? "open" : "closed",
    refreshSeconds: seconds,
    nextRefreshAt: new Date(nextRefreshAt).toISOString(),
    nextOpenAt: new Date(nextOpenAt).toISOString(),
    closesAt: closesAt === null ? null : new Date(closesAt).toISOString(),
    settling:
      weekday && minute >= closeMinute && minute < closeMinute + settleMinutes,
    date: saoPauloDate(ms),
  };
}

// The `market` object of the public contract.
export function publicMarket(ms) {
  const session = marketSession(ms);
  return {
    state: session.state,
    refreshSeconds: session.refreshSeconds,
    nextRefreshAt: session.nextRefreshAt,
  };
}

// Open: fixed TTL per kind. Closed: until the next opening, at most 12 h.
export function cacheTtlMs(kind, ms) {
  if (!Object.hasOwn(openTtlMs, kind)) throw new Error("Unknown cache kind");
  const session = marketSession(ms);
  if (session.state === "open" || session.settling) return openTtlMs[kind];
  const untilOpen = Date.parse(session.nextOpenAt) - ms;
  return Math.max(minimumTtlMs, Math.min(maximumClosedTtlMs, untilOpen));
}
