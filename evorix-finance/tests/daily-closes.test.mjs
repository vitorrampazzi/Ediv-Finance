import test from "node:test";
import assert from "node:assert/strict";
import {
  busyRetryMs,
  claimMs,
  closingRows,
  closingSessionFor,
  createDailyCloses,
  doneMs,
  looksUnchanged,
  retryMs,
  waitMs,
} from "../server/market/daily-closes.js";
import { createQuoteService } from "../server/market/quote-service.js";

// Closes consolidated by the Escola (docs/MARGEM-E-HISTORICO.md): decision
// logic with an in-memory store that keeps the SQL semantics of
// server/market-closes.js (atomic claim with expiry, INSERT IGNORE).

const at = (iso) => Date.parse(iso);

function memoryStore(clock) {
  const claims = new Map();
  const closes = new Map();
  const calls = [];
  return {
    claims,
    closes,
    calls,
    failInsert: false,
    async claim(key, owner, ttlMs) {
      calls.push("claim");
      const row = claims.get(key);
      if (!row || row.expiresAt <= clock.now) {
        claims.set(key, {
          payload: { state: "running", owner },
          expiresAt: clock.now + ttlMs,
        });
        return "claimed";
      }
      return row.payload.state === "done" ? "done" : "busy";
    },
    async release(key, owner, wait) {
      calls.push("release");
      const row = claims.get(key);
      if (row?.payload.owner !== owner) return;
      row.payload = { ...row.payload, state: "retry" };
      row.expiresAt = clock.now + wait;
    },
    async finish(key, owner, details, ttlMs) {
      calls.push("finish");
      const row = claims.get(key);
      if (row?.payload.owner !== owner) return;
      row.payload = { ...details, state: "done", owner };
      row.expiresAt = clock.now + ttlMs;
    },
    async previousCloses(day) {
      calls.push("previous");
      const days = [...new Set([...closes.values()].map((row) => row.day))]
        .filter((value) => value < day)
        .sort();
      const last = days.at(-1);
      if (!last) return null;
      return {
        day: last,
        rows: new Map(
          [...closes.values()]
            .filter((row) => row.day === last)
            .map((row) => [
              row.ticker,
              { close: row.close, volume: row.volume },
            ]),
        ),
      };
    },
    // A slow write (ms) or one that never answers, like a frozen connection.
    insertDelayMs: 0,
    hangInsert: false,
    async insert(day, rows, capturedAt) {
      calls.push("insert");
      if (this.hangInsert) await new Promise(() => {});
      if (this.insertDelayMs)
        await new Promise((resolve) => setTimeout(resolve, this.insertDelayMs));
      if (this.failInsert)
        throw Object.assign(new Error("down"), { code: "ECONNRESET" });
      let inserted = 0;
      for (const row of rows) {
        const key = `${row.ticker}|${day}`;
        if (closes.has(key)) continue;
        closes.set(key, { ...row, day, capturedAt });
        inserted++;
      }
      return inserted;
    },
  };
}

const item = (symbol, price, volume) => ({
  symbol,
  name: symbol,
  logoUrl: null,
  price,
  changePercent: "0.0000",
  volume,
});
const catalogAt = (checkedAt, items) => ({ value: { items }, checkedAt });
const tickers = async () => ["PETR4", "VALE3", "ITUB4", "TIMS3", "BRK.B"];
const thursdayItems = [
  item("PETR4", "45.95000000", "53109700"),
  item("VALE3", "62.81000000", "20000000"),
  item("ITUB4", "39.97000000", "32694800"),
  item("TIMS3", "19.62000000", "367700"),
  item("ABEV3", "12.00000000", "100"),
];

function setup({ wait } = {}) {
  const clock = { now: at("2026-11-05T22:10:00Z") };
  const store = memoryStore(clock);
  const logs = [];
  let owners = 0;
  const instance = () =>
    createDailyCloses({
      store,
      tickers,
      log: (entry) => logs.push(entry),
      newOwner: () => `owner-${++owners}`,
      now: () => clock.now,
      ...(wait === undefined ? {} : { wait }),
    });
  return { clock, store, logs, instance };
}

