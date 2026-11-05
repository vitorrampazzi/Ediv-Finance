import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createBrapiProvider,
  normalizeCatalog,
  normalizeHistory,
  normalizeQuote,
  parseRetryAfter,
  ProviderError,
} from "../server/market/brapi-provider.js";
import {
  cacheTtlMs,
  marketSession,
  publicMarket,
  saoPauloDate,
} from "../server/market/market-session.js";
import {
  historyQuerySchema,
  symbolsSchema,
  tickerSchema,
} from "../server/market/validation.js";
import {
  brapiPlans,
  parseBrapiPlan,
  parseDailyBudget,
} from "../server/market/plans.js";
import { hasStockHistory } from "../server/stock-history.js";

// Real brapi samples fetched on 05/11/2026.
const v2Quote = {
  results: [
    {
      requestedSymbol: "PETR4",
      symbol: "PETR4",
      changed: false,
      data: {
        shortName: "PETR4",
        longName: "Petroleo Brasileiro SA Pfd",
        currency: "BRL",
        regularMarketPrice: 47.9,
        regularMarketDayHigh: 48.04,
        regularMarketDayLow: 47.76,
        regularMarketChange: 0.78,
        regularMarketChangePercent: 1.66,
        regularMarketTime: "2026-11-05T13:47:30.000Z",
        marketCap: 647681842186,
        regularMarketVolume: 3350400,
        regularMarketPreviousClose: 47.12,
        regularMarketOpen: 47.9,
        logourl: "https://icons.brapi.dev/icons/PETR4.svg",
      },
    },
  ],
  requestedAt: "2026-11-05T13:48:14.389Z",
  took: 0,
};
const v2History = {
  results: [
    {
      requestedSymbol: "PETR4",
      symbol: "PETR4",
      changed: false,
      data: {
        usedInterval: "1d",
        usedRange: "1mo",
        historicalDataPrice: [
          {
            date: 1793847600,
            open: 47.9,
            high: 48.04,
            low: 47.76,
            close: 47.9,
            volume: 3350400,
            adjustedClose: 47.9,
          },
          {
            date: 1793761200,
            open: 50.04,
            high: 50.31,
            low: 46.64,
            close: 47.12,
            volume: 94219800,
            adjustedClose: 47.12,
          },
        ],
      },
    },
  ],
};
const catalogItem = {
  stock: "TIMS3",
  name: "TIM S.A.",
  close: 19.62,
  change: -0.91,
  volume: 367700,
  market_cap: 47102491789,
  logo: "https://icons.brapi.dev/icons/TIMS3.svg",
  sector: "Communications",
  subsector: "Telecomunicações",
  type: "stock",
  subType: "stock",
};

test("normaliza a cotação v2 real da brapi em texto decimal", () => {
  assert.deepEqual(normalizeQuote(v2Quote, "PETR4"), {
    symbol: "PETR4",
    name: "Petroleo Brasileiro SA Pfd",
    logoUrl: "https://icons.brapi.dev/icons/PETR4.svg",
    currency: "BRL",
    price: "47.90000000",
    change: "0.78000000",
    changePercent: "1.6600",
    previousClose: "47.12000000",
    dayHigh: "48.04000000",
    dayLow: "47.76000000",
    volume: "3350400",
    quoteTime: "2026-11-05T13:47:30.000Z",
  });
  assert.throws(() => normalizeQuote(v2Quote, "VALE3"), ProviderError);
  assert.throws(() => normalizeQuote({ results: "x" }, "PETR4"), ProviderError);
});

test("normaliza o histórico v2 real: mais antigo primeiro e data de São Paulo", () => {
  assert.deepEqual(normalizeHistory(v2History, "PETR4"), [
    {
      date: "2026-11-04",
      close: "47.12000000",
      adjustedClose: "47.12000000",
      volume: "94219800",
    },
    {
      date: "2026-11-05",
      close: "47.90000000",
      adjustedClose: "47.90000000",
      volume: "3350400",
    },
  ]);
});

test("histórico descarta fechamento nulo, deduplica datas e usa o fuso de São Paulo", () => {
  const at = (iso) => Date.parse(iso) / 1000;
  const payload = {
    results: [
      {
        symbol: "VALE3",
        data: {
          historicalDataPrice: [
            // 02:00 UTC of 05/11 is still 04/11 in São Paulo.
            { date: at("2026-11-05T02:00:00Z"), close: 60, volume: 1 },
            { date: at("2026-11-04T03:00:00Z"), close: 59, volume: 2 },
            { date: at("2026-11-03T03:00:00Z"), close: null, volume: 3 },
            { date: at("2026-11-02T03:00:00Z"), close: "", volume: 4 },
            { date: at("2026-11-01T03:00:00Z"), close: 0, volume: 5 },
            { date: "garbage", close: 10 },
            {
              date: at("2026-10-30T03:00:00Z"),
              close: 58,
              adjustedClose: null,
            },
          ],
        },
      },
    ],
  };
  assert.deepEqual(normalizeHistory(payload, "VALE3"), [
    {
      date: "2026-10-30",
      close: "58.00000000",
      adjustedClose: null,
      volume: null,
    },
    {
      date: "2026-11-04",
      close: "60.00000000",
      adjustedClose: null,
      volume: "1",
    },
  ]);
});

