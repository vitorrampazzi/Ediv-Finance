import test from "node:test";
import assert from "node:assert/strict";
import {
  createBrapiProvider,
  normalizeSeries,
} from "../server/market/brapi-provider.js";
import {
  agfNominalTail,
  buildPriceSeries,
} from "../server/market/price-series.js";
import { createQuoteService } from "../server/market/quote-service.js";
import { stockHistory, stockHistoryTickers } from "../server/stock-history.js";

// Chart series of docs/MARGEM-E-HISTORICO.md. The brapi rows below are real
// values of 06/11/2026 (range=max, includeRaw=true): `close` is adjusted for
// stock events only, `rawClose` is the traded price and `adjustedClose` is
// fully adjusted (ITUB4 2025-03-17: 35.34 / 31.1915 / 28.4572).

const at = (iso) => Date.parse(iso);
// brapi stamps each daily bar at 03:00Z, midnight in São Paulo.
const sp = (date) => Date.parse(`${date}T03:00:00Z`) / 1000;
const payload = (symbol, rows) => ({
  results: [
    {
      requestedSymbol: symbol,
      symbol,
      data: { usedInterval: "1d", usedRange: "max", historicalDataPrice: rows },
    },
  ],
});
const itub4Rows = [
  {
    date: sp("2026-11-05"),
    open: 39.71,
    close: 39.97,
    volume: 32694800,
    adjustedClose: 39.97,
    rawClose: 39.97,
  },
  {
    date: sp("2026-11-04"),
    open: 39.3,
    close: 39.71,
    volume: 47053600,
    adjustedClose: 39.71,
    rawClose: 39.71,
  },
  {
    date: sp("2026-11-03"),
    open: 38.47,
    close: 38.49,
    volume: 43485400,
    adjustedClose: 38.49,
    rawClose: 38.49,
  },
  {
    date: sp("2026-10-30"),
    open: 39.2,
    close: 38.69,
    volume: 51157200,
    adjustedClose: 38.675,
    rawClose: 38.69,
  },
  {
    date: sp("2026-10-29"),
    open: 40,
    close: 39.54,
    volume: 40030500,
    adjustedClose: 39.5247,
    rawClose: 39.54,
  },
  {
    date: sp("2025-03-18"),
    open: 31.3689,
    close: 31.3592,
    volume: 29878800,
    adjustedClose: 28.6102,
    rawClose: 32.3,
  },
  {
    date: sp("2025-03-17"),
    open: 30.2648,
    close: 31.1915,
    volume: 27108400,
    adjustedClose: 28.4572,
    rawClose: 35.34,
  },
  {
    date: sp("2025-03-14"),
    open: 29.4793,
    close: 30.2824,
    volume: 31638000,
    adjustedClose: 27.6278,
    rawClose: 34.31,
  },
];
const brapiSeries = (rows, checkedAt, extra = {}) => ({
  points: normalizeSeries(payload("ITUB4", rows), "ITUB4"),
  checkedAt,
  freshness: "delayed",
  reason: null,
  range: "max",
  includeRaw: true,
  ...extra,
});
const quoteAt = (checkedAt, price = "39.97000000", freshness = "delayed") => ({
  price,
  checkedAt,
  freshness,
});
const dates = (points) => points.map((point) => point.date);

test("brapi: série compacta sem o close, mais antiga primeiro e um ponto por dia", () => {
  const rows = [
    ...itub4Rows.slice(0, 2),
    // Same São Paulo day (02:00 there), later stamp: it wins over 00:00.
    {
      date: sp("2026-11-04") + 7200,
      close: 1,
      adjustedClose: 39.8,
      rawClose: 39.8,
    },
    // 02:00Z is still the previous day in São Paulo.
    {
      date: sp("2026-11-04") - 3600,
      close: 1,
      adjustedClose: 38,
      rawClose: 38,
    },
    { date: sp("2026-11-02"), close: 0, adjustedClose: 0, rawClose: null },
    { date: "garbage", adjustedClose: 5, rawClose: 5 },
  ];
  assert.deepEqual(normalizeSeries(payload("ITUB4", rows), "ITUB4"), [
    ["2026-11-03", 38, 38],
    ["2026-11-04", 39.8, 39.8],
    ["2026-11-05", 39.97, 39.97],
  ]);
  const compact = normalizeSeries(payload("ITUB4", itub4Rows), "ITUB4");
  assert.deepEqual(
    compact.find((row) => row[0] === "2025-03-17"),
    ["2025-03-17", 28.4572, 35.34],
  );
  assert.ok(
    !JSON.stringify(compact).includes("31.1915"),
    "The stock-event-only close is never kept",
  );
  // Without includeRaw brapi sends no rawClose: only the adjusted value stays.
  assert.deepEqual(
    normalizeSeries(
      payload("TIMS3", [
        { date: sp("2026-11-05"), close: 19.6, adjustedClose: 19.6 },
      ]),
      "TIMS3",
    ),
    [["2026-11-05", 19.6, null]],
  );
});

