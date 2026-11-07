import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createFixture } from "./fixture.mjs";
import { dividendColumns } from "../dividend-analysis.mjs";
import { csvDownload } from "../server/spreadsheet.js";

// Production runs without migration 009 until the owner applies it
// (docs/MARGEM-E-HISTORICO.md). This suite drops market_daily_closes from a
// disposable schema and proves the app degrades safely: the market, public and
// price-series routes still answer 200, the consolidation only logs
// market_closes_error and the backup skips the missing table. Only the
// disposable loopback MySQL; never production or .env.aiven.
if (process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true")
  throw new Error(
    "No-migration integration requires the disposable local MySQL.",
  );
// The CI runs in UTC; a São Paulo clock catches dates read as local time.
process.env.TZ = "America/Sao_Paulo";

// Thursday 05/11/2026 at 19:10 in São Paulo: a general-list read now makes
// the session's closes due (final from 19:00). The services capture Date.now
// when created, so it moves before the app is imported.
const realNow = Date.now;
const shift = Date.parse("2026-11-05T22:10:00.000Z") - realNow();
Date.now = () => realNow() + shift;

const logs = [];
const original = {
  info: console.info,
  warn: console.warn,
  error: console.error,
};
for (const level of ["info", "warn", "error"])
  console[level] = (...args) => {
    logs.push(args.map(String).join(" "));
    original[level](...args);
  };
const events = (name) =>
  logs
    .filter((line) => line.startsWith("{"))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry) => entry?.event === name);

const fixture = await createFixture();
const {
  request,
  accounts: { analyst, a },
  pool,
  schema,
} = fixture;
assert.match(schema, /^ediv_test_[a-f0-9]{12}$/);

// Production today: migrations 001..008 only.
await pool.query("DROP TABLE market_daily_closes");
await pool.execute(
  "DELETE FROM schema_migrations WHERE name='009_market_daily_closes.sql'",
);

const row = {
  companyName: "Petrobras de teste",
  ticker: "PETR4",
  sector: "Teste",
  totalShares: "1000",
  marketValue: "1000000",
  estimatedNetIncome: "100000",
  projectedPE: "4.5",
  averagePE10Years: "6.1",
  peDeviation: "-0.2",
  earningsCagr5Years: "0.05",
  netDebtToEbitda: "1.2",
  estimatedEps: "9.1",
  expectedPayout: "0.5",
  projectedGrossDividendPerShare: "4.2",
  estimatedGrossDividendYield: "0.09",
  referencePrice: "45.95",
  ceilingPrice: "60.00",
  safetyMargin: "0.2342",
  announcementFrequency: "4x por ano",
  announcementMonths: "mar jun set dez",
  updatedOn: "2026-10-20",
};
const statuses = [];
async function get(account, path) {
  const result = await request(account, path);
  statuses.push([path, result.status]);
  return result;
}

