import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStockHistory,
  selectPrices,
  pricePlot,
  groupDividends,
  formatHistoricalDividend,
  mergeLiveHistory,
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

test("brapi.dev closes extend the packaged history only after its last date and only when the junction agrees", () => {
  const snapshot = [
    { date: "2026-10-19", close: 18.5 },
    { date: "2026-10-20", close: 18.7 },
    { date: "2026-10-21", close: 18.9 },
    { date: "2026-10-22", close: 19 },
    { date: "2026-10-23", close: 19.09 },
  ];
  const original = structuredClone(snapshot);
  const live = (points, extra = {}) => ({
    symbol: "TIMS3",
    available: true,
    reason: null,
    points,
    ...extra,
  });
  const overlap = [
    { date: "2026-10-21", close: "18.92000000" },
    { date: "2026-10-22", close: "19.0" },
    { date: "2026-10-23", close: "19.09" },
  ];
  const after = [
    { date: "2026-10-26", close: "19.20" },
    { date: "2026-10-27", close: "19.31" },
  ];

  // Overlap within 0.5%: only the later dates are appended, in order.
  const merged = mergeLiveHistory(snapshot, live([...after, ...overlap]));
  assert.equal(merged.extension, "extended");
  assert.equal(merged.snapshotEnd, "2026-10-23");
  assert.equal(merged.liveEnd, "2026-10-27");
  assert.equal(merged.added, 2);
  assert.deepEqual(merged.prices, [
    ...snapshot,
    { date: "2026-10-26", close: 19.2 },
    { date: "2026-10-27", close: 19.31 },
  ]);
  assert.equal(
    new Set(merged.prices.map((point) => point.date)).size,
    merged.prices.length,
    "No repeated dates",
  );

  // A common close more than 0.5% apart keeps the snapshot only.
  const mismatch = mergeLiveHistory(
    snapshot,
    live([{ date: "2026-10-23", close: "19.20" }, ...after]),
  );
  assert.equal(mismatch.extension, "mismatch");
  assert.equal(mismatch.prices, snapshot);
  assert.equal(mismatch.added, 0);
  // 0.5% exactly is still accepted; just above it is not.
  assert.equal(
    mergeLiveHistory(
      snapshot,
      live([{ date: "2026-10-22", close: "19.095" }, ...after]),
    ).extension,
    "extended",
  );
  assert.equal(
    mergeLiveHistory(
      snapshot,
      live([{ date: "2026-10-22", close: "19.0960" }, ...after]),
    ).extension,
    "mismatch",
  );

  // No common date: nothing to check the junction against.
  assert.equal(mergeLiveHistory(snapshot, live(after)).extension, "no_overlap");
  // Only dates already in the snapshot: nothing new to add.
  const same = mergeLiveHistory(snapshot, live(overlap));
  assert.equal(same.extension, "no_new_points");
  assert.equal(same.prices, snapshot);

  // Duplicates: equal repeats count once; a conflicting date is dropped.
  const duplicated = mergeLiveHistory(
    snapshot,
    live([
      ...overlap,
      { date: "2026-10-26", close: "19.20" },
      { date: "2026-10-26", close: "19.2" },
      { date: "2026-10-27", close: "19.31" },
      { date: "2026-10-27", close: "19.90" },
    ]),
  );
  assert.equal(duplicated.extension, "extended");
  assert.deepEqual(duplicated.prices.slice(snapshot.length), [
    { date: "2026-10-26", close: 19.2 },
  ]);

  // Invalid points are skipped, never turned into zero or invented values.
  const invalid = mergeLiveHistory(
    snapshot,
    live([
      ...overlap,
      { date: "2026-10-26", close: null },
      { date: "2026-10-27", close: "0" },
      { date: "2026-10-28", close: "-1" },
      { date: "2026-02-30", close: "19" },
      { date: "2026-10-29", close: "abc" },
      { date: "2026-10-30", close: "19.40" },
    ]),
  );
  assert.deepEqual(invalid.prices.slice(snapshot.length), [
    { date: "2026-10-30", close: 19.4 },
  ]);

  // The session still trading has no close yet.
  const open = mergeLiveHistory(snapshot, live([...overlap, ...after]), {
    openSession: "2026-10-27",
  });
  assert.deepEqual(open.prices.slice(snapshot.length), [
    { date: "2026-10-26", close: 19.2 },
  ]);

  // Empty or unavailable live data keeps the snapshot and says why.
  assert.equal(mergeLiveHistory(snapshot, live([])).extension, "empty");
  assert.equal(mergeLiveHistory(snapshot, null).extension, "unavailable");
  for (const reason of [
    "no_token",
    "not_covered",
    "budget",
    "provider_error",
    "range_not_in_plan",
  ]) {
    const result = mergeLiveHistory(
      snapshot,
      live([], { available: false, reason }),
    );
    assert.equal(result.extension, reason);
    assert.equal(result.prices, snapshot);
  }
  assert.equal(
    mergeLiveHistory(snapshot, live([], { available: false, reason: "x" }))
      .extension,
    "unavailable",
  );
  assert.equal(
    mergeLiveHistory([], live([...overlap, ...after])).extension,
    "empty",
  );
  assert.deepEqual(snapshot, original);
});