function seriesStore() {
  const rows = new Map();
  return {
    rows,
    async read(key) {
      const row = rows.get(key);
      return row
        ? { data: structuredClone(row), fresh: true, expiresAt: Infinity }
        : null;
    },
    async write(key, payload) {
      rows.set(key, structuredClone(payload));
    },
    async reserveCall(key, kind, budget) {
      const usage = rows.get(key) || { perTicker: 0, catalog: 0 };
      rows.set(key, usage);
      if (kind === "perTicker" && usage.perTicker >= budget) return false;
      usage[kind]++;
      return true;
    },
  };
}

function seriesService({
  token = null,
  plan = "free",
  dailyBudget = 10,
  historyRoute,
} = {}) {
  const calls = [];
  const store = seriesStore();
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url);
    calls.push({
      path: parsed.pathname,
      query: parsed.search,
      headers: init.headers,
    });
    if (parsed.pathname === "/api/quote/list")
      return Response.json({
        stocks: [
          { stock: "PETR4", close: 45.95, change: -2.48, volume: 53109700 },
          { stock: "TIMS3", close: 19.62, change: -0.91, volume: 367700 },
        ],
      });
    if (historyRoute) return historyRoute(parsed);
    return Response.json(
      payload(parsed.searchParams.get("symbols"), itub4Rows),
    );
  };
  const service = createQuoteService({
    provider: createBrapiProvider({
      token,
      fetchImpl,
      log: () => {},
      now: () => at("2026-11-05T14:00:00Z"),
    }),
    store,
    hasToken: Boolean(token),
    plan,
    dailyBudget,
    now: () => at("2026-11-05T14:00:00Z"),
    log: () => {},
    sleep: async () => {},
  });
  const history = () =>
    calls.filter((call) => call.path === "/api/v2/stocks/historical");
  return { service, calls, store, history };
}

test("série da brapi: demonstração com max e includeRaw, plano define o período", async () => {
  const demo = seriesService();
  const listed = await demo.service.catalog();
  const first = await demo.service.series("PETR4", listed);
  assert.equal(first.reason, null);
  assert.equal(first.range, "max");
  assert.equal(first.includeRaw, true);
  assert.equal(first.freshness, "delayed");
  assert.equal(first.checkedAt, "2026-11-05T14:00:00.000Z");
  assert.deepEqual(first.points[0], ["2025-03-14", 27.6278, 34.31]);
  assert.equal(
    demo.history()[0].query,
    "?symbols=PETR4&range=max&interval=1d&includeRaw=true",
  );
  // The cache keeps the compact series, never the raw payload.
  const cached = demo.store.rows.get("market:series:PETR4:max:raw");
  assert.deepEqual(cached.value, first.points);
  assert.doesNotMatch(
    JSON.stringify(cached),
    /rawOpen|historicalDataPrice|31\.1915/,
  );
  await demo.service.series("PETR4", listed);
  assert.equal(demo.history().length, 1, "Second read comes from the cache");
  // Without a token, other tickers are never requested.
  const tims = await demo.service.series("TIMS3", listed);
  assert.equal(tims.reason, "no_token");
  assert.equal(tims.points, null);
  assert.equal(demo.history().length, 1);

  for (const [plan, query] of [
    ["free", "?symbols=TIMS3&range=3mo&interval=1d"],
    ["startup", "?symbols=TIMS3&range=1y&interval=1d"],
    ["pro", "?symbols=TIMS3&range=max&interval=1d&includeRaw=true"],
  ]) {
    const paid = seriesService({ token: "tok_series_secret", plan });
    const result = await paid.service.series(
      "TIMS3",
      await paid.service.catalog(),
    );
    assert.equal(result.reason, null, plan);
    assert.equal(paid.history()[0].query, query, plan);
    assert.equal(
      paid.history()[0].headers.Authorization,
      "Bearer tok_series_secret",
    );
    assert.doesNotMatch(paid.history()[0].query, /tok_series_secret/);
  }
  // A ticker the loaded list lacks spends nothing (EMAE4 case).
  const token = seriesService({ token: "tok" });
  assert.equal(
    (await token.service.series("EMAE4", await token.service.catalog())).reason,
    "not_covered",
  );
  assert.equal(token.history().length, 0);
});

