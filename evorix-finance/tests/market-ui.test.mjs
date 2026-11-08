import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSafetyMarginPercent,
  researchMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";
import {
  marginCaption,
  marginSortValue,
  marketView,
  parsePublicRanking,
  parseRankingMarket,
  parseSafetyMargin,
  priceCaption,
  publicationDay,
  publicationMarket,
  rankingMarketNote,
  researchDayText,
  researchReference,
} from "../src/lib/marketData.ts";
import { parseQuote } from "../src/lib/liveQuotes.ts";

// 10:48 in São Paulo; "now" is 12:00 of the same day.
const checkedAt = "2026-11-05T13:48:14.389Z";
const now = Date.parse("2026-11-05T15:00:00Z");
const publishedAt = "2026-10-22T12:32:01Z";
const quote = (symbol, values = {}) =>
  parseQuote({
    symbol,
    price: "19.62000000",
    changePercent: "-0.9100",
    volume: "367700",
    checkedAt,
    freshness: "delayed",
    stale: false,
    unavailable: false,
    detail: "summary",
    source: "brapi.dev",
    session: null,
    ...values,
  });
// The server computes the margin; the tests only cross-check it here.
const entry = (
  ticker,
  { price = "19.62000000", ceiling = "32.74", basis } = {},
) => {
  const live = quote(ticker, { price });
  const chosen =
    basis ??
    (safetyMarginPercent(ceiling, price) === null ? "unavailable" : "market");
  return {
    ticker,
    quote: live,
    ceilingPrice: ceiling,
    researchPrice: "19.37",
    researchSafetyMargin: "41.00",
    safetyMargin: {
      percent:
        chosen === "unavailable"
          ? null
          : chosen === "research"
            ? "41.00"
            : safetyMarginPercent(ceiling, price),
      basis: chosen,
      price: chosen === "research" ? "19.37" : price,
      checkedAt: chosen === "research" ? "2026-10-20T03:00:00.000Z" : checkedAt,
    },
  };
};
const research = {
  price: "19.37",
  margin: "0.41",
  ceiling: "32.74",
  date: "2026-10-20",
};
const ready = { loading: false, failed: false, publishedAt, now };

test("market data answers are parsed strictly; null never becomes zero", () => {
  assert.deepEqual(
    parseSafetyMargin({
      percent: "40.84",
      basis: "market",
      price: "19.37000000",
      checkedAt,
    }),
    { percent: "40.84", basis: "market", price: "19.37000000", checkedAt },
  );
  assert.equal(parseSafetyMargin({ percent: "1.00", basis: "other" }), null);
  // A basis without a number to show is no margin at all.
  assert.equal(
    parseSafetyMargin({ percent: "40.8", basis: "market" }).basis,
    "unavailable",
  );
  assert.equal(
    parseSafetyMargin({ percent: "40.84", basis: "unavailable" }).percent,
    null,
  );
  const body = parseRankingMarket({
    publication: { id: 27, publishedAt },
    market: { state: "open", refreshSeconds: 900 },
    checkedAt,
    entries: [
      entry("TIMS3"),
      { ...entry("tims3"), ceilingPrice: "1" },
      { ...entry("ALOS3"), quote: quote("WIZC3"), ceilingPrice: "0" },
      { ticker: "SYN2", quote: null, safetyMargin: null },
    ],
  });
  assert.deepEqual(body.publication, { id: "27", publishedAt });
  assert.equal(body.market.refreshSeconds, 900);
  assert.deepEqual(Object.keys(body.entries), ["TIMS3", "ALOS3", "SYN2"]);
  assert.equal(body.entries.TIMS3.ceilingPrice, "32.74");
  // A quote of another ticker and a ceiling of zero are dropped.
  assert.equal(body.entries.ALOS3.quote, null);
  assert.equal(body.entries.ALOS3.ceilingPrice, null);
  assert.equal(body.entries.SYN2.safetyMargin, null);
  assert.deepEqual(parseRankingMarket(null).entries, {});
});

