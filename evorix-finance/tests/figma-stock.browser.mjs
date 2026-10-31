import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";
import {
  dividendAnnouncementMonths,
  dividendNumber,
} from "../dividend-insights.mjs";
const origin = process.env.EDIV_FIGMA_ORIGIN || "http://127.0.0.1:4332";
assert.equal(new URL(origin).hostname, "127.0.0.1");
const output =
  process.env.EDIV_FIGMA_OUTPUT || ".test-artifacts/figma-stock-browser";
await mkdir(output, { recursive: true });
let browser;
const passed = [],
  errors = [],
  fonts = [];
const widths = [320, 1440];
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
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (url.pathname.startsWith("/api/rankings/history/"))
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Histórico ausente nesta fixture de fallback",
        }),
      });
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.url().includes("/fonts/"))
      fonts.push({ url: response.url(), status: response.status() });
  });
  await page.goto(origin + "/app/ranking");
  await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
  const publication = await page.evaluate(async () =>
    (await fetch("/api/rankings")).json(),
  );
  const entries = publication.entries;
  const companyUrl = (entry) =>
    origin +
    "/app/ranking/acao/" +
    entry.ticker +
    "?publication=" +
    publication.id;
  async function exactFields(entry) {
    await expect(page.locator(".figma-stock [data-field]")).toHaveCount(20);
    const actual = await page
      .locator(".figma-stock [data-field]")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          key: node.dataset.field,
          label: node.firstElementChild.firstChild.textContent.trim(),
          value: node.querySelector("[data-exact-value]").dataset.exactValue,
        })),
      );
    assert.equal(new Set(actual.map((row) => row.key)).size, 20);
    for (const column of dividendColumns.filter(
      (column) => column.key !== "updatedOn",
    ))
      assert.deepEqual(
        actual.find((row) => row.key === column.key),
        {
          key: column.key,
          label: column.label,
          value: formatDividendValue(
            dividendValue(entry, column.key),
            column.format,
          ),
        },
      );
  }
  const groups = {
    price: ["referencePrice", "ceilingPrice"],
    dividends: ["projectedGrossDividendPerShare", "estimatedEps"],
    eps: ["estimatedEps"],
    profit: ["estimatedNetIncome"],
    cagr: ["earningsCagr5Years"],
    debt: ["netDebtToEbitda"],
    valuation: ["projectedPE", "averagePE10Years"],
  };
  async function publicationCharts(entry) {
    await expect(page.locator("figure.fmk-publication-chart")).toHaveCount(7);
    for (const [id, keys] of Object.entries(groups)) {
      const figure = page.locator(
        'figure[data-publication-chart="' + id + '"]',
      );
      await figure.scrollIntoViewIfNeeded();
      const valid = keys.some(
        (key) => dividendNumber(dividendValue(entry, key)) !== null,
      );
      await expect(figure.locator(".recharts-wrapper")).toHaveCount(
        valid ? 1 : 0,
      );
      await expect(figure.locator("[data-chart-value]")).toHaveCount(
        keys.length,
      );
      for (const key of keys) {
        const expected = formatDividendValue(
          dividendValue(entry, key),
          dividendColumns.find((c) => c.key === key).format,
        );
        const value = figure.locator('[data-chart-value="' + key + '"]');
        await expect(value).toHaveAttribute("data-exact-value", expected);
        await expect(value).toHaveText(expected);
      }
      if (!valid) await expect(figure.getByRole("status")).toBeVisible();
    }
  }
  await run("Ranking→portZIP real/3tickers/20valores exatos", async () => {
    await page.locator(".dividend-company-link").first().press("Enter");
    for (const entry of entries.slice(0, 3)) {
      await page.goto(companyUrl(entry));
      await expect(page.locator(".figma-stock h1")).toHaveText(
        entry.companyName,
      );
      await expect(page.locator(".figma-stock h1")).toBeFocused();
      await exactFields(entry);
      await publicationCharts(entry);
      assert.equal(await page.locator(".figma-stock [data-month]").count(), 12);
      const actual = await page
        .locator('.figma-stock [data-announced="true"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => Number(node.dataset.month)),
        );
      assert.deepEqual(
        actual,
        dividendAnnouncementMonths(entry.dividendAnalysis.announcementMonths) ||
          [],
      );
      assert.doesNotMatch(
        await page.locator(".figma-stock").innerText(),
        /DEMO3|Companhia Modelo|Marina Albuquerque|1962|18:40|série ilustrativa|empresa fictícia/i,
      );
    }
  });
  await run("Instrument Sans global nos textos, valores e fontes locais", async () => {
    await page.evaluate(() => document.fonts.ready);
    for (const locator of [
      page.locator(".figma-stock"),
      page.locator(".figma-stock h1"),
      page.locator(".figma-stock .font-fmk-mono").first(),
      page.locator(".figma-stock figure.fmk-publication-chart svg text").first(),
    ]) {
      const family = await locator.evaluate(
        (node) => getComputedStyle(node).fontFamily,
      );
      assert.match(family, /Instrument Sans/);
      assert.doesNotMatch(family, /Newsreader|DM Mono|Georgia|Times New Roman/);
    }
    const loaded = await page.evaluate(() =>
      Array.from(document.fonts)
        .filter((face) => face.status === "loaded")
        .map((face) => face.family),
    );
    assert.ok(loaded.some((name) => name.includes("Instrument Sans")));
    assert.ok(
      loaded.every((name) => name.includes("Instrument Sans")),
      "Somente Instrument Sans deve carregar como família visual",
    );
    assert.ok(fonts.length >= 1 && fonts.every((font) => font.status === 200));
    assert.ok(
      fonts.every((font) => /instrument-sans/i.test(font.url)),
      "Somente arquivos de Instrument Sans devem ser requisitados",
    );
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    assert.equal(
      await page
        .locator(".figma-stock")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(14, 17, 19)",
    );
  });
  await run("7âncoras,FAQ e InfoTip mouse/teclado/Escape", async () => {
    const nav = page.locator(".figma-stock nav");
    await expect(nav.getByRole("link")).toHaveCount(7);
    for (const link of await nav.getByRole("link").all()) {
      await link.focus();
      await link.press("Enter");
      const id = (await link.getAttribute("href")).slice(1);
      const section = page.locator("#" + id);
      await expect(section).toBeFocused();
      const a = await nav.boundingBox(),
        b = await section.boundingBox();
      assert.ok(b.y >= a.y + a.height - 2, id + " não encoberto");
    }
    const tab = page.getByRole("tab").first();
    await tab.focus();
    await tab.press("ArrowDown");
    await expect(page.getByRole("tab").nth(1)).toBeFocused();
    await expect(page.getByRole("tab").nth(1)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toContainText("Margem da fonte");
    const info = page.locator(".figma-stock .fmk-info").first();
    await page.keyboard.press("Tab");
    await info.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    assert.match(
      await page
        .getByRole("tooltip")
        .evaluate((node) => getComputedStyle(node).fontFamily),
      /Instrument Sans/,
    );
    await info.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(info).toBeFocused();
    await info.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await info.click();
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
  await run(
    "Responsividade: " +
      widths.length +
      "larguras×2temas:tipografia/composição/sem overflow",
    async () => {
      for (const theme of ["dark", "light"])
        for (const width of widths) {
          await page.setViewportSize({ width, height: 1000 });
          await page.goto(companyUrl(entries[0]));
          await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
          );
          await page.evaluate(() => document.fonts.ready);
          assert.equal(
            await page
              .locator(".figma-stock h1")
              .evaluate((node) => getComputedStyle(node).fontSize),
            width >= 768 ? "48px" : "36px",
          );
          assert.equal(
            await page
              .locator(".figma-stock .fmk-overview-figures .text-6xl")
              .first()
              .evaluate((node) => getComputedStyle(node).fontSize),
            width >= 768 ? "72px" : "60px",
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            theme + width + " semoverflow",
          );
          assert.ok(
            await page
              .locator(".figma-stock .fmk-exact")
              .evaluateAll((nodes) =>
                nodes.every((node) => node.scrollWidth <= node.clientWidth + 1),
              ),
            theme + width + " númeroscontidos",
          );
          const info = page.locator(".figma-stock .fmk-info").first();
          await page.keyboard.press("Tab");
          await info.focus();
          await expect(page.getByRole("tooltip")).toBeVisible();
          const bounds = await page.getByRole("tooltip").boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
          await info.press("Escape");
          await page.screenshot({
            path: output + "/company-" + width + "-" + theme + ".png",
            fullPage: width === 320 || width === 1440,
          });
          if (width === 320 || width === 1440)
            for (const id of [
              "visao-geral",
              "cotacao",
              "indicadores",
              "entenda",
            ]) {
              await page
                .locator('.figma-stock nav a[href="#' + id + '"]')
                .click();
              await page.screenshot({
                path: output + "/" + id + "-" + width + "-" + theme + ".png",
              });
            }
        }
    },
  );
  await run(
    "EDGE:null/zero/negativo/payout150/calendárioIndefinido",
    async () => {
      await page.setViewportSize({ width: 320, height: 1000 });
      const probe = structuredClone(entries[0]);
      probe.ticker = "EDGE3";
      probe.companyName = "Empresa de teste";
      Object.assign(probe.dividendAnalysis, {
        referencePrice: null,
        ceilingPrice: null,
        marketValue: null,
        estimatedNetIncome: null,
        totalShares: "0",
        projectedPE: "0",
        averagePE10Years: "-1",
        safetyMargin: "-1.5",
        expectedPayout: "1.5",
        netDebtToEbitda: "-2",
        estimatedGrossDividendYield: "0",
        announcementMonths: "Indefinido",
        announcementFrequency: "Mensal",
      });
      const matches = (url) => url.pathname === "/api/rankings";
      await page.route(matches, (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ ...publication, entries: [probe] }),
        }),
      );
      await page.goto(companyUrl(probe));
      await exactFields(probe);
      await publicationCharts(probe);
      await expect(page.locator('[data-announced="true"]')).toHaveCount(0);
      assert.doesNotMatch(
        await page.locator(".figma-stock").innerText(),
        /NaN|Infinity|R\$ Não informado/,
      );
      await page.getByRole("tab", { name: /payout indica/ }).click();
      await expect(page.getByRole("tabpanel")).toContainText("supera o lucro");
      await page.getByRole("tab", { name: /dívida líquida/ }).click();
      await expect(page.getByRole("tabpanel")).toContainText(
        "não comprova caixa líquido",
      );
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        nodes: [...document.querySelectorAll(".figma-stock *")]
          .filter((node) => node.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 16)
          .map((node) => ({
            tag: node.tagName,
            cls: node.className,
            text: node.textContent.slice(0, 45),
            right: node.getBoundingClientRect().right,
          })),
      }));
      if (overflow.document > overflow.viewport + 1)
        console.log(JSON.stringify(overflow));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      for (const key of new Set(Object.values(groups).flat()))
        probe.dividendAnalysis[key] = null;
      await page.reload();
      await exactFields(probe);
      await publicationCharts(probe);
      await expect(page.locator(".figma-stock .recharts-wrapper")).toHaveCount(
        0,
      );
      await page.unroute(matches);
    },
  );
  await run("Público3×3 e Instrument Sans global preservados", async () => {
    await page.goto(origin);
    await expect(
      page.locator("#public-ranking-results .ph-ranking-company"),
    ).toHaveCount(3);
    await expect(
      page.locator("#public-ranking-results .ph-ranking-company dt"),
    ).toHaveCount(9);
    assert.match(
      await page
        .locator("body")
        .evaluate((node) => getComputedStyle(node).fontFamily),
      /Instrument Sans/,
    );
    await expect(page.locator(".figma-stock")).toHaveCount(0);
  });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        passed,
        errors,
        fonts,
        limits: [
          "Local read-only fixtures; no database, production, screen reader, other browser or global WCAG certification.",
        ],
      },
      null,
      2,
    ),
  );
  await browser?.close();
}
