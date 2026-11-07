import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { dividendColumns } from "../dividend-analysis.mjs";
import {
  formatSafetyMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";
import { normalizeSeries } from "../server/market/brapi-provider.js";
import { buildPriceSeries } from "../server/market/price-series.js";
import { rankingMarketBody } from "../server/market/ranking-market.js";

// Owner's tests B and C in the real interface (docs/MARGEM-E-HISTORICO.md):
// the ceiling stays at R$ 10,00 while the quote moves 5 → 8 → 10 → 12 → 4,
// and the ranking, the company page header, the "Cotação atual" block and the
// chart marker show the same price and margin after every cycle, with no full
// reload. The market answers are built by the server's own code
// (rankingMarketBody, buildPriceSeries); brapi.dev is never reached.

const origin = "http://127.0.0.1:4196";
const output =
  process.env.EDIV_QA_OUTPUT || ".test-artifacts/qa-margem-browser";
await mkdir(output, { recursive: true });
const start = Date.parse("2026-11-05T14:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();
const values = (ticker, companyName, ceilingPrice, referencePrice) => ({
  companyName,
  ticker,
  sector: "Teste",
  totalShares: "1000",
  marketValue: "1000000",
  estimatedNetIncome: "100000",
  projectedPE: "6.5",
  averagePE10Years: "8.1",
  peDeviation: "-0.2",
  earningsCagr5Years: "0.05",
  netDebtToEbitda: "1.1",
  estimatedEps: "1.2",
  expectedPayout: "0.6",
  projectedGrossDividendPerShare: "0.72",
  estimatedGrossDividendYield: "0.08",
  referencePrice,
  ceilingPrice,
  safetyMargin: "0.1",
  announcementFrequency: "4x por ano",
  announcementMonths: "mar jun set dez",
  updatedOn: "2026-10-20",
});
const entries = [
  values("PETR4", "Petrobras de teste", "10.00", "9.00"),
  values("VALE3", "Vale de teste", "70.00", "61.00"),
  values("ITUB4", "Itaú de teste", "45.00", "39.00"),
].map((row, index) => ({
  rank: index + 1,
  companyName: row.companyName,
  ticker: row.ticker,
  sector: row.sector,
  dividendAnalysis: Object.fromEntries(
    dividendColumns.slice(3).map((column) => [column.key, row[column.key]]),
  ),
  expectedReturnPercent: null,
  targetPrice: null,
  horizonMonths: null,
  thesis: null,
  risks: null,
}));
const publication = {
  id: "5",
  title: "Publicação de QA",
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  entries,
  sourceFileName: "qa.xlsx",
  updatedAt: "2026-10-22T12:00:00.000Z",
  canManage: false,
  totalEntries: entries.length,
  history: [],
};
const user = {
  id: "qa-margem",
  name: "QA",
  role: "USER",
  email: "qa@example.test",
  emailVerified: true,
  permissions: [],
  createdAt: "2026-01-01T00:00:00Z",
};
const marketState = (checkedAt) => ({
  state: "open",
  refreshSeconds: 900,
  nextRefreshAt: iso(Date.parse(checkedAt) + 900_000),
});
// The canonical quote object of the server (list price, no session).
const canonical = (symbol, price, checkedAt) => ({
  symbol,
  name: symbol,
  logoUrl: null,
  currency: "BRL",
  price: Number(price).toFixed(8),
  change: null,
  changePercent: "0.5000",
  previousClose: null,
  dayHigh: null,
  dayLow: null,
  volume: "1000",
  quoteTime: null,
  marketTime: null,
  checkedAt,
  freshness: "delayed",
  stale: false,
  unavailable: false,
  detail: "summary",
  delayMinutes: null,
  source: "brapi.dev",
  session: null,
});
const market = {
  checkedAt: "2026-11-05T13:48:00.000Z",
  prices: { PETR4: 5, VALE3: 62.67, ITUB4: 39.97 },
  calls: [],
};
const quotes = () =>
  new Map(
    Object.entries(market.prices).map(([ticker, price]) => [
      ticker,
      canonical(ticker, price, market.checkedAt),
    ]),
  );
// Real PETR4 closes (brapi, 06/11/2026) up to 04/11, read on 05/11 at 10:00.
const petr4 = [
  ["2026-10-28", 52.51, 52.51, 52.51],
  ["2026-10-29", 52.2, 52.2, 52.2],
  ["2026-10-30", 52.71, 52.71, 52.71],
  ["2026-11-03", 50.71, 50.71, 50.71],
  ["2026-11-04", 47.12, 47.12, 47.12],
];
const seriesRows = normalizeSeries(
  {
    results: [
      {
        symbol: "PETR4",
        data: {
          historicalDataPrice: petr4.map(
            ([date, close, adjustedClose, rawClose]) => ({
              date: Date.parse(`${date}T03:00:00Z`) / 1000,
              close,
              adjustedClose,
              rawClose,
            }),
          ),
        },
      },
    ],
  },
  "PETR4",
);
function answer(url) {
  const path = url.pathname;
  if (path === "/api/rankings/market") {
    market.calls.push(path);
    return rankingMarketBody({
      publication,
      quotes: quotes(),
      checkedAt: market.checkedAt,
      market: marketState(market.checkedAt),
    });
  }
  if (path.startsWith("/api/rankings/price-series/")) {
    const ticker = path.split("/").at(-1);
    return buildPriceSeries({
      ticker,
      basis: url.searchParams.get("basis") ?? undefined,
      granularity: url.searchParams.get("granularity") ?? "daily",
      brapi:
        ticker === "PETR4"
          ? {
              points: seriesRows,
              checkedAt: "2026-11-05T13:00:00.000Z",
              freshness: "delayed",
              reason: null,
              range: "max",
              includeRaw: true,
            }
          : {
              points: null,
              checkedAt: null,
              freshness: "unavailable",
              reason: "no_token",
              includeRaw: false,
            },
      quote: quotes().get(ticker) ?? null,
      now: Date.parse(market.checkedAt),
    });
  }
  if (path.startsWith("/api/market/quote/")) {
    const ticker = path.split("/").at(-1);
    return {
      quote: quotes().get(ticker),
      market: marketState(market.checkedAt),
    };
  }
  return undefined;
}

const results = [];
const errors = [];
const unknown = [];
let browser;
const server = await createServer({
  server: { host: "127.0.0.1", port: 4196, strictPort: true },
});
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
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await context.clock.install({ time: start });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = answer(url);
    let status = 200;
    if (data !== undefined);
    else if (url.pathname === "/api/auth/me") data = { user };
    else if (url.pathname === "/api/auth/availability")
      data = { available: true, challenge: { required: false } };
    else if (url.pathname === "/api/rankings/status")
      data = { published: true };
    else if (url.pathname === "/api/notifications")
      data = { notifications: [], unreadCount: 0 };
    else if (url.pathname.startsWith("/api/rankings/history/")) {
      status = 404;
      data = { error: "Sem histórico nesta fixture" };
    } else if (url.pathname === "/api/rankings") data = publication;
    else if (url.pathname === "/api/learning")
      data = { lessons: [], glossary: [], completed: [], access: "full" };
    else {
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
  const documents = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documents.push(request.url());
  });
  const table = page
    .getByRole("region", { name: "Ranking de Ações por empresa" })
    .locator("table");
  const row = table.locator("tbody tr", {
    has: page.locator('td[data-column="ticker"]', { hasText: /^PETR4$/ }),
  });
  const cellValue = (column) =>
    row.locator(
      `td[data-column="${column}"] [data-market-cell] [data-market-value]`,
    );
  const header = (label) =>
    page.locator(
      `.figma-stock header [data-summary="${label}"] [data-summary-value]`,
    );
  const block = page.locator("#cotacao [data-market-quote]");
  const money = (value) =>
    "R$ " +
    Number(value).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const margin = (price) =>
    formatSafetyMarginPercent(safetyMarginPercent("10.00", String(price)));
  const marketCalls = () => market.calls.length;

  await page.goto(origin + "/app/ranking?visual=real");
  await expect(cellValue("referencePrice")).toHaveText("R$ 5,00");
  await page.evaluate(() => {
    window.__qaSameDocument = "kept";
  });
  const sameDocument = async () =>
    assert.equal(
      await page.evaluate(() => window.__qaSameDocument),
      "kept",
      "no full reload",
    );
  const documentsAtStart = documents.length;

  await run(
    "B e C: teto fixo em R$ 10,00, cotação 5 → 8 → 10 → 12 → 4 sem recarregar; ranking, empresa e gráfico iguais",
    async () => {
      const sequence = [5, 8, 10, 12, 4];
      const expected = ["50,00%", "20,00%", "0,00%", "−20,00%", "60,00%"];
      for (let index = 0; index < sequence.length; index++) {
        const price = sequence[index];
        assert.equal(margin(price), expected[index]);
        if (index > 0) {
          // The next cycle of the list: the server answers the new price.
          market.prices.PETR4 = price;
          market.checkedAt = iso(Date.parse(market.checkedAt) + 15 * 60_000);
          const before = marketCalls();
          await page.clock.fastForward("15:01");
          await expect.poll(marketCalls).toBe(before + 1);
        }
        // Ranking.
        await expect(cellValue("referencePrice")).toHaveText(money(price));
        await expect(cellValue("safetyMargin")).toHaveText(expected[index]);
        await expect(row.locator('td[data-column="ceilingPrice"]')).toHaveText(
          "R$ 10,00",
        );
        await sameDocument();
        // The company page through the app's own link: the same store.
        const callsBefore = marketCalls();
        await row.locator(".dividend-company-link").click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Petrobras de teste",
        );
        await expect(header("Preço de mercado")).toHaveText(money(price));
        await expect(header("Margem de segurança")).toHaveText(expected[index]);
        await expect(header("Preço-teto")).toHaveText("R$ 10,00");
        await expect(block.locator("[data-market-quote-price]")).toHaveText(
          money(price),
        );
        await expect(
          block.locator('[data-market-quote-field="margin"] dd').first(),
        ).toHaveText(expected[index]);
        await expect(
          block.locator('[data-market-quote-field="ceiling"] dd').first(),
        ).toHaveText("R$ 10,00");
        // The chart marker is the same market price.
        await expect(page.locator("[data-marker-note]")).toContainText(
          `${money(price)}.`,
        );
        assert.equal(marketCalls(), callsBefore, "the page reuses the store");
        await sameDocument();
        await page.goBack();
        await expect(cellValue("referencePrice")).toHaveText(money(price));
        await expect(cellValue("safetyMargin")).toHaveText(expected[index]);
        await sameDocument();
      }
      assert.equal(documents.length, documentsAtStart, "no document request");
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
    },
  );

  await run(
    "Gráfico: alternância Diário/Mensal e Ajustado/Sem ajuste com o marcador da cotação",
    async () => {
      await row.locator(".dividend-company-link").click();
      const figure = page.locator("figure[data-price-chart]");
      await expect(figure).toHaveAttribute("data-price-chart", "ready");
      await expect(figure).toHaveAttribute("data-basis", "adjusted");
      await figure
        .getByRole("button", { name: "Sem ajuste", exact: true })
        .click();
      await expect(figure).toHaveAttribute("data-basis", "nominal");
      await expect(figure.locator("[data-price-basis]")).toContainText(
        "sem ajuste",
      );
      await figure.getByRole("button", { name: "Mensal", exact: true }).click();
      await expect(figure).toHaveAttribute("data-granularity", "monthly");
      await expect(figure).toHaveAttribute("data-price-chart", "ready");
      await expect(page.locator("[data-marker-note]")).toContainText(
        "R$ 4,00.",
      );
      await figure.getByRole("button", { name: "Diário", exact: true }).click();
      await expect(figure).toHaveAttribute("data-granularity", "daily");
      // Marker joined: the last close (04/11) is the session before the quote's.
      await expect(page.locator("[data-marker-note]")).toHaveAttribute(
        "data-marker-note",
        "connected",
      );
      await sameDocument();
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(unknown, []);
} finally {
  await writeFile(
    output + "/results.json",
    JSON.stringify({ results, errors, unknown }, null, 2),
  );
  await browser?.close();
  await server.close();
}
