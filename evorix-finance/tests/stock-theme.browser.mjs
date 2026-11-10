import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { dividendColumns } from "../dividend-analysis.mjs";
import {
  fixtureNow,
  marketFixture,
  summaryQuote,
} from "./market-fixture.mjs";

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
  // The team's annual series: a payout line and the net income chart.
  annualHistory: {
    netIncome: [
      { year: 2023, value: "1200000000.00" },
      { year: 2024, value: "-300000000.00" },
      { year: 2025, value: "1500000000.00" },
    ],
    payout: [
      { year: 2025, value: "0.452000" },
      { year: 2026, value: "0.600000" },
    ],
  },
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
// Market data is mocked; the page must read well in both themes.
const market = marketFixture({
  publication,
  quotes: { TEST3: summaryQuote("TEST3", { price: "0.80000000" }) },
});
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
      await context.clock.install({ time: fixtureNow });
      await context.route("**/api/**", (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (market.handles(url)) {
          const { status, data } = market.respond(url);
          return route.fulfill({ status, json: data });
        }
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
            // One event of each AGF type; the last one after the snapshot.
            dividends: [
              ["Dividendo", 0.5, "2025-05-10"],
              ["JCP", 0.25, "2025-11-10"],
              ["Rendimento", 0.1, "2026-03-02"],
              ["JCP", 0.3, "2026-12-15"],
            ].map(([type, value, paymentDate]) => ({
              value,
              type,
              recordDate: null,
              paymentDate,
            })),
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
              graphic: resolve("--ediv-graphic-surface"),
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
                value.raised ===
                  (theme === "light" ? value.graphic : value.globalSurface) &&
                value.muted === value.globalMuted
              );
            },
            {
              message:
                "A paleta renderizada deve acompanhar os tokens do tema escolhido",
            },
          )
          .toBe(true);
        await expect(
          page.getByText("Cotação em relação ao teto", { exact: true }),
        ).toHaveCount(0);
        await expect(page.locator(".fmk-overview-market")).toContainText(
          "Valor de mercado",
        );
        // Market price and dynamic margin in this theme; no price chart.
        await expect(
          page.locator("#cotacao [data-market-quote]"),
        ).toHaveAttribute("data-market-quote", "market");
        await expect(
          page.locator(
            '.figma-stock header [data-summary="Margem de segurança"] [data-summary-value]',
          ),
        ).toHaveText("20,00%");
        await expect(page.locator("[data-price-chart]")).toHaveCount(0);
        // Dividends by type with the payout line, and the net income chart.
        const dividends = page.locator('figure[data-history-chart="dividends"]');
        await expect(dividends).toHaveAttribute("data-payout", "present");
        await expect(dividends.locator(".fmk-payout-line")).toHaveCount(1);
        await expect(dividends.locator("[data-dividend-period]")).toHaveCount(
          2,
        );
        await expect(
          dividends.getByRole("button", { name: "Agendados", exact: true }),
        ).toBeVisible();
        await expect(
          page.locator('[data-annual-chart="net-income"]'),
        ).toHaveAttribute("data-annual-state", "ready");
        // Light theme: light-green surfaces; only the logo tile is white.
        const backgrounds = await page.evaluate(() =>
          [".figma-stock", ".figma-stock .company-logo"].map(
            (selector) =>
              getComputedStyle(document.querySelector(selector))
                .backgroundColor,
          ),
        );
        assert.notEqual(backgrounds[0], "rgb(255, 255, 255)");
        assert.equal(backgrounds[1], "rgb(255, 255, 255)");
        const whites = await page
          .locator(".figma-stock *")
          .evaluateAll((nodes) =>
            nodes
              .filter(
                (node) =>
                  getComputedStyle(node).backgroundColor ===
                    "rgb(255, 255, 255)" &&
                  !node.closest(".company-logo") &&
                  node.getBoundingClientRect().width > 0,
              )
              .map((node) => node.tagName + "." + node.className),
          );
        if (theme === "light")
          assert.deepEqual(whites, [], "Só o logo fica branco no tema claro");
        const growth = page
          .locator(".fmk-overview-row")
          .filter({ hasText: "CAGR de lucros" });
        await expect(growth.locator("dd .text-fmk-up")).toHaveCount(1);
        if (name === "desktop" && theme === "dark") {
          const original = entry.dividendAnalysis.earningsCagr5Years;
          for (const [value, tone] of [
            ["-0.1", "text-fmk-down"],
            [null, null],
            ["0", null],
          ]) {
            entry.dividendAnalysis.earningsCagr5Years = value;
            await page.reload();
            await expect(growth).toBeVisible();
            await expect(growth.locator("dd .text-fmk-up")).toHaveCount(0);
            await expect(growth.locator("dd .text-fmk-down")).toHaveCount(
              tone ? 1 : 0,
            );
          }
          entry.dividendAnalysis.earningsCagr5Years = original;
          await page.reload();
          await expect(growth.locator("dd .text-fmk-up")).toHaveCount(1);
        }
        const palette = await readPalette();
        assert.equal(palette.background, palette.canvas);
        assert.equal(palette.text, palette.ink);
        assert.equal(palette.surface, palette.inset);
        assert.equal(
          palette.raised,
          theme === "light" ? palette.graphic : palette.globalSurface,
        );
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
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth - innerWidth,
              ),
            {
              // On failure, name the widest elements outside scroll areas.
              message: await page.evaluate(() =>
                [...document.querySelectorAll("body *")]
                  .filter((element) => {
                    if (element.getBoundingClientRect().right <= innerWidth + 2)
                      return false;
                    for (
                      let node = element.parentElement;
                      node && node !== document.body;
                      node = node.parentElement
                    )
                      if (getComputedStyle(node).overflowX !== "visible")
                        return false;
                    return true;
                  })
                  .slice(-6)
                  .map(
                    (element) =>
                      `${element.tagName}.${String(element.className).slice(0, 60)} → ${Math.round(element.getBoundingClientRect().right)}px`,
                  )
                  .join("; "),
              ),
            },
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
