import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";

// Local UI contract fixture; the full workbook is never imported into client code.
const audit = process.env.EDIV_WORKBOOK_AUDIT
  ? JSON.parse(await readFile(process.env.EDIV_WORKBOOK_AUDIT, "utf8"))
  : null;
const entries = audit
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
const publication = {
  id: "27",
  title: "Ranking publicado de teste",
  updatedAt: "2026-10-22T12:32:01Z",
  totalEntries: entries.length,
  entries,
};
const privatePublication = {
  ...publication,
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
    "Home: loading explícito e10ações reais,12colunas/posição/logos/ordem",
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
      await expect(section.locator("tbody tr")).toHaveCount(10);
      await expect(section.locator("thead th")).toHaveText([
        "Posição",
        ...dividendColumns
          .filter((column) => column.ranking)
          .map((column) => column.label),
      ]);
      for (let i = 0; i < 10; i++) {
        const row = section.locator("tbody tr").nth(i);
        const cells = await row.locator("th,td").allTextContents();
        assert.equal(cells[0], String(entries[i].rank));
        assert.ok(cells[1].includes(entries[i].companyName));
        assert.deepEqual(
          cells.slice(2),
          dividendColumns
            .filter((column) => column.ranking && column.key !== "companyName")
            .map((column) =>
              formatDividendValue(
                dividendValue(entries[i], column.key),
                column.format,
              ),
            ),
        );
        assert.equal(await row.locator(".company-logo").count(), 1);
      }
      await expect(section).not.toContainText("Potencial simulado");
      await expect(section).not.toContainText("Demonstração");
    },
  );
  await run("Ver mais:10→20→90/fim, contador e foco previsíveis", async () => {
    const section = page.locator("#caderno-de-exemplo");
    const more = section.getByRole("button", {
      name: "Ver mais ações",
      exact: true,
    });
    await more.focus();
    await more.press("Enter");
    await expect(section.locator("tbody tr")).toHaveCount(20);
    await expect(
      section.locator("tbody tr").nth(10).getByRole("link"),
    ).toBeFocused();
    await expect(page.locator("#public-ranking-count")).toHaveText(
      "20 de 90 ações exibidas",
    );
    for (let count = 30; count <= 90; count += 10) {
      await more.click();
      await expect(section.locator("tbody tr")).toHaveCount(count);
    }
    await expect(more).toHaveCount(0);
    await expect(page.locator("#public-ranking-count")).toHaveText(
      "90 de 90 ações exibidas",
    );
    await expect(
      section.locator("tbody tr").last().locator("td").nth(1),
    ).toHaveText(entries[89].ticker);
  });
  await run(
    "Link público preserva ticker/publicação no destino autenticado",
    async () => {
      const link = page
        .locator("#public-ranking-results .dividend-company-link")
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
  await run("Home: vazio sem fake, erro com retry e retorno a10", async () => {
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
    await expect(page.locator("#public-ranking-results tbody tr")).toHaveCount(
      10,
    );
  });
  signedIn = true;
  await run(
    "Empresa: seis resumos, comparativo principal e21campos/3tickers",
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
          page.locator(".dividend-overview-cards > div"),
        ).toHaveCount(6);
        await expect(
          page.locator(".dividend-information > [data-field]"),
        ).toHaveCount(21);
        const fields = await page
          .locator(".dividend-information > [data-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              key: node.dataset.field,
              value: node.querySelector("dd[data-exact-value]").dataset
                .exactValue,
            })),
          );
        for (const column of dividendColumns)
          assert.equal(
            fields.find((item) => item.key === column.key).value,
            formatDividendValue(
              dividendValue(entry, column.key),
              column.format,
            ),
          );
        for (const [id, count] of [
          ["visao-geral", 7],
          ["valuation", 5],
          ["dividendos", 5],
          ["resultados", 4],
        ])
          await expect(page.locator("#" + id + " [data-field]")).toHaveCount(
            count,
          );
        await expect(
          page.locator(".dividend-price-panel .dividend-comparison"),
        ).toHaveCount(1);
        assert.ok(
          await page
            .locator(".dividend-price-panel")
            .evaluate((node) =>
              Boolean(
                node.compareDocumentPosition(
                  document.getElementById("dividendos"),
                ) & Node.DOCUMENT_POSITION_FOLLOWING,
              ),
            ),
        );
        await expect(page.locator(".dividend-calendar li")).toHaveCount(12);
      }
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
      await page.screenshot({
        path: output + "/company-desktop.png",
        fullPage: true,
      });
      await page
        .locator(".dividend-dashboard-header")
        .screenshot({ path: output + "/company-header.png" });
      await page
        .locator(".dividend-price-panel")
        .screenshot({ path: output + "/company-primary-comparison.png" });
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
          page.locator("#public-ranking-results tbody tr"),
        ).toHaveCount(10);
        const region = page
          .locator("#public-ranking-results")
          .getByRole("region");
        await region.focus();
        await page.keyboard.press("ArrowRight");
        await expect
          .poll(() => region.evaluate((node) => node.scrollLeft))
          .toBeGreaterThan(0);
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
          page.locator(".dividend-overview-cards > div"),
        ).toHaveCount(6);
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
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
        const nav = page.getByRole("navigation", { name: "Seções da análise" });
        await nav
          .getByRole("link", { name: "Dividendos e distribuição", exact: true })
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
        fixture: audit
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
