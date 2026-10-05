import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The API development .env must not switch React's production bundle to dev.
const env = { ...process.env, NODE_ENV: "production" };
for (const [entry, args] of [
  ["../node_modules/typescript/bin/tsc", ["-b"]],
  ["../node_modules/vite/bin/vite.js", ["build"]],
]) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(entry, import.meta.url)), ...args],
    { env, stdio: "inherit" },
  );
  if (result.error) {
    console.error("Não foi possível iniciar o build.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
