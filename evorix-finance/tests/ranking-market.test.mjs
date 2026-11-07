import test from "node:test";
import assert from "node:assert/strict";
import { createBrapiProvider } from "../server/market/brapi-provider.js";
import { createQuoteService } from "../server/market/quote-service.js";
import {
  safetyMarginFor,
  rankingMarketEntry,
} from "../server/market/ranking-market.js";

// Canonical quote, /api/rankings/market, /api/rankings/public and the
// price-series route of docs/MARGEM-E-HISTORICO.md. The routes run in the real
// Express app with SQL answered in memory, brapi.dev simulated and the clock
// moved to Thursday 05/11/2026 10:50 in São Paulo. Nothing leaves the process.

const at = (iso) => Date.parse(iso);

function canonicalSetup({
  clock,
  quoteTime = "2026-11-05T13:47:30.000Z",
  v2 = "ok",
  listPrice = 19.62,
  previousClose = 19.8,
}) {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed.pathname);
    if (parsed.pathname === "/api/quote/list")
      return Response.json({
        stocks: [
          {
            stock: "PETR4",
            name: "PETROBRAS PN",
            close: listPrice,
            change: -0.91,
            volume: 367700,
          },
          {
            stock: "TIMS3",
            name: "TIM S.A.",
            close: 0.3,
            change: 1,
            volume: 10,
          },
        ],
      });
    if (v2 === "fail") return new Response("{}", { status: 502 });
    return Response.json({
      results: [
        {
          symbol: parsed.searchParams.get("symbols"),
          data: {
            longName: "Petroleo Brasileiro SA Pfd",
            regularMarketPrice: 19.7,
            regularMarketOpen: 19.9,
            regularMarketDayHigh: 19.95,
            regularMarketDayLow: 19.5,
            regularMarketPreviousClose: previousClose,
            regularMarketChange: -0.1,
            regularMarketChangePercent: -0.5,
            regularMarketVolume: 1,
            regularMarketTime: quoteTime,
          },
        },
      ],
    });
  };
  const rows = new Map();
  const service = createQuoteService({
    provider: createBrapiProvider({
      fetchImpl,
      log: () => {},
      now: () => clock.now,
    }),
    store: {
      async read(key) {
        return rows.get(key) ?? null;
      },
      async write(key, data, ttlMs) {
        rows.set(key, { data, fresh: true, expiresAt: clock.now + ttlMs });
      },
      async reserveCall() {
        return true;
      },
    },
    now: () => clock.now,
    log: () => {},
    sleep: async () => {},
  });
  return { service, calls };
}

test("cotação canônica: preço da lista, session da v2 e variação em R$ exata", async () => {
  const clock = { now: at("2026-11-05T13:50:00Z") };
  const { service, calls } = canonicalSetup({ clock });
  const { quote, market } = await service.quote("PETR4");
  assert.deepEqual(quote, {
    symbol: "PETR4",
    name: "PETROBRAS PN",
    logoUrl: quote.logoUrl,
    currency: "BRL",
    price: "19.62000000",
    change: "-0.18000000",
    changePercent: "-0.9100",
    previousClose: null,
    dayHigh: null,
    dayLow: null,
    volume: "367700",
    quoteTime: null,
    marketTime: null,
    checkedAt: "2026-11-05T13:50:00.000Z",
    freshness: "delayed",
    stale: false,
    unavailable: false,
    detail: "full",
    delayMinutes: null,
    source: "brapi.dev",
    session: {
      open: "19.90000000",
      dayHigh: "19.95000000",
      dayLow: "19.50000000",
      previousClose: "19.80000000",
      quoteTime: "2026-11-05T13:47:30.000Z",
      checkedAt: "2026-11-05T13:50:00.000Z",
    },
  });
  assert.equal(market.state, "open");
  assert.deepEqual(calls, ["/api/quote/list", "/api/v2/stocks/quote"]);
  // Exact decimals: 0.30 − 0.10 is 0.20, not 0.19999999999999998.
  const exact = await canonicalSetup({
    clock,
    listPrice: 0.3,
    previousClose: 0.1,
  }).service.quote("PETR4");
  assert.equal(exact.quote.change, "0.20000000");
  const flat = await canonicalSetup({ clock, listPrice: 19.8 }).service.quote(
    "PETR4",
  );
  assert.equal(flat.quote.change, "0.00000000");
});

