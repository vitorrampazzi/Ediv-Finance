import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";

// Public UI regression only: local production build, no database or real API.
const root = "http://127.0.0.1:4191";
const artifacts = ".test-artifacts/public-home";
const report = [];
const publication = {
  id: "27",
  title: "Pesquisa de teste — empresas e dividendos",
  entries: [
    {
      rank: 1,
      ticker: "TEST1",
      companyName: "Companhia de Telecomunicações e Infraestrutura do Brasil",
      dividendAnalysis: {
        estimatedGrossDividendYield: "0.115",
        projectedPE: "8.7",
        safetyMargin: "0.24",
      },
    },
    {
      rank: 2,
      ticker: "TEST2",
      companyName:
        "Companhia de Administração e Participações em Shopping Centers",
      dividendAnalysis: {
        estimatedGrossDividendYield: "0.089",
        projectedPE: "11.6",
        safetyMargin: "0.18",
      },
    },
    {
      rank: 3,
      ticker: "TEST3",
      companyName: "Empresa Didática de Energia e Transmissão",
      dividendAnalysis: {
        estimatedGrossDividendYield: "0.102",
        projectedPE: "9.2",
        safetyMargin: "0.31",
      },
    },
  ],
};
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

// Sample rendered geometry and pixels after entrance animations have finished.
// animationName alone stays set even when a finite animation has stopped.
async function temporalMotion(locator, shouldMove, prefix) {
  const page = locator.page();
  const box = await locator.boundingBox();
  assert.ok(box, "Alvo temporal precisa ter geometria renderizada");
  const viewport = page.viewportSize();
  const clip = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    width: Math.min(box.width, viewport.width - Math.max(0, box.x)),
    height: Math.min(box.height, viewport.height - Math.max(0, box.y)),
  };
  const first = await page.screenshot({
    clip,
    path: `${prefix}-frame-a.png`,
    animations: "allow",
  });
  const samplesPromise = locator.evaluate(async (element, shouldMove) => {
    const samples = [];
    for (let i = 0; i < (shouldMove ? 42 : 12); i++) {
      samples.push(
        [element, ...element.querySelectorAll("*")]
          .map((node) => {
            const style = getComputedStyle(node),
              box = node.getBoundingClientRect();
            return [
              box.x,
              box.y,
              box.width,
              box.height,
              Number(style.opacity),
              parseFloat(style.strokeDashoffset) || 0,
            ];
          })
          .flat(),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return samples;
  }, shouldMove);
  // Unequal intervals avoid comparing only two coincident phases of a loop.
  // Keep the clip fixed while sampling; never disable the animation for capture.
  const frames = [first];
  for (const [index, delay] of (shouldMove
    ? [310, 760, 1290, 1840]
    : [170, 270, 340, 420]
  ).entries()) {
    await page.waitForTimeout(delay);
    frames.push(
      await page.screenshot({
        clip,
        path: `${prefix}-frame-${String.fromCharCode(98 + index)}.png`,
        animations: "allow",
      }),
    );
  }
  const samples = await samplesPromise;
  const pixelDifference = await page.evaluate(
    async (frames) => {
      const decode = async (data) => {
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${data}`)).blob(),
        );
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const a = await decode(frames[0]);
      const comparisons = [];
      for (const frame of frames.slice(1)) {
        const b = await decode(frame);
        let different = 0,
          maxChannelDelta = 0;
        for (let i = 0; i < a.length; i += 4) {
          const delta = Math.max(
            Math.abs(a[i] - b[i]),
            Math.abs(a[i + 1] - b[i + 1]),
            Math.abs(a[i + 2] - b[i + 2]),
          );
          if (delta) different++;
          maxChannelDelta = Math.max(maxChannelDelta, delta);
        }
        comparisons.push({ different, maxChannelDelta });
      }
      return {
        different: Math.max(...comparisons.map((pair) => pair.different)),
        total: a.length / 4,
        comparisons,
      };
    },
    frames.map((frame) => frame.toString("base64")),
  );
  const maxDelta = Math.max(
    ...samples[0].map(
      (_, i) =>
        Math.max(...samples.map((sample) => sample[i])) -
        Math.min(...samples.map((sample) => sample[i])),
    ),
  );
  if (shouldMove) {
    assert.ok(
      maxDelta > 1,
      `Movimento renderizado deve superar 1px: ${maxDelta}`,
    );
    assert.ok(
      pixelDifference.different > 10,
      "Pixels renderizados da ilustração precisam mudar",
    );
  } else {
    assert.ok(maxDelta < 0.02, `Ilustração estática mudou: ${maxDelta}`);
    assert.equal(
      pixelDifference.different,
      0,
      `Pixels pausados/reduzidos precisam permanecer iguais: ${JSON.stringify(pixelDifference)}`,
    );
  }
  return { maxDelta, pixelDifference };
}

async function fullHomeCapture(page, name) {
  const height = page.viewportSize().height;
  for (
    let y = 0;
    y < (await page.evaluate(() => document.documentElement.scrollHeight));
    y += height * 0.75
  ) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(70);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: `${artifacts}/${name}-whole.png`,
    fullPage: true,
    animations: "allow",
  });
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
    { name: "desktop", width: 1440, height: 900 },
    { name: "desktop-baixo", width: 1366, height: 650 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
    { name: "mobile-320", width: 320, height: 760 },
    { name: "mobile-320-baixo", width: 320, height: 568 },
    { name: "mobile-paisagem", width: 844, height: 390 },
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
              json: publication,
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
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator(".ph-home")).toBeVisible();
          await expect(page).toHaveTitle("Escola do Dividendo");
          await expect(page.locator(".ph-ranking-company")).toHaveCount(3);
          await fullHomeCapture(page, scenario.name);
          const hero = page.locator(".ph-brand");
          await hero.scrollIntoViewIfNeeded();
          await page.waitForTimeout(800);
          const heroMotion = await temporalMotion(
            hero,
            !scenario.reducedMotion,
            `${artifacts}/${scenario.name}-hero`,
          );
          if (!scenario.reducedMotion) {
            await hero
              .getByRole("button", { name: "Pausar animação", exact: true })
              .click();
            await page.waitForTimeout(300);
            await temporalMotion(
              hero,
              false,
              `${artifacts}/${scenario.name}-hero-paused`,
            );
            await hero
              .getByRole("button", { name: "Reproduzir animação", exact: true })
              .click();
          }
          const steps = page.locator(".ph-teaching-step");
          await expect(steps).toHaveCount(3);
          const labels = ["Empresa", "Pesquisa", "Dividendos"];
          const movement = [];
          for (const index of [0, 1, 2, 1, 0]) {
            await steps.nth(index).evaluate((element) =>
              element.scrollIntoView({
                block: "center",
                behavior: "instant",
              }),
            );
            if (
              scenario.width < 960 &&
              !(scenario.width >= 480 && scenario.height <= 550)
            ) {
              // Read below the sticky studio, not beneath its illustration.
              await page.evaluate((index) => {
                const studio = document
                  .querySelector(".ph-teaching-studio")
                  .getBoundingClientRect();
                const step = document
                  .querySelectorAll(".ph-teaching-step")
                  [index].getBoundingClientRect();
                window.scrollBy({
                  top: step.top - studio.bottom - 14,
                  behavior: "instant",
                });
              }, index);
            }
            await expect(steps.nth(index)).toHaveClass(/ph-is-current/);
            await expect(
              steps.nth(index).locator(".ph-teaching-step-label"),
            ).toHaveText(labels[index]);
            const studio = page.locator(".ph-teaching-studio");
            const illustration = page.locator(
              ".ph-teaching-scene.ph-is-active",
            );
            await expect(
              page.locator(".ph-teaching-scene.ph-is-active"),
            ).toHaveCount(1);
            await expect(
              page.locator(".ph-teaching-stage-key .ph-is-current"),
            ).toHaveText(labels[index]);
            await expect(studio).toBeInViewport();
            await expect(studio).toHaveAttribute("data-ph-inview", "true");
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
            if (movement.length < 3) {
              await page.waitForTimeout(scenario.reducedMotion ? 300 : 3400);
              movement.push(
                await temporalMotion(
                  illustration,
                  !scenario.reducedMotion,
                  `${artifacts}/${scenario.name}-stage${index}`,
                ),
              );
              await page.screenshot({
                path: `${artifacts}/${scenario.name}-reading${index}.png`,
                animations: "allow",
              });
            }
            const geometry = await page.evaluate((index) => {
              const studio = document
                .querySelector(".ph-teaching-studio")
                .getBoundingClientRect();
              const title = document
                .querySelectorAll(".ph-teaching-step h3")
                [index].getBoundingClientRect();
              return {
                headerBottom: document
                  .querySelector(".ediv-site-header")
                  .getBoundingClientRect().bottom,
                studio: {
                  x: studio.x,
                  right: studio.right,
                  top: studio.top,
                  bottom: studio.bottom,
                },
                title: { top: title.top, bottom: title.bottom },
              };
            }, index);
            assert.ok(
              geometry.studio.top >= 0 &&
                geometry.studio.bottom <= scenario.height,
              "Estúdio completo permanece visível",
            );
            assert.ok(
              geometry.studio.top >= geometry.headerBottom,
              "Cabeçalho não pode encobrir o estúdio",
            );
            if (
              scenario.width < 960 &&
              !(scenario.width >= 480 && scenario.height <= 550)
            )
              assert.ok(
                geometry.title.top >= geometry.studio.bottom,
                "Texto da etapa deve ficar abaixo do estúdio",
              );
          }
          if (!scenario.reducedMotion) {
            const pause = page.getByRole("button", {
              name: "Pausar ilustração",
              exact: true,
            });
            await pause.click();
            await page.waitForTimeout(650);
            await temporalMotion(
              page.locator(".ph-teaching-scene.ph-is-active"),
              false,
              `${artifacts}/${scenario.name}-teaching-paused`,
            );
            await page
              .getByRole("button", {
                name: "Reproduzir ilustração",
                exact: true,
              })
              .click();
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
          const outside = await page
            .locator(
              ".ph-home h1, .ph-home h2, .ph-ranking-company, .ph-home .ph-primary, .ph-home .ph-text-link, .ph-teaching-action",
            )
            .evaluateAll((elements) =>
              elements
                .filter((element) => {
                  const box = element.getBoundingClientRect();
                  return (
                    box.width > 0 &&
                    (box.left < -1 || box.right > innerWidth + 1)
                  );
                })
                .map((element) => element.textContent.trim()),
            );
          assert.deepEqual(
            outside,
            [],
            "Conteúdo e CTAs precisam caber no viewport",
          );
          if (scenario.width >= 960) {
            const columns = await page
              .locator(".ph-teaching-layout")
              .evaluate(
                (element) =>
                  getComputedStyle(element).gridTemplateColumns.split(" ")
                    .length,
              );
            assert.equal(columns, 2, "Desktop baixo mantém duas colunas");
          }
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
            heroMotion,
            movement,
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
