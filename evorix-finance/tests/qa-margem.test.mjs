import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSafetyMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";
import { normalizeSeries } from "../server/market/brapi-provider.js";
import {
  agfNominalTail,
  buildPriceSeries,
} from "../server/market/price-series.js";
import {
  rankingMarketBody,
  safetyMarginFor,
} from "../server/market/ranking-market.js";
import {
  cacheTtlMs,
  marketSession,
  tradingSessionDate,
} from "../server/market/market-session.js";
import {
  closingSessionFor,
  createDailyCloses,
} from "../server/market/daily-closes.js";
import { stockHistory } from "../server/stock-history.js";
import {
  marketView,
  parseRankingMarket,
  publicationMarket,
} from "../src/lib/marketData.ts";
import { parsePriceSeries, seriesPlot } from "../src/lib/priceSeries.ts";

// Independent QA of docs/MARGEM-E-HISTORICO.md: the owner's financial tests
// A to F, through the shared module, the server objects, the real Express
// routes (SQL answered in memory, brapi.dev simulated) and the pure UI
// functions. D uses real brapi rows of 06/11/2026 (range=max,
// includeRaw=true, no token). Nothing leaves the process.

const at = (iso) => Date.parse(iso);
// brapi stamps each daily bar at 03:00Z, midnight in São Paulo.
const stamp = (date) => at(`${date}T03:00:00Z`) / 1000;
// Rows [date, close, adjustedClose, rawClose] as brapi sends them, newest first.
const historyPayload = (symbol, rows) => ({
  results: [
    {
      requestedSymbol: symbol,
      symbol,
      data: {
        usedInterval: "1d",
        usedRange: "max",
        historicalDataPrice: [...rows].reverse().map(([date, c, a, r]) => ({
          date: stamp(date),
          close: c,
          adjustedClose: a,
          rawClose: r,
          volume: 1000,
        })),
      },
    },
  ],
});
const brapiSeries = (symbol, rows, checkedAt, extra = {}) => ({
  points: normalizeSeries(historyPayload(symbol, rows), symbol),
  checkedAt,
  freshness: "delayed",
  reason: null,
  range: "max",
  includeRaw: true,
  ...extra,
});
const quoteOf = (price, checkedAt, freshness = "delayed") => ({
  price,
  checkedAt,
  freshness,
});
const eight = (value) => Number(value).toFixed(8);
const ratio = (points, adjusted, date) =>
  Number(adjusted.get(date)) / Number(points.get(date));
const byDate = (series) =>
  new Map(series.points.map((point) => [point.date, point.close]));

// Real brapi rows of 06/11/2026 (PETR4: JCP and dividends with ex-date
// 24/08/2026; ITUB4: 10% bonus on 18/03/2025 and 3% on 26/12/2025). `close`
// is adjusted for stock events only; brapi left rawClose null on the bar of
// the day (06/11) even after the close.
const PETR4 = [
  ["2026-05-29", 42, 40.3095, 42],
  ["2026-06-01", 42.37, 40.6646, 42.37],
  ["2026-06-02", 41.57, 40.4489, 41.57],
  ["2026-06-03", 41.25, 40.1375, 41.25],
  ["2026-08-19", 43.11, 41.9474, 43.11],
  ["2026-08-20", 44.32, 43.1247, 44.32],
  ["2026-08-21", 44.3, 43.1053, 44.3],
  ["2026-08-24", 42.11, 42.11, 42.11],
  ["2026-08-25", 41.35, 41.35, 41.35],
  ["2026-08-26", 41.45, 41.45, 41.45],
  ["2026-10-28", 52.51, 52.51, 52.51],
  ["2026-10-29", 52.2, 52.2, 52.2],
  ["2026-10-30", 52.71, 52.71, 52.71],
  ["2026-11-03", 50.71, 50.71, 50.71],
  ["2026-11-04", 47.12, 47.12, 47.12],
  ["2026-11-05", 45.95, 45.95, 45.95],
  ["2026-11-06", 45.36, 45.36, null],
];
const ITUB4 = [
  ["2025-03-13", 29.3292, 26.7582, 33.23],
  ["2025-03-14", 30.2824, 27.6278, 34.31],
  ["2025-03-17", 31.1915, 28.4572, 35.34],
  ["2025-03-18", 31.3592, 28.6102, 32.3],
  ["2025-03-19", 31.4369, 28.6811, 32.38],
  ["2025-03-20", 31.1456, 28.4154, 32.08],
  ["2025-12-19", 38.3786, 37.6904, 39.53],
  ["2025-12-22", 38.4563, 37.7667, 39.61],
  ["2025-12-23", 39.0874, 38.3865, 40.26],
  ["2025-12-26", 39.1, 38.3988, 39.1],
  ["2025-12-29", 38.98, 38.281, 38.98],
  ["2025-12-30", 39.23, 38.5265, 39.23],
  ["2026-10-28", 39.78, 39.7646, 39.78],
  ["2026-10-29", 39.54, 39.5247, 39.54],
  ["2026-10-30", 38.69, 38.675, 38.69],
  ["2026-11-03", 38.49, 38.49, 38.49],
  ["2026-11-04", 39.71, 39.71, 39.71],
  ["2026-11-05", 39.97, 39.97, 39.97],
  ["2026-11-06", 40.53, 40.53, null],
];
// Friday 06/11/2026 19:57 in São Paulo, when the rows above were read.
const realReadAt = "2026-11-06T22:57:05.000Z";

// ------------------------------------------------------------- A and B

const checkedAt = "2026-11-05T13:48:14.389Z";
const publishedAt = "2026-10-22T12:00:00.000Z";
const marketState = {
  state: "open",
  refreshSeconds: 900,
  nextRefreshAt: "2026-11-05T14:03:14.389Z",
};
const analysis = (ceilingPrice, extra = {}) => ({
  estimatedGrossDividendYield: "0.115",
  projectedPE: "8.7",
  referencePrice: "9.00",
  ceilingPrice,
  safetyMargin: "0.1",
  updatedOn: "2026-10-20",
  ...extra,
});
const canonical = (symbol, price, freshness = "delayed", at = checkedAt) => ({
  symbol,
  name: symbol,
  logoUrl: null,
  currency: "BRL",
  price: price === null ? null : eight(price),
  change: null,
  changePercent: price === null ? null : "0.5000",
  previousClose: null,
  dayHigh: null,
  dayLow: null,
  volume: price === null ? null : "1000",
  quoteTime: null,
  marketTime: null,
  checkedAt: at,
  freshness: price === null ? "unavailable" : freshness,
  stale: freshness === "stale",
  unavailable: price === null,
  detail: "summary",
  delayMinutes: null,
  source: "brapi.dev",
  session: null,
});
// Server body -> JSON -> the same parser and view the screens use.
function screenViews(publication, quotes, { failed = false, now } = {}) {
  const body = rankingMarketBody({
    publication,
    quotes: new Map(Object.entries(quotes)),
    checkedAt,
    market: marketState,
  });
  const parsed = parseRankingMarket(JSON.parse(JSON.stringify(body)));
  return {
    body,
    ...publicationMarket(
      publication.entries,
      { data: parsed, loading: false, failed },
      { id: publication.id, publishedAt },
      now ?? at("2026-11-05T14:00:00Z"),
    ),
  };
}
const broker = [
  ["PETR4", 5, "50.00", "50,00%"],
  ["VALE3", 8, "20.00", "20,00%"],
  ["ITUB4", 10, "0.00", "0,00%"],
  ["TIMS3", 12, "-20.00", "−20,00%"],
  ["BBSE3", 4, "60.00", "60,00%"],
];

