import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStockHistory,
  selectPrices,
  pricePlot,
  groupDividends,
  formatHistoricalDividend,
} from "../src/lib/stockHistory.ts";

test("history presentation preserves dates, gaps, events and sub-cent amounts", () => {
  const input = {
    ticker: "TIMS3",
    source: {
      name: "AGF",
      url: "https://app.agf.com.br/",
      capturedAt: "2026-10-26T19:17:03Z",
    },
    prices: [
      { date: "2024-02-28", close: 10 },
      { date: "2024-02-29", close: 11 },
      { date: "2024-03-31", close: 12 },
    ],
    dividends: [
      {
        value: 0.1,
        type: "JCP",
        recordDate: "2026-01-01",
        paymentDate: "2026-02-01",
      },
      {
        value: 0.1,
        type: "JCP",
        recordDate: "2026-01-01",
        paymentDate: "2026-02-01",
      },
      {
        value: 0,
        type: "Rendimento",
        recordDate: null,
        paymentDate: "2026-02-01",
      },
      { value: null, type: null, recordDate: null, paymentDate: null },
      {
        value: 0.2,
        type: "JCP",
        recordDate: "2026-09-01",
        paymentDate: "2027-01-22",
      },
    ],
  };
  const original = structuredClone(input);
  assert.equal(parseStockHistory(input, "TIMS3"), input);
  assert.throws(() => parseStockHistory(input, "WIZC3"));
  assert.throws(() =>
    parseStockHistory(
      { ...input, prices: [{ date: "2024-02-30", close: 1 }] },
      "TIMS3",
    ),
  );
  assert.throws(() =>
    parseStockHistory(
      { ...input, prices: [{ date: "2024-02-29", close: 0 }] },
      "TIMS3",
    ),
  );
  assert.deepEqual(selectPrices(input.prices, "1M"), input.prices.slice(1));
  assert.deepEqual(selectPrices(input.prices, "5D"), input.prices);
  const plot = pricePlot(input.prices, 19.37, 32.74);
  assert.equal(plot.filter((point) => point.price === null).length, 1);
  assert.deepEqual(
    plot.filter((point) => point.price !== null).map((point) => point.price),
    [10, 11, 12],
  );
  assert(
    plot.every((point) => point.reference === 19.37 && point.ceiling === 32.74),
  );
  assert.deepEqual(groupDividends(input, "Anual", "Máx"), [
    { period: "2026", past: 0.2, future: 0, count: 3 },
    { period: "2027", past: 0, future: 0.2, count: 1 },
  ]);
  assert.match(formatHistoricalDividend(0.0000000122), /0,0000000122/);
  assert.match(formatHistoricalDividend(0), /0,0000/);
  assert.equal(formatHistoricalDividend(null), "Não informado");
  assert.deepEqual(input, original);
});