test("normaliza o item real da lista geral sem horário de cotação", () => {
  const catalog = normalizeCatalog({
    stocks: [catalogItem, { ...catalogItem }, { stock: "../x" }],
    availableSectors: ["Communications", 7],
  });
  assert.deepEqual(catalog, {
    items: [
      {
        symbol: "TIMS3",
        name: "TIM S.A.",
        logoUrl: "https://icons.brapi.dev/icons/TIMS3.svg",
        price: "19.62000000",
        changePercent: "-0.9100",
        volume: "367700",
        marketCap: "47102491789",
        sector: "Communications",
        subSector: "Telecomunicações",
        type: "stock",
        subType: "stock",
      },
    ],
    availableSectors: ["Communications"],
  });
  assert.throws(() => normalizeCatalog({}), ProviderError);
});

test("null, vazio e lixo nunca viram zero; zero informado continua zero", () => {
  const [item] = normalizeCatalog({
    stocks: [
      {
        stock: "ABCD3",
        close: null,
        change: null,
        volume: null,
        market_cap: "",
        sector: null,
      },
    ],
  }).items;
  assert.equal(item.price, null);
  assert.equal(item.changePercent, null);
  assert.equal(item.volume, null);
  assert.equal(item.marketCap, null);
  const quote = normalizeQuote(
    {
      results: [
        {
          symbol: "ABCD3",
          data: {
            regularMarketPrice: 10,
            regularMarketChange: 0,
            regularMarketChangePercent: null,
            regularMarketPreviousClose: null,
            regularMarketDayHigh: false,
            regularMarketDayLow: "abc",
            regularMarketVolume: undefined,
            regularMarketTime: null,
          },
        },
      ],
    },
    "ABCD3",
  );
  assert.equal(quote.change, "0.00000000");
  for (const field of [
    "changePercent",
    "previousClose",
    "dayHigh",
    "dayLow",
    "volume",
    "quoteTime",
  ])
    assert.equal(quote[field], null, field);
  // A quote without a positive price is not usable.
  assert.throws(
    () =>
      normalizeQuote(
        { results: [{ symbol: "ABCD3", data: { regularMarketPrice: null } }] },
        "ABCD3",
      ),
    ProviderError,
  );
});

test("sessão de São Paulo: 10h às 18h em dias úteis, fins de semana fechados", () => {
  const at = (iso) => marketSession(Date.parse(iso));
  // Quinta-feira, 05/11/2026 (UTC-3).
  assert.equal(at("2026-11-05T12:59:59Z").state, "closed");
  assert.equal(
    at("2026-11-05T12:59:59Z").nextOpenAt,
    "2026-11-05T13:00:00.000Z",
  );
  assert.equal(at("2026-11-05T13:00:00Z").state, "open");
  assert.equal(at("2026-11-05T20:59:59Z").state, "open");
  assert.equal(at("2026-11-05T21:00:00Z").state, "closed");
  assert.equal(
    at("2026-11-05T21:00:00Z").nextOpenAt,
    "2026-11-06T13:00:00.000Z",
  );
  // Sexta à noite, sábado e domingo levam à segunda 09/11 às 10h.
  for (const iso of [
    "2026-11-06T22:00:00Z",
    "2026-11-07T15:00:00Z",
    "2026-11-08T23:59:00Z",
    // Domingo 22h em São Paulo já é segunda em UTC.
    "2026-11-09T01:00:00Z",
  ]) {
    assert.equal(at(iso).state, "closed", iso);
    assert.equal(at(iso).nextOpenAt, "2026-11-09T13:00:00.000Z", iso);
  }
  assert.equal(saoPauloDate(Date.parse("2026-11-09T01:00:00Z")), "2026-11-08");
  assert.deepEqual(publicMarket(Date.parse("2026-11-05T13:48:00Z")), {
    state: "open",
    refreshSeconds: 900,
    nextRefreshAt: "2026-11-05T14:03:00.000Z",
  });
  const closed = publicMarket(Date.parse("2026-11-05T23:00:00Z"));
  assert.equal(closed.refreshSeconds, 1800);
  assert.equal(closed.nextRefreshAt, "2026-11-05T23:30:00.000Z");
  // Perto da abertura, a interface acorda no pregão, não 30 min depois.
  assert.equal(
    publicMarket(Date.parse("2026-11-05T12:50:00Z")).nextRefreshAt,
    "2026-11-05T13:00:00.000Z",
  );
});

