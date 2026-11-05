import test from "node:test";
import assert from "node:assert/strict";
import {
  chunkSymbols,
  decimal,
  firstOpenDate,
  markStale,
  parseMarket,
  parseQuote,
  quoteFields,
  quoteLine,
  quoteSourceText,
  quoteSymbols,
  quoteTone,
  refreshMs,
  saoPauloMoment,
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
};
const now = Date.parse("2026-11-05T15:00:00Z");

test("symbol sets are normalized, validated and split in chunks of 100", () => {
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
  assert.deepEqual(
    quoteSymbols(["B", "A"].map((x) => x + "BCD3")),
    quoteSymbols(["ABCD3", "BBCD3"]),
  );
  const many = Array.from({ length: 250 }, (_, i) => "ABCD" + (i % 99));
  assert.deepEqual(
    chunkSymbols(many).map((chunk) => chunk.length),
    [100, 100, 50],
  );
  assert.deepEqual(chunkSymbols([]), []);
});

test("decimal text stays exact and null never becomes zero", () => {
  assert.equal(decimal("19.62000000"), 19.62);
  assert.equal(decimal("-0.9100"), -0.91);
  assert.equal(decimal("0"), 0);
  assert.equal(decimal(null), null);
  assert.equal(decimal(""), null);
  assert.equal(decimal("1e5"), null);
  assert.equal(decimal("NaN"), null);
  assert.equal(decimal(Number.POSITIVE_INFINITY), null);
});

test("summary quote: price, change % and volume, no invented fields", () => {
  const quote = parseQuote(summary);
  assert.equal(quote.detail, "summary");
  assert.equal(quote.freshness, "delayed");
  assert.deepEqual(quoteLine(quote), {
    prefix: "agora",
    price: "R$ 19,62",
    percent: "−0,91%",
  });
  assert.equal(quoteTone(quote), "down");
  assert.deepEqual(quoteFields(quote), [
    { key: "volume", label: "Volume", value: "367.700" },
  ]);
  const source = quoteSourceText(quote, now);
  assert.equal(
    source,
    "Cotação brapi.dev com atraso, consultada às 10:48 (horário de Brasília).",
  );
  assert.doesNotMatch(source, /tempo real/i);
});

test("full quote: every field, quote time in São Paulo and declared delay", () => {
  const quote = parseQuote({
    ...summary,
    change: "0.18",
    changePercent: "0.9200",
    previousClose: "19.44",
    dayHigh: "19.80",
    dayLow: "19.31",
    quoteTime: "2026-11-05T13:30:00.000Z",
    detail: "full",
    delayMinutes: 30,
  });
  assert.deepEqual(quoteLine(quote), {
    prefix: "agora",
    price: "R$ 19,62",
    percent: "+0,92%",
  });
  assert.equal(quoteTone(quote), "up");
  assert.deepEqual(
    quoteFields(quote).map((field) => [field.label, field.value]),
    [
      ["Fechamento anterior", "R$ 19,44"],
      ["Máxima do dia", "R$ 19,80"],
      ["Mínima do dia", "R$ 19,31"],
      ["Volume", "367.700"],
    ],
  );
  assert.equal(
    quoteSourceText(quote, now),
    "Cotação brapi.dev com atraso de até 30 min, cotação de 10:30 (horário de Brasília).",
  );
  // Another São Paulo day shows the date with the time.
  assert.equal(saoPauloMoment("2026-11-04T20:55:00Z", now), "04/11 às 17:55");
});

test("stale and unavailable quotes are labeled, never shown as numbers", () => {
  const stale = parseQuote({ ...summary, freshness: "stale", stale: true });
  assert.equal(quoteLine(stale).prefix, "defasada");
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
  assert.equal(quoteLine(unavailable), null);
  assert.equal(quoteTone(unavailable), null);
  assert.equal(markStale(unavailable).stale, false);
  // A price without number is unavailable even if the flags disagree.
  assert.equal(parseQuote({ ...summary, price: "abc" }).unavailable, true);
  assert.equal(quoteLine(null), null);
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

test("daily close of the session still trading is not final", () => {
  // Thursday 05/11/2026, 12:00 and 18:45 in São Paulo; Saturday 07/11.
  assert.equal(firstOpenDate(Date.parse("2026-11-05T15:00:00Z")), "2026-11-05");
  assert.equal(firstOpenDate(Date.parse("2026-11-05T21:45:00Z")), "2026-11-06");
  assert.equal(firstOpenDate(Date.parse("2026-11-07T15:00:00Z")), "2026-11-08");
  // 01:00 UTC on Friday is still Thursday night in São Paulo.
  assert.equal(firstOpenDate(Date.parse("2026-11-06T01:00:00Z")), "2026-11-06");
});
