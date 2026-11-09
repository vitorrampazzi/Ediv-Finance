import test from "node:test";
import assert from "node:assert/strict";
import {
  coverageText,
  markerTitle,
  parsePriceSeries,
  periodFor,
  rowTooltip,
  selectSeries,
  seriesPeriods,
  seriesPlot,
  seriesSummary,
  uncoveredSeries,
  unavailableMessages,
} from "../src/lib/priceSeries.ts";

const expected = { ticker: "TIMS3", basis: "nominal", granularity: "daily" };
const now = Date.parse("2026-11-05T15:00:00Z");
const daily = {
  ticker: "TIMS3",
  basis: "nominal",
  granularity: "daily",
  availableBases: ["nominal", "adjusted", "other"],
  defaultBasis: "adjusted",
  points: [
    {
      date: "2026-11-04",
      close: "19.40000000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-10-30",
      close: "19.10000000",
      status: "consolidated",
      source: "escola",
      gapBefore: true,
    },
    {
      date: "2026-10-28",
      close: "19.00000000",
      status: "consolidated",
      source: "agf",
    },
    {
      date: "2026-10-28",
      close: "19.00000000",
      status: "consolidated",
      source: "agf",
    },
    {
      date: "2026-10-27",
      close: "18.90",
      status: "consolidated",
      source: "agf",
    },
    {
      date: "2026-10-27",
      close: "18.95",
      status: "consolidated",
      source: "agf",
    },
    { date: "2026-02-30", close: "19", status: "consolidated", source: "agf" },
    { date: "2026-10-26", close: "0", status: "consolidated", source: "agf" },
    { date: "2026-10-23", close: null, status: "consolidated", source: "agf" },
  ],
  latestQuote: {
    price: "19.62000000",
    checkedAt: "2026-11-05T13:48:14.389Z",
    freshness: "delayed",
    connect: true,
    reason: null,
  },
  coverage: {
    from: "2026-10-28",
    to: "2026-11-04",
    segments: [
      { from: "2026-10-28", to: "2026-10-28", source: "agf" },
      { from: "2026-10-30", to: "2026-10-30", source: "escola" },
      { from: "2026-11-04", to: "2026-11-04", source: "brapi" },
    ],
    notes: [
      { code: "calendar_fallback", text: "Sem calendário da B3 conferido." },
      "Texto simples.",
      { code: "empty", text: " " },
    ],
  },
  unavailableReason: null,
  checkedAt: "2026-11-05T13:00:00.000Z",
};

test("the series is read strictly: order, repeats, invalid closes and notes", () => {
  const series = parsePriceSeries(daily, expected);
  assert.deepEqual(series.availableBases, ["adjusted", "nominal"]);
  assert.equal(series.defaultBasis, "adjusted");
  // Sorted by date; a repeated equal close counts once and a conflicting
  // date, an impossible date, zero and null closes are dropped.
  assert.deepEqual(
    series.points.map((point) => [point.date, point.close, point.source]),
    [
      ["2026-10-28", 19, "agf"],
      ["2026-10-30", 19.1, "escola"],
      ["2026-11-04", 19.4, "brapi"],
    ],
  );
  assert.equal(series.points[1].gapBefore, true);
  assert.equal(series.latestQuote.connect, true);
  assert.deepEqual(series.coverage.notes, [
    { code: "calendar_fallback", text: "Sem calendário da B3 conferido." },
    { code: null, text: "Texto simples." },
  ]);
  assert.equal(
    coverageText(series.coverage),
    "Fontes: AGF, no trecho com o preço negociado; fechamentos consolidados pela Escola do Dividendo; brapi.dev.",
  );
  assert.throws(() =>
    parsePriceSeries({ ...daily, ticker: "WIZC3" }, expected),
  );
  assert.throws(() => parsePriceSeries(null, expected));
  const unavailable = parsePriceSeries(
    {
      ticker: "TIMS3",
      basis: "adjusted",
      availableBases: [],
      defaultBasis: null,
      points: [],
      latestQuote: null,
      coverage: { from: null, to: null, segments: [], notes: [] },
      unavailableReason: "no_token",
    },
    { ...expected, basis: "adjusted" },
  );
  assert.equal(unavailable.unavailableReason, "no_token");
  assert.equal(unavailable.defaultBasis, null);
  assert.ok(unavailableMessages[unavailable.unavailableReason]);
  const uncovered = uncoveredSeries(expected);
  assert.equal(uncovered.unavailableReason, "not_covered");
  assert.deepEqual(uncovered.points, []);
});

test("periods: the daily filters stay, the monthly ones skip short windows", () => {
  assert.deepEqual(seriesPeriods.daily, ["5D", "1M", "6M", "1A", "5A", "Máx"]);
  assert.deepEqual(seriesPeriods.monthly, ["6M", "1A", "5A", "Máx"]);
  assert.equal(periodFor("monthly", "5D"), "1A");
  assert.equal(periodFor("monthly", "5A"), "5A");
  assert.equal(periodFor("daily", "5D"), "5D");
  const points = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.UTC(2024, index, 28)).toISOString().slice(0, 10),
    month: null,
    close: 10 + index,
    status: "consolidated",
    source: "brapi",
    gapBefore: false,
  }));
  assert.equal(selectSeries(points, "5D").length, 5);
  assert.equal(selectSeries(points, "Máx").length, 30);
  // Back from the last close (2026-06-28), inclusive.
  assert.equal(selectSeries(points, "1A").length, 13);
  assert.equal(selectSeries(points, "6M")[0].date, "2025-12-28");
  assert.equal(selectSeries(points, "6M").length, 7);
});

