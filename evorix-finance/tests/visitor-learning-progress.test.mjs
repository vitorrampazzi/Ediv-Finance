import test from "node:test";
import assert from "node:assert/strict";
import {
  createVisitorLearningProgress,
  visitorLearningProgressKey,
} from "../visitor-learning-progress.mjs";

function storageFixture(initial = null) {
  let value = initial;
  let failWrites = false;
  return {
    storage: {
      getItem: (key) => (key === visitorLearningProgressKey ? value : null),
      setItem: (key, next) => {
        assert.equal(key, visitorLearningProgressKey);
        if (failWrites) throw new Error("quota");
        value = next;
      },
    },
    blockWrites: () => {
      failWrites = true;
    },
    allowWrites: () => {
      failWrites = false;
    },
    value: () => value,
  };
}

test("restores only permitted visitor conclusions from the existing key", () => {
  const fixture = storageFixture('["ranking","risco","ranking",null,42]');
  const store = createVisitorLearningProgress(fixture.storage, ["ranking"]);
  assert.deepEqual(store.get(), { completed: ["ranking"], persisted: true });
  assert.equal(store.get(), store.get());
  assert.equal(fixture.value(), '["ranking","risco","ranking",null,42]');
  assert.equal(store.complete("risco"), store.get());
});

test("completion persists and survives a fresh store without losing the key format", () => {
  const fixture = storageFixture();
  const store = createVisitorLearningProgress(fixture.storage, ["ranking"]);
  store.complete("ranking");
  assert.equal(fixture.value(), '["ranking"]');
  assert.deepEqual(
    createVisitorLearningProgress(fixture.storage, ["ranking"]).get(),
    {
      completed: ["ranking"],
      persisted: true,
    },
  );
});

test("blocked storage keeps conclusions and reset in the same session", () => {
  for (const storage of [
    undefined,
    {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  ]) {
    const store = createVisitorLearningProgress(storage, ["ranking"]);
    store.complete("ranking");
    assert.deepEqual(store.get(), { completed: ["ranking"], persisted: false });
    const unsubscribe = store.subscribe(() => {});
    unsubscribe();
    // Reading/re-subscribing (as a page remount does) does not reload a stale record.
    assert.deepEqual(store.get().completed, ["ranking"]);
    store.reset();
    assert.deepEqual(store.get(), { completed: [], persisted: false });
  }
});

test("quota failure retains the in-memory result and explicit retry recovers", () => {
  const fixture = storageFixture();
  fixture.blockWrites();
  const store = createVisitorLearningProgress(fixture.storage, ["ranking"]);
  store.complete("ranking");
  assert.deepEqual(store.get(), { completed: ["ranking"], persisted: false });
  assert.equal(fixture.value(), null);
  fixture.allowWrites();
  store.persist();
  assert.deepEqual(store.get(), { completed: ["ranking"], persisted: true });
  assert.equal(fixture.value(), '["ranking"]');
});

test("a failed reset does not restore the old disk conclusion in memory", () => {
  const fixture = storageFixture('["ranking"]');
  const store = createVisitorLearningProgress(fixture.storage, ["ranking"]);
  fixture.blockWrites();
  store.reset();
  assert.deepEqual(store.get(), { completed: [], persisted: false });
  assert.equal(fixture.value(), '["ranking"]');
  assert.deepEqual(store.get().completed, []);
});

test("malformed saved data is recoverable and subscriptions clean up", () => {
  const fixture = storageFixture("not json");
  const store = createVisitorLearningProgress(fixture.storage, ["ranking"]);
  assert.deepEqual(store.get(), { completed: [], persisted: false });
  let updates = 0;
  const unsubscribe = store.subscribe(() => updates++);
  store.complete("ranking");
  assert.deepEqual(store.get(), { completed: ["ranking"], persisted: true });
  assert.equal(updates, 1);
  const before = store.get();
  store.complete("ranking");
  assert.equal(store.get(), before);
  unsubscribe();
  store.reset();
  assert.equal(updates, 1);
});