test("variação em R$ só com a session do pregão atual; sem v2 não há session", async () => {
  // v2 quote time from Wednesday while Thursday's session is running.
  const clock = { now: at("2026-11-05T13:50:00Z") };
  const old = await canonicalSetup({
    clock,
    quoteTime: "2026-11-04T20:55:00.000Z",
  }).service.quote("PETR4");
  assert.equal(old.quote.detail, "full");
  assert.equal(old.quote.session.quoteTime, "2026-11-04T20:55:00.000Z");
  assert.equal(old.quote.change, null);
  // Saturday: the current session is Friday's, so Friday's quote counts.
  const weekend = { now: at("2026-11-07T15:00:00Z") };
  const saturday = await canonicalSetup({
    clock: weekend,
    quoteTime: "2026-11-06T20:55:00.000Z",
  }).service.quote("PETR4");
  assert.equal(saturday.quote.change, "-0.18000000");
  // Holiday (Friday 20/11): Thursday 19/11 is the current session.
  const holiday = { now: at("2026-11-20T15:00:00Z") };
  assert.equal(
    (
      await canonicalSetup({
        clock: holiday,
        quoteTime: "2026-11-19T20:50:00.000Z",
      }).service.quote("PETR4")
    ).quote.change,
    "-0.18000000",
  );
  // Monday 23/11 before the opening: still Thursday's session.
  const monday = { now: at("2026-11-23T12:00:00Z") };
  assert.equal(
    (
      await canonicalSetup({
        clock: monday,
        quoteTime: "2026-11-19T20:50:00.000Z",
      }).service.quote("PETR4")
    ).quote.change,
    "-0.18000000",
  );
  // No v2 (failure without a previous answer): summary, session null.
  const failed = await canonicalSetup({ clock, v2: "fail" }).service.quote(
    "PETR4",
  );
  assert.equal(failed.quote.detail, "summary");
  assert.equal(failed.quote.session, null);
  assert.equal(failed.quote.change, null);
  assert.equal(failed.quote.price, "19.62000000");
  // Without a token, a non-demo ticker never calls the v2.
  const tims = canonicalSetup({ clock });
  const summary = await tims.service.quote("TIMS3");
  assert.equal(summary.quote.detail, "summary");
  assert.equal(summary.quote.session, null);
  assert.deepEqual(tims.calls, ["/api/quote/list"]);
  // The list route keeps its shape (no session field).
  assert.equal(
    Object.hasOwn((await tims.service.quotes(["PETR4"])).quotes[0], "session"),
    false,
  );
});

test("margem: base de mercado, defasada, da pesquisa e indisponível", () => {
  const quote = (price, freshness = "delayed") => ({
    price,
    freshness,
    checkedAt: "2026-11-05T13:50:00.000Z",
  });
  assert.deepEqual(
    safetyMarginFor({ ceilingPrice: "32.74", quote: quote("19.37000000") }),
    {
      percent: "40.84",
      basis: "market",
      price: "19.37000000",
      checkedAt: "2026-11-05T13:50:00.000Z",
    },
  );
  assert.equal(
    safetyMarginFor({
      ceilingPrice: "32.74",
      quote: quote("19.37000000", "stale"),
    }).basis,
    "stale",
  );
  // Price above the ceiling: negative, no floor at zero.
  assert.equal(
    safetyMarginFor({ ceilingPrice: "10.00", quote: quote("12.00000000") })
      .percent,
    "-20.00",
  );
  const research = {
    ceilingPrice: "32.74",
    quote: {
      price: null,
      freshness: "unavailable",
      checkedAt: "2026-11-05T13:50:00.000Z",
    },
    researchPrice: "19.37",
    researchSafetyMargin: "41.00",
    researchCheckedAt: "2026-10-20T03:00:00.000Z",
  };
  assert.deepEqual(safetyMarginFor(research), {
    percent: "41.00",
    basis: "research",
    price: "19.37",
    checkedAt: "2026-10-20T03:00:00.000Z",
  });
  for (const ceilingPrice of [null, "0", "-1", "abc", "1e3", 10])
    assert.deepEqual(
      safetyMarginFor({
        ...research,
        ceilingPrice,
        quote: quote("19.37000000"),
      }),
      {
        percent: null,
        basis: "unavailable",
        price: "19.37000000",
        checkedAt: "2026-11-05T13:50:00.000Z",
      },
      String(ceilingPrice),
    );
  assert.deepEqual(safetyMarginFor({ ceilingPrice: "32.74", quote: null }), {
    percent: null,
    basis: "unavailable",
    price: null,
    checkedAt: null,
  });
  // The research reference day comes from updatedOn, as 00:00 in São Paulo.
  const entry = rankingMarketEntry(
    {
      ticker: "TIMS3",
      dividendAnalysis: {
        ceilingPrice: "32.74",
        referencePrice: "19.37",
        safetyMargin: "0.41",
        updatedOn: "2026-10-20",
      },
    },
    { price: null, freshness: "unavailable", checkedAt: null },
    "2026-10-22T12:00:00.000Z",
  );
  assert.deepEqual(entry.safetyMargin, {
    percent: "41.00",
    basis: "research",
    price: "19.37",
    checkedAt: "2026-10-20T03:00:00.000Z",
  });
  assert.equal(entry.researchSafetyMargin, "41.00");
});