try {
  await test("sem a migração 009: o site responde e só registra o erro da consolidação", async (t) => {
    t.beforeEach(() => fixture.clearLimits());

    await t.test("the schema really lacks market_daily_closes", async () => {
      const [[table]] = await pool.execute(
        "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='market_daily_closes'",
      );
      assert.equal(Number(table.n), 0);
      const [[migration]] = await pool.execute(
        "SELECT COUNT(*) AS n FROM schema_migrations WHERE name='009_market_daily_closes.sql'",
      );
      assert.equal(Number(migration.n), 0);
      const published = await request(analyst, "/api/rankings", {
        method: "POST",
        raw: csvDownload([
          dividendColumns.map((column) => column.label),
          dividendColumns.map((column) => row[column.key]),
        ]),
        headers: {
          "Content-Type": "text/csv",
          "X-File-Name": "sem-009.csv",
          "X-Publication-Meta": encodeURIComponent(
            JSON.stringify({ title: "Publicação sem a migração 009" }),
          ),
        },
      });
      assert.equal(published.status, 201);
    });

    await t.test(
      "19:10: /api/rankings/public answers 200 and logs market_closes_error",
      async () => {
        const before = events("market_closes_error").length;
        const result = await get(null, "/api/rankings/public");
        assert.equal(result.status, 200);
        const [entry] = result.body.entries;
        assert.equal(entry.ticker, "PETR4");
        // The fixture's list prices PETR4 at R$ 10: (60 − 10) ÷ 60.
        assert.deepEqual(
          [
            entry.market.quote.price,
            entry.market.safetyMargin.percent,
            entry.market.safetyMargin.basis,
          ],
          ["10.00000000", "83.33", "market"],
        );
        assert.equal(JSON.stringify(result.body).includes("60.00"), false);
        const errors = events("market_closes_error").slice(before);
        assert.equal(errors.length, 1, "one consolidation attempt");
        assert.deepEqual(
          { day: errors[0].day, code: errors[0].code },
          { day: "2026-11-05", code: "ER_NO_SUCH_TABLE" },
        );
        assert.equal(events("market_closes").length, 0, "nothing written");
      },
    );

    await t.test(
      "/api/rankings/market, /api/market/quote and the price series answer 200",
      async () => {
        const market = await get(a, "/api/rankings/market");
        assert.equal(market.status, 200);
        assert.equal(market.body.entries[0].ceilingPrice, "60.00");
        assert.equal(market.body.entries[0].safetyMargin.percent, "83.33");
        const quote = await get(null, "/api/market/quote/PETR4");
        assert.equal(quote.status, 200);
        assert.equal(quote.body.quote.price, "10.00000000");

        const readErrors = events("market_closes_read_error").length;
        const nominal = await get(
          a,
          "/api/rankings/price-series/PETR4?basis=nominal&granularity=daily",
        );
        assert.equal(nominal.status, 200);
        // Without the Escola closes, the nominal series is the AGF tail.
        assert.equal(nominal.body.basis, "nominal");
        assert.equal(nominal.body.points[0].date, "2024-08-22");
        assert.ok(nominal.body.points.every((point) => point.source === "agf"));
        assert.equal(nominal.body.points.at(-1).date, "2026-10-23");
        assert.equal(nominal.body.unavailableReason, null);
        // The last AGF close is far from the quote's session: no line.
        assert.deepEqual(
          [nominal.body.latestQuote.connect, nominal.body.latestQuote.reason],
          [false, "gap"],
        );
        const monthly = await get(
          a,
          "/api/rankings/price-series/PETR4?basis=nominal&granularity=monthly",
        );
        assert.equal(monthly.status, 200);
        assert.equal(monthly.body.points.at(-1).month, "2026-10");
        assert.equal(monthly.body.points.at(-1).status, "incomplete");
        const adjusted = await get(
          a,
          "/api/rankings/price-series/PETR4?basis=adjusted",
        );
        assert.equal(adjusted.status, 200);
        assert.deepEqual(adjusted.body.points, []);
        assert.equal(adjusted.body.unavailableReason, "provider_error");
        const read = events("market_closes_read_error").slice(readErrors);
        assert.ok(read.length >= 1, "the missing table is logged on read");
        assert.ok(read.every((entry) => entry.code === "ER_NO_SUCH_TABLE"));
      },
    );

    await t.test(
      "later reads keep answering; the retry waits instead of hammering MySQL",
      async () => {
        const before = events("market_closes_error").length;
        for (let index = 0; index < 3; index++) {
          assert.equal((await get(null, "/api/rankings/public")).status, 200);
          assert.equal((await get(a, "/api/rankings/market")).status, 200);
        }
        assert.equal(events("market_closes_error").length, before);
      },
    );

    await t.test(
      "the backup skips the missing table and succeeds",
      async () => {
        const backup = spawnSync(
          process.execPath,
          ["server/backup.js", "backup"],
          {
            env: {
              ...process.env,
              BACKUP_DIRECTORY: resolve(".test-artifacts", "backups-sem-009"),
              BACKUP_KEY: randomBytes(32).toString("hex"),
            },
            encoding: "utf8",
            windowsHide: true,
            timeout: 60_000,
          },
        );
        assert.equal(backup.status, 0, backup.stderr);
      },
    );

    await t.test("no request failed", () => {
      assert.ok(statuses.length >= 12);
      assert.deepEqual(
        statuses.filter(([, status]) => status >= 500),
        [],
      );
      assert.equal(
        logs.some((line) => /API request failed/.test(line)),
        false,
      );
    });
  });
} finally {
  Date.now = realNow;
  Object.assign(console, original);
  await fixture.cleanup();
}
