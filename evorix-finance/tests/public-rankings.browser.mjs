import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { publicRankingWithMarket } from "../server/public-ranking.js";
import { rankingMarketBody } from "../server/market/ranking-market.js";
import { stockHistory } from "../server/stock-history.js";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";
import {
  dividendAnnouncementMonths,
  dividendNumber,
} from "../dividend-insights.mjs";
import {
  formatSafetyMarginPercent,
  safetyMarginPercent,
} from "../safety-margin.mjs";
import {
  fixtureNow,
  marketCheckedAt,
  marketFixture,
  marketState,
  seriesAnswer,
  staleQuote,
  summaryQuote,
  unavailableQuote,
} from "./market-fixture.mjs";

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
// Canonical quotes of the list: the first company has one, the second has
// none (research basis) and the third keeps the last valid one (stale).
const quotes = {
  [entries[0].ticker]: summaryQuote(entries[0].ticker, { price: "0.80000000" }),
  [entries[1].ticker]: unavailableQuote(entries[1].ticker),
  [entries[2].ticker]: staleQuote(entries[2].ticker, { price: "0.90000000" }),
};
// The real public serializer: no ceiling, no research price.
const publication = publicRankingWithMarket(
  {
    id: "27",
    title: completePublication.title,
    created_at: completePublication.updatedAt,
    entries_json: entries,
  },
  { quotes: new Map(Object.entries(quotes)), market: marketState },
);
const privatePublication = {
  ...completePublication,
  canManage: false,
  authorName: null,
  professionalCategory: null,
  professionalRegistration: null,
  history: [
    {
      id: "26",
      title: "Publicação de teste",
      createdAt: "2026-10-01T12:00:00Z",
    },
  ],
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
// brapi.dev is mocked; the price series of the logged-in page too.
const market = marketFixture({ quotes });
let browser,
  mode = "hold",
  signedIn = false,
  pending = [],
  privateReads = 0,
  historyEnabled = false;
// Expected dynamic margins, cross-checked with the shared module.
const margins = {
  first: formatSafetyMarginPercent(safetyMarginPercent("1", "0.80")),
  stale: formatSafetyMarginPercent(safetyMarginPercent("1", "0.90")),
};
assert.deepEqual(margins, { first: "20,00%", stale: "10,00%" });
async function assertPublicationCharts(page, entry) {
  // The price chart comes from /api/rankings/price-series.
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
const expectInstrumentSans = async (locator) => {
  const family = await locator.evaluate(
    (node) => getComputedStyle(node).fontFamily,
  );
  assert.match(family, /Instrument Sans/);
  assert.doesNotMatch(family, /Newsreader|DM Mono|Georgia|Times New Roman/);
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
      const prerendered = await readFile("dist/index.html", "utf8");
      const stylesheets = Array.from(
        prerendered.matchAll(/href="([^"]+\.css)"/g),
        ([, href]) => href,
      );
      assert.ok(stylesheets.length > 0, "CSS incluído no HTML inicial");
      const css = await Promise.all(
        stylesheets.map((href) =>
          readFile("dist/" + href.replace(/^\//, ""), "utf8"),
        ),
      );
      assert.ok(
        css.some((stylesheet) => stylesheet.includes(".ph-brand")),
        "O CSS da marca deve estar carregado no primeiro paint da home",
      );
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
  // Every quote was read at 10:48; the pages start at 11:00, same day.
  await context.clock.install({ time: fixtureNow });
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
    else if (url.pathname.startsWith("/api/rankings/history/")) {
      data =
        historyEnabled && signedIn
          ? stockHistory(decodeURIComponent(url.pathname.split("/").at(-1)))
          : null;
      status = data ? 200 : 404;
      data ||= { error: "Sem histórico nesta fixture de publicação" };
    } else if (url.pathname === "/api/rankings") {
      privateReads++;
      data = privatePublication;
    } else if (url.pathname === "/api/rankings/market") {
      // The real serializer of the server, from the private publication.
      market.calls.push(url.pathname);
      data = rankingMarketBody({
        publication: privatePublication,
        quotes: new Map(Object.entries(market.quotes)),
        checkedAt: marketCheckedAt,
        market: marketState,
      });
    } else if (
      url.pathname === "/api/rankings/price-series/ABEV3" &&
      signedIn
    ) {
      // Outside the snapshot and the latest publication: 404 on the server.
      market.calls.push(url.pathname + url.search);
      status = 404;
      data = { error: "Histórico não disponível para esta ação." };
    } else if (market.handles(url)) ({ status, data } = market.respond(url));
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
  await page.goto(origin);
  await run(
    "Home: três empresas reais, três KPIs, margem da cotação e cadastro por teclado",
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
      await expect(
        section.getByRole("heading", { name: "Ranking de Ações", exact: true }),
      ).toBeVisible();
      await expect(section).not.toContainText(completePublication.title);
      await expect(section).not.toContainText("22/10/2026");
      await expectInstrumentSans(section.locator("h2"));
      await expect(cards).toHaveCount(3);
      const margin = [
        [margins.first, "market"],
        ["100,00%da pesquisa", "research"],
        [margins.stale + "defasada", "stale"],
      ];
      for (let i = 0; i < 3; i++) {
        await expect(cards.nth(i).getByRole("heading")).toContainText(
          entries[i].companyName,
        );
        await expectInstrumentSans(cards.nth(i).getByRole("heading"));
        await expect(cards.nth(i).locator(".company-logo")).toHaveCount(1);
        const keys = [
          "estimatedGrossDividendYield",
          "projectedPE",
          "safetyMargin",
        ];
        await expect(cards.nth(i).locator("dt")).toHaveText(
          keys.map((key) => dividendColumns.find((c) => c.key === key).label),
        );
        // DY and P/L from the research; the margin follows the quote.
        for (const key of keys.slice(0, 2))
          await expect(
            cards.nth(i).locator(`[data-field="${key}"] dd`),
          ).toHaveText(
            formatDividendValue(
              entries[i].dividendAnalysis[key],
              dividendColumns.find((c) => c.key === key).format,
            ),
          );
        const field = cards.nth(i).locator('[data-field="safetyMargin"]');
        await expect(field.locator("dd")).toHaveText(margin[i][0]);
        await expect(field).toHaveAttribute("data-market-state", margin[i][1]);
      }
      await expect(section.locator(".ph-ranking-publication p")).toContainText(
        "a margem de segurança acompanha a cotação da brapi.dev",
      );
      // The ceiling never reaches a public page.
      await expect(section).not.toContainText("R$ 1,00");
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
      await expectInstrumentSans(page.getByLabel("Nome", { exact: true }));
      await page.goto(origin);
    },
  );
  await run(
    "Página pública das três primeiras: cotação e margem da mesma resposta, sem teto",
    async () => {
      const ticker = entries[0].ticker;
      const link = page
        .locator("#public-ranking-results .ph-ranking-company-link")
        .first();
      await expect(link).toHaveAttribute("href", "/ranking/acao/" + ticker);
      await link.focus();
      await link.press("Enter");
      await expect(page).toHaveURL(origin + "/ranking/acao/" + ticker);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        ticker,
      );
      await expect(
        page.locator('dl [class*="font-numbers"]').first(),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "index, follow",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://escoladodividendo.com.br/ranking/acao/" + ticker,
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /a margem de segurança acompanha a cotação\.$/,
      );
      await expect(
        page.getByRole("link", { name: "Já tenho conta" }),
      ).toHaveAttribute(
        "href",
        "/entrar?next=" +
          encodeURIComponent("/app/ranking/acao/" + ticker + "?publication=27"),
      );
      for (const key of ["estimatedGrossDividendYield", "projectedPE"])
        await expect(
          page.locator(`[data-indicator="${key}"] [data-indicator-sub]`),
        ).toHaveText("na data da pesquisa");
      const indicator = page.locator('[data-indicator="safetyMargin"]');
      await expect(indicator).toHaveAttribute("data-market-state", "market");
      await expect(indicator.locator("[data-indicator-value]")).toHaveText(
        margins.first,
      );
      await expect(indicator.locator("[data-indicator-sub]")).toHaveText(
        "com a cotação de mercado",
      );
      await expect(indicator.locator("[data-indicator-value]")).toHaveAttribute(
        "title",
        "Margem de segurança = (preço-teto − cotação de mercado) ÷ preço-teto: 20,00%, com a cotação brapi.dev de R$ 0,80. O preço-teto está na pesquisa completa.",
      );
      await expect(page.locator("article")).toContainText(
        "DY e P/L são estimativas da pesquisa e não mudam com a cotação. A margem de segurança acompanha a cotação da brapi.dev.",
      );
      // Quote of the same public answer: summary, so no session or R$ change.
      const block = page.locator("[data-market-quote]");
      await expect(block).toHaveAttribute("data-market-quote", "market");
      await expect(
        block.getByRole("heading", { level: 2, name: "Cotação atual" }),
      ).toBeVisible();
      await expect(block.locator("[data-market-quote-price]")).toHaveText(
        "R$ 0,80",
      );
      await expect(block.locator("[data-market-quote-change]")).toHaveText(
        "−0,91% no dia",
      );
      await expect(block.locator("[data-market-session-field]")).toHaveCount(0);
      await expect(
        block.locator('[data-market-quote-field="volume"] dd'),
      ).toHaveText("367.700");
      await expect(
        block.locator('[data-market-quote-field="ceiling"]'),
      ).toHaveCount(0);
      await expect(block.locator("[data-market-source]")).toHaveText(
        "brapi.dev",
      );
      await expect(page.locator("article")).not.toContainText("R$ 1,00");
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /tempo real/i,
      );
      // No valid quote: research margin dated by the publication, no price.
      await page.goto(origin + "/ranking/acao/" + entries[1].ticker);
      await expect(block).toHaveAttribute("data-market-quote", "unavailable");
      await expect(block).toContainText("Cotação atual indisponível");
      await expect(indicator.locator("[data-indicator-value]")).toHaveText(
        "100,00%",
      );
      await expect(indicator.locator("[data-indicator-sub]")).toHaveText(
        "da pesquisa",
      );
      // The last valid quote: marked as stale, margin with it.
      await page.goto(origin + "/ranking/acao/" + entries[2].ticker);
      await expect(block).toHaveAttribute("data-market-quote", "stale");
      await expect(block.locator("[data-market-quote-stale]")).toBeVisible();
      await expect(block.locator("[data-market-source]")).toHaveText(
        "defasada · brapi.dev",
      );
      await expect(indicator.locator("[data-indicator-value]")).toHaveText(
        margins.stale,
      );
      await expect(indicator.locator("[data-indicator-sub]")).toHaveText(
        "defasada",
      );
      // Public pages read only the public answer.
      assert.ok(
        market.calls.every(
          (call) =>
            !call.startsWith("/api/market/") &&
            !call.startsWith("/api/rankings/market"),
        ),
        JSON.stringify(market.calls),
      );
      // A company outside the open three is never a public, indexable page.
      await page.goto(origin + "/ranking/acao/ZZZZ3");
      await expect(
        page.getByRole("heading", { level: 1, name: "Ranking de Ações" }),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      assert.equal(privateReads, 0);
      await page.goto(origin);
    },
  );
  await run(
    "Rota pública apresenta Ranking de Ações sem datas decorativas",
    async () => {
      await page.goto(origin + "/ranking");
      await expect(
        page.getByRole("heading", { level: 1, name: "Ranking de Ações" }),
      ).toBeVisible();
      await expect(
        page.locator("#public-ranking-results .ph-ranking-company"),
      ).toHaveCount(3);
      await expect(page.locator("body")).not.toContainText(
        completePublication.title,
      );
      await expect(page.locator("body")).not.toContainText("22/10/2026");
      await expectInstrumentSans(page.getByRole("heading", { level: 1 }));
      await page.goto(origin);
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
    "Home autenticada mantém marca animada, sem datas/publication title e IDs únicos",
    async () => {
      await page.setViewportSize({ width: 1366, height: 950 });
      await page.goto(origin + "/app");
      const brand = page.locator(".ph-brand");
      await expect(brand).toHaveCount(1);
      await expect(brand).toBeVisible();
      await expect(
        page
          .locator("section")
          .filter({ hasText: "Publicação mais recente" })
          .locator("p")
          .filter({ hasText: /^Ranking de Ações$/ })
          .first(),
      ).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        completePublication.title,
      );
      await expect(page.locator("body")).not.toContainText("22/10/2026");
      await expectInstrumentSans(page.locator("h1").first());
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await page.locator(".home-editorial").screenshot({
          path: output + "/member-home-1366-" + theme + ".png",
          animations: "allow",
        });
      }
      assert.equal(
        await page.evaluate(() => {
          const ids = [...document.querySelectorAll("[id]")].map(
            (element) => element.id,
          );
          return new Set(ids).size;
        }),
        await page.locator("[id]").count(),
        "IDs únicos na home autenticada",
      );
      await brand.scrollIntoViewIfNeeded();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(brand).toHaveAttribute("data-ph-inview", "true");
      const running = () =>
        brand.evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running").length,
        );
      await expect.poll(running).toBeGreaterThan(0);
      await expect(brand.getByRole("button")).toHaveCount(0);
      await expect(brand).not.toContainText("Educação em dividendos");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect.poll(running).toBe(0);
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(origin + "/app");
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await expect(page.locator(".ph-brand")).toBeVisible();
        await expectInstrumentSans(page.locator("h1").first());
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Home autenticada 320px sem overflow em " + theme,
        );
        assert.equal(
          await page
            .locator(".ph-brand")
            .evaluate(
              (element) =>
                element
                  .getAnimations({ subtree: true })
                  .filter((animation) => animation.playState === "running")
                  .length,
            ),
          0,
          "Home autenticada 320px permanece estática com movimento reduzido",
        );
        await page.screenshot({
          path: output + "/member-home-320-" + theme + ".png",
          fullPage: true,
        });
      }
    },
  );
  await run(
    "Conta mantém ranking completo, filtros e paginação10+10",
    async () => {
      await page.setViewportSize({ width: 1366, height: 950 });
      await page.goto(origin + "/app/ranking");
      await expect(
        page.getByRole("heading", { level: 1, name: "Ranking de Ações" }),
      ).toBeVisible();
      await expectInstrumentSans(page.getByLabel("Buscar empresa ou ticker"));
      const versions = page.getByLabel("Histórico de publicações");
      await expect(versions.locator('option[value="26"]')).toHaveText(
        /Ranking de Ações · 01\/10\/2026/,
      );
      await versions.selectOption("26");
      await expect(page).toHaveURL(/publication=26/);
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await page.goto(origin + "/app/ranking");
      const table = page.locator(".dividend-table tbody tr");
      await expect(table).toHaveCount(10);
      // The ranking shows the same dynamic margin as the public answer.
      await expect(
        table
          .first()
          .locator('td[data-column="safetyMargin"] [data-market-value]'),
      ).toHaveText(margins.first);
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
      await expect(page.locator("#ranking-count")).toContainText("90 ações");
      assert.deepEqual(
        await page
          .locator(".dividend-company-link")
          .evaluateAll((links) =>
            links.map((link) =>
              link.querySelector("small")?.textContent.trim(),
            ),
          ),
        entries.map((entry) => entry.ticker),
        "Os 90 tickers e sua ordem devem corresponder ao mesmo payload público",
      );
      await expect(more).toHaveCount(0);
    },
  );
  await run(
    "Empresa: cinco resumos de mercado e pesquisa, cinco gráficos da publicação e20campos/3tickers",
    async () => {
      const expectedMarket = [
        ["R$ 0,80", margins.first, "market"],
        ["R$ 1,00", "100,00%", "research"],
        ["R$ 0,90", margins.stale, "stale"],
      ];
      for (const [index, entry] of entries.slice(0, 3).entries()) {
        await page.goto(
          origin + "/app/ranking/acao/" + entry.ticker + "?publication=27",
        );
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          entry.companyName,
        );
        await expectInstrumentSans(page.getByRole("heading", { level: 1 }));
        await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
        const stats = page.locator(".figma-stock header .fmk-stats");
        await expect(stats.locator("[data-summary]")).toHaveCount(5);
        const [price, margin, state] = expectedMarket[index];
        await expect(
          stats.locator(
            '[data-summary="Preço de mercado"] [data-summary-value]',
          ),
        ).toHaveText(price);
        await expect(
          stats.locator('[data-summary="Preço de mercado"]'),
        ).toHaveAttribute("data-market-state", state);
        await expect(
          stats.locator(
            '[data-summary="Margem de segurança"] [data-summary-value]',
          ),
        ).toHaveText(margin);
        for (const [label, key] of [
          ["DY bruto estimado", "estimatedGrossDividendYield"],
          ["P/L projetado", "projectedPE"],
          ["Preço-teto", "ceilingPrice"],
        ]) {
          const column = dividendColumns.find((column) => column.key === key);
          await expect(
            stats.locator(`[data-summary="${label}"]`),
          ).toContainText(
            formatDividendValue(dividendValue(entry, key), column.format),
          );
        }
        await expect(page.locator(".figma-stock [data-field]")).toHaveCount(20);
        const referenceInfo = page.getByRole("button", {
          name: "O que é Preço da pesquisa?",
          exact: true,
        });
        await referenceInfo.focus();
        await expect(page.getByRole("tooltip")).toContainText(
          "Preço da ação na planilha, na data da pesquisa; não é a cotação de mercado.",
        );
        await referenceInfo.press("Escape");
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
        for (const column of dividendColumns.filter(
          (column) => column.key !== "updatedOn",
        )) {
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
        "Preço de mercado",
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
        path: output + "/company-quote-desktop.png",
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
        await page.goto(origin + "/ranking/acao/" + entries[0].ticker);
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const quoteBlock = page.locator("[data-market-quote]");
        await expect(quoteBlock).toHaveAttribute("data-market-quote", "market");
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Página pública com cotação 320px sem overflow em " + theme,
        );
        await page.locator("#indicadores-abertos").screenshot({
          path: output + "/public-indicators-320-" + theme + ".png",
        });
        await quoteBlock.screenshot({
          path: output + "/public-quote-320-" + theme + ".png",
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
  // Deterministic price series: business days of the B3, values in text.
  const point = (date, close, source, extra = {}) => ({
    date,
    close,
    status: "consolidated",
    source,
    ...extra,
  });
  const nominalDaily = [
    point("2026-10-19", "19.00000000", "agf"),
    point("2026-10-20", "19.10000000", "agf"),
    point("2026-10-21", "19.05000000", "agf"),
    point("2026-10-22", "19.20000000", "agf"),
    point("2026-10-23", "19.30000000", "agf"),
    point("2026-10-26", "19.25000000", "escola"),
    // 27 and 28/10 have no close in the series.
    point("2026-10-29", "19.40000000", "brapi", { gapBefore: true }),
    point("2026-10-30", "19.45000000", "brapi"),
    point("2026-11-03", "19.50000000", "brapi"),
    point("2026-11-04", "19.55000000", "brapi"),
  ];
  const adjustedDaily = nominalDaily.map((item) => ({
    ...item,
    close: (Number(item.close) - 1).toFixed(8),
    source: "brapi",
  }));
  const months = [
    ["2025-11", "2025-11-28"],
    ["2025-12", "2025-12-30"],
    ["2026-01", "2026-01-30"],
    // February is missing: March starts a new stroke.
    ["2026-03", "2026-03-31"],
    ["2026-04", "2026-04-30"],
    ["2026-05", "2026-05-29"],
    ["2026-06", "2026-06-30"],
    // July ends at 24/07 in the series: an incomplete month.
    ["2026-07", "2026-07-24"],
    ["2026-08", "2026-08-31"],
    ["2026-09", "2026-09-30"],
    ["2026-10", "2026-10-30"],
  ];
  const monthly = (offset) =>
    months.map(([month, date], index) =>
      point(date, (17 + index * 0.2 + offset).toFixed(8), "brapi", {
        month,
        status: month === "2026-07" ? "incomplete" : "consolidated",
        ...(month === "2026-03" ? { gapBefore: true } : {}),
      }),
    );
  const latest = (connect, reason = null) => ({
    price: "19.62000000",
    checkedAt: marketCheckedAt,
    freshness: "delayed",
    connect,
    reason,
  });
  const both = ["adjusted", "nominal"];
  const timSeries = {
    adjusted: {
      daily: seriesAnswer("TIMS3", {
        basis: "adjusted",
        availableBases: both,
        points: adjustedDaily,
        latestQuote: latest(false, "base_mismatch"),
        notes: [
          "Preços ajustados por proventos e eventos pela brapi, sem ajuste próprio da Escola.",
        ],
      }),
      monthly: seriesAnswer("TIMS3", {
        basis: "adjusted",
        granularity: "monthly",
        availableBases: both,
        points: monthly(-1),
        latestQuote: latest(false, "base_mismatch"),
      }),
    },
    nominal: {
      daily: seriesAnswer("TIMS3", {
        basis: "nominal",
        availableBases: both,
        defaultBasis: "adjusted",
        points: nominalDaily,
        latestQuote: latest(true),
      }),
      monthly: seriesAnswer("TIMS3", {
        basis: "nominal",
        granularity: "monthly",
        availableBases: both,
        defaultBasis: "adjusted",
        points: monthly(0),
        latestQuote: latest(true),
      }),
    },
  };
  // Only the traded price exists: "auto" follows the server's default basis.
  const valeSeries = {
    adjusted: {
      daily: seriesAnswer("VALE3", {
        basis: "adjusted",
        availableBases: ["nominal"],
        unavailableReason: "no_token",
      }),
    },
    nominal: {
      daily: seriesAnswer("VALE3", {
        basis: "nominal",
        points: nominalDaily,
        latestQuote: latest(false, "gap"),
      }),
    },
  };
  const budget = (basis) =>
    seriesAnswer("ITUB4", {
      basis,
      availableBases: [],
      unavailableReason: "budget",
    });
  await run(
    "Gráfico de preços: diário/mensal, duas bases, marcador, lacuna, mês incompleto e indisponível",
    async () => {
      const previousEntries = privatePublication.entries;
      privatePublication.entries = [
        "TIMS3",
        "WIZC3",
        "VALE3",
        "ITUB4",
        "ABEV3",
      ].map((ticker, index) => ({
        ...structuredClone(previousEntries[index]),
        ticker,
        companyName: "Empresa " + ticker,
      }));
      market.series = {
        TIMS3: timSeries,
        VALE3: valeSeries,
        ITUB4: {
          adjusted: { daily: budget("adjusted") },
          nominal: { daily: budget("nominal") },
        },
      };
      market.quotes.TIMS3 = summaryQuote("TIMS3");
      historyEnabled = true;
      signedIn = true;
      try {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(origin + "/app/ranking/acao/TIMS3?publication=27");
        const price = page.locator("figure[data-price-chart]");
        const dividends = page.locator(
          'figure[data-history-chart="dividends"]',
        );
        await expect(price).toHaveAttribute("data-price-chart", "ready");
        await expect(price).toHaveAttribute("data-ticker", "TIMS3");
        // Adjusted is the default when it exists, and it is always named.
        await expect(price).toHaveAttribute("data-basis", "adjusted");
        await expect(price).toHaveAttribute("data-granularity", "daily");
        await expect(price.locator("[data-price-basis]")).toHaveText(
          "Base: ajustada por proventos e por eventos (desdobramento, grupamento e bonificação), pela metodologia da brapi.dev.",
        );
        assert.ok(
          market.calls.includes(
            "/api/rankings/price-series/TIMS3?basis=adjusted&granularity=daily",
          ),
        );
        const basisButton = (name) =>
          price
            .getByRole("group", { name: "Base do preço no gráfico" })
            .getByRole("button", { name, exact: true });
        await expect(basisButton("Ajustado por proventos")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(basisButton("Sem ajuste")).toBeEnabled();
        // The dividend chart keeps the approved AGF endpoint.
        await expect(dividends).toHaveAttribute("data-history-ticker", "TIMS3");
        assert.ok(
          (await dividends.locator(".recharts-bar-rectangle").count()) > 0,
        );
        await expect(page.locator("figure.fmk-publication-chart")).toHaveCount(
          4,
        );
        // Missing sessions break the stroke in two.
        const segments = () =>
          price
            .locator(".recharts-area-curve")
            .first()
            .evaluate(
              (path) => (path.getAttribute("d").match(/M/g) || []).length,
            );
        await expect.poll(segments).toBe(2);
        // The latest quote is a marker of its own; on the adjusted basis the
        // last close has another factor, so there is no dashed line.
        await expect(price.locator("[data-latest-marker]")).toHaveCount(1);
        await expect(price.locator(".price-series-connector")).toHaveCount(0);
        await expect(price.locator("[data-marker-note]")).toHaveAttribute(
          "data-marker-note",
          "alone",
        );
        await expect(price.locator("[data-marker-note]")).toContainText(
          "Cotação mais recente — preço nominal de mercado: R$ 19,62.",
        );
        await expect(price.locator("[data-marker-note]")).toContainText(
          "a série ajustada não está na mesma base do preço de mercado",
        );
        await expect(price.locator("[data-gap-note]")).toBeVisible();
        await expect(price.locator("[data-coverage]")).toHaveText(
          "Fontes: brapi.dev.",
        );
        await expect(price.locator("[data-coverage-note]")).toHaveText(
          "Preços ajustados por proventos e eventos pela brapi, sem ajuste próprio da Escola.",
        );
        // Tooltips by keyboard: São Paulo date, value, basis, status, source.
        const plot = price.locator('svg[role="application"]');
        await plot.focus();
        for (let index = 0; index < 15; index++)
          await page.keyboard.press("ArrowLeft");
        const tooltip = price.getByRole("tooltip");
        await expect(tooltip).toBeVisible();
        await expectInstrumentSans(tooltip);
        await expect(tooltip).toContainText("Pregão de 19/10/2026");
        await expect(tooltip).toContainText("R$ 18,00");
        await expect(tooltip).toContainText("ajustado por proventos");
        await expect(tooltip).toContainText("consolidado");
        await expect(tooltip).toContainText("brapi.dev");
        await expect(tooltip).toContainText("Preço-teto");
        for (let index = 0; index < 6; index++)
          await page.keyboard.press("ArrowRight");
        await expect(tooltip).toContainText(
          "sem fechamentos entre 26/10/2026 e 29/10/2026",
        );
        for (let index = 0; index < 15; index++)
          await page.keyboard.press("ArrowRight");
        await expect(tooltip).toContainText(
          "Cotação mais recente — preço nominal de mercado",
        );
        await expect(tooltip).toContainText("nominal, sem ajuste");
        // The ceiling stays a constant reference that can be hidden.
        const lines = () => price.locator(".recharts-line-curve").count();
        const withCeiling = await lines();
        await price
          .getByRole("button", { name: "Preço-teto", exact: true })
          .click();
        await expect.poll(lines).toBe(withCeiling - 1);
        await price
          .getByRole("button", { name: "Preço-teto", exact: true })
          .click();
        // Without adjustment: the traded price, joined to the quote by a dash.
        await basisButton("Sem ajuste").click();
        await expect(price).toHaveAttribute("data-basis", "nominal");
        await expect(price.locator("[data-price-basis]")).toHaveText(
          "Base: sem ajuste, com o preço negociado em cada pregão.",
        );
        await expect(price.locator(".price-series-connector")).toHaveCount(1);
        await expect(price.locator("[data-marker-note]")).toHaveAttribute(
          "data-marker-note",
          "connected",
        );
        await expect(price.locator("[data-coverage]")).toHaveText(
          "Fontes: AGF, no trecho com o preço negociado; fechamentos consolidados pela Escola do Dividendo; brapi.dev.",
        );
        const aside = page.locator(".fmk-chart-layout aside").first();
        await expect(aside).toContainText("No período · 1A · sem ajuste");
        await expect(
          aside
            .locator("dl > div")
            .filter({ hasText: "Último fechamento" })
            .locator("dd"),
        ).toHaveText(/19,55/);
        // Monthly: the short windows go, an incomplete month is marked.
        await price
          .getByRole("group", { name: "Intervalo do gráfico de cotação" })
          .getByRole("button", { name: "Mensal", exact: true })
          .click();
        await expect(price).toHaveAttribute("data-granularity", "monthly");
        await expect(price).toHaveAttribute("data-basis", "nominal");
        assert.ok(
          market.calls.includes(
            "/api/rankings/price-series/TIMS3?basis=nominal&granularity=monthly",
          ),
        );
        await expect(
          price
            .getByRole("group", { name: "Período do gráfico de cotação" })
            .getByRole("button"),
        ).toHaveText(["6M", "1A", "5A", "Máx"]);
        await expect(price.locator("[data-incomplete-point]")).toHaveCount(1);
        await expect(price.locator("[data-incomplete-note]")).toContainText(
          "07/2026: dados até 24/07",
        );
        await expect.poll(segments).toBe(2);
        await plot.focus();
        for (let index = 0; index < 15; index++)
          await page.keyboard.press("ArrowLeft");
        for (let index = 0; index < 8; index++)
          await page.keyboard.press("ArrowRight");
        await expect(tooltip).toContainText(
          "Mês 07/2026 · pregão de 24/07/2026",
        );
        await expect(tooltip).toContainText("mês incompleto, dados até 24/07");
        // Monthly connects on request too: the last month is the previous one.
        await expect(price.locator(".price-series-connector")).toHaveCount(1);
        await basisButton("Ajustado por proventos").click();
        await expect(price).toHaveAttribute("data-basis", "adjusted");
        await expect(price.locator(".price-series-connector")).toHaveCount(0);
        assert.doesNotMatch(
          await page.locator("body").innerText(),
          /tempo real/i,
        );
        // Not covered: an informative state, the dividends still drawn.
        await page.goto(origin + "/app/ranking/acao/WIZC3?publication=27");
        await expect(price).toHaveAttribute("data-price-chart", "unavailable");
        await expect(
          price.locator("[data-unavailable-reason]"),
        ).toHaveAttribute("data-unavailable-reason", "not_covered");
        await expect(price).toContainText(
          "A brapi.dev não oferece o histórico de preços desta ação.",
        );
        await expect(price.locator(".recharts-area-curve")).toHaveCount(0);
        await expect(dividends).toHaveAttribute("data-history-ticker", "WIZC3");
        // Only the traded price: "auto" asks for the adjusted one, then the
        // server's default; the adjusted toggle cannot be chosen.
        await page.goto(origin + "/app/ranking/acao/VALE3?publication=27");
        await expect(price).toHaveAttribute("data-basis", "nominal");
        await expect(price).toHaveAttribute("data-price-chart", "ready");
        assert.ok(
          market.calls.includes(
            "/api/rankings/price-series/VALE3?basis=adjusted&granularity=daily",
          ) &&
            market.calls.includes(
              "/api/rankings/price-series/VALE3?basis=nominal&granularity=daily",
            ),
        );
        await expect(basisButton("Ajustado por proventos")).toBeDisabled();
        await expect(basisButton("Sem ajuste")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(price.locator("[data-marker-note]")).toContainText(
          "há pregões sem fechamento entre o último ponto e a cotação",
        );
        // Daily budget spent, and a ticker the server does not cover (404).
        await page.goto(origin + "/app/ranking/acao/ITUB4?publication=27");
        await expect(
          price.locator("[data-unavailable-reason]"),
        ).toHaveAttribute("data-unavailable-reason", "budget");
        await expect(price).toContainText(
          "O limite diário de consultas à brapi.dev foi atingido.",
        );
        await page.goto(origin + "/app/ranking/acao/ABEV3?publication=27");
        await expect(
          price.locator("[data-unavailable-reason]"),
        ).toHaveAttribute("data-unavailable-reason", "not_covered");
        for (const theme of ["dark", "light"]) {
          await page.setViewportSize({ width: 320, height: 1000 });
          await page.goto(origin + "/app/ranking/acao/TIMS3?publication=27");
          await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
          );
          await expect(price).toHaveAttribute("data-price-chart", "ready");
          // On failure, name the widest elements past the viewport: fonts
          // differ between Windows and the Linux CI runner.
          const overflow = await page.evaluate(() => {
            if (document.documentElement.scrollWidth <= innerWidth + 1)
              return null;
            return [...document.querySelectorAll("body *")]
              .map((element) => ({
                element,
                right: Math.max(
                  element.getBoundingClientRect().right,
                  element.getBoundingClientRect().left + element.scrollWidth,
                ),
              }))
              .filter(({ right }) => right > innerWidth + 1)
              // Content inside a scroll area does not widen the page.
              .filter(({ element }) => {
                for (let node = element.parentElement; node && node !== document.body; node = node.parentElement)
                  if (getComputedStyle(node).overflowX !== "visible") return false;
                return true;
              })
              .sort((a, b) => b.right - a.right)
              .slice(0, 5)
              .map(
                ({ element, right }) =>
                  `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 80)} → ${Math.round(right)}px`,
              );
          });
          assert.equal(
            overflow,
            null,
            "Gráfico 320px sem overflow em " + theme + ": " + overflow,
          );
          await price.scrollIntoViewIfNeeded();
          await page.locator("#cotacao").screenshot({
            path: output + "/price-series-320-" + theme + ".png",
          });
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(origin + "/app/ranking/acao/TIMS3?publication=27");
        await expect(price).toHaveAttribute("data-price-chart", "ready");
        await price.scrollIntoViewIfNeeded();
        await price.screenshot({ path: output + "/price-series-desktop.png" });
      } finally {
        historyEnabled = false;
        privatePublication.entries = previousEntries;
        market.series = {};
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