test("TTL: aberto 15/15/60 min; fechado até a abertura, no máximo 12 h", () => {
  const minutes = (kind, iso) => cacheTtlMs(kind, Date.parse(iso)) / 60_000;
  assert.equal(minutes("catalog", "2026-11-05T14:00:00Z"), 15);
  assert.equal(minutes("quote", "2026-11-05T14:00:00Z"), 15);
  assert.equal(minutes("history", "2026-11-05T14:00:00Z"), 60);
  // 07:00 em São Paulo: 3 h até a abertura.
  assert.equal(minutes("quote", "2026-11-05T10:00:00Z"), 180);
  assert.equal(minutes("history", "2026-11-05T10:00:00Z"), 180);
  // Noite e fim de semana: teto de 12 h.
  assert.equal(minutes("catalog", "2026-11-06T00:00:00Z"), 720);
  assert.equal(minutes("quote", "2026-11-07T15:00:00Z"), 720);
  // Sem TTL menor que 1 minuto perto da abertura.
  assert.equal(minutes("quote", "2026-11-05T12:59:30Z"), 1);
  // 45 min depois do fechamento o feed atrasado ainda publica o call final.
  assert.equal(minutes("quote", "2026-11-05T21:10:00Z"), 15);
  assert.equal(minutes("quote", "2026-11-05T21:50:00Z"), 720);
  assert.throws(() => cacheTtlMs("other", Date.now()));
});

test("valida ticker, lista de 1 a 100 e período", () => {
  for (const ticker of [
    "PETR4",
    "petr4",
    " VALE3 ",
    "B3SA3",
    "SANB11",
    "PETR4F",
  ])
    assert.equal(tickerSchema.safeParse(ticker).success, true, ticker);
  for (const ticker of [
    "PETR",
    "PETR123",
    "4ETR4",
    "PE TR4",
    "PETR4?x=1",
    "../PETR4",
    "PETR4/../x",
    "PETR4%2F",
    "",
    ["PETR4"],
    null,
  ])
    assert.equal(tickerSchema.safeParse(ticker).success, false, String(ticker));
  assert.deepEqual(symbolsSchema.parse("petr4, VALE3,,PETR4"), [
    "PETR4",
    "VALE3",
  ]);
  // Favorites saved under the wider rule still parse; the route answers them
  // as unavailable instead of failing the whole batch.
  assert.deepEqual(symbolsSchema.parse("PETR4,BRK.B"), ["PETR4", "BRK.B"]);
  assert.equal(symbolsSchema.safeParse("PETR4,../X").success, false);
  const hundred = Array.from(
    { length: 100 },
    (_, index) =>
      `ABC${String.fromCharCode(65 + Math.floor(index / 10))}${index % 10}`,
  );
  assert.equal(symbolsSchema.parse(hundred.join(",")).length, 100);
  assert.equal(
    symbolsSchema.safeParse([...hundred, "ZZZZ3"].join(",")).success,
    false,
  );
  assert.equal(
    symbolsSchema.safeParse([...hundred, hundred[0]].join(",")).success,
    true,
    "Duplicates collapse before the limit",
  );
  for (const value of ["", ",", "PETR4,https://x", ["PETR4"], undefined])
    assert.equal(symbolsSchema.safeParse(value).success, false, String(value));
  assert.deepEqual(historyQuerySchema.parse({}), { range: "1mo" });
  assert.deepEqual(historyQuerySchema.parse({ range: "1y" }), { range: "1y" });
  for (const range of ["5y", "1d", ["1mo", "1y"], "1mo&x=1"])
    assert.equal(historyQuerySchema.safeParse({ range }).success, false);
});

test("planos e orçamento vêm de variáveis com padrão conservador", () => {
  assert.equal(parseBrapiPlan(undefined), "free");
  assert.equal(parseBrapiPlan(" Startup "), "startup");
  assert.equal(parseBrapiPlan("enterprise"), "free");
  assert.equal(brapiPlans.free.delayMinutes, 30);
  assert.deepEqual([...brapiPlans.free.historyRanges], ["1mo", "3mo"]);
  assert.deepEqual([...brapiPlans.startup.historyRanges], ["1mo", "3mo", "1y"]);
  assert.equal(parseDailyBudget(undefined), 420);
  assert.equal(parseDailyBudget(""), 420);
  assert.equal(parseDailyBudget("0"), 0);
  assert.equal(parseDailyBudget("1200"), 1200);
  assert.equal(parseDailyBudget("-1"), 420);
  assert.equal(parseDailyBudget("1e3"), 420);
  assert.equal(parseDailyBudget("99999999"), 420);
});