test("série da brapi: 404, erro, orçamento e motivo no contrato", async () => {
  const missing = seriesService({
    historyRoute: () => new Response("{}", { status: 404 }),
  });
  const listed = await missing.service.catalog();
  assert.equal(
    (await missing.service.series("PETR4", listed)).reason,
    "not_covered",
  );
  // The refusal is remembered for the cache cycle and keeps its meaning.
  assert.equal(
    (await missing.service.series("PETR4", listed)).reason,
    "not_covered",
  );
  assert.equal(missing.history().length, 1);
  const down = seriesService({
    historyRoute: () => new Response("{}", { status: 502 }),
  });
  assert.equal(
    (await down.service.series("PETR4", await down.service.catalog())).reason,
    "provider_error",
  );
  const budget = seriesService({ dailyBudget: 0 });
  assert.equal(
    (await budget.service.series("PETR4", await budget.service.catalog()))
      .reason,
    "budget",
  );
  assert.equal(budget.history().length, 0);
});

test("bases: nominal é o rawClose, ajustada é o adjustedClose, nada ajustado duas vezes", () => {
  const brapi = brapiSeries(itub4Rows, "2026-11-05T22:00:00.000Z");
  const now = at("2026-11-05T23:00:00Z");
  const quote = quoteAt("2026-11-05T22:30:00.000Z");
  const adjusted = buildPriceSeries({ ticker: "ITUB4", brapi, quote, now });
  const nominal = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi,
    quote,
    now,
  });
  assert.equal(
    adjusted.basis,
    "adjusted",
    "Adjusted is the default when it exists",
  );
  assert.deepEqual(adjusted.availableBases, ["adjusted", "nominal"]);
  assert.equal(adjusted.defaultBasis, "adjusted");
  assert.deepEqual(adjusted.points, [
    {
      date: "2025-03-14",
      close: "27.62780000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2025-03-17",
      close: "28.45720000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2025-03-18",
      close: "28.61020000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-10-29",
      close: "39.52470000",
      status: "consolidated",
      source: "brapi",
      gapBefore: true,
    },
    {
      date: "2026-10-30",
      close: "38.67500000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-11-03",
      close: "38.49000000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-11-04",
      close: "39.71000000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-11-05",
      close: "39.97000000",
      status: "consolidated",
      source: "brapi",
    },
  ]);
  assert.deepEqual(
    nominal.points.map((point) => [point.date, point.close]).slice(0, 3),
    [
      ["2025-03-14", "34.31000000"],
      ["2025-03-17", "35.34000000"],
      ["2025-03-18", "32.30000000"],
    ],
  );
  // Every value is the vendor's, as received: no factor is applied here.
  const byDate = new Map(
    itub4Rows.map((row) => [
      new Date((row.date - 3 * 3600) * 1000).toISOString().slice(0, 10),
      row,
    ]),
  );
  for (const point of adjusted.points)
    assert.equal(
      Number(point.close),
      byDate.get(point.date).adjustedClose,
      point.date,
    );
  for (const point of nominal.points) {
    assert.equal(
      Number(point.close),
      byDate.get(point.date).rawClose,
      point.date,
    );
    assert.equal(
      point.gapBefore,
      point.date === "2026-10-29" ? true : undefined,
    );
  }
  assert.ok(
    !JSON.stringify(nominal).includes("31.19150000"),
    "close is never nominal",
  );
  assert.deepEqual(adjusted.latestQuote, {
    price: "39.97000000",
    checkedAt: "2026-11-05T22:30:00.000Z",
    freshness: "delayed",
    connect: true,
    reason: null,
  });
  assert.deepEqual(adjusted.coverage, {
    from: "2025-03-14",
    to: "2026-11-05",
    segments: [{ from: "2025-03-14", to: "2026-11-05", source: "brapi" }],
    notes: [
      "Preços ajustados por proventos e eventos pela brapi, sem ajuste próprio da Escola.",
    ],
  });
  assert.equal(adjusted.unavailableReason, null);
  assert.equal(adjusted.checkedAt, "2026-11-05T22:00:00.000Z");
  assert.deepEqual(Object.keys(adjusted), [
    "ticker",
    "basis",
    "granularity",
    "availableBases",
    "defaultBasis",
    "points",
    "latestQuote",
    "coverage",
    "unavailableReason",
    "checkedAt",
  ]);
});

