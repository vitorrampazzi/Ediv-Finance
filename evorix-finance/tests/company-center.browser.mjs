import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";

// This focused runner needs the coordinator's read-only local preview, never production.
const origin = process.env.EDIV_CENTER_ORIGIN || "http://127.0.0.1:4210";
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
  const widths = [320, 375, 430, 768, 1024, 1440, 1920];
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
      assert.ok(
        await page
          .locator(".fc-section-nav")
          .evaluate((node) =>
            node.previousElementSibling.classList.contains("fc-company-header"),
          ),
        "Navegação imediatamente após identidade/KPIs",
      );
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
      await expect(page.locator(".recharts-wrapper")).toHaveCount(4);
    }
  });
  await run(
    "Gráficos: oito nomes nativos, foco/Escape e toggle teto",
    async () => {
      await page.goto(
        origin +
          "/app/ranking/acao/" +
          entries[0].ticker +
          "?publication=" +
          publication.id,
      );
      async function chartReturn() {
        await expect(page.locator(".fc-chart")).toHaveCount(4);
        for (const figure of await page.locator(".fc-chart").all()) {
          const chart = figure.locator('svg[role="application"]');
          const values = figure.locator(".dividend-chart-row");
          const labels = await values.locator("span").allTextContents();
          const numbers = await values.locator("strong").allTextContents();
          async function selected(index) {
            await expect(figure.locator(".fc-chart-tooltip")).toBeVisible();
            await expect(
              figure.locator(".fc-chart-tooltip p").first(),
            ).toHaveText(labels[index]);
            await expect(figure.locator(".fc-chart-tooltip strong")).toHaveText(
              numbers[index],
            );
          }
          await chart.scrollIntoViewIfNeeded();
          await page.mouse.move(0, 0);
          await page.keyboard.press("Tab");
          await chart.focus();
          await chart.press("ArrowRight");
          await selected(1);
          const tip = figure.locator(".fc-chart-tooltip");
          const before = await tip.boundingBox();
          const description = await chart.getAttribute("aria-describedby");
          assert.equal(
            await tip.evaluate((node) => getComputedStyle(node).pointerEvents),
            "auto",
          );
          await figure.locator("figcaption h3").hover();
          await selected(1);
          await tip.hover();
          await selected(1);
          await expect(chart).toHaveAttribute("aria-describedby", description);
          await expect(chart).toBeFocused();
          assert.deepEqual(
            await tip.boundingBox(),
            before,
            "Ler a dica não muda sua posição",
          );
          await expect(page.getByRole("tooltip")).toHaveCount(1);
          await chart.press("Escape");
          await expect(tip).toHaveCount(0);
          await expect(chart).toBeFocused();
          await page.mouse.move(0, 0);
          await chart.press("ArrowRight");
          await selected(1);
          await values.first().hover();
          await expect(figure.locator(".fc-chart-tooltip")).toHaveCount(0);
          await expect(page.getByRole("tooltip")).toHaveCount(1);
          await expect(page.getByRole("tooltip")).toContainText(labels[0]);
          await page.mouse.move(0, 0);
          await chart.press("ArrowRight");
          await selected(1);
          for (const [key, index] of [
            ["ArrowRight", 1],
            ["ArrowLeft", 0],
          ]) {
            await chart.press(key);
            await selected(index);
            await chart.press("Escape");
            await expect(figure.locator(".fc-chart-tooltip")).toHaveCount(0);
            await page.getByRole("heading", { level: 1 }).focus();
            await chart.focus();
            await chart.press(key);
            await expect(chart).toBeFocused();
            await selected(index);
            await expect(chart).toHaveAttribute(
              "aria-describedby",
              await figure.locator(".fc-chart-tooltip").getAttribute("id"),
            );
            await expect(page.getByRole("tooltip")).toHaveCount(1);
          }
          await chart.press("ArrowRight");
          await selected(1);
          await chart.press("ArrowLeft");
          await selected(0);
          await chart.press("Escape");
          await expect(figure.locator(".fc-chart-tooltip")).toHaveCount(0);
          await page.getByRole("heading", { level: 1 }).focus();
          for (const index of [0, 1]) {
            await figure.locator(".recharts-bar-rectangle").nth(index).hover();
            await selected(index);
          }
          await page.mouse.move(0, 0);
        }
      }
      await chartReturn();
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const figure = page.locator("#cotacao .fc-chart");
        const chart = figure.locator('svg[role="application"]');
        await figure.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await page.keyboard.press("Tab");
        await chart.focus();
        await chart.press("ArrowRight");
        const tip = figure.locator(".fc-chart-tooltip");
        await expect(tip).toBeVisible();
        const bounds = await tip.boundingBox();
        assert.ok(
          bounds.x >= 0 && bounds.x + bounds.width <= 321,
          "Dica contida em320px",
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: output + "/keyboard-overlay-320-" + theme + ".png",
        });
        await chart.press("Escape");
        await expect(tip).toHaveCount(0);
        await expect(chart).toBeFocused();
      }
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
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
      await chartReturn();
    },
  );
  await run("Âncoras por teclado, seção ativa e resumo em1093px", async () => {
    await page.goto(
      origin +
        "/app/ranking/acao/" +
        entries[0].ticker +
        "?publication=" +
        publication.id,
    );
    await page.setViewportSize({ width: 1093, height: 950 });
    await page
      .getByRole("link", { name: "Voltar ao topo", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    assert.ok(
      heading.y >= 60 && heading.y < 180,
      "Voltar ao topo mostra identidade",
    );
    await page
      .locator(".fc-company-header")
      .screenshot({ path: output + "/company-header.png" });
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
  await run(
    "7larguras/dois temas:layout,gráficos,números e empresa fixa",
    async () => {
      for (const theme of ["dark", "light"]) {
        for (const width of widths) {
          await page.setViewportSize({ width, height: 950 });
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
            theme + width + " semoverflow",
          );
          assert.equal(
            await page
              .locator(".fc-category-grid")
              .evaluate(
                (node) =>
                  getComputedStyle(node).gridTemplateColumns.split(" ").length,
              ),
            width >= 1600 ? 3 : width >= 768 ? 2 : 1,
          );
          assert.ok(
            await page
              .locator(".fc-metric dd")
              .evaluateAll((nodes) =>
                nodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
              ),
            theme + width + " valores contidos",
          );
          await expect(page.locator(".recharts-wrapper")).toHaveCount(4);
          await page.screenshot({
            path: output + "/company-" + width + "-" + theme + ".png",
            fullPage: width === 320 || width === 1920,
          });
          await page.locator("#cotacao").screenshot({
            path: output + "/price-" + width + "-" + theme + ".png",
          });
          await page.goto(origin + "/app/ranking");
          await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
          );
          const region = page.locator(".dividend-table-region");
          await region.scrollIntoViewIfNeeded();
          await region.evaluate((node) => (node.scrollLeft = 900));
          const bounds = await region.boundingBox();
          for (const cell of await page
            .locator('.dividend-table [data-column="companyName"]')
            .all()) {
            const rect = await cell.boundingBox();
            assert.ok(
              Math.abs(rect.x - bounds.x) < 2,
              theme + width + " stickycompany",
            );
            assert.ok(rect.width <= (width < 768 ? 145 : 225));
            assert.ok(
              await cell.evaluate(
                (node) =>
                  getComputedStyle(node).backgroundColor !== "rgba(0, 0, 0, 0)",
              ),
            );
          }
          await page.screenshot({
            path: output + "/ranking-scroll-" + width + "-" + theme + ".png",
          });
          await page.goto(
            origin +
              "/app/ranking/acao/" +
              entries[0].ticker +
              "?publication=" +
              publication.id,
          );
        }
      }
    },
  );
  await run("Prévia completa/showRank:22colunas com empresa fixa", async () => {
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
      ).toHaveCount(22);
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
      await page.keyboard.press("Tab");
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
