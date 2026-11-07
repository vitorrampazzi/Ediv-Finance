import { randomUUID } from "node:crypto";
import { isTradingDay, previousTradingDay } from "./b3-calendar.js";
import { priceText } from "./brapi-provider.js";
import { saoPauloClock } from "./market-session.js";
import { isValidTicker } from "./validation.js";

// Daily closes consolidated by the Escola (docs/MARGEM-E-HISTORICO.md). After a
// general-list read, the closes of session D are written once, when the list
// was read from 19:00 of D (São Paulo) and before the next opening. Earlier
// reads may still carry a price from before the closing auction: brapi's v2
// showed 18:31:30 for PETR4 on 06/11, and the list is cached 15 min. The read
// that makes D due waits for the writes, at most waitMs: a serverless function
// may be frozen as soon as the response is sent, so nothing is left for later.
// A timeout or an error is logged and never fails that request; the claim then
// expires and a later read tries again. Reads with nothing due never wait. The
// SQL lives in server/market-closes.js; this module only decides.

const openMinute = 10 * 60;
const closingMinute = 19 * 60;
// A writer that stops keeps the day for 1 min; this instance checks another
// instance's claim again after 1 min and retries its own skipped or failed
// day after 5 min; a written day stays done for a week.
export const claimMs = 60_000;
export const busyRetryMs = 60_000;
export const retryMs = 5 * 60_000;
export const doneMs = 7 * 86_400_000;
export const waitMs = 2_500;
export const closesSource = "brapi_list";

/** Session D whose final closes a general list read at `ms` holds, or null. */
export function closingSessionFor(ms) {
  const { date, minute } = saoPauloClock(ms);
  if (!isTradingDay(date)) return previousTradingDay(date);
  if (minute >= closingMinute) return date;
  if (minute < openMinute) return previousTradingDay(date);
  // From the opening to 19:00 the session is open or its close is not final.
  return null;
}

/** Covered tickers with a listed price, sorted. A missing price is skipped. */
export function closingRows(items, tickers) {
  const wanted = new Set(tickers.filter(isValidTicker));
  const rows = [];
  for (const item of items ?? []) {
    if (!wanted.has(item?.symbol)) continue;
    const close = priceText(item.price);
    if (close === null) continue;
    rows.push({
      ticker: item.symbol,
      close,
      volume:
        typeof item.volume === "string" && /^\d{1,19}$/.test(item.volume)
          ? item.volume
          : null,
    });
    wanted.delete(item.symbol);
  }
  return rows.sort((left, right) => (left.ticker < right.ticker ? -1 : 1));
}

/**
 * The list did not move since the previous consolidated session: the same
 * close and volume for at least 80% of the tickers present in both.
 */
export function looksUnchanged(rows, previousRows) {
  let compared = 0;
  let same = 0;
  for (const row of rows) {
    const before = previousRows.get(row.ticker);
    if (!before) continue;
    compared++;
    if (
      priceText(before.close) === row.close &&
      String(before.volume ?? "") === String(row.volume ?? "")
    )
      same++;
  }
  return compared > 0 && same * 5 >= compared * 4;
}

function errorCode(error) {
  return String(error?.code || error?.name || "Error").slice(0, 40);
}

/**
 * `store`: claim(key, owner, ttlMs) -> "claimed" | "busy" | "done",
 * release(key, owner, retryMs), finish(key, owner, details, ttlMs),
 * previousCloses(day) -> { day, rows: Map } | null and
 * insert(day, rows, capturedAt) -> inserted rows (INSERT IGNORE).
 * `tickers()` lists the snapshot and the latest publication.
 */
export function createDailyCloses({
  store,
  tickers,
  log = (entry) => console.info(JSON.stringify(entry)),
  newOwner = randomUUID,
  now = Date.now,
  wait = waitMs,
}) {
  const finished = new Set();
  // The same list found unchanged stays unchanged: no need to read it again.
  const unchanged = new Map();
  // Busy, failed or timed out: this instance waits before trying that day again.
  const retryAt = new Map();
  let running = null;

  function backOff(day, ms) {
    retryAt.set(day, now() + ms);
    while (retryAt.size > 10) retryAt.delete(retryAt.keys().next().value);
  }

  async function consolidate(entry, day) {
    const key = `closes:${day}`;
    const owner = newOwner();
    const claim = await store.claim(key, owner, claimMs);
    if (claim !== "claimed") {
      if (claim === "done") finished.add(day);
      else backOff(day, busyRetryMs);
      return { day, status: claim };
    }
    try {
      const rows = closingRows(entry.value.items, await tickers());
      if (!rows.length) {
        await store.release(key, owner, retryMs);
        backOff(day, retryMs);
        return { day, status: "empty" };
      }
      const previous = await store.previousCloses(day);
      if (previous && looksUnchanged(rows, previous.rows)) {
        await store.release(key, owner, retryMs);
        unchanged.set(day, entry.checkedAt);
        while (unchanged.size > 10)
          unchanged.delete(unchanged.keys().next().value);
        log({
          event: "market_closes_skipped",
          day,
          reason: "unchanged",
          previousDay: previous.day,
        });
        return { day, status: "unchanged" };
      }
      const inserted = await store.insert(day, rows, entry.checkedAt);
      await store.finish(
        key,
        owner,
        { inserted, candidates: rows.length, checkedAt: entry.checkedAt },
        doneMs,
      );
      finished.add(day);
      log({
        event: "market_closes",
        day,
        inserted,
        candidates: rows.length,
      });
      return { day, status: "written", inserted };
    } catch (error) {
      await store.release(key, owner, retryMs).catch(() => {});
      throw error;
    }
  }

  // Synchronous guards keep the common case (nothing due) free of SQL and of
  // waiting: it returns null. When a day is due it returns a promise that the
  // read awaits; it settles within `wait` ms and never rejects.
  function afterCatalog(entry) {
    const checkedMs = Date.parse(entry?.checkedAt);
    if (!Number.isFinite(checkedMs) || !Array.isArray(entry?.value?.items))
      return null;
    const day = closingSessionFor(checkedMs);
    if (
      day === null ||
      running ||
      finished.has(day) ||
      unchanged.get(day) === entry.checkedAt ||
      (retryAt.get(day) ?? -Infinity) > now()
    )
      return null;
    const work = consolidate(entry, day).catch((error) => {
      backOff(day, retryMs);
      log({ event: "market_closes_error", day, code: errorCode(error) });
      return { day, status: "error" };
    });
    running = work.finally(() => {
      running = null;
    });
    // The writes that miss the deadline are not awaited: the claim expires
    // after claimMs and a later read retries the day.
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        backOff(day, retryMs);
        log({ event: "market_closes_error", day, code: "TIMEOUT" });
        resolve({ day, status: "timeout" });
      }, wait);
    });
    return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
  }

  return { afterCatalog };
}
