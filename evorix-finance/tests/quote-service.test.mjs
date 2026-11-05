import test from "node:test";
import assert from "node:assert/strict";
import { createBrapiProvider } from "../server/market/brapi-provider.js";
import { createQuoteService } from "../server/market/quote-service.js";

// The real brapi adapter runs against a fake fetch; the shared MySQL cache is
// an in-memory fake with the same contract as server/provider-cache.js.

const openAt = Date.parse("2026-11-05T13:50:00Z"); // Thursday 10:50 in São Paulo

const catalogPayload = {
  stocks: [
    {
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
    },
    {
      stock: "PETR4",
      name: "PETROBRAS PN",
      close: 47.5,
      change: 0.8,
      volume: 100,
      type: "stock",
    },
    {
      stock: "VALE3",
      name: "VALE ON",
      close: 60,
      change: null,
      volume: 200,
      type: "stock",
    },
    {
      stock: "ITUB4",
      name: "ITAU UNIBANCO PN",
      close: 35,
      change: 0,
      volume: 300,
      type: "stock",
    },
    {
      stock: "ABEV3",
      name: "AMBEV ON",
      close: null,
      change: null,
      volume: null,
      type: "stock",
    },
  ],
};

function quotePayload(symbol, price = 47.9) {
  return {
    results: [
      {
        requestedSymbol: symbol,
        symbol,
        changed: false,
        data: {
          shortName: symbol,
          longName: `${symbol} SA`,
          currency: "BRL",
          regularMarketPrice: price,
          regularMarketDayHigh: 48.04,
          regularMarketDayLow: 47.76,
          regularMarketChange: 0.78,
          regularMarketChangePercent: 1.66,
          regularMarketTime: "2026-11-05T13:47:30.000Z",
          regularMarketVolume: 3350400,
          regularMarketPreviousClose: 47.12,
          logourl: `https://icons.brapi.dev/icons/${symbol}.svg`,
        },
      },
    ],
  };
}

const historyPayload = (symbol) => ({
  results: [
    {
      requestedSymbol: symbol,
      symbol,
      data: {
        usedInterval: "1d",
        historicalDataPrice: [
          {
            date: 1793847600,
            close: 47.9,
            adjustedClose: 47.9,
            volume: 3350400,
          },
          {
            date: 1793761200,
            close: 47.12,
            adjustedClose: 47.12,
            volume: 94219800,
          },
        ],
      },
    },
  ],
});

function createStore(clock) {
  const rows = new Map();
  const store = {
    rows,
    failRead: false,
    failWrite: false,
    failUsage: false,
    async read(key) {
      if (store.failRead)
        throw Object.assign(new Error("down"), { code: "ENOTFOUND" });
      const row = rows.get(key);
      if (!row) return null;
      return {
        data: structuredClone(row.payload),
        fresh: row.expiresAt > clock.now,
        expiresAt: row.expiresAt,
      };
    },
    async write(key, payload, ttlMs) {
      if (store.failWrite) throw new Error("down");
      rows.set(key, {
        payload: structuredClone(payload),
        expiresAt: clock.now + ttlMs,
      });
    },
    async reserveCall(key, kind, budget) {
      if (store.failUsage)
        throw Object.assign(new Error("down"), { code: "ECONNREFUSED" });
      const row = rows.get(key) || {
        payload: { perTicker: 0, catalog: 0 },
        expiresAt: clock.now + 40 * 86_400_000,
      };
      rows.set(key, row);
      if (kind === "perTicker" && row.payload.perTicker >= budget) return false;
      row.payload[kind] += 1;
      return true;
    },
  };
  return store;
}

