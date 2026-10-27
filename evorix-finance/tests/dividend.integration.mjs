import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";
import { dividendColumns } from "../dividend-analysis.mjs";
import { csvDownload } from "../server/spreadsheet.js";

if (process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true")
  throw new Error("Dividend integration requires the disposable local MySQL.");
const fixture = await createFixture();
const {
  request,
  accounts: { analyst, a },
  pool,
} = fixture;
const row = {
  companyName: "Empresa de teste",
  ticker: "TEST3",
  sector: "Teste",
  totalShares: "104995666.67",
  marketValue: "46038142480.980003",
  estimatedNetIncome: "5300000000",
  projectedPE: "8.6999999999999993",
  averagePE10Years: "16.3",
  peDeviation: "-0.467",
  earningsCagr5Years: "-0.179",
  netDebtToEbitda: "0",
  estimatedEps: "2.23",
  expectedPayout: "1.06",
  projectedGrossDividendPerShare: "2.23",
  estimatedGrossDividendYield: "0.115",
  referencePrice: "19.37",
  ceilingPrice: "32.74",
  safetyMargin: "0.41",
  announcementFrequency: "5x por ano",
  announcementMonths: "mar abr jun set dez",
  updatedOn: "2026-10-20",
};
const upload = (changes = {}) => ({
  method: "POST",
  raw: csvDownload([
    dividendColumns.map((column) => column.label),
    dividendColumns.map((column) => ({ ...row, ...changes })[column.key]),
  ]),
  headers: {
    "Content-Type": "text/csv",
    "X-File-Name": "dividend-test.csv",
    "X-Publication-Meta": encodeURIComponent(
      JSON.stringify({ title: "Indicadores de teste" }),
    ),
  },
});
let first;
try {
  await test("dividend publication: API, permissions, persistence and historical changes", async (t) => {
    t.beforeEach(() => fixture.clearLimits());
    await t.test(
      "anonymous public ranking is empty without publication; full and management routes remain private",
      async () => {
        const result = await request(null, "/api/rankings/public");
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, {
          id: null,
          title: "Ranking de dividendos",
          updatedAt: null,
          totalEntries: 0,
          entries: [],
        });
        for (const path of [
          "/api/rankings",
          "/api/rankings?publication=1",
          "/api/rankings/compare?from=1&to=2",
          "/api/rankings/drafts",
          "/api/rankings/history/TIMS3",
          "/api/rankings/history/TEST3",
          "/api/rankings/history/tims3",
        ])
          assert.equal((await request(null, path)).status, 401, path);
        assert.equal(
          (await request(null, "/api/rankings", upload())).status,
          401,
        );
      },
    );
    await t.test(
      "stock history requires login, validates tickers and does not expose private source metadata",
      async () => {
        for (const account of [a, analyst]) {
          const result = await request(account, "/api/rankings/history/TIMS3");
          assert.equal(result.status, 200);
          assert.equal(result.headers.get("cache-control"), "no-store");
          assert.deepEqual(Object.keys(result.body), [
            "ticker",
            "source",
            "prices",
            "dividends",
          ]);
          assert.equal(result.body.ticker, "TIMS3");
          assert.equal(result.body.prices.length, 1470);
          assert.equal(result.body.dividends.length, 86);
          assert.deepEqual(result.body.prices.at(-1), {
            date: "2026-10-23",
            close: 19.09,
          });
          assert.deepEqual(Object.keys(result.body.source), [
            "name",
            "url",
            "capturedAt",
          ]);
          assert.equal(result.body.source.name, "AGF");
          assert.deepEqual(Object.keys(result.body.dividends[0]), [
            "value",
            "type",
            "recordDate",
            "paymentDate",
          ]);
        }
        for (const ticker of ["tims3", "TIM", "-1", "TIMS3%00"]) {
          const result = await request(a, "/api/rankings/history/" + ticker);
          assert.equal(result.status, 400, ticker);
          assert.equal(result.headers.get("cache-control"), "no-store");
        }
        assert.equal(
          (await request(a, "/api/rankings/history/TEST3")).status,
          404,
        );
        const alphanumeric = await request(a, "/api/rankings/history/B3SA3");
        assert.equal(alphanumeric.status, 200);
        assert.equal(alphanumeric.body.ticker, "B3SA3");
      },
    );
    await t.test(
      "preview requires permission and does not publish",
      async () => {
        assert.equal(
          (await request(null, "/api/rankings/preview", upload())).status,
          401,
        );
        assert.equal(
          (await request(a, "/api/rankings/preview", upload())).status,
          403,
        );
        const preview = await request(
          analyst,
          "/api/rankings/preview",
          upload(),
        );
        assert.equal(preview.status, 200);
        assert.equal(preview.body.count, 1);
        assert.equal(
          preview.body.entries[0].dividendAnalysis.estimatedGrossDividendYield,
          "0.115",
        );
        const [[counts]] = await pool.query(
          "SELECT COUNT(*) AS count FROM ranking_publications",
        );
        assert.equal(Number(counts.count), 0);
      },
    );
    await t.test(
      "publication roundtrip preserves raw metrics and absent legacy claims; retry deduplicates",
      async () => {
        const published = await request(analyst, "/api/rankings", upload());
        assert.equal(published.status, 201);
        first = published.body.publicationId;
        const latest = await request(a, "/api/rankings");
        assert.equal(latest.status, 200);
        const entry = latest.body.entries[0];
        for (const column of dividendColumns.slice(3))
          assert.equal(
            entry.dividendAnalysis[column.key],
            row[column.key],
            column.key,
          );
        for (const key of [
          "expectedReturnPercent",
          "targetPrice",
          "horizonMonths",
          "thesis",
          "risks",
        ])
          assert.equal(entry[key], null, key);
        assert.equal(latest.body.authorName, null);
        const publicResult = await request(null, "/api/rankings/public");
        assert.equal(publicResult.status, 200);
        assert.equal(publicResult.body.id, first);
        assert.equal(publicResult.body.totalEntries, 1);
        assert.deepEqual(
          Object.keys(publicResult.body).sort(),
          ["id", "title", "updatedAt", "totalEntries", "entries"].sort(),
        );
        const publicEntry = publicResult.body.entries[0];
        assert.deepEqual(
          Object.keys(publicEntry).sort(),
          ["rank", "ticker", "companyName", "dividendAnalysis"].sort(),
        );
        for (const column of dividendColumns.filter(({ key }) =>
          [
            "estimatedGrossDividendYield",
            "projectedPE",
            "safetyMargin",
          ].includes(key),
        ))
          assert.equal(
            publicEntry.dividendAnalysis[column.key],
            row[column.key],
            column.key,
          );
        assert.equal(
          (await request(analyst, "/api/rankings", upload())).status,
          200,
        );
        const [[counts]] = await pool.query(
          "SELECT COUNT(*) AS count FROM notification_events WHERE type='research'",
        );
        assert.equal(Number(counts.count), 1);
      },
    );
    await t.test(
      "metric changes publish a new version while the original stays intact",
      async () => {
        const changed = await request(
          analyst,
          "/api/rankings",
          upload({ expectedPayout: "1.07" }),
        );
        assert.equal(changed.status, 201);
        const second = changed.body.publicationId;
        const publicLatest = await request(
          null,
          "/api/rankings/public?publication=" + first,
        );
        assert.equal(publicLatest.status, 200);
        assert.equal(publicLatest.body.id, second);
        assert.equal(
          publicLatest.body.entries[0].dividendAnalysis.expectedPayout,
          undefined,
        );
        const comparison = await request(
          a,
          `/api/rankings/compare?from=${first}&to=${second}`,
        );
        assert.equal(comparison.status, 200);
        assert.deepEqual(comparison.body.changed[0].fields, [
          "dividendAnalysis",
        ]);
        assert.equal(
          comparison.body.changed[0].before.dividendAnalysis.expectedPayout,
          "1.06",
        );
        assert.equal(
          comparison.body.changed[0].after.dividendAnalysis.expectedPayout,
          "1.07",
        );
        const original = await request(a, "/api/rankings?publication=" + first);
        assert.equal(
          original.body.entries[0].dividendAnalysis.expectedPayout,
          "1.06",
        );
      },
    );
    await t.test(
      "public preview cannot enumerate the full ranking or request more metrics",
      async () => {
        const entries = Array.from({ length: 90 }, (_, index) => ({
          rank: 90 - index,
          ticker: "TEST" + index,
          companyName: "Fixture " + index,
          thesis: "PRIVATE_THESIS",
          dividendAnalysis: {
            estimatedGrossDividendYield: "0.115",
            projectedPE: "8.6999999999999993",
            safetyMargin: "0.41",
            marketValue: "PRIVATE_METRIC",
            expectedPayout: "PRIVATE_METRIC",
          },
        }));
        await pool.execute(
          "INSERT INTO ranking_publications(title,source_file_name,entries_json,imported_by) VALUES(?,?,?,?)",
          [
            "Fixture de proteção",
            "PRIVATE_FILE",
            JSON.stringify(entries),
            analyst.id,
          ],
        );
        for (const query of [
          "",
          "?limit=90&offset=3",
          "?page=2&fields=*&publication=" + first,
        ]) {
          const result = await request(null, "/api/rankings/public" + query);
          assert.equal(result.status, 200);
          assert.equal(result.body.totalEntries, 3);
          assert.deepEqual(
            result.body.entries.map((entry) => entry.rank),
            [1, 2, 3],
          );
          for (const entry of result.body.entries)
            assert.deepEqual(Object.keys(entry.dividendAnalysis), [
              "estimatedGrossDividendYield",
              "projectedPE",
              "safetyMargin",
            ]);
          assert.equal(JSON.stringify(result.body).includes("PRIVATE_"), false);
        }
        const member = await request(a, "/api/rankings");
        assert.equal(member.status, 200);
        assert.equal(member.body.entries.length, 90);
        assert.equal(
          member.body.entries[0].dividendAnalysis.marketValue,
          "PRIVATE_METRIC",
        );
      },
    );
  });
} finally {
  await fixture.cleanup();
}
