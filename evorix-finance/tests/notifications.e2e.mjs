import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";
import { expect } from "playwright/test";

assert.equal(process.env.EDIV_TEST_MYSQL_DISPOSABLE, "true");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(process.env.TARGET_MYSQL_HOST));
const { createFixture } = await import("./fixture.mjs");
const fixture = await createFixture();
const vite = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)), configFile: false, envDir: false,
  plugins: [react()], define: { __EDIV_ASSISTANT_ENABLED__: "false", __EDIV_QA_ENVIRONMENT__: "true" },
  server: { host: "127.0.0.1", port: 4180, strictPort: true,
    proxy: { "/api": { target: fixture.origin, changeOrigin: false } } },
});
let browser;
try {
  await vite.listen();
  try { browser = await chromium.launch({ headless: true }); }
  catch { browser = await chromium.launch({ headless: true, channel: "chrome" }); }
  await test("notificações E2E: browser → API real → MySQL descartável → destino e logout", async () => {
    const publication = await fixture.request(fixture.accounts.analyst, "/api/notifications/publish-learning", {
      method: "POST", body: { courseId: "pesquisa", version: "e2e-v1" },
    });
    assert.equal(publication.status, 200);
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
    });
    try {
      await page.goto("http://127.0.0.1:4180/entrar");
      await page.getByLabel("E-mail", { exact: true }).fill(fixture.accounts.a.email);
      await page.getByLabel("Senha", { exact: true }).fill(fixture.password);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/app");
      await page.getByRole("button", { name: /Notificações/ }).click();
      const link = page.locator('#ediv-notifications a[href="/app/aprender?aula=ranking#sala-de-aula"]');
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL((url) => url.pathname === "/app/aprender" && url.searchParams.get("aula") === "ranking" && url.hash === "#sala-de-aula");
      await expect(page.locator("#sala-de-aula")).toBeVisible();
      await expect(page.locator("#sala-de-aula").getByRole("heading", { level: 2 })).toHaveText("Como interpretar uma previsão");
      await expect.poll(async () => {
        const response = await page.request.get("http://127.0.0.1:4180/api/notifications");
        const data = await response.json();
        return data.notifications.find((entry) => entry.id === publication.body.notificationId)?.read;
      }).toBe(true);
      await mkdir(new URL("../.test-artifacts/notifications/", import.meta.url), { recursive: true });
      await page.screenshot({ path: fileURLToPath(new URL("../.test-artifacts/notifications/e2e.png", import.meta.url)), fullPage: true });
      await page.getByRole("button", { name: /Abrir menu da conta/ }).click();
      await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
      await expect(page.getByRole("button", { name: /Notificações/ })).toHaveCount(0);
      assert.equal((await page.request.get("http://127.0.0.1:4180/api/notifications")).status(), 401);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
} finally {
  await browser?.close();
  await vite.close();
  await fixture.cleanup();
}