// routes: { catalog, quote, history } -> (symbol, url) => Response | Promise
function setup({
  token = null,
  plan = "free",
  dailyBudget = 450,
  routes = {},
  store,
  clock = { now: openAt },
  covered = ["PETR4", "VALE3", "ITUB4", "TIMS3"],
} = {}) {
  const calls = [];
  const logs = [];
  const sleeps = [];
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url);
    const kind = {
      "/api/quote/list": "catalog",
      "/api/v2/stocks/quote": "quote",
      "/api/v2/stocks/historical": "history",
    }[parsed.pathname];
    const symbol = parsed.searchParams.get("symbols");
    calls.push({ kind, symbol, url, headers: init.headers });
    const handler =
      routes[kind] ||
      {
        catalog: () => Response.json(catalogPayload),
        quote: (s) => Response.json(quotePayload(s)),
        history: (s) => Response.json(historyPayload(s)),
      }[kind];
    return handler(symbol, url);
  };
  const sharedStore = store || createStore(clock);
  const log = (entry) => logs.push(JSON.stringify(entry));
  const service = createQuoteService({
    provider: createBrapiProvider({
      token,
      fetchImpl,
      log,
      now: () => clock.now,
    }),
    store: sharedStore,
    hasToken: Boolean(token),
    plan,
    dailyBudget,
    isCovered: (symbol) => covered.includes(symbol),
    now: () => clock.now,
    log,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    random: () => 0.5,
  });
  const count = (kind) => calls.filter((call) => call.kind === kind).length;
  return { service, calls, logs, sleeps, store: sharedStore, clock, count };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("lista usa só a lista geral e devolve o objeto quote do contrato", async () => {
  const { service, count } = setup();
  const result = await service.quotes([
    "TIMS3",
    "PETR4",
    "ABEV3",
    "XPTO3",
    "TIMS3",
  ]);
  assert.equal(count("catalog"), 1);
  assert.equal(count("quote"), 0);
  assert.deepEqual(result.market, {
    state: "open",
    refreshSeconds: 900,
    nextRefreshAt: "2026-11-05T14:05:00.000Z",
  });
  assert.deepEqual(
    result.quotes.map((quote) => quote.symbol),
    ["TIMS3", "PETR4", "ABEV3", "XPTO3"],
  );
  assert.deepEqual(result.quotes[0], {
    symbol: "TIMS3",
    name: "TIM S.A.",
    logoUrl: "https://icons.brapi.dev/icons/TIMS3.svg",
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
    checkedAt: "2026-11-05T13:50:00.000Z",
    freshness: "delayed",
    stale: false,
    unavailable: false,
    detail: "summary",
    delayMinutes: null,
    source: "brapi.dev",
  });
  for (const quote of result.quotes.slice(2)) {
    assert.equal(quote.freshness, "unavailable");
    assert.equal(quote.unavailable, true);
    assert.equal(quote.price, null, "Missing price never becomes 0");
  }
});

test("chamadas simultâneas esperam a mesma chamada à brapi", async () => {
  const gate = deferred();
  const { service, count } = setup({
    token: "tok",
    routes: {
      catalog: async () => (await gate.promise, Response.json(catalogPayload)),
    },
  });
  const pending = [
    service.quotes(["PETR4"]),
    service.quotes(["VALE3"]),
    service.quote("PETR4"),
    service.quote("PETR4"),
  ];
  await new Promise((resolve) => setImmediate(resolve));
  gate.resolve();
  const [first, second, third, fourth] = await Promise.all(pending);
  assert.equal(count("catalog"), 1);
  assert.equal(count("quote"), 1, "Same ticker shares one v2 call");
  assert.equal(first.quotes[0].price, "47.50000000");
  assert.equal(second.quotes[0].price, "60.00000000");
  assert.equal(third.quote.detail, "full");
  assert.deepEqual(third, fourth);
});

test("cache em memória e compartilhado respeita o TTL do pregão", async () => {
  const clock = { now: openAt };
  const first = setup({ clock });
  await first.service.quotes(["PETR4"]);
  clock.now += 14 * 60_000;
  await first.service.quotes(["PETR4"]);
  assert.equal(first.count("catalog"), 1);
  // Another instance reads the shared row instead of calling brapi.
  const second = setup({ clock, store: first.store });
  const shared = await second.service.quotes(["PETR4"]);
  assert.equal(second.count("catalog"), 0);
  assert.equal(shared.quotes[0].checkedAt, "2026-11-05T13:50:00.000Z");
  clock.now += 2 * 60_000;
  await first.service.quotes(["PETR4"]);
  assert.equal(
    first.count("catalog"),
    2,
    "15 min later the list is fetched again",
  );
  // Closed market: the next fetch lasts until the opening, at most 12 h.
  clock.now = Date.parse("2026-11-06T00:00:00Z");
  await first.service.quotes(["PETR4"]);
  assert.equal(first.count("catalog"), 3);
  assert.equal(
    first.store.rows.get("market:catalog").expiresAt - clock.now,
    12 * 60 * 60_000,
  );
});