test("A: teto R$ 10,00 com cotação 5/8/10/12/4 dá 50%/20%/0%/−20%/60% no módulo, no servidor e na tela", () => {
  const publication = {
    id: "7",
    updatedAt: publishedAt,
    entries: broker.map(([ticker], index) => ({
      rank: index + 1,
      ticker,
      companyName: ticker,
      dividendAnalysis: analysis("10.00"),
    })),
  };
  const quotes = Object.fromEntries(
    broker.map(([ticker, price]) => [ticker, canonical(ticker, price)]),
  );
  const { body, views } = screenViews(publication, quotes);
  for (const [ticker, price, percent, shown] of broker) {
    // 1. The shared module, with text and with numbers.
    assert.equal(safetyMarginPercent("10.00", String(price)), percent);
    assert.equal(safetyMarginPercent(10, price), percent);
    assert.equal(formatSafetyMarginPercent(percent), shown);
    // 2. The server object of /api/rankings/market.
    const entry = body.entries.find((item) => item.ticker === ticker);
    assert.deepEqual(entry.safetyMargin, {
      percent,
      basis: "market",
      price: eight(price),
      checkedAt,
    });
    assert.equal(entry.ceilingPrice, "10.00");
    // 3. The screen: the same text in the ranking cell, the company page
    // header and the "Cotação atual" block (one view feeds all three).
    const view = views.get(ticker);
    assert.equal(view.margin.text, shown);
    assert.equal(view.margin.state, "market");
    assert.equal(view.price.text, `R$ ${price},00`);
    assert.ok(
      view.margin.title.includes(
        `= (R$ 10,00 − R$ ${price},00) ÷ R$ 10,00 = ${shown}`,
      ),
      view.margin.title,
    );
  }
});

test("A: a tela nunca refaz a conta; mostra a margem que o servidor mandou", () => {
  const publication = {
    id: "8",
    updatedAt: publishedAt,
    entries: [
      {
        rank: 1,
        ticker: "PETR4",
        companyName: "PETR4",
        dividendAnalysis: analysis("10.00"),
      },
    ],
  };
  const body = rankingMarketBody({
    publication,
    quotes: new Map([["PETR4", canonical("PETR4", 5)]]),
    checkedAt,
    market: marketState,
  });
  // A server margin that differs from the arithmetic: the screen follows it.
  body.entries[0].safetyMargin.percent = "12.34";
  const parsed = parseRankingMarket(JSON.parse(JSON.stringify(body)));
  const { views } = publicationMarket(
    publication.entries,
    { data: parsed, loading: false, failed: false },
    { id: "8", publishedAt },
  );
  assert.equal(views.get("PETR4").margin.text, "12,34%");
});

test("B: o teto fica em 10,00 enquanto a cotação vai de 5 a 8, e a margem vai de 50% a 20%", () => {
  const publication = {
    id: "9",
    updatedAt: publishedAt,
    entries: [
      {
        rank: 1,
        ticker: "PETR4",
        companyName: "PETR4",
        dividendAnalysis: analysis("10.00"),
      },
    ],
  };
  const frozen = JSON.stringify(publication);
  const first = screenViews(publication, { PETR4: canonical("PETR4", 5) });
  const second = screenViews(publication, { PETR4: canonical("PETR4", 8) });
  assert.equal(first.body.entries[0].ceilingPrice, "10.00");
  assert.equal(second.body.entries[0].ceilingPrice, "10.00");
  assert.equal(first.body.entries[0].safetyMargin.percent, "50.00");
  assert.equal(second.body.entries[0].safetyMargin.percent, "20.00");
  assert.equal(first.views.get("PETR4").ceiling, "10.00");
  assert.equal(second.views.get("PETR4").ceiling, "10.00");
  assert.equal(first.views.get("PETR4").margin.text, "50,00%");
  assert.equal(second.views.get("PETR4").margin.text, "20,00%");
  // A quote never touches the publication the ceiling comes from.
  assert.equal(JSON.stringify(publication), frozen);
});

// -------------------------------------------------------------------- D

test("D: PETR4, data ex 24/08/2026: nominal identificável, ajustada reflete o provento, sem ajuste duplo", () => {
  const brapi = brapiSeries("PETR4", PETR4, realReadAt);
  const now = at(realReadAt);
  const build = (basis, granularity = "daily") =>
    buildPriceSeries({
      ticker: "PETR4",
      basis,
      granularity,
      brapi,
      escola: [],
      agf: null,
      quote: quoteOf("45.36000000", realReadAt),
      now,
    });
  const nominal = build("nominal");
  const adjusted = build("adjusted");
  assert.deepEqual(nominal.availableBases, ["adjusted", "nominal"]);
  assert.equal(nominal.defaultBasis, "adjusted");
  const traded = byDate(nominal);
  const vendor = byDate(adjusted);
  // Nominal = rawClose, labeled as such: the traded prices around the event.
  assert.equal(nominal.basis, "nominal");
  assert.ok(nominal.points.every((point) => point.source === "brapi"));
  assert.deepEqual(
    ["2026-08-20", "2026-08-21", "2026-08-24", "2026-08-25"].map((date) =>
      traded.get(date),
    ),
    ["44.32000000", "44.30000000", "42.11000000", "41.35000000"],
  );
  // brapi sends no rawClose for the bar of the day: it is not invented.
  assert.equal(traded.has("2026-11-06"), false);
  assert.equal(vendor.get("2026-11-06"), "45.36000000");
  // Adjusted = adjustedClose exactly, before and after the event: the
  // vendor's adjustment, applied once, nothing recalculated here.
  for (const [date, , adjustedClose, rawClose] of PETR4) {
    assert.equal(vendor.get(date), eight(adjustedClose), date);
    if (rawClose !== null) assert.equal(traded.get(date), eight(rawClose));
  }
  // The adjusted/nominal factor steps only at the ex-dates (02/06 and 24/08)
  // and is 1 from 24/08 on: the payout is reflected once.
  const factor = (date) => ratio(traded, vendor, date);
  assert.ok(Math.abs(factor("2026-08-19") - factor("2026-08-21")) < 1e-5);
  assert.ok(Math.abs(factor("2026-06-03") - factor("2026-08-21")) < 1e-5);
  assert.ok(Math.abs(factor("2026-08-21") - 0.97303) < 1e-5);
  for (const date of ["2026-08-24", "2026-08-25", "2026-10-30", "2026-11-05"])
    assert.equal(factor(date), 1, date);
  assert.ok(
    Math.abs(factor("2026-06-01") / factor("2026-06-02") - 0.98635) < 1e-5,
  );
  // The ex-date drop: −4,94% traded, −2,31% adjusted (the payout removed).
  const drop = (series, a, b) =>
    Number(series.get(b)) / Number(series.get(a)) - 1;
  assert.ok(
    Math.abs(drop(traded, "2026-08-21", "2026-08-24") + 0.04944) < 1e-4,
  );
  assert.ok(
    Math.abs(drop(vendor, "2026-08-21", "2026-08-24") + 0.02309) < 1e-4,
  );
});

