import test from "node:test";
import assert from "node:assert/strict";
import { createPolledStore, keyedStores } from "../src/lib/polledStore.ts";

const flush = () => new Promise((resolve) => setImmediate(resolve));

// Fake clock, timers and page visibility for the store.
function fakeEnvironment() {
  let time = 0;
  let hidden = false;
  let id = 0;
  const timers = new Map();
  const listeners = new Set();
  return {
    environment: {
      now: () => time,
      setTimer: (run, delay) => {
        timers.set(++id, { at: time + delay, run });
        return id;
      },
      clearTimer: (key) => timers.delete(key),
      hidden: () => hidden,
      onVisibility: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    async advance(ms) {
      const end = time + ms;
      for (;;) {
        const [key, next] =
          [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0] ?? [];
        if (!next || next.at > end) break;
        time = next.at;
        timers.delete(key);
        next.run();
        await flush();
      }
      time = end;
      await flush();
    },
    async setHidden(value) {
      hidden = value;
      for (const listener of listeners) listener();
      await flush();
    },
    timers: () => timers.size,
    listeners: () => listeners.size,
  };
}

function loader(answers) {
  const calls = [];
  return {
    calls,
    load: async (signal) => {
      calls.push(signal);
      const next = answers.shift() ?? { data: "same", refreshMs: 900_000 };
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

test("one request per cycle for every reader, at the interval of the answer", async () => {
  const fake = fakeEnvironment();
  const source = loader([
    { data: "first", refreshMs: 900_000 },
    { data: "second", refreshMs: 1_800_000 },
  ]);
  const store = createPolledStore({
    load: source.load,
    retryMs: 120_000,
    environment: fake.environment,
  });
  assert.equal(store.getSnapshot().loading, true);
  // Nothing is asked before somebody reads the store.
  await fake.advance(5_000);
  assert.equal(source.calls.length, 0);
  const seen = [];
  const stopA = store.subscribe(() => seen.push(store.getSnapshot().data));
  const stopB = store.subscribe(() => {});
  await flush();
  assert.equal(source.calls.length, 1);
  assert.deepEqual(store.getSnapshot(), {
    data: "first",
    loading: false,
    failed: false,
    error: null,
  });
  await fake.advance(899_000);
  assert.equal(source.calls.length, 1);
  await fake.advance(1_000);
  assert.equal(source.calls.length, 2);
  assert.equal(store.getSnapshot().data, "second");
  // The next interval comes from the latest answer: 30 minutes.
  await fake.advance(1_799_000);
  assert.equal(source.calls.length, 2);
  await fake.advance(1_000);
  assert.equal(source.calls.length, 3);
  assert.deepEqual(seen, ["first", "second", "same"]);
  stopA();
  stopB();
  // No readers: no timer and no visibility listener left behind.
  assert.equal(fake.timers(), 0);
  assert.equal(fake.listeners(), 0);
  await fake.advance(3_600_000);
  assert.equal(source.calls.length, 3);
});

test("a hidden tab lets the cycle lapse and catches up when visible", async () => {
  const fake = fakeEnvironment();
  const source = loader([{ data: "first", refreshMs: 900_000 }]);
  const store = createPolledStore({
    load: source.load,
    retryMs: 120_000,
    environment: fake.environment,
  });
  const stop = store.subscribe(() => {});
  await flush();
  assert.equal(source.calls.length, 1);
  await fake.setHidden(true);
  await fake.advance(3_600_000);
  assert.equal(source.calls.length, 1, "no request while hidden");
  await fake.setHidden(false);
  assert.equal(source.calls.length, 2, "due: asks as soon as it is visible");
  // Visible again before the next cycle is due: it just waits.
  await fake.setHidden(true);
  await fake.advance(60_000);
  await fake.setHidden(false);
  assert.equal(source.calls.length, 2);
  await fake.advance(840_000);
  assert.equal(source.calls.length, 3);
  stop();
});

test("a failure keeps the last data, marked, and retries sooner", async () => {
  const fake = fakeEnvironment();
  const limited = Object.assign(new Error("Muitas solicitações"), {
    retryAfterMs: 300_000,
  });
  const source = loader([
    { data: "first", refreshMs: 900_000 },
    new Error("Falha simulada"),
    limited,
    { data: "back", refreshMs: 900_000 },
  ]);
  const store = createPolledStore({
    load: source.load,
    retryMs: 120_000,
    environment: fake.environment,
  });
  const stop = store.subscribe(() => {});
  await flush();
  await fake.advance(900_000);
  assert.deepEqual(store.getSnapshot(), {
    data: "first",
    loading: false,
    failed: true,
    error: "Falha simulada",
  });
  // Two minutes later, then the server's Retry-After (five minutes).
  await fake.advance(120_000);
  assert.equal(source.calls.length, 3);
  assert.equal(store.getSnapshot().data, "first");
  await fake.advance(299_000);
  assert.equal(source.calls.length, 3);
  await fake.advance(1_000);
  assert.equal(source.calls.length, 4);
  assert.deepEqual(store.getSnapshot(), {
    data: "back",
    loading: false,
    failed: false,
    error: null,
  });
  stop();
});

test("a first load that fails shows the error; refresh asks again", async () => {
  const fake = fakeEnvironment();
  const source = loader([
    new Error("Ranking temporariamente indisponível"),
    { data: "ready", refreshMs: 900_000 },
  ]);
  const store = createPolledStore({
    load: source.load,
    retryMs: 120_000,
    environment: fake.environment,
  });
  const states = [];
  const stop = store.subscribe(() => states.push(store.getSnapshot()));
  await flush();
  assert.deepEqual(store.getSnapshot(), {
    data: null,
    loading: false,
    failed: true,
    error: "Ranking temporariamente indisponível",
  });
  store.refresh();
  assert.equal(store.getSnapshot().loading, true);
  await flush();
  assert.equal(store.getSnapshot().data, "ready");
  assert.equal(source.calls.length, 2);
  stop();
});

test("reset forgets the data and the answer still on its way", async () => {
  const fake = fakeEnvironment();
  let release;
  const calls = [];
  const store = createPolledStore({
    retryMs: 120_000,
    environment: fake.environment,
    load: (signal) => {
      calls.push(signal);
      return calls.length === 1
        ? new Promise((resolve) => {
            release = () => resolve({ data: "old", refreshMs: 900_000 });
          })
        : Promise.resolve({ data: "new", refreshMs: 900_000 });
    },
  });
  const stop = store.subscribe(() => {});
  await flush();
  store.reset();
  assert.equal(calls[0].aborted, true);
  release();
  await flush();
  assert.equal(store.getSnapshot().data, "new");
  stop();
});

test("keyed stores: one per key, the oldest forgotten past the limit", () => {
  let created = 0;
  const storeFor = keyedStores(() => {
    created += 1;
    return createPolledStore({
      load: async () => ({ data: created, refreshMs: 900_000 }),
      retryMs: 120_000,
    });
  }, 2);
  const first = storeFor("A");
  assert.equal(storeFor("A"), first);
  storeFor("B");
  storeFor("C");
  assert.equal(created, 3);
  assert.notEqual(storeFor("A"), first);
  assert.equal(created, 4);
});