test("pregão em andamento fica de fora até as 19:00 e só entra se lido a partir das 19:00", () => {
  const during = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi: brapiSeries(itub4Rows, "2026-11-05T14:55:00.000Z"),
    quote: quoteAt("2026-11-05T14:50:00.000Z"),
    now: at("2026-11-05T15:00:00Z"),
  });
  assert.equal(dates(during.points).at(-1), "2026-11-04");
  assert.ok(
    during.coverage.notes.some((note) => /depois das 19:00/.test(note)),
  );
  // Last point is the previous session: the marker connects.
  assert.equal(during.latestQuote.connect, true);
  // 19:05, but the cached bar was read at 18:10: not a final close yet.
  const early = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi: brapiSeries(itub4Rows, "2026-11-05T21:10:00.000Z"),
    quote: quoteAt("2026-11-05T22:00:00.000Z"),
    now: at("2026-11-05T22:05:00Z"),
  });
  assert.equal(dates(early.points).at(-1), "2026-11-04");
  assert.equal(early.latestQuote.connect, true);
  // QA M1: read at 18:40 the bar may still be from before the closing
  // auction; at 18:59 too. Only a read from 19:00 is final.
  for (const read of ["2026-11-05T21:40:00.000Z", "2026-11-05T21:59:59.000Z"]) {
    const preAuction = buildPriceSeries({
      ticker: "ITUB4",
      basis: "nominal",
      brapi: brapiSeries(itub4Rows, read),
      quote: quoteAt("2026-11-05T22:00:00.000Z"),
      now: at("2026-11-05T22:05:00Z"),
    });
    assert.equal(dates(preAuction.points).at(-1), "2026-11-04", read);
  }
  const late = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi: brapiSeries(itub4Rows, "2026-11-05T22:00:00.000Z"),
    quote: quoteAt("2026-11-05T22:00:00.000Z"),
    now: at("2026-11-05T22:05:00Z"),
  });
  assert.equal(dates(late.points).at(-1), "2026-11-05");
  assert.ok(!late.coverage.notes.some((note) => /depois das 19:00/.test(note)));
  assert.equal(late.latestQuote.connect, true, "Same session as the quote");
});

test("marcador: lacuna, base diferente e cotação indisponível", () => {
  // Tuesday 03/11 11:00, after Finados: the previous session is Friday 30/10,
  // where ITUB4 adjustedClose (38.675) is not the traded price (38.69).
  const brapi = brapiSeries(itub4Rows, "2026-11-03T13:30:00.000Z");
  const now = at("2026-11-03T14:00:00Z");
  const quote = quoteAt("2026-11-03T13:50:00.000Z", "38.40000000");
  const adjusted = buildPriceSeries({ ticker: "ITUB4", brapi, quote, now });
  assert.equal(dates(adjusted.points).at(-1), "2026-10-30");
  assert.deepEqual(
    [adjusted.latestQuote.connect, adjusted.latestQuote.reason],
    [false, "base_mismatch"],
  );
  const nominal = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi,
    quote,
    now,
  });
  assert.deepEqual(
    [nominal.latestQuote.connect, nominal.latestQuote.reason],
    [true, null],
  );
  // A missing session before the quote breaks the line.
  const gap = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi: brapiSeries(itub4Rows.slice(2), "2026-11-05T14:00:00.000Z"),
    quote: quoteAt("2026-11-05T14:00:00.000Z"),
    now: at("2026-11-05T15:00:00Z"),
  });
  assert.equal(dates(gap.points).at(-1), "2026-11-03");
  assert.deepEqual(
    [gap.latestQuote.connect, gap.latestQuote.reason],
    [false, "gap"],
  );
  // A quote older than the last point does not connect either.
  const older = buildPriceSeries({
    ticker: "ITUB4",
    basis: "nominal",
    brapi: brapiSeries(itub4Rows, "2026-11-05T22:00:00.000Z"),
    quote: quoteAt("2026-11-03T14:00:00.000Z", "38.40000000", "stale"),
    now: at("2026-11-05T23:00:00Z"),
  });
  assert.deepEqual(
    [
      older.latestQuote.freshness,
      older.latestQuote.connect,
      older.latestQuote.reason,
    ],
    ["stale", false, "gap"],
  );
  for (const quote of [
    null,
    {
      price: null,
      checkedAt: "2026-11-05T14:00:00.000Z",
      freshness: "unavailable",
    },
  ])
    assert.equal(
      buildPriceSeries({ ticker: "ITUB4", brapi, quote, now }).latestQuote,
      null,
    );
});

test("AGF: só o trecho final com até 2 casas é usado, igual ao snapshot verificado", () => {
  const tail = agfNominalTail([
    { date: "2012-01-02", close: 6.54325 },
    // A two-decimal value inside the adjusted part does not restart the tail.
    { date: "2015-06-01", close: 6.5 },
    { date: "2024-08-21", close: 36.9744926761 },
    { date: "2024-08-22", close: 37.12 },
    { date: "2024-08-23", close: 37.3 },
    { date: "2024-08-26", close: 38 },
  ]);
  assert.deepEqual(tail, {
    points: [
      { date: "2024-08-22", close: "37.12000000" },
      { date: "2024-08-23", close: "37.30000000" },
      { date: "2024-08-26", close: "38.00000000" },
    ],
    firstDate: "2024-08-22",
    excluded: 3,
  });
  assert.deepEqual(agfNominalTail([{ date: "2020-01-02", close: 1e-7 }]), {
    points: [],
    firstDate: null,
    excluded: 1,
  });
  assert.deepEqual(agfNominalTail(undefined), {
    points: [],
    firstDate: null,
    excluded: 0,
  });

  // The packaged snapshot (23/10/2026), as verified on 06/11/2026.
  const tails = new Map(
    stockHistoryTickers().map((ticker) => [
      ticker,
      agfNominalTail(stockHistory(ticker).prices),
    ]),
  );
  assert.equal(tails.size, 90);
  assert.equal(tails.get("PETR4").firstDate, "2024-08-22");
  assert.equal(tails.get("VALE3").firstDate, "2024-08-05");
  assert.equal(tails.get("ITUB4").firstDate, "2024-06-21");
  assert.equal(tails.get("PASS3").points.length, 117);
  const lengths = [...tails.values()]
    .map((item) => item.points.length)
    .sort((a, b) => a - b);
  assert.equal(lengths[0], 117);
  assert.equal((lengths[44] + lengths[45]) / 2, 556, "Median");
  for (const [ticker, item] of tails) {
    assert.equal(item.points.at(-1).date, "2026-10-23", ticker);
    for (const point of item.points)
      assert.match(point.close, /^\d+\.\d{2}0{6}$/, `${ticker} ${point.date}`);
  }
  // The real PETR4 value of 02/01/2012 (6.54 adjusted by AGF) is never served.
  assert.ok(
    !tails.get("PETR4").points.some((point) => point.date < "2024-08-22"),
  );
});

