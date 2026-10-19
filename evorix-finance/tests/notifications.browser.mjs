import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";

// shortcut: auth/visibility/API simulated; validate real auth and event generation separately in MySQL/E2E.
const vite = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  configFile: false, envDir: false, plugins: [react()],
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
const sample = (id = "1") => ({
  id, type: "research", title: "Pesquisa QA " + id,
  description: "Descrição QA", sourceId: id, read: false,
  favoriteTickers: [], createdAt: "2026-10-19T12:00:00Z",
  href: "/app/ranking?publication=" + id,
});

async function setup(data = { notifications: [sample()], unreadCount: 1, nextCursor: null }) {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = {
    gets: [], posts: [], status: 200, nextPage: null, holdGets: false, gates: [],
    data,
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    assert.equal(url.hostname, "127.0.0.1");
    if (!url.pathname.startsWith("/api/notifications")) return route.abort();
    if (req.method() === "GET") {
      state.gets.push(url);
      const snapshot = structuredClone(url.searchParams.has("cursor") && state.nextPage ? state.nextPage : state.data);
      if (state.holdGets) await new Promise((resolve) => state.gates.push(resolve));
      return route.fulfill({ status: state.status,
        json: state.status === 200
          ? snapshot
          : { error: "Falha QA recuperável" },
        headers: state.status === 429 ? { "Retry-After": "60" } : {},
      });
    }
    const body = req.postDataJSON();
    state.posts.push({ path: url.pathname, body });
    if (state.status !== 200) return route.fulfill({ status: state.status, json: { error: "Falha QA recuperável" } });
    state.data.notifications = state.data.notifications.map((entry) => ({
      ...entry, read: url.pathname.endsWith("read-all") || body?.notificationId === entry.id || entry.read,
    }));
    state.data.unreadCount = state.data.notifications.filter((entry) => !entry.read).length;
    return route.fulfill({ json: { message: "OK" } });
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/tests/notifications.harness.html`);
  await expect.poll(() => state.gets.length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /Notifica/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Notifica/ })).toHaveAttribute("aria-label", /não lidas/);
  return { page, state, context, errors };
}

try {
  await vite.listen();
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ headless: true, channel: "chrome" }); }
  await test("UI de notificações com API simulada, sem banco", async (t) => {
    await t.test("polling a cada 60s; pausa hidden; atualiza ao retornar", async () => {
      const { page, state, context } = await setup();
      try {
        const initial = state.gets.length;
        await page.clock.runFor(59_000);
        assert.equal(state.gets.length, initial);
        await page.clock.runFor(1000);
        await expect.poll(() => state.gets.length).toBe(initial + 1);
        await page.evaluate(() => {
          Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        const hidden = state.gets.length;
        await page.clock.runFor(120_000);
        assert.equal(state.gets.length, hidden);
        await page.evaluate(() => {
          Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await expect.poll(() => state.gets.length).toBeGreaterThan(hidden);
      } finally { await context.close(); }
    });
    await t.test("abrir menu atualiza; clique marca notificationId e navega", async () => {
      const { page, state, context } = await setup();
      try {
        const before = state.gets.length;
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect.poll(() => state.gets.length).toBeGreaterThan(before);
        const link = page.locator("#ediv-notifications").getByRole("link", { name: /Pesquisa QA 1/ });
        await expect(link).toHaveAttribute("href", "/app/ranking?publication=1");
        await link.click();
        await expect.poll(() => state.posts.length).toBe(1);
        assert.equal(state.posts[0].body.notificationId, "1");
        assert.equal(state.posts[0].body.publicationId, undefined);
      } finally { await context.close(); }
    });
    await t.test("marcar todas reflete contador; logout encerra polling", async () => {
      const { page, state, context } = await setup();
      try {
        await page.getByRole("button", { name: /Notifica/ }).click();
        await page.getByRole("button", { name: /Marcar todas/ }).click();
        await expect.poll(() => state.posts.length).toBe(1);
        assert.equal(state.posts[0].path, "/api/notifications/read-all");
        await expect(page.getByRole("button", { name: /Notifica/ })).not.toHaveAttribute("aria-label", /não lidas/);
        await page.getByRole("button", { name: "QA logout" }).click();
        const before = state.gets.length;
        await page.clock.runFor(120_000);
        assert.equal(state.gets.length, before);
      } finally { await context.close(); }
    });
    await t.test("troca de conta descarta dados anteriores", async () => {
      const { page, state, context } = await setup();
      try {
        state.data = { notifications: [{ ...sample("2"), title: "Exclusivo conta B" }], unreadCount: 1, nextCursor: null };
        const before = state.gets.length;
        await page.getByRole("button", { name: "QA conta B" }).click();
        await expect.poll(() => state.gets.length).toBeGreaterThan(before);
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.getByRole("link", { name: /Exclusivo conta B/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Pesquisa QA 1/ })).toHaveCount(0);
      } finally { await context.close(); }
    });
    await t.test("página seguinte não duplica itens; contador permanece global", async () => {
      const { page, state, context } = await setup({ notifications: [sample()], unreadCount: 2, nextCursor: "qa-next" });
      try {
        state.nextPage = { notifications: [sample(), sample("2")], unreadCount: 2, nextCursor: null };
        await page.getByRole("button", { name: /Notifica/ }).click();
        await page.getByRole("button", { name: /carregar mais|ver mais/i }).click();
        await expect(page.getByRole("link", { name: /Pesquisa QA 2/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Pesquisa QA 1/ })).toHaveCount(1);
        assert.ok(state.gets.some((url) => url.searchParams.get("cursor") === "qa-next"));
        await expect(page.getByRole("button", { name: /Notifica/ })).toHaveAttribute("aria-label", /2/);
      } finally { await context.close(); }
    });
    await t.test("clique durante GET é serializado e marca após a resposta", async () => {
      const { page, state, context } = await setup();
      try {
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.locator("#ediv-notifications [role=status]")).toHaveCount(0);
        state.holdGets = true;
        await page.clock.runFor(60_000);
        await expect.poll(() => state.gates.length).toBe(1);
        await page.getByRole("link", { name: /Pesquisa QA 1/ }).click();
        assert.equal(state.posts.length, 0);
        state.holdGets = false;
        state.gates.splice(0).forEach((resolve) => resolve());
        await expect.poll(async () => { await page.clock.runFor(10); return state.posts.length; }).toBe(1);
        assert.equal(state.posts[0].body.notificationId, "1");
      } finally { state.gates.splice(0).forEach((resolve) => resolve()); await context.close(); }
    });
    await t.test("resposta da conta antiga em voo não contamina a nova", async () => {
      const { page, state, context } = await setup();
      try {
        state.holdGets = true;
        await page.clock.runFor(60_000);
        await expect.poll(() => state.gates.length).toBe(1);
        state.holdGets = false;
        state.data = { notifications: [{ ...sample("2"), title: "Somente conta B" }], unreadCount: 1, nextCursor: null };
        await page.getByRole("button", { name: "QA conta B" }).click();
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.getByRole("link", { name: /Somente conta B/ })).toBeVisible();
        state.gates.splice(0).forEach((resolve) => resolve());
        await page.clock.runFor(1000);
        await expect(page.getByRole("link", { name: /Pesquisa QA 1/ })).toHaveCount(0);
        await expect(page.getByRole("link", { name: /Somente conta B/ })).toBeVisible();
      } finally { state.gates.splice(0).forEach((resolve) => resolve()); await context.close(); }
    });
    await t.test(">20 novos com histórico carregado preservam itens e percorrem lacuna", async () => {
      const range = (top, bottom) => Array.from({ length: top - bottom + 1 }, (_, i) => ({
        ...sample(String(top - i)), createdAt: new Date(Date.UTC(2026, 9, 19, 12, 0, top - i)).toISOString(),
      }));
      const { page, state, context } = await setup({ notifications: range(100, 81), unreadCount: 40, nextCursor: "81" });
      try {
        state.nextPage = { notifications: range(80, 61), unreadCount: 40, nextCursor: null };
        await page.getByRole("button", { name: /Notifica/ }).click();
        await page.getByRole("button", { name: /Carregar mais/ }).click();
        await expect(page.locator("#ediv-notifications li")).toHaveCount(40);
        state.data = { notifications: range(130, 111), unreadCount: 70, nextCursor: "111" };
        await page.clock.runFor(60_000);
        await expect(page.locator("#ediv-notifications li")).toHaveCount(60);
        await expect(page.getByRole("link", { name: /^Pesquisa QA 61/ })).toHaveCount(1);
        state.nextPage = { notifications: range(110, 91), unreadCount: 70, nextCursor: "91" };
        await page.getByRole("button", { name: /Carregar mais/ }).click();
        await expect(page.locator("#ediv-notifications li")).toHaveCount(70);
        await expect(page.getByRole("link", { name: /^Pesquisa QA 61/ })).toHaveCount(1);
        const ids = await page.locator("#ediv-notifications a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
        assert.equal(new Set(ids).size, 70);
      } finally { await context.close(); }
    });
    for (const status of [429, 503]) {
      await t.test(`falha ${status} preserva dados; retry recupera`, async () => {
        const { page, state, context } = await setup();
        try {
          await page.getByRole("button", { name: /Notifica/ }).click();
          await expect(page.getByRole("link", { name: /Pesquisa QA 1/ })).toBeVisible();
          state.status = status;
          await page.clock.runFor(60_000);
          await expect(page.getByRole("alert")).toBeVisible();
          await expect(page.getByRole("link", { name: /Pesquisa QA 1/ })).toBeVisible();
          const failedCount = state.gets.length;
          state.status = 200;
          await page.getByRole("button", { name: /tentar novamente|recarregar|atualizar/i }).click();
          await page.clock.runFor(status === 429 ? 59_000 : 4000);
          assert.equal(state.gets.length, failedCount, "Retry não deve burlar backoff/Retry-After");
          await page.clock.runFor(1000);
          await expect.poll(() => state.gets.length).toBeGreaterThan(failedCount);
          await expect(page.getByRole("alert")).toHaveCount(0);
        } finally { await context.close(); }
      });
    }
  });
  await test("UI adicional: layout, falhas e cancelamento", async (t) => {
    for (const width of [360, 1366]) {
      await t.test(`sino aberto em ${width}px: histórico/erro/botões, Escape e foco`, async () => {
        const { page, state, context, errors } = await setup({ notifications: Array.from({ length: 25 }, (_, i) => ({ ...sample(String(i + 1)), title: "Pesquisa com título extenso e descrição de validação " + (i + 1) })), unreadCount: 25, nextCursor: "25" });
        try {
          await page.setViewportSize({ width, height: 900 });
          await page.getByRole("button", { name: /Notifica/ }).click();
          await expect(page.locator("#ediv-notifications li")).toHaveCount(25);
          state.status = 503;
          await page.clock.runFor(60_000);
          await expect(page.getByRole("alert")).toBeVisible();
          const geometry = await page.locator("#ediv-notifications").evaluate((panel) => ({
            left: panel.getBoundingClientRect().left, right: panel.getBoundingClientRect().right,
            width: panel.clientWidth, contentWidth: panel.scrollWidth,
            documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
            actions: [...panel.querySelectorAll("button")].map((button) => ({ left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right, height: button.getBoundingClientRect().height })),
          }));
          assert.ok(geometry.left >= 0 && geometry.right <= width);
          assert.ok(geometry.contentWidth <= geometry.width + 1, JSON.stringify(geometry));
          assert.ok(geometry.documentWidth <= geometry.viewport);
          assert.ok(geometry.actions.every((action) => action.left >= 0 && action.right <= width && action.height >= 44));
          await mkdir(new URL("../.test-artifacts/notifications/", import.meta.url), { recursive: true });
          await page.screenshot({ path: fileURLToPath(new URL(`../.test-artifacts/notifications/harness-${width}.png`, import.meta.url)), animations: "disabled" });
          await page.keyboard.press("Escape");
          await page.clock.runFor(500);
          await expect(page.getByRole("button", { name: /Notifica/ })).toBeFocused();
          await expect(page.getByRole("button", { name: /Notifica/ })).toHaveAttribute("aria-expanded", "false");
          assert.deepEqual(errors, []);
        } finally { await context.close(); }
      });
    }
    await t.test("POST/read falho mantém não lida e só repete após backoff", async () => {
      const { page, state, context } = await setup();
      try {
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.locator("#ediv-notifications [role=status]")).toHaveCount(0);
        state.status = 503;
        await page.getByRole("link", { name: /Pesquisa QA 1/ }).click();
        await expect.poll(() => state.posts.length).toBe(1);
        assert.equal(state.data.notifications[0].read, false);
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(page.getByRole("button", { name: /Notifica/ })).toHaveAttribute("aria-label", /1 não lidas/);
        state.status = 200;
        await page.getByRole("button", { name: /Tentar novamente/ }).click();
        await page.clock.runFor(4000);
        assert.equal(state.posts.length, 1);
        await page.clock.runFor(1000);
        await expect.poll(() => state.posts.length).toBe(2);
        await expect(page.getByRole("button", { name: /Notifica/ })).not.toHaveAttribute("aria-label", /não lidas/);
      } finally { await context.close(); }
    });
    await t.test("503 repetido usa backoff progressivo 5s, 10s e 20s", async () => {
      const { page, state, context } = await setup();
      try {
        await page.getByRole("button", { name: /Notifica/ }).click();
        await expect(page.locator("#ediv-notifications [role=status]")).toHaveCount(0);
        state.status = 503;
        await page.clock.runFor(60_000);
        await expect(page.getByRole("alert")).toBeVisible();
        for (const delay of [5000, 10_000, 20_000]) {
          const before = state.gets.length;
          await page.getByRole("button", { name: /Tentar novamente/ }).click();
          await page.clock.runFor(delay - 1);
          assert.equal(state.gets.length, before, `espera completa de ${delay}ms`);
          await page.clock.runFor(1);
          await expect.poll(() => state.gets.length).toBe(before + 1);
          await expect(page.locator("#ediv-notifications [role=status]")).toHaveCount(0);
        }
      } finally { await context.close(); }
    });
    await t.test("desmontagem cancela GET pendente e não reinicia polling", async () => {
      const { page, state, context, errors } = await setup();
      try {
        let cancelled = 0;
        page.on("requestfailed", (request) => { if (request.url().includes("/api/notifications")) cancelled++; });
        state.holdGets = true;
        await page.clock.runFor(60_000);
        await expect.poll(() => state.gates.length).toBe(1);
        await page.getByRole("button", { name: "QA logout" }).click();
        await expect.poll(() => cancelled).toBeGreaterThan(0);
        state.holdGets = false;
        state.gates.splice(0).forEach((resolve) => resolve());
        const before = state.gets.length;
        await page.clock.runFor(180_000);
        assert.equal(state.gets.length, before);
        await expect(page.getByRole("button", { name: /Notifica/ })).toHaveCount(0);
        assert.deepEqual(errors, []);
      } finally { state.gates.splice(0).forEach((resolve) => resolve()); await context.close(); }
    });
  });
} finally {
  await browser?.close();
  await vite.close();
}