test("janela: lista lida a partir das 19:00 de um pregão e antes da próxima abertura", () => {
  const day = (iso) => closingSessionFor(at(iso));
  assert.equal(day("2026-11-05T22:00:00Z"), "2026-11-05", "19:00 on Thursday");
  assert.equal(day("2026-11-05T21:59:59Z"), null, "18:59 is not final");
  // QA M1: a list read at 18:30-18:45 may still hold a pre-auction price.
  assert.equal(day("2026-11-05T21:30:00Z"), null, "18:30 is not final");
  assert.equal(day("2026-11-05T21:45:00Z"), null, "18:45 is not final");
  assert.equal(day("2026-11-05T13:00:00Z"), null, "Session open");
  assert.equal(
    day("2026-11-06T02:30:00Z"),
    "2026-11-05",
    "23:30, still Thursday in São Paulo",
  );
  assert.equal(day("2026-11-06T12:59:00Z"), "2026-11-05", "09:59 next day");
  assert.equal(day("2026-11-06T13:00:00Z"), null, "Friday opened");
  assert.equal(day("2026-11-07T15:00:00Z"), "2026-11-06", "Saturday");
  assert.equal(
    day("2026-11-09T12:00:00Z"),
    "2026-11-06",
    "Monday before the opening",
  );
  // B3 holidays are never a closing session.
  assert.equal(day("2026-11-02T22:10:00Z"), "2026-10-30", "Finados at 19:10");
  assert.equal(day("2026-11-02T21:40:00Z"), "2026-10-30", "Finados at 18:40");
  assert.equal(day("2026-11-20T22:10:00Z"), "2026-11-19");
  assert.equal(day("2026-11-23T12:00:00Z"), "2026-11-19");
  assert.equal(day("2026-12-24T22:00:00Z"), "2026-12-23");
});

test("linhas: só ações cobertas com preço, sem zero no lugar de preço ausente", () => {
  assert.deepEqual(
    closingRows(
      [
        ...thursdayItems,
        item("VALE3", "1.00000000", "1"),
        item("BRK.B", "10.00000000", "1"),
        { ...item("TIMS3", null, "1"), symbol: "TIMS3" },
        { symbol: "PETR4" },
      ],
      ["PETR4", "VALE3", "ITUB4", "TIMS3", "BRK.B", "EMAE4"],
    ),
    [
      { ticker: "ITUB4", close: "39.97000000", volume: "32694800" },
      { ticker: "PETR4", close: "45.95000000", volume: "53109700" },
      { ticker: "TIMS3", close: "19.62000000", volume: "367700" },
      { ticker: "VALE3", close: "62.81000000", volume: "20000000" },
    ],
  );
  assert.deepEqual(
    closingRows(
      [item("PETR4", "0", "1"), item("VALE3", "5.00000000", null)],
      ["PETR4", "VALE3"],
    ),
    [{ ticker: "VALE3", close: "5.00000000", volume: null }],
  );
});

test("lista parada: mesmo preço e volume em pelo menos 80% das ações comparadas", () => {
  const rows = [
    { ticker: "A1AA3", close: "10.00000000", volume: "100" },
    { ticker: "B1BB3", close: "20.00000000", volume: "200" },
    { ticker: "C1CC3", close: "30.00000000", volume: "300" },
    { ticker: "D1DD3", close: "40.00000000", volume: "400" },
    { ticker: "E1EE3", close: "50.00000000", volume: null },
  ];
  // Values as MySQL returns them: DECIMAL text and BIGINT numbers.
  const previous = (changed) =>
    new Map(
      rows.map((row, index) => [
        row.ticker,
        {
          close: index < changed ? "1.00000000" : row.close,
          volume: row.volume === null ? null : Number(row.volume),
        },
      ]),
    );
  assert.equal(looksUnchanged(rows, previous(0)), true);
  assert.equal(looksUnchanged(rows, previous(1)), true, "4 of 5 = 80%");
  assert.equal(looksUnchanged(rows, previous(2)), false, "3 of 5");
  assert.equal(looksUnchanged(rows, new Map()), false, "Nothing to compare");
  assert.equal(
    looksUnchanged(rows, new Map([["A1AA3", { close: "10", volume: 100 }]])),
    true,
    "Decimals are compared as values",
  );
  // Same price with another volume means a new session.
  assert.equal(
    looksUnchanged(
      rows.slice(0, 1),
      new Map([["A1AA3", { close: "10.00000000", volume: 101 }]]),
    ),
    false,
  );
});

