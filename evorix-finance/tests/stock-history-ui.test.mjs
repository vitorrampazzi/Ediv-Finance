import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStockHistory,
  groupDividends,
  groupDividendsByType,
  dividendKind,
  attachPayout,
  netIncomeSeries,
  formatHistoricalDividend,
  formatDividendPerShare,
  formatReais,
  compactReais,
  formatPayoutPercent,
  dividendSourceNote,
  annualHistoryText,
} from "../src/lib/stockHistory.ts";

// The AGF price series is validated but not drawn (mixed basis); the company
// page shows the current quote and the dividends by type and year.
test("history presentation preserves dates, events and sub-cent amounts", () => {
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
  assert.deepEqual(groupDividends(input, "Anual", "Máx"), [
    { period: "2026", past: 0.2, future: 0, count: 3 },
    { period: "2027", past: 0, future: 0.2, count: 1 },
  ]);
  assert.match(formatHistoricalDividend(0.0000000122), /0,0000000122/);
  assert.match(formatHistoricalDividend(0), /0,0000/);
  assert.equal(formatHistoricalDividend(null), "Não informado");
  assert.deepEqual(input, original);
});

const history = (dividends, capturedAt = "2026-10-26T19:17:03Z") => ({
  ticker: "TIMS3",
  source: { name: "AGF", url: "https://app.agf.com.br/", capturedAt },
  prices: [],
  dividends,
});
const event = (value, type, paymentDate) => ({
  value,
  type,
  recordDate: null,
  paymentDate,
});

test("AGF types: Dividendo, JCP and everything else as Outros", () => {
  assert.equal(dividendKind("Dividendo"), "dividend");
  assert.equal(dividendKind(" dividendo "), "dividend");
  assert.equal(dividendKind("JCP"), "jcp");
  for (const type of [
    "Rendimento",
    "rendimento",
    "REST CAP DIN",
    "Restituição de Capital",
    null,
  ])
    assert.equal(dividendKind(type), "other", String(type));
});

test("dividends by type, payment date, past and scheduled", () => {
  const input = history([
    event(0.1, "Dividendo", "2025-05-10"),
    event(0.2, "Dividendo", "2025-11-10"),
    event(0.1, "JCP", "2025-11-10"),
    event(0.05, "Rendimento", "2026-03-02"),
    event(0.01, "REST CAP DIN", "2026-03-02"),
    event(0.3, "JCP", "2026-10-26"),
    // After the snapshot date: scheduled.
    event(0.2, "JCP", "2026-12-01"),
    event(0.4, "Dividendo", "2027-01-22"),
    // No payment date or no value: not grouped.
    event(0.9, "Dividendo", null),
    event(null, "JCP", "2026-01-01"),
    event(0.7, "Dividendo", "2019-01-01"),
  ]);
  const original = structuredClone(input);
  const annual = groupDividendsByType(input, "Anual", "Máx");
  assert.deepEqual(
    annual.map((row) => row.period),
    ["2019", "2025", "2026", "2027"],
  );
  assert.deepEqual(annual[1], {
    period: "2025",
    dividend: 0.3,
    jcp: 0.1,
    other: 0,
    dividendFuture: 0,
    jcpFuture: 0,
    otherFuture: 0,
    total: 0.4,
    scheduled: 0,
    count: 3,
  });
  assert.deepEqual(annual[2], {
    period: "2026",
    dividend: 0,
    jcp: 0.3,
    other: 0.06,
    dividendFuture: 0,
    jcpFuture: 0.2,
    otherFuture: 0,
    total: 0.56,
    scheduled: 0.2,
    count: 4,
  });
  assert.equal(annual[3].dividendFuture, 0.4);
  assert.equal(annual[3].dividend, 0);
  // The same totals as the grouping by past/future.
  const plain = groupDividends(input, "Anual", "Máx");
  for (const [index, row] of plain.entries()) {
    assert.ok(Math.abs(row.past + row.future - annual[index].total) < 1e-9);
    assert.ok(Math.abs(row.future - annual[index].scheduled) < 1e-9);
  }
  // Five years back from the snapshot year, and months.
  assert.deepEqual(
    groupDividendsByType(input, "Anual", "5A").map((row) => row.period),
    ["2025", "2026", "2027"],
  );
  const monthly = groupDividendsByType(input, "Mensal", "Máx");
  assert.deepEqual(
    monthly.map((row) => row.period),
    ["2019-01", "2025-05", "2025-11", "2026-03", "2026-10", "2026-12", "2027-01"],
  );
  assert.equal(monthly.find((row) => row.period === "2026-03").other, 0.06);
  assert.deepEqual(groupDividendsByType(history([]), "Anual", "Máx"), []);
  assert.deepEqual(input, original);
});

