import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { lessons, glossary } from "../server/learning-content.js";

// Frontend audit only. Every API response is local and fictitious; no SQL or providers.
const tooltipOnly = process.env.EDIV_A11Y_TOOLTIP_ONLY === "true";
const output = tooltipOnly
  ? ".test-artifacts/accessibility-tooltip-fix"
  : ".test-artifacts/accessibility";
const axePath =
  process.env.EDIV_AXE_PATH ||
  ".test-artifacts/accessibility/package/axe.min.js";
if (!tooltipOnly) await readFile(axePath);
await mkdir(output, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 4194, strictPort: true },
});
const results = [];
const pageErrors = [];
const interactions = [];
const unknown = new Set();
let browser;
const user = {
  id: "accessibility-test",
  name: "Pessoa de teste",
  email: "teste@example.test",
  emailVerified: true,
  role: "ADMIN",
  permissions: [
    "rankings:write",
    "support:manage",
    "users:read",
    "users:write",
  ],
  createdAt: "2026-01-01T00:00:00Z",
};
const publicPaths = [
  "/",
  "/ranking",
  "/ranking/acao/DEMO1?visual=demo",
  "/aprender",
  "/glossario",
  "/assessoria",
  "/metodologia",
  "/privacidade",
  "/suporte",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha#token-de-teste",
  "/verificar",
  "/inexistente",
];
const memberPaths = [
  "/app",
  "/app/ranking?visual=demo",
  "/app/ranking/acao/DEMO1?visual=demo",
  "/app/aprender",
  "/app/perfil",
  "/app/config",
  "/app/conversas",
  "/app/atendimentos",
  "/app/admin",
  "/app/assessoria",
];
async function scan(page, name) {
  if (tooltipOnly) return;
  await page.addScriptTag({ path: axePath });
  const audit = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: [
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ],
      },
    });
    return {
      violations: result.violations.map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        nodes: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
      incomplete: result.incomplete.map(({ id, nodes }) => ({
        id,
        count: nodes.length,
      })),
      passes: result.passes.length,
    };
  });
  results.push({ name, ...audit });
  console.log(
    name,
    audit.violations
      .map((item) => `${item.id}:${item.nodes.length}`)
      .join(", ") || "OK",
  );
}
async function interaction(name, work) {
  await work();
  interactions.push(name);
  console.log("KEYBOARD", name, "OK");
}
try {
  await server.listen();
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  for (const member of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      reducedMotion: "reduce",
    });
    await context.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      let status = 200;
      let data;
      if (path === "/api/auth/me") {
        status = member ? 200 : 401;
        data = member ? { user } : { error: "Visitante" };
      } else if (path === "/api/auth/availability")
        data = { available: true, challenge: { required: false } };
      else if (path === "/api/learning")
        data = {
          lessons: member
            ? lessons
            : lessons.map((lesson, index) =>
                index
                  ? { id: lesson.id, title: lesson.title, locked: true }
                  : {
                      id: lesson.id,
                      title: lesson.title,
                      text: lesson.text,
                      sections: lesson.sections,
                      takeaways: lesson.takeaways,
                      sources: lesson.sources,
                      locked: false,
                    },
              ),
          glossary,
          completed: [],
          access: member ? "full" : "preview",
        };
      else if (path === "/api/rankings/status") data = { published: false };
      else if (path === "/api/rankings")
        data = {
          id: null,
          title: "Pesquisa de teste",
          entries: [],
          history: [],
          canManage: member,
        };
      else if (path === "/api/notifications")
        data = { unreadCount: 0, notifications: [] };
      else if (path === "/api/support/information")
        data = {
          email: "",
          hours: "",
          professionalName: "",
          category: "",
          registration: "",
        };
      else if (path === "/api/support" || path === "/api/support/team")
        data = { threads: [] };
      else if (path === "/api/admin/summary")
        data = { total: 0, verified: 0, analysts: 0, admins: 1, unverified: 0 };
      else if (path === "/api/admin/users")
        data = {
          users: [
            {
              ...user,
              id: "accessibility-subject",
              name: "Conta de teste",
              email: "outra@example.test",
              role: "USER",
              blocked: false,
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        };
      else if (path === "/api/admin/audit")
        data = { events: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };
      else if (path === "/api/admin/launch")
        data = {
          appUrl: "http://127.0.0.1:4194",
          environment: "fixture",
          researchPublished: false,
          email: { configured: false, senderDomain: null, testOnly: true },
          customDomain: false,
          professionalIdentified: false,
          supportConfigured: false,
        };
      else if (path === "/api/rankings/drafts") data = { drafts: [] };
      else {
        unknown.add(path);
        status = 503;
        data = { error: "API fora da fixture de acessibilidade" };
      }
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      pageErrors.push({ url: page.url(), error: error.message }),
    );
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /(?:Type|Reference|Syntax)Error:/.test(message.text())
      )
        pageErrors.push({ url: page.url(), error: message.text() });
    });
    for (const path of tooltipOnly ||
    process.env.EDIV_A11Y_INTERACTIONS_ONLY === "true"
      ? []
      : member
        ? memberPaths
        : publicPaths) {
      await page.goto("http://127.0.0.1:4194" + path);
      await page.waitForLoadState("networkidle");
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.effect?.getTiming().iterations !== Infinity,
              )
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
        await scan(page, `${member ? "member" : "guest"}:${path}:${theme}`);
      }
    }
    if (!member) {
      await page.goto("http://127.0.0.1:4194/");
      await page.waitForLoadState("networkidle");
      await interaction(
        "Tooltip: foco, descrição e Escape mantêm o controle nativo",
        async () => {
          const control = page.getByRole("button", { name: /Ativar tema/ });
          await control.focus();
          const tooltip = page.getByRole("tooltip");
          await expect(tooltip).toBeVisible();
          assert.equal(
            await control.getAttribute("aria-describedby"),
            await tooltip.getAttribute("id"),
          );
          await control.press("Escape");
          await expect(tooltip).toHaveCount(0);
          await expect(control).toBeFocused();
        },
      );
      for (const above of [false, true]) {
        await interaction(
          `Tooltip: percurso sem foco ${above ? "acima" : "abaixo"}`,
          async () => {
            const control = page.getByRole("button", { name: /Ativar tema/ });
            await control.evaluate((element, above) => {
              element.blur();
              element.style.cssText = `position:fixed;left:500px;top:${above ? window.innerHeight - 40 : 200}px`;
            }, above);
            await page.mouse.move(5, 5);
            await control.hover();
            const tooltip = page.getByRole("tooltip");
            await expect(tooltip).toBeVisible();
            await expect(control).not.toBeFocused();
            const button = await control.boundingBox();
            const hint = await tooltip.boundingBox();
            assert.ok(button && hint);
            assert.equal(
              hint.y < button.y,
              above,
              "Exercita ambos os lados do disparador",
            );
            const x = button.x + button.width / 2;
            await page.mouse.move(
              x,
              above ? button.y + 1 : button.y + button.height - 1,
            );
            await page.mouse.move(x, hint.y + hint.height / 2, { steps: 24 });
            await expect(tooltip).toBeVisible();
            await expect(control).not.toBeFocused();
            await page.keyboard.press("Escape");
            await expect(tooltip).toHaveCount(0);
            await control.evaluate((element) =>
              element.removeAttribute("style"),
            );
          },
        );
      }
      await interaction(
        "Tooltip: foco e âncora preservados após rolagem de 20px",
        async () => {
          const control = page.getByRole("button", { name: /Ativar tema/ });
          // Disable the sticky header only in this geometry fixture so its anchor moves.
          await page
            .getByRole("banner")
            .evaluate((element) => (element.style.position = "static"));
          await control.evaluate((element) => {
            element.style.cssText = "position:absolute;left:500px;top:300px";
          });
          await page.mouse.move(5, 5);
          await control.focus();
          const tooltip = page.getByRole("tooltip");
          await expect(tooltip).toBeVisible();
          const before = await tooltip.boundingBox();
          const scrollBefore = await page.evaluate(() => window.scrollY);
          await page.evaluate(() => window.scrollBy(0, 20));
          await expect
            .poll(() => page.evaluate(() => window.scrollY))
            .toBe(scrollBefore + 20);
          await expect(control).toBeFocused();
          await expect(tooltip).toBeVisible();
          await expect
            .poll(async () => {
              const after = await tooltip.boundingBox();
              return before && after ? Math.round(before.y - after.y) : null;
            })
            .toBe(20);
          await page.keyboard.press("Escape");
          await control.evaluate((element) => element.removeAttribute("style"));
          await page
            .getByRole("banner")
            .evaluate((element) => element.style.removeProperty("position"));
          await page.evaluate(() => window.scrollTo(0, 0));
        },
      );
      await interaction(
        "Tooltip: primeiro Escape fecha só a dica; segundo fecha preferências",
        async () => {
          const trigger = page.getByRole("button", {
            name: "Preferências de cookies",
            exact: true,
          });
          await trigger.click();
          const dialog = page.getByRole("dialog", {
            name: "Preferências de cookies",
          });
          const close = dialog.getByRole("button", {
            name: "Fechar preferências",
            exact: true,
          });
          await close.focus();
          await expect(page.getByRole("tooltip")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(page.getByRole("tooltip")).toHaveCount(0);
          await expect(dialog).toBeVisible();
          await expect(close).toBeFocused();
          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(trigger).toBeFocused();
        },
      );
      if (tooltipOnly) {
        await context.close();
        continue;
      }
      await interaction("Navegação SPA: teclado e foco no título", async () => {
        const link = page
          .getByRole("banner")
          .getByRole("link", { name: "Aprender", exact: true });
        await link.focus();
        await link.press("Enter");
        await expect(page).toHaveURL(/\/aprender$/);
        await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      });
      await interaction(
        "Cookies: modal nativo, Tab contido, Escape e retorno de foco",
        async () => {
          const trigger = page.getByRole("button", {
            name: "Preferências de cookies",
            exact: true,
          });
          await trigger.focus();
          await trigger.press("Enter");
          const dialog = page.getByRole("dialog", {
            name: "Preferências de cookies",
          });
          await expect(dialog).toBeVisible();
          for (let index = 0; index < 10; index++) {
            await page.keyboard.press("Tab");
            assert.ok(
              await dialog.evaluate(
                (element) =>
                  document.activeElement === document.body ||
                  element.contains(document.activeElement),
              ),
              "Foco não pode alcançar conteúdo inerte atrás do modal",
            );
          }
          await scan(page, "state:privacy-dialog");
          await dialog
            .getByRole("button", { name: "Somente necessários", exact: true })
            .focus();
          await expect(page.getByRole("tooltip")).toHaveCount(0);
          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(trigger).toBeFocused();
        },
      );
      await interaction(
        "Formulário: validação de senha associada ao campo",
        async () => {
          await page.goto("http://127.0.0.1:4194/cadastro");
          await page
            .getByLabel("Nome", { exact: true })
            .fill("Teste Acessibilidade");
          await page
            .getByLabel("E-mail", { exact: true })
            .fill("teste@example.test");
          const password = page.getByLabel("Senha", { exact: true });
          await password.fill("abcdefgh");
          await page
            .getByRole("button", { name: "Criar conta grátis", exact: true })
            .click();
          await expect(password).toHaveAttribute("aria-invalid", "true");
          await expect(password).toBeFocused();
          await expect(page.getByRole("alert")).toBeVisible();
          assert.ok(
            (await password.getAttribute("aria-describedby")).includes(
              "register-error",
            ),
          );
          await page
            .getByRole("button", { name: "Mostrar senha", exact: true })
            .click();
          await expect(password).toHaveAttribute("type", "text");
          await page
            .getByRole("button", { name: "Ocultar senha", exact: true })
            .click();
          await expect(password).toHaveAttribute("type", "password");
          await scan(page, "state:register-validation");
        },
      );
    } else {
      await page.goto("http://127.0.0.1:4194/app");
      await page.waitForLoadState("networkidle");
      await interaction(
        "Notificações: teclado, estado expandido e Escape",
        async () => {
          const trigger = page.getByRole("button", {
            name: "Notificações",
            exact: true,
          });
          await trigger.focus();
          await trigger.press("Enter");
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          await scan(page, "state:notifications-open");
          await expect(page.getByRole("tooltip")).toBeVisible();
          await trigger.press("Escape");
          await expect(page.getByRole("tooltip")).toHaveCount(0);
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          await trigger.press("Escape");
          await expect(trigger).toHaveAttribute("aria-expanded", "false");
          await expect(trigger).toBeFocused();
        },
      );
      await interaction(
        "Menu lateral recolhido: nome e tooltip por teclado",
        async () => {
          await page
            .getByRole("button", { name: "Recolher menu lateral", exact: true })
            .click();
          const ranking = page
            .getByRole("navigation", {
              name: "Navegação principal",
              exact: true,
            })
            .getByRole("link", { name: "Ranking de Ações", exact: true });
          await ranking.focus();
          await expect(
            page.getByRole("tooltip", { name: "Ranking de Ações" }),
          ).toBeVisible();
          await ranking.press("Escape");
          await expect(ranking).toBeFocused();
          await scan(page, "state:sidebar-collapsed");
        },
      );
    }
    if (member) {
      if (!tooltipOnly) {
        await interaction(
          "Editor: erro de campos obrigatórios associado",
          async () => {
            await page.goto(
              "http://127.0.0.1:4194/app/ranking?visual=demo#publicar-pesquisa",
            );
            await page
              .getByText("Criar pesquisa pelo site · editor guiado", {
                exact: true,
              })
              .click();
            await page
              .getByRole("button", {
                name: "Adicionar empresa à lista",
                exact: true,
              })
              .click();
            const ticker = page.getByLabel("Ticker *", { exact: true });
            await expect(ticker).toHaveAttribute("aria-invalid", "true");
            await expect(page.getByRole("alert")).toBeVisible();
            await scan(page, "state:research-editor-validation");
          },
        );
        await page.goto("http://127.0.0.1:4194/app/admin");
        await page
          .getByRole("button", { name: "Gerenciar acesso", exact: true })
          .click();
        await scan(page, "state:admin-access-form");
        await page.goto("http://127.0.0.1:4194/app/config");
        await page
          .getByRole("button", { name: "Solicitar exclusão", exact: true })
          .click();
        await scan(page, "state:account-deletion-form");
      } else await page.goto("http://127.0.0.1:4194/app/config");
      await interaction(
        "Tour obrigatório: Escape não dispensa e progresso explícito conclui",
        async () => {
          await page
            .getByRole("button", { name: /^Abrir menu da conta de/ })
            .click();
          await page
            .getByRole("button", { name: "Rever introdução", exact: true })
            .click();
          const tour = page.locator("dialog.ediv-guided-tour");
          await expect(tour).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(tour).toBeVisible();
          await scan(page, "state:mandatory-tour");
          for (let step = 0; step < 4; step++)
            await tour
              .getByRole("button", { name: "Continuar", exact: true })
              .click();
          await tour
            .getByRole("button", { name: "Concluir", exact: true })
            .click();
          await expect(tour).toHaveCount(0);
        },
      );
    }
    if (tooltipOnly) {
      await context.close();
      continue;
    }
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of member
        ? [
            "/app",
            "/app/ranking?visual=demo",
            "/app/aprender",
            "/app/config",
            "/app/conversas",
            "/app/admin",
          ]
        : ["/", "/aprender", "/suporte", "/entrar"]) {
        await page.goto("http://127.0.0.1:4194" + path);
        await page.waitForLoadState("networkidle");
        await page.evaluate(
          () => (document.documentElement.dataset.theme = "light"),
        );
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.effect?.getTiming().iterations !== Infinity,
              )
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
        const overflow = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
          outside: [...document.querySelectorAll("body *")]
            .filter(
              (element) =>
                element.getBoundingClientRect().right > window.innerWidth + 1 &&
                !element.closest(".research-table-region"),
            )
            .slice(0, 8)
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              width: element.getBoundingClientRect().width,
              right: element.getBoundingClientRect().right,
              text: element.textContent.slice(0, 80),
            })),
        }));
        if (overflow.width > overflow.viewport + 1)
          await page.screenshot({
            path: `${output}/overflow.png`,
            fullPage: true,
          });
        assert.ok(
          overflow.width <= overflow.viewport + 1,
          `Reflow ${path} ${width}: ${JSON.stringify(overflow)}`,
        );
        await scan(page, `reflow:${path}:${width}`);
      }
      await page.screenshot({
        path: `${output}/${member ? "member" : "guest"}-${width}.png`,
        fullPage: true,
      });
    }
    await context.close();
  }
} finally {
  await writeFile(
    `${output}/audit.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        fixture: "APIs simuladas, sem SQL",
        results,
        interactions,
        pageErrors,
        unknown: [...unknown],
      },
      null,
      2,
    ),
  );
  if (browser) await browser.close();
  await server.close();
}
assert.deepEqual(pageErrors, [], "Erros JavaScript na auditoria");
assert.deepEqual([...unknown], [], "APIs não cobertas pela fixture");
assert.equal(
  results.flatMap((result) => result.violations).length,
  0,
  "Violações de acessibilidade: consulte audit.json",
);
