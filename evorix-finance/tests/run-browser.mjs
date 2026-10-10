import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Separate processes give each suite its own database pool and disposable schema.
// Run sequentially because the browser suites share the same local Vite port.
for (const suite of ["browser.mjs", "browser-experience.mjs"]) {
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
  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