test("market basis: canonical price, change and margin with the formula", () => {
  const view = marketView(entry("TIMS3"), research, ready);
  assert.equal(view.price.state, "market");
  assert.equal(view.price.text, "R$ 19,62");
  assert.equal(view.price.change, "−0,91%");
  assert.equal(view.price.tone, "down");
  assert.equal(view.price.qualifier, null);
  assert.equal(
    view.price.title,
    "Cotação brapi.dev, consultada às 10:48 (horário de Brasília).",
  );
  assert.equal(view.margin.state, "market");
  assert.equal(view.margin.percent, safetyMarginPercent("32.74", "19.62"));
  assert.equal(view.margin.text, "40,07%");
  assert.equal(
    view.margin.title,
    "Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto = (R$ 32,74 − R$ 19,62) ÷ R$ 32,74 = 40,07%. Preço-teto da pesquisa de 20/10; cotação brapi.dev consultada às 10:48 (horário de Brasília).",
  );
  assert.equal(priceCaption(view, now), "brapi.dev · 10:48");
  assert.equal(marginCaption(view, now), "com a cotação de 10:48");
  assert.equal(marginSortValue(view), 40.07);
  assert.doesNotMatch(JSON.stringify(view), /tempo real/i);
});

test("the five broker examples: ceiling 10 and prices 5, 8, 10, 12 and 4", () => {
  const expected = [
    ["5", "50,00%"],
    ["8", "20,00%"],
    ["10", "0,00%"],
    ["12", "−20,00%"],
    ["4", "60,00%"],
  ];
  for (const [price, text] of expected) {
    assert.equal(
      formatSafetyMarginPercent(safetyMarginPercent("10", price)),
      text,
    );
    const view = marketView(
      entry("SYN10", { price, ceiling: "10" }),
      {},
      ready,
    );
    assert.equal(view.margin.text, text);
    assert.match(
      view.margin.title,
      new RegExp(`\\(R\\$ 10,00 − R\\$ ${price},00\\) ÷ R\\$ 10,00 = ${text}`),
    );
  }
});

test("stale: a failed refresh or a stale basis keeps the values, marked", () => {
  for (const view of [
    marketView(entry("TIMS3"), research, { ...ready, failed: true }),
    marketView(entry("TIMS3", { basis: "stale" }), research, ready),
  ]) {
    assert.equal(view.price.state, "stale");
    assert.equal(view.price.text, "R$ 19,62");
    assert.equal(view.price.qualifier, "defasada");
    assert.match(view.price.title, /Defasada: a consulta mais recente falhou/);
    assert.equal(view.margin.state, "stale");
    assert.equal(view.margin.text, "40,07%");
    assert.equal(view.margin.qualifier, "defasada");
    assert.equal(marginCaption(view, now), "defasada");
    assert.equal(priceCaption(view, now), "defasada · 10:48");
  }
});

test("research basis: research price and margin, with the research day", () => {
  const view = marketView(
    entry("ALOS3", { basis: "research" }),
    research,
    ready,
  );
  assert.equal(view.price.state, "research");
  assert.equal(view.price.text, "R$ 19,37");
  assert.equal(view.price.qualifier, "da pesquisa (20/10)");
  assert.equal(view.price.change, null);
  assert.equal(view.margin.state, "research");
  assert.equal(view.margin.text, "41,00%");
  assert.equal(view.margin.qualifier, "da pesquisa (20/10)");
  assert.match(
    view.margin.title,
    /^Margem de segurança da pesquisa de 20\/10: 41,00%, com o preço da pesquisa de R\$ 19,37\./,
  );
  // Without market data at all the research values are used the same way.
  const fallback = marketView(null, research, ready);
  assert.equal(fallback.price.text, "R$ 19,37");
  assert.equal(fallback.margin.percent, researchMarginPercent("0.41"));
  assert.equal(fallback.margin.qualifier, "da pesquisa (20/10)");
  // No research day: the publication day dates it.
  assert.equal(
    marketView(null, { ...research, date: null }, ready).margin.qualifier,
    "da pesquisa (22/10)",
  );
});

