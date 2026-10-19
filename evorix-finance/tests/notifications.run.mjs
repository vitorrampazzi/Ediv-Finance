import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const app = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
assert.ok(["--preflight", "--integration", "--browser", "--legacy", "--backup", "--e2e"].includes(mode),
  "Use --preflight, --integration, --browser, --legacy, --backup ou --e2e.");

// The app account cannot CREATE schemas; local integration owns a separate mysqld.
if (mode !== "--preflight" && mode !== "--browser" && process.env.EDIV_TEST_MYSQL_DISPOSABLE !== "true") {
  const suite = { "--integration": "notifications.integration.mjs", "--legacy": "integration.test.mjs", "--backup": "notifications.backup.mjs", "--e2e": "notifications.e2e.mjs" }[mode];
  const child = spawn(process.execPath, [fileURLToPath(new URL("notifications.mysql.mjs", import.meta.url)), "tests/" + suite], {
    cwd: app, env: process.env, stdio: "inherit", windowsHide: true,
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1));
  });
  process.exit(code);
}
if (mode === "--preflight") {
  // Never load the app schema, .env.qa, .env.aiven or ambient remote targets.
  const local = parseEnv(await readFile(new URL("../.env", import.meta.url), "utf8"));
  assert.ok(["127.0.0.1", "localhost", "::1"].includes(local.MYSQL_HOST),
    "MYSQL_HOST do .env deve ser loopback.");
  const port = Number(local.MYSQL_PORT || 3306);
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, "Porta inválida.");
  assert.ok(local.MYSQL_USER && local.MYSQL_PASSWORD, "Credenciais locais ausentes.");
  Object.assign(process.env, {
    TARGET_MYSQL_HOST: local.MYSQL_HOST,
    TARGET_MYSQL_PORT: String(port),
    TARGET_MYSQL_USER: local.MYSQL_USER,
    TARGET_MYSQL_PASSWORD: local.MYSQL_PASSWORD,
    EDIV_TEST_MYSQL_DISPOSABLE: "true",
  });
  if (mode === "--preflight") {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: local.MYSQL_HOST, port, user: local.MYSQL_USER,
        password: local.MYSQL_PASSWORD, connectTimeout: 5000,
      });
      const [[row]] = await connection.query("SELECT 1 AS ok, DATABASE() AS selected_schema");
      assert.equal(row.ok, 1);
      assert.equal(row.selected_schema, null);
      console.log("MySQL local: conexão sem schema e SELECT 1 OK; migrações não executadas.");
    } catch (error) {
      console.error("MySQL local indisponível:", error.code || error.name);
      process.exitCode = 1;
    } finally {
      await connection?.end();
    }
  }
}

if (mode === "--preflight") {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    console.log("Playwright: Chrome headless abriu; nenhuma página da aplicação acessada.");
  } catch (error) {
    console.error("Playwright/Chrome indisponível:", error.message.split("\n")[0]);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
} else {
  const suite = {
    "--integration": "notifications.integration.mjs", "--browser": "notifications.browser.mjs",
    "--legacy": "integration.test.mjs", "--backup": "notifications.backup.mjs", "--e2e": "notifications.e2e.mjs",
  }[mode];
  const child = spawn(process.execPath, [fileURLToPath(new URL(suite, import.meta.url))], {
    cwd: app, env: process.env, stdio: "inherit", windowsHide: true,
  });
  child.once("error", () => { console.error("Não foi possível iniciar a suíte QA."); process.exitCode = 1; });
  child.once("exit", (code) => { process.exitCode = code ?? 1; });
}