const agfFixture = {
  points: [
    { date: "2026-10-20", close: "52.00000000" },
    { date: "2026-10-21", close: "52.50000000" },
    { date: "2026-10-22", close: "52.00000000" },
    { date: "2026-10-23", close: "53.20000000" },
  ],
  firstDate: "2026-10-20",
  excluded: 2,
};

test("nominal sem token: AGF e Escola, prioridade, lacunas e feriados", () => {
  const logs = [];
  const result = buildPriceSeries({
    ticker: "TIMS3",
    brapi: {
      points: null,
      checkedAt: null,
      freshness: "unavailable",
      reason: "no_token",
      range: null,
      includeRaw: false,
    },
    escola: [
      // Within 0.5% of the AGF value: the Escola wins without a conflict.
      { date: "2026-10-23", close: "53.40000000" },
      // A row on Finados (holiday) is not a session and is dropped.
      { date: "2026-11-02", close: "51.00000000" },
      { date: "2026-11-03", close: "50.71000000" },
      { date: "2026-11-04", close: "47.12000000" },
      { date: "2026-11-05", close: "45.95000000" },
    ],
    agf: agfFixture,
    quote: quoteAt("2026-11-05T22:30:00.000Z", "45.95000000"),
    now: at("2026-11-05T23:00:00Z"),
    log: (entry) => logs.push(entry),
  });
  assert.equal(result.basis, "nominal");
  assert.deepEqual(result.availableBases, ["nominal"]);
  assert.equal(result.defaultBasis, "nominal");
  assert.deepEqual(
    result.points.map((point) => [
      point.date,
      point.source,
      point.gapBefore ?? false,
    ]),
    [
      ["2026-10-20", "agf", false],
      ["2026-10-21", "agf", false],
      ["2026-10-22", "agf", false],
      ["2026-10-23", "escola", false],
      ["2026-11-03", "escola", true],
      ["2026-11-04", "escola", false],
      ["2026-11-05", "escola", false],
    ],
  );
  assert.equal(result.points[3].close, "53.40000000");
  assert.deepEqual(result.coverage.segments, [
    { from: "2026-10-20", to: "2026-10-22", source: "agf" },
    { from: "2026-10-23", to: "2026-11-05", source: "escola" },
  ]);
  assert.deepEqual(result.coverage.notes, [
    "O histórico da AGF anterior a 20/10/2026 foi ajustado por um método não documentado e não é usado.",
  ]);
  assert.deepEqual(logs, []);
  assert.equal(result.latestQuote.connect, true);
  assert.equal(result.checkedAt, null);
  assert.equal(result.unavailableReason, null);
  // The adjusted basis does not exist without brapi; the answer says why.
  const adjusted = buildPriceSeries({
    ticker: "TIMS3",
    basis: "adjusted",
    brapi: { points: null, reason: "no_token", includeRaw: false },
    agf: agfFixture,
    now: at("2026-11-05T23:00:00Z"),
  });
  assert.deepEqual(adjusted.points, []);
  assert.equal(adjusted.unavailableReason, "no_token");
  assert.deepEqual(adjusted.availableBases, ["nominal"]);
  assert.equal(adjusted.latestQuote, null);
});