test("unavailable: no valid ceiling, no price, and the loading state", () => {
  const noCeiling = marketView(
    entry("SYN16", { ceiling: null, basis: "unavailable" }),
    { ...research, ceiling: null },
    ready,
  );
  assert.equal(noCeiling.price.state, "market");
  assert.equal(noCeiling.margin.state, "unavailable");
  assert.equal(noCeiling.margin.text, "Não informado");
  assert.equal(marginSortValue(noCeiling), null);
  assert.match(noCeiling.margin.title, /não informa um preço-teto válido/);
  assert.equal(marginCaption(noCeiling, now), "sem preço-teto válido");
  const nothing = marketView(null, {}, ready);
  assert.equal(nothing.price.state, "unavailable");
  assert.equal(nothing.price.text, "Não informado");
  assert.equal(nothing.margin.state, "unavailable");
  const loading = marketView(null, research, { ...ready, loading: true });
  assert.equal(loading.price.state, "loading");
  assert.equal(loading.price.text, "");
  assert.equal(loading.margin.text, "");
  assert.equal(priceCaption(loading, now), "consultando a cotação");
});

test("public pages: margin and quote of the same answer, never the ceiling", () => {
  const publication = parsePublicRanking({
    id: 27,
    title: "Ranking",
    updatedAt: publishedAt,
    totalEntries: 3,
    market: { state: "closed", refreshSeconds: 1800 },
    entries: [
      {
        rank: 1,
        ticker: "TEST0",
        companyName: "Empresa",
        dividendAnalysis: {
          estimatedGrossDividendYield: "0.1",
          projectedPE: "8",
          safetyMargin: "0.2",
          ceilingPrice: "99",
        },
        market: {
          quote: { ...quote("TEST0", { price: "0.80" }) },
          safetyMargin: {
            percent: safetyMarginPercent("1", "0.80"),
            basis: "market",
            price: "0.80",
            checkedAt,
          },
        },
      },
      { rank: 2, ticker: "TEST1", companyName: "Outra", dividendAnalysis: {} },
    ],
  });
  assert.equal(publication.market.refreshSeconds, 1800);
  // Only the three public indicators are kept.
  assert.deepEqual(Object.keys(publication.entries[0].dividendAnalysis), [
    "estimatedGrossDividendYield",
    "projectedPE",
    "safetyMargin",
  ]);
  const view = marketView(
    publication.entries[0].market,
    { margin: publication.entries[0].dividendAnalysis.safetyMargin },
    { ...ready, showCeiling: false },
  );
  assert.equal(view.margin.text, "20,00%");
  assert.equal(view.price.text, "R$ 0,80");
  assert.equal(
    view.margin.title,
    "Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto: 20,00%, com a cotação brapi.dev de R$ 0,80 consultada às 10:48 (horário de Brasília). O preço-teto está na pesquisa completa.",
  );
  assert.doesNotMatch(view.margin.title, /99/);
  // An answer without market data falls back to the research margin.
  assert.equal(publication.entries[1].market, null);
  const fallback = marketView(
    publication.entries[1].market,
    { margin: "0.18" },
    { ...ready, showCeiling: false },
  );
  assert.equal(fallback.margin.text, "18,00%");
  assert.equal(fallback.margin.qualifier, "da pesquisa (22/10)");
});

