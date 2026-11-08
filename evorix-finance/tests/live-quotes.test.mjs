import test from "node:test";
import assert from "node:assert/strict";
import {
  consultedAt,
  decimal,
  markStale,
  parseMarket,
  parseQuote,
  parseSession,
  priceText,
  quoteSourceText,
  quoteSymbols,
  quoteTone,
  refreshMs,
  saoPauloMoment,
  sessionFields,
} from "../src/lib/liveQuotes.ts";

const summary = {
  symbol: "TIMS3",
  name: "TIM S.A.",
  logoUrl: null,
  currency: "BRL",
  price: "19.62000000",
  change: null,
  changePercent: "-0.9100",
  previousClose: null,
  dayHigh: null,
  dayLow: null,
  volume: "367700",
  quoteTime: null,
  marketTime: null,
  checkedAt: "2026-11-05T13:48:14.389Z",
  freshness: "delayed",
  stale: false,
  unavailable: false,
  detail: "summary",
  delayMinutes: null,
  source: "brapi.dev",
  session: null,
};
const now = Date.parse("2026-11-05T15:00:00Z");

test("symbol sets are normalized and validated with the server rule", () => {
  assert.deepEqual(
    quoteSymbols([
      "tims3",
      "TIMS3",
      " alos3 ",
      "SYN2",
      "TAEE11",
      "MGLU3F",
      "B3SA3",
      "3BSA3",
      "TIMS",
      "../X",
    ]),
    ["ALOS3", "B3SA3", "MGLU3F", "TAEE11", "TIMS3"],
  );
});

test("decimal text stays exact; null, zero and negatives are never a price", () => {
  assert.equal(decimal("19.62000000"), 19.62);
  assert.equal(decimal("-0.9100"), -0.91);
  assert.equal(decimal("0"), 0);
  assert.equal(decimal(null), null);
  assert.equal(decimal(""), null);
  assert.equal(decimal("1e5"), null);
  assert.equal(decimal("NaN"), null);
  assert.equal(decimal(Number.POSITIVE_INFINITY), null);
  assert.equal(priceText("19.62000000"), "19.62000000");
  assert.equal(priceText("0"), null);
  assert.equal(priceText("-1"), null);
  assert.equal(priceText(null), null);
  // A zero price reads as unavailable: zero never stands in for a quote.
  assert.equal(parseQuote({ ...summary, price: "0" }).unavailable, true);
});

test("summary quote: canonical price and change %, no session invented", () => {
  const quote = parseQuote(summary);
  assert.equal(quote.detail, "summary");
  assert.equal(quote.freshness, "delayed");
  assert.equal(quote.price, "19.62000000");
  assert.equal(quote.session, null);
  assert.equal(quoteTone(quote), "down");
  assert.deepEqual(sessionFields(quote.session), []);
  const source = quoteSourceText(quote, now);
  assert.equal(
    source,
    "Cotação brapi.dev, consultada às 10:48 (horário de Brasília).",
  );
  assert.doesNotMatch(source, /tempo real/i);
});

test("session of the v2 quote: day fields in order, with its own time", () => {
  const quote = parseQuote({
    ...summary,
    change: "0.18",
    changePercent: "0.9200",
    detail: "full",
    delayMinutes: 30,
    session: {
      open: "19.40000000",
      dayHigh: "19.80",
      dayLow: "19.31",
      previousClose: "19.44",
      quoteTime: "2026-11-05T13:30:00.000Z",
      checkedAt: "2026-11-05T13:31:00.000Z",
    },
  });
  assert.equal(quoteTone(quote), "up");
  assert.equal(quote.session.quoteTime, "2026-11-05T13:30:00.000Z");
  assert.deepEqual(
    sessionFields(quote.session).map((field) => [field.label, field.value]),
    [
      ["Abertura", "R$ 19,40"],
      ["Máxima do dia", "R$ 19,80"],
      ["Mínima do dia", "R$ 19,31"],
      ["Fechamento anterior", "R$ 19,44"],
    ],
  );
  assert.equal(
    quoteSourceText(quote, now),
    "Cotação brapi.dev, consultada às 10:48 (horário de Brasília).",
  );
  // A session without any valid price is no session; zero is left out.
  assert.equal(parseSession({ open: "0", dayHigh: null }), null);
  assert.deepEqual(
    sessionFields(parseSession({ open: "0", dayHigh: "20.5" })).map(
      (field) => field.key,
    ),
    ["dayHigh"],
  );
});

test("another São Paulo day shows the date with the time", () => {
  assert.equal(saoPauloMoment("2026-11-04T20:55:00Z", now), "04/11 às 17:55");
  assert.equal(consultedAt("2026-11-05T13:48:00Z", now), "às 10:48");
  assert.equal(consultedAt("2026-11-04T20:55:00Z", now), "em 04/11 às 17:55");
  assert.equal(
    quoteSourceText(
      parseQuote({ ...summary, checkedAt: "2026-11-04T20:55:00Z" }),
      now,
    ),
    "Cotação brapi.dev, consultada em 04/11 às 17:55 (horário de Brasília).",
  );
});

test("stale and unavailable quotes are labeled, never shown as numbers", () => {
  const stale = parseQuote({ ...summary, freshness: "stale", stale: true });
  assert.equal(stale.stale, true);
  assert.match(quoteSourceText(stale, now), /Defasada/);
  const refreshedFailure = markStale(parseQuote(summary));
  assert.equal(refreshedFailure.stale, true);
  assert.equal(refreshedFailure.price, "19.62000000");
  const unavailable = parseQuote({
    ...summary,
    price: null,
    changePercent: null,
    volume: null,
    freshness: "unavailable",
    unavailable: true,
  });
  assert.equal(unavailable.unavailable, true);
  assert.equal(unavailable.price, null);
  assert.equal(quoteTone(unavailable), null);
  assert.equal(markStale(unavailable).stale, false);
  // A price without number is unavailable even if the flags disagree.
  assert.equal(parseQuote({ ...summary, price: "abc" }).unavailable, true);
  assert.equal(parseQuote(null), null);
  assert.equal(parseQuote({ price: "1" }), null);
});

test("refresh interval follows the server within safe bounds", () => {
  assert.equal(refreshMs({ refreshSeconds: 900 }), 900_000);
  assert.equal(refreshMs({ refreshSeconds: 1800 }), 1_800_000);
  assert.equal(refreshMs({ refreshSeconds: 0 }), 900_000);
  assert.equal(refreshMs({ refreshSeconds: 5 }), 60_000);
  assert.equal(refreshMs({ refreshSeconds: 86_400 }), 3_600_000);
  assert.equal(refreshMs(null), 900_000);
  assert.deepEqual(
    parseMarket({
      state: "open",
      refreshSeconds: 900,
      nextRefreshAt: "2026-11-05T14:03:14.389Z",
    }),
    {
      state: "open",
      refreshSeconds: 900,
      nextRefreshAt: "2026-11-05T14:03:14.389Z",
    },
  );
});