test("D: ITUB4, bonificações de 18/03/2025 (10%) e 26/12/2025 (3%): cada evento entra uma vez", () => {
  const brapi = brapiSeries("ITUB4", ITUB4, realReadAt);
  const build = (basis) =>
    buildPriceSeries({
      ticker: "ITUB4",
      basis,
      granularity: "daily",
      brapi,
      escola: [],
      agf: null,
      quote: quoteOf("40.53000000", realReadAt),
      now: at(realReadAt),
    });
  const traded = byDate(build("nominal"));
  const vendor = byDate(build("adjusted"));
  // The compact rows keep only [date, adjustedClose, rawClose].
  assert.deepEqual(
    brapi.points.find((row) => row[0] === "2025-03-17"),
    ["2025-03-17", 28.4572, 35.34],
  );
  assert.equal(JSON.stringify(brapi.points).includes("31.1915"), false);
  // The day before the first bonus: 35,34 traded, 28,4572 adjusted, never
  // the stock-event-only close of 31,1915.
  assert.equal(traded.get("2025-03-17"), "35.34000000");
  assert.equal(vendor.get("2025-03-17"), "28.45720000");
  assert.equal(
    JSON.stringify([...traded, ...vendor]).includes("31.19150000"),
    false,
  );
  // The traded price falls with the bonus; the adjusted line does not jump.
  assert.equal(traded.get("2025-03-18"), "32.30000000");
  assert.ok(
    Number(vendor.get("2025-03-18")) > Number(vendor.get("2025-03-17")),
  );
  const factor = (date) => ratio(traded, vendor, date);
  // Exactly the bonus factors at the ex-dates: ×1,1 and ×1,03 (twice would
  // be ×1,21 and ×1,0609).
  assert.ok(Math.abs(factor("2025-03-18") / factor("2025-03-17") - 1.1) < 2e-4);
  assert.ok(
    Math.abs(factor("2025-12-26") / factor("2025-12-23") - 1.03) < 2e-4,
  );
  // Flat inside each window: the points before the event follow the vendor.
  assert.ok(Math.abs(factor("2025-03-13") - factor("2025-03-17")) < 1e-5);
  assert.ok(Math.abs(factor("2025-12-19") - factor("2025-12-23")) < 1e-5);
  for (const [date, , adjustedClose, rawClose] of ITUB4) {
    assert.equal(vendor.get(date), eight(adjustedClose), date);
    if (rawClose !== null) assert.equal(traded.get(date), eight(rawClose));
  }
});

test("D: a cotação atual só se liga à linha ajustada quando as bases coincidem", () => {
  const upTo = (rows, date) => rows.filter((row) => row[0] <= date);
  // 1. Ex-date 24/08 at 14:00: the bar of the day is in progress and stays
  // out; the last adjusted point (21/08) is 43,1053 against 44,30 traded.
  const exDay = at("2026-08-24T17:00:00Z");
  const during = (basis) =>
    buildPriceSeries({
      ticker: "PETR4",
      basis,
      granularity: "daily",
      brapi: brapiSeries(
        "PETR4",
        upTo(PETR4, "2026-08-24"),
        new Date(exDay).toISOString(),
      ),
      quote: quoteOf("42.50000000", new Date(exDay).toISOString()),
      now: exDay,
    });
  const adjustedDuring = during("adjusted");
  assert.equal(adjustedDuring.points.at(-1).date, "2026-08-21");
  assert.deepEqual(
    [adjustedDuring.latestQuote.connect, adjustedDuring.latestQuote.reason],
    [false, "base_mismatch"],
  );
  const nominalDuring = during("nominal");
  assert.equal(nominalDuring.points.at(-1).date, "2026-08-21");
  assert.equal(nominalDuring.latestQuote.connect, true);
  // 2. Same day after 19:00, read from 19:00: factor 1 on 24/08, joined.
  const after = buildPriceSeries({
    ticker: "PETR4",
    basis: "adjusted",
    granularity: "daily",
    brapi: brapiSeries(
      "PETR4",
      upTo(PETR4, "2026-08-24"),
      "2026-08-24T22:00:00.000Z",
    ),
    quote: quoteOf("42.11000000", "2026-08-24T22:00:00.000Z"),
    now: at("2026-08-24T22:30:00Z"),
  });
  assert.equal(after.points.at(-1).date, "2026-08-24");
  assert.equal(after.latestQuote.connect, true);
  // 3. ITUB4 monthly: October closes at 38,675 adjusted and 38,69 traded
  // (a payout after 30/10): never joined on the adjusted basis.
  const monthly = (basis) =>
    buildPriceSeries({
      ticker: "ITUB4",
      basis,
      granularity: "monthly",
      brapi: brapiSeries("ITUB4", ITUB4, realReadAt),
      quote: quoteOf("40.53000000", realReadAt),
      now: at(realReadAt),
    });
  assert.equal(monthly("adjusted").points.at(-1).date, "2026-10-30");
  assert.equal(monthly("adjusted").latestQuote.connect, false);
  assert.equal(monthly("nominal").latestQuote.connect, true);
  // 4. The real evening of 06/11: brapi has the adjusted close of the day
  // but no rawClose, so equal bases cannot be confirmed and nothing is
  // joined; with the Escola close of the day (the same price) it is.
  const evening = (escola) =>
    buildPriceSeries({
      ticker: "PETR4",
      basis: "adjusted",
      granularity: "daily",
      brapi: brapiSeries("PETR4", PETR4, realReadAt),
      escola,
      quote: quoteOf("45.36000000", realReadAt),
      now: at(realReadAt),
    });
  assert.equal(evening([]).points.at(-1).date, "2026-11-06");
  assert.equal(evening([]).latestQuote.connect, false);
  assert.equal(
    evening([{ date: "2026-11-06", close: "45.36000000" }]).latestQuote.connect,
    true,
  );
});

test("D: o trecho nominal da AGF bate com o rawClose real e o valor ajustado antes dele fica fora", () => {
  // Real brapi rawClose (06/11/2026) at the edges of each AGF nominal tail:
  // [excluded date, its traded price, first tail date, last two dates].
  const real = {
    PETR4: {
      excluded: ["2024-08-21", "36.9744926761", 38.06],
      tail: [
        ["2024-08-22", 37.12],
        ["2026-10-22", 57.83],
        ["2026-10-23", 58.68],
      ],
      size: 520,
    },
    VALE3: {
      excluded: ["2024-08-02", "57.3863698127", 59.41],
      tail: [
        ["2024-08-05", 57.02],
        ["2026-10-22", 61.49],
        ["2026-10-23", 61.9],
      ],
      size: 533,
    },
    ITUB4: {
      excluded: ["2024-06-20", "31.6589213166", 31.91],
      tail: [
        ["2024-06-21", 31.88],
        ["2026-10-22", 48],
        ["2026-10-23", 48.3],
      ],
      size: 562,
    },
  };
  for (const [ticker, edge] of Object.entries(real)) {
    const prices = stockHistory(ticker).prices;
    const tail = agfNominalTail(prices);
    assert.equal(tail.points.length, edge.size, ticker);
    assert.equal(tail.firstDate, edge.tail[0][0], ticker);
    const kept = new Map(tail.points.map((point) => [point.date, point.close]));
    for (const [date, rawClose] of edge.tail)
      assert.equal(kept.get(date), eight(rawClose), `${ticker} ${date}`);
    // The adjusted AGF value right before the tail differs from the traded
    // price and never enters any basis.
    const [date, agfValue, rawClose] = edge.excluded;
    assert.equal(prices[tail.excluded - 1].date, date);
    assert.equal(String(prices[tail.excluded - 1].close), agfValue);
    assert.notEqual(eight(agfValue), eight(rawClose));
    assert.equal(kept.has(date), false);
  }
});

// -------------------------------------------------------------------- E

