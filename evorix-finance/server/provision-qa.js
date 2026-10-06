import { randomBytes, randomUUID } from "node:crypto";
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createConnection } from "mysql2/promise";
import argon2 from "argon2";

const database = "ediv_finance_qa";
const output = resolve(".env.qa");
const host = process.env.TARGET_MYSQL_HOST?.trim();
const port = Number(process.env.TARGET_MYSQL_PORT || 3306);
const adminEmail = process.argv[2]?.trim().toLowerCase();
const caFile = process.env.TARGET_MYSQL_SSL_CA_FILE || ".aiven/ca.pem";
if (
  !host ||
  !process.env.TARGET_MYSQL_USER ||
  !process.env.TARGET_MYSQL_PASSWORD
)
  throw new Error("Configure o acesso administrativo em .env.aiven.");
if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))
  throw new Error("Informe um e-mail válido para a conta de QA.");
try {
  await access(output);
  throw new Error(".env.qa já existe; nenhuma credencial foi alterada.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const ca = await readFile(resolve(caFile), "utf8");
const username = "ediv_qa_" + randomBytes(5).toString("hex");
const password = randomBytes(32).toString("base64url");
const adminPassword = randomBytes(24).toString("base64url");
const account = `'${username}'@'%'`;
const connection = await createConnection({
  host,
  port,
  user: process.env.TARGET_MYSQL_USER,
  password: process.env.TARGET_MYSQL_PASSWORD,
  ssl: { ca, rejectUnauthorized: true },
  connectTimeout: 10000,
});
try {
  const [existing] = await connection.execute(
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?",
    [database],
  );
  if (existing.length)
    throw new Error("O schema QA já existe; nada foi alterado.");
  await connection.query(
    "CREATE DATABASE `ediv_finance_qa` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  await connection.query("USE `ediv_finance_qa`");
  await connection.query(
    "CREATE TABLE schema_migrations (name VARCHAR(190) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  );
  const files = (await readdir(new URL("./migrations/", import.meta.url)))
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort();
  for (const file of files) {
    const sql = await readFile(
      new URL("./migrations/" + file, import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean))
      await connection.query(statement);
    await connection.execute("INSERT INTO schema_migrations(name) VALUES(?)", [
      file,
    ]);
    console.info("Migração de QA:", file);
  }
  if (adminEmail) {
    const id = randomUUID();
    await connection.beginTransaction();
    await connection.execute(
      "INSERT INTO users(id,name,email,password_hash,email_verified_at) VALUES(?,?,?, ?,UTC_TIMESTAMP(3))",
      [id, "Administrador QA", adminEmail, await argon2.hash(adminPassword)],
    );
    await connection.execute(
      "INSERT INTO user_access(user_id,role) VALUES(?,'ADMIN')",
      [id],
    );
    await connection.execute(
      "INSERT INTO admin_audit_events(id,target_id,action,after_state) VALUES(?,?,'ADMIN_BOOTSTRAPPED',?)",
      [randomUUID(), id, JSON.stringify({ role: "ADMIN", environment: "QA" })],
    );
    await connection.commit();
  }
  await connection.query(`CREATE USER ${account} IDENTIFIED BY '${password}'`);
  await connection.query(
    `GRANT SELECT,INSERT,UPDATE,DELETE ON \`ediv_finance_qa\`.* TO ${account}`,
  );
  const values = {
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: "3001",
    MYSQL_HOST: host,
    MYSQL_PORT: String(port),
    MYSQL_DATABASE: database,
    MYSQL_USER: username,
    MYSQL_PASSWORD: password,
    MYSQL_SSL: "true",
    MYSQL_SSL_CA_FILE: caFile,
    MYSQL_CONNECTION_LIMIT: "3",
    SKIP_STARTUP_MIGRATIONS: "true",
    APP_BASE_URL: "http://localhost:5173",
    APP_ORIGIN: "http://localhost:5173",
    SMTP_URL: "",
    MAIL_FROM: "",
    AI_ASSISTANT_ENABLED: "true",
    AI_DAILY_LIMIT: "100",
    AI_USER_DAILY_LIMIT: "20",
    GEMINI_API_KEY: "",
    ...(adminEmail
      ? { QA_ADMIN_EMAIL: adminEmail, QA_ADMIN_PASSWORD: adminPassword }
      : {}),
  };
  await writeFile(
    output,
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join("\n") + "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.info(
    "QA criada sem copiar dados de produção. Credenciais locais: .env.qa (ignorado pelo Git).",
  );
} catch (error) {
  await connection.rollback().catch(() => {});
  console.error(
    "Configuração de QA interrompida:",
    error.code || error.message,
  );
  console.error(
    "Nenhum banco ou usuário existente foi apagado. Inspecione o schema QA antes de tentar novamente.",
  );
  process.exitCode = 1;
} finally {
  await connection.end();
}