test("429 com Retry-After pausa a brapi para todas as instâncias e serve a cotação defasada", async () => {
  const clock = { now: openAt };
  let limited = false;
  const routes = {
    catalog: () =>
      limited
        ? new Response("{}", { status: 429, headers: { "Retry-After": "120" } })
        : Response.json(catalogPayload),
  };
  const first = setup({ clock, routes });
  await first.service.quotes(["PETR4"]);
  limited = true;
  clock.now += 16 * 60_000;
  const stale = await first.service.quotes(["PETR4"]);
  assert.equal(first.count("catalog"), 2);
  assert.equal(stale.quotes[0].freshness, "stale");
  assert.equal(stale.quotes[0].stale, true);
  assert.equal(stale.quotes[0].price, "47.50000000");
  assert.equal(stale.quotes[0].checkedAt, "2026-11-05T13:50:00.000Z");
  assert.equal(first.sleeps.length, 0, "429 is not retried");
  // During the cooldown nobody calls brapi, in this or another instance.
  clock.now += 60_000;
  assert.equal(
    (await first.service.quotes(["PETR4"])).quotes[0].freshness,
    "stale",
  );
  const second = setup({ clock, store: first.store, routes });
  const other = await second.service.quotes(["PETR4"]);
  assert.equal(other.quotes[0].freshness, "stale");
  assert.equal(first.count("catalog") + second.count("catalog"), 2);
  assert.ok(first.store.rows.has("brapi:cooldown"));
  // After Retry-After the provider is called again.
  limited = false;
  clock.now += 61_000;
  const fresh = await first.service.quotes(["PETR4"]);
  assert.equal(first.count("catalog"), 3);
  assert.equal(fresh.quotes[0].freshness, "delayed");
});

test("5xx e falha de rede têm uma nova tentativa; 4xx não é repetido", async () => {
  const statuses = [503, 200];
  const flaky = setup({
    routes: {
      catalog: () =>
        statuses.shift() === 200
          ? Response.json(catalogPayload)
          : new Response("{}", { status: 503 }),
    },
  });
  const recovered = await flaky.service.quotes(["PETR4"]);
  assert.equal(flaky.count("catalog"), 2);
  assert.equal(flaky.sleeps.length, 1);
  assert.equal(recovered.quotes[0].freshness, "delayed");

  let networkFailures = 1;
  const network = setup({
    token: "tok",
    routes: {
      quote: (symbol) => {
        if (networkFailures-- > 0) throw new TypeError("fetch failed");
        return Response.json(quotePayload(symbol));
      },
    },
  });
  assert.equal((await network.service.quote("PETR4")).quote.detail, "full");
  assert.equal(network.count("quote"), 2);

  const down = setup({
    routes: { catalog: () => new Response("{}", { status: 502 }) },
  });
  const unavailable = await down.service.quotes(["PETR4"]);
  assert.equal(down.count("catalog"), 2, "Exactly one retry");
  assert.equal(unavailable.quotes[0].freshness, "unavailable");
  // A failed key is not hammered on every request.
  await down.service.quotes(["PETR4"]);
  assert.equal(down.count("catalog"), 2);

  const missing = setup({
    token: "tok",
    routes: { quote: () => new Response("{}", { status: 404 }) },
  });
  const fallback = await missing.service.quote("PETR4");
  assert.equal(missing.count("quote"), 1, "4xx is not retried");
  assert.equal(missing.sleeps.length, 0);
  assert.equal(fallback.quote.detail, "summary");
  assert.equal(fallback.quote.price, "47.50000000");
});

test("cotação detalhada usa a v2 com token ou ticker de demonstração", async () => {
  const anonymous = setup();
  const demo = await anonymous.service.quote("PETR4");
  assert.equal(demo.quote.detail, "full");
  assert.equal(
    demo.quote.delayMinutes,
    null,
    "Without a token brapi declares no delay",
  );
  assert.equal(demo.quote.quoteTime, "2026-11-05T13:47:30.000Z");
  assert.equal(demo.quote.marketTime, demo.quote.quoteTime);
  assert.equal(demo.quote.previousClose, "47.12000000");
  assert.equal(
    anonymous.calls.find((call) => call.kind === "quote").headers.Authorization,
    undefined,
  );
  const summary = await anonymous.service.quote("TIMS3");
  assert.equal(summary.quote.detail, "summary");
  assert.equal(
    anonymous.count("quote"),
    1,
    "No v2 call for TIMS3 without a token",
  );

  const withToken = setup({ token: "tok" });
  const full = await withToken.service.quote("TIMS3");
  assert.equal(full.quote.detail, "full");
  assert.equal(full.quote.delayMinutes, 30);
  // Unknown to the general list and outside the snapshot: no budget spent.
  const unknown = await withToken.service.quote("XPTO3");
  assert.equal(unknown.quote.freshness, "unavailable");
  assert.equal(withToken.count("quote"), 1);

  const rejected = setup({
    token: "bad",
    routes: { quote: () => new Response("{}", { status: 401 }) },
  });
  const after401 = await rejected.service.quote("VALE3");
  assert.equal(after401.quote.detail, "summary");
  assert.equal(after401.quote.price, "60.00000000");
  assert.equal(after401.quote.changePercent, null);
});