test("conflito acima de 0,5%: vale a fonte de maior prioridade e há log", () => {
  const logs = [];
  const result = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    brapi: {
      points: normalizeSeries(
        payload("PETR4", [
          {
            date: sp("2026-10-23"),
            close: 58.68,
            adjustedClose: 58.68,
            rawClose: 58.68,
          },
          {
            date: sp("2026-10-22"),
            close: 57.83,
            adjustedClose: 57.83,
            rawClose: 57.83,
          },
        ]),
        "PETR4",
      ),
      checkedAt: "2026-11-05T22:00:00.000Z",
      freshness: "delayed",
      reason: null,
      includeRaw: true,
    },
    escola: [{ date: "2026-10-21", close: "55.00000000" }],
    agf: agfFixture,
    now: at("2026-11-05T23:00:00Z"),
    log: (entry) => logs.push(entry),
  });
  assert.deepEqual(
    result.points.map((point) => [point.date, point.close, point.source]),
    [
      ["2026-10-20", "52.00000000", "agf"],
      ["2026-10-21", "55.00000000", "escola"],
      ["2026-10-22", "57.83000000", "brapi"],
      ["2026-10-23", "58.68000000", "brapi"],
    ],
  );
  assert.deepEqual(logs, [
    {
      event: "price_source_conflict",
      ticker: "PETR4",
      dates: 3,
      first: "2026-10-21",
      last: "2026-10-23",
      sources: ["escola>agf", "brapi>agf"],
    },
  ]);
  assert.ok(
    result.coverage.notes.includes(
      "Em 3 datas, as fontes de preço nominal diferem mais de 0,5%; vale a de maior prioridade.",
    ),
  );
  // The difference is measured against the value kept (higher priority), in
  // exact decimals: exactly 0.5% is not a conflict, just above it is.
  const edge = (brapiClose, agfClose) => {
    const entries = [];
    buildPriceSeries({
      ticker: "PETR4",
      basis: "nominal",
      brapi: {
        points: [["2026-10-20", null, brapiClose]],
        checkedAt: "2026-11-05T22:00:00.000Z",
        includeRaw: true,
      },
      agf: {
        points: [{ date: "2026-10-20", close: agfClose }],
        firstDate: "2026-10-20",
        excluded: 0,
      },
      now: at("2026-11-05T23:00:00Z"),
      log: (entry) => entries.push(entry),
    });
    return entries.length;
  };
  assert.equal(edge(200, "201.00000000"), 0, "1 / 200 = 0.5%");
  assert.equal(edge(200, "201.00000001"), 1);
  assert.equal(edge(200, "199.00000000"), 0);
  assert.equal(edge(200, "198.99999999"), 1);
  assert.equal(edge(100.5, "100.00000000"), 0);
  assert.equal(edge(99.5, "100.00000000"), 1, "0.5 / 99.5 > 0.5%");
});

test("mensal: último pregão do mês, consolidado ou incompleto, e mês corrente fora", () => {
  const agf = {
    points: [
      { date: "2026-06-30", close: "40.00000000" },
      { date: "2026-08-31", close: "41.00000000" },
      { date: "2026-09-29", close: "42.00000000" },
      { date: "2026-09-30", close: "42.50000000" },
      { date: "2026-10-22", close: "43.00000000" },
      { date: "2026-10-23", close: "43.50000000" },
    ],
    firstDate: "2026-06-30",
    excluded: 0,
  };
  const base = {
    ticker: "TIMS3",
    granularity: "monthly",
    brapi: { points: null, reason: "no_token", includeRaw: false },
    agf,
    quote: quoteAt("2026-11-05T22:30:00.000Z", "44.00000000"),
    now: at("2026-11-05T23:00:00Z"),
  };
  const incomplete = buildPriceSeries({
    ...base,
    escola: [{ date: "2026-11-04", close: "44.10000000" }],
  });
  assert.deepEqual(incomplete.points, [
    {
      date: "2026-06-30",
      month: "2026-06",
      close: "40.00000000",
      status: "consolidated",
      source: "agf",
    },
    {
      date: "2026-08-31",
      month: "2026-08",
      close: "41.00000000",
      status: "consolidated",
      source: "agf",
      gapBefore: true,
    },
    {
      date: "2026-09-30",
      month: "2026-09",
      close: "42.50000000",
      status: "consolidated",
      source: "agf",
    },
    {
      date: "2026-10-23",
      month: "2026-10",
      close: "43.50000000",
      status: "incomplete",
      source: "agf",
    },
  ]);
  assert.deepEqual(
    [incomplete.latestQuote.connect, incomplete.latestQuote.reason],
    [false, "gap"],
  );
  const complete = buildPriceSeries({
    ...base,
    escola: [{ date: "2026-10-30", close: "43.90000000" }],
  });
  assert.deepEqual(complete.points.at(-1), {
    date: "2026-10-30",
    month: "2026-10",
    close: "43.90000000",
    status: "consolidated",
    source: "escola",
  });
  assert.equal(complete.latestQuote.connect, true);
  // December 2026 ends on the 30th (24, 25 and 31 have no session).
  const january = buildPriceSeries({
    ...base,
    agf: {
      points: [{ date: "2026-12-30", close: "45.00000000" }],
      firstDate: "2026-12-30",
      excluded: 0,
    },
    escola: [],
    quote: quoteAt("2027-01-15T15:00:00.000Z", "46.00000000"),
    now: at("2027-01-15T15:30:00Z"),
  });
  assert.deepEqual(january.points, [
    {
      date: "2026-12-30",
      month: "2026-12",
      close: "45.00000000",
      status: "consolidated",
      source: "agf",
    },
  ]);
  assert.equal(january.latestQuote.connect, true);
});

