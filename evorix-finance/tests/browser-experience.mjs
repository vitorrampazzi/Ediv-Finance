import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { createFixture } from "./fixture.mjs";
import { lessons } from "../server/learning-content.js";

const fixture = await createFixture();
const root = "http://127.0.0.1:4180";
const checks = [];
const errors = [];
let vite;
let browser;
await mkdir(".test-artifacts", { recursive: true });
async function check(name, work) {
  try {
    await work();
    checks.push({ name, status: "passed" });
    console.info("PASS:", name);
  } catch (error) {
    checks.push({ name, status: "failed", error: error.message });
    console.error("FAIL:", name, error.message.split("\n")[0]);
    for (const [index, page] of browser
      .contexts()
      .flatMap((context) => context.pages())
      .entries())
      await page
        .screenshot({
          path: `.test-artifacts/experience-failure-${checks.length}-${index}.png`,
          fullPage: true,
        })
        .catch(() => {});
  }
}
async function context(account, width = 1366) {
  const result = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  if (account) {
    const [name, value] = account.cookie.split("=");
    await result.addCookies([
      {
        name,
        value,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
  }
  result.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  return result;
}
const progress = (page) =>
  page.getByRole("progressbar", {
    name: "Progresso dos exercícios da trilha",
    exact: true,
  });
try {
  vite = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4180",
      "--strictPort",
    ],
    {
      env: { ...process.env, EDIV_API_PROXY_TARGET: fixture.origin },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Vite não iniciou.")),
      30000,
    );
    vite.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("4180")) {
        clearTimeout(timer);
        resolve();
      }
    });
    vite.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Vite encerrou: " + code));
    });
  });
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const guest = await context(null, 360);
  const publicPage = await guest.newPage();
  const member = await context(fixture.accounts.a);
  const page = await member.newPage();
  const staff = await context(fixture.accounts.analyst);
  const staffPage = await staff.newPage();
  const csv =
    "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos;periodo_referencia;fonte_dados\nPETR4;Empresa de teste A;20;12;12;Tese de teste;Risco de teste;2026;https://example.com/relatorio\nITUB4;Empresa de teste B;10;22;6;Outra tese;Outros riscos;2026;Relatório de teste";
  const publication = await fixture.request(
    fixture.accounts.analyst,
    "/api/rankings",
    {
      method: "POST",
      raw: csv,
      headers: {
        "Content-Type": "text/csv",
        "X-File-Name": "experiencia.csv",
        "X-Publication-Meta": encodeURIComponent(
          JSON.stringify({ title: "Pesquisa fictícia de experiência" }),
        ),
      },
    },
  );
  assert.equal(publication.status, 201);
  const publicationId = publication.body.publicationId;

  await check("Menu público móvel abre, navega e fecha", async () => {
    await publicPage.goto(root);
    await publicPage
      .getByRole("button", { name: "Abrir menu", exact: true })
      .click();
    await expect(publicPage.locator("#public-mobile-menu")).toBeVisible();
    await publicPage
      .locator("#public-mobile-menu")
      .getByRole("link", { name: "Aprender", exact: true })
      .click();
    await publicPage.waitForURL("**/aprender");
    await expect(publicPage.locator("#public-mobile-menu")).toHaveCount(0);
  });
  await check(
    "Visitante pode concluir primeira aula, mas não vê texto da aula restrita",
    async () => {
      await publicPage.goto(root + "/aprender#ranking");
      await publicPage
        .getByRole("button", {
          name: lessons[0].choices[lessons[0].answer],
          exact: true,
        })
        .click();
      await expect(progress(publicPage)).toHaveAttribute("aria-valuenow", "1");
      await publicPage.reload();
      await expect(progress(publicPage)).toHaveAttribute("aria-valuenow", "1");
      await publicPage.locator('[data-playlist-item="risco"]').click();
      await expect(publicPage.locator("#sala-de-aula")).toContainText(
        /conta gratuita|criar conta/i,
      );
      assert.ok(
        !(await publicPage.locator("#sala-de-aula").innerText()).includes(
          lessons[1].text,
        ),
      );
    },
  );
  await check("Ranking filtra e limpar filtros recupera a lista", async () => {
    await page.goto(root + "/app/ranking?visual=real");
    await expect(
      page.getByRole("link", {
        name: "Abrir pesquisa de Empresa de teste A (PETR4)",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByPlaceholder("Empresa ou ticker")
      .fill("SEM_RESULTADO_TESTE");
    await expect(
      page.getByRole("heading", {
        name: "Nenhuma ação corresponde à busca",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Limpar filtros", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("link", {
        name: "Abrir pesquisa de Empresa de teste A (PETR4)",
        exact: true,
      }),
    ).toBeVisible();
  });
  await check(
    "Caderno começa no topo, abre fonte segura e preserva a publicação",
    async () => {
      await page.goto(
        root +
          `/app/ranking/acao/PETR4?visual=real&publication=${publicationId}`,
      );
      await expect(
        page.getByRole("heading", { name: "Empresa de teste A", exact: true }),
      ).toBeVisible();
      assert.ok(await page.evaluate(() => window.scrollY < 5));
      await page
        .getByRole("navigation", { name: "Seções da pesquisa" })
        .getByRole("link", { name: "Fontes e versão", exact: true })
        .click();
      const source = page.getByRole("link", {
        name: /https:\/\/example.com\/relatorio/,
      });
      await expect(source).toHaveAttribute("rel", "noopener noreferrer");
      await expect(source).toHaveAttribute("target", "_blank");
      const next = page.getByRole("link", { name: /Próxima pesquisa.*ITUB4/i });
      await next.click();
      await expect(page).toHaveURL(
        new RegExp(`ITUB4.*publication=${publicationId}`),
      );
      await expect(
        page.getByRole("heading", { name: "Empresa de teste B", exact: true }),
      ).toBeVisible();
      assert.ok(await page.evaluate(() => window.scrollY < 5));
    },
  );
  await check(
    "Falha do catálogo não é apresentada como zero resultados; retry funciona",
    async () => {
      await page.route("**/api/market/assets?**", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada de catálogo" }),
        }),
      );
      await page.goto(root + "/app/analises");
      await expect(page.getByRole("alert")).toContainText("Falha simulada");
      await expect(page.getByRole("status")).toContainText(
        "Resultados indisponíveis",
      );
      await expect(
        page.getByRole("button", { name: "Próxima", exact: true }),
      ).toBeDisabled();
      await page.unroute("**/api/market/assets?**");
      await page
        .getByRole("button", { name: "Tentar novamente", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "PETR4", exact: true }),
      ).toBeVisible();
    },
  );
  await check(
    "Aulas recuperam erro de carregamento com uma nova consulta",
    async () => {
      await page.route("**/api/learning", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada de aulas" }),
        }),
      );
      await page.goto(root + "/app/aprender");
      await expect(page.getByRole("alert")).toContainText(
        "Falha simulada de aulas",
      );
      await page.unroute("**/api/learning");
      await page
        .getByRole("button", { name: "Tentar carregar novamente", exact: true })
        .click();
      await expect(page.locator("#classroom-title")).toContainText(
        lessons[0].title,
      );
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
    },
  );
  await check(
    "Resposta errada não conclui; falha ao salvar oferece retry sem progresso falso",
    async () => {
      await page.goto(root + "/app/aprender#ranking");
      await page
        .getByRole("button", { name: lessons[0].choices[0], exact: true })
        .click();
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
      await page.route("**/api/learning/progress/ranking", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Falha simulada ao salvar" }),
        }),
      );
      await page
        .getByRole("button", {
          name: lessons[0].choices[lessons[0].answer],
          exact: true,
        })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Falha simulada ao salvar",
      );
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
      await page.unroute("**/api/learning/progress/ranking");
      await page
        .getByRole("button", { name: "Tentar salvar novamente", exact: true })
        .click();
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "1");
    },
  );
  await check(
    "Reiniciar exercícios pede confirmação; cancelar preserva e confirmar apaga",
    async () => {
      await page
        .getByRole("button", { name: "Reiniciar progresso", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Manter progresso", exact: true })
        .click();
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "1");
      await page
        .getByRole("button", { name: "Reiniciar progresso", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Confirmar reinício", exact: true })
        .click();
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
      await page.reload();
      await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
    },
  );
  await check(
    "Playlist no celular mantém foco e posição; Voltar restaura a aula",
    async () => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(root + "/app/aprender?aula=ranking#sala-de-aula");
      const first = page.locator('[data-playlist-item="ranking"]');
      await first.click();
      const before = await page.evaluate(() => window.scrollY);
      await first.press("ArrowRight");
      await expect(page).toHaveURL(/aula=risco/);
      await expect(page.locator('[data-playlist-item="risco"]')).toBeFocused();
      assert.ok(
        Math.abs((await page.evaluate(() => window.scrollY)) - before) <= 4,
      );
      await page.goBack();
      await expect(page.locator("#classroom-title")).toContainText(
        lessons[0].title,
      );
      await page
        .getByRole("button", {
          name: "Abrir minicurso: Da empresa ao dividendo",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(/aula=dividendos/);
      await expect(page.locator("#classroom-title")).toBeFocused();
    },
  );
  await check(
    "Laboratório calcula DY, payout e potencial e rejeita base zero",
    async () => {
      await page.goto(root + "/app/aprender");
      const lab = page.locator("#laboratorio");
      await expect(lab.getByRole("status")).toContainText("5");
      await lab
        .getByLabel("Proventos por ação no período (R$)", { exact: true })
        .fill("4");
      await expect(lab.getByRole("status")).toContainText("10");
      await lab
        .getByLabel("Preço de referência (R$)", { exact: true })
        .fill("0");
      await expect(lab.getByRole("status")).toContainText(
        "base maior que zero",
      );
      await lab.getByRole("button", { name: "Payout", exact: true }).click();
      await expect(lab.getByRole("status")).toContainText("50");
      await lab
        .getByRole("button", { name: "Potencial de preço", exact: true })
        .click();
      await expect(lab.getByRole("status")).toContainText("20");
    },
  );
  await check("Sessão expirada ao concluir aula retorna ao login", async () => {
    const expired = await context(fixture.accounts.b);
    const expiredPage = await expired.newPage();
    await expiredPage.goto(root + "/app/aprender#ranking");
    await expect(expiredPage.locator("#classroom-title")).toBeVisible();
    await fixture.pool.execute("DELETE FROM user_sessions WHERE user_id=?", [
      fixture.accounts.b.id,
    ]);
    await expiredPage
      .getByRole("button", {
        name: lessons[0].choices[lessons[0].answer],
        exact: true,
      })
      .click();
    await expiredPage.waitForURL((url) => url.pathname === "/entrar");
    const [rows] = await fixture.pool.execute(
      "SELECT lesson_id FROM learning_progress WHERE user_id=?",
      [fixture.accounts.b.id],
    );
    assert.equal(rows.length, 0);
    await expired.close();
  });
  await check(
    "Editor invalida prévia quando uma empresa ou autoria muda",
    async () => {
      await staffPage.goto(root + "/app/ranking#publicar-pesquisa");
      await staffPage
        .getByText("Criar pesquisa pelo site · editor guiado", { exact: true })
        .click();
      await staffPage.getByLabel("Ticker *", { exact: true }).fill("VALE3");
      await staffPage
        .getByLabel("Empresa *", { exact: true })
        .fill("Empresa de teste C");
      await staffPage.getByRole("button", { name: /2\.\s*Cenário/ }).click();
      await staffPage
        .getByLabel("Potencial (%) *", { exact: true })
        .fill("12,5");
      await staffPage
        .getByRole("button", { name: "Adicionar empresa à lista", exact: true })
        .click();
      async function preview() {
        await staffPage
          .getByRole("button", {
            name: "Preparar lista para validar e ver prévia",
            exact: true,
          })
          .click();
        await staffPage
          .getByRole("button", { name: "Validar e ver prévia", exact: true })
          .click();
        await expect(
          staffPage.getByRole("heading", {
            name: "Prévia · 1 ações",
            exact: true,
          }),
        ).toBeVisible();
      }
      await preview();
      await staffPage
        .getByLabel("Nome profissional (opcional)", { exact: true })
        .fill("Autor fictício de teste");
      await expect(
        staffPage.getByRole("button", {
          name: "Confirmar e publicar esta versão",
          exact: true,
        }),
      ).toHaveCount(0);
      await staffPage
        .getByRole("button", { name: "Validar e ver prévia", exact: true })
        .click();
      await expect(
        staffPage.getByRole("heading", {
          name: "Prévia · 1 ações",
          exact: true,
        }),
      ).toBeVisible();
      await staffPage
        .getByRole("button", { name: "Editar VALE3", exact: true })
        .click();
      await staffPage
        .getByLabel("Empresa *", { exact: true })
        .fill("Empresa de teste C corrigida");
      await expect(
        staffPage.getByRole("button", {
          name: "Confirmar e publicar esta versão",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        staffPage.getByRole("button", {
          name: "Preparar lista para validar e ver prévia",
          exact: true,
        }),
      ).toBeDisabled();
      const current = await fixture.request(
        fixture.accounts.analyst,
        "/api/rankings",
      );
      assert.equal(current.body.id, String(publicationId));
    },
  );
  await check(
    "Importação recusa extensão, tamanho, Excel corrompido e ticker repetido",
    async () => {
      await staffPage.goto(root + "/app/ranking?visual=real#publicar-pesquisa");
      const picker = staffPage.getByLabel("Planilha CSV ou Excel", {
        exact: true,
      });
      const validate = staffPage.getByRole("button", {
        name: "Validar e ver prévia",
        exact: true,
      });
      for (const file of [
        {
          name: "pesquisa.exe",
          mimeType: "application/octet-stream",
          buffer: Buffer.from("teste"),
        },
        {
          name: "grande.csv",
          mimeType: "text/csv",
          buffer: Buffer.alloc(1_048_577, 65),
        },
      ]) {
        await picker.setInputFiles(file);
        await validate.click();
        await expect(staffPage.getByRole("alert")).toContainText(
          "Use CSV UTF-8 ou .xlsx de até 1 MB.",
        );
        await expect(
          staffPage.getByRole("button", {
            name: "Confirmar e publicar esta versão",
            exact: true,
          }),
        ).toHaveCount(0);
      }
      await picker.setInputFiles({
        name: "corrompido.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("arquivo inválido"),
      });
      await validate.click();
      await expect(staffPage.getByRole("alert")).toContainText(
        "Não foi possível ler o Excel",
      );
      await picker.setInputFiles({
        name: "repetida.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          csv + "\nPETR4;Repetida;10;10;6;Tese;Risco;2026;Teste",
        ),
      });
      await validate.click();
      await expect(staffPage.getByRole("alert")).toContainText(
        /repetid|duplicad/i,
      );
      const current = await fixture.request(
        fixture.accounts.analyst,
        "/api/rankings",
      );
      assert.equal(current.body.id, String(publicationId));
    },
  );
  await check(
    "CSV passa pela prévia; trocar por Excel invalida a prévia anterior",
    async () => {
      const picker = staffPage.getByLabel("Planilha CSV ou Excel", {
        exact: true,
      });
      await picker.setInputFiles({
        name: "pesquisa.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
      await staffPage
        .getByRole("button", { name: "Validar e ver prévia", exact: true })
        .click();
      await expect(
        staffPage.getByRole("heading", {
          name: "Prévia · 2 ações",
          exact: true,
        }),
      ).toBeVisible();
      const current = await fixture.request(
        fixture.accounts.analyst,
        "/api/rankings",
      );
      assert.equal(current.body.id, String(publicationId));
      await picker.setInputFiles(
        fileURLToPath(
          new URL("./fixtures/import-ranking.xlsx", import.meta.url),
        ),
      );
      await expect(
        staffPage.getByRole("heading", {
          name: "Prévia · 2 ações",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        staffPage.getByRole("button", {
          name: "Confirmar e publicar esta versão",
          exact: true,
        }),
      ).toHaveCount(0);
    },
  );
  await check(
    "Excel preserva decimais, publica após confirmação e mantém o histórico",
    async () => {
      await staffPage
        .getByLabel("Título da publicação", { exact: true })
        .fill("Importação Excel fictícia de teste");
      const response = staffPage.waitForResponse(
        (response) =>
          response.url().endsWith("/api/rankings/preview") &&
          response.request().method() === "POST",
      );
      await staffPage
        .getByRole("button", { name: "Validar e ver prévia", exact: true })
        .click();
      const preview = await response;
      assert.equal(preview.status(), 200);
      await expect(
        staffPage.getByRole("heading", {
          name: "Prévia · 1 ações",
          exact: true,
        }),
      ).toBeVisible();
      const table = staffPage.getByRole("table", {
        name: "Ativos a publicar",
        exact: true,
      });
      await expect(
        table.getByRole("cell", { name: "VALE3", exact: true }),
      ).toBeVisible();
      assert.equal(
        Number(
          (await table.getByRole("cell").nth(1).innerText()).replace("%", ""),
        ),
        27.5,
      );
      await staffPage
        .getByRole("button", {
          name: "Confirmar e publicar esta versão",
          exact: true,
        })
        .click();
      await expect(
        staffPage.getByRole("status").filter({ hasText: "Publicação salva" }),
      ).toBeVisible();
      const current = await fixture.request(
        fixture.accounts.analyst,
        "/api/rankings",
      );
      assert.notEqual(current.body.id, String(publicationId));
      assert.equal(current.body.history.length, 2);
      assert.equal(current.body.title, "Importação Excel fictícia de teste");
      assert.equal(current.body.entries.length, 1);
      assert.equal(current.body.entries[0].ticker, "VALE3");
      assert.equal(Number(current.body.entries[0].expectedReturnPercent), 27.5);
      assert.equal(Number(current.body.entries[0].targetPrice), 42.75);
      await page.goto(root + "/app/ranking?visual=real");
      await page
        .getByRole("link", {
          name: "Abrir pesquisa de Empresa fictícia Excel (VALE3)",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Empresa fictícia Excel",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByText("27,5%", { exact: true })).toBeVisible();
      await expect(
        page.getByText(/R\$\s*42,75/, { exact: true }),
      ).toBeVisible();
    },
  );
  await check(
    "Nenhuma exceção JavaScript nos cenários complementares",
    async () => assert.deepEqual(errors, []),
  );
} finally {
  await writeFile(
    ".test-artifacts/experience-report.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        pageErrors: errors,
        services:
          "API e MySQL reais temporários; provedores e falhas simulados",
      },
      null,
      2,
    ),
  );
  if (browser) await browser.close();
  if (vite) {
    vite.kill();
    await new Promise((resolve) => {
      if (vite.exitCode !== null) resolve();
      else {
        vite.once("exit", resolve);
        setTimeout(resolve, 5000);
      }
    });
  }
  await fixture.cleanup();
}
console.info(
  "Resultado experiência:",
  checks.filter((check) => check.status === "passed").length,
  "/",
  checks.length,
);
if (checks.some((check) => check.status === "failed")) process.exitCode = 1;
