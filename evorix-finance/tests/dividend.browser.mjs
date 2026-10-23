import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import {
  dividendColumns,
  dividendValue,
  formatDividendValue,
} from "../dividend-analysis.mjs";
import {
  dividendComparison,
  dividendAnnouncementMonths,
} from "../dividend-insights.mjs";

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
const server = await createServer({
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
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
    else if (url.pathname === "/api/rankings/preview") data = { entries };
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
    else if (url.pathname === "/api/rankings/compare")
      data = {
        from: { title: "Antes" },
        to: { title: "Atual" },
        added: [],
        removed: [],
        unchanged: 89,
        changed: [
          {
            ticker: entries[0].ticker,
            companyName: entries[0].companyName,
            fields: ["dividendAnalysis"],
            before: entries[0],
            after: {
              ...entries[0],
              dividendAnalysis: {
                ...entries[0].dividendAnalysis,
                expectedPayout: "1.5",
              },
            },
          },
        ],
      };
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
  await page.goto(origin + "/app/ranking");
  await page.waitForLoadState("networkidle");
  await run(
    "Ranking: 10→20→90/fim com foco e contagem, 11 colunas e ordem exata",
    async () => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Ranking de dividendos",
      );
      const table = page
        .getByRole("region", { name: "Ranking de dividendos por empresa" })
        .locator("table");
      assert.deepEqual(
        await table
          .locator("thead th")
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.column)),
        dividendColumns
          .filter((column) => column.ranking)
          .map((column) => column.key),
      );
      await page.mouse.move(0, 0);
      for (const column of dividendColumns.filter((column) => column.ranking)) {
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
        const cells = await row.locator("th,td").allTextContents();
        const expected = dividendColumns
          .filter((column) => column.ranking)
          .map((column) =>
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
      assert.match(
        await page.locator(".dividend-table-hint").textContent(),
        /20\/10\/2026/,
      );
      assert.match(await table.textContent(), /19,37/);
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
      await expect(page.locator(".dividend-comparison")).toHaveCount(3);
      for (const button of await page.locator(".dividend-chart-row").all()) {
        const visible = (await button.innerText()).replace(/\s+/g, " ").trim();
        await expect(button).toHaveAccessibleName(visible);
      }
      const exact = formatDividendValue(
        entries[0].dividendAnalysis.marketValue,
        "currency",
      );
      const compact = page.locator(
        '.fc-summary-strip [data-summary="marketValue"] .fc-exact',
      );
      await compact.focus();
      await expect(page.getByRole("tooltip")).toHaveText(exact);
      await compact.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await expect(compact).toBeFocused();
      const bar = page
        .locator(".dividend-chart-row")
        .filter({ hasText: "P/L projetado" })
        .first();
      await bar.focus();
      await expect(page.getByRole("tooltip")).toContainText("P/L projetado");
      await bar.press("Escape");
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
      await expect(page.locator('[data-insight="pe"] > strong')).toHaveText(
        "Não informado",
      );
      await expect(page.locator('[data-insight="price"] > strong')).toHaveText(
        "Não informado",
      );
      await expect(
        page.locator('[data-field="expectedPayout"] dd[data-exact-value]'),
      ).toHaveText("150,00%");
      await expect(
        page.locator('[data-field="safetyMargin"] dd[data-exact-value]'),
      ).toHaveText("-150%");
      await expect(
        page.locator('[data-field="netDebtToEbitda"] dd[data-exact-value]'),
      ).toHaveText("-2");
      await expect(
        page.locator(
          '[data-field="estimatedGrossDividendYield"] dd[data-exact-value]',
        ),
      ).toHaveText("0,00%");
      await expect(
        page.locator('.fc-calendar li[data-announced="true"]'),
      ).toHaveCount(0);
      await expect(page.locator(".fc-calendar")).toContainText(
        "Nenhum mês foi presumido",
      );
      const unavailable = page
        .locator(".dividend-comparison")
        .filter({ hasText: "Cotação de referência e preço teto" });
      await expect(unavailable.locator(".recharts-bar-rectangle")).toHaveCount(
        0,
      );
      await expect(unavailable).toContainText("Comparação indisponível");
      const debt = page.locator('[data-field="netDebtToEbitda"] dt button');
      await debt.focus();
      await expect(page.getByRole("tooltip")).toContainText(
        "não comprova caixa líquido",
      );
      await debt.press("Escape");
      probeEntry = null;
    },
  );
  await run(
    "Detalhe: 21 campos em5categorias por90tickers, valores/fórmulas/calendário exatos",
    async () => {
      for (const entry of entries) {
        await page.goto(
          origin +
            "/app/ranking/acao/" +
            entry.ticker +
            "?visual=real&publication=2",
        );
        await expect(
          page.locator(".dividend-information > [data-field]"),
        ).toHaveCount(21);
        const actual = await page
          .locator(".dividend-information > [data-field]")
          .evaluateAll((nodes) =>
            nodes.map((node) => ({
              key: node.dataset.field,
              label: (
                node.querySelector("dt button") || node.querySelector("dt")
              ).textContent,
              value: node.querySelector("dd[data-exact-value]").dataset
                .exactValue,
            })),
          );
        for (const column of dividendColumns)
          assert.deepEqual(
            actual.find((item) => item.key === column.key),
            {
              key: column.key,
              label: column.label,
              value: formatDividendValue(
                dividendValue(entry, column.key),
                column.format,
              ),
            },
          );
        for (const [index, count] of [6, 1, 3, 5, 3].entries()) {
          await expect(
            page.locator(".fc-category").nth(index).locator(".fc-metric"),
          ).toHaveCount(count);
        }
        await expect(page.locator(".dividend-section-nav a")).toHaveCount(6);
        await expect(page.locator(".fc-calendar li")).toHaveCount(12);
        assert.deepEqual(
          await page
            .locator('.fc-calendar li[data-announced="true"]')
            .evaluateAll((nodes) =>
              nodes.map(
                (node) => [...node.parentNode.children].indexOf(node) + 1,
              ),
            ),
          dividendAnnouncementMonths(
            entry.dividendAnalysis.announcementMonths,
          ) || [],
        );
        const computed = dividendComparison(
          entry.dividendAnalysis.projectedPE,
          entry.dividendAnalysis.averagePE10Years,
        );
        await expect(page.locator('[data-insight="pe"] > strong')).toHaveText(
          formatDividendValue(
            computed === null ? null : String(computed),
            "percent",
          ),
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
    "Comparações: indicadores rotulados e objetos formatados nas versões",
    async () => {
      await page.goto(origin + "/app/ranking?visual=real");
      await page.getByText("Comparar duas empresas", { exact: true }).click();
      await page.getByLabel("Primeira empresa").selectOption(entries[0].ticker);
      await page.getByLabel("Segunda empresa").selectOption(entries[1].ticker);
      const comparison = page.locator("details").filter({
        has: page.locator("summary", { hasText: "Comparar duas empresas" }),
      });
      await expect(comparison.locator("dt")).toHaveCount(21);
      await expect(comparison).toContainText("106,00%");
      await page.getByText("O que mudou na pesquisa?", { exact: true }).click();
      await page
        .getByLabel("Comparar a publicação atual com")
        .selectOption("1");
      await page
        .getByRole("button", { name: "Comparar versões", exact: true })
        .click();
      await page
        .locator("summary")
        .filter({ hasText: /TIMS3.*Análise de dividendos/ })
        .click();
      await expect(page.getByText("150,00%", { exact: true })).toBeVisible();
      assert.ok(
        !(await page.locator("body").textContent()).includes("[object Object]"),
      );
    },
  );
  await run(
    "Prévia/publicação simulada: 90 ativos e 21 campos, sem exigência legada/autoria",
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
      await expect(preview.locator("thead th")).toHaveCount(21);
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
          name: "Ranking de dividendos por empresa",
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
        await expect(
          page.locator(".dividend-information > [data-field]"),
        ).toHaveCount(21);
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
      await expect(highlights).toContainText("Referência: 20/10/2026");
    },
  );
  await run(
    "Legado/demo: módulos e cenário permanecem disponíveis",
    async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(origin + "/app/ranking?visual=demo");
      await expect(page.locator(".research-modules-table")).toBeVisible();
      await expect(page.locator(".dividend-table")).toHaveCount(0);
      await page.locator(".research-table-company-link").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Horizonte",
      );
      await expect(page.locator(".dividend-information")).toHaveCount(0);
      await expect(
        page.getByText("Potencial simulado", { exact: true }).first(),
      ).toBeVisible();
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
