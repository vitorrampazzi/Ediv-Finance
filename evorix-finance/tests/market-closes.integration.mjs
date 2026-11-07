import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFixture } from "./fixture.mjs";

// Migration 009 and the SQL of the closes consolidated by the Escola
// (docs/MARGEM-E-HISTORICO.md): claim `closes:D` in provider_cache, INSERT
// IGNORE and the previous-session check. Only the disposable loopback MySQL
// of the CI; never production or .env.aiven.
if (process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true")
  throw new Error(
    "Market closes integration requires the disposable local MySQL.",
  );
// The CI runs in UTC; a São Paulo clock catches dates read as local time.
process.env.TZ = "America/Sao_Paulo";
const fixture = await createFixture();
const { pool, schema } = fixture;
const store = await import("../server/market-closes.js");
const { createDailyCloses, retryMs } =
  await import("../server/market/daily-closes.js");
const { runMigrations } = await import("../server/database.js");

assert.match(schema, /^ediv_test_[a-f0-9]{12}$/);
const [[active]] = await pool.execute("SELECT DATABASE() AS name");
assert.equal(
  active.name,
  schema,
  "market_daily_closes must live in the fixture schema",
);

async function claimRow(key) {
  const [rows] = await pool.execute(
    "SELECT payload, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), expires_at) AS seconds FROM provider_cache WHERE cache_key=?",
    [key],
  );
  if (!rows[0]) return null;
  const payload =
    typeof rows[0].payload === "string"
      ? JSON.parse(rows[0].payload)
      : rows[0].payload;
  return { ...payload, seconds: Number(rows[0].seconds) };
}
const row = (ticker, close, volume = "100") => ({ ticker, close, volume });

try {
  await test("market_daily_closes: migração 009 e gravações no MySQL descartável", async (t) => {
    await t.test(
      "migration 009 creates the table once, with key and checks",
      async () => {
        const [columns] = await pool.execute(
          "SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='market_daily_closes' ORDER BY ORDINAL_POSITION",
        );
        assert.deepEqual(
          columns.map((column) => [column.name, column.type, column.nullable]),
          [
            ["ticker", "varchar(16)", "NO"],
            ["trade_date", "date", "NO"],
            ["close", "decimal(20,8)", "NO"],
            ["volume", "bigint unsigned", "YES"],
            ["source", "varchar(40)", "NO"],
            ["captured_at", "datetime(3)", "NO"],
          ],
        );
        const [keys] = await pool.execute(
          "SELECT INDEX_NAME AS name, COLUMN_NAME AS col FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='market_daily_closes' ORDER BY INDEX_NAME, SEQ_IN_INDEX",
        );
        assert.deepEqual(
          keys
            .map((key) => `${key.name}:${key.col}`)
            .sort((left, right) => left.localeCompare(right, "en")),
          [
            "market_daily_closes_date_idx:trade_date",
            "PRIMARY:ticker",
            "PRIMARY:trade_date",
          ],
        );
        const [[applied]] = await pool.execute(
          "SELECT COUNT(*) AS n FROM schema_migrations WHERE name='009_market_daily_closes.sql'",
        );
        assert.equal(Number(applied.n), 1);
        // Re-running is harmless: the runner skips it and the SQL is idempotent.
        await runMigrations(pool);
        await pool.query(
          await readFile(
            new URL(
              "../server/migrations/009_market_daily_closes.sql",
              import.meta.url,
            ),
            "utf8",
          ),
        );
        // A zero or negative close never becomes a stored price.
        for (const close of ["0", "-1.00000000"])
          await assert.rejects(
            pool.execute(
              "INSERT INTO market_daily_closes(ticker,trade_date,close,volume,source,captured_at) VALUES('ZERO3','2026-11-05',?,1,'test',UTC_TIMESTAMP(3))",
              [close],
            ),
            (error) => error.code === "ER_CHECK_CONSTRAINT_VIOLATED",
          );
      },
    );

    await t.test(
      "claim closes:D is atomic, expires and ends as done",
      async () => {
        const key = "closes:2026-11-05";
        assert.equal(
          await store.claimDailyCloses(key, "owner-a", 60_000),
          "claimed",
        );
        assert.equal(
          await store.claimDailyCloses(key, "owner-b", 60_000),
          "busy",
        );
        const running = await claimRow(key);
        assert.equal(running.state, "running");
        assert.equal(running.owner, "owner-a");
        assert.ok(
          running.seconds > 50 && running.seconds <= 60,
          `${running.seconds} s`,
        );
        // Only the owner can give it back or finish it.
        await store.releaseDailyCloses(key, "owner-b", retryMs);
        assert.equal((await claimRow(key)).state, "running");
        // An expired claim (writer that died) is taken over by one caller.
        await pool.execute(
          "UPDATE provider_cache SET expires_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE cache_key=?",
          [key],
        );
        const takeover = await Promise.all(
          ["c", "d", "e", "f", "g"].map((owner) =>
            store.claimDailyCloses(key, owner, 60_000),
          ),
        );
        assert.deepEqual(
          takeover.filter((result) => result === "claimed").length,
          1,
          JSON.stringify(takeover),
        );
        const owner = (await claimRow(key)).owner;
        await store.finishDailyCloses(
          key,
          owner,
          { inserted: 2, candidates: 2 },
          7 * 86_400_000,
        );
        const done = await claimRow(key);
        assert.equal(done.state, "done");
        assert.equal(done.inserted, 2);
        assert.ok(done.seconds > 6 * 86_400, "Done for a week");
        assert.equal(await store.claimDailyCloses(key, "late", 60_000), "done");
        // Many first claims at once on a new day: exactly one wins.
        const first = await Promise.all(
          Array.from({ length: 12 }, (_, index) =>
            store.claimDailyCloses("closes:2026-11-06", `p${index}`, 60_000),
          ),
        );
        assert.equal(
          first.filter((result) => result === "claimed").length,
          1,
          JSON.stringify(first),
        );
        // A released day waits retryMs and is then free again.
        const winner = (await claimRow("closes:2026-11-06")).owner;
        await store.releaseDailyCloses("closes:2026-11-06", winner, retryMs);
        const retry = await claimRow("closes:2026-11-06");
        assert.equal(retry.state, "retry");
        assert.ok(
          retry.seconds > 290 && retry.seconds <= 300,
          `${retry.seconds} s`,
        );
        assert.equal(
          await store.claimDailyCloses("closes:2026-11-06", "other", 60_000),
          "busy",
        );
      },
    );

    await t.test(
      "INSERT IGNORE never overwrites and the previous session is found",
      async () => {
        assert.equal(
          await store.insertDailyCloses(
            "2026-11-04",
            [
              row("PETR4", "47.12000000", "94219800"),
              row("VALE3", "62.81000000", null),
            ],
            "2026-11-04T21:40:00.250Z",
          ),
          2,
        );
        assert.equal(
          await store.insertDailyCloses(
            "2026-11-04",
            [row("PETR4", "1.00000000"), row("ITUB4", "39.71000000")],
            "2026-11-04T22:40:00.750Z",
          ),
          1,
          "Only the new ticker is written",
        );
        assert.equal(
          await store.insertDailyCloses(
            "2026-11-04",
            [],
            "2026-11-04T22:40:00.750Z",
          ),
          0,
        );
        const [stored] = await pool.execute(
          "SELECT ticker,trade_date,close,volume,source,captured_at FROM market_daily_closes WHERE trade_date='2026-11-04' ORDER BY ticker",
        );
        assert.deepEqual(
          stored.map((item) => ({
            ...item,
            volume: item.volume === null ? null : String(item.volume),
          })),
          [
            {
              ticker: "ITUB4",
              trade_date: "2026-11-04",
              close: "39.71000000",
              volume: "100",
              source: "brapi_list",
              captured_at: "2026-11-04 22:40:00.750",
            },
            {
              ticker: "PETR4",
              trade_date: "2026-11-04",
              close: "47.12000000",
              volume: "94219800",
              source: "brapi_list",
              captured_at: "2026-11-04 21:40:00.250",
            },
            {
              ticker: "VALE3",
              trade_date: "2026-11-04",
              close: "62.81000000",
              volume: null,
              source: "brapi_list",
              captured_at: "2026-11-04 21:40:00.250",
            },
          ],
        );
        await store.insertDailyCloses(
          "2026-11-03",
          [row("PETR4", "50.71000000")],
          "2026-11-03T21:40:00.000Z",
        );
        const previous = await store.previousDailyCloses("2026-11-05");
        assert.equal(previous.day, "2026-11-04");
        assert.deepEqual(previous.rows.get("PETR4"), {
          close: "47.12000000",
          volume: 94219800,
        });
        assert.equal(
          (await store.previousDailyCloses("2026-11-04")).day,
          "2026-11-03",
        );
        assert.equal(await store.previousDailyCloses("2026-11-03"), null);
        assert.deepEqual(await store.readDailyCloses("PETR4"), [
          { date: "2026-11-03", close: "50.71000000" },
          { date: "2026-11-04", close: "47.12000000" },
        ]);
        assert.deepEqual(await store.readDailyCloses("ABEV3"), []);
      },
    );

    await t.test(
      "latest publication tickers come from its JSON only",
      async () => {
        assert.deepEqual(await store.latestPublicationTickers(), []);
        for (const tickers of [["OLD3"], ["TIMS3", "BRK.B", "ALOS3"]])
          await pool.execute(
            "INSERT INTO ranking_publications(title,source_file_name,entries_json) VALUES(?,?,?)",
            [
              "Teste",
              "teste.csv",
              JSON.stringify(
                tickers.map((ticker, index) => ({ rank: index + 1, ticker })),
              ),
            ],
          );
        assert.deepEqual(await store.latestPublicationTickers(), [
          "TIMS3",
          "ALOS3",
        ]);
      },
    );

    await t.test(
      "consolidation end to end: write once, skip an unchanged list",
      async () => {
        const logs = [];
        const items = (prices) =>
          Object.entries(prices).map(([symbol, price]) => ({
            symbol,
            price,
            volume: "500",
            name: symbol,
          }));
        const consolidator = () =>
          createDailyCloses({
            store: store.dailyClosesStore,
            tickers: async () => [
              "PETR4",
              "VALE3",
              "ITUB4",
              ...(await store.latestPublicationTickers()),
            ],
            log: (entry) => logs.push(entry),
          });
        // Friday 06/11 19:10: written once, then found done by another instance.
        const friday = items({
          PETR4: "48.00000000",
          VALE3: "63.00000000",
          TIMS3: "19.80000000",
          ABEV3: "12.00000000",
        });
        assert.deepEqual(
          await consolidator().afterCatalog({
            value: { items: friday },
            checkedAt: "2026-11-06T22:10:00.000Z",
          }),
          { day: "2026-11-06", status: "busy" },
          "The claim of 06/11 from the previous subtest is still waiting",
        );
        await pool.execute(
          "DELETE FROM provider_cache WHERE cache_key='closes:2026-11-06'",
        );
        assert.deepEqual(
          await consolidator().afterCatalog({
            value: { items: friday },
            checkedAt: "2026-11-06T22:10:00.125Z",
          }),
          { day: "2026-11-06", status: "written", inserted: 3 },
        );
        assert.deepEqual(
          await consolidator().afterCatalog({
            value: { items: friday },
            checkedAt: "2026-11-06T22:40:00.000Z",
          }),
          { day: "2026-11-06", status: "done" },
        );
        const [[count]] = await pool.execute(
          "SELECT COUNT(*) AS n FROM market_daily_closes WHERE trade_date='2026-11-06'",
        );
        assert.equal(Number(count.n), 3);
        // Monday 09/11 19:10 with Friday's list unchanged: nothing written.
        assert.deepEqual(
          await consolidator().afterCatalog({
            value: { items: friday },
            checkedAt: "2026-11-09T22:10:00.000Z",
          }),
          { day: "2026-11-09", status: "unchanged" },
        );
        const [[monday]] = await pool.execute(
          "SELECT COUNT(*) AS n FROM market_daily_closes WHERE trade_date='2026-11-09'",
        );
        assert.equal(Number(monday.n), 0);
        assert.equal((await claimRow("closes:2026-11-09")).state, "retry");
        assert.deepEqual(
          logs.map((entry) => entry.event),
          ["market_closes", "market_closes_skipped"],
        );
        // The captured time is the list's checkedAt, stored as UTC.
        const [[captured]] = await pool.execute(
          "SELECT captured_at FROM market_daily_closes WHERE ticker='TIMS3' AND trade_date='2026-11-06'",
        );
        assert.equal(captured.captured_at, "2026-11-06 22:10:00.125");
      },
    );
  });
} finally {
  await fixture.cleanup();
}
