import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { publicRanking } from "../server/public-ranking.js";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";
import {
  dividendAnnouncementMonths,
  dividendNumber,
} from "../dividend-insights.mjs";

// Local UI contract fixture; the full workbook is never imported into client code.
const audit = process.env.EDIV_WORKBOOK_AUDIT
  ? JSON.parse(await readFile(process.env.EDIV_WORKBOOK_AUDIT, "utf8"))
  : null;
const entries = process.env.EDIV_RANKING_ENTRIES
  ? JSON.parse(await readFile(process.env.EDIV_RANKING_ENTRIES, "utf8"))
  : audit
    ? audit.sheets[0].data.slice(1).map((row, index) => {
        const values = row.map(({ value }) => value);
        return {
          rank: index + 1,
          companyName: values[0],
          ticker: values[1],
          sector: values[2],
          dividendAnalysis: Object.fromEntries(
            dividendColumns
              .slice(3)
              .map((column, i) => [
                column.key,
                values[i + 3] == null
                  ? null
                  : column.format === "date"
                    ? String(values[i + 3]).slice(0, 10)
                    : String(values[i + 3]),
              ]),
          ),
        };
      })
    : Array.from({ length: 90 }, (_, index) => ({
        rank: index + 1,
        ticker: "TEST" + index,
        companyName: "Empresa de teste " + index,
        sector: "Setor de teste",
        dividendAnalysis: Object.fromEntries(
          dividendColumns
            .slice(3)
            .map((column) => [
              column.key,
              column.format === "date"
                ? "2026-10-20"
                : column.key === "announcementMonths"
                  ? "mar abr jun set dez"
                  : column.format === "text"
                    ? "5x por ano"
                    : "1",
            ]),
        ),
      }));
const completePublication = {
  id: "27",
  title: "Ranking publicado de teste",
  updatedAt: "2026-10-22T12:32:01Z",
  totalEntries: entries.length,
  entries,
};
const publication = publicRanking({
  id: "27",
  title: completePublication.title,
  created_at: completePublication.updatedAt,
  entries_json: entries,
});
const privatePublication = {
  ...completePublication,
  canManage: false,
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  history: [],
  sourceFileName: "Fonte de teste.xlsx",
  entries: entries.map((entry) => ({
    ...entry,
    expectedReturnPercent: null,
    targetPrice: null,
    horizonMonths: null,
    thesis: null,
    risks: null,
  })),
};
const output =
  process.env.EDIV_PUBLIC_OUTPUT || ".test-artifacts/public-rankings-browser";
await mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
});
const origin = "http://127.0.0.1:4198";
const results = [],
  errors = [],
  unknown = [];
let browser,
  mode = "hold",
  signedIn = false,
  pending = [],
  privateReads = 0;
