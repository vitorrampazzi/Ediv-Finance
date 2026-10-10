import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  const journeyEmail = `journey-${Date.now()}@ediv.test`;
  let journeyPassword = fixture.password;
  let verificationLink;
  let journeyId;
  async function loginJourney(password = journeyPassword) {
    await page.goto(root + "/entrar?next=%2Fapp%2Faprender");
    await page.getByLabel("E-mail", { exact: true }).fill(journeyEmail);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await check(
    "Cadastro: campos obrigatórios e e-mail inválido não enviam dados",
    async () => {
      await page.goto(root + "/cadastro?next=%2Fapp%2Faprender");
      await expect(page.locator("#register-name")).toBeVisible();
      await page
        .getByRole("button", { name: "Criar conta grátis", exact: true })
        .click();
      await expect(page.locator("#register-name:invalid")).toBeVisible();
      await page.getByLabel("Nome", { exact: true }).fill("Usuário temporário");
      await page.getByLabel("E-mail", { exact: true }).fill("invalido");
      await page.getByLabel("Senha", { exact: true }).fill(journeyPassword);
      await page
        .getByRole("button", { name: "Criar conta grátis", exact: true })
        .click();
      await expect(page.locator("#register-email:invalid")).toBeVisible();
      const [users] = await fixture.pool.execute(
        "SELECT id FROM users WHERE email=?",
        [journeyEmail],
      );
      assert.equal(users.length, 0);
    },
  );
  await check(
    "Cadastro pelo formulário cria conta pendente e oferece confirmação",
    async () => {
      await page.getByLabel("E-mail", { exact: true }).fill(journeyEmail);
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/auth/register") &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Criar conta grátis", exact: true })
        .click();
      assert.equal((await responsePromise).status(), 202);
      await expect(
        page.getByRole("heading", {
          name: "Próximo passo: confirmar seu e-mail",
        }),
      ).toBeVisible();
      verificationLink = await page
        .getByRole("link", {
          name: "Confirmar e-mail (ambiente de desenvolvimento)",
          exact: true,
        })
        .getAttribute("href");
      const [users] = await fixture.pool.execute(
        "SELECT id,email_verified_at FROM users WHERE email=?",
        [journeyEmail],
      );
      assert.equal(users.length, 1);
      assert.equal(users[0].email_verified_at, null);
      journeyId = users[0].id;
    },
  );
  await check(
    "Reenvio de confirmação gera novo link e bloqueia clique duplicado",
    async () => {
      const previousLink = verificationLink;
      await page
        .getByRole("button", { name: "Reenviar confirmação", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: /Reenviar em \d+s/ }),
      ).toBeDisabled();
      verificationLink = await page
        .getByRole("link", {
          name: "Confirmar e-mail (ambiente de desenvolvimento)",
          exact: true,
        })
        .getAttribute("href");
      assert.notEqual(verificationLink, previousLink);
    },
  );
  await check("Login da conta pendente é recusado", async () => {
    await loginJourney();
    await expect(page.getByRole("alert")).toContainText(/confirmad/i);
    assert.match(page.url(), /\/entrar/);
  });
  await check(
    "Link de confirmação valida a conta sem autenticar automaticamente",
    async () => {
      let verificationRequests = 0;
      const countVerification = (request) => {
        if (
          request.url().endsWith("/api/auth/verify-email") &&
          request.method() === "POST"
        )
          verificationRequests++;
      };
      page.on("request", countVerification);
      await page.goto(verificationLink);
      await expect(
        page.getByText(
          "E-mail confirmado. Agora você pode entrar na sua conta.",
          { exact: true },
        ),
      ).toBeVisible();
      page.off("request", countVerification);
      assert.equal(
        verificationRequests,
        1,
        "A confirmação deve consumir o token somente uma vez",
      );
      const [users] = await fixture.pool.execute(
        "SELECT email_verified_at FROM users WHERE id=?",
        [journeyId],
      );
      assert.ok(users[0].email_verified_at);
      assert.equal(
        (await page.request.get(root + "/api/auth/me")).status(),
        401,
      );
    },
  );
  await check(
    "Senha errada mostra erro e login correto preserva destino",
    async () => {
      await fixture.clearLimits();
      await loginJourney("Senha-incorreta-temporaria!");
      await expect(page.getByRole("alert")).toBeVisible();
      await page.getByLabel("Senha", { exact: true }).fill(journeyPassword);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL("**/app/aprender");
      await expect(
        page.getByRole("progressbar", {
          name: "Progresso dos exercícios da trilha",
          exact: true,
        }),
      ).toHaveAttribute("aria-valuenow", "0");
      await page.goto(root + "/app/perfil");
      await expect(page.locator("body")).toContainText(journeyEmail);
      await expect(page.locator("body")).toContainText("Confirmado");
    },
  );
  await check(
    "Exportação pela tela contém somente a conta e não expõe hashes",
    async () => {
      await page.goto(root + "/app/config");
      const downloaded = page.waitForEvent("download");
      await page
        .getByRole("link", { name: "Baixar meus dados (JSON)", exact: true })
        .click();
      const download = await downloaded;
      const text = await readFile(await download.path(), "utf8");
      const data = JSON.parse(text);
      assert.equal(data.profile.email, journeyEmail);
      assert.equal(data.profile.id, journeyId);
      assert.ok(Array.isArray(data.learningProgress));
      assert.ok(
        !text.includes("password_hash") && !text.includes("token_hash"),
      );
      assert.ok(!text.includes(fixture.accounts.admin.email));
    },
  );
  await check(
    "Logout encerra a sessão e restringe a área da conta",
    async () => {
      await page
        .getByRole("button", { name: /^Abrir menu da conta de/ })
        .click();
      await page
        .getByRole("button", { name: "Sair da conta", exact: true })
        .click();
      await page.waitForURL("**/entrar");
      assert.equal(
        (await page.request.get(root + "/api/auth/me")).status(),
        401,
      );
      await page.goto(root + "/app/config");
      await page.waitForURL((url) => url.pathname === "/entrar");
    },
  );
  let resetLink;
  await check(
    "Esqueci minha senha oferece link de teste para a conta confirmada",
    async () => {
      await page.goto(root + "/recuperar-senha");
      await page.getByLabel("E-mail", { exact: true }).fill(journeyEmail);
      await page
        .getByRole("button", { name: "Enviar link", exact: true })
        .click();
      await expect(page.getByRole("status")).toContainText(
        /link|enviamos|enviado/i,
      );
      resetLink = await page
        .getByRole("link", {
          name: "Link local de desenvolvimento",
          exact: true,
        })
        .getAttribute("href");
      assert.ok(resetLink);
    },
  );
  await check(
    "Redefinição rejeita senhas diferentes e aceita senha válida",
    async () => {
      await page.goto(resetLink);
      journeyPassword = fixture.password + "-reset";
      await page
        .getByLabel("Nova senha", { exact: true })
        .fill(journeyPassword);
      await page
        .getByLabel("Repita a senha", { exact: true })
        .fill(journeyPassword + "-different");
      await page
        .getByRole("button", { name: "Alterar senha", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "As senhas precisam ser iguais",
      );
      await page
        .getByLabel("Repita a senha", { exact: true })
        .fill(journeyPassword);
      await page
        .getByRole("button", { name: "Alterar senha", exact: true })
        .click();
      await expect(page.locator("body")).toContainText(
        "Senha alterada. Todas as sessões foram encerradas.",
      );
      await loginJourney();
      await page.waitForURL("**/app/aprender");
    },
  );
  await check(
    "Troca de senha exige a atual e encerra a sessão após sucesso",
    async () => {
      await page.goto(root + "/app/config");
      const changedPassword = fixture.password + "-changed";
      await page
        .locator("#settings-current-password")
        .fill("Senha-atual-incorreta!");
      await page
        .getByLabel("Nova senha", { exact: true })
        .fill(changedPassword);
      await page
        .getByLabel("Repita a nova senha", { exact: true })
        .fill(changedPassword);
      await page
        .getByRole("button", { name: "Salvar e entrar novamente", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Senha atual incorreta",
      );
      await page.locator("#settings-current-password").fill(journeyPassword);
      await page
        .getByRole("button", { name: "Salvar e entrar novamente", exact: true })
        .click();
      await page.waitForURL("**/entrar");
      journeyPassword = changedPassword;
      assert.equal(
        (await page.request.get(root + "/api/auth/me")).status(),
        401,
      );
      await loginJourney();
      await page.waitForURL("**/app/aprender");
    },
  );
  await check(
    "Encerrar todas as sessões invalida também uma segunda janela",
    async () => {
      const other = await context(null);
      await other.addCookies(await guest.cookies());
      const otherPage = await other.newPage();
      assert.equal(
        (await otherPage.request.get(root + "/api/auth/me")).status(),
        200,
      );
      await page.goto(root + "/app/config");
      await page
        .getByRole("button", { name: "Encerrar todas as sessões", exact: true })
        .click();
      await page.waitForURL("**/entrar");
      assert.equal(
        (await otherPage.request.get(root + "/api/auth/me")).status(),
        401,
      );
      await other.close();
      await fixture.clearLimits();
      await loginJourney();
      await page.waitForURL("**/app/aprender");
    },
  );
  await check(
    "Excluir conta exige EXCLUIR, permite cancelar e rejeita senha errada",
    async () => {
      await page.goto(root + "/app/config");
      await page
        .getByRole("button", { name: "Solicitar exclusão", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Excluir permanentemente",
          exact: true,
        }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await expect(page.locator("#delete-account-password")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Solicitar exclusão", exact: true })
        .click();
      await page
        .locator("#delete-account-password")
        .fill("Senha-errada-temporaria!");
      await page.getByLabel("Digite EXCLUIR", { exact: true }).fill("EXCLUIR");
      await page
        .getByRole("button", { name: "Excluir permanentemente", exact: true })
        .click();
      await expect(page.getByRole("alert")).toBeVisible();
      const [users] = await fixture.pool.execute(
        "SELECT id FROM users WHERE id=?",
        [journeyId],
      );
      assert.equal(users.length, 1);
    },
  );
  await check(
    "Exclusão pelo formulário apaga conta e impede novo login",
    async () => {
      await page.locator("#delete-account-password").fill(journeyPassword);
      await page
        .getByRole("button", { name: "Excluir permanentemente", exact: true })
        .click();
      await page.waitForURL(root + "/");
      const [users] = await fixture.pool.execute(
        "SELECT id FROM users WHERE id=?",
        [journeyId],
      );
      assert.equal(users.length, 0);
      const [sessions] = await fixture.pool.execute(
        "SELECT id FROM user_sessions WHERE user_id=?",
        [journeyId],
      );
      assert.equal(sessions.length, 0);
      assert.equal(
        (await page.request.get(root + "/api/auth/me")).status(),
        401,
      );
      await loginJourney();
      await expect(page.getByRole("alert")).toBeVisible();
    },
  );
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
          "/metodologia",
          "/suporte",
          "/glossario",
          "/privacidade",
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
    await page.waitForURL("**/app");
    await expect(
      page
        .getByRole("heading", { name: /Sua escola de ações e dividendos/i })
        .first(),
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
      await expect(
        page.getByRole("progressbar", {
          name: "Progresso dos exercícios da trilha",
          exact: true,
        }),
      ).toHaveAttribute("aria-valuenow", "1");
      await page.reload();
      await expect(
        page.getByRole("progressbar", {
          name: "Progresso dos exercícios da trilha",
          exact: true,
        }),
      ).toHaveAttribute("aria-valuenow", "1");
      const other = await context(null);
      await other.addCookies(await guest.cookies());
      const otherPage = await other.newPage();
      await otherPage.goto(root + "/app/aprender#risco");
      await expect(
        otherPage.getByRole("progressbar", {
          name: "Progresso dos exercícios da trilha",
          exact: true,
        }),
      ).toHaveAttribute("aria-valuenow", "1");
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
      .getByText("Criar pesquisa pelo site · editor guiado", { exact: true })
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
      await analystPage.getByRole("button", { name: /2\.\s*Cenário/ }).click();
      await analystPage
        .getByLabel("Potencial (%) *", { exact: true })
        .fill("25");
      await analystPage
        .getByRole("button", {
          name: "Adicionar empresa à lista",
          exact: true,
        })
        .click();
      await analystPage.getByLabel("Ticker *", { exact: true }).fill("ITUB4");
      await analystPage
        .getByRole("button", {
          name: "Salvar novo rascunho na conta",
          exact: true,
        })
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
        analystPage.getByRole("heading", {
          name: "Lista da pesquisa · 1 / 300 ações",
          exact: true,
        }),
      ).toBeVisible();
    },
  );
  await check("Editor passa pela prévia e publicação explícita", async () => {
    await analystPage
      .getByRole("button", { name: "Cancelar preenchimento", exact: true })
      .click();
    await analystPage
      .getByRole("dialog")
      .getByRole("button", { name: "Descartar campos", exact: true })
      .click();
    await analystPage
      .getByRole("button", {
        name: "Preparar lista para validar e ver prévia",
        exact: true,
      })
      .click();
    await analystPage
      .getByRole("button", { name: "Validar e ver prévia", exact: true })
      .click();
    await expect(
      analystPage.getByRole("heading", {
        name: "Prévia · 1 ações",
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