test("ano sem calendário conferido: feriado não vira lacuna e a resposta avisa", () => {
  const result = buildPriceSeries({
    ticker: "EMAE4",
    brapi: { points: null, reason: "no_token", includeRaw: false },
    agf: {
      points: [
        { date: "2023-12-22", close: "30.00000000" },
        // 25/12/2023 is not in the verified calendar: one missing weekday is
        // taken as a holiday, not as a hole.
        { date: "2023-12-26", close: "30.10000000" },
        // A verified year in between keeps the exact rule.
        { date: "2024-12-23", close: "31.00000000" },
        // 24 and 25/12/2024 are verified no-session days: no gap here.
        { date: "2024-12-26", close: "31.20000000" },
      ],
      firstDate: "2023-12-22",
      excluded: 0,
    },
    now: at("2026-11-05T23:00:00Z"),
  });
  assert.deepEqual(
    result.points.map((point) => [point.date, point.gapBefore ?? false]),
    [
      ["2023-12-22", false],
      ["2023-12-26", false],
      ["2024-12-23", true],
      ["2024-12-26", false],
    ],
  );
  assert.equal(
    result.coverage.notes[0],
    "Sem calendário da B3 conferido para 2023: nesses anos, um feriado não vira lacuna; o traço só é interrompido com 3 ou mais dias úteis seguidos sem dado, e o mês só fica incompleto quando faltam 3 ou mais dias úteis no fim.",
  );
  // Ranges of years are joined in one sentence.
  const wide = buildPriceSeries({
    ticker: "PETR4",
    brapi: {
      points: [
        ["2000-01-03", 0.75, 469.97],
        ["2021-06-01", 20, 28],
        ["2027-01-04", 50, 50],
      ],
      checkedAt: "2027-01-05T12:00:00.000Z",
      includeRaw: true,
    },
    now: at("2027-01-05T12:30:00Z"),
  });
  assert.match(wide.coverage.notes[0], /conferido para 2000 a 2023 e 2027:/);
});

// A long series like brapi `max` of a demonstration ticker, in years the B3
// calendar does not cover: every weekday of 2018 to 2023 except the recurring
// national holidays (Carnaval, Sexta-feira Santa and Corpus Christi from
// Easter, plus the fixed dates) and 24 and 31/12.
const easter = {
  2018: "2018-04-01",
  2019: "2019-04-21",
  2020: "2020-04-12",
  2021: "2021-04-04",
  2022: "2022-04-17",
  2023: "2023-04-09",
};
const shiftDay = (date, days) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const oldHolidays = new Set(
  Object.entries(easter).flatMap(([year, sunday]) => [
    shiftDay(sunday, -48),
    shiftDay(sunday, -47),
    shiftDay(sunday, -2),
    shiftDay(sunday, 60),
    ...["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15"].map(
      (day) => `${year}-${day}`,
    ),
    ...["12-24", "12-25", "12-31"].map((day) => `${year}-${day}`),
  ]),
);
function demoLikeRows(skip = new Set()) {
  const rows = [];
  let cents = 2000;
  for (
    let date = "2018-01-02";
    date <= "2023-12-29";
    date = shiftDay(date, 1)
  ) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (
      weekday === 0 ||
      weekday === 6 ||
      oldHolidays.has(date) ||
      skip.has(date)
    )
      continue;
    cents += 1;
    rows.push([date, cents / 100, cents / 100]);
  }
  return rows;
}
const demoLike = (rows, extra = {}) =>
  buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    brapi: {
      points: rows,
      checkedAt: "2026-11-05T22:00:00.000Z",
      freshness: "delayed",
      reason: null,
      includeRaw: true,
    },
    now: at("2026-11-05T23:00:00Z"),
    ...extra,
  });

test("série longa em anos sem calendário: feriados antigos não interrompem o traço", () => {
  assert.equal(oldHolidays.has("2020-02-24"), true, "Carnaval Monday 2020");
  assert.equal(oldHolidays.has("2020-02-25"), true, "Carnaval Tuesday 2020");
  const rows = demoLikeRows();
  const daily = demoLike(rows);
  assert.equal(daily.points.length, rows.length);
  assert.deepEqual(
    daily.points.filter((point) => point.gapBefore).map((point) => point.date),
    [],
  );
  assert.match(
    daily.coverage.notes[0],
    /conferido para 2018 a 2023: nesses anos, um feriado não vira lacuna/,
  );
  // Months ending on a holiday (31/12/2018, a Monday) stay consolidated.
  const monthly = demoLike(rows, { granularity: "monthly" });
  assert.equal(monthly.points.length, 72);
  assert.deepEqual(
    monthly.points.filter(
      (point) => point.status !== "consolidated" || point.gapBefore,
    ),
    [],
  );
  const december = monthly.points.find((point) => point.month === "2018-12");
  assert.deepEqual(
    [december.date, december.status],
    ["2018-12-28", "consolidated"],
  );
});