test("gravação: uma vez por pregão, trava compartilhada e INSERT IGNORE", async () => {
  const { clock, store, logs, instance } = setup();
  // A close already written by hand (or by another run) is never overwritten.
  store.closes.set("VALE3|2026-11-05", {
    ticker: "VALE3",
    close: "62.00000000",
    volume: "1",
    day: "2026-11-05",
    capturedAt: "2026-11-05T22:05:00.000Z",
  });
  const first = instance();
  const run = first.afterCatalog(
    catalogAt("2026-11-05T22:10:00.000Z", thursdayItems),
  );
  assert.ok(run instanceof Promise, "Work starts without being awaited");
  assert.deepEqual(await run, {
    day: "2026-11-05",
    status: "written",
    inserted: 3,
  });
  assert.equal(store.closes.get("VALE3|2026-11-05").close, "62.00000000");
  assert.deepEqual(store.closes.get("PETR4|2026-11-05"), {
    ticker: "PETR4",
    close: "45.95000000",
    volume: "53109700",
    day: "2026-11-05",
    capturedAt: "2026-11-05T22:10:00.000Z",
  });
  assert.equal(store.closes.has("ABEV3|2026-11-05"), false, "Not covered");
  const claim = store.claims.get("closes:2026-11-05");
  assert.equal(claim.payload.state, "done");
  assert.equal(claim.expiresAt, clock.now + doneMs);
  assert.deepEqual(logs, [
    { event: "market_closes", day: "2026-11-05", inserted: 3, candidates: 4 },
  ]);
  // The same list again, in the same instance: no SQL at all.
  const calls = store.calls.length;
  assert.equal(
    first.afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
    null,
  );
  assert.equal(
    first.afterCatalog(catalogAt("2026-11-05T23:00:00.000Z", thursdayItems)),
    null,
  );
  assert.equal(store.calls.length, calls);
  // Another instance with a newer list finds the day done and writes nothing.
  const second = instance();
  clock.now += 60 * 60_000;
  assert.deepEqual(
    await second.afterCatalog(
      catalogAt("2026-11-05T22:40:00.000Z", thursdayItems),
    ),
    { day: "2026-11-05", status: "done" },
  );
  assert.equal(store.calls.filter((call) => call === "insert").length, 1);
  // Outside the window nothing is even claimed.
  assert.equal(
    second.afterCatalog(catalogAt("2026-11-06T14:00:00.000Z", thursdayItems)),
    null,
  );
  assert.equal(
    second.afterCatalog({ checkedAt: "x", value: { items: [] } }),
    null,
  );
  assert.equal(second.afterCatalog(null), null);
});

test("lista que não mudou desde o pregão anterior: não grava e tenta de novo depois", async () => {
  const { clock, store, logs, instance } = setup();
  for (const row of closingRows(thursdayItems, await tickers()))
    store.closes.set(`${row.ticker}|2026-11-05`, { ...row, day: "2026-11-05" });
  // Friday 19:10: brapi still serves Thursday's list.
  clock.now = at("2026-11-06T22:10:00Z");
  const first = instance();
  assert.deepEqual(
    await first.afterCatalog(
      catalogAt("2026-11-06T22:10:00.000Z", thursdayItems),
    ),
    { day: "2026-11-06", status: "unchanged" },
  );
  assert.equal(
    [...store.closes.keys()].some((key) => key.endsWith("2026-11-06")),
    false,
  );
  assert.deepEqual(logs.at(-1), {
    event: "market_closes_skipped",
    day: "2026-11-06",
    reason: "unchanged",
    previousDay: "2026-11-05",
  });
  const claim = store.claims.get("closes:2026-11-06");
  assert.equal(claim.payload.state, "retry");
  assert.equal(claim.expiresAt, clock.now + retryMs);
  // Before the retry delay another instance waits; afterwards a newer list
  // with Friday's prices is written.
  const second = instance();
  assert.deepEqual(
    await second.afterCatalog(
      catalogAt("2026-11-06T22:12:00.000Z", thursdayItems),
    ),
    { day: "2026-11-06", status: "busy" },
  );
  clock.now += retryMs;
  const friday = thursdayItems.map((entry, index) =>
    index < 2 ? { ...entry, price: "50.00000000", volume: "7" } : entry,
  );
  assert.deepEqual(
    await first.afterCatalog(catalogAt("2026-11-06T22:30:00.000Z", friday)),
    { day: "2026-11-06", status: "written", inserted: 4 },
  );
});

