import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
  rankingColumns,
} from "../dividend-analysis.mjs";
import {
  dividendComparison,
  dividendNumber,
  dividendAnnouncementMonths,
} from "../dividend-insights.mjs";
import {
  formatSafetyMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";
import {
  fixtureNow,
  fullQuote,
  marketFixture,
  rankingMarket,
  staleQuote,
  summaryQuote,
  unavailableQuote,
} from "./market-fixture.mjs";

// UI contract test; workbook audit stays outside the browser bundle. No SQL or publication.
const realWorkbook = Boolean(process.env.EDIV_WORKBOOK_AUDIT);
// The five examples of the broker: ceiling 10 and these market prices.
const brokerPrices = {
  SYN10: "5",
  SYN11: "8",
  SYN12: "10",
  SYN13: "12",
  SYN14: "4",
};
const workbook = realWorkbook
  ? JSON.parse(await readFile(process.env.EDIV_WORKBOOK_AUDIT, "utf8"))
  : {
      sheets: [
        {
          data: [
            [],
            ...Array.from({ length: 90 }, (_, index) => {
              const identity =
                index === 0
                  ? ["Tim", "TIMS3", "Telecomunicações"]
                  : index === 1
                    ? ["Allos", "ALOS3", "Shoppings"]
                    : ["Empresa sintética " + index, "SYN" + index, "Teste"];
              const values = {
                companyName: identity[0],
                ticker: identity[1],
                sector: identity[2],
                totalShares:
                  index === 2
                    ? "104995666.67"
                    : index === 3
                      ? "302241103.80000001"
                      : "1000",
                marketValue: "46038142480.980003",
                estimatedNetIncome: "0",
                projectedPE: "8.6999999999999993",
                averagePE10Years: "16.3",
                peDeviation: "-0.467",
                earningsCagr5Years: "0.185",
                netDebtToEbitda: index === 2 ? null : "0",
                estimatedEps: "2.23",
                expectedPayout: index === 1 ? "1.06" : "1",
                projectedGrossDividendPerShare: "2.23",
                estimatedGrossDividendYield: "0.115",
                referencePrice: "19.37",
                // SYN10..SYN14: the broker's ceiling; SYN16: no valid ceiling.
                ceilingPrice:
                  identity[1] in brokerPrices
                    ? "10"
                    : index === 16
                      ? null
                      : "32.74",
                safetyMargin: String(index / 100),
                announcementFrequency: "Mensal",
                announcementMonths: "jan-dez",
                updatedOn: "2026-10-20",
              };
              return dividendColumns.map((column) => ({
                value: values[column.key],
              }));
            }),
          ],
        },
      ],
    };
const entries = workbook.sheets[0].data.slice(1).map((row, index) => {
  const values = row.map(({ value }) => value);
  const dividendAnalysis = Object.fromEntries(
    dividendColumns
      .slice(3)
      .map((column, metric) => [
        column.key,
        values[metric + 3] == null
          ? null
          : column.format === "date"
            ? String(values[metric + 3]).slice(0, 10)
            : String(values[metric + 3]),
      ]),
  );
  return {
    rank: index + 1,
    companyName: values[0],
    ticker: values[1],
    sector: values[2],
    dividendAnalysis,
    expectedReturnPercent: null,
    targetPrice: null,
    horizonMonths: null,
    thesis: null,
    risks: null,
  };
});
assert.equal(entries.length, 90);
const output =
  process.env.EDIV_DIVIDEND_OUTPUT || ".test-artifacts/dividend-browser";
await mkdir(output, { recursive: true });
const origin = "http://127.0.0.1:4198";
const publication = {
  id: "2",
  title: "Lista de Ações analisadas",
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  entries,
  sourceFileName: "Lista de Ações analisadas.xlsx",
  updatedAt: "2026-10-22T12:32:01Z",
  canManage: true,
  totalEntries: 90,
  history: [
    {
      id: "1",
      title: "Versão anterior de teste",
      createdAt: "2026-10-19T12:00:00Z",
    },
  ],
};
const user = {
  id: "dividend-ui-test",
  name: "Teste",
  role: "ADMIN",
  email: "teste@example.test",
  emailVerified: true,
  permissions: ["rankings:write"],
  createdAt: "2026-01-01T00:00:00Z",
};
const results = [],
  errors = [],
  unknown = [],
  requests = [];
let browser;
let probeEntry = null;
// Market answers are mocked: TIMS3 has the list quote (and a v2 session),
// ALOS3 is unavailable (research basis), SYN10..SYN14 are the broker's
// examples, SYN15 is the last valid quote (stale) and SYN16 has no ceiling.
// SYN2..SYN9 are invalid tickers: the client never asks anything for them.
const market = marketFixture({
  publication,
  quotes: {
    TIMS3: summaryQuote("TIMS3"),
    ALOS3: unavailableQuote("ALOS3"),
    ...Object.fromEntries(
      Object.entries(brokerPrices).map(([ticker, price]) => [
        ticker,
        summaryQuote(ticker, { price, changePercent: "0.5000" }),
      ]),
    ),
    SYN15: staleQuote("SYN15", { price: "18.00000000" }),
    SYN16: summaryQuote("SYN16"),
  },
  details: { TIMS3: fullQuote("TIMS3") },
});
const rankingCalls = () =>
  market.calls.filter((call) => call.startsWith("/api/rankings/market"));
// Margin the server sends for a ticker, as the screen must show it.
const shownMargin = (ticker) =>
  formatSafetyMarginPercent(
    rankingMarket(publication, market.quotes).entries.find(
      (entry) => entry.ticker === ticker,
    ).safetyMargin.percent,
  );
const money = (value) =>
  "R$ " +
  Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const spaces = (text) => text.replace(/\s/g, " ");
// Held /api/rankings/market answers, to see the screen before they arrive.
let holdMarket = false;
const heldMarket = [];
const server = await createServer({
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
});
async function assertPublicationCharts(page, entry) {
  // The price chart now comes from /api/rankings/price-series.
  const groups = {
    dividends: ["projectedGrossDividendPerShare", "estimatedEps"],
    earnings: [
      "estimatedNetIncome",
      "estimatedEps",
      "projectedGrossDividendPerShare",
      "expectedPayout",
    ],
    cagr: ["earningsCagr5Years"],
    debt: ["netDebtToEbitda"],
    valuation: ["projectedPE", "averagePE10Years", "peDeviation"],
  };
  await expect(
    page.locator(".figma-stock figure.fmk-publication-chart"),
  ).toHaveCount(5);
  for (const [id, keys] of Object.entries(groups)) {
    const figure = page.locator(
      `figure.fmk-publication-chart[data-publication-chart="${id}"]`,
    );
    await expect(figure).toHaveCount(1);
    const hasNumbers = keys.some(
      (key) => dividendNumber(dividendValue(entry, key)) !== null,
    );
    const expected = keys.map((key) => ({
      key,
      value: formatDividendValue(
        dividendValue(entry, key),
        dividendColumns.find((column) => column.key === key).format,
      ),
    }));
    const alternatives = figure.locator("[data-chart-value]");
    await expect(alternatives).toHaveCount(expected.length);
    assert.deepEqual(
      await alternatives.evaluateAll((nodes) =>
        nodes.map((node) => ({
          key: node.dataset.chartValue,
          value: node.dataset.exactValue,
        })),
      ),
      expected,
    );
    for (const { key, value } of expected)
      await expect(figure.locator(`[data-chart-value="${key}"]`)).toContainText(
        value,
      );
    await expect(figure.locator("[data-chart-visual]")).toHaveCount(
      hasNumbers ? 1 : 0,
    );
    if (!hasNumbers) await expect(figure.getByRole("status")).toBeVisible();
  }
}
const run = async (name, work) => {
  await work();
  results.push(name);
  console.log("PASS", name);
};
try {
  await server.listen();
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    reducedMotion: "reduce",
  });
  // Every quote of the fixture was read at 10:48; the page starts at 11:00.
  await context.clock.install({ time: fixtureNow });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data,
      status = 200;
    if (url.pathname === "/api/auth/me") data = { user };
    else if (url.pathname === "/api/auth/availability")
      data = { available: true, challenge: { required: false } };
    else if (url.pathname === "/api/rankings/status")
      data = { published: true };
    else if (url.pathname === "/api/notifications")
      data = { notifications: [], unreadCount: 0 };
    else if (url.pathname.startsWith("/api/rankings/history/")) {
      status = 404;
      data = { error: "Sem histórico nesta fixture de publicação" };
    } else if (url.pathname === "/api/rankings/preview") data = { entries };
    else if (
      url.pathname === "/api/rankings" &&
      route.request().method() === "POST"
    ) {
      requests.push(
        JSON.parse(
          decodeURIComponent(route.request().headers()["x-publication-meta"]),
        ),
      );
      data = { message: "Publicação simulada na fixture" };
    } else if (url.pathname === "/api/rankings")
      data = probeEntry
        ? { ...publication, entries: [probeEntry], totalEntries: 1 }
        : url.searchParams.get("publication") === "1"
          ? // An older version: the market data never applies to it.
            {
              ...publication,
              id: "1",
              updatedAt: "2026-10-19T12:00:00Z",
            }
          : publication;
    else if (url.pathname === "/api/learning")
      data = { lessons: [], glossary: [], completed: [], access: "full" };
    else if (market.handles(url)) {
      if (holdMarket && url.pathname === "/api/rankings/market")
        return heldMarket.push(route);
      ({ status, data } = market.respond(url));
    } else {
      unknown.push(url.pathname);
      status = 503;
      data = { error: "API fora da fixture" };
    }
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const table = page
    .getByRole("region", { name: "Ranking de Ações por empresa" })
    .locator("table");
  const rowOf = (ticker) =>
    table.locator("tbody tr", {
      has: page.locator('td[data-column="ticker"]', {
        hasText: new RegExp(`^${ticker}$`),
      }),
    });
  const cell = (row, column) =>
    row.locator(`td[data-column="${column}"] [data-market-cell]`);
  const value = (row, column) =>
    cell(row, column).locator("[data-market-value]");
  const sub = (row, column) => cell(row, column).locator(".market-cell-sub");
  await page.goto(origin + "/app/ranking");
  await page.waitForLoadState("networkidle");
  await run(
    "Ranking: 10→20→90/fim com foco e contagem, 7 colunas e ordem exata",
    async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Ranking de Ações",
      );
      assert.deepEqual(
        await table
          .locator("thead th")
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.column)),
        rankingColumns.map((column) => column.key),
      );
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      for (const column of rankingColumns) {
        const header = table.locator(
          '[data-column="' + column.key + '"] button',
        );
        await header.focus();
        await expect(page.getByRole("tooltip")).toContainText(column.label);
        if (column.key === "safetyMargin")
          await expect(page.getByRole("tooltip")).toContainText(
            "(preço-teto − cotação de mercado) ÷ preço-teto",
          );
        if (column.key === "referencePrice")
          await expect(page.getByRole("tooltip")).toContainText(
            "da brapi.dev",
          );
        await header.press("Escape");
      }
      await expect(table.locator("tbody tr")).toHaveCount(10);
      await expect(page.locator("#ranking-count")).toContainText(
        "10 exibidas de 90 filtradas · 90 ações no total",
      );
      await page
        .getByRole("button", { name: "Ver mais ações", exact: true })
        .click();
      await expect(table.locator("tbody tr")).toHaveCount(20);
      await expect(
        table.locator("tbody tr").nth(10).getByRole("link"),
      ).toBeFocused();
      for (let count = 30; count <= 90; count += 10) {
        await page
          .getByRole("button", { name: "Ver mais ações", exact: true })
          .click();
        await expect(table.locator("tbody tr")).toHaveCount(count);
      }
      await expect(
        page.getByRole("button", { name: "Ver mais ações", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("#ranking-count")).toContainText(
        "90 exibidas de 90 filtradas",
      );
      const marketColumns = ["referencePrice", "safetyMargin"];
      for (let index = 0; index < entries.length; index++) {
        const row = table.locator("tbody tr").nth(index);
        const cells = await row
          .locator("th,td")
          .evaluateAll((nodes) => nodes.map((node) => node.textContent));
        const expected = rankingColumns.map((column) =>
          formatDividendValue(
            dividendValue(entries[index], column.key),
            column.format,
          ),
        );
        assert.equal(
          await row
            .locator(".dividend-company-link > span")
            .last()
            .evaluate((element) => element.firstChild.textContent),
          expected[0],
        );
        // Every research column is exactly the spreadsheet's.
        rankingColumns.forEach((column, position) => {
          if (position && !marketColumns.includes(column.key))
            assert.equal(cells[position], expected[position], column.key);
        });
        // The margin on screen is the one the server computed, two decimals.
        await expect(value(row, "safetyMargin")).toHaveText(
          shownMargin(entries[index].ticker),
        );
      }
      // Canonical quote, change below in the subtle color, source in title.
      const tim = rowOf("TIMS3");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "market",
      );
      await expect(value(tim, "referencePrice")).toHaveText("R$ 19,62");
      await expect(sub(tim, "referencePrice")).toHaveText("−0,91%");
      await expect(
        sub(tim, "referencePrice").locator(".live-quote-down"),
      ).toHaveText("−0,91%");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "title",
        "Cotação brapi.dev.",
      );
      await expect(cell(tim, "referencePrice").locator(".sr-only")).toHaveText(
        "Cotação brapi.dev.",
      );
      assert.equal(
        safetyMarginPercent("32.74", "19.62000000"),
        "40.07",
        "cross-check of the shared formula",
      );
      await expect(value(tim, "safetyMargin")).toHaveText("40,07%");
      await expect(cell(tim, "safetyMargin")).toHaveAttribute(
        "title",
        "Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto = (R$ 32,74 − R$ 19,62) ÷ R$ 32,74 = 40,07%. Preço-teto da pesquisa; cotação brapi.dev.",
      );
      // No valid quote: the research price and margin, with the research day.
      const allos = rowOf("ALOS3");
      await expect(cell(allos, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "research",
      );
      await expect(value(allos, "referencePrice")).toHaveText("R$ 19,37");
      await expect(sub(allos, "referencePrice")).toHaveText(
        "da pesquisa",
      );
      await expect(value(allos, "safetyMargin")).toHaveText("1,00%");
      await expect(sub(allos, "safetyMargin")).toHaveText(
        "da pesquisa",
      );
      // Last valid quote after a failed refresh on the server: "defasada".
      const stale = rowOf("SYN15");
      await expect(cell(stale, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "stale",
      );
      await expect(value(stale, "referencePrice")).toHaveText("R$ 18,00");
      await expect(sub(stale, "referencePrice")).toHaveText(
        "defasada · −0,91%",
      );
      await expect(value(stale, "safetyMargin")).toHaveText(
        formatSafetyMarginPercent(safetyMarginPercent("32.74", "18")),
      );
      await expect(sub(stale, "safetyMargin")).toHaveText("defasada");
      await expect(cell(stale, "safetyMargin")).toHaveAttribute(
        "title",
        /Defasada: a consulta mais recente falhou/,
      );
      // No valid ceiling: the price still shows, the margin is not informed.
      const noCeiling = rowOf("SYN16");
      await expect(value(noCeiling, "referencePrice")).toHaveText("R$ 19,62");
      await expect(value(noCeiling, "safetyMargin")).toHaveText(
        "Não informado",
      );
      await expect(cell(noCeiling, "safetyMargin")).toHaveAttribute(
        "data-market-state",
        "unavailable",
      );
      await expect(cell(noCeiling, "safetyMargin")).toHaveAttribute(
        "title",
        /não informa um preço-teto válido/,
      );
      // The "agora" line of PR #44 is gone.
      await expect(table.locator("[data-live-quote]")).toHaveCount(0);
      assert.doesNotMatch(await table.textContent(), /agora R\$/);
      // One market request for the whole publication, even after "Ver mais".
      assert.equal(rankingCalls().length, 1);
      assert.ok(
        market.calls.every((call) => !call.startsWith("/api/market/quotes")),
      );
      // Every row the same height; the two lines fit in their columns.
      const heights = await table
        .locator("tbody tr")
        .evaluateAll((rows) =>
          rows.map((row) => row.getBoundingClientRect().height),
        );
      assert.equal(new Set(heights).size, 1, JSON.stringify(heights));
      for (const column of marketColumns) {
        const fits = await table
          .locator(`td[data-column="${column}"]`)
          .evaluateAll((cells) =>
            cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1),
          );
        assert.ok(fits, "Os valores de mercado cabem na coluna " + column);
      }
      const hint = page.locator(".dividend-table-hint");
      assert.doesNotMatch(await hint.textContent(), /\b\d{2}\/\d{2}\/\d{4}\b/);
      await expect(hint).toContainText(
        "Preço de mercado: cotação da brapi.dev.",
      );
      await expect(hint).toContainText(
        "Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto, recalculada a cada cotação",
      );
      await expect(hint).toContainText(
        "O preço-teto vem da publicação e só muda com uma nova análise.",
      );
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
    },
  );
  await run(
    "Os cinco exemplos do corretor: teto 10 e cotações 5, 8, 10, 12 e 4",
    async () => {
      await page.getByLabel("Buscar empresa ou ticker").fill("SYN1");
      const expected = [
        ["SYN10", "R$ 5,00", "50,00%"],
        ["SYN11", "R$ 8,00", "20,00%"],
        ["SYN12", "R$ 10,00", "0,00%"],
        ["SYN13", "R$ 12,00", "−20,00%"],
        ["SYN14", "R$ 4,00", "60,00%"],
      ];
      for (const [ticker, price, margin] of expected) {
        // Cross-check of the shared module before reading the screen.
        assert.equal(
          formatSafetyMarginPercent(
            safetyMarginPercent("10", brokerPrices[ticker]),
          ),
          margin,
        );
        const row = rowOf(ticker);
        await expect(row.locator('td[data-column="ceilingPrice"]')).toHaveText(
          /R\$\s10,00/,
        );
        await expect(value(row, "referencePrice")).toHaveText(price);
        await expect(value(row, "safetyMargin")).toHaveText(margin);
        await expect(cell(row, "safetyMargin")).toHaveAttribute(
          "title",
          `Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto = (R$ 10,00 − ${price}) ÷ R$ 10,00 = ${margin}. Preço-teto da pesquisa; cotação brapi.dev.`,
        );
      }
      await page.screenshot({ path: output + "/broker-examples.png" });
      await page.getByLabel("Buscar empresa ou ticker").fill("");
    },
  );
  await run(
    "Filtros: busca, setor e margem exibida; URL antiga não aplica prazo/potencial",
    async () => {
      await page.goto(origin + "/app/ranking?prazo=6&ordem=potential");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await expect(page.getByLabel("Ordenar ranking")).toHaveValue("rank");
      await page.getByLabel("Buscar empresa ou ticker").fill("TIMS3");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(1);
      await page.getByLabel("Buscar empresa ou ticker").fill("");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      const sector = entries[0].sector;
      await page.getByLabel("Filtrar setor").selectOption(sector);
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(
        Math.min(10, entries.filter((entry) => entry.sector === sector).length),
      );
      await page.getByLabel("Filtrar setor").selectOption("");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await page
        .getByRole("button", { name: "Ver mais ações", exact: true })
        .click();
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(20);
      // "Maior margem" orders by the margin on screen, dynamic or research.
      await page.getByLabel("Ordenar ranking").selectOption("safety");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      const percent = new Map(
        rankingMarket(publication, market.quotes).entries.map((entry) => [
          entry.ticker,
          entry.safetyMargin.percent === null
            ? -Infinity
            : Number(entry.safetyMargin.percent),
        ]),
      );
      const expected = [...entries].sort(
        (a, b) =>
          percent.get(b.ticker) - percent.get(a.ticker) || a.rank - b.rank,
      );
      assert.deepEqual(
        await page
          .locator('.dividend-table tbody td[data-column="ticker"]')
          .allTextContents(),
        expected.slice(0, 10).map((entry) => entry.ticker),
      );
      await page.getByLabel("Ordenar ranking").selectOption("rank");
      await expect(
        page.locator(".dividend-table tbody tr").first().locator("td").first(),
      ).toHaveText(entries[0].ticker);
      await page
        .getByRole("button", { name: "Ver mais ações", exact: true })
        .click();
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(20);
      // An older version shows its own research price and margin.
      await page.getByLabel("Histórico de publicações").selectOption("1");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      const first = page.locator(".dividend-table tbody tr").first();
      await expect(cell(first, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "research",
      );
      await expect(value(first, "referencePrice")).toHaveText("R$ 19,37");
      await expect(value(first, "safetyMargin")).toHaveText("0,00%");
      await expect(sub(first, "safetyMargin")).toHaveText(
        "da pesquisa",
      );
      await expect(page.locator(".dividend-table-hint")).toContainText(
        "Nesta versão, preço de mercado e margem de segurança são os da pesquisa",
      );
      await page.getByLabel("Histórico de publicações").selectOption("");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await expect(
        cell(
          page.locator(".dividend-table tbody tr").first(),
          "referencePrice",
        ),
      ).toHaveAttribute("data-market-state", "market");
    },
  );
  await run(
    "Sem salto: células e nota mantêm a altura até a cotação chegar",
    async () => {
      holdMarket = true;
      await page.goto(origin + "/app/ranking?visual=real");
      const tim = rowOf("TIMS3");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "loading",
      );
      await expect(cell(tim, "referencePrice").locator(".sr-only")).toHaveText(
        "Consultando a cotação na brapi.dev.",
      );
      const measure = () =>
        page.evaluate(() => ({
          region: document
            .querySelector(".dividend-table-region")
            .getBoundingClientRect().top,
          rows: [...document.querySelectorAll(".dividend-table tbody tr")].map(
            (row) => row.getBoundingClientRect().height,
          ),
          more: document
            .querySelector('[aria-controls="ranking-results"]')
            ?.getBoundingClientRect().top,
        }));
      const before = await measure();
      holdMarket = false;
      for (const route of heldMarket.splice(0)) {
        const { status, data } = market.respond(new URL(route.request().url()));
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      }
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "market",
      );
      assert.deepEqual(await measure(), before);
    },
  );
  await run(
    "Teclado: link abre empresa, foco em h1 e anterior/próxima preservam publicação",
    async () => {
      const link = page.locator(".dividend-company-link").first();
      await link.focus();
      await link.press("Enter");
      await expect(page).toHaveURL(/acao\/TIMS3\?.*publication=2/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        entries[0].companyName,
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      const next = page
        .getByRole("navigation", { name: "Outras pesquisas desta publicação" })
        .getByRole("link", { name: /Próxima pesquisa/ });
      await next.focus();
      await next.press("Enter");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        entries[1].companyName,
      );
      await page.getByRole("link", { name: /Pesquisa anterior/ }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        entries[0].companyName,
      );
    },
  );
  await run(
    "Dashboard: tooltips exatos, âncoras, gráficos/calendário e ausentes/negativos",
    async () => {
      // Isolate keyboard hints from the pointer left over by the previous journey.
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      await assertPublicationCharts(page, entries[0]);
      const tip = page
        .locator(".fmk-stats")
        .getByRole("button", { name: "O que é P/L projetado?", exact: true });
      await tip.focus();
      await expect(page.getByRole("tooltip")).toHaveText(
        "Preço da pesquisa dividido pelo lucro por ação projetado: quantos anos de lucro, no ritmo projetado, o preço representa. Fica como na data da pesquisa.",
      );
      await tip.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(tip).toBeFocused();
      const nav = page.getByRole("navigation", { name: "Seções da análise" });
      await nav.getByRole("link", { name: "Dividendos", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("#dividendos")).toBeFocused();
      const navBounds = await nav.boundingBox();
      const sectionBounds = await page.locator("#dividendos").boundingBox();
      assert.ok(
        navBounds &&
          sectionBounds &&
          sectionBounds.y >= navBounds.y + navBounds.height - 2,
        "Âncora não pode ficar sob a navegação fixa",
      );
      probeEntry = {
        ...entries[0],
        ticker: "EDGE3",
        companyName: "Valores de teste",
        dividendAnalysis: {
          ...entries[0].dividendAnalysis,
          projectedPE: "0",
          averagePE10Years: "-1",
          referencePrice: null,
          ceilingPrice: null,
          safetyMargin: "-1.5",
          expectedPayout: "1.5",
          earningsCagr5Years: "-0.2",
          netDebtToEbitda: "-2",
          announcementFrequency: "Mensal",
          announcementMonths: "Indefinido",
          estimatedGrossDividendYield: "0",
        },
      };
      await page.goto(origin + "/app/ranking/acao/EDGE3?visual=real");
      await expect(page.locator("#entenda")).toContainText(
        "Comparação indisponível sem bases positivas.",
      );
      await expect(
        page.locator("#visao-geral").getByRole("status"),
      ).toContainText("Comparação indisponível");
      // No quote and no research price: the block says so, without numbers.
      const quoteBlock = page.locator("#cotacao [data-market-quote]");
      await expect(quoteBlock).toHaveAttribute(
        "data-market-quote",
        "unavailable",
      );
      await expect(quoteBlock).toContainText("Cotação atual indisponível");
      await expect(quoteBlock).not.toContainText("R$ 0,00");
      await expect(
        page.locator('[data-field="expectedPayout"] [data-exact-value]'),
      ).toHaveText("150,00%");
      await expect(
        page.locator('[data-field="safetyMargin"] [data-exact-value]'),
      ).toHaveText("-150%");
      await expect(
        page.locator('[data-field="netDebtToEbitda"] [data-exact-value]'),
      ).toHaveText("-2");
      await expect(
        page.locator(
          '[data-field="estimatedGrossDividendYield"] [data-exact-value]',
        ),
      ).toHaveText("0,00%");
      await expect(
        page.locator('#dividendos [data-month][data-announced="true"]'),
      ).toHaveCount(0);
      await expect(page.locator("#dividendos")).toContainText(
        "Meses habituais: Indefinido",
      );
      await assertPublicationCharts(page, probeEntry);
      const debt = page.locator('[data-field="netDebtToEbitda"] button');
      await debt.focus();
      await expect(page.getByRole("tooltip")).toContainText(
        "não comprova caixa líquido",
      );
      await debt.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(debt).toBeFocused();
      probeEntry = {
        ...probeEntry,
        dividendAnalysis: Object.fromEntries(
          Object.keys(probeEntry.dividendAnalysis).map((key) => [key, null]),
        ),
      };
      await page.goto(origin + "/app/ranking/acao/EDGE3?visual=real");
      await assertPublicationCharts(page, probeEntry);
      probeEntry = null;
    },
  );
  await run(
    "Detalhe: 20 campos em5categorias por90tickers, valores/fórmulas/calendário exatos",
    async () => {
      for (const entry of entries) {
        await page.goto(
          origin +
            "/app/ranking/acao/" +
            entry.ticker +
            "?visual=real&publication=2",
        );
        await expect(page.locator(".figma-stock [data-field]")).toHaveCount(20);
        const actual = await page
          .locator(".figma-stock [data-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              key: node.dataset.field,
              label:
                node.querySelector("dt")?.textContent ||
                node
                  .querySelector("button")
                  .getAttribute("aria-label")
                  .slice("O que é ".length, -1),
              value:
                node.querySelector("[data-exact-value]").dataset.exactValue,
              visibleValue: node
                .querySelector("[data-exact-value]")
                .textContent.replace(/^[▲▼]\s*/, "")
                .trim(),
            })),
          );
        for (const column of dividendColumns.filter(
          (column) => column.key !== "updatedOn",
        ))
          assert.deepEqual(
            actual.find((item) => item.key === column.key),
            {
              key: column.key,
              label:
                column.key === "referencePrice"
                  ? "Preço da pesquisa"
                  : column.key === "safetyMargin"
                    ? "Margem da pesquisa"
                    : column.label,
              value: formatDividendValue(
                dividendValue(entry, column.key),
                column.format,
              ),
              visibleValue: formatDividendValue(
                dividendValue(entry, column.key),
                column.format,
              ),
            },
          );
        for (const [index, count] of [5, 5, 3, 1, 3].entries()) {
          await expect(
            page
              .locator("#indicadores h3")
              .nth(index)
              .locator("..")
              .locator("[data-field]"),
          ).toHaveCount(count);
        }
        await expect(
          page
            .getByRole("navigation", { name: "Seções da análise" })
            .getByRole("link"),
        ).toHaveCount(7);
        await expect(page.locator("#dividendos [data-month]")).toHaveCount(12);
        assert.deepEqual(
          await page
            .locator('#dividendos [data-month][data-announced="true"]')
            .evaluateAll((nodes) =>
              nodes.map((node) => Number(node.dataset.month)),
            ),
          dividendAnnouncementMonths(
            entry.dividendAnalysis.announcementMonths,
          ) || [],
        );
        const computed = dividendComparison(
          entry.dividendAnalysis.projectedPE,
          entry.dividendAnalysis.averagePE10Years,
        );
        const difference =
          computed === null
            ? null
            : (computed > 0 ? "+" : "") +
              (computed * 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }) +
              "%";
        const peColumn = dividendColumns.find(
          ({ key }) => key === "projectedPE",
        );
        const averageColumn = dividendColumns.find(
          ({ key }) => key === "averagePE10Years",
        );
        await expect(
          page.locator("#entenda").getByRole("tabpanel"),
        ).toContainText(
          computed === null
            ? "Comparação indisponível sem bases positivas."
            : `P/L projetado ${formatDividendValue(entry.dividendAnalysis.projectedPE, peColumn.format)}, média ${formatDividendValue(entry.dividendAnalysis.averagePE10Years, averageColumn.format)}: diferença relativa ${difference}.`,
        );
        // The dynamic margin in the header is the server's, as in the ranking.
        await expect(
          page.locator(
            '.figma-stock header [data-summary="Margem de segurança"] [data-summary-value]',
          ),
        ).toHaveText(shownMargin(entry.ticker));
        await expect(page.locator(".research-insight")).toHaveCount(0);
        assert.equal(
          await page
            .getByRole("heading", { name: /tese|balanço|DRE|fluxo|riscos/i })
            .count(),
          0,
        );
      }
    },
  );
  await run(
    "Empresa: cotação canônica, pregão, teto da pesquisa, margem dinâmica e referência",
    async () => {
      await page.goto(
        origin + "/app/ranking/acao/TIMS3?visual=real&publication=2",
      );
      const header = page.locator(".figma-stock header");
      const stat = (label) => header.locator(`[data-summary="${label}"]`);
      await expect(stat("Preço de mercado")).toHaveAttribute(
        "data-market-state",
        "market",
      );
      await expect(
        stat("Preço de mercado").locator("[data-summary-value]"),
      ).toHaveText("R$ 19,62");
      await expect(
        stat("Preço de mercado").locator("[data-summary-sub]"),
      ).toHaveText("brapi.dev");
      await expect(
        stat("Margem de segurança").locator("[data-summary-value]"),
      ).toHaveText("40,07%");
      await expect(
        stat("Margem de segurança").locator("[data-summary-sub]"),
      ).toHaveText("com a cotação de mercado");
      await expect(
        stat("Margem de segurança").locator("[data-summary-value]"),
      ).toHaveAttribute(
        "title",
        /= \(R\$ 32,74 − R\$ 19,62\) ÷ R\$ 32,74 = 40,07%/,
      );
      for (const label of ["DY bruto estimado", "P/L projetado"])
        await expect(stat(label).locator("[data-summary-sub]")).toHaveText(
          "na data da pesquisa",
        );
      await expect(stat("Preço-teto")).toContainText("32,74");
      await expect(stat("Preço-teto").locator("[data-summary-sub]")).toHaveText(
        "da pesquisa",
      );
      const block = page.locator("#cotacao [data-market-quote]");
      await expect(block).toHaveAttribute("data-market-quote", "market");
      await expect(block.getByRole("heading")).toHaveText("Cotação atual");
      await expect(block.locator("[data-market-quote-price]")).toHaveText(
        "R$ 19,62",
      );
      // R$ change from the v2 session, only because its price is the same.
      await expect(block.locator("[data-market-quote-change]")).toContainText(
        "−R$ 0,18 · −0,91%",
      );
      await expect(block.locator("[data-market-session-time]")).toHaveText(
        "Dados do pregão",
      );
      assert.deepEqual(
        await block
          .locator("[data-market-session-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => [
              node.dataset.marketSessionField,
              node.querySelector("dt").textContent,
              node.querySelector("dd").textContent,
            ]),
          ),
        [
          ["open", "Abertura", "R$ 19,70"],
          ["dayHigh", "Máxima do dia", "R$ 19,95"],
          ["dayLow", "Mínima do dia", "R$ 19,50"],
          ["previousClose", "Fechamento anterior", "R$ 19,80"],
        ],
      );
      await expect(block.locator("[data-market-source]")).toHaveText(
        "brapi.dev",
      );
      await expect(
        block.locator('[data-market-quote-field="ceiling"]'),
      ).toContainText("R$ 32,74");
      await expect(
        block.locator('[data-market-quote-field="ceiling"]'),
      ).toContainText("da pesquisa");
      await expect(
        block.locator('[data-market-quote-field="margin"] dd').first(),
      ).toHaveText("40,07%");
      await expect(
        block.locator('[data-market-quote-field="volume"] dd'),
      ).toHaveText("367.700");
      await expect(block.locator("[data-market-reference]")).toHaveCount(0);
      // The 20 research fields keep the spreadsheet values.
      await expect(
        page.locator('[data-field="referencePrice"] [data-exact-value]'),
      ).toHaveText(
        formatDividendValue(
          entries[0].dividendAnalysis.referencePrice,
          "currency",
        ),
      );
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
      // No valid quote: research price with its day; stale: last valid one.
      await page.goto(
        origin + "/app/ranking/acao/ALOS3?visual=real&publication=2",
      );
      await expect(block).toHaveAttribute("data-market-quote", "research");
      await expect(block.locator("[data-market-quote-price]")).toHaveText(
        "R$ 19,37",
      );
      await expect(block).toContainText("da pesquisa");
      await expect(block.locator("[data-market-quote-research]")).toBeVisible();
      await expect(block.locator("[data-market-session-field]")).toHaveCount(0);
      await expect(
        stat("Margem de segurança").locator("[data-summary-sub]"),
      ).toHaveText("da pesquisa");
      await page.goto(
        origin + "/app/ranking/acao/SYN15?visual=real&publication=2",
      );
      await expect(block).toHaveAttribute("data-market-quote", "stale");
      await expect(block.locator("[data-market-quote-stale]")).toBeVisible();
      await expect(
        stat("Preço de mercado").locator("[data-summary-sub]"),
      ).toHaveText("defasada");
      // Invalid tickers never reach the API.
      await page.goto(
        origin + "/app/ranking/acao/SYN2?visual=real&publication=2",
      );
      await expect(block).toHaveAttribute("data-market-quote", "research");
      // The page draws no price chart, whatever the ticker.
      await expect(page.locator("[data-price-chart]")).toHaveCount(0);
      assert.ok(market.calls.every((call) => !/SYN\d(?!\d)/.test(call)));
    },
  );
  await run(
    "Comparação: indicadores rotulados, sem comparação de versões nem origem do arquivo",
    async () => {
      await page.goto(origin + "/app/ranking?visual=real");
      await page.getByText("Comparar duas empresas", { exact: true }).click();
      await page.getByLabel("Primeira empresa").selectOption(entries[0].ticker);
      await page.getByLabel("Segunda empresa").selectOption(entries[1].ticker);
      const comparison = page.locator("details").filter({
        has: page.locator("summary", { hasText: "Comparar duas empresas" }),
      });
      await expect(comparison.locator("dt")).toHaveCount(20);
      await expect(comparison).toContainText("106,00%");
      await expect(
        page.getByText("O que mudou na pesquisa?", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText(/^Origem:/)).toHaveCount(0);
      assert.ok(
        !(await page.locator("body").textContent()).includes("[object Object]"),
      );
      // The team's annual series: a labelled row, year by year, and
      // "Não informado" for the company without it.
      entries[0].annualHistory = {
        netIncome: [{ year: 2024, value: "2345678900.00" }],
        payout: [{ year: 2023, value: "0.452000" }],
      };
      try {
        await page.reload();
        await page.getByText("Comparar duas empresas", { exact: true }).click();
        await page
          .getByLabel("Primeira empresa")
          .selectOption(entries[0].ticker);
        await page
          .getByLabel("Segunda empresa")
          .selectOption(entries[1].ticker);
        const annual = comparison
          .locator("dl > div")
          .filter({ has: page.getByText("Histórico anual", { exact: true }) });
        await expect(annual).toHaveCount(1);
        const [first, second] = [0, 1].map((index) =>
          annual.locator("[data-annual-history]").nth(index),
        );
        await expect(first.locator("li")).toHaveText([
          "2024 → R$ 2.345.678.900,00",
          "2023 → 45,2%",
        ]);
        await expect(second.locator("dd")).toHaveText([
          "Não informado",
          "Não informado",
        ]);
        assert.ok(
          !(await page.locator("body").textContent()).includes(
            "[object Object]",
          ),
        );
      } finally {
        delete entries[0].annualHistory;
      }
    },
  );
  await run(
    "Prévia/publicação simulada: 90 ativos e 20 campos, sem exigência legada/autoria",
    async () => {
      await page.goto(origin + "/app/ranking?visual=real#publicar-pesquisa");
      await page
        .getByLabel("Planilha CSV ou Excel", { exact: true })
        .setInputFiles({
          name: "Lista de Ações analisadas.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: Buffer.from("UI fixture only; API preview is mocked"),
        });
      await page
        .getByRole("button", { name: "Validar e ver prévia", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Prévia · 90 ações", exact: true }),
      ).toBeVisible();
      const review = page.getByRole("region", {
        name: "Revisão do conteúdo a publicar",
      });
      await expect(review).toContainText(
        "90 empresas com análise de dividendos",
      );
      await expect(review).not.toContainText("Tese e premissas");
      const preview = page.getByRole("region", {
        name: "Prévia completa de dividendos",
      });
      await expect(preview.locator("thead th")).toHaveCount(20);
      await expect(preview.locator("tbody tr")).toHaveCount(90);
      // The preview is the spreadsheet: no market cells.
      await expect(preview.locator("[data-market-cell]")).toHaveCount(0);
      await page
        .getByRole("button", {
          name: "Confirmar e publicar esta versão",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Publicação simulada" }),
      ).toBeVisible();
      assert.equal(requests.length, 1);
      assert.equal(requests[0].authorName, "");
    },
  );
  await run(
    "320px/temas: rolagem contida da tabela por teclado e detalhe legível",
    async () => {
      await page.setViewportSize({ width: 320, height: 900 });
      for (const theme of ["dark", "light"]) {
        await page.goto(origin + "/app/ranking?visual=real");
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const region = page.getByRole("region", {
          name: "Ranking de Ações por empresa",
        });
        await expect(region.locator("tbody tr")).toHaveCount(10);
        await expect(cell(rowOf("TIMS3"), "referencePrice")).toHaveAttribute(
          "data-market-state",
          "market",
        );
        await region.focus();
        await page.keyboard.press("ArrowRight");
        await expect
          .poll(() => region.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: output + "/ranking-320-" + theme + ".png",
          fullPage: true,
        });
        await page.goto(
          origin + "/app/ranking/acao/TIMS3?visual=real&publication=2",
        );
        await expect(page.locator(".figma-stock [data-field]")).toHaveCount(20);
        await expect(
          page.locator("#cotacao [data-market-quote]"),
        ).toHaveAttribute("data-market-quote", "market");
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: output + "/company-320-" + theme + ".png",
          fullPage: true,
        });
        await page.locator("#cotacao").screenshot({
          path: output + "/company-quote-320-" + theme + ".png",
        });
      }
    },
  );
  await run(
    "Destaques /app: preço e margem do mercado, iguais ao ranking",
    async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(origin + "/app");
      const highlights = page
        .getByRole("heading", { name: "Publicação mais recente", exact: true })
        .locator("..")
        .locator("..")
        .locator("..");
      await expect(
        highlights.getByText("Margem de segurança", { exact: true }),
      ).toHaveCount(3);
      await expect(highlights).not.toContainText("Potencial informado");
      await expect(highlights).not.toContainText("Prazo não informado");
      await expect(highlights).toContainText("Pesquisa de dividendos");
      await expect(highlights).not.toContainText("Referência:");
      const tim = highlights.locator('a[href*="/app/ranking/acao/TIMS3"]');
      await expect(
        tim.locator('[data-kpi="Preço de mercado"] dd').first(),
      ).toHaveText("R$ 19,62");
      await expect(
        tim.locator('[data-kpi="Margem de segurança"] dd').first(),
      ).toHaveText("40,07%");
      await expect(
        highlights
          .locator('a[href*="/app/ranking/acao/ALOS3"]')
          .locator('[data-kpi="Margem de segurança"]'),
      ).toContainText("da pesquisa");
    },
  );
  await run(
    "Legado/demo: módulos e cenário permanecem disponíveis",
    async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      const marketRequests = rankingCalls().length;
      await page.goto(origin + "/app/ranking?visual=demo");
      await expect(page.locator(".research-modules-table")).toBeVisible();
      // Fictitious companies get no quote.
      assert.equal(rankingCalls().length, marketRequests);
      await expect(page.locator(".dividend-table")).toHaveCount(0);
      await page.locator(".research-table-company-link").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Horizonte",
      );
      await expect(page.locator(".figma-stock")).toHaveCount(0);
      await expect(
        page.getByText("Potencial simulado", { exact: true }).first(),
      ).toBeVisible();
      assert.equal(rankingCalls().length, marketRequests);
    },
  );
  const setHidden = (hidden) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => hidden,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await run(
    "Cotações: pausa com aba oculta, retoma ao voltar e mantém números defasados na falha",
    async () => {
      await page.goto(origin + "/app/ranking?visual=real");
      const tim = rowOf("TIMS3");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "market",
      );
      const before = rankingCalls().length;
      await setHidden(true);
      await page.clock.fastForward("16:00");
      assert.equal(
        rankingCalls().length,
        before,
        "Sem consulta com a aba oculta",
      );
      market.failRanking = true;
      await setHidden(false);
      await expect.poll(() => rankingCalls().length).toBe(before + 1);
      // The failed refresh keeps the last numbers, marked as stale.
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "stale",
      );
      await expect(value(tim, "referencePrice")).toHaveText("R$ 19,62");
      await expect(sub(tim, "referencePrice")).toHaveText("defasada · −0,91%");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "title",
        /Defasada/,
      );
      await expect(value(tim, "safetyMargin")).toHaveText("40,07%");
      await expect(sub(tim, "safetyMargin")).toHaveText("defasada");
      await expect(page.locator(".dividend-table-hint")).toContainText(
        "última cotação válida da brapi.dev",
      );
      market.failRanking = false;
      await page.clock.fastForward("02:10");
      await expect.poll(() => rankingCalls().length).toBe(before + 2);
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "data-market-state",
        "market",
      );
      await expect(sub(tim, "safetyMargin")).toHaveText("");
    },
  );
  await run(
    "Teste C: nova cotação muda preço e margem sem recarregar, iguais no ranking e na empresa",
    async () => {
      await page.goto(origin + "/app/ranking?visual=real");
      const tim = rowOf("TIMS3");
      await expect(value(tim, "referencePrice")).toHaveText("R$ 19,62");
      await expect(value(tim, "safetyMargin")).toHaveText("40,07%");
      const before = rankingCalls().length;
      const quote = (price, changePercent, checkedAt) => {
        market.quotes.TIMS3 = summaryQuote("TIMS3", {
          price,
          changePercent,
          checkedAt,
        });
        // The v2 session keeps its previous close of R$ 19,80.
        market.details.TIMS3 = fullQuote("TIMS3", {
          price,
          change: (Number(price) - 19.8).toFixed(8),
          changePercent,
          checkedAt,
        });
        market.checkedAt = checkedAt;
      };
      const sameScreen = async (price, margin) => {
        const header = page.locator(".figma-stock header");
        await expect(
          header.locator(
            '[data-summary="Preço de mercado"] [data-summary-value]',
          ),
        ).toHaveText(price);
        await expect(
          header.locator(
            '[data-summary="Margem de segurança"] [data-summary-value]',
          ),
        ).toHaveText(margin);
        const block = page.locator("#cotacao [data-market-quote]");
        await expect(block.locator("[data-market-quote-price]")).toHaveText(
          price,
        );
        await expect(
          block.locator('[data-market-quote-field="margin"] dd').first(),
        ).toHaveText(margin);
      };
      // The list of the next cycle: a new price for TIMS3.
      quote("20.10000000", "1.5800", "2026-11-05T14:03:14.389Z");
      const second = formatSafetyMarginPercent(
        safetyMarginPercent("32.74", "20.10000000"),
      );
      assert.equal(second, "38,61%");
      await page.clock.fastForward("15:01");
      await expect.poll(() => rankingCalls().length).toBe(before + 1);
      await expect(value(tim, "referencePrice")).toHaveText("R$ 20,10");
      await expect(value(tim, "safetyMargin")).toHaveText(second);
      await expect(
        sub(tim, "referencePrice").locator(".live-quote-up"),
      ).toHaveText("+1,58%");
      await expect(cell(tim, "referencePrice")).toHaveAttribute(
        "title",
        /Cotação brapi\.dev/,
      );
      // Client-side navigation: the company page reads the same store.
      await tim.locator(".dividend-company-link").click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        entries[0].companyName,
      );
      await sameScreen("R$ 20,10", second);
      assert.equal(rankingCalls().length, before + 1, "Sem nova consulta");
      // A newer quote while the company page is open.
      quote("21.00000000", "2.0000", "2026-11-05T14:18:14.389Z");
      const third = formatSafetyMarginPercent(
        safetyMarginPercent("32.74", "21.00000000"),
      );
      assert.equal(third, "35,86%");
      await page.clock.fastForward("15:01");
      await expect.poll(() => rankingCalls().length).toBe(before + 2);
      await sameScreen("R$ 21,00", third);
      await page.goBack();
      await expect(value(tim, "referencePrice")).toHaveText("R$ 21,00");
      await expect(value(tim, "safetyMargin")).toHaveText(third);
      assert.equal(rankingCalls().length, before + 2);
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(unknown, []);
} finally {
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        fixture:
          (realWorkbook
            ? "90 audited workbook rows"
            : "90 generated synthetic rows with a few golden values") +
          " in mocked local API; no SQL or real publication",
        results,
        errors,
        unknown,
        simulatedPublishes: requests.length,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await server.close();
}
