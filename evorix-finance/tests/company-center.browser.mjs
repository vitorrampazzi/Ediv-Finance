import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect } from "playwright/test";

// This focused runner needs the coordinator's read-only local preview, never production.
const origin = process.env.EDIV_CENTER_ORIGIN || "http://127.0.0.1:4332";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const output =
  process.env.EDIV_CENTER_OUTPUT || ".test-artifacts/company-center-browser";
await mkdir(output, { recursive: true });
let browser;
const passed = [],
  errors = [];
async function run(name, work) {
  if (
    process.argv.length > 2 &&
    !process.argv.slice(2).some((part) => name.includes(part))
  )
    return;
  await work();
  passed.push(name);
  console.log("PASS", name);
}
try {
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const context = await browser.newContext({
    viewport: { width: 1366, height: 950 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin + "/app/ranking");
  await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
  const publication = await page.evaluate(async () =>
    (await fetch("/api/rankings")).json(),
  );
  const entries = publication.entries;
  await run(
    "Ranking10→20, headers uniformes e explicações por teclado",
    async () => {
      const heights = await page
        .locator(".dividend-table thead th")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().height),
        );
      assert.equal(heights.length, 11);
      assert.ok(heights.every((height) => Math.abs(height - 72) < 1));
      const ceiling = page.locator('th[data-column="ceilingPrice"] button');
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      await ceiling.focus();
      await expect(page.getByRole("tooltip")).toContainText("6,81");
      await ceiling.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Ver mais ações", exact: true })
        .click();
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(20);
    },
  );
  await run("Prévia completa/showRank:21colunas com empresa fixa", async () => {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    let html;
    try {
      const { DividendRankingTable } = await vite.ssrLoadModule(
        "/src/components/DividendResearch.tsx",
      );
      html = renderToStaticMarkup(
        createElement(DividendRankingTable, {
          entries: entries.slice(0, 2),
          complete: true,
          showRank: true,
        }),
      );
    } finally {
      await vite.close();
    }
    await page.goto(origin + "/app/ranking");
    await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
    await page.evaluate((html) => {
      const fixture = document.createElement("section");
      fixture.id = "complete-table-fixture";
      fixture.style.cssText =
        "position:fixed;inset:80px 16px;z-index:20;background:var(--ediv-canvas);padding:16px;overflow:auto";
      fixture.innerHTML = html;
      document.body.append(fixture);
    }, html);
    for (const width of [320, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      await expect(
        page.locator("#complete-table-fixture .dividend-table thead th"),
      ).toHaveCount(21);
      const region = page.locator(
        "#complete-table-fixture .dividend-table-region",
      );
      await region.scrollIntoViewIfNeeded();
      await region.evaluate((node) => (node.scrollLeft = 1000));
      const bounds = await region.boundingBox();
      for (const cell of await page
        .locator(
          '#complete-table-fixture .dividend-table [data-column="companyName"]',
        )
        .all()) {
        const rect = await cell.boundingBox();
        assert.ok(Math.abs(rect.x - bounds.x) < 2);
        assert.ok(rect.width <= (width < 768 ? 145 : 225));
      }
      await page.screenshot({
        path: output + "/admin-complete-" + width + ".png",
      });
    }
  });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        passed,
        errors,
        limits: [
          "Local read-only fixture; no database, production, screen reader or global WCAG certification.",
        ],
      },
      null,
      2,
    ),
  );
  await browser?.close();
}

// The individual page moved to StockMake; keep its focused checks in one runner.
process.env.EDIV_FIGMA_ORIGIN ||= origin;
await import("./figma-stock.browser.mjs");