test("E: sessão aberta, fechada, fim de semana e feriados da B3 de 02/11 e 20/11", () => {
  const open = marketSession(at("2026-11-05T14:00:00Z"));
  assert.deepEqual([open.state, open.refreshSeconds], ["open", 900]);
  assert.equal(cacheTtlMs("catalog", at("2026-11-05T14:00:00Z")), 15 * 60_000);
  for (const [instant, nextOpen, session] of [
    // Finados (Monday): closed all day, opens Tuesday at 10:00.
    ["2026-11-02T14:00:00Z", "2026-11-03T13:00:00.000Z", "2026-10-30"],
    // Consciência Negra (Friday): closed, opens Monday 23/11 at 10:00.
    ["2026-11-20T14:00:00Z", "2026-11-23T13:00:00.000Z", "2026-11-19"],
    // Saturday and Sunday.
    ["2026-11-07T15:00:00Z", "2026-11-09T13:00:00.000Z", "2026-11-06"],
    ["2026-11-22T15:00:00Z", "2026-11-23T13:00:00.000Z", "2026-11-19"],
    // Monday before the bell: the price is still Thursday's close.
    ["2026-11-23T12:00:00Z", "2026-11-23T13:00:00.000Z", "2026-11-19"],
  ]) {
    const value = marketSession(at(instant));
    assert.equal(value.state, "closed", instant);
    assert.equal(value.refreshSeconds, 1800, instant);
    assert.equal(value.nextOpenAt, nextOpen, instant);
    assert.ok(Date.parse(value.nextRefreshAt) <= Date.parse(nextOpen));
    assert.equal(tradingSessionDate(at(instant)), session, instant);
    assert.ok(cacheTtlMs("catalog", at(instant)) <= 12 * 3_600_000);
  }
  // 18:00 to 19:40 of a session: closed, but the short TTL holds the night
  // back from caching a pre-close price, so a list is fetched after 19:00.
  const settling = marketSession(at("2026-11-19T21:10:00Z"));
  assert.deepEqual([settling.state, settling.settling], ["closed", true]);
  assert.equal(cacheTtlMs("catalog", at("2026-11-19T21:10:00Z")), 15 * 60_000);
  assert.equal(marketSession(at("2026-11-19T22:39:00Z")).settling, true);
  assert.equal(cacheTtlMs("catalog", at("2026-11-19T22:39:00Z")), 15 * 60_000);
  assert.equal(marketSession(at("2026-11-19T22:40:00Z")).settling, false);
  assert.ok(cacheTtlMs("catalog", at("2026-11-19T22:40:00Z")) > 15 * 60_000);
});

const novemberRows = [
  ["2026-10-29", 10],
  ["2026-10-30", 10.1],
  ["2026-11-02", 99], // holiday: a provider bar here is dropped
  ["2026-11-03", 10.2],
  ["2026-11-04", 10.3],
  ["2026-11-05", 10.4],
  ["2026-11-06", 10.5],
  ["2026-11-07", 99], // Saturday
  ["2026-11-09", 10.6],
  ["2026-11-10", 10.7],
  // 11/11 is a trading day without data
  ["2026-11-12", 10.8],
  ["2026-11-13", 10.9],
  ["2026-11-16", 11],
  ["2026-11-17", 11.1],
  ["2026-11-18", 11.2],
  ["2026-11-19", 11.3],
  ["2026-11-20", 99], // holiday
  ["2026-11-23", 11.4],
  ["2026-11-24", 11.5], // in progress at 14:00
].map(([date, value]) => [date, value, value, value]);

test("E: diário sem fim de semana nem feriado, sem lacuna falsa e com a lacuna real de 11/11", () => {
  const series = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    granularity: "daily",
    brapi: brapiSeries("PETR4", novemberRows, "2026-11-24T22:10:00.000Z"),
    quote: quoteOf("11.50000000", "2026-11-24T22:10:00.000Z"),
    now: at("2026-11-24T22:30:00Z"),
  });
  const dates = series.points.map((point) => point.date);
  for (const day of ["2026-11-02", "2026-11-07", "2026-11-20"])
    assert.equal(dates.includes(day), false, day);
  assert.equal(new Set(dates).size, dates.length);
  assert.deepEqual([...dates].sort(), dates);
  assert.ok(series.points.every((point) => point.close !== "99.00000000"));
  assert.deepEqual(
    series.points.filter((point) => point.gapBefore).map((point) => point.date),
    ["2026-11-12"],
  );
  assert.equal(series.points.at(-1).date, "2026-11-24");
  // The chart breaks the stroke only at the real gap.
  const parsed = parsePriceSeries(JSON.parse(JSON.stringify(series)), {
    ticker: "PETR4",
    basis: "nominal",
    granularity: "daily",
  });
  const rows = seriesPlot(parsed.points, { ceiling: 12, marker: null });
  assert.deepEqual(
    rows
      .filter((row) => row.kind === "gap")
      .map((row) => [row.gapFrom, row.gapTo]),
    [["2026-11-10", "2026-11-12"]],
  );
  // A holiday between the last point and the quote is no gap: joined.
  const holiday = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    granularity: "daily",
    brapi: brapiSeries(
      "PETR4",
      novemberRows.filter((row) => row[0] <= "2026-11-19"),
      "2026-11-20T15:00:00.000Z",
    ),
    quote: quoteOf("11.30000000", "2026-11-20T15:00:00.000Z"),
    now: at("2026-11-20T15:00:00Z"),
  });
  assert.equal(holiday.points.at(-1).date, "2026-11-19");
  assert.equal(holiday.latestQuote.connect, true);
  const afterFinados = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    granularity: "daily",
    brapi: brapiSeries(
      "PETR4",
      novemberRows.filter((row) => row[0] <= "2026-10-30"),
      "2026-11-03T14:00:00.000Z",
    ),
    quote: quoteOf("10.20000000", "2026-11-03T14:00:00.000Z"),
    now: at("2026-11-03T14:00:00Z"),
  });
  assert.equal(
    afterFinados.latestQuote.connect,
    true,
    "30/10 → 03/11 skips Finados",
  );
});

test("E: pregão em andamento fica fora até as 19:00; só entra se lido a partir das 19:00", () => {
  const build = (nowIso, readIso, escola = []) =>
    buildPriceSeries({
      ticker: "PETR4",
      basis: "nominal",
      granularity: "daily",
      brapi: brapiSeries("PETR4", novemberRows, readIso),
      escola,
      quote: quoteOf("11.50000000", readIso),
      now: at(nowIso),
    });
  const last = (series) => series.points.at(-1).date;
  // Market open (14:00) and the settling hour (18:45): the bar of the day is
  // out, and the note says when it comes in.
  const open = build("2026-11-24T17:00:00Z", "2026-11-24T17:00:00.000Z");
  assert.equal(last(open), "2026-11-23");
  assert.ok(open.coverage.notes.some((note) => /depois das 19:00/.test(note)));
  assert.equal(
    last(build("2026-11-24T21:45:00Z", "2026-11-24T21:40:00.000Z")),
    "2026-11-23",
  );
  // After 19:00: final only if brapi was read from 19:00. A read at 18:40 may
  // still hold a price from before the closing auction (M1).
  assert.equal(
    last(build("2026-11-24T22:05:00Z", "2026-11-24T22:00:00.000Z")),
    "2026-11-24",
  );
  assert.equal(
    last(build("2026-11-24T22:05:00Z", "2026-11-24T21:40:00.000Z")),
    "2026-11-23",
  );
  assert.equal(
    last(build("2026-11-24T22:05:00Z", "2026-11-24T21:20:00.000Z")),
    "2026-11-23",
  );
  // The Escola close of the day follows the same 19:00 rule.
  const escola = [{ date: "2026-11-24", close: "11.55000000" }];
  const noBrapi = (nowIso) =>
    buildPriceSeries({
      ticker: "TIMS3",
      basis: "nominal",
      granularity: "daily",
      brapi: {
        points: null,
        checkedAt: null,
        freshness: "unavailable",
        reason: "no_token",
        includeRaw: false,
      },
      escola,
      agf: {
        points: [{ date: "2026-11-23", close: "11.40000000" }],
        firstDate: "2026-11-23",
        excluded: 0,
      },
      quote: quoteOf("11.55000000", nowIso),
      now: at(nowIso),
    });
  assert.equal(last(noBrapi("2026-11-24T21:45:00.000Z")), "2026-11-23");
  assert.deepEqual(noBrapi("2026-11-24T22:05:00.000Z").points.at(-1), {
    date: "2026-11-24",
    close: "11.55000000",
    status: "consolidated",
    source: "escola",
  });
});

