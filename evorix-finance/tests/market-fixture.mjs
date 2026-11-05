// Deterministic /api/market/* answers for the browser suites (docs/COTACOES.md).
// Never reaches brapi.dev; rejects what the real routes would reject.

const tickerPattern = /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/;
// 10:48 in São Paulo.
export const marketCheckedAt = "2026-11-05T13:48:14.389Z";
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
    ...values,
  };
}

export function fullQuote(symbol, values = {}) {
  return summaryQuote(symbol, {
    change: "-0.18000000",
    previousClose: "19.80000000",
    dayHigh: "19.95000000",
    dayLow: "19.50000000",
    // 10:30 in São Paulo.
    quoteTime: "2026-11-05T13:30:00.000Z",
    marketTime: "2026-11-05T13:30:00.000Z",
    detail: "full",
    delayMinutes: 30,
    ...values,
  });
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

export function marketFixture({
  quotes = {},
  details = {},
  history = {},
} = {}) {
  const fixture = {
    calls: [],
    failQuotes: false,
    quotes,
    details,
    history,
    handles: (url) => url.pathname.startsWith("/api/market/"),
    respond(url) {
      const path = url.pathname;
      fixture.calls.push(path + url.search);
      if (path === "/api/market/quotes") {
        if (fixture.failQuotes)
          return { status: 503, data: { error: "Falha simulada" } };
        const symbols = (url.searchParams.get("symbols") || "").split(",");
        if (
          !symbols.length ||
          symbols.length > 100 ||
          symbols.some((symbol) => !tickerPattern.test(symbol))
        )
          return { status: 400, data: { error: "Tickers inválidos" } };
        return {
          status: 200,
          data: {
            quotes: symbols.map(
              (symbol) => fixture.quotes[symbol] ?? unavailableQuote(symbol),
            ),
            market: marketState,
          },
        };
      }
      const ticker = decodeURIComponent(path.split("/").at(-1));
      if (!tickerPattern.test(ticker))
        return { status: 400, data: { error: "Ticker inválido" } };
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
      if (path === "/api/market/history/" + ticker)
        return {
          status: 200,
          data: {
            symbol: ticker,
            available: false,
            reason: "no_token",
            interval: "1d",
            range: url.searchParams.get("range"),
            points: [],
            checkedAt: marketCheckedAt,
            source: "brapi.dev",
            ...fixture.history[ticker],
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
