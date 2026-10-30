import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { dividendColumns } from "../dividend-analysis.mjs";

// Real authenticated React route with synthetic API responses. No database writes.
const artifacts = ".test-artifacts/stock-theme";
await mkdir(artifacts, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 4193, strictPort: true },
});
const root = "http://127.0.0.1:4193";
const entry = {
  rank: 1,
  ticker: "TEST3",
  companyName: "Empresa Didática de Energia",
  sector: "Energia elétrica",
  dividendAnalysis: Object.fromEntries(
    dividendColumns
      .slice(3)
      .map((column) => [
        column.key,
        column.format === "date"
          ? "2026-10-20"
          : column.format === "text"
            ? "jan-dez"
            : "1",
      ]),
  ),
  expectedReturnPercent: null,
  targetPrice: null,
  horizonMonths: null,
  thesis: null,
  risks: null,
};
const user = {
  id: "theme-ui",
  name: "Teste",
  email: "teste@example.test",
  emailVerified: true,
  role: "USER",
  permissions: [],
  createdAt: "2026-01-01T00:00:00Z",
};
const publication = {
  id: "27",
  title: "Pesquisa sintética",
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  sourceFileName: "teste.xlsx",
  updatedAt: null,
  canManage: false,
  totalEntries: 1,
  entries: [entry],
  history: [],
};
const sections = [
  "visao-geral",
  "cotacao",
  "dividendos",
  "indicadores",
  "resultados",
  "empresa",
  "entenda",
];
const report = [],
  errors = [],
  unknown = [];
let browser;
try {
  await server.listen();
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
    ["mobile320", 320, 568],
  ]) {
    for (const theme of ["dark", "light"]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      await context.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        const responses = {
          "/api/auth/me": { user },
          "/api/auth/availability": { available: true },
          "/api/rankings/status": { published: true },
          "/api/notifications": { notifications: [], unreadCount: 0 },
          "/api/rankings": publication,
          "/api/rankings/history/TEST3": {
            ticker: "TEST3",
            source: {
              name: "AGF",
              url: "https://example.test/history",
              capturedAt: "2026-10-20T12:00:00Z",
            },
            prices: [
              { date: "2026-10-19", close: 10 },
              { date: "2026-10-20", close: 11 },
            ],
            dividends: [],
          },
        };
        if (!responses[path]) unknown.push(path);
        return route.fulfill({
          status: responses[path] ? 200 : 404,
          json: responses[path] || { error: "API fora da fixture" },
        });
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      try {
        await page.goto(`${root}/app/ranking/acao/TEST3?visual=real`);
        await expect(page.locator(".figma-stock")).toBeVisible();
        // Use the actual control so the DOM, theme store and persisted choice
        // agree. Writing data-theme directly bypasses the application state.
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          "dark",
        );
        if (theme === "light") {
          await page
            .getByRole("button", { name: "Ativar tema claro", exact: true })
            .click();
        }
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect
          .poll(() =>
            page.evaluate(() => window.edivTheme?.getSnapshot().theme),
          )
          .toBe(theme);
        await expect(
          page.getByRole("button", {
            name:
              theme === "light" ? "Ativar tema escuro" : "Ativar tema claro",
            exact: true,
          }),
        ).toBeVisible();
        const readPalette = () =>
          page.locator(".figma-stock").evaluate((element) => {
            const style = getComputedStyle(element);
            const resolve = (variable) => {
              const probe = document.createElement("i");
              probe.style.color = `var(${variable})`;
              element.append(probe);
              const result = getComputedStyle(probe).color;
              probe.remove();
              return result;
            };
            return {
              background: style.backgroundColor,
              text: style.color,
              canvas: resolve("--ediv-canvas"),
              ink: resolve("--ediv-text"),
              surface: resolve("--fmk-surface"),
              inset: resolve("--ediv-inset"),
              raised: resolve("--fmk-raised"),
              globalSurface: resolve("--ediv-surface"),
              muted: resolve("--fmk-sub"),
              globalMuted: resolve("--ediv-muted"),
            };
          });
        await expect
          .poll(
            async () => {
              const value = await readPalette();
              return (
                value.background === value.canvas &&
                value.text === value.ink &&
                value.surface === value.inset &&
                value.raised === value.globalSurface &&
                value.muted === value.globalMuted
              );
            },
            {
              message:
                "A paleta renderizada deve acompanhar os tokens do tema escolhido",
            },
          )
          .toBe(true);
        const palette = await readPalette();
        assert.equal(palette.background, palette.canvas);
        assert.equal(palette.text, palette.ink);
        assert.equal(palette.surface, palette.inset);
        assert.equal(palette.raised, palette.globalSurface);
        assert.equal(palette.muted, palette.globalMuted);
        for (const id of sections) {
          const link = page
            .getByRole("navigation", { name: "Seções da análise" })
            .locator(`a[href="#${id}"]`);
          await link.click();
          await expect(page.locator(`#${id}`)).toBeInViewport();
          await expect(page.locator(`#${id}`)).toBeFocused();
          await page.screenshot({
            path: `${artifacts}/${name}-${theme}-${id}.png`,
          });
        }
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          )
          .toBeLessThanOrEqual(2);
        report.push({ name, theme, status: "passed", sections, palette });
        console.info("PASS:", name, theme, "sete seções e paleta global");
      } catch (error) {
        process.exitCode = 1;
        report.push({
          name,
          theme,
          status: "failed",
          error: error.stack || error.message,
        });
        console.error("FAIL:", name, theme, error.stack || error.message);
        await page
          .screenshot({
            path: `${artifacts}/${name}-${theme}-failure.png`,
            fullPage: true,
          })
          .catch(() => {});
      } finally {
        await context.close();
      }
    }
  }
  assert.deepEqual(unknown, []);
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await server.close();
  await writeFile(
    `${artifacts}/report.json`,
    JSON.stringify({ report, errors, unknown }, null, 2) + "\n",
  );
}