test("E: mensal = fechamento do último pregão do mês; mês sem esse pregão fica incompleto; mês corrente fora", () => {
  const rows = [];
  for (
    let day = Date.UTC(2026, 7, 3);
    day <= Date.UTC(2026, 10, 24);
    day += 86_400_000
  ) {
    const date = new Date(day).toISOString().slice(0, 10);
    const weekday = new Date(day).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    // Sept 7, Oct 12 and Nov 2/20 are B3 holidays; Oct 30 is missing.
    if (
      [
        "2026-09-07",
        "2026-10-12",
        "2026-11-02",
        "2026-11-20",
        "2026-10-30",
      ].includes(date)
    )
      continue;
    const value =
      10 + Number(date.slice(5, 7)) + Number(date.slice(8, 10)) / 100;
    rows.push([date, value, value, value]);
  }
  const series = (basis) =>
    buildPriceSeries({
      ticker: "PETR4",
      basis,
      granularity: "monthly",
      brapi: brapiSeries("PETR4", rows, "2026-11-24T22:10:00.000Z"),
      quote: quoteOf("21.24000000", "2026-11-24T22:10:00.000Z"),
      now: at("2026-11-24T22:30:00Z"),
    });
  const monthly = series("nominal");
  assert.deepEqual(
    monthly.points.map((point) => [
      point.month,
      point.date,
      point.close,
      point.status,
    ]),
    [
      ["2026-08", "2026-08-31", "18.31000000", "consolidated"],
      ["2026-09", "2026-09-30", "19.30000000", "consolidated"],
      ["2026-10", "2026-10-29", "20.29000000", "incomplete"],
    ],
  );
  // The incomplete month is never joined to the quote, and the chart says
  // "dados até 29/10".
  assert.deepEqual(
    [monthly.latestQuote.connect, monthly.latestQuote.reason],
    [false, "gap"],
  );
  // A month with no data at all breaks the monthly stroke.
  const withoutSeptember = buildPriceSeries({
    ticker: "PETR4",
    basis: "nominal",
    granularity: "monthly",
    brapi: brapiSeries(
      "PETR4",
      rows.filter((row) => !row[0].startsWith("2026-09")),
      "2026-11-24T22:10:00.000Z",
    ),
    quote: null,
    now: at("2026-11-24T22:30:00Z"),
  });
  assert.equal(withoutSeptember.points[1].month, "2026-10");
  assert.equal(withoutSeptember.points[1].gapBefore, true);
});

test("E: atualização da cotação muda só o marcador; os fechamentos ficam iguais", () => {
  const build = (price, readIso) =>
    buildPriceSeries({
      ticker: "PETR4",
      basis: "nominal",
      granularity: "daily",
      brapi: brapiSeries(
        "PETR4",
        novemberRows.slice(0, 15),
        "2026-11-19T13:00:00.000Z",
      ),
      quote: quoteOf(price, readIso),
      now: at(readIso),
    });
  const first = build("11.20000000", "2026-11-19T14:00:00.000Z");
  const second = build("11.45000000", "2026-11-19T14:15:00.000Z");
  assert.deepEqual(second.points, first.points);
  assert.deepEqual(
    [first.latestQuote.price, second.latestQuote.price],
    ["11.20000000", "11.45000000"],
  );
  assert.equal(second.latestQuote.checkedAt, "2026-11-19T14:15:00.000Z");
  assert.equal(second.latestQuote.connect, true);
});

test("E: consolidação: 18:59 não grava, 19:00 grava D; feriado e fim de semana gravam o pregão anterior", async () => {
  for (const [instant, day] of [
    ["2026-11-05T21:30:00Z", null], // 18:30: maybe before the auction (M1)
    ["2026-11-05T21:59:59Z", null],
    ["2026-11-05T22:00:00Z", "2026-11-05"],
    ["2026-11-06T12:59:00Z", "2026-11-05"], // Friday 09:59
    ["2026-11-06T13:00:00Z", null], // the bell
    ["2026-11-02T22:00:00Z", "2026-10-30"], // Finados
    ["2026-11-03T12:00:00Z", "2026-10-30"], // Tuesday before the bell
    ["2026-11-20T23:00:00Z", "2026-11-19"], // Consciência Negra
    ["2026-11-21T15:00:00Z", "2026-11-19"], // Saturday after the holiday
  ])
    assert.equal(closingSessionFor(at(instant)), day, instant);

  const written = [];
  const store = {
    calls: 0,
    async claim() {
      store.calls++;
      return "claimed";
    },
    async release() {},
    async finish() {},
    async previousCloses() {
      return null;
    },
    async insert(day, rows) {
      written.push([day, rows.map((row) => `${row.ticker}=${row.close}`)]);
      return rows.length;
    },
  };
  let clock = at("2026-11-05T21:59:59Z");
  const closes = createDailyCloses({
    store,
    tickers: async () => ["PETR4", "VALE3"],
    log: () => {},
    now: () => clock,
  });
  const list = (checked, price) => ({
    checkedAt: checked,
    value: {
      items: [
        { symbol: "PETR4", price: eight(price), volume: "1" },
        { symbol: "VALE3", price: null, volume: null },
        { symbol: "MGLU3", price: "5.00000000", volume: "1" },
      ],
    },
  });
  // A list read at 18:59:59 is not final: nothing is due, no SQL.
  assert.equal(
    closes.afterCatalog(list("2026-11-05T21:59:59.000Z", 45.9)),
    null,
  );
  assert.equal(store.calls, 0);
  clock = at("2026-11-05T22:00:05Z");
  await closes.afterCatalog(list("2026-11-05T22:00:00.000Z", 45.95));
  // VALE3 has no price: skipped, never written as 0; MGLU3 is not covered.
  assert.deepEqual(written, [["2026-11-05", ["PETR4=45.95000000"]]]);
  // Written once per session.
  assert.equal(
    closes.afterCatalog(list("2026-11-05T22:30:00.000Z", 45.95)),
    null,
  );
  clock = at("2026-11-20T23:00:05Z");
  await closes.afterCatalog(list("2026-11-20T23:00:00.000Z", 47.1));
  assert.deepEqual(written.at(-1), ["2026-11-19", ["PETR4=47.10000000"]]);
});

// -------------------------------------------------------------------- F

test("F: teto ausente ou inválido dá margem indisponível, nunca 0,00%", () => {
  const quote = canonical("PETR4", 5);
  for (const ceilingPrice of [
    null,
    undefined,
    "",
    "0",
    "0.00",
    "-1",
    "abc",
    "1e3",
    "10,00",
  ]) {
    const margin = safetyMarginFor({
      ceilingPrice,
      quote,
      researchPrice: "9.00",
      researchSafetyMargin: "10.00",
    });
    assert.deepEqual(
      margin,
      { percent: null, basis: "unavailable", price: "5.00000000", checkedAt },
      String(ceilingPrice),
    );
    const publication = {
      id: "21",
      updatedAt: publishedAt,
      entries: [
        {
          rank: 1,
          ticker: "PETR4",
          companyName: "PETR4",
          dividendAnalysis: analysis(ceilingPrice),
        },
      ],
    };
    const view = screenViews(publication, { PETR4: quote }).views.get("PETR4");
    assert.equal(view.margin.text, "Não informado");
    assert.equal(view.margin.state, "unavailable");
    assert.equal(view.price.text, "R$ 5,00", "the market price is still shown");
    assert.doesNotMatch(view.margin.title, /0,00%/);
  }
});

