import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const workspace = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const artifactRoot = path.resolve(workspace, ".test-artifacts", "notifications-mysql", randomBytes(6).toString("hex"));
const datadir = path.join(artifactRoot, "data-" + randomBytes(6).toString("hex"));
const binary = "C:\\Program Files\\MySQL\\MySQL Server 9.3\\bin\\mysqld.exe";
const logFile = path.join(artifactRoot, "mysql-error.log");
const port = 13317;
const scripts = process.argv.slice(2);
const prepareOnly = scripts.length === 1 && scripts[0] === "--prepare-only";
let mysqld;
let testConnection;
let adminConnection;
let initializing;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(child.exitCode ?? 1);
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function assertPortFree() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}

async function cleanup() {
  if (testConnection) await testConnection.end().catch(() => {});
  if (adminConnection) {
    await adminConnection.query("SHUTDOWN").catch(() => {});
    await adminConnection.end().catch(() => {});
  }
  if (initializing && initializing.exitCode === null) {
    initializing.kill();
    await waitExit(initializing).catch(() => {});
  }
  if (mysqld && mysqld.exitCode === null) {
    if (!adminConnection) mysqld.kill();
    await waitExit(mysqld).catch(() => {});
  }
  const resolved = path.resolve(datadir);
  const safeRoot = artifactRoot + path.sep;
  if (!resolved.startsWith(safeRoot) || !/^data-[a-f0-9]{12}$/.test(path.basename(resolved)))
    throw new Error("Diretório de limpeza fora do espaço descartável.");
  await rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

process.on("SIGINT", () => { cleanup().finally(() => process.exit(130)); });
process.on("SIGTERM", () => { cleanup().finally(() => process.exit(143)); });

try {
  if (!prepareOnly && scripts.length === 0)
    throw new Error("Passe uma ou mais suites de tests/ ou --prepare-only.");
  for (const script of prepareOnly ? [] : scripts) {
    const resolved = path.resolve(workspace, script);
    if (!resolved.startsWith(path.join(workspace, "tests") + path.sep) || !resolved.endsWith(".mjs"))
      throw new Error("A suite deve ser um arquivo .mjs dentro de tests/.");
  }
  await assertPortFree();
  await mkdir(datadir, { recursive: true });
  await writeFile(logFile, "");
  initializing = spawn(binary, ["--no-defaults", "--initialize-insecure", "--datadir=" + datadir, "--log-error=" + logFile], { windowsHide: true, stdio: "ignore" });
  if (await waitExit(initializing) !== 0) throw new Error("Falha ao inicializar MySQL descartável; consulte mysql-error.log.");
  mysqld = spawn(binary, ["--no-defaults", "--console", "--datadir=" + datadir, "--bind-address=127.0.0.1", "--port=" + port, "--mysqlx=OFF", "--skip-log-bin", "--log-error=" + logFile, "--max-connections=30", "--innodb-buffer-pool-size=64M"], { windowsHide: true, stdio: "ignore" });
  let admin;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (mysqld.exitCode !== null) throw new Error("MySQL descartável encerrou; consulte mysql-error.log.");
    try {
      admin = await mysql.createConnection({ host: "127.0.0.1", port, user: "root", password: "", connectTimeout: 1000 });
      break;
    } catch (error) {
      if (error.code === "EACCES" || error.code === "EPERM") throw new Error("Sandbox bloqueou conexão loopback; execute o launcher com permissão escalada.");
      await sleep(500);
    }
  }
  if (!admin) throw new Error("MySQL descartável não ficou pronto.");
  adminConnection = admin;
  const password = randomBytes(32).toString("hex");
  const rootPassword = randomBytes(32).toString("hex");
  const user = "ediv_disposable";
  await admin.query("CREATE USER ?@'127.0.0.1' IDENTIFIED BY ?", [user, password]);
  await admin.query("GRANT ALL PRIVILEGES ON `ediv_test_%`.* TO ?@'127.0.0.1'", [user]);
  await admin.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [rootPassword]);
  testConnection = await mysql.createConnection({ host: "127.0.0.1", port, user, password, connectTimeout: 1000 });
  await testConnection.query("SELECT 1");
  console.log("MySQL descartável pronto em 127.0.0.1:13317; credenciais apenas em memória.");
  if (!prepareOnly) {
    const env = { ...process.env, TARGET_MYSQL_HOST: "127.0.0.1", TARGET_MYSQL_PORT: String(port), TARGET_MYSQL_USER: user, TARGET_MYSQL_PASSWORD: password, EDIV_TEST_MYSQL_DISPOSABLE: "true" };
    for (const key of ["TARGET_MYSQL_SSL_CA_FILE", "MYSQL_SSL_CA", "MYSQL_SSL_CA_FILE", "SMTP_URL", "MAIL_FROM", "GEMINI_API_KEY", "BRAPI_API_KEY"]) delete env[key];
    for (const script of scripts) {
      console.log("Executando " + script + " no banco descartável.");
      const child = spawn(process.execPath, [path.resolve(workspace, script)], { cwd: workspace, env, stdio: "inherit", windowsHide: true });
      const code = await waitExit(child);
      if (code !== 0) { process.exitCode = code; break; }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
  console.log("Instância descartável encerrada e seu datadir removido.");
}