test("orçamento diário esgotado volta para a lista geral; a lista não é bloqueada", async () => {
  const clock = { now: openAt };
  const limited = setup({ token: "tok", dailyBudget: 1, clock });
  assert.equal((await limited.service.quote("PETR4")).quote.detail, "full");
  const second = await limited.service.quote("VALE3");
  assert.equal(second.quote.detail, "summary");
  assert.equal(second.quote.price, "60.00000000");
  assert.equal(limited.count("quote"), 1);
  assert.deepEqual(limited.store.rows.get("brapi:usage:2026-11-05").payload, {
    perTicker: 1,
    catalog: 1,
  });
  const history = await limited.service.history("ITUB4", "1mo");
  assert.equal(history.available, false);
  assert.equal(history.reason, "budget");
  assert.equal(limited.count("history"), 0);

  const zero = setup({ token: "tok", dailyBudget: 0 });
  const listed = await zero.service.quotes(["PETR4"]);
  assert.equal(listed.quotes[0].freshness, "delayed");
  assert.equal(zero.count("catalog"), 1);
  assert.equal((await zero.service.quote("PETR4")).quote.detail, "summary");
  assert.equal(zero.count("quote"), 0);

  // The counter follows the São Paulo day: 22:00 on 05/11 is 01:00Z on 06/11.
  clock.now = Date.parse("2026-11-06T01:00:00Z");
  const night = setup({ token: "tok", clock });
  await night.service.quote("PETR4");
  assert.ok(night.store.rows.has("brapi:usage:2026-11-05"));
  assert.ok(!night.store.rows.has("brapi:usage:2026-11-06"));

  // Without a working counter the per-ticker ceiling fails closed.
  const broken = setup({ token: "tok" });
  broken.store.failUsage = true;
  const fallback = await broken.service.quote("PETR4");
  assert.equal(fallback.quote.detail, "summary");
  assert.equal(broken.count("quote"), 0);
  assert.equal(broken.count("catalog"), 1);
});

test("chamadas por ação vão uma de cada vez", async () => {
  let active = 0;
  let maximum = 0;
  const { service, count } = setup({
    token: "tok",
    routes: {
      quote: async (symbol) => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return Response.json(quotePayload(symbol));
      },
    },
  });
  const results = await Promise.all(
    ["PETR4", "VALE3", "ITUB4", "TIMS3"].map((symbol) => service.quote(symbol)),
  );
  assert.equal(count("quote"), 4);
  assert.equal(maximum, 1);
  assert.deepEqual(
    results.map((result) => result.quote.detail),
    ["full", "full", "full", "full"],
  );
});