test("F: cotação defasada e cotação ausente: nada de zero no lugar de preço", () => {
  const publication = {
    id: "22",
    updatedAt: publishedAt,
    entries: [
      {
        rank: 1,
        ticker: "PETR4",
        companyName: "PETR4",
        dividendAnalysis: analysis("10.00"),
      },
      {
        rank: 2,
        ticker: "EMAE4",
        companyName: "EMAE4",
        dividendAnalysis: analysis("10.00"),
      },
      {
        rank: 3,
        ticker: "ALOS3",
        companyName: "ALOS3",
        dividendAnalysis: analysis("10.00", {
          referencePrice: null,
          safetyMargin: null,
        }),
      },
    ],
  };
  const { body, views } = screenViews(publication, {
    PETR4: canonical("PETR4", 8, "stale"),
    EMAE4: canonical("EMAE4", null),
    ALOS3: canonical("ALOS3", 0),
  });
  assert.deepEqual(
    body.entries.map((entry) => [
      entry.ticker,
      entry.safetyMargin.basis,
      entry.safetyMargin.percent,
    ]),
    [
      ["PETR4", "stale", "20.00"],
      ["EMAE4", "research", "10.00"],
      ["ALOS3", "unavailable", null],
    ],
  );
  assert.deepEqual(
    ["PETR4", "EMAE4", "ALOS3"].map((ticker) => {
      const view = views.get(ticker);
      return [
        view.price.text,
        view.price.qualifier,
        view.margin.text,
        view.margin.qualifier,
      ];
    }),
    [
      ["R$ 8,00", "defasada", "20,00%", "defasada"],
      ["R$ 9,00", "da pesquisa (20/10)", "10,00%", "da pesquisa (20/10)"],
      ["Não informado", "cotação indisponível", "Não informado", null],
    ],
  );
  // A refresh that fails after a good answer keeps the values, marked.
  const failed = screenViews(
    publication,
    { PETR4: canonical("PETR4", 8) },
    { failed: true },
  );
  assert.equal(failed.views.get("PETR4").margin.qualifier, "defasada");
  assert.equal(failed.views.get("PETR4").price.state, "stale");
});

test("F: histórico incompleto e motivos de indisponibilidade da série", () => {
  const base = {
    ticker: "TIMS3",
    granularity: "daily",
    now: at("2026-11-06T22:57:00Z"),
  };
  const none = (reason, includeRaw = false) => ({
    points: null,
    checkedAt: null,
    freshness: "unavailable",
    reason,
    includeRaw,
  });
  // No token, no AGF tail and no Escola close: nothing invented.
  const noToken = buildPriceSeries({
    ...base,
    basis: "nominal",
    brapi: none("no_token"),
  });
  assert.deepEqual(
    [noToken.points, noToken.unavailableReason, noToken.availableBases],
    [[], "no_token", []],
  );
  assert.equal(
    buildPriceSeries({
      ...base,
      basis: "adjusted",
      brapi: none("budget", true),
    }).unavailableReason,
    "budget",
  );
  assert.equal(
    buildPriceSeries({
      ...base,
      basis: "adjusted",
      brapi: none("provider_error", true),
    }).unavailableReason,
    "provider_error",
  );
  assert.equal(
    buildPriceSeries({ ...base, basis: "adjusted", brapi: none("not_covered") })
      .unavailableReason,
    "not_covered",
  );
  // brapi down with an old copy: the series stays, and says so.
  const stale = buildPriceSeries({
    ...base,
    ticker: "PETR4",
    basis: "adjusted",
    brapi: brapiSeries("PETR4", PETR4, "2026-11-05T22:00:00.000Z", {
      freshness: "stale",
    }),
    now: at(realReadAt),
  });
  assert.ok(
    stale.coverage.notes.some((note) => /última consulta válida/.test(note)),
  );
  // The screen never fills a missing close with zero.
  const parsed = parsePriceSeries(
    {
      ticker: "PETR4",
      points: [
        { date: "2026-11-03", close: null },
        { date: "2026-11-04", close: "0" },
        { date: "2026-11-05", close: "45.95000000" },
      ],
    },
    { ticker: "PETR4", basis: "nominal", granularity: "daily" },
  );
  assert.deepEqual(
    parsed.points.map((point) => point.date),
    ["2026-11-05"],
  );
});

// ------------------------------------------- routes: A, B, C, E and F

Object.assign(process.env, {
  NODE_ENV: "development",
  MYSQL_HOST: "db.invalid",
  MYSQL_PORT: "3306",
  MYSQL_USER: "ediv_unit_only",
  MYSQL_PASSWORD: "unit-only-not-a-secret",
  MYSQL_DATABASE: "ediv_unit_only",
  MYSQL_SSL: "false",
  APP_BASE_URL: "http://127.0.0.1:4180",
  APP_ORIGIN: "http://127.0.0.1:4180",
  TRUST_PROXY: "false",
  SMTP_URL: "",
  MAIL_FROM: "",
  BRAPI_API_KEY: "",
});
for (const name of [
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "MYSQL_SSL_CA",
  "MYSQL_SSL_CA_FILE",
  "BRAPI_PLAN",
  "BRAPI_DAILY_BUDGET",
])
  delete process.env[name];

// Thursday 05/11/2026 10:50 in São Paulo, market open. The services capture
// Date.now when they are created, so it moves before the app is imported.
const realNow = Date.now;
let shift = at("2026-11-05T13:50:00Z") - realNow();
Date.now = () => realNow() + shift;
const advance = (ms) => {
  shift += ms;
};
const nativeFetch = globalThis.fetch;
const brapi = {
  calls: [],
  list: [],
  // ok | 500 | network | 429
  mode: "ok",
  retryAfter: "120",
  history: PETR4,
};
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname !== "brapi.dev") return nativeFetch(input, init);
  brapi.calls.push(url.pathname + url.search);
  if (brapi.mode === "network") throw new TypeError("fetch failed");
  if (brapi.mode === "500") return new Response("{}", { status: 500 });
  if (brapi.mode === "429")
    return new Response("{}", {
      status: 429,
      headers: { "Retry-After": brapi.retryAfter },
    });
  if (url.pathname === "/api/quote/list")
    return Response.json({
      stocks: brapi.list.map(([stock, close, volume = 1000]) => ({
        stock,
        name: stock,
        close,
        change: 0.5,
        volume,
        type: "stock",
      })),
    });
  if (url.pathname === "/api/v2/stocks/historical")
    return Response.json(
      historyPayload(url.searchParams.get("symbols"), brapi.history),
    );
  if (url.pathname === "/api/v2/stocks/quote")
    return Response.json({
      results: [
        {
          symbol: url.searchParams.get("symbols"),
          data: {
            regularMarketPrice: 1,
            regularMarketOpen: 1,
            regularMarketDayHigh: 1,
            regularMarketDayLow: 1,
            regularMarketPreviousClose: 1,
            regularMarketTime: new Date(Date.now()).toISOString(),
          },
        },
      ],
    });
  return new Response("{}", { status: 404 });
};