async function assertPublicationCharts(page, entry) {
  const groups = {
    price: ["referencePrice", "ceilingPrice"],
    dividends: ["projectedGrossDividendPerShare", "estimatedEps"],
    eps: ["estimatedEps"],
    profit: ["estimatedNetIncome"],
    cagr: ["earningsCagr5Years"],
    debt: ["netDebtToEbitda"],
    valuation: ["projectedPE", "averagePE10Years"],
  };
  await expect(
    page.locator(".figma-stock figure.fmk-publication-chart"),
  ).toHaveCount(7);
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
    await expect(figure.locator(".recharts-wrapper")).toHaveCount(
      hasNumbers ? 1 : 0,
    );
    if (!hasNumbers)
      await expect(figure.getByRole("status")).toBeVisible();
  }
}
const run = async (name, work) => {
  await work();
  results.push(name);
  console.log("PASS", name);
};
try {
  await server.listen();
  await run(
    "SSR: home contém loading, sem fetch ou dados fictícios",
    async () => {
      const { render } = await server.ssrLoadModule("/src/entry-server.tsx");
      const previous = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = () => {
        calls++;
        throw new Error("Fetch durante SSR");
      };
      try {
        const html = render("/", {
          lessons: [],
          glossary: [],
          completed: [],
          access: "preview",
        });
        assert.match(html, /Carregando ranking publicado/);
        assert.doesNotMatch(
          html,
          /Três empresas, três cenários|Potencial simulado/,
        );
        assert.equal(calls, 0);
      } finally {
        globalThis.fetch = previous;
      }
    },
  );
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const context = await browser.newContext({
    viewport: { width: 1366, height: 950 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let status = 200,
      data;
    if (url.pathname === "/api/rankings/public") {
      if (mode === "hold") return pending.push(route);
      if (mode === "error") {
        status = 503;
        data = { error: "Ranking temporariamente indisponível" };
      } else
        data =
          mode === "empty"
            ? {
                id: null,
                title: "Ranking de dividendos",
                updatedAt: null,
                totalEntries: 0,
                entries: [],
              }
            : publication;
    } else if (url.pathname === "/api/auth/me") {
      status = signedIn ? 200 : 401;
      data = signedIn
        ? {
            user: {
              id: "public-ui",
              name: "Teste",
              email: "teste@example.test",
              emailVerified: true,
              role: "USER",
              permissions: [],
              createdAt: "2026-01-01T00:00:00Z",
            },
          }
        : { error: "Visitante" };
    } else if (url.pathname === "/api/auth/availability")
      data = { available: true, challenge: { required: false } };
    else if (url.pathname === "/api/rankings/status")
      data = { published: true };
    else if (url.pathname === "/api/notifications")
      data = { notifications: [], unreadCount: 0 };
    else if (url.pathname === "/api/rankings") {
      privateReads++;
      data = privatePublication;
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
  await page.goto(origin);
  await run(
    "Home: três empresas reais, três KPIs, ordem e cadastro por teclado",
    async () => {
      const section = page.locator("#caderno-de-exemplo");
      await expect(section.getByRole("status")).toHaveText(
        "Carregando ranking publicado…",
      );
      mode = "ready";
      for (const route of pending)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(publication),
        });
      pending = [];
      const cards = section.locator(".ph-ranking-company");
      await expect(cards).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await expect(cards.nth(i).getByRole("heading")).toContainText(
          entries[i].companyName,
        );
        await expect(cards.nth(i).locator(".company-logo")).toHaveCount(1);
        const keys = [
          "estimatedGrossDividendYield",
          "projectedPE",
          "safetyMargin",
        ];
        await expect(cards.nth(i).locator("dt")).toHaveText(
          keys.map((key) => dividendColumns.find((c) => c.key === key).label),
        );
        await expect(cards.nth(i).locator("dd")).toHaveText(
          keys.map((key) =>
            formatDividendValue(
              entries[i].dividendAnalysis[key],
              dividendColumns.find((c) => c.key === key).format,
            ),
          ),
        );
      }
      await expect(
        section.getByRole("button", { name: "Ver mais ações", exact: true }),
      ).toHaveCount(0);
      await expect(section).not.toContainText(entries[3].companyName);
      const cta = section.getByRole("link", {
        name: "Criar conta gratuita",
        exact: true,
      });
      await expect(cta).toHaveAttribute(
        "href",
        "/cadastro?next=%2Fapp%2Franking",
      );
      await cta.press("Enter");
      await expect(page).toHaveURL(/\/cadastro\?next=/);
      await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
      await page.goto(origin);
    },
  );
  await run(
    "Link público preserva ticker/publicação no destino autenticado",
    async () => {
      const link = page
        .locator("#public-ranking-results .ph-ranking-company-link")
        .first();
      await expect(link).toHaveAttribute(
        "href",
        "/app/ranking/acao/" + entries[0].ticker + "?publication=27",
      );
      await link.focus();
      await link.press("Enter");
      await expect(page).toHaveURL(/\/entrar$/);
      assert.equal(
        await page.evaluate(() => window.history.state.usr.from),
        "/app/ranking/acao/" + entries[0].ticker + "?publication=27",
      );
      assert.equal(privateReads, 0);
    },
  );
  await run(
    "Home: vazio sem fake, erro com retry e retorno a três",
    async () => {
      mode = "empty";
      await page.goto(origin);
      await expect(page.locator("#caderno-de-exemplo")).toContainText(
        "O ranking ainda não tem uma publicação disponível",
      );
      await expect(page.locator("#public-ranking-results")).toHaveCount(0);
      mode = "error";
      await page.reload();
      await expect(page.getByRole("alert")).toContainText(
        "Ranking temporariamente indisponível",
      );
      await expect(page.locator("#public-ranking-results")).toHaveCount(0);
      mode = "ready";
      await page
        .getByRole("button", { name: "Tentar carregar ranking novamente" })
        .click();
      await expect(
        page.locator("#public-ranking-results .ph-ranking-company"),
      ).toHaveCount(3);
    },
  );
  signedIn = true;
  await run(
    "Conta mantém ranking completo, filtros e paginação10+10",
    async () => {
      await page.goto(origin + "/app/ranking");
      const table = page.locator(".dividend-table tbody tr");
      await expect(table).toHaveCount(10);
      const more = page.getByRole("button", {
        name: "Ver mais ações",
        exact: true,
      });
      await more.press("Enter");
      await expect(table).toHaveCount(20);
      await expect(table.nth(10).getByRole("link")).toBeFocused();
      for (let count = 30; count <= 90; count += 10) {
        await more.click();
        await expect(table).toHaveCount(count);
      }
      await expect(more).toHaveCount(0);
    },
  );
  await run(
    "Empresa: cinco resumos, sete gráficos da publicação e21campos/3tickers",
    async () => {
      for (const entry of entries.slice(0, 3)) {
        await page.goto(
          origin + "/app/ranking/acao/" + entry.ticker + "?publication=27",
        );
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          entry.companyName,
        );
        await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
        await expect(
          page.locator(".figma-stock header .fmk-stats [data-summary]"),
        ).toHaveCount(5);
        for (const [label, key] of [
          ["Cotação de referência", "referencePrice"],
          ["DY bruto estimado", "estimatedGrossDividendYield"],
          ["P/L projetado", "projectedPE"],
          ["Preço-teto", "ceilingPrice"],
          ["Margem de segurança", "safetyMargin"],
        ]) {
          const column = dividendColumns.find((column) => column.key === key);
          await expect(
            page.locator(
              `.figma-stock header .fmk-stats [data-summary="${label}"]`,
            ),
          ).toContainText(
            formatDividendValue(dividendValue(entry, key), column.format),
          );
        }
        await expect(page.locator(".figma-stock [data-field]")).toHaveCount(21);
        const fields = await page
          .locator(".figma-stock [data-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              key: node.dataset.field,
              value:
                node.querySelector("[data-exact-value]").dataset.exactValue,
              visibleValue: node
                .querySelector("[data-exact-value]")
                .textContent.replace(/^[▲▼]\s*/, "")
                .trim(),
            })),
          );
        for (const column of dividendColumns) {
          const expected = formatDividendValue(
            dividendValue(entry, column.key),
            column.format,
          );
          const field = fields.find((item) => item.key === column.key);
          assert.equal(field.value, expected);
          assert.equal(field.visibleValue, expected);
        }
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
        await assertPublicationCharts(page, entry);
        assert.ok(
          await page
            .locator("#cotacao")
            .evaluate((node) =>
              Boolean(
                node.compareDocumentPosition(
                  document.getElementById("dividendos"),
                ) & Node.DOCUMENT_POSITION_FOLLOWING,
              ),
            ),
        );
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
      }
      await page.mouse.move(0, 0);
      await page.keyboard.press("Tab");
      const summaryLabels = [
        "Cotação de referência",
        "DY bruto estimado",
        "P/L projetado",
        "Preço-teto",
        "Margem de segurança",
      ];
      for (const label of summaryLabels) {
        const button = page
          .locator(".fmk-stats")
          .getByRole("button", { name: `O que é ${label}?`, exact: true });
        await button.focus();
        await expect(page.getByRole("tooltip")).toBeVisible();
        await button.press("Escape");
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await expect(button).toBeFocused();
      }
      await page.screenshot({
        path: output + "/company-desktop.png",
        fullPage: true,
      });
      await page
        .locator(".figma-stock header")
        .screenshot({ path: output + "/company-header.png" });
      await page.locator("#cotacao").screenshot({
        path: output + "/company-publication-price-chart.png",
      });
    },
  );
  await run(
    "320px/2temas: home eempresa contidas, tabela/âncoras por teclado",
    async () => {
      for (const theme of ["dark", "light"]) {
        signedIn = false;
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(origin);
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await expect(
          page.locator("#public-ranking-results .ph-ranking-company"),
        ).toHaveCount(3);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.screenshot({
          path: output + "/home-320-" + theme + ".png",
          fullPage: true,
        });
        await page.screenshot({
          path: output + "/home-viewport-320-" + theme + ".png",
        });
        signedIn = true;
        await page.goto(
          origin + "/app/ranking/acao/" + entries[0].ticker + "?publication=27",
        );
        await expect(
          page.locator(".figma-stock header .fmk-stats [data-summary]"),
        ).toHaveCount(5);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          overflowing: Array.from(document.querySelectorAll(".figma-stock *"))
            .filter(
              (node) => node.getBoundingClientRect().right > innerWidth + 1,
            )
            .map((node) => ({
              tag: node.tagName,
              class: node.className,
              text: node.textContent.slice(0, 100),
            })),
        }));
        assert.ok(
          layout.scrollWidth <= layout.width + 1,
          JSON.stringify(layout),
        );
        await page.screenshot({
          path: output + "/company-320-" + theme + ".png",
          fullPage: true,
        });
        await page.screenshot({
          path: output + "/company-viewport-320-" + theme + ".png",
        });
        const nav = page.getByRole("navigation", { name: "Seções da análise" });
        await nav
          .getByRole("link", { name: "Dividendos", exact: true })
          .focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#dividendos")).toBeFocused();
      }
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
          audit || process.env.EDIV_RANKING_ENTRIES
            ? "Audited workbook in local API stubs"
            : "Synthetic90 in local API stubs",
        results,
        errors,
        unknown,
      },
      null,
      2,
    ),
  );
  await browser?.close();
  await server.close();
}