test("série longa com um buraco real de 5 dias úteis: só ali o traço é interrompido", () => {
  const hole = new Set([
    "2021-08-09",
    "2021-08-10",
    "2021-08-11",
    "2021-08-12",
    "2021-08-13",
  ]);
  const daily = demoLike(demoLikeRows(hole));
  assert.deepEqual(
    daily.points.filter((point) => point.gapBefore).map((point) => point.date),
    ["2021-08-16"],
  );
  // Three missing weekdays are already a hole; two could be holidays.
  const three = demoLike(
    demoLikeRows(new Set(["2022-06-22", "2022-06-23", "2022-06-24"])),
  );
  assert.deepEqual(
    three.points.filter((point) => point.gapBefore).map((point) => point.date),
    ["2022-06-27"],
  );
  const two = demoLike(demoLikeRows(new Set(["2022-06-23", "2022-06-24"])));
  assert.equal(
    two.points.some((point) => point.gapBefore),
    false,
  );
  // A month missing its last three weekdays is incomplete.
  const lateHole = demoLike(
    demoLikeRows(new Set(["2019-07-29", "2019-07-30", "2019-07-31"])),
    {
      granularity: "monthly",
    },
  );
  assert.deepEqual(
    lateHole.points
      .filter((point) => point.status === "incomplete")
      .map((point) => [point.month, point.date]),
    [["2019-07", "2019-07-26"]],
  );
});

test("virada para 2027 sem calendário: 01/01 não vira lacuna e o marcador se liga", () => {
  const result = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    brapi: {
      points: [
        ["2026-12-29", 50, 50],
        ["2026-12-30", 51, 51],
        ["2027-01-04", 52, 52],
      ],
      checkedAt: "2027-01-05T12:00:00.000Z",
      freshness: "delayed",
      includeRaw: true,
    },
    quote: quoteAt("2027-01-05T14:00:00.000Z", "52.50000000"),
    now: at("2027-01-05T14:30:00Z"),
  });
  assert.equal(
    result.points.some((point) => point.gapBefore),
    false,
  );
  assert.equal(result.latestQuote.connect, true);
  // Monday 04/01 before the opening: the quote's session falls back to
  // Friday 01/01 (Monday to Friday), and the last point 30/12 still connects.
  const early = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    brapi: {
      points: [
        ["2026-12-29", 50, 50],
        ["2026-12-30", 51, 51],
      ],
      checkedAt: "2027-01-04T12:00:00.000Z",
      freshness: "delayed",
      includeRaw: true,
    },
    quote: quoteAt("2027-01-04T12:30:00.000Z", "51.00000000"),
    now: at("2027-01-04T12:45:00Z"),
  });
  assert.equal(early.latestQuote.connect, true);
});

test("motivos de indisponibilidade e histórico defasado da brapi", () => {
  const now = at("2026-11-05T23:00:00Z");
  for (const reason of ["budget", "provider_error", "not_covered"]) {
    const result = buildPriceSeries({
      ticker: "PETR4",
      brapi: { points: null, reason, includeRaw: true },
      now,
    });
    assert.deepEqual(result.points, []);
    assert.equal(result.basis, "nominal");
    assert.equal(result.defaultBasis, null);
    assert.deepEqual(result.availableBases, []);
    assert.equal(result.unavailableReason, reason);
    assert.deepEqual(result.coverage, {
      from: null,
      to: null,
      segments: [],
      notes: [],
    });
  }
  // Without raw prices, a missing nominal series is "not covered" unless the
  // reason is the token.
  assert.equal(
    buildPriceSeries({
      ticker: "WEGE3",
      brapi: { points: null, reason: "no_token" },
      now,
    }).unavailableReason,
    "no_token",
  );
  assert.equal(
    buildPriceSeries({
      ticker: "WEGE3",
      basis: "nominal",
      brapi: {
        points: [["2026-11-04", 50, null]],
        checkedAt: "2026-11-05T22:00:00.000Z",
        includeRaw: false,
      },
      now,
    }).unavailableReason,
    "not_covered",
  );
  const stale = buildPriceSeries({
    ticker: "ITUB4",
    brapi: brapiSeries(itub4Rows, "2026-11-05T22:00:00.000Z", {
      freshness: "stale",
    }),
    now,
  });
  assert.ok(
    stale.coverage.notes.some((note) => /última consulta válida/.test(note)),
  );
});
