import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createFixture } from "./fixture.mjs";

if (process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true")
  throw new Error("O teste de sessão exige o MySQL descartável local.");

const runtime = process.env.EDIV_PLAYWRIGHT_PATH;
const { chromium } = await import(
  runtime ? pathToFileURL(runtime).href : "playwright"
);
const { expect } = await import(
  runtime
    ? new URL("./test.mjs", pathToFileURL(runtime)).href
    : "playwright/test"
);
const fixture = await createFixture();
const root = "http://127.0.0.1:4180";
const contexts = [];
const results = [];
const pageErrors = [];
let vite;
let browser;

async function check(name, work) {
  await fixture.clearLimits();
  await work();
  results.push({ name, status: "passed" });
  console.info("PASS:", name);
}
async function newContext(options = {}) {
  const context = await browser.newContext({
    baseURL: root,
    reducedMotion: "reduce",
    ...options,
  });
  contexts.push(context);
  context.on("page", (page) => {
    page.on("pageerror", (error) => pageErrors.push(error.message));
  });
  return context;
}
async function login(page, account) {
  await page.goto(root + "/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill(account.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/app");
  await expect(
    page.getByRole("heading", { name: "Sua mesa de pesquisa.", exact: true }),
  ).toBeVisible();
}

try {
  vite = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4180",
      "--strictPort",
    ],
    {
      env: { ...process.env, EDIV_API_PROXY_TARGET: fixture.origin },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Vite não iniciou em 30 segundos.")),
      30000,
    );
    vite.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("4180")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    vite.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    vite.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Vite encerrou com código " + code));
    });
  });
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const original = await newContext();
  const initialPage = await original.newPage();
  let savedState;
  await check(
    "Login usa cookie persistente sem guardar senha no navegador",
    async () => {
      await login(initialPage, fixture.accounts.a);
      const cookies = await original.cookies();
      const sessionCookie = cookies.find(
        (cookie) => cookie.name === "evorix_session",
      );
      assert.ok(sessionCookie, "O login deve configurar o cookie de sessão");
      assert.equal(sessionCookie.httpOnly, true);
      assert.equal(sessionCookie.sameSite, "Strict");
      assert.ok(sessionCookie.expires > Date.now() / 1000 + 29 * 86400);
      const storage = await initialPage.evaluate(() => ({
        local: Object.entries(localStorage),
        session: Object.entries(sessionStorage),
      }));
      assert.ok(!JSON.stringify(storage).includes(fixture.password));
      assert.ok(!JSON.stringify(storage).includes(sessionCookie.value));
      savedState = await original.storageState();
      await original.close();
    },
  );

  const restored = await newContext({ storageState: savedState });
  const page = await restored.newPage();
  await check(
    "Reabrir o navegador restaura a conta e leva a home interna",
    async () => {
      await page.goto(root);
      await page.waitForURL((url) => url.pathname === "/app");
      await expect(
        page.getByRole("button", {
          name: "Abrir menu da conta de Teste a",
          exact: true,
        }),
      ).toBeVisible();
      await page.goto(root + "/entrar");
      await page.waitForURL((url) => url.pathname === "/app");
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Sua mesa de pesquisa.", exact: true }),
      ).toBeVisible();
    },
  );

  const secondTab = await restored.newPage();
  await secondTab.goto(root + "/app");
  await expect(
    secondTab.getByRole("button", {
      name: "Abrir menu da conta de Teste a",
      exact: true,
    }),
  ).toBeVisible();
  await check(
    "Sair pelo avatar encerra a sessão também na outra aba",
    async () => {
      await page
        .getByRole("button", { name: /^Abrir menu da conta de/ })
        .click();
      await page
        .getByRole("button", { name: "Sair da conta", exact: true })
        .click();
      await page.waitForURL((url) => url.pathname === "/entrar");
      await secondTab.waitForURL((url) => url.pathname === "/entrar");
      assert.equal(
        (await page.request.get(root + "/api/auth/me")).status(),
        401,
      );
    },
  );
  await check(
    "Entrar em outra conta sincroniza a identidade entre as abas",
    async () => {
      await fixture.clearLimits();
      await login(page, fixture.accounts.b);
      await secondTab.waitForURL((url) => url.pathname === "/app");
      await expect(
        secondTab.getByRole("button", {
          name: "Abrir menu da conta de Teste b",
          exact: true,
        }),
      ).toBeVisible();
    },
  );

  await check(
    "Falha 503 ao restaurar oferece retry sem mandar para login",
    async () => {
      let requests = 0;
      await page.route("**/api/auth/me", async (route) => {
        requests += 1;
        if (requests === 1)
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Falha temporária de teste" }),
          });
        else await route.continue();
      });
      await page.goto(root + "/app");
      await expect(page.getByRole("alert")).toContainText(
        "Sua conta não foi desconectada",
      );
      assert.equal(new URL(page.url()).pathname, "/app");
      assert.equal(
        requests,
        1,
        "StrictMode deve compartilhar a consulta em andamento",
      );
      await expect(
        page.getByRole("button", { name: "Entrar", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Abrir menu da conta de Teste b",
          exact: true,
        }),
      ).toBeVisible();
      await page.unroute("**/api/auth/me");
    },
  );
  await check("401 confirmado restringe a área protegida", async () => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Sessão inválida de teste" }),
      }),
    );
    await page.goto(root + "/app");
    await page.waitForURL((url) => url.pathname === "/entrar");
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeVisible();
    await page.unroute("**/api/auth/me");
  });
  assert.deepEqual(pageErrors, []);
  console.info("PASS: Nenhum erro JavaScript nas jornadas de sessão");
} finally {
  await mkdir(".test-artifacts", { recursive: true });
  await writeFile(
    ".test-artifacts/session-browser-report.json",
    JSON.stringify({ results, pageErrors }, null, 2),
  );
  await Promise.allSettled(contexts.map((context) => context.close()));
  await browser?.close();
  vite?.kill();
  await fixture.cleanup();
}
