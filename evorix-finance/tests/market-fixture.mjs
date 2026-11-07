// Deterministic market answers for the browser suites (docs/COTACOES.md and
// docs/MARGEM-E-HISTORICO.md). Never reaches brapi.dev; rejects what the real
// routes would reject. The margins are computed with safety-margin.mjs only
// to build the server's answer and cross-check what the screens show.
import {
  researchMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";

const tickerPattern = /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/;
// 10:48 in São Paulo: the time every quote of the fixture was read.
export const marketCheckedAt = "2026-11-05T13:48:14.389Z";
// Browser clock of the suites: 11:00 in São Paulo, the same day.
export const fixtureNow = new Date("2026-11-05T14:00:00.000Z");
export const marketState = {
  state: "open",
  refreshSeconds: 900,
  nextRefreshAt: "2026-11-05T14:03:14.389Z",
};

export function summaryQuote(symbol, values = {}) {
  return {
    symbol,
    name: symbol,
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
    checkedAt: marketCheckedAt,
    freshness: "delayed",
    stale: false,
    unavailable: false,
    detail: "summary",
    delayMinutes: null,
    source: "brapi.dev",
    session: null,
    ...values,
  };
}

// Canonical price of the list plus the session of the v2 quote (10:30).
export function fullQuote(symbol, values = {}) {
  return summaryQuote(symbol, {
    change: "-0.18000000",
    detail: "full",
    session: {
      open: "19.70000000",
      dayHigh: "19.95000000",
      dayLow: "19.50000000",
      previousClose: "19.80000000",
      quoteTime: "2026-11-05T13:30:00.000Z",
      checkedAt: "2026-11-05T13:31:02.000Z",
    },
    ...values,
  });
}

export function staleQuote(symbol, values = {}) {
  return summaryQuote(symbol, { freshness: "stale", stale: true, ...values });
}

export function unavailableQuote(symbol) {
  return summaryQuote(symbol, {
    price: null,
    changePercent: null,
    volume: null,
    freshness: "unavailable",
    unavailable: true,
  });
}

// "2026-10-20" as 00:00 in São Paulo, like the server dates the research.
const researchInstant = (date) =>
  typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T03:00:00.000Z`
    : null;

// Same rules as the contract: market, stale, research or unavailable.
export function safetyMarginOf({
  ceilingPrice,
  quote,
  researchPrice,
  researchSafetyMargin,
  researchCheckedAt,
}) {
  const listed = quote && !quote.unavailable ? quote.price : null;
  if (safetyMarginPercent(ceilingPrice, ceilingPrice) === null)
    return {
      percent: null,
      basis: "unavailable",
      price: listed,
      checkedAt: listed ? quote.checkedAt : null,
    };
  const percent = listed ? safetyMarginPercent(ceilingPrice, listed) : null;
  if (percent !== null)
    return {
      percent,
      basis: quote.freshness === "stale" ? "stale" : "market",
      price: listed,
      checkedAt: quote.checkedAt,
    };
  if (researchSafetyMargin !== null || researchPrice !== null)
    return {
      percent: researchSafetyMargin,
      basis: "research",
      price: researchPrice,
      checkedAt: researchCheckedAt,
    };
  return { percent: null, basis: "unavailable", price: null, checkedAt: null };
}

export function marketEntry(entry, quote, publishedAt = null) {
  const analysis = entry.dividendAnalysis ?? {};
  const researchSafetyMargin = researchMarginPercent(
    analysis.safetyMargin ?? null,
  );
  const researchPrice = analysis.referencePrice ?? null;
  return {
    ticker: entry.ticker,
    quote,
    ceilingPrice: analysis.ceilingPrice ?? null,
    researchPrice,
    researchSafetyMargin,
    safetyMargin: safetyMarginOf({
      ceilingPrice: analysis.ceilingPrice ?? null,
      quote,
      researchPrice:
        safetyMarginPercent(researchPrice, researchPrice) === null
          ? null
          : researchPrice,
      researchSafetyMargin,
      researchCheckedAt: researchInstant(analysis.updatedOn) ?? publishedAt,
    }),
  };
}

// GET /api/rankings/market for the latest publication.
export function rankingMarket(publication, quotes = {}, checkedAt) {
  return {
    publication: publication
      ? { id: publication.id, publishedAt: publication.updatedAt ?? null }
      : null,
    market: marketState,
    checkedAt: checkedAt ?? marketCheckedAt,
    entries: (publication?.entries ?? []).map((entry) =>
      marketEntry(
        entry,
        quotes[entry.ticker] ?? unavailableQuote(entry.ticker),
        publication.updatedAt ?? null,
      ),
    ),
  };
}

// GET /api/rankings/public: each entry gets { quote, safetyMargin }; the
// ceiling and the research price feed the margin and are never sent.
export function publicWithMarket(body, fullEntries, quotes = {}) {
  const research = new Map(fullEntries.map((entry) => [entry.ticker, entry]));
  return {
    ...body,
    market: marketState,
    entries: body.entries.map((entry) => {
      const full = research.get(entry.ticker) ?? entry;
      const quote = quotes[entry.ticker] ?? unavailableQuote(entry.ticker);
      return {
        ...entry,
        market: {
          quote,
          safetyMargin: safetyMarginOf({
            ceilingPrice: full.dividendAnalysis?.ceilingPrice ?? null,
            quote,
            researchPrice: null,
            researchSafetyMargin: researchMarginPercent(
              full.dividendAnalysis?.safetyMargin ?? null,
            ),
            researchCheckedAt: body.updatedAt ?? null,
          }),
        },
      };
    }),
  };
}

// GET /api/rankings/price-series/:ticker, with its coverage segments.
export function seriesAnswer(
  ticker,
  {
    basis = "nominal",
    granularity = "daily",
    availableBases = ["nominal"],
    defaultBasis = availableBases[0] ?? null,
    points = [],
    latestQuote = null,
    unavailableReason = null,
    notes = [],
  } = {},
) {
  const segments = [];
  for (const point of points) {
    const last = segments.at(-1);
    if (last && last.source === point.source) last.to = point.date;
    else
      segments.push({ from: point.date, to: point.date, source: point.source });
  }
  return {
    ticker,
    basis,
    granularity,
    availableBases,
    defaultBasis,
    points,
    latestQuote,
    coverage: {
      from: points[0]?.date ?? null,
      to: points.at(-1)?.date ?? null,
      segments,
      notes,
    },
    unavailableReason,
    checkedAt: points.length ? marketCheckedAt : null,
  };
}

export function marketFixture({
  quotes = {},
  details = {},
  publication = null,
  series = {},
} = {}) {
  const fixture = {
    calls: [],
    // Set to true to make the market routes answer 503.
    failRanking: false,
    quotes,
    details,
    publication,
    series,
    checkedAt: marketCheckedAt,
    handles: (url) =>
      url.pathname.startsWith("/api/market/") ||
      url.pathname === "/api/rankings/market" ||
      url.pathname.startsWith("/api/rankings/price-series/"),
    respond(url) {
      const path = url.pathname;
      fixture.calls.push(path + url.search);
      if (path === "/api/rankings/market") {
        if (fixture.failRanking)
          return { status: 503, data: { error: "Falha simulada" } };
        return {
          status: 200,
          data: rankingMarket(
            fixture.publication,
            fixture.quotes,
            fixture.checkedAt,
          ),
        };
      }
      const ticker = decodeURIComponent(path.split("/").at(-1));
      if (!tickerPattern.test(ticker))
        return { status: 400, data: { error: "Ticker inválido" } };
      if (path === "/api/rankings/price-series/" + ticker) {
        const basis = url.searchParams.get("basis");
        const granularity = url.searchParams.get("granularity") || "daily";
        if (
          (basis !== null && !["adjusted", "nominal"].includes(basis)) ||
          !["daily", "monthly"].includes(granularity)
        )
          return {
            status: 400,
            data: { error: "Código da ação, base ou período inválido." },
          };
        const answer =
          fixture.series[ticker]?.[basis ?? "nominal"]?.[granularity];
        return {
          status: 200,
          data:
            answer ??
            seriesAnswer(ticker, {
              basis: basis ?? "nominal",
              granularity,
              availableBases: [],
              unavailableReason: "not_covered",
            }),
        };
      }
      if (path === "/api/market/quote/" + ticker)
        return {
          status: 200,
          data: {
            quote:
              fixture.details[ticker] ??
              fixture.quotes[ticker] ??
              unavailableQuote(ticker),
            market: marketState,
          },
        };
      return {
        status: 404,
        data: { error: "Rota de mercado fora da fixture" },
      };
    },
  };
  return fixture;
}
