import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsPage,
  analyticsReferrer,
  validMeasurementId,
  createConsentStore,
  createAnalyticsController,
  analyticsConsentKey,
  analyticsConsentLifetime,
} from "../analytics-policy.mjs";

const id = "G-TEST000001";
function storageFixture() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
function controllerFixture(options = {}) {
  const calls = [],
    loads = [],
    disabled = [];
  let clears = 0;
  const controller = createAnalyticsController({
    measurementId: id,
    origin: "https://escoladodividendo.com.br",
    enqueue: (...args) => calls.push(args),
    loadTag: (id) => loads.push(id),
    setDisabled: (value) => disabled.push(value),
    clearCookies: () => clears++,
    ...options,
  });
  return {
    controller,
    calls,
    loads,
    disabled,
    get clears() {
      return clears;
    },
    pageviews: () =>
      calls.filter(([type, name]) => type === "event" && name === "page_view"),
  };
}
test("missing, invalid or non-GA4 identifiers never initialize Google", () => {
  for (const value of ["", "UA-123-1", "G-bad", "G-TEST<script>", undefined]) {
    assert.equal(validMeasurementId(value), false);
    const fixture = controllerFixture({ measurementId: value });
    fixture.controller.update({ choice: "granted", pathname: "/" });
    assert.equal(fixture.loads.length, 0);
    assert.equal(fixture.calls.length, 0);
  }
  assert.equal(validMeasurementId(id), true);
});
test("unknown or denied consent causes no Google loads or events", () => {
  const fixture = controllerFixture();
  for (const choice of [null, "denied"])
    for (const pathname of ["/", "/app/ranking"]) {
      assert.equal(fixture.controller.update({ choice, pathname }), false);
    }
  assert.deepEqual(fixture.loads, []);
  assert.deepEqual(fixture.calls, []);
  assert.ok(fixture.disabled.every(Boolean));
});
test("one manual page view per route with no auto pageviews or advertising consent", () => {
  const fixture = controllerFixture();
  fixture.controller.update({ choice: "granted", pathname: "/" });
  fixture.controller.update({ choice: "granted", pathname: "/" });
  fixture.controller.update({ choice: "granted", pathname: "/aprender/" });
  assert.deepEqual(fixture.loads, [id]);
  assert.equal(fixture.pageviews().length, 2);
  const configuration = fixture.calls.find(([type]) => type === "config")[2];
  assert.equal(configuration.send_page_view, false);
  assert.equal(configuration.allow_google_signals, false);
  assert.equal(configuration.allow_ad_personalization_signals, false);
  assert.ok(
    fixture.calls
      .filter(([type]) => type === "consent")
      .every(
        ([, , params]) =>
          params.ad_storage === "denied" &&
          params.ad_user_data === "denied" &&
          params.ad_personalization === "denied",
      ),
  );
  assert.equal(
    fixture.pageviews()[1][2].page_referrer,
    "https://escoladodividendo.com.br/",
  );
});
test("sensitive paths, query, fragments and unknown destinations are not measured", () => {
  for (const path of [
    "/entrar",
    "/cadastro",
    "/verificar",
    "/redefinir-senha",
    "/recuperar-senha",
    "/app/perfil",
    "/app/config",
    "/app/conversas",
    "/app/admin",
    "/app/atendimentos",
    "/suporte",
    "/mercado",
    "/app/analises",
    "/api/auth/me",
    "//foreign.invalid",
    "/ranking?email=private",
    "/aprender#token",
    "/app/ranking/acao/nome@email.com",
  ]) {
    assert.equal(analyticsPage(path), null, path);
    const fixture = controllerFixture();
    fixture.controller.update({ choice: "granted", pathname: path });
    assert.equal(fixture.loads.length, 0);
  }
  const fixture = controllerFixture();
  fixture.controller.update({
    choice: "granted",
    pathname: "/app/ranking/acao/PETR4",
  });
  const params = fixture.pageviews()[0][2];
  assert.equal(params.page_path, "/app/ranking/acao/empresa");
  assert.equal(JSON.stringify(fixture.calls).includes("PETR4"), false);
  assert.equal(Object.hasOwn(params, "user_id"), false);
});
test("localhost, previews, QA and staff audiences never load a Google tag", () => {
  for (const origin of [
    "http://127.0.0.1:4184",
    "https://preview.vercel.app",
    "https://foreign.invalid",
  ]) {
    const fixture = controllerFixture({ origin });
    fixture.controller.update({ choice: "granted", pathname: "/" });
    assert.equal(fixture.loads.length, 0);
  }
  const fixture = controllerFixture();
  fixture.controller.update({
    choice: "granted",
    pathname: "/app/ranking",
    audienceAllowed: false,
  });
  assert.equal(fixture.loads.length, 0);
});
test("revocation disables transmission before consent update and clears cookies", () => {
  const order = [];
  const fixture = controllerFixture({
    setDisabled: (value) => order.push(["disabled", value]),
    enqueue: (...args) => order.push(args),
  });
  fixture.controller.update({ choice: "granted", pathname: "/" });
  order.length = 0;
  fixture.controller.update({ choice: "denied", pathname: "/" });
  assert.deepEqual(order[0], ["disabled", true]);
  assert.equal(order[1][0], "consent");
  assert.equal(order[1][2].analytics_storage, "denied");
  assert.equal(fixture.clears, 1);
  fixture.controller.update({ choice: "denied", pathname: "/aprender" });
  assert.equal(fixture.loads.length, 1);
});
test("consent is versioned, expires and is not implied by account use", () => {
  const storage = storageFixture();
  let time = 1000;
  const store = createConsentStore(storage, () => time);
  assert.equal(store.get().choice, null);
  store.choose("denied");
  assert.equal(createConsentStore(storage, () => time).get().choice, "denied");
  store.choose("granted");
  assert.equal(createConsentStore(storage, () => time).get().choice, "granted");
  time += analyticsConsentLifetime;
  store.reconcile();
  assert.equal(store.get().choice, null);
  storage.values.set(
    analyticsConsentKey,
    '{"version":"old","choice":"granted","updatedAt":1000}',
  );
  assert.equal(createConsentStore(storage, () => time).get().choice, null);
});
test("blocked or corrupt storage is safe and session-only choices remain operable", () => {
  const blocked = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  const store = createConsentStore(blocked);
  assert.deepEqual(store.get(), { choice: null, persisted: false });
  store.choose("granted");
  assert.deepEqual(store.get(), { choice: "granted", persisted: false });
  store.choose("denied");
  assert.equal(store.get().choice, "denied");
  const storage = storageFixture();
  storage.values.set(analyticsConsentKey, "not-json");
  assert.equal(createConsentStore(storage).get().choice, null);
});
test("referral attribution only includes known source origins, never searches or private URLs", () => {
  assert.equal(
    analyticsReferrer(
      "https://www.google.com/search?q=email%40example.invalid#token",
    ),
    "https://www.google.com/",
  );
  assert.equal(
    analyticsReferrer("https://private.invalid/person/alguem?token=secret"),
    "",
  );
  assert.equal(
    analyticsReferrer("https://www.google.com.evil.invalid/search"),
    "",
  );
  const fixture = controllerFixture({
    initialReferrer: "https://www.instagram.com/name?secret=hidden",
  });
  fixture.controller.update({ choice: "granted", pathname: "/" });
  assert.equal(
    fixture.pageviews()[0][2].page_referrer,
    "https://www.instagram.com/",
  );
  assert.equal(JSON.stringify(fixture.calls).includes("hidden"), false);
});

test("other tabs reconcile a changed choice", () => {
  const storage = storageFixture();
  const first = createConsentStore(storage);
  const second = createConsentStore(storage);
  second.get();
  let notified = 0;
  second.subscribe(() => notified++);
  first.choose("denied");
  second.reconcile();
  assert.equal(second.get().choice, "denied");
  assert.equal(notified, 1);
});