test("plot rows: a gap breaks the line and the latest quote is a row of its own", () => {
  const series = parsePriceSeries(daily, expected);
  const marker = {
    price: 19.62,
    checkedAt: "2026-11-05T13:48:14.389Z",
    stale: false,
    connect: true,
  };
  const rows = seriesPlot(series.points, { ceiling: 32.74, marker });
  assert.deepEqual(
    rows.map((row) => [
      row.kind,
      row.date,
      row.price,
      row.latest,
      row.connector,
    ]),
    [
      ["point", "2026-10-28", 19, null, null],
      ["gap", null, null, null, null],
      ["point", "2026-10-30", 19.1, null, null],
      ["point", "2026-11-04", 19.4, null, 19.4],
      ["latest", "2026-11-05", null, 19.62, 19.62],
    ],
  );
  assert.ok(rows.every((row) => row.ceiling === 32.74));
  assert.equal(rows[1].gapFrom, "2026-10-28");
  assert.equal(rows[1].gapTo, "2026-10-30");
  // Without "connect" the marker stays alone: no dashed line.
  const alone = seriesPlot(series.points, {
    ceiling: null,
    marker: { ...marker, connect: false },
  });
  assert.ok(alone.every((row) => row.connector === null));
  assert.equal(alone.at(-1).latest, 19.62);
  // A gap before the first point of the window has nothing to break from.
  const window = seriesPlot(series.points.slice(1), {
    ceiling: null,
    marker: null,
  });
  assert.equal(window.filter((row) => row.kind === "gap").length, 0);
});

test("tooltips: São Paulo date, value, basis, status and source", () => {
  const series = parsePriceSeries(daily, expected);
  const marker = {
    price: 19.62,
    checkedAt: "2026-11-05T13:48:14.389Z",
    stale: false,
    connect: true,
  };
  const rows = seriesPlot(series.points, { ceiling: 32.74, marker });
  assert.deepEqual(
    rowTooltip(rows[3], series, { ceiling: true, marker, now }),
    {
      title: "Pregão de 04/11/2026",
      lines: [
        ["Fechamento", "R$ 19,40"],
        ["Base", "sem ajuste"],
        ["Status", "consolidado"],
        ["Fonte", "brapi.dev"],
        ["Preço-teto", "R$ 32,74"],
      ],
    },
  );
  assert.deepEqual(
    rowTooltip(rows[1], series, { ceiling: false, marker, now }),
    {
      title: "Lacuna sem dados",
      lines: [["Período", "sem fechamentos entre 28/10/2026 e 30/10/2026"]],
    },
  );
  const latest = rowTooltip(rows[4], series, { ceiling: false, marker, now });
  assert.equal(
    latest.title,
    "Cotação mais recente — preço nominal de mercado",
  );
  assert.deepEqual(latest.lines, [
    ["Cotação", "R$ 19,62"],
    ["Base", "nominal, sem ajuste"],
    ["Status", "mais recente"],
    ["Fonte", "brapi.dev"],
  ]);
  assert.equal(
    markerTitle({ checkedAt: "2026-11-04T20:55:00Z", stale: true }, now),
    "Cotação mais recente — preço nominal de mercado (defasada)",
  );
  const monthly = parsePriceSeries(
    {
      ...daily,
      granularity: "monthly",
      basis: "adjusted",
      points: [
        {
          date: "2026-08-31",
          month: "2026-08",
          close: "18",
          status: "consolidated",
          source: "brapi",
        },
        {
          date: "2026-09-24",
          month: "2026-09",
          close: "18.5",
          status: "incomplete",
          source: "brapi",
        },
      ],
    },
    { ticker: "TIMS3", basis: "adjusted", granularity: "monthly" },
  );
  const [, incomplete] = seriesPlot(monthly.points, {
    ceiling: null,
    marker: null,
  });
  assert.deepEqual(
    rowTooltip(incomplete, monthly, { ceiling: false, marker: null, now }),
    {
      title: "Mês 09/2026 · pregão de 24/09/2026",
      lines: [
        ["Fechamento", "R$ 18,50"],
        ["Base", "ajustado por proventos"],
        ["Status", "mês incompleto, dados até 24/09"],
        ["Fonte", "brapi.dev"],
      ],
    },
  );
  for (const text of [JSON.stringify(latest), JSON.stringify(rows)])
    assert.doesNotMatch(text, /tempo real/i);
});

test("summary of the window: change, low, high and last close", () => {
  const series = parsePriceSeries(daily, expected);
  const summary = seriesSummary(series.points);
  assert.equal(summary.first, 19);
  assert.equal(summary.last, 19.4);
  assert.equal(summary.min, 19);
  assert.equal(summary.max, 19.4);
  assert.ok(Math.abs(summary.change - (19.4 / 19 - 1)) < 1e-12);
  assert.equal(seriesSummary([]), null);
  assert.equal(seriesSummary(series.points.slice(0, 1)).change, null);
});