test("a publication: market data applies only to the one it was computed for", () => {
  const entries = [
    {
      ticker: "TIMS3",
      dividendAnalysis: {
        referencePrice: "19.37",
        safetyMargin: "0.41",
        ceilingPrice: "32.74",
        updatedOn: "2026-10-20",
      },
    },
    { ticker: "SYN2", dividendAnalysis: { safetyMargin: "0.02" } },
  ];
  const data = parseRankingMarket({
    publication: { id: "2", publishedAt },
    market: { state: "open", refreshSeconds: 900 },
    checkedAt,
    entries: [entry("TIMS3")],
  });
  const latest = publicationMarket(
    entries,
    { data, loading: false, failed: false },
    { id: "2", publishedAt },
    now,
  );
  assert.equal(latest.applies, true);
  assert.equal(latest.views.get("TIMS3").margin.text, "40,07%");
  assert.equal(latest.views.get("SYN2").margin.text, "2,00%");
  assert.equal(latest.views.get("SYN2").margin.state, "research");
  assert.equal(
    latest.note,
    "Preço de mercado: cotação da brapi.dev, consultada às 10:48 (horário de Brasília). Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto, recalculada a cada cotação; fica negativa quando a cotação passa do teto. O preço-teto vem da publicação de 22/10 e só muda com uma nova análise.",
  );
  assert.ok(latest.noteSizer.length >= latest.note.length - 2);
  const older = publicationMarket(
    entries,
    { data, loading: false, failed: false },
    { id: "1", publishedAt: "2026-10-01T12:00:00Z" },
    now,
  );
  assert.equal(older.applies, false);
  assert.equal(older.views.get("TIMS3").margin.state, "research");
  assert.equal(older.views.get("TIMS3").margin.text, "41,00%");
  assert.match(
    older.note,
    /^Nesta versão, preço de mercado e margem de segurança são os da pesquisa publicada em 01\/10/,
  );
  const failed = publicationMarket(
    entries,
    { data, loading: false, failed: true },
    { id: "2", publishedAt },
    now,
  );
  assert.equal(failed.views.get("TIMS3").price.state, "stale");
  assert.match(
    failed.note,
    /última cotação válida da brapi\.dev, consultada às 10:48/,
  );
  const waiting = publicationMarket(
    entries,
    { data: null, loading: true, failed: false },
    { id: "2", publishedAt },
    now,
  );
  assert.equal(waiting.views.get("TIMS3").price.state, "loading");
  assert.match(
    waiting.note,
    /^Preço de mercado: cotação da brapi.dev. Margem/,
  );
  const down = publicationMarket(
    entries,
    { data: null, loading: false, failed: true },
    { id: "2", publishedAt },
    now,
  );
  assert.equal(down.views.get("TIMS3").price.state, "research");
  assert.match(down.note, /^A cotação da brapi\.dev não está disponível agora/);
  for (const text of [
    latest.note,
    older.note,
    failed.note,
    waiting.note,
    down.note,
  ]) {
    assert.doesNotMatch(text, /tempo real|\d{2}\/\d{2}\/\d{4}/i);
  }
});

test("dates and the publication reference", () => {
  assert.equal(publicationDay("2026-10-22 12:32:01"), "22/10");
  assert.equal(publicationDay("2026-10-22T02:00:00Z"), "21/10");
  assert.equal(publicationDay("data"), null);
  assert.equal(researchDayText("2026-10-20"), "20/10");
  assert.equal(researchDayText("20/10/2026"), null);
  assert.equal(
    researchReference({ price: "19.37", margin: "0.41" }, publishedAt),
    "Na publicação de 22/10: preço R$ 19,37 e margem de segurança de 41,00%.",
  );
  assert.equal(
    researchReference({ price: null, margin: "-0.2" }, null),
    "Na publicação: preço não informado e margem de segurança de −20,00%.",
  );
  assert.equal(researchReference({}, publishedAt), null);
  assert.equal(
    rankingMarketNote(
      {
        loading: false,
        failed: false,
        applies: true,
        hasData: true,
        checkedAt: "2026-11-04T20:55:00Z",
        publishedAt,
      },
      now,
    ).includes("consultada em 04/11 às 17:55"),
    true,
  );
});
