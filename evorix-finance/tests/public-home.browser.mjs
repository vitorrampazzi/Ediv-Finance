import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";

// Public UI regression only: local production build, no database or real API.
const root = "http://127.0.0.1:4191";
const artifacts = ".test-artifacts/public-home";
const report = [];
let preview;
let browser;
await mkdir(artifacts, { recursive: true });

async function check(name, work) {
  try {
    const evidence = await work();
    report.push({ name, status: "passed", evidence });
    console.info("PASS:", name);
  } catch (error) {
    report.push({
      name,
      status: "failed",
      error: error.stack || error.message,
    });
    console.error("FAIL:", name, error.stack || error.message);
    process.exitCode = 1;
  }
}

try {
  await check("HTML pré-renderizado contém título exato", async () => {
    const html = await readFile("dist/index.html", "utf8");
    assert.match(html, /<title>Escola do Dividendo<\/title>/);
  });
  preview = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4191",
      "--strictPort",
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let previewOutput = "";
  preview.stdout.on("data", (chunk) => {
    previewOutput += chunk;
  });
  preview.stderr.on("data", (chunk) => {
    previewOutput += chunk;
  });
  await expect
    .poll(
      async () => {
        if (preview.exitCode !== null) throw new Error(previewOutput);
        try {
          return (await fetch(root)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }

  for (const scenario of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "desktop-baixo", width: 1366, height: 650 },
    { name: "mobile", width: 390, height: 844 },
    { name: "mobile-320", width: 320, height: 760 },
    {
      name: "desktop-reduced",
      width: 1440,
      height: 1000,
      reducedMotion: "reduce",
    },
    {
      name: "mobile-reduced",
      width: 390,
      height: 844,
      reducedMotion: "reduce",
    },
  ]) {
    await check(
      `${scenario.name}: etapas, navegação, título e console`,
      async () => {
        const context = await browser.newContext({
          viewport: { width: scenario.width, height: scenario.height },
          reducedMotion: scenario.reducedMotion || "no-preference",
        });
        const errors = [];
        const unexpectedRequests = [];
        const expectedAuthErrors = [];
        await context.route("**/api/**", async (route) => {
          const pathname = new URL(route.request().url()).pathname;
          const responses = {
            "/api/auth/me": {
              status: 401,
              json: { error: "Visitante de teste" },
            },
            "/api/auth/availability": {
              status: 200,
              json: { available: true },
            },
            "/api/rankings/public": {
              status: 200,
              json: {
                id: null,
                title: "Sem publicação no teste isolado",
                entries: [],
              },
            },
          };
          if (!responses[pathname]) unexpectedRequests.push(pathname);
          await route.fulfill(
            responses[pathname] || {
              status: 404,
              json: { error: "API não simulada" },
            },
          );
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          if (
            message.location().url.endsWith("/api/auth/me") &&
            message.text().includes("401")
          ) {
            expectedAuthErrors.push(message.text());
          } else errors.push(message.text());
        });
        try {
          await page.goto(root);
          await expect(page.locator(".ph-home")).toBeVisible();
          await expect(page).toHaveTitle("Escola do Dividendo");
          const steps = page.locator(".ph-teaching-step");
          await expect(steps).toHaveCount(3);
          const labels = ["Empresa", "Pesquisa", "Dividendos"];
          for (const index of [0, 1, 2, 1, 0]) {
            await steps
              .nth(index)
              .evaluate((element) =>
                element.scrollIntoView({
                  block: "center",
                  behavior: "instant",
                }),
              );
            await expect(steps.nth(index)).toHaveClass(/ph-is-current/);
            await expect(
              steps.nth(index).locator(".ph-teaching-step-label"),
            ).toHaveText(labels[index]);
            const studio = page.locator(".ph-teaching-studio");
            let illustration;
            if (await studio.isVisible()) {
              await expect(
                page.locator(".ph-teaching-scene.ph-is-active"),
              ).toHaveCount(1);
              await expect(
                page.locator(".ph-teaching-stage-key .ph-is-current"),
              ).toHaveText(labels[index]);
              await expect(studio).toBeInViewport();
              await expect(studio).toHaveAttribute("data-ph-inview", "true");
              illustration = page.locator(".ph-teaching-scene.ph-is-active");
            } else {
              const mini = steps.nth(index).locator(".ph-teaching-mini");
              await expect(mini).toBeVisible();
              await expect(mini).toHaveAttribute("data-ph-inview", "true");
              await expect(mini.locator("figcaption")).toContainText(
                "Exemplo didático",
              );
              illustration = mini;
            }
            const animatedPart = illustration
              .locator(
                [
                  ".ph-teaching-bar",
                  ".ph-teaching-revision",
                  ".ph-teaching-dividend-signal",
                ][index],
              )
              .first();
            const animationName = () =>
              animatedPart.evaluate(
                (element) => getComputedStyle(element).animationName,
              );
            if (scenario.reducedMotion)
              await expect.poll(animationName).toBe("none");
            else await expect.poll(animationName).not.toBe("none");
          }
          // Cross the selection midpoint by small scrolls. IntersectionObserver
          // thresholds alone can miss this change while both steps stay visible.
          if (scenario.width >= 960 && scenario.height >= 700) {
            const boundary = await steps.evaluateAll((elements) => {
              const centers = elements.slice(0, 2).map((element) => {
                const rect = element.getBoundingClientRect();
                return rect.top + window.scrollY + rect.height / 2;
              });
              return (centers[0] + centers[1]) / 2 - window.innerHeight * 0.52;
            });
            await page.evaluate(
              (top) => window.scrollTo({ top, behavior: "instant" }),
              boundary - 8,
            );
            await expect(steps.nth(0)).toHaveClass(/ph-is-current/);
            await page.evaluate(
              (top) => window.scrollTo({ top, behavior: "instant" }),
              boundary + 8,
            );
            await expect(steps.nth(1)).toHaveClass(/ph-is-current/);
          }
          if (scenario.reducedMotion) {
            assert.equal(
              await page
                .locator(".ph-teaching")
                .evaluate(
                  (element) =>
                    element
                      .getAnimations({ subtree: true })
                      .filter((animation) => animation.playState === "running")
                      .length,
                ),
              0,
              "Reduced motion deve preservar as figuras sem animação",
            );
          }
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth,
              ),
            )
            .toBeLessThanOrEqual(2);
          await page
            .locator(".ph-teaching")
            .screenshot({ path: `${artifacts}/${scenario.name}.png` });
          await expect(steps.nth(0).locator("a")).toHaveAttribute(
            "href",
            "/#caderno-de-exemplo",
          );
          await expect(steps.nth(1).locator("a")).toHaveAttribute(
            "href",
            "/ranking",
          );
          await expect(steps.nth(2).locator("a")).toHaveAttribute(
            "href",
            "/aprender",
          );
          await page.locator('a[href="/metodologia"]').first().click();
          await expect(page).toHaveURL(`${root}/metodologia`);
          await expect(page).not.toHaveTitle("Escola do Dividendo");
          await page.locator('header a[href="/"]').first().click();
          await expect(page).toHaveURL(`${root}/`);
          await expect(page).toHaveTitle("Escola do Dividendo");
          await expect(page.locator(".ph-home")).toBeVisible();
          await page.reload();
          await expect(page).toHaveTitle("Escola do Dividendo");
          await expect(page.locator(".ph-home")).toBeVisible();
          assert.deepEqual(unexpectedRequests, []);
          assert.deepEqual(errors, []);
          return {
            labels,
            consoleErrors: errors.length,
            expectedVisitor401: expectedAuthErrors.length,
            mockedAPI: true,
          };
        } finally {
          if (process.exitCode)
            await page
              .screenshot({
                path: `${artifacts}/${scenario.name}-failure.png`,
                fullPage: true,
              })
              .catch(() => {});
          await context.close();
        }
      },
    );
  }
} finally {
  await browser?.close();
  preview?.kill();
  await writeFile(
    `${artifacts}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
}