const { pool } = await import("../server/database.js");
const state = {
  session: null,
  publication: null,
  escola: [],
  closes: [],
  sql: [],
};
pool.execute = async (sql, params = []) => {
  const text = sql.replace(/\s+/g, " ").trim();
  state.sql.push(text.slice(0, 60));
  if (text.startsWith("DELETE FROM request_limits"))
    return [{ affectedRows: 0 }];
  if (text.startsWith("INSERT INTO request_limits"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("SELECT hits, expires_at FROM request_limits"))
    return [[{ hits: 1, expires_at: "2099-01-01 00:00:00.000" }]];
  if (
    /^DELETE FROM (user_sessions|email_verification_tokens) WHERE expires_at/.test(
      text,
    )
  )
    return [{ affectedRows: 0 }];
  if (text.startsWith("SELECT u.id, u.name, u.email, u.email_verified_at"))
    return [state.session ? [state.session] : []];
  const row = state.publication;
  if (
    text === "SELECT MAX(id) AS id, COUNT(*) AS total FROM ranking_publications"
  )
    return [[{ id: row ? row.id : null, total: row ? row.id : 0 }]];
  if (text === "SELECT * FROM ranking_publications WHERE id = ?")
    return [row && String(params[0]) === String(row.id) ? [row] : []];
  if (
    text.startsWith(
      "SELECT id, title, author_name, created_at FROM ranking_publications",
    )
  )
    return [row ? [row] : []];
  if (
    text.startsWith(
      "SELECT id,title,created_at,entries_json FROM ranking_publications",
    )
  )
    return [row ? [row] : []];
  if (text.startsWith("SELECT payload, expires_at FROM provider_cache"))
    return [[]];
  if (text.startsWith("INSERT INTO provider_cache"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("UPDATE provider_cache SET payload=JSON_SET"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("SELECT trade_date,close FROM market_daily_closes"))
    return [
      state.escola
        .filter((close) => close.ticker === params[0])
        .map((close) => ({ trade_date: close.date, close: close.close })),
    ];
  if (text.startsWith("INSERT IGNORE INTO provider_cache"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("UPDATE provider_cache SET payload=?"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("SELECT JSON_EXTRACT(entries_json,'$[*].ticker')"))
    return [
      [
        {
          tickers: JSON.stringify(
            JSON.parse(row?.entries_json ?? "[]").map((entry) => entry.ticker),
          ),
        },
      ],
    ];
  if (text.startsWith("SELECT MAX(trade_date) AS day FROM market_daily_closes"))
    return [[{ day: null }]];
  if (text.startsWith("INSERT IGNORE INTO market_daily_closes")) {
    const rows = [];
    for (let index = 0; index < params.length; index += 6)
      rows.push(params.slice(index, index + 3));
    state.closes.push(...rows);
    return [{ affectedRows: rows.length }];
  }
  throw new Error("SQL inesperado no teste: " + text.slice(0, 80));
};

const original = { info: console.info, warn: console.warn };
const logs = [];
console.info = (...args) => logs.push(args.join(" "));
console.warn = (...args) => logs.push(args.join(" "));
const { app } = await import("../server/app.js");
const server = await new Promise((resolve) => {
  const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
});
const base = "http://127.0.0.1:" + server.address().port;
const cookie = "evorix_session=" + "c".repeat(43);
async function call(path, { auth = false } = {}) {
  const response = await nativeFetch(base + path, {
    headers: auth ? { Cookie: cookie } : {},
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, headers: response.headers, body };
}
function publish(id, entries) {
  state.publication = {
    id,
    title: "Ranking de QA",
    author_name: null,
    professional_category: null,
    professional_registration: null,
    source_file_name: "qa.xlsx",
    imported_by: null,
    created_at: "2026-10-22 12:00:00.000",
    entries_json: JSON.stringify(entries),
  };
}
const entry = (rank, ticker, ceilingPrice, extra) => ({
  rank,
  ticker,
  companyName: ticker,
  dividendAnalysis: analysis(ceilingPrice, extra),
});
const listCalls = () =>
  brapi.calls.filter((path) => path.startsWith("/api/quote/list")).length;
const marginsOf = (body) =>
  body.entries.map((item) => [
    item.ticker,
    item.safetyMargin.percent,
    item.safetyMargin.basis,
  ]);
const publicMargins = (body) =>
  body.entries.map((item) => [
    item.ticker,
    item.market.safetyMargin.percent,
    item.market.safetyMargin.basis,
  ]);
const sessionNow = Date.now();
state.session = {
  id: "qa-user",
  name: "QA",
  email: "qa@ediv.test",
  email_verified_at: new Date(sessionNow),
  created_at: new Date(sessionNow),
  role: "USER",
  session_id: "qa-session",
  session_created_at: new Date(sessionNow),
  session_expires_at: new Date(sessionNow + 30 * 86_400_000),
};

test.after(async () => {
  Object.assign(console, original);
  Date.now = realNow;
  globalThis.fetch = nativeFetch;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("A pelas rotas: /api/rankings/market com os 5 exemplos e /api/rankings/public com os 3 primeiros e depois os outros 2", async () => {
  publish(
    1,
    broker.map(([ticker], index) => entry(index + 1, ticker, "10.00")),
  );
  brapi.list = broker.map(([ticker, price]) => [ticker, price]);
  const market = await call("/api/rankings/market", { auth: true });
  assert.equal(market.status, 200);
  assert.deepEqual(
    marginsOf(market.body),
    broker.map(([ticker, , percent]) => [ticker, percent, "market"]),
  );
  assert.ok(market.body.entries.every((item) => item.ceilingPrice === "10.00"));
  const top = await call("/api/rankings/public");
  assert.equal(top.status, 200);
  assert.deepEqual(publicMargins(top.body), [
    ["PETR4", "50.00", "market"],
    ["VALE3", "20.00", "market"],
    ["ITUB4", "0.00", "market"],
  ]);
  // Another publication puts the other two on top.
  publish(2, [
    entry(1, "TIMS3", "10.00"),
    entry(2, "BBSE3", "10.00"),
    entry(3, "PETR4", "10.00"),
  ]);
  const next = await call("/api/rankings/public");
  assert.deepEqual(publicMargins(next.body), [
    ["TIMS3", "-20.00", "market"],
    ["BBSE3", "60.00", "market"],
    ["PETR4", "50.00", "market"],
  ]);
  const json = JSON.stringify(next.body);
  for (const hidden of [
    "ceilingPrice",
    "referencePrice",
    "researchPrice",
    "updatedOn",
  ])
    assert.equal(json.includes(hidden), false, hidden);
  for (const item of next.body.entries)
    assert.deepEqual(Object.keys(item.market), ["quote", "safetyMargin"]);
  // One general-list read served the three answers.
  assert.equal(listCalls(), 1);
});

test("B pelas rotas: a cotação vai de 5 a 8, o teto continua 10,00 e a margem vai de 50% a 20%", async () => {
  publish(3, [entry(1, "PETR4", "10.00")]);
  const cycle = async (price) => {
    advance(16 * 60_000);
    brapi.list = [["PETR4", price]];
    const market = await call("/api/rankings/market", { auth: true });
    const top = await call("/api/rankings/public");
    assert.equal(market.status, 200);
    assert.equal(top.status, 200);
    return { market: market.body, top: top.body };
  };
  const before = listCalls();
  const first = await cycle(5);
  const second = await cycle(8);
  assert.equal(listCalls() - before, 2, "one list call per cycle");
  for (const [answer, percent, price] of [
    [first, "50.00", "5.00000000"],
    [second, "20.00", "8.00000000"],
  ]) {
    const [item] = answer.market.entries;
    assert.equal(answer.market.publication.id, "3");
    assert.equal(item.ceilingPrice, "10.00");
    assert.deepEqual(
      [item.safetyMargin.percent, item.safetyMargin.price],
      [percent, price],
    );
    assert.equal(answer.top.entries[0].market.safetyMargin.percent, percent);
    assert.equal(answer.top.entries[0].market.quote.price, price);
  }
  assert.ok(second.market.checkedAt > first.market.checkedAt);
});

test("C pelas rotas: várias cotações seguidas; ranking, página pública, cotação e gráfico iguais", async () => {
  publish(4, [entry(1, "PETR4", "10.00")]);
  for (const price of [5.1, 5.37, 4.99, 6.02, 12.5]) {
    advance(16 * 60_000);
    brapi.list = [["PETR4", price]];
    const [market, top, quote, series] = await Promise.all([
      call("/api/rankings/market", { auth: true }),
      call("/api/rankings/public"),
      call("/api/market/quote/PETR4"),
      call("/api/rankings/price-series/PETR4?basis=nominal", { auth: true }),
    ]);
    for (const answer of [market, top, quote, series])
      assert.equal(answer.status, 200);
    const expected = safetyMarginPercent("10.00", String(price));
    assert.equal(market.body.entries[0].quote.price, eight(price));
    assert.equal(top.body.entries[0].market.quote.price, eight(price));
    assert.equal(quote.body.quote.price, eight(price));
    assert.equal(series.body.latestQuote.price, eight(price));
    assert.equal(market.body.entries[0].safetyMargin.percent, expected);
    assert.equal(top.body.entries[0].market.safetyMargin.percent, expected);
    assert.equal(
      market.body.checkedAt,
      top.body.entries[0].market.quote.checkedAt,
    );
  }
});

test("F pelas rotas: brapi fora do ar (500 e rede) mantém a última cotação válida como defasada", async () => {
  publish(5, [entry(1, "PETR4", "10.00"), entry(2, "EMAE4", "10.00")]);
  advance(16 * 60_000);
  brapi.list = [["PETR4", 8]];
  assert.equal(
    (await call("/api/rankings/market", { auth: true })).status,
    200,
  );
  for (const mode of ["500", "network"]) {
    advance(16 * 60_000);
    brapi.mode = mode;
    const market = await call("/api/rankings/market", { auth: true });
    const top = await call("/api/rankings/public");
    brapi.mode = "ok";
    assert.equal(market.status, 200, mode);
    assert.equal(top.status, 200, mode);
    assert.deepEqual(marginsOf(market.body), [
      ["PETR4", "20.00", "stale"],
      ["EMAE4", "10.00", "research"],
    ]);
    assert.equal(market.body.entries[0].quote.freshness, "stale");
    assert.equal(top.body.entries[0].market.safetyMargin.basis, "stale");
    // The transient failure is not retried for a minute.
    advance(61_000);
  }
});

test("F pelas rotas: 429 com Retry-After pausa a brapi e serve a cotação defasada", async () => {
  publish(6, [entry(1, "PETR4", "10.00")]);
  advance(16 * 60_000);
  brapi.list = [["PETR4", 9]];
  assert.equal(
    (await call("/api/rankings/market", { auth: true })).body.entries[0]
      .safetyMargin.percent,
    "10.00",
  );
  advance(16 * 60_000);
  brapi.mode = "429";
  brapi.retryAfter = "120";
  const limited = await call("/api/rankings/market", { auth: true });
  brapi.mode = "ok";
  assert.equal(limited.status, 200);
  assert.deepEqual(marginsOf(limited.body), [["PETR4", "10.00", "stale"]]);
  const calls = brapi.calls.length;
  // Inside Retry-After nobody calls brapi, even with the list back.
  for (const step of [20_000, 60_000, 30_000]) {
    advance(step);
    const answer = await call("/api/rankings/market", { auth: true });
    assert.equal(answer.status, 200);
    assert.equal(answer.body.entries[0].safetyMargin.basis, "stale");
  }
  assert.equal(brapi.calls.length, calls, "no call during the cooldown");
  advance(11_000);
  brapi.list = [["PETR4", 7.5]];
  const back = await call("/api/rankings/market", { auth: true });
  assert.deepEqual(marginsOf(back.body), [["PETR4", "25.00", "market"]]);
  assert.equal(brapi.calls.length, calls + 1);
});

test("F pelas rotas: código inválido é recusado sem chamar a brapi; teto ausente fica indisponível", async () => {
  const calls = brapi.calls.length;
  for (const path of [
    "/api/rankings/price-series/PETR",
    "/api/rankings/price-series/PETR4X1",
    "/api/rankings/price-series/PETR4%26token%3D1",
    "/api/rankings/price-series/PETR4?basis=total",
    "/api/rankings/price-series/PETR4?granularity=weekly",
  ])
    assert.equal((await call(path, { auth: true })).status, 400, path);
  assert.equal((await call("/api/market/quote/PETR4%26x%3D1")).status, 400);
  assert.equal(
    (await call("/api/rankings/price-series/WEGE3", { auth: true })).status,
    404,
  );
  assert.equal((await call("/api/rankings/price-series/PETR4")).status, 401);
  assert.equal((await call("/api/rankings/market")).status, 401);
  assert.equal(brapi.calls.length, calls, "nothing reached brapi");
  publish(7, [
    entry(1, "PETR4", null),
    entry(2, "VALE3", "0"),
    entry(3, "ITUB4", "1e3"),
  ]);
  advance(16 * 60_000);
  brapi.list = [
    ["PETR4", 5],
    ["VALE3", 8],
    ["ITUB4", 10],
  ];
  const market = await call("/api/rankings/market", { auth: true });
  assert.deepEqual(marginsOf(market.body), [
    ["PETR4", null, "unavailable"],
    ["VALE3", null, "unavailable"],
    ["ITUB4", null, "unavailable"],
  ]);
  assert.deepEqual(
    market.body.entries.map((item) => item.safetyMargin.price),
    ["5.00000000", "8.00000000", "10.00000000"],
  );
  const top = await call("/api/rankings/public");
  assert.deepEqual(
    publicMargins(top.body).map((item) => item[1]),
    [null, null, null],
  );
});

test("E pelas rotas: lacuna até a brapi, fechamento da Escola e consolidação a partir das 19:00", async () => {
  publish(8, [entry(1, "PETR4", "10.00")]);
  // Brapi rows only from 03/11 and an Escola close on 30/10: the nominal
  // series joins AGF (to 23/10), Escola and brapi with a gap mark at 30/10.
  brapi.history = PETR4.filter((row) => row[0] >= "2026-11-03");
  state.escola = [
    { ticker: "PETR4", date: "2026-10-30", close: "52.71000000" },
  ];
  advance(61 * 60_000);
  brapi.list = [["PETR4", 46]];
  const series = await call("/api/rankings/price-series/PETR4?basis=nominal", {
    auth: true,
  });
  assert.equal(series.status, 200);
  // 15:23 of 05/11: the bar of the day is in progress and stays out.
  assert.deepEqual(
    series.body.points
      .slice(-5)
      .map((point) => [
        point.date,
        point.source,
        point.close,
        point.gapBefore === true,
      ]),
    [
      ["2026-10-22", "agf", "57.83000000", false],
      ["2026-10-23", "agf", "58.68000000", false],
      ["2026-10-30", "escola", "52.71000000", true],
      ["2026-11-03", "brapi", "50.71000000", false],
      ["2026-11-04", "brapi", "47.12000000", false],
    ],
  );
  assert.ok(
    series.body.coverage.notes.some((note) => /depois das 19:00/.test(note)),
  );
  assert.equal(series.body.latestQuote.price, "46.00000000");
  assert.equal(series.body.latestQuote.connect, true);
  // 18:45: a fresh list read before 19:00 may still hold a price from before
  // the closing auction (M1): nothing is written.
  advance(at("2026-11-05T21:45:00Z") - Date.now());
  brapi.list = [
    ["PETR4", 45.95, 53109700],
    ["VALE3", 62.67, 1],
  ];
  assert.equal((await call("/api/rankings/public")).status, 200);
  // 18:59: the 18:45 copy is still cached and still not final.
  advance(14 * 60_000);
  assert.equal((await call("/api/rankings/public")).status, 200);
  assert.deepEqual(state.closes, []);
  // 19:01: the 18:45 copy expired (short TTL until 19:40), and the new list,
  // read from 19:00, writes the session's closes.
  advance(2 * 60_000);
  assert.equal((await call("/api/rankings/public")).status, 200);
  assert.deepEqual(state.closes, [
    ["PETR4", "2026-11-05", "45.95000000"],
    ["VALE3", "2026-11-05", "62.67000000"],
  ]);
  // Consciência Negra (Friday 20/11), 20:00: market closed, and the read
  // consolidates Thursday 19/11.
  advance(at("2026-11-20T23:00:00Z") - Date.now());
  brapi.list = [
    ["PETR4", 47.1, 1],
    ["VALE3", 63, 1],
  ];
  const holiday = await call("/api/rankings/public");
  assert.equal(holiday.body.market.state, "closed");
  assert.equal(holiday.body.market.refreshSeconds, 1800);
  assert.deepEqual(state.closes.slice(-2), [
    ["PETR4", "2026-11-19", "47.10000000"],
    ["VALE3", "2026-11-19", "63.00000000"],
  ]);
  assert.equal(
    logs.some((line) => line.includes("market_closes_error")),
    false,
  );
});
