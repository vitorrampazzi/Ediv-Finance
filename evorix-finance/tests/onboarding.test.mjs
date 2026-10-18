import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanOnboardingDestination,
  createOnboardingStore,
  onboardingEligible,
  onboardingEntryDestination,
  onboardingStepCount,
  onboardingStoragePrefix,
} from "../onboarding.mjs";

const user = {
  id: "local-new",
  emailVerified: true,
  createdAt: "2026-10-18T12:00:00Z",
};
function storageFixture() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("ordinary login never starts an introduction, even for a recently created account", () => {
  const storage = storageFixture();
  const store = createOnboardingStore(storage);
  assert.equal(onboardingEligible(user), true);
  assert.equal(onboardingEligible({ ...user, emailVerified: false }), false);
  assert.equal(store.get(null), null);
  assert.equal(store.get({ ...user, emailVerified: false }), null);
  assert.equal(
    store.get(user, "/app/ranking?mode=demo#pesquisa-dre").active,
    false,
  );
  assert.equal(
    store.get(user, "/app/ranking?mode=demo#pesquisa-dre", true).active,
    true,
  );
  const old = { ...user, id: "old", createdAt: "2026-10-01T00:00:00Z" };
  assert.equal(store.get(old).active, false);
  assert.equal(store.restart(old, "/app/config").active, true);
  assert.equal(
    createOnboardingStore(storage).get(
      { ...old, id: "requested" },
      "/app",
      true,
    ).active,
    true,
  );
});

test("steps resume after reload and completion is isolated per user", () => {
  const storage = storageFixture();
  let store = createOnboardingStore(storage);
  const target = "/ranking/acao/DEMO1?mode=demo#pesquisa-dre";
  store.get(user, target, true);
  store.persist(user);
  assert.equal(createOnboardingStore(storage).get(user).returnTo, target);
  store.setStep(user, 1);
  store.setStep(user, 2);
  store = createOnboardingStore(storage);
  assert.equal(store.get(user).step, 2);
  assert.equal(store.get(user).returnTo, target);
  for (let step = 3; step < onboardingStepCount; step++)
    store.setStep(user, step);
  assert.equal(store.complete(user).active, false);
  assert.equal(
    createOnboardingStore(storage).get(user, "/app", true).active,
    false,
  );
  assert.equal(store.get({ ...user, id: "other" }).active, false);
  assert.equal(store.get({ ...user, id: "other" }, "/app", true).active, true);
  assert.equal(store.restart(user, "/app/config").step, 0);
});

test("mandatory progression rejects skipped/invalid steps and early completion", () => {
  const store = createOnboardingStore(storageFixture());
  const initial = store.get(user, "/app", true);
  for (const step of [-1, 2, 10, 1.2, NaN])
    assert.equal(store.setStep(user, step), initial);
  assert.equal(store.complete(user), initial);
  assert.equal(store.setStep(user, 1).step, 1);
  assert.equal(store.setStep(user, 0).step, 0);
});

test("blocked storage retains progress in memory without claiming persistence", () => {
  const blocked = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  const store = createOnboardingStore(blocked);
  assert.equal(store.get(user, "/app", true).persisted, false);
  assert.equal(store.setStep(user, 1).persisted, false);
  assert.equal(store.get(user).step, 1);
  assert.equal(createOnboardingStore().get(user).persisted, false);
});

test("malformed records and unsafe destinations never navigate outside allowed routes", () => {
  const storage = storageFixture();
  const key = onboardingStoragePrefix + encodeURIComponent(user.id);
  storage.values.set(
    key,
    '{"version":1,"completed":true,"step":999,"returnTo":"https://bad.invalid"}',
  );
  assert.equal(createOnboardingStore(storage).get(user).active, false);
  assert.equal(
    createOnboardingStore(storage).get(user, "/app", true).active,
    true,
  );
  for (const bad of [
    "//bad.invalid",
    "https://bad.invalid",
    "/\\bad.invalid",
    "/entrar",
    "/app/../entrar",
    "/app\n/x",
    null,
  ]) {
    assert.equal(cleanOnboardingDestination(bad), "/app");
  }
  const target = "/app/ranking/acao/DEMO1?mode=demo#pesquisa-dre";
  assert.equal(cleanOnboardingDestination(target), target);
  const entry = new URL(
    onboardingEntryDestination(target),
    "https://ediv.invalid",
  );
  assert.equal(entry.pathname, "/app");
  assert.equal(entry.searchParams.get("introducao"), "1");
  assert.equal(entry.searchParams.get("destino"), target);
  assert.equal(
    cleanOnboardingDestination(entry.pathname + entry.search),
    "/app",
  );
  assert.ok(
    onboardingEntryDestination("/app?busca=" + "a".repeat(1480)).length <= 1500,
  );
});

test("other tabs reconcile completion without mixing account state", () => {
  const storage = storageFixture();
  const first = createOnboardingStore(storage);
  const second = createOnboardingStore(storage);
  first.get(user, "/app", true);
  second.get(user, "/app", true);
  for (let step = 1; step < onboardingStepCount; step++)
    first.setStep(user, step);
  first.complete(user);
  let notified = 0;
  second.subscribe(() => notified++);
  second.sync(onboardingStoragePrefix + encodeURIComponent(user.id));
  assert.equal(notified, 1);
  assert.equal(second.get(user).active, false);
});

test("retired catalogue destinations go to ranking without stale search filters", () => {
  assert.equal(
    cleanOnboardingDestination("/mercado?busca=PETR4#mercado"),
    "/ranking",
  );
  assert.equal(
    cleanOnboardingDestination("/app/analises/?busca=PETR4"),
    "/app/ranking",
  );
});

test("six-step introductions migrate to five steps without reopening completed tours", () => {
  for (const [oldStep, newStep] of [
    [0, 0],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4],
  ]) {
    for (const completed of [true, false]) {
      const storage = storageFixture();
      const key = onboardingStoragePrefix + encodeURIComponent(user.id);
      storage.values.set(
        key,
        JSON.stringify({
          version: 1,
          step: oldStep,
          completed,
          returnTo: "/app/analises?busca=PETR4",
        }),
      );
      const store = createOnboardingStore(storage);
      const state = store.get(user, "/app", true);
      assert.equal(state.active, !completed);
      assert.equal(state.step, newStep);
      assert.equal(state.returnTo, "/app/ranking");
      store.persist(user);
      if (!completed)
        assert.equal(JSON.parse(storage.values.get(key)).version, 2);
      assert.equal(createOnboardingStore(storage).get(user).active, !completed);
    }
  }
});
