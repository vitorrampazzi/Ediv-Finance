import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../public/theme-init.js", import.meta.url),
  "utf8",
);

function boot({ saved = null, dark = false, blocked = false } = {}) {
  let stored = saved;
  const events = new Map();
  const media = {
    matches: dark,
    addEventListener: (type, callback) => events.set(`media:${type}`, callback),
  };
  const storage = {
    getItem: () => {
      if (blocked) throw new Error("denied");
      return stored;
    },
    setItem: (_, value) => {
      if (blocked) throw new Error("quota");
      stored = value;
    },
    removeItem: () => {
      if (blocked) throw new Error("denied");
      stored = null;
    },
  };
  const document = {
    documentElement: { dataset: {} },
    querySelector: () => ({
      setAttribute: (_, value) => {
        document.metaColor = value;
      },
    }),
  };
  const window = {
    matchMedia: () => media,
    localStorage: storage,
    addEventListener: (type, callback) => events.set(type, callback),
  };
  runInNewContext(source, { window, document });
  return {
    store: window.edivTheme,
    document,
    getStored: () => stored,
    systemChange: (value) => {
      media.matches = value;
      events.get("media:change")();
    },
    storageChange: (value, key = "ediv-appearance-v1") =>
      events.get("storage")({ key, newValue: value, storageArea: storage }),
  };
}

test("boot applies saved appearance before React and sets browser chrome color", () => {
  const page = boot({ saved: "light", dark: true });
  assert.equal(page.document.documentElement.dataset.theme, "light");
  assert.equal(page.document.metaColor, "#f7f8f6");
  assert.equal(page.store.getSnapshot().preference, "light");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(
    html.indexOf('src="/theme-init.js"') < html.indexOf('<div id="root">'),
  );
  assert.doesNotMatch(
    html.match(/<script src="\/theme-init.js"[^>]*>/)[0],
    /async|defer|module/,
  );
});

test("system preference follows live changes until an explicit override is made", () => {
  const page = boot({ dark: true });
  assert.equal(page.store.getSnapshot().theme, "dark");
  page.systemChange(false);
  assert.equal(page.store.getSnapshot().theme, "light");
  page.store.setPreference("dark");
  page.systemChange(false);
  assert.equal(page.store.getSnapshot().theme, "dark");
  assert.equal(page.getStored(), "dark");
  page.store.setPreference("system");
  assert.equal(page.getStored(), null);
  assert.equal(page.store.getSnapshot().theme, "light");
});

test("reload preserves a valid choice; malformed storage uses system", () => {
  const page = boot();
  page.store.setPreference("dark");
  assert.equal(
    boot({ saved: page.getStored() }).store.getSnapshot().theme,
    "dark",
  );
  assert.equal(
    boot({ saved: "{invalid}", dark: true }).store.getSnapshot().preference,
    "system",
  );
});

test("unavailable storage preserves an interactive page and in-memory override", () => {
  const page = boot({ blocked: true, dark: true });
  page.store.setPreference("light");
  assert.equal(page.store.getSnapshot().theme, "light");
  page.systemChange(true);
  assert.equal(page.store.getSnapshot().theme, "light");
  page.store.setPreference("system");
  assert.equal(page.store.getSnapshot().theme, "dark");
});

test("cross-tab updates synchronize appearance and clearing storage restores system", () => {
  const page = boot({ dark: true });
  page.storageChange("light");
  assert.equal(page.store.getSnapshot().theme, "light");
  page.storageChange("dark", "unrelated");
  assert.equal(page.store.getSnapshot().theme, "light");
  page.storageChange(null, null);
  assert.equal(page.store.getSnapshot().preference, "system");
  assert.equal(page.store.getSnapshot().theme, "dark");
});

test("subscribers update only on a changed snapshot and can unsubscribe", () => {
  const page = boot();
  let updates = 0;
  const unsubscribe = page.store.subscribe(() => updates++);
  const initial = page.store.getSnapshot();
  page.systemChange(false);
  assert.equal(page.store.getSnapshot(), initial);
  page.store.setPreference("dark");
  assert.equal(updates, 1);
  unsubscribe();
  page.store.setPreference("light");
  assert.equal(updates, 1);
  page.store.setPreference("unexpected");
  assert.equal(page.store.getSnapshot().preference, "light");
});

test("both palettes retain readable semantic text against main surfaces", () => {
  const css = readFileSync(
    new URL("../src/index.css", import.meta.url),
    "utf8",
  );
  const palettes = [
    css.match(/:root \{([^}]+)\}/)[1],
    css.match(/:root\[data-theme="light"\] \{([^}]+)\}/)[1],
  ];
  const luminance = (hex) => {
    const rgb = hex
      .match(/[a-f\d]{2}/gi)
      .map((value) => parseInt(value, 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const palette of palettes) {
    const tokens = Object.fromEntries(
      [...palette.matchAll(/--ediv-([\w-]+): (#[\da-f]{6});/g)].map((match) => [
        match[1],
        luminance(match[2]),
      ]),
    );
    for (const foreground of ["text", "muted", "accent", "green", "red"]) {
      for (const background of ["canvas", "surface", "inset"]) {
        const ratio =
          (Math.max(tokens[foreground], tokens[background]) + 0.05) /
          (Math.min(tokens[foreground], tokens[background]) + 0.05);
        assert.ok(
          ratio >= 4.5,
          `${foreground}/${background}: ${ratio.toFixed(2)}`,
        );
      }
    }
  }
});
