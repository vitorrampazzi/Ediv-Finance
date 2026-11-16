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
      events.get("media:change")?.();
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

test("app starts light independent of operating system and ignores system changes", () => {
  for (const dark of [false, true]) {
    const page = boot({ dark });
    assert.equal(page.store.getSnapshot().theme, "light");
    assert.equal(page.document.documentElement.dataset.theme, "light");
    assert.equal(page.document.metaColor, "#f7f8f6");
    page.systemChange(!dark);
    assert.equal(page.store.getSnapshot().theme, "light");
    page.store.setPreference("dark");
    page.systemChange(dark);
    assert.equal(page.store.getSnapshot().theme, "dark");
    assert.equal(page.document.metaColor, "#1c2025");
  }
});

test("reload preserves valid choices; malformed or legacy system storage uses light", () => {
  const page = boot();
  page.store.setPreference("dark");
  assert.equal(
    boot({ saved: page.getStored() }).store.getSnapshot().theme,
    "dark",
  );
  assert.equal(
    boot({ saved: "{invalid}", dark: true }).store.getSnapshot().preference,
    "light",
  );
  assert.equal(
    boot({ saved: "system", dark: true }).store.getSnapshot().theme,
    "light",
  );
});

test("unavailable storage preserves an interactive page and in-memory override", () => {
  const page = boot({ blocked: true, dark: true });
  assert.equal(page.store.getSnapshot().theme, "light");
  page.store.setPreference("dark");
  assert.equal(page.store.getSnapshot().theme, "dark");
  page.systemChange(false);
  assert.equal(page.store.getSnapshot().theme, "dark");
  page.store.setPreference("light");
  assert.equal(page.store.getSnapshot().theme, "light");
});

test("cross-tab updates synchronize appearance and clearing storage restores light", () => {
  const page = boot({ dark: true });
  page.storageChange("dark");
  assert.equal(page.store.getSnapshot().theme, "dark");
  page.storageChange("light", "unrelated");
  assert.equal(page.store.getSnapshot().theme, "dark");
  page.storageChange(null, null);
  assert.equal(page.store.getSnapshot().preference, "light");
  assert.equal(page.store.getSnapshot().theme, "light");
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
    css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)[1],
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
    for (const background of ["canvas", "surface", "inset"]) {
      const ratio =
        (Math.max(tokens["control-border"], tokens[background]) + 0.05) /
        (Math.min(tokens["control-border"], tokens[background]) + 0.05);
      assert.ok(
        ratio >= 3,
        `control-border/${background}: ${ratio.toFixed(2)}`,
      );
    }
  }
});

test("stylesheet is light without the boot script and only dark requests the hero photograph", () => {
  const css = readFileSync(
    new URL("../src/index.css", import.meta.url),
    "utf8",
  );
  const base = css.match(/:root \{([^}]+)\}/)[1];
  assert.ok(base.includes("--ediv-canvas: #f7f8f6;"));
  assert.ok(base.includes("color-scheme: light;"));
  assert.ok(
    css
      .match(/:root\[data-theme="dark"\] \{([^}]+)\}/)[1]
      .includes("color-scheme: dark;"),
  );
  const home = readFileSync(
    new URL("../src/components/home/public-home.css", import.meta.url),
    "utf8",
  );
  const photo = [...home.matchAll(/([^{}]+)\{[^}]*ediv-hero-forest[^}]*\}/g)];
  assert.equal(photo.length, 1);
  assert.ok(photo[0][1].includes(':root[data-theme="dark"]'));
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes('<meta name="theme-color" content="#f7f8f6" />'));
});
