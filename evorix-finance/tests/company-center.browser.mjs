import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";

// This focused runner needs the coordinator's read-only local preview, never production.
const origin = process.env.EDIV_CENTER_ORIGIN || "http://127.0.0.1:4199";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const output =
  process.env.EDIV_CENTER_OUTPUT || ".test-artifacts/company-center-browser";
await mkdir(output, { recursive: true });
let browser;
const passed = [],
  errors = [];
async function run(name, work) {
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
  await run("Três empresas:21campos exatos,6seções e5categorias", async () => {
    for (const entry of entries.slice(0, 3)) {
      await page.goto(
        origin +
          "/app/ranking/acao/" +
          entry.ticker +
          "?publication=" +
          publication.id,
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      const fields = page.locator(".dividend-information > [data-field]");
      await expect(fields).toHaveCount(21);
      for (const column of dividendColumns) {
        const row = page.locator('[data-field="' + column.key + '"]');
        await expect(row.locator("dt button, dt:not(:has(button))")).toHaveText(
          column.label,
        );
        await expect(row.locator("dd")).toHaveAttribute(
          "data-exact-value",
          formatDividendValue(dividendValue(entry, column.key), column.format),
        );
      }
      await expect(page.locator(".fc-summary-strip > div")).toHaveCount(6);
      await expect(page.locator(".fc-section-nav a")).toHaveText([
        "Visão geral",
        "Cotação",
        "Dividendos",
        "Indicadores",
        "Resultados",
        "Informações da empresa",
      ]);
      for (const [index, count] of [6, 1, 3, 5, 3].entries())
        await expect(
          page.locator(".fc-category").nth(index).locator(".fc-metric"),
        ).toHaveCount(count);
      await expect(page.locator(".fc-calendar li")).toHaveCount(12);
      await expect(page.locator(".recharts-wrapper")).toHaveCount(3);
    }
  });
  await run(
    "Gráficos: seis nomes nativos, foco/Escape e toggle teto",
    async () => {
      await page.mouse.move(0, 0);
      for (const button of await page.locator(".dividend-chart-row").all()) {
        await expect(button).toHaveAccessibleName(
          (await button.innerText()).replace(/\s+/g, " ").trim(),
        );
        await button.focus();
        await expect(page.getByRole("tooltip")).toBeVisible();
        await button.press("Escape");
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await expect(button).toBeFocused();
      }
      const price = page.locator("#cotacao");
      await page.getByLabel("Mostrar preço teto").uncheck();
      await expect(price.locator(".dividend-chart-row")).toHaveCount(1);
      await page.getByLabel("Mostrar preço teto").check();
      await expect(price.locator(".dividend-chart-row")).toHaveCount(2);
      const chart = price.locator('svg[role="application"]');
      await chart.focus();
      await chart.press("ArrowRight");
      await expect(price.locator(".fc-chart-tooltip")).toBeVisible();
      await chart.press("Escape");
      await expect(price.locator(".fc-chart-tooltip")).toHaveCount(0);
    },
  );
  await run("Âncoras por teclado, seção ativa e resumo em1093px", async () => {
    await page.setViewportSize({ width: 1093, height: 950 });
    await page
      .getByRole("link", { name: "Voltar ao topo", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.locator(".fc-section-nav [aria-current]")).toHaveText(
      "Visão geral",
    );
    assert.equal(
      await page
        .locator(".fc-summary-strip")
        .evaluate(
          (node) =>
            getComputedStyle(node).gridTemplateColumns.split(" ").length,
        ),
      3,
    );
    const nav = page.locator(".fc-section-nav");
    for (const label of [
      "Cotação",
      "Dividendos",
      "Indicadores",
      "Resultados",
      "Informações da empresa",
    ]) {
      const link = nav.getByRole("link", { name: label, exact: true });
      await link.focus();
      await link.press("Enter");
      const id = (await link.getAttribute("href")).slice(1);
      await expect(page.locator("#" + id)).toBeFocused();
      await expect(link).toHaveAttribute("aria-current", "location");
      const a = await nav.boundingBox(),
        b = await page.locator("#" + id).boundingBox();
      assert.ok(b.y >= a.y + a.height - 2, label + " abaixo da navegação");
    }
  });
  await run("320px/dois temas sem overflow, evidência visual", async () => {
    for (const theme of ["dark", "light"]) {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      await page
        .getByRole("link", { name: "Voltar ao topo", exact: true })
        .click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: output + "/company-320-" + theme + ".png",
        fullPage: true,
      });
      await page.screenshot({
        path: output + "/company-viewport-320-" + theme + ".png",
      });
    }
    await page.setViewportSize({ width: 1366, height: 950 });
    await page.screenshot({
      path: output + "/company-desktop.png",
      fullPage: true,
    });
    await page
      .locator("#visao-geral")
      .screenshot({ path: output + "/overview-desktop.png" });
    await page
      .locator("#cotacao")
      .screenshot({ path: output + "/price-desktop.png" });
  });
  await run(
    "Ausentes, zero, negativos e payout150% sem dado inventado",
    async () => {
      const probe = structuredClone(entries[0]);
      Object.assign(probe.dividendAnalysis, {
        referencePrice: null,
        ceilingPrice: null,
        projectedPE: "0",
        averagePE10Years: "-1",
        safetyMargin: "-1.5",
        expectedPayout: "1.5",
        netDebtToEbitda: "-2",
        estimatedGrossDividendYield: "0",
        announcementMonths: "Indefinido",
        announcementFrequency: "Mensal",
      });
      const rankingsRoute = (url) => url.pathname === "/api/rankings";
      await page.route(rankingsRoute, (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ ...publication, entries: [probe] }),
        }),
      );
      await page.goto(
        origin +
          "/app/ranking/acao/" +
          probe.ticker +
          "?publication=" +
          publication.id,
      );
      for (const [key, value] of Object.entries({
        referencePrice: "Não informado",
        projectedPE: "0",
        expectedPayout: "150,00%",
        safetyMargin: "-150%",
        netDebtToEbitda: "-2",
        estimatedGrossDividendYield: "0,00%",
      }))
        await expect(
          page.locator('[data-field="' + key + '"] dd'),
        ).toHaveAttribute("data-exact-value", value);
      await expect(
        page.locator("#cotacao .fc-chart-unavailable"),
      ).toContainText("Ausência não foi convertida em zero");
      await expect(page.locator("#cotacao .recharts-wrapper")).toHaveCount(0);
      await expect(page.locator('[data-insight="pe"] > strong')).toHaveText(
        "Não informado",
      );
      await expect(
        page.locator('.fc-calendar [data-announced="true"]'),
      ).toHaveCount(0);
      const debt = page.locator('[data-field="netDebtToEbitda"] dt button');
      await page.mouse.move(0, 0);
      await debt.focus();
      await expect(page.getByRole("tooltip")).toContainText(
        "não comprova caixa líquido",
      );
      await debt.press("Escape");
      await page.unroute(rankingsRoute);
    },
  );
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
