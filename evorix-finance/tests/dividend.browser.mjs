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
  fullQuote,
  marketFixture,
  summaryQuote,
  unavailableQuote,
} from "./market-fixture.mjs";

// UI contract test; workbook audit stays outside the browser bundle. No SQL or publication.
const realWorkbook = Boolean(process.env.EDIV_WORKBOOK_AUDIT);
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
                ceilingPrice: "32.74",
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
  updatedAt: null,
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
// brapi.dev quotes are mocked: TIMS3 has one, ALOS3 and the synthetic SYN10+
// tickers are unavailable, and SYN2..SYN9 are invalid, so never requested.
const market = marketFixture({
  quotes: {
    TIMS3: summaryQuote("TIMS3"),
    ALOS3: unavailableQuote("ALOS3"),
  },
  details: { TIMS3: fullQuote("TIMS3") },
});
const validTickers = entries
  .map((entry) => entry.ticker)
  .filter((ticker) => /^[A-Z][A-Z0-9]{3}[0-9]{1,2}F?$/.test(ticker))
  .sort();
if (!realWorkbook) assert.equal(validTickers.length, 82);
const quoteCalls = () =>
  market.calls.filter((call) => call.startsWith("/api/market/quotes"));
const server = await createServer({
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
});
async function assertPublicationCharts(page, entry) {
  const groups = {
    price: ["referencePrice", "ceilingPrice"],
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
  ).toHaveCount(6);
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
        : publication;
    else if (url.pathname === "/api/learning")
      data = { lessons: [], glossary: [], completed: [], access: "full" };
    else if (market.handles(url)) ({ status, data } = market.respond(url));
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
  await page.goto(origin + "/app/ranking");
  await page.waitForLoadState("networkidle");
  await run(
    "Ranking: 10→20→90/fim com foco e contagem, 7 colunas e ordem exata",
    async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Ranking de Ações",
      );
      const table = page
        .getByRole("region", { name: "Ranking de Ações por empresa" })
        .locator("table");
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
      for (let index = 0; index < entries.length; index++) {
        const row = table.locator("tbody tr").nth(index);
        // The brapi.dev line is apart from the research value of the cell.
        const cells = await row.locator("th,td").evaluateAll((nodes) =>
          nodes.map((node) => {
            const copy = node.cloneNode(true);
            copy
              .querySelectorAll("[data-live-quote]")
              .forEach((line) => line.remove());
            return copy.textContent;
          }),
        );
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
        assert.deepEqual(cells.slice(1), expected.slice(1));
      }
      await expect(page.getByLabel("Filtrar horizonte")).toHaveCount(0);
      await expect(page.getByRole("option", { name: /potencial/ })).toHaveCount(
        0,
      );
      assert.doesNotMatch(
        await page.locator(".dividend-table-hint").textContent(),
        /\b\d{2}\/\d{2}\/\d{4}\b/,
      );
      assert.match(await table.textContent(), /19,37/);
      // One quotes request for the whole publication, valid tickers only,
      // even after "Ver mais ações".
      assert.deepEqual(quoteCalls(), [
        "/api/market/quotes?symbols=" +
          encodeURIComponent(validTickers.join(",")),
      ]);
      const timLine = table
        .locator("tbody tr")
        .nth(0)
        .locator('td[data-column="referencePrice"] [data-live-quote]');
      await expect(timLine).toHaveAttribute("data-live-quote", "ready");
      await expect(timLine).toContainText("agora R$ 19,62 · −0,91%");
      await expect(timLine.locator(".live-quote-down")).toHaveText("−0,91%");
      await expect(timLine).toHaveAttribute(
        "title",
        /^Cotação brapi\.dev com atraso, consultada às (05\/11 às )?10:48 \(horário de Brasília\)\.$/,
      );
      await expect(timLine.locator(".sr-only")).toContainText(
        "Cotação brapi.dev com atraso, consultada às",
      );
      await expect(
        table
          .locator("tbody tr")
          .nth(0)
          .locator('td[data-column="referencePrice"] [data-research-value]'),
      ).toHaveText(
        formatDividendValue(
          entries[0].dividendAnalysis.referencePrice,
          "currency",
        ),
      );
      for (const index of [1, 2]) {
        const line = table
          .locator("tbody tr")
          .nth(index)
          .locator('td[data-column="referencePrice"] [data-live-quote]');
        await expect(line).toHaveAttribute("data-live-quote", "unavailable");
        await expect(line).toHaveText("cotação atual indisponível");
      }
      await expect(table.locator('[data-live-quote="ready"]')).toHaveCount(1);
      await expect(
        table.locator('[data-live-quote="unavailable"]'),
      ).toHaveCount(89);
      // The reserved line keeps every row the same height, with or without quote.
      const heights = await table
        .locator("tbody tr")
        .evaluateAll((rows) =>
          rows.map((row) => row.getBoundingClientRect().height),
        );
      assert.equal(new Set(heights).size, 1, JSON.stringify(heights));
      const fits = await table
        .locator('td[data-column="referencePrice"]')
        .evaluateAll((cells) =>
          cells.every((cell) => cell.scrollWidth <= cell.clientWidth + 1),
        );
      assert.ok(fits, "A linha da cotação cabe na coluna");
      await expect(page.locator(".dividend-table-hint")).toContainText(
        "Preço de mercado e margem de segurança são os da pesquisa publicada. A linha “agora” traz a cotação da brapi.dev, com atraso",
      );
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
    },
  );
  await run(
    "Filtros: busca, setor e margem; URL antiga não aplica prazo/potencial",
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
      await page.getByLabel("Ordenar ranking").selectOption("safety");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      const expected = [...entries].sort(
        (a, b) =>
          Number(b.dividendAnalysis.safetyMargin) -
            Number(a.dividendAnalysis.safetyMargin) || a.rank - b.rank,
      );
      await expect(
        page.locator(".dividend-table tbody tr").first().locator("td").first(),
      ).toHaveText(expected[0].ticker);
      await page.getByLabel("Ordenar ranking").selectOption("rank");
      await expect(
        page.locator(".dividend-table tbody tr").first().locator("td").first(),
      ).toHaveText(entries[0].ticker);
      await page
        .getByRole("button", { name: "Ver mais ações", exact: true })
        .click();
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(20);
      await page.getByLabel("Histórico de publicações").selectOption("1");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await page.getByLabel("Histórico de publicações").selectOption("");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
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
        "Preço dividido pelo lucro por ação projetado: quantos anos de lucro, no ritmo projetado, o preço representa.",
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
    "Cotação atual: bloco completo, indisponível sem cotação e preço da pesquisa intacto",
    async () => {
      await page.goto(
        origin + "/app/ranking/acao/TIMS3?visual=real&publication=2",
      );
      const block = page.locator("#cotacao [data-live-quote-block]");
      await expect(block).toHaveAttribute("data-live-quote-block", "ready");
      await expect(block).toHaveAttribute("data-live-quote-detail", "full");
      await expect(block.getByRole("heading")).toHaveText("Cotação atual");
      await expect(block.locator("[data-live-quote-price]")).toHaveText(
        "R$ 19,62",
      );
      await expect(block.locator("[data-live-quote-change]")).toContainText(
        "−R$ 0,18 · −0,91%",
      );
      assert.deepEqual(
        await block
          .locator("[data-live-quote-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => [
              node.dataset.liveQuoteField,
              node.querySelector("dt").textContent,
              node.querySelector("dd").textContent,
            ]),
          ),
        [
          ["previousClose", "Fechamento anterior", "R$ 19,80"],
          ["dayHigh", "Máxima do dia", "R$ 19,95"],
          ["dayLow", "Mínima do dia", "R$ 19,50"],
          ["volume", "Volume", "367.700"],
        ],
      );
      await expect(block.locator("[data-live-quote-source]")).toHaveText(
        /^brapi\.dev · com atraso de até 30 min · cotação de (05\/11 às )?10:30$/,
      );
      await expect(block).toContainText(/Preço da pesquisa: R\$\s19,37/);
      const reference = page.locator(
        '.figma-stock header [data-summary="Cotação de referência"]',
      );
      await expect(reference).toContainText("19,37");
      await expect(reference).toContainText("preço da pesquisa");
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
      for (const ticker of ["ALOS3", "SYN2"]) {
        await page.goto(
          origin + "/app/ranking/acao/" + ticker + "?visual=real&publication=2",
        );
        await expect(block).toHaveAttribute(
          "data-live-quote-block",
          "unavailable",
        );
        await expect(block).toContainText("Cotação atual indisponível");
        await expect(block.locator("[data-live-quote-field]")).toHaveCount(0);
        await expect(block.locator("[data-live-quote-price]")).toHaveCount(0);
        await expect(block).not.toContainText("R$ 0,00");
      }
      // Invalid tickers never reach the API.
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
      }
    },
  );
  await run(
    "Destaques /app: margem e referência, sem potencial/prazo inventados",
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
    },
  );
  await run(
    "Legado/demo: módulos e cenário permanecem disponíveis",
    async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      const quoteRequests = quoteCalls().length;
      await page.goto(origin + "/app/ranking?visual=demo");
      await expect(page.locator(".research-modules-table")).toBeVisible();
      // Fictitious companies get no quote.
      assert.equal(quoteCalls().length, quoteRequests);
      await expect(page.locator(".dividend-table")).toHaveCount(0);
      await page.locator(".research-table-company-link").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Horizonte",
      );
      await expect(page.locator(".figma-stock")).toHaveCount(0);
      await expect(
        page.getByText("Potencial simulado", { exact: true }).first(),
      ).toBeVisible();
    },
  );
  await run(
    "Cotações: pausa com aba oculta, retoma ao voltar e mantém números defasados na falha",
    async () => {
      await page.clock.install();
      await page.goto(origin + "/app/ranking?visual=real");
      const line = page
        .locator(".dividend-table tbody tr")
        .first()
        .locator("[data-live-quote]");
      await expect(line).toHaveAttribute("data-live-quote", "ready");
      const before = quoteCalls().length;
      const setHidden = (hidden) =>
        page.evaluate((hidden) => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            get: () => hidden,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        }, hidden);
      await setHidden(true);
      await page.clock.fastForward("16:00");
      assert.equal(
        quoteCalls().length,
        before,
        "Sem consulta com a aba oculta",
      );
      market.failQuotes = true;
      await setHidden(false);
      await expect.poll(() => quoteCalls().length).toBe(before + 1);
      // The failed refresh keeps the last numbers, marked as stale.
      await expect(line).toHaveAttribute("data-live-quote", "stale");
      await expect(line).toContainText("defasada R$ 19,62 · −0,91%");
      await expect(line).toHaveAttribute("title", /Defasada/);
      market.failQuotes = false;
      await page.clock.fastForward("02:10");
      await expect.poll(() => quoteCalls().length).toBe(before + 2);
      await expect(line).toHaveAttribute("data-live-quote", "ready");
      await expect(line).toContainText("agora R$ 19,62");
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
