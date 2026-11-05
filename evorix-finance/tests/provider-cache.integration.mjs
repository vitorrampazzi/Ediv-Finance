import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";

// Runs the provider_cache SQL (docs/COTACOES.md) against real MySQL: the daily
// brapi counter, its budget under concurrency, and the cache freshness. Only
// the disposable loopback MySQL of the CI; never production or .env.aiven.
if (process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true")
  throw new Error(
    "Provider cache integration requires the disposable local MySQL.",
  );
// The CI runs in UTC; a São Paulo clock catches expiry dates read as local time.
process.env.TZ = "America/Sao_Paulo";
const fixture = await createFixture();
const { pool, schema } = fixture;
const { readCache, saveCache, reserveProviderCall } =
  await import("../server/provider-cache.js");
const { createQuoteService } =
  await import("../server/market/quote-service.js");

assert.match(schema, /^ediv_test_[a-f0-9]{12}$/);
const [[active]] = await pool.execute("SELECT DATABASE() AS name");
assert.equal(
  active.name,
  schema,
  "provider_cache must live in the fixture schema",
);

async function usage(key) {
  const [rows] = await pool.execute(
    "SELECT payload, TIMESTAMPDIFF(HOUR, UTC_TIMESTAMP(3), expires_at) AS hours FROM provider_cache WHERE cache_key=?",
    [key],
  );
  if (!rows[0]) return null;
  const payload =
    typeof rows[0].payload === "string"
      ? JSON.parse(rows[0].payload)
      : rows[0].payload;
  return { ...payload, hours: Number(rows[0].hours) };
}
const counter = (name) => `brapi:usage:test-${name}`;

try {
  await test("provider_cache: brapi counter and cache on the disposable MySQL", async (t) => {
    await t.test(
      "first reservation creates the daily row for 40 days",
      async () => {
        const key = counter("create");
        assert.equal(await usage(key), null);
        assert.equal(await reserveProviderCall(key, "perTicker", 3), true);
        const row = await usage(key);
        assert.equal(row.perTicker, 1);
        assert.equal(row.catalog, 0);
        assert.ok(
          row.hours >= 39 * 24 && row.hours <= 40 * 24,
          `expires in ${row.hours} h`,
        );
        // The row is created once: later calls only update it.
        assert.equal(await reserveProviderCall(key, "catalog", 3), true);
        const [[{ n }]] = await pool.execute(
          "SELECT COUNT(*) AS n FROM provider_cache WHERE cache_key=?",
          [key],
        );
        assert.equal(Number(n), 1);
        assert.deepEqual(
          {
            perTicker: (await usage(key)).perTicker,
            catalog: (await usage(key)).catalog,
          },
          { perTicker: 1, catalog: 1 },
        );
      },
    );

    await t.test("per-ticker calls stop exactly at the budget", async () => {
      const key = counter("budget");
      const results = [];
      for (let call = 0; call < 7; call++)
        results.push(await reserveProviderCall(key, "perTicker", 5));
      assert.deepEqual(results, [true, true, true, true, true, false, false]);
      // Refused calls never move the counter past the budget.
      assert.equal((await usage(key)).perTicker, 5);
      assert.equal(await reserveProviderCall(key, "perTicker", 5), false);
      assert.equal((await usage(key)).perTicker, 5);
      // A larger budget (new env value) lets the same day continue.
      assert.equal(await reserveProviderCall(key, "perTicker", 6), true);
      assert.equal((await usage(key)).perTicker, 6);
    });

    await t.test(
      "budget 0 refuses per-ticker calls but still creates the row",
      async () => {
        const key = counter("zero");
        assert.equal(await reserveProviderCall(key, "perTicker", 0), false);
        const row = await usage(key);
        assert.equal(row.perTicker, 0);
        assert.equal(row.catalog, 0);
      },
    );

    await t.test(
      "general list increments are never blocked by the budget",
      async () => {
        const key = counter("catalog");
        assert.equal(await reserveProviderCall(key, "perTicker", 2), true);
        assert.equal(await reserveProviderCall(key, "perTicker", 2), true);
        assert.equal(await reserveProviderCall(key, "perTicker", 2), false);
        for (let call = 0; call < 8; call++)
          assert.equal(await reserveProviderCall(key, "catalog", 2), true);
        const row = await usage(key);
        assert.equal(row.perTicker, 2);
        assert.equal(row.catalog, 8);
        // Also with a zero budget on a new day.
        assert.equal(
          await reserveProviderCall(counter("catalog-zero"), "catalog", 0),
          true,
        );
        assert.equal((await usage(counter("catalog-zero"))).catalog, 1);
        await assert.rejects(
          reserveProviderCall(key, "unknown", 2),
          /Unknown provider usage counter/,
        );
      },
    );

    await t.test(
      "20 parallel reservations with budget 5 on an existing row: exactly 5 pass",
      async () => {
        const key = counter("parallel");
        assert.equal(await reserveProviderCall(key, "catalog", 5), true);
        const results = await Promise.all(
          Array.from({ length: 20 }, () =>
            reserveProviderCall(key, "perTicker", 5),
          ),
        );
        assert.equal(
          results.filter(Boolean).length,
          5,
          JSON.stringify(results),
        );
        assert.equal((await usage(key)).perTicker, 5);
      },
    );

    await t.test(
      "parallel first calls of the day: row race, per-ticker and list together",
      async () => {
        const key = counter("parallel-new");
        const perTicker = Array.from({ length: 20 }, () =>
          reserveProviderCall(key, "perTicker", 5),
        );
        const catalog = Array.from({ length: 6 }, () =>
          reserveProviderCall(key, "catalog", 5),
        );
        const settled = await Promise.allSettled([...perTicker, ...catalog]);
        const errors = settled.filter((result) => result.status === "rejected");
        assert.deepEqual(
          errors.map((result) => String(result.reason?.code || result.reason)),
          [],
          "no reservation may fail with a SQL error (deadlock, syntax)",
        );
        const values = settled.map((result) => result.value);
        assert.equal(values.slice(0, 20).filter(Boolean).length, 5);
        assert.ok(values.slice(20).every(Boolean));
        const row = await usage(key);
        assert.equal(row.perTicker, 5);
        assert.equal(row.catalog, 6);
      },
    );

    await t.test("readCache reports data, expiresAt and fresh", async () => {
      assert.equal(await readCache("market:test:missing"), null);
      const before = Date.now();
      await saveCache(
        "market:test:fresh",
        { value: [1, "2.50"], checkedAt: "x" },
        60_000,
      );
      const fresh = await readCache("market:test:fresh");
      assert.deepEqual(fresh.data, { value: [1, "2.50"], checkedAt: "x" });
      assert.equal(fresh.fresh, true);
      assert.equal(typeof fresh.expiresAt, "number");
      // DB and Node share the CI host clock; allow a few seconds of drift.
      assert.ok(
        Math.abs(fresh.expiresAt - (before + 60_000)) < 5_000,
        `expiresAt ${new Date(fresh.expiresAt).toISOString()}`,
      );

      // The closed-market TTL (up to 12 h) must survive the microsecond interval.
      const twelveHours = 12 * 60 * 60_000;
      await saveCache("market:test:night", { value: [] }, twelveHours);
      const night = await readCache("market:test:night");
      assert.equal(night.fresh, true);
      assert.ok(Math.abs(night.expiresAt - (Date.now() + twelveHours)) < 5_000);

      // Overwrite keeps one row with the new payload and expiry.
      await saveCache("market:test:fresh", { value: [3] }, 120_000);
      const replaced = await readCache("market:test:fresh");
      assert.deepEqual(replaced.data, { value: [3] });
      assert.ok(replaced.expiresAt > fresh.expiresAt);

      // Expired rows are still returned (last valid value), marked not fresh.
      await pool.execute(
        "UPDATE provider_cache SET expires_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 MINUTE) WHERE cache_key=?",
        ["market:test:fresh"],
      );
      const expired = await readCache("market:test:fresh");
      assert.equal(expired.fresh, false);
      assert.deepEqual(expired.data, { value: [3] });
      assert.ok(
        Math.abs(expired.expiresAt - (Date.now() - 60_000)) < 5_000,
        `expired at ${new Date(expired.expiresAt).toISOString()}`,
      );
    });

    await t.test(
      "two service instances share cache and budget through MySQL",
      async () => {
        const calls = [];
        const provider = {
          name: "fixture",
          async catalog() {
            calls.push("catalog");
            return {
              items: [
                {
                  symbol: "PETR4",
                  name: "Empresa de teste",
                  logoUrl: null,
                  price: "10.00000000",
                  changePercent: "1.0000",
                  volume: "100",
                },
              ],
              availableSectors: [],
            };
          },
          async quote(symbol) {
            calls.push("quote:" + symbol);
            return {
              symbol,
              name: symbol,
              logoUrl: null,
              currency: "BRL",
              price: "11.00000000",
              change: null,
              changePercent: null,
              previousClose: null,
              dayHigh: null,
              dayLow: null,
              volume: null,
              quoteTime: null,
            };
          },
          async history() {
            throw new Error("not used");
          },
        };
        const store = {
          read: readCache,
          write: saveCache,
          reserveCall: reserveProviderCall,
        };
        const errors = [];
        const instance = () =>
          createQuoteService({
            provider,
            store,
            hasToken: true,
            dailyBudget: 2,
            isCovered: () => true,
            log: (entry) => errors.push(entry),
          });
        const first = instance();
        const second = instance();

        const a = await first.quote("PETR4");
        assert.equal(a.quote.detail, "full");
        assert.equal(a.quote.price, "11.00000000");
        // The other instance reads both rows from MySQL instead of calling brapi.
        const b = await second.quote("PETR4");
        assert.equal(b.quote.detail, "full");
        assert.equal(b.quote.checkedAt, a.quote.checkedAt);
        assert.deepEqual(calls, ["catalog", "quote:PETR4"]);

        assert.equal((await second.quote("VALE3")).quote.detail, "full");
        // Budget 2 is shared: the third detailed quote falls back to the list.
        const c = await first.quote("ITUB4");
        assert.equal(c.quote.detail, "summary");
        assert.equal(c.quote.unavailable, true);
        assert.deepEqual(calls, ["catalog", "quote:PETR4", "quote:VALE3"]);
        assert.deepEqual(errors, []);

        const [rows] = await pool.execute(
          "SELECT cache_key FROM provider_cache WHERE cache_key LIKE 'brapi:usage:2%'",
        );
        assert.equal(rows.length, 1);
        const row = await usage(rows[0].cache_key);
        assert.equal(row.perTicker, 2);
        assert.equal(row.catalog, 1);
      },
    );
  });
} finally {
  await fixture.cleanup();
}
