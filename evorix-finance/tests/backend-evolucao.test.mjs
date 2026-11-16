import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { emailGreeting } from "../server/mail-greeting.js";
import {
  exceedsAccountLimit,
  accountLimitMessages,
} from "../server/account-limits.js";

const source = (file) =>
  readFile(new URL(`../server/${file}`, import.meta.url), "utf8");

test("emailGreeting repeats only a plain name", () => {
  assert.equal(emailGreeting("Maria"), "Olá, Maria.");
  assert.equal(emailGreeting("  Ana   Paula "), "Olá, Ana Paula.");
  assert.equal(emailGreeting("D'Ávila"), "Olá, D'Ávila.");
  assert.equal(emailGreeting("Jean-Luc"), "Olá, Jean-Luc.");
});

test("emailGreeting falls back to a generic greeting for anything else", () => {
  for (const value of [
    "https://x.co",
    "Visite www.golpe.com",
    "<b>Ana</b>",
    "Ana 2",
    "A",
    "a".repeat(61),
    undefined,
    null,
    42,
    "",
  ]) {
    assert.equal(emailGreeting(value), "Olá.", `valor: ${String(value)}`);
  }
});

test("exceedsAccountLimit compares the stored count plus the new rows", () => {
  assert.equal(exceedsAccountLimit(9999, 1, 10000), false);
  assert.equal(exceedsAccountLimit(10000, 1, 10000), true);
  assert.equal(exceedsAccountLimit("5", 1, 10), false);
  assert.equal(exceedsAccountLimit(NaN, 1, 10), true);
  assert.equal(exceedsAccountLimit(0, 0, 0), false);
});

test("accountLimitMessages name the ceiling of each store", () => {
  assert.match(accountLimitMessages.portfolioTransactions, /10\.000/);
  assert.match(accountLimitMessages.portfolioEvents, /2\.000/);
  assert.match(accountLimitMessages.favorites, /300/);
});

test("support applies the per-account limiters to new threads and messages", async () => {
  const text = await source("support.js");
  assert.match(text, /router\.post\("\/", limiter, threadLimiter,/);
  assert.match(
    text,
    /router\.post\(\s*\["\/:id\/messages", "\/team\/:id\/messages"\],\s*limiter,\s*access,\s*messageLimiter,/,
  );
});

test("favorites checks the ceiling before the INSERT", async () => {
  const text = await source("favorites.js");
  const check = text.indexOf("exceedsAccountLimit(rows[0].total");
  const insert = text.indexOf("INSERT IGNORE INTO user_favorites");
  assert.ok(check > 0, "o teto de favoritos precisa ser conferido");
  assert.ok(insert > check, "o INSERT deve vir depois da conferência");
});

test("portfolio asserts room inside each write route", async () => {
  const text = await source("portfolio.js");
  const block = (start, end) => {
    const from = text.indexOf(start);
    const to = text.indexOf(end, from + start.length);
    assert.ok(from >= 0 && to > from, `bloco não encontrado: ${start}`);
    return text.slice(from, to);
  };
  assert.match(
    block('router.post("/transactions"', 'router.put("/transactions/:id"'),
    /assertRoom\(data\.transactions\.length, 1, "portfolioTransactions"\)/,
  );
  assert.match(
    block('router.post("/events"', 'router.delete("/events/:id"'),
    /assertRoom\(data\.events\.length, 1, "portfolioEvents"\)/,
  );
  assert.match(
    block('router.post(\n  ["/import/preview", "/import"]', 'router.get("/export"'),
    /assertRoom\(\s*data\.transactions\.length,\s*unique\.length,\s*"portfolioTransactions",?\s*\)/,
  );
});

test("rankings status uses the shared CDN cache header", async () => {
  const text = await source("rankings.js");
  const from = text.indexOf('router.get("/status"');
  const to = text.indexOf("const limiter", from);
  assert.ok(from >= 0 && to > from, "rota /status não encontrada");
  assert.match(
    text.slice(from, to),
    /sharedCache\(res, publicRankingCacheControl\)/,
  );
});
