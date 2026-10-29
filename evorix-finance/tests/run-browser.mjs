import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Separate processes give each suite its own database pool and disposable schema.
// Run sequentially because the browser suites share the same local Vite port.
const suites = [
  "public-home.browser.mjs",
  "public-rankings.browser.mjs",
  "dividend.browser.mjs",
  "notifications.browser.mjs",
  "browser.mjs",
  "browser-experience.mjs",
  ...(process.env.EDIV_TEST_MYSQL_DISPOSABLE === "true"
    ? ["session.browser.mjs", "notifications.e2e.mjs"]
    : []),
];
for (const suite of suites) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL(suite, import.meta.url))],
      {
        stdio: "inherit",
        env: process.env,
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  // A failed suite must not hide the results of the other isolated suites.
  if (code !== 0) process.exitCode = 1;
}