test("sem token, a lista geral também espera a chamada v2 em andamento", async () => {
  const clock = { now: openAt };
  const gate = deferred();
  let active = 0;
  let maximum = 0;
  const track = async (wait, response) => {
    active++;
    maximum = Math.max(maximum, active);
    await wait;
    active--;
    return response();
  };
  const { service, count } = setup({
    clock,
    routes: {
      catalog: () =>
        track(Promise.resolve(), () => Response.json(catalogPayload)),
      quote: (symbol) =>
        track(gate.promise, () => Response.json(quotePayload(symbol))),
    },
  });
  await service.quotes(["PETR4"]);
  const pendingQuote = service.quote("PETR4");
  for (let tick = 0; tick < 20 && count("quote") === 0; tick++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(count("quote"), 1);
  clock.now += 16 * 60_000;
  const pendingList = service.quotes(["TIMS3"]);
  for (let tick = 0; tick < 20; tick++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(count("catalog"), 1, "The list waits for the v2 call");
  gate.resolve();
  const [quoted, listed] = await Promise.all([pendingQuote, pendingList]);
  assert.equal(count("catalog"), 2);
  assert.equal(maximum, 1);
  assert.equal(quoted.quote.detail, "full");
  assert.equal(listed.quotes[0].freshness, "delayed");
});

test("histórico: cobertura, token, plano, datas e defasagem", async () => {
  const clock = { now: openAt };
  let failing = false;
  const routes = {
    history: (symbol) =>
      failing
        ? new Response("{}", { status: 500 })
        : Response.json(historyPayload(symbol)),
  };
  const anonymous = setup({ clock, routes });
  const demo = await anonymous.service.history("PETR4", "1mo");
  assert.deepEqual(demo, {
    symbol: "PETR4",
    available: true,
    reason: null,
    interval: "1d",
    range: "1mo",
    points: [
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
    ],
    checkedAt: "2026-11-05T13:50:00.000Z",
    source: "brapi.dev",
    stale: false,
  });
  assert.equal(
    (await anonymous.service.history("TIMS3", "1mo")).reason,
    "no_token",
  );
  assert.equal(
    (await anonymous.service.history("ABEV3", "1mo")).reason,
    "not_covered",
  );
  assert.equal(
    (await anonymous.service.history("PETR4", "1y")).reason,
    "range_not_in_plan",
  );
  assert.equal(anonymous.count("history"), 1);

  const free = setup({ token: "tok", clock, routes });
  assert.equal((await free.service.history("TIMS3", "3mo")).available, true);
  assert.equal(
    (await free.service.history("TIMS3", "1y")).reason,
    "range_not_in_plan",
  );
  const startup = setup({ token: "tok", plan: "startup", clock, routes });
  assert.equal((await startup.service.history("TIMS3", "1y")).available, true);

  // 60 min TTL while open; afterwards a failure serves the last valid points.
  clock.now += 59 * 60_000;
  await free.service.history("TIMS3", "3mo");
  assert.equal(free.count("history"), 1);
  failing = true;
  clock.now += 2 * 60_000;
  const stale = await free.service.history("TIMS3", "3mo");
  assert.equal(stale.available, true);
  assert.equal(stale.stale, true);
  assert.equal(stale.points.length, 2);
  const none = await free.service.history("VALE3", "3mo");
  assert.equal(none.available, false);
  assert.equal(none.reason, "provider_error");
  assert.deepEqual(none.points, []);
});

test("token nunca aparece em URL, log ou resposta", async () => {
  const token = "brapi_secret_token_987";
  const { service, calls, logs, store } = setup({
    token,
    routes: {
      quote: (symbol) =>
        symbol === "VALE3"
          ? new Response("{}", { status: 429, headers: { "Retry-After": "5" } })
          : Response.json(quotePayload(symbol)),
    },
  });
  const responses = [
    await service.quotes(["PETR4", "TIMS3"]),
    await service.quote("PETR4"),
    await service.history("PETR4", "3mo"),
    await service.quote("VALE3"),
  ];
  assert.ok(calls.length >= 4);
  for (const call of calls) {
    assert.doesNotMatch(call.url, new RegExp(token));
    assert.equal(call.headers.Authorization, `Bearer ${token}`);
  }
  const brapiLogs = logs.filter((line) => line.includes('"brapi_call"'));
  assert.equal(brapiLogs.length, calls.length);
  for (const line of logs) {
    assert.doesNotMatch(line, new RegExp(token));
    assert.doesNotMatch(line, /\?|symbols=|Bearer/);
  }
  assert.doesNotMatch(JSON.stringify(responses), new RegExp(token));
  assert.doesNotMatch(JSON.stringify([...store.rows]), new RegExp(token));
});

test("cache compartilhado fora do ar não derruba as cotações", async () => {
  const { service, store, logs, count } = setup();
  store.failRead = true;
  store.failWrite = true;
  const result = await service.quotes(["PETR4"]);
  assert.equal(result.quotes[0].freshness, "delayed");
  assert.equal(count("catalog"), 1);
  await service.quotes(["PETR4"]);
  assert.equal(count("catalog"), 1, "Memory still caches");
  const errors = logs.filter((line) => line.includes("market_cache_error"));
  assert.ok(errors.length >= 1);
  assert.doesNotMatch(errors.join(), /down/);
});