// ---------------------------------------------------------------- routes

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

// The services read Date.now when they are created: move it before import.
const realNow = Date.now;
let shift = at("2026-11-05T13:50:00Z") - realNow();
Date.now = () => realNow() + shift;
const advance = (ms) => {
  shift += ms;
};

const nativeFetch = globalThis.fetch;
const brapi = { calls: [], list: null, failList: false };
const catalogStock = (stock, close, volume = 1000) => ({
  stock,
  name: stock,
  close,
  change: 0.5,
  volume,
  type: "stock",
});
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname !== "brapi.dev") return nativeFetch(input, init);
  brapi.calls.push(url.pathname + url.search);
  if (url.pathname === "/api/quote/list")
    return brapi.failList
      ? new Response("{}", { status: 500 })
      : Response.json({ stocks: brapi.list });
  if (url.pathname === "/api/v2/stocks/quote")
    return Response.json({
      results: [
        {
          symbol: url.searchParams.get("symbols"),
          data: {
            regularMarketPrice: 5.1,
            regularMarketOpen: 5.2,
            regularMarketDayHigh: 5.3,
            regularMarketDayLow: 4.9,
            regularMarketPreviousClose: 4.8,
            regularMarketTime: "2026-11-05T13:47:30.000Z",
          },
        },
      ],
    });
  if (url.pathname === "/api/v2/stocks/historical")
    return Response.json({
      results: [
        {
          symbol: url.searchParams.get("symbols"),
          data: {
            historicalDataPrice: [
              {
                date: at("2026-11-04T03:00:00Z") / 1000,
                close: 4.8,
                adjustedClose: 4.8,
                rawClose: 4.8,
              },
              {
                date: at("2026-11-03T03:00:00Z") / 1000,
                close: 4.7,
                adjustedClose: 4.65,
                rawClose: 4.7,
              },
            ],
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
  sql: [],
  // Closes written by the consolidation; each insert takes 80 ms.
  closes: [],
  insertDelayMs: 80,
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
    return [[{ id: row ? row.id : null, total: row ? 1 : 0 }]];
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
    return [[]];
  // Consolidation of the daily closes (server/market-closes.js).
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
    await new Promise((resolve) => setTimeout(resolve, state.insertDelayMs));
    const rows = [];
    for (let index = 0; index < params.length; index += 6)
      rows.push(params.slice(index, index + 5));
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
const cookie = "evorix_session=" + "b".repeat(43);
async function call(path, { auth = false } = {}) {
  const response = await nativeFetch(base + path, {
    headers: auth ? { Cookie: cookie } : {},
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}
function publish(id, entries) {
  state.publication = {
    id,
    title: "Ranking de teste",
    author_name: "PRIVATE_AUTHOR",
    professional_category: null,
    professional_registration: null,
    source_file_name: "PRIVATE_FILE",
    imported_by: null,
    created_at: "2026-10-22 12:00:00.000",
    entries_json: JSON.stringify(entries),
  };
}
const analysis = (ceilingPrice, referencePrice, safetyMargin, extra = {}) => ({
  estimatedGrossDividendYield: "0.115",
  projectedPE: "8.7",
  referencePrice,
  ceilingPrice,
  safetyMargin,
  updatedOn: "2026-10-20",
  ...extra,
});
const now = Date.now();
state.session = {
  id: "user-1",
  name: "Pessoa de teste",
  email: "pessoa@ediv.test",
  email_verified_at: new Date(now),
  created_at: new Date(now),
  role: "USER",
  session_id: "session-1",
  session_created_at: new Date(now),
  session_expires_at: new Date(now + 30 * 86_400_000),
};

test.after(async () => {
  Object.assign(console, original);
  Date.now = realNow;
  globalThis.fetch = nativeFetch;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("rota pública: lista geral fora do ar ainda responde com a margem da pesquisa", async () => {
  publish(1, [
    {
      rank: 2,
      ticker: "ALOS3",
      companyName: "Allos",
      thesis: "PRIVATE_THESIS",
      dividendAnalysis: analysis("27.15", "21.11", "0.22"),
    },
    {
      rank: 1,
      ticker: "TIMS3",
      companyName: "TIM",
      thesis: "PRIVATE_THESIS",
      dividendAnalysis: analysis("32.74", "19.37", "0.41"),
    },
    {
      rank: 3,
      ticker: "BBSE3",
      companyName: "BB Seguridade",
      dividendAnalysis: analysis("41.30", "30.03", null),
    },
    {
      rank: 4,
      ticker: "VIVT3",
      companyName: "Vivo",
      dividendAnalysis: analysis("60.00", "50.00", "0.2"),
    },
  ]);
  brapi.failList = true;
  const result = await call("/api/rankings/public");
  assert.equal(result.status, 200);
  assert.equal(
    result.headers.get("cache-control"),
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  assert.deepEqual(
    result.body.entries.map((entry) => [
      entry.ticker,
      entry.market.quote.freshness,
      entry.market.safetyMargin,
    ]),
    [
      [
        "TIMS3",
        "unavailable",
        {
          percent: "41.00",
          basis: "research",
          price: null,
          checkedAt: "2026-10-22T12:00:00.000Z",
        },
      ],
      [
        "ALOS3",
        "unavailable",
        {
          percent: "22.00",
          basis: "research",
          price: null,
          checkedAt: "2026-10-22T12:00:00.000Z",
        },
      ],
      [
        "BBSE3",
        "unavailable",
        { percent: null, basis: "unavailable", price: null, checkedAt: null },
      ],
    ],
  );
  brapi.failList = false;
});

test("rota pública: cotação e margem dinâmica sem expor teto nem preço da pesquisa", async () => {
  // The failed list above is blocked for 60 s; the next read is fresh.
  advance(2 * 60_000);
  brapi.list = [
    catalogStock("TIMS3", 19.62),
    catalogStock("ALOS3", 25.1),
    catalogStock("BBSE3", 37.89),
  ];
  brapi.calls = [];
  const result = await call("/api/rankings/public");
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body), [
    "id",
    "title",
    "updatedAt",
    "totalEntries",
    "entries",
    "market",
  ]);
  assert.deepEqual(Object.keys(result.body.market), [
    "state",
    "refreshSeconds",
    "nextRefreshAt",
  ]);
  assert.equal(result.body.market.state, "open");
  assert.equal(result.body.market.refreshSeconds, 900);
  assert.ok(
    Math.abs(
      Date.parse(result.body.market.nextRefreshAt) - (Date.now() + 900_000),
    ) < 5000,
  );
  assert.deepEqual(Object.keys(result.body.entries[0]), [
    "rank",
    "ticker",
    "companyName",
    "dividendAnalysis",
    "market",
  ]);
  assert.deepEqual(Object.keys(result.body.entries[0].dividendAnalysis), [
    "estimatedGrossDividendYield",
    "projectedPE",
    "safetyMargin",
  ]);
  assert.deepEqual(
    result.body.entries.map((entry) => [
      entry.ticker,
      entry.market.quote.price,
      entry.market.safetyMargin.percent,
      entry.market.safetyMargin.basis,
    ]),
    [
      ["TIMS3", "19.62000000", "40.07", "market"],
      ["ALOS3", "25.10000000", "7.55", "market"],
      ["BBSE3", "37.89000000", "8.26", "market"],
    ],
  );
  const json = JSON.stringify(result.body);
  for (const secret of [
    "32.74",
    "27.15",
    "41.30",
    "19.37",
    "21.11",
    "30.03",
    "ceilingPrice",
    "referencePrice",
    "researchPrice",
    "PRIVATE_",
    "updatedOn",
  ])
    assert.equal(json.includes(secret), false, secret);
  assert.deepEqual(brapi.calls, [
    "/api/quote/list?limit=2000&sortBy=volume&sortOrder=desc",
  ]);
});

test("/api/rankings/market: autenticação, sem cache e os 5 exemplos do corretor pela rota", async () => {
  assert.equal((await call("/api/rankings/market")).status, 401);
  // Ceiling R$ 10,00 and the broker's five prices.
  publish(
    2,
    [
      ["PETR4", 5],
      ["VALE3", 8],
      ["ITUB4", 10],
      ["TIMS3", 12],
      ["BBSE3", 4],
    ]
      .map(([ticker], index) => ({
        rank: index + 1,
        ticker,
        companyName: ticker,
        dividendAnalysis: analysis("10.00", "9.00", "0.1"),
      }))
      .concat([
        // Not in the general list: research price and margin.
        {
          rank: 6,
          ticker: "EMAE4",
          companyName: "EMAE",
          dividendAnalysis: analysis("32.74", "19.37", "0.41"),
        },
        // No valid ceiling: unavailable, with the market price kept.
        {
          rank: 7,
          ticker: "ALOS3",
          companyName: "Allos",
          dividendAnalysis: analysis("0", "21.11", "0.22"),
        },
      ]),
  );
  advance(16 * 60_000);
  brapi.list = [
    catalogStock("PETR4", 5),
    catalogStock("VALE3", 8),
    catalogStock("ITUB4", 10),
    catalogStock("TIMS3", 12),
    catalogStock("BBSE3", 4),
    catalogStock("ALOS3", 25.1),
  ];
  brapi.calls = [];
  const result = await call("/api/rankings/market", { auth: true });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(result.body), [
    "publication",
    "market",
    "checkedAt",
    "entries",
  ]);
  assert.deepEqual(result.body.publication, {
    id: "2",
    publishedAt: "2026-10-22T12:00:00.000Z",
  });
  assert.ok(Math.abs(Date.parse(result.body.checkedAt) - Date.now()) < 5000);
  assert.equal(result.body.market.state, "open");
  assert.deepEqual(
    result.body.entries.map((entry) => [
      entry.ticker,
      entry.safetyMargin.percent,
      entry.safetyMargin.basis,
    ]),
    [
      ["PETR4", "50.00", "market"],
      ["VALE3", "20.00", "market"],
      ["ITUB4", "0.00", "market"],
      ["TIMS3", "-20.00", "market"],
      ["BBSE3", "60.00", "market"],
      ["EMAE4", "41.00", "research"],
      ["ALOS3", null, "unavailable"],
    ],
  );
  const [petr4] = result.body.entries;
  assert.deepEqual(Object.keys(petr4), [
    "ticker",
    "quote",
    "ceilingPrice",
    "researchPrice",
    "researchSafetyMargin",
    "safetyMargin",
  ]);
  assert.equal(petr4.ceilingPrice, "10.00");
  assert.equal(petr4.researchPrice, "9.00");
  assert.equal(petr4.researchSafetyMargin, "10.00");
  assert.equal(petr4.quote.price, "5.00000000");
  assert.equal(petr4.quote.session, null);
  assert.equal(petr4.safetyMargin.price, "5.00000000");
  assert.equal(petr4.safetyMargin.checkedAt, result.body.checkedAt);
  assert.deepEqual(result.body.entries[5].safetyMargin, {
    percent: "41.00",
    basis: "research",
    price: "19.37",
    checkedAt: "2026-10-20T03:00:00.000Z",
  });
  assert.equal(result.body.entries[6].safetyMargin.price, "25.10000000");
  // One general-list read for the whole ranking, and no per-ticker call.
  assert.deepEqual(brapi.calls, [
    "/api/quote/list?limit=2000&sortBy=volume&sortOrder=desc",
  ]);

  // The list fails later: the margin keeps the last valid price as "stale".
  advance(16 * 60_000);
  brapi.failList = true;
  const stale = await call("/api/rankings/market", { auth: true });
  brapi.failList = false;
  assert.equal(stale.status, 200);
  assert.equal(stale.body.entries[0].quote.freshness, "stale");
  assert.deepEqual(
    [
      stale.body.entries[0].safetyMargin.percent,
      stale.body.entries[0].safetyMargin.basis,
    ],
    ["50.00", "stale"],
  );
  assert.equal(
    stale.body.entries[0].safetyMargin.checkedAt,
    result.body.checkedAt,
  );
});

test("cotação canônica pela rota /api/market/quote e lista sem mudança", async () => {
  advance(2 * 60_000);
  brapi.list = [catalogStock("PETR4", 5), catalogStock("VALE3", 8)];
  const detailed = await call("/api/market/quote/PETR4");
  assert.equal(detailed.status, 200);
  assert.equal(detailed.headers.get("cache-control"), "no-store");
  assert.equal(detailed.body.quote.price, "5.00000000");
  assert.equal(detailed.body.quote.detail, "full");
  assert.equal(detailed.body.quote.quoteTime, null);
  assert.equal(detailed.body.quote.session.open, "5.20000000");
  assert.equal(detailed.body.quote.session.previousClose, "4.80000000");
  // Same session for the list and the v2 quote: 5.00 − 4.80.
  assert.equal(detailed.body.quote.change, "0.20000000");
  const listed = await call("/api/market/quotes?symbols=PETR4,VALE3");
  assert.equal(listed.status, 200);
  assert.deepEqual(
    listed.body.quotes.map((quote) => [
      quote.symbol,
      quote.detail,
      Object.hasOwn(quote, "session"),
    ]),
    [
      ["PETR4", "summary", false],
      ["VALE3", "summary", false],
    ],
  );
});

test("série de preços: autenticação, validação, tickers permitidos e formato", async () => {
  assert.equal((await call("/api/rankings/price-series/PETR4")).status, 401);
  for (const path of [
    "/api/rankings/price-series/PETR",
    "/api/rankings/price-series/PETR4?basis=total",
    "/api/rankings/price-series/PETR4?granularity=weekly",
    "/api/rankings/price-series/PETR4?basis=adjusted&basis=nominal",
  ]) {
    const result = await call(path, { auth: true });
    assert.equal(result.status, 400, path);
    assert.equal(result.headers.get("cache-control"), "no-store");
  }
  // Neither in the snapshot nor in the latest publication.
  assert.equal(
    (await call("/api/rankings/price-series/WEGE3", { auth: true })).status,
    404,
  );
  const series = await call("/api/rankings/price-series/petr4", { auth: true });
  assert.equal(series.status, 200);
  assert.equal(series.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(series.body), [
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
  assert.equal(series.body.ticker, "PETR4");
  assert.equal(series.body.basis, "adjusted");
  assert.deepEqual(series.body.availableBases, ["adjusted", "nominal"]);
  assert.deepEqual(series.body.points.slice(-2), [
    {
      date: "2026-11-03",
      close: "4.65000000",
      status: "consolidated",
      source: "brapi",
    },
    {
      date: "2026-11-04",
      close: "4.80000000",
      status: "consolidated",
      source: "brapi",
    },
  ]);
  assert.equal(series.body.latestQuote.price, "5.00000000");
  assert.equal(series.body.latestQuote.connect, true);
  assert.ok(
    brapi.calls.includes(
      "/api/v2/stocks/historical?symbols=PETR4&range=max&interval=1d&includeRaw=true",
    ),
  );
  // Nominal: brapi raw prices first, then the AGF tail of the snapshot.
  const nominal = await call(
    "/api/rankings/price-series/PETR4?basis=nominal&granularity=monthly",
    { auth: true },
  );
  assert.equal(nominal.status, 200);
  assert.equal(nominal.body.granularity, "monthly");
  assert.equal(nominal.body.points[0].date, "2024-08-30");
  assert.equal(nominal.body.points[0].source, "agf");
  assert.ok(
    nominal.body.points.every((point) => /^\d{4}-\d{2}$/.test(point.month)),
  );
  // The snapshot route serves only the AGF nominal tail; dividends unchanged.
  const { stockHistory } = await import("../server/stock-history.js");
  assert.equal((await call("/api/rankings/history/PETR4")).status, 401);
  const history = await call("/api/rankings/history/PETR4", { auth: true });
  assert.equal(history.status, 200);
  assert.deepEqual(Object.keys(history.body), [
    "ticker",
    "source",
    "prices",
    "dividends",
  ]);
  assert.deepEqual(history.body.prices[0], {
    date: "2024-08-22",
    close: 37.12,
  });
  assert.equal(history.body.prices.length, 520);
  assert.deepEqual(history.body.dividends, stockHistory("PETR4").dividends);
  assert.equal(
    stockHistory("PETR4").prices.length,
    3641,
    "The snapshot itself is untouched",
  );
  // A company of the latest publication outside the snapshot is allowed.
  publish(3, [
    {
      rank: 1,
      ticker: "WEGE3",
      companyName: "WEG",
      dividendAnalysis: analysis("40.00", "35.00", "0.12"),
    },
  ]);
  const outside = await call("/api/rankings/price-series/WEGE3", {
    auth: true,
  });
  assert.equal(outside.status, 200);
  assert.deepEqual(outside.body.points, []);
  assert.equal(outside.body.unavailableReason, "no_token");
});

test("19:10: a resposta só sai depois de gravar os fechamentos do pregão; às 18:50 nada é gravado", async () => {
  // Nothing was due during the session: no claim was ever tried.
  assert.equal(
    state.sql.some((text) => text.startsWith("INSERT IGNORE")),
    false,
  );
  // Thursday 05/11 at 18:50 in São Paulo (QA M1): the list may still hold a
  // price from before the closing auction, so nothing is due yet.
  advance(at("2026-11-05T21:50:00Z") - Date.now());
  brapi.list = [
    catalogStock("TIMS3", 19.5, 300000),
    catalogStock("PETR4", 46.1, 50000000),
  ];
  brapi.calls = [];
  state.sql = [];
  assert.equal((await call("/api/rankings/public")).status, 200);
  assert.equal(
    brapi.calls.filter((path) => path.startsWith("/api/quote/list")).length,
    1,
  );
  assert.equal(
    state.sql.some((text) => /market_daily_closes|INSERT IGNORE/.test(text)),
    false,
  );
  assert.deepEqual(state.closes, []);
  // 19:10: the 18:50 list got the short TTL (15 min until 19:40), so it has
  // expired and this read fetches a new one. That list makes the session's
  // closes due, and the request waits for the 80 ms insert.
  advance(at("2026-11-05T22:10:00Z") - Date.now());
  brapi.list = [
    catalogStock("TIMS3", 19.62, 367700),
    catalogStock("PETR4", 45.95, 53109700),
    catalogStock("ABEV3", 12),
    catalogStock("MGLU3", 5.41),
  ];
  state.sql = [];
  const result = await call("/api/rankings/public");
  assert.equal(result.status, 200);
  assert.equal(
    brapi.calls.filter((path) => path.startsWith("/api/quote/list")).length,
    2,
  );
  assert.deepEqual(
    state.closes,
    [
      ["ABEV3", "2026-11-05", "12.00000000", "1000", "brapi_list"],
      ["PETR4", "2026-11-05", "45.95000000", "53109700", "brapi_list"],
      ["TIMS3", "2026-11-05", "19.62000000", "367700", "brapi_list"],
    ],
    "Written before the answer; MGLU3 is neither in the snapshot nor published",
  );
  assert.ok(
    state.sql.some((text) =>
      text.startsWith("UPDATE provider_cache SET payload=?"),
    ),
    "The claim ends as done",
  );
  // Later reads the same night have nothing due: no claim and no wait.
  state.sql = [];
  assert.equal((await call("/api/rankings/public")).status, 200);
  assert.equal((await call("/api/market/quotes?symbols=PETR4")).status, 200);
  assert.equal(
    state.sql.some((text) => /market_daily_closes|INSERT IGNORE/.test(text)),
    false,
  );
  assert.equal(state.closes.length, 3);
});