test("payout line only for the years the publication informs", () => {
  const rows = [{ period: "2023" }, { period: "2024" }, { period: "2025" }];
  const payout = [
    { year: 2022, value: "0.500000" },
    { year: 2024, value: "0.452000" },
    { year: 2025, value: "1.105000" },
    { year: 2025, value: "0.100000" },
    { year: 2023.5, value: "0.3" },
    { year: 2023, value: "45,2" },
  ];
  const result = attachPayout(rows, payout);
  assert.deepEqual(
    result.rows.map((row) => row.payout),
    [null, 45.2, 110.5],
  );
  assert.equal(result.matched, 2);
  assert.equal(result.available, true);
  // Negative payouts are informed as such.
  assert.equal(
    attachPayout([{ period: "2024" }], [{ year: 2024, value: "-0.250000" }])
      .rows[0].payout,
    -25,
  );
  for (const empty of [null, undefined, []]) {
    const none = attachPayout(rows, empty);
    assert.equal(none.available, false);
    assert.equal(none.matched, 0);
    assert.ok(none.rows.every((row) => row.payout === null));
  }
  // Monthly periods never take an annual payout.
  assert.equal(
    attachPayout([{ period: "2024-05" }], payout).rows[0].payout,
    null,
  );
  assert.deepEqual(rows, [
    { period: "2023" },
    { period: "2024" },
    { period: "2025" },
  ]);
});

test("net income: the last ten informed years, in order, no gap filled", () => {
  const points = Array.from({ length: 14 }, (_, index) => ({
    year: 2025 - index,
    value: String((index - 2) * 1000000000) + ".00",
  }));
  points.push({ year: 2030, value: "abc" });
  const series = netIncomeSeries(points);
  assert.equal(series.length, 10);
  assert.deepEqual(
    series.map((row) => row.year),
    [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  );
  assert.equal(series.at(-1).value, -2000000000);
  assert.equal(series.at(-1).period, "2025");
  assert.deepEqual(
    netIncomeSeries([
      { year: 2020, value: "10" },
      { year: 2022, value: "30" },
    ]).map((row) => row.year),
    [2020, 2022],
  );
  assert.deepEqual(netIncomeSeries(null), []);
  assert.deepEqual(netIncomeSeries([]), []);
});

test("formats: per share, reais, compact axis, payout and source", () => {
  assert.equal(formatDividendPerShare(0.2166801148), "R$ 0,2167");
  assert.equal(formatDividendPerShare(1.5), "R$ 1,50");
  assert.equal(formatDividendPerShare(0), "R$ 0,00");
  // Never a positive amount shown as zero.
  assert.equal(formatDividendPerShare(0.000007521), "R$ 0,00000752");
  assert.equal(formatDividendPerShare(0.0000893961), "R$ 0,0001");
  assert.equal(formatReais(2345678900), "R$ 2.345.678.900,00");
  assert.equal(formatReais(-120000000.5), "-R$ 120.000.000,50");
  assert.equal(compactReais(2345678900), "2,3 bi");
  assert.equal(compactReais(450000000), "450 mi");
  assert.equal(compactReais(-1200000000), "-1,2 bi");
  assert.equal(compactReais(12000), "12 mil");
  assert.equal(compactReais(0), "0");
  assert.equal(formatPayoutPercent(45.2), "45,2%");
  assert.equal(formatPayoutPercent(110.5), "110,5%");
  assert.equal(
    dividendSourceNote(history([])),
    "Fonte: AGF, snapshot de 26/10/2026, agrupado por data de pagamento.",
  );
});

test("annual history as text lists, null when a series is missing", () => {
  assert.deepEqual(
    annualHistoryText({
      netIncome: [
        { year: 2024, value: "2345678900.00" },
        { year: 2023, value: "-1200000.50" },
      ],
      payout: [{ year: 2023, value: "0.452000" }],
    }),
    {
      netIncome: [
        { year: 2023, text: "-R$ 1.200.000,50" },
        { year: 2024, text: "R$ 2.345.678.900,00" },
      ],
      payout: [{ year: 2023, text: "45,2%" }],
    },
  );
  for (const empty of [null, undefined, { netIncome: null, payout: [] }])
    assert.deepEqual(annualHistoryText(empty), {
      netIncome: null,
      payout: null,
    });
});
