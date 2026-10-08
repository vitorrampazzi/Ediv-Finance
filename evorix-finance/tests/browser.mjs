import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createFixture } from "./fixture.mjs";
const runtime = process.env.EDIV_PLAYWRIGHT_PATH;
const { chromium } = await import(
  runtime ? pathToFileURL(runtime).href : "playwright"
);
const { expect } = await import(
  runtime
    ? new URL("./test.mjs", pathToFileURL(runtime)).href
    : "playwright/test"
);
const fixture = await createFixture();
let vite, browser;
const report = [];
const errors = [];
const root = "http://127.0.0.1:4180";
await mkdir(".test-artifacts", { recursive: true });
async function check(name, work) {
  await work();
  report.push({ name, status: "passed" });
  console.info("PASS:", name);
}
const csv =
  "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos\nPETR4;Empresa de teste A;20;12;12;Tese inicial;Riscos iniciais\nITUB4;Empresa de teste B;10;22;6;Outra tese;Outros riscos";
async function publish(value) {
  const result = await fixture.request(
    fixture.accounts.analyst,
    "/api/rankings",
    {
      method: "POST",
      raw: value,
      headers: {
        "Content-Type": "text/csv",
        "X-File-Name": "teste.csv",
        "X-Publication-Meta": encodeURIComponent(
          JSON.stringify({
            title: "Pesquisa fictícia de teste",
            authorName: "Autor fictício",
          }),
        ),
      },
    },
  );
  assert.equal(result.status, 201);
  return result.body.publicationId;
}
async function context(account, viewport = { width: 1366, height: 900 }) {
  const result = await browser.newContext({
    baseURL: root,
    viewport,
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
  result.on("page", (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
  });
  return result;
}
async function noOverflow(page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(2);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
}
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
    const timeout = setTimeout(
      () => reject(new Error("Vite não iniciou em 30 segundos.")),
      30000,
    );
    vite.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("4180")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    vite.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Vite encerrou com código " + code));
    });
  });
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const guest = await context(null);
  const page = await guest.newPage();
  await check("Servidor abre a home, sem tela vazia ou overlay", async () => {
    await page.goto(root);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).toContainText("Ediv Finance");
    await noOverflow(page);
    await page.screenshot({
      path: ".test-artifacts/home-desktop.png",
      fullPage: true,
    });
  });
  await publish(csv);
  const second = await publish(csv.replace(";20;12;", ";30;13;"));
  await check(
    "Senha permanece oculta por padrão e alterna sem perder valor",
    async () => {
      for (const path of ["/cadastro", "/entrar"]) {
        await page.goto(root + path);
        const field = page.locator(
          path === "/cadastro" ? "#register-password" : "#login-password",
        );
        await expect(field).toHaveAttribute("type", "password");
        await field.fill(fixture.password);
        await page
          .getByRole("button", { name: "Mostrar senha", exact: true })
          .click();
        await expect(field).toHaveAttribute("type", "text");
        await expect(field).toHaveValue(fixture.password);
        await page
          .getByRole("button", { name: "Ocultar senha", exact: true })
          .click();
        await expect(field).toHaveAttribute("type", "password");
      }
    },
  );
  await check(
    "Páginas públicas em 360, 768 e 1366 px sem rolagem horizontal",
    async () => {
      for (const width of [360, 768, 1366]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of [
          "/",
          "/cadastro",
          "/entrar",
          "/ranking",
          "/aprender",
          "/mercado",
          "/assessoria",
        ]) {
          await page.goto(root + path);
          await expect(page.locator("h1,h2").first()).toBeVisible();
          await noOverflow(page);
        }
        if (width === 360) {
          await page.goto(root);
          await expect(page.locator("h1")).toBeVisible();
          await page.screenshot({
            path: ".test-artifacts/home-mobile.png",
            fullPage: true,
          });
        }
      }
    },
  );
  await check(
    "Visitante recebe apresentação do ranking e acesso ao cadastro",
    async () => {
      await page.goto(root + "/ranking");
      await expect(
        page.getByRole("link", { name: /Criar conta/i }).first(),
      ).toBeVisible();
      assert.equal(
        (await page.request.get(root + "/api/rankings")).status(),
        401,
      );
    },
  );
  await check("Login pelo formulário abre a conta", async () => {
    await page.goto(root + "/entrar");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(fixture.accounts.a.email);
    await page.getByLabel("Senha", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/app/ranking");
    await expect(
      page.getByRole("heading", { name: /Ranking de previsões/i }).first(),
    ).toBeVisible();
  });
  await check("Usuário não acessa Administração nem Atendimentos", async () => {
    for (const path of ["/app/admin", "/app/atendimentos"]) {
      await page.goto(root + path);
      await expect(
        page.getByRole("heading", { name: "Acesso restrito" }),
      ).toBeVisible();
    }
  });
  await check(
    "Comparação de empresas, versões e indicador com assistente",
    async () => {
      await page.goto(root + "/app/ranking");
      await page.getByText("Comparar duas empresas", { exact: true }).click();
      await page.getByLabel("Primeira empresa").selectOption("PETR4");
      await page.getByLabel("Segunda empresa").selectOption("ITUB4");
      await expect(page.locator("body")).toContainText("Empresa de teste B");
      await page.getByText("O que mudou na pesquisa?", { exact: true }).click();
      await page
        .getByLabel("Comparar a publicação atual com")
        .selectOption({ index: 1 });
      await page
        .getByRole("button", { name: "Comparar versões", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "alterado(s)" }),
      ).toBeVisible();
      await page.goto(
        root + "/app/ranking/acao/PETR4?visual=real&publication=" + second,
      );
      const help = page
        .locator("summary")
        .filter({ hasText: "Entender este indicador" })
        .first();
      await help.click();
      await page
        .getByRole("button", { name: "Continuar a dúvida no assistente" })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByPlaceholder("Escreva sua dúvida…")).toHaveValue(
        /Explique o conceito/,
      );
      await page
        .getByRole("button", { name: "Fechar assistente", exact: true })
        .click();
      await page.screenshot({
        path: ".test-artifacts/ranking-desktop.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Notificação abre a versão correta e registra leitura",
    async () => {
      await page.getByRole("button", { name: /^Notificações/ }).click();
      await expect(
        page.getByRole("heading", { name: "Notificações de pesquisas" }),
      ).toBeVisible();
      await page.locator("#ediv-notifications a").first().click();
      await expect(page).toHaveURL(new RegExp("publication=" + second));
      await expect
        .poll(async () =>
          (await page.request.get(root + "/api/notifications"))
            .json()
            .then((data) => data.unreadCount),
        )
        .toBe(1);
    },
  );
  await check(
    "Progresso de aula sobrevive à recarga e outra sessão",
    async () => {
      await page.goto(root + "/app/aprender#risco");
      await page
        .getByRole("button", {
          name: "Não; pode reduzir concentração, mas não elimina riscos",
          exact: true,
        })
        .click();
      await expect(page.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      await page.reload();
      await expect(page.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      const other = await context(null);
      await other.addCookies(await guest.cookies());
      const otherPage = await other.newPage();
      await otherPage.goto(root + "/app/aprender#risco");
      await expect(otherPage.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "1",
      );
      await other.close();
    },
  );
  let thread;
  await check("Usuário envia pergunta privada", async () => {
    await page.goto(root + "/app/conversas");
    await page
      .getByLabel("Assunto", { exact: true })
      .fill("Pergunta pelo navegador");
    await page
      .getByLabel("Sua mensagem", { exact: true })
      .fill("Gostaria de aprender sobre riscos.");
    await page
      .getByRole("button", { name: "Enviar pergunta", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pergunta pelo navegador" }),
    ).toBeVisible();
    const response = await page.request.get(root + "/api/support");
    thread = (await response.json()).threads[0].id;
    assert.equal(
      (await page.request.get(root + "/api/support/team")).status(),
      403,
    );
  });
  const analystContext = await context(fixture.accounts.analyst);
  const analystPage = await analystContext.newPage();
  await check("Analista responde e usuário acompanha a resposta", async () => {
    await analystPage.goto(root + "/app/atendimentos");
    await analystPage
      .getByRole("button", { name: /Pergunta pelo navegador/ })
      .click();
    await analystPage
      .getByLabel("Resposta da equipe", { exact: true })
      .fill("Resposta educativa de teste.");
    const savedResponse = analystPage.waitForResponse(
      (response) =>
        response.url().endsWith("/messages") &&
        response.request().method() === "POST",
    );
    await analystPage
      .getByRole("button", { name: "Enviar resposta da equipe", exact: true })
      .click();
    assert.equal((await savedResponse).status(), 201);
    await expect(
      analystPage
        .getByRole("list", { name: "Mensagens da conversa" })
        .getByText("Resposta educativa de teste.", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page
      .getByRole("button", { name: "Buscar novas respostas", exact: true })
      .click();
    await expect(
      page
        .getByRole("list", { name: "Mensagens da conversa" })
        .getByText("Resposta educativa de teste.", { exact: true }),
    ).toBeVisible();
  });
  async function openEditor() {
    await analystPage
      .getByText("Área da equipe · preparar nova publicação", { exact: true })
      .click();
    await analystPage
      .getByText("Criar pesquisa pelo site", { exact: true })
      .click();
  }
  await check(
    "Rascunho salvo recupera ativos, campo incompleto e metadados",
    async () => {
      await analystPage.goto(root + "/app/ranking");
      await openEditor();
      await analystPage
        .getByLabel("Título da publicação", { exact: true })
        .fill("Pesquisa salva pelo navegador");
      await analystPage.getByLabel("Ticker *", { exact: true }).fill("PETR4");
      await analystPage
        .getByLabel("Empresa *", { exact: true })
        .fill("Empresa do rascunho");
      await analystPage
        .getByLabel("Potencial (%) *", { exact: true })
        .fill("25");
      await analystPage
        .getByRole("button", {
          name: "Adicionar ativo ao rascunho",
          exact: true,
        })
        .click();
      await analystPage.getByLabel("Ticker *", { exact: true }).fill("ITUB4");
      await analystPage
        .getByRole("button", { name: "Salvar novo rascunho", exact: true })
        .click();
      await expect(
        analystPage.getByRole("status").filter({ hasText: "Rascunho salvo" }),
      ).toBeVisible();
      await analystPage.reload();
      await openEditor();
      await analystPage
        .getByRole("button", { name: "Ver rascunhos salvos", exact: true })
        .click();
      analystPage.once("dialog", (dialog) => dialog.accept());
      await analystPage
        .getByRole("button", { name: "Abrir", exact: true })
        .click();
      await expect(
        analystPage.getByLabel("Ticker *", { exact: true }),
      ).toHaveValue("ITUB4");
      await expect(
        analystPage.getByLabel("Título da publicação", { exact: true }),
      ).toHaveValue("Pesquisa salva pelo navegador");
      await expect(
        analystPage.getByText("Rascunho · 1 ativo(s)", { exact: true }),
      ).toBeVisible();
    },
  );
  await check("Editor passa pela prévia e publicação explícita", async () => {
    await analystPage
      .getByRole("button", {
        name: "Usar rascunho para preparar prévia",
        exact: true,
      })
      .click();
    await analystPage
      .getByRole("button", { name: "Validar e ver prévia", exact: true })
      .click();
    await expect(
      analystPage.getByRole("heading", {
        name: "Prévia · 1 ativos",
        exact: true,
      }),
    ).toBeVisible();
    await analystPage
      .getByRole("button", {
        name: "Confirmar e publicar esta versão",
        exact: true,
      })
      .click();
    await expect(
      analystPage.getByRole("status").filter({ hasText: "Publicação salva" }),
    ).toBeVisible();
  });
  await check("Área da equipe e ranking mantêm responsividade", async () => {
    for (const width of [360, 768, 1366]) {
      await analystPage.setViewportSize({ width, height: 900 });
      for (const path of [
        "/app/ranking",
        "/app/atendimentos",
        "/app/aprender",
        "/app/config",
      ]) {
        await analystPage.goto(root + path);
        await expect(analystPage.locator("h1,h2").first()).toBeVisible();
        await noOverflow(analystPage);
      }
      if (width === 360)
        await analystPage.screenshot({
          path: ".test-artifacts/settings-mobile.png",
          fullPage: true,
        });
    }
  });
  await check("Falha da IA mantém alternativa educativa local", async () => {
    fixture.state.ai = "down";
    await fixture.clearLimits();
    await page.goto(root + "/app/aprender");
    await page
      .getByRole("button", { name: "Abrir ajuda da Ediv", exact: true })
      .click();
    await page.getByRole("button", { name: "Usar IA", exact: true }).click();
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page
      .getByPlaceholder("Escreva sua dúvida…")
      .fill("O que é diversificação?");
    const failedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/assistant/chat") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Enviar pergunta", exact: true })
      .click();
    assert.equal((await failedResponse).status(), 503);
    await expect(page.getByRole("dialog")).toContainText(
      "Resposta educativa local (a IA não respondeu)",
      {
        timeout: 30000,
      },
    );
    await expect(page.getByRole("dialog")).toContainText(
      /concentra|diversificar/i,
    );
  });
  await check(
    "Administrador gerencia perfil e vê auditoria no celular",
    async () => {
      const adminContext = await context(fixture.accounts.admin, {
        width: 360,
        height: 900,
      });
      const adminPage = await adminContext.newPage();
      await adminPage.goto(root + "/app/admin");
      await expect(
        adminPage.getByRole("heading", {
          name: "Contas e permissões",
          exact: true,
        }),
      ).toBeVisible();
      await noOverflow(adminPage);
      const card = adminPage
        .locator("article")
        .filter({ hasText: fixture.accounts.b.email });
      await card
        .getByRole("button", { name: "Gerenciar acesso", exact: true })
        .click();
      await adminPage
        .getByRole("region", { name: /^Acesso de/ })
        .getByRole("combobox")
        .selectOption("ANALYST");
      await adminPage
        .getByRole("button", { name: "Revisar alteração", exact: true })
        .click();
      await adminPage
        .getByRole("button", { name: "Confirmar alteração", exact: true })
        .click();
      await expect(
        adminPage.getByRole("status").filter({ hasText: "Acesso atualizado" }),
      ).toBeVisible();
      await expect(
        adminPage.getByText("Perfil alterado", { exact: true }),
      ).toBeVisible();
      await noOverflow(adminPage);
      await adminPage.screenshot({
        path: ".test-artifacts/admin-mobile.png",
        fullPage: true,
      });
      await adminContext.close();
    },
  );
  assert.equal(errors.length, 0, "Erros de JavaScript: " + errors.join(" | "));
  await check("Nenhum erro de JavaScript nas telas visitadas", async () => {});
  await writeFile(
    ".test-artifacts/browser-report.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks: report,
        pageErrors: errors,
        services: "brapi e Gemini simulados; API e MySQL reais isolados",
      },
      null,
      2,
    ),
  );
  console.info("Verificações do navegador concluídas:", report.length);
} catch (error) {
  if (browser) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    for (let i = 0; i < pages.length; i++)
      await pages[i]
        .screenshot({
          path: `.test-artifacts/failure-${i}.png`,
          fullPage: true,
        })
        .catch(() => {});
  }
  await writeFile(
    ".test-artifacts/browser-report.json",
    JSON.stringify(
      { checks: report, error: error.message, pageErrors: errors },
      null,
      2,
    ),
  );
  throw error;
} finally {
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
