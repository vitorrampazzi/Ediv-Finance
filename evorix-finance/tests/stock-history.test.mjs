import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { stockHistory } from "../server/stock-history.js";

test("approved history snapshot preserves 90 identities, prices, quarantine and every dividend event", () => {
  const gzip = readFileSync(
    new URL("../server/data/stock-history.json.gz", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(gzip).digest("hex"),
    "38f0ad94ebdd52acf0e757f2b71d76c47561b03edc93d313426a6891c81311e6",
  );
  const dataset = JSON.parse(gunzipSync(gzip));
  assert.equal(dataset.version, 1);
  assert.equal(
    dataset.sourceManifestSha256,
    "8a1e3eb7eec077b845a29f210f41e6afa94f073e9d783677a18b33135bd9be80",
  );
  assert.equal(Object.keys(dataset.stocks).length, 90);
  let prices = 0,
    dividends = 0,
    unknownPaymentDates = 0,
    zeroDividends = 0;
  for (const [ticker, expected] of Object.entries(dataset.stocks)) {
    const history = stockHistory(ticker);
    assert.deepEqual(history, expected);
    assert.strictEqual(stockHistory(ticker), history);
    assert.equal(history.ticker, ticker);
    assert.match(ticker, /^[A-Z0-9]{4}\d{1,2}$/);
    assert.deepEqual(Object.keys(history), [
      "ticker",
      "source",
      "prices",
      "dividends",
    ]);
    assert.deepEqual(Object.keys(history.source), [
      "name",
      "url",
      "capturedAt",
    ]);
    assert.equal(history.source.name, "AGF");
    assert.equal(
      history.source.url,
      `https://app.agf.com.br/investimento/carteira/empresa/raio-x/${ticker.toLowerCase()}`,
    );
    assert.equal(
      new Date(history.source.capturedAt).toISOString(),
      history.source.capturedAt,
    );
    let previousDate = "";
    for (const point of history.prices) {
      assert.deepEqual(Object.keys(point), ["date", "close"]);
      assert.match(point.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(new Date(point.date).toISOString().slice(0, 10), point.date);
      assert.ok(point.date > previousDate, "Unique ascending calendar dates");
      assert.ok(
        typeof point.close === "number" &&
          Number.isFinite(point.close) &&
          point.close > 0,
        "Zero, negative or missing prices cannot reach the API",
      );
      previousDate = point.date;
    }
    for (const event of history.dividends) {
      assert.deepEqual(Object.keys(event), [
        "value",
        "type",
        "recordDate",
        "paymentDate",
      ]);
      assert.ok(
        event.value === null ||
          (typeof event.value === "number" && Number.isFinite(event.value)),
      );
      assert.ok(event.type === null || typeof event.type === "string");
      for (const date of [event.recordDate, event.paymentDate])
        assert.ok(
          date === null ||
            (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
              new Date(date).toISOString().slice(0, 10) === date),
        );
      if (event.paymentDate === null) unknownPaymentDates++;
      if (event.value === 0) zeroDividends++;
    }
    prices += history.prices.length;
    dividends += history.dividends.length;
  }
  assert.equal(prices, 262941);
  assert.equal(dividends, 8027);
  assert.equal(unknownPaymentDates, 5);
  assert.equal(zeroDividends, 2);
  const tim = stockHistory("TIMS3");
  assert.equal(tim.prices.length, 1470);
  assert.deepEqual(tim.prices[0], { date: "2020-10-13", close: 11.0697174717 });
  assert.deepEqual(tim.prices.at(-1), { date: "2026-10-23", close: 19.09 });
  assert.ok(
    tim.prices.every((point) => point.date !== "2025-09-16"),
    "Conflicting 22.76/22.70 closing prices stay quarantined",
  );
  assert.equal(tim.source.capturedAt, "2026-10-26T19:17:03.990Z");
  assert.deepEqual(tim.dividends[0], {
    value: 0.2166801148,
    type: "JCP",
    recordDate: "2026-09-22",
    paymentDate: "2027-01-22",
  });
  assert.equal(stockHistory("WIZC3").prices.length, 2795);
  assert.equal(stockHistory("B3SA3").ticker, "B3SA3");
  assert.equal(
    stockHistory("VIVT3").dividends[9].type,
    "Restituição de Capital",
  );
  const recv = stockHistory("RECV3").dividends;
  assert.deepEqual(recv[0], recv[1]);
  assert.deepEqual(recv[1], recv[2]);
  for (const ticker of [
    "TEST3",
    "tims3",
    "__proto__",
    "constructor",
    "../TIMS3",
    "-1",
  ])
    assert.equal(stockHistory(ticker), null);
});
