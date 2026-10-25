import assert from "node:assert/strict";
import { chromium } from "playwright";
import { expect } from "playwright/test";

// Local UI fixture only; authentication and data isolation have separate integration checks.
const origin = process.env.EDIV_CENTER_ORIGIN || "http://127.0.0.1:4210";
assert.equal(new URL(origin).hostname, "127.0.0.1");
let browser;
try {
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  }
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const theme of ["dark", "light"]) {
      for (const path of ["/", "/app"]) {
        await page.goto(origin + path);
        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toBeVisible();
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await expect(heading).not.toBeFocused();
        await heading.evaluate((node) => {
          node.tabIndex = -1;
          node.focus({ preventScroll: true });
        });
        assert.equal(
          await heading.evaluate((node) => getComputedStyle(node).outlineStyle),
          "none",
        );
      }
      const avatar = page.getByRole("button", { name: /Abrir menu da conta/ });
      await avatar.hover();
      const tip = page.getByRole("tooltip");
      await expect(tip).toBeVisible();
      await expect
        .poll(() =>
          tip.evaluate((node) => {
            const bounds = node.getBoundingClientRect();
            return (
              bounds.width > 150 &&
              bounds.width <= 232 &&
              bounds.left >= 8 &&
              bounds.right <= innerWidth - 7
            );
          }),
        )
        .toBe(true);
      await avatar.click();
      await expect(tip).toHaveCount(0);
      const home = page.getByRole("link", {
        name: "Início da Escola do Dividendo",
        exact: true,
      });
      await expect(home).toHaveAttribute("href", "/app");
      await expect(home.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await page.mouse.move(0, 0);
      await expect(tip).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.locator("#demo-profile-links")).toHaveCount(0);
      await expect(avatar).toBeFocused();
      await page.mouse.click(0, 0);
      await expect(tip).toHaveCount(0);
      await page.keyboard.press("Tab");
      await avatar.focus();
      await expect(tip).toBeVisible();
      assert.equal(
        await avatar.evaluate((node) => node.matches(":focus-visible")),
        true,
      );
      assert.notEqual(
        await avatar.evaluate((node) => getComputedStyle(node).outlineStyle),
        "none",
      );
      await avatar.press("Escape");
      await expect(tip).toHaveCount(0);
      await expect(avatar).toBeFocused();
      await avatar.press("Enter");
      await expect(home).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#demo-profile-links")).toHaveCount(0);
      await avatar.press("Escape");
      await page.goto(origin + "/app/ranking");
      await expect(page.locator(".dividend-table tbody tr")).toHaveCount(10);
      await page.keyboard.press("Tab");
      await avatar.focus();
      await avatar.press("Enter");
      await home.focus();
      await home.press("Enter");
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      console.log("PASS homes/focus/profile/tooltip", width, theme);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
}