test("cobertura do histórico usa a lista fixa igual ao snapshot empacotado", () => {
  const dataset = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL("../server/data/stock-history.json.gz", import.meta.url),
      ),
    ),
  );
  const tickers = Object.keys(dataset.stocks);
  assert.equal(tickers.length, 90);
  for (const ticker of tickers)
    assert.equal(hasStockHistory(ticker), true, ticker);
  assert.equal(hasStockHistory("MGLU3"), false);
  assert.equal(hasStockHistory("hasOwnProperty"), false);
});

test("Retry-After aceita segundos e data HTTP, com padrão e limites", () => {
  const now = Date.parse("2026-11-05T13:00:00Z");
  assert.equal(parseRetryAfter("120", now), 120_000);
  assert.equal(parseRetryAfter("Thu, 05 Nov 2026 13:02:00 GMT", now), 120_000);
  assert.equal(parseRetryAfter(null, now), 60_000);
  assert.equal(parseRetryAfter("soon", now), 60_000);
  assert.equal(parseRetryAfter("0", now), 1000);
  assert.equal(parseRetryAfter("9999999", now), 24 * 60 * 60_000);
});

test("provedor envia o token só no header e o log não leva token nem query string", async () => {
  const token = "tok_secret_123";
  const calls = [];
  const logs = [];
  const provider = createBrapiProvider({
    token,
    log: (entry) => logs.push(JSON.stringify(entry)),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const path = new URL(url).pathname;
      if (path === "/api/v2/stocks/quote") return Response.json(v2Quote);
      if (path === "/api/v2/stocks/historical") return Response.json(v2History);
      if (path === "/api/quote/list")
        return Response.json({ stocks: [catalogItem] });
      return new Response("{}", { status: 404 });
    },
  });
  assert.equal((await provider.quote("PETR4")).price, "47.90000000");
  assert.equal((await provider.history("PETR4", "1mo")).length, 2);
  assert.equal((await provider.catalog()).items.length, 1);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(new URL(call.url).origin, "https://brapi.dev");
    assert.doesNotMatch(call.url, new RegExp(token));
    assert.doesNotMatch(call.url, /token=/i);
    assert.equal(call.init.headers.Authorization, `Bearer ${token}`);
    assert.equal(call.init.redirect, "error");
  }
  assert.equal(
    calls[0].url,
    "https://brapi.dev/api/v2/stocks/quote?symbols=PETR4",
  );
  assert.equal(
    calls[1].url,
    "https://brapi.dev/api/v2/stocks/historical?symbols=PETR4&range=1mo&interval=1d",
  );
  assert.equal(logs.length, 3);
  for (const line of logs) {
    const entry = JSON.parse(line);
    assert.equal(entry.event, "brapi_call");
    assert.equal(entry.status, 200);
    assert.equal(typeof entry.durationMs, "number");
    assert.match(entry.endpoint, /^\/api\//);
    assert.doesNotMatch(line, new RegExp(token));
    assert.doesNotMatch(line, /\?|symbols=|PETR4|Bearer/);
  }
  // Invalid input never reaches fetch.
  await assert.rejects(provider.quote("PETR4&token=x"), ProviderError);
  await assert.rejects(provider.history("PETR4", "max"), ProviderError);
  assert.equal(calls.length, 3);

  const anonymous = [];
  const tokenless = createBrapiProvider({
    log: () => {},
    fetchImpl: async (url, init) => {
      anonymous.push(init.headers);
      return new Response("{}", { status: 401 });
    },
  });
  await assert.rejects(tokenless.quote("TIMS3"), (error) => {
    assert.equal(error.code, "http");
    assert.equal(error.status, 401);
    return true;
  });
  assert.equal(anonymous[0].Authorization, undefined);
});

test("provedor classifica 429, falha de rede e resposta inválida", async () => {
  const logs = [];
  const responses = [
    () => new Response("{}", { status: 429, headers: { "Retry-After": "30" } }),
    () => {
      throw Object.assign(
        new TypeError("fetch failed https://brapi.dev/?token=x"),
        {
          cause: { code: "ECONNRESET" },
        },
      );
    },
    () => new Response("not json", { status: 200 }),
  ];
  const provider = createBrapiProvider({
    token: "abc",
    log: (entry) => logs.push(entry),
    fetchImpl: async () => responses.shift()(),
  });
  await assert.rejects(provider.quote("PETR4"), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterMs, 30_000);
    return true;
  });
  await assert.rejects(provider.quote("PETR4"), { code: "network" });
  await assert.rejects(provider.quote("PETR4"), { code: "invalid" });
  assert.deepEqual(
    logs.map((entry) => [entry.status, entry.outcome, entry.errorCode]),
    [
      [429, "http_error", undefined],
      [null, "network_error", "ECONNRESET"],
      [200, "invalid", undefined],
    ],
  );
  assert.doesNotMatch(JSON.stringify(logs), /token|fetch failed/);
});