test("falha nunca derruba a requisição: erro registrado, trava devolvida e nova tentativa depois", async () => {
  const { clock, store, logs, instance } = setup();
  store.failInsert = true;
  const closes = instance();
  assert.deepEqual(
    await closes.afterCatalog(
      catalogAt("2026-11-05T22:10:00.000Z", thursdayItems),
    ),
    { day: "2026-11-05", status: "error" },
  );
  assert.deepEqual(logs, [
    { event: "market_closes_error", day: "2026-11-05", code: "ECONNRESET" },
  ]);
  assert.equal(store.claims.get("closes:2026-11-05").payload.state, "retry");
  // Even with the same list (the night cache lasts hours), the same instance
  // tries again once the claim expired, and does not hammer the store before.
  assert.equal(
    closes.afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
    null,
  );
  store.failInsert = false;
  clock.now += retryMs;
  assert.deepEqual(
    await closes.afterCatalog(
      catalogAt("2026-11-05T22:10:00.000Z", thursdayItems),
    ),
    { day: "2026-11-05", status: "written", inserted: 4 },
  );
  // A claim left by a writer that stopped expires after claimMs; the busy
  // instance checks again after busyRetryMs.
  const stuck = setup();
  stuck.store.claims.set("closes:2026-11-05", {
    payload: { state: "running", owner: "dead" },
    expiresAt: stuck.clock.now + claimMs,
  });
  const waiting = stuck.instance();
  assert.equal(
    (
      await waiting.afterCatalog(
        catalogAt("2026-11-05T22:10:00.000Z", thursdayItems),
      )
    ).status,
    "busy",
  );
  assert.equal(
    waiting.afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
    null,
  );
  assert.ok(busyRetryMs <= claimMs);
  stuck.clock.now += claimMs;
  assert.equal(
    (
      await waiting.afterCatalog(
        catalogAt("2026-11-05T22:10:00.000Z", thursdayItems),
      )
    ).status,
    "written",
  );
  // Two instances at the same time: one claims, the other is busy.
  const race = setup();
  const results = await Promise.all([
    race
      .instance()
      .afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
    race
      .instance()
      .afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [
    "busy",
    "written",
  ]);
});

function listService({ clock, onCatalog, logs, onCatalogWaitMs }) {
  return createQuoteService({
    provider: {
      name: "fixture",
      async catalog() {
        return { items: thursdayItems, availableSectors: [] };
      },
    },
    store: {
      async read() {
        return null;
      },
      async write() {},
      async reserveCall() {
        return true;
      },
    },
    now: () => clock.now,
    log: (entry) => logs.push(entry),
    onCatalog,
    ...(onCatalogWaitMs === undefined ? {} : { onCatalogWaitMs }),
  });
}

test("a leitura que torna o pregão devido espera as gravações; as outras não esperam", async () => {
  const { clock, store, logs, instance } = setup();
  // Slow writes: a request that did not wait would answer before them.
  store.insertDelayMs = 60;
  const closes = instance();
  const service = listService({
    clock,
    logs,
    onCatalog: (entry) => closes.afterCatalog(entry),
  });
  const started = Date.now();
  const listed = await service.quotes(["PETR4"]);
  assert.equal(listed.quotes[0].price, "45.95000000");
  assert.equal(store.closes.size, 4, "Written before the answer");
  assert.equal(store.claims.get("closes:2026-11-05").payload.state, "done");
  assert.ok(Date.now() - started >= 55, "The read waited for the insert");
  // Same night, nothing due any more: no SQL and no wait.
  const calls = store.calls.length;
  await service.quotes(["VALE3"]);
  await service.quote("TIMS3");
  assert.equal(store.calls.length, calls);
  // During the next session nothing is due either.
  clock.now = at("2026-11-06T14:00:00Z");
  await service.quotes(["PETR4"]);
  assert.equal(store.calls.length, calls);
  assert.deepEqual(
    logs.filter((entry) => entry.event?.startsWith("market_")),
    [{ event: "market_closes", day: "2026-11-05", inserted: 4, candidates: 4 }],
  );
});

test("prazo de 2,5 s: a leitura segue, registra o erro e a trava expira para outra tentativa", async () => {
  assert.equal(waitMs, 2_500);
  const { clock, store, logs, instance } = setup({ wait: 30 });
  store.hangInsert = true;
  const closes = instance();
  const service = listService({
    clock,
    logs,
    onCatalog: (entry) => closes.afterCatalog(entry),
  });
  const listed = await service.quotes(["PETR4"]);
  assert.equal(
    listed.quotes[0].freshness,
    "delayed",
    "The request still answers",
  );
  assert.deepEqual(logs, [
    { event: "market_closes_error", day: "2026-11-05", code: "TIMEOUT" },
  ]);
  // The stuck write keeps its claim until claimMs; this instance moves on.
  const claim = store.claims.get("closes:2026-11-05");
  assert.equal(claim.payload.state, "running");
  assert.equal(claim.expiresAt, clock.now + claimMs);
  assert.equal(
    closes.afterCatalog(catalogAt("2026-11-05T22:10:00.000Z", thursdayItems)),
    null,
  );
  // After the claim expires, a later read (here another instance) writes it.
  store.hangInsert = false;
  clock.now += claimMs;
  assert.deepEqual(
    await instance().afterCatalog(
      catalogAt("2026-11-05T22:11:00.000Z", thursdayItems),
    ),
    { day: "2026-11-05", status: "written", inserted: 4 },
  );
});

test("gancho da lista geral: espera limitada e nenhum erro chega a quem pediu a cotação", async () => {
  const clock = { now: at("2026-11-05T22:10:00Z") };
  const seen = [];
  const logs = [];
  // null means nothing to wait for.
  const idle = listService({
    clock,
    logs,
    onCatalog: (entry, freshness) => {
      seen.push([entry.checkedAt, freshness]);
      return null;
    },
  });
  assert.equal((await idle.quotes(["PETR4"])).quotes[0].price, "45.95000000");
  assert.deepEqual(seen, [["2026-11-05T22:10:00.000Z", "delayed"]]);
  // A returned promise is awaited before the read goes on.
  let done = false;
  const awaited = listService({
    clock,
    logs,
    onCatalog: () =>
      new Promise((resolve) =>
        setTimeout(() => {
          done = true;
          resolve();
        }, 20),
      ),
  });
  await awaited.quotes(["PETR4"]);
  assert.equal(done, true);
  // A hook that never answers cannot hold the request past its bound.
  const failing = [];
  const stuck = listService({
    clock,
    logs: failing,
    onCatalog: () => new Promise(() => {}),
    onCatalogWaitMs: 20,
  });
  assert.equal((await stuck.quote("PETR4")).quote.price, "45.95000000");
  const thrower = listService({
    clock,
    logs: failing,
    onCatalog: () => {
      throw Object.assign(new Error("boom"), { code: "HOOK" });
    },
  });
  assert.equal((await thrower.quote("PETR4")).quote.price, "45.95000000");
  const rejecter = listService({
    clock,
    logs: failing,
    onCatalog: () =>
      Promise.reject(Object.assign(new Error("x"), { code: "ASYNC" })),
  });
  assert.equal(
    (await rejecter.quotes(["PETR4"])).quotes[0].freshness,
    "delayed",
  );
  assert.deepEqual(failing, [
    { event: "market_catalog_hook_error", code: "TIMEOUT" },
    { event: "market_catalog_hook_error", code: "HOOK" },
    { event: "market_catalog_hook_error", code: "ASYNC" },
  ]);
});
