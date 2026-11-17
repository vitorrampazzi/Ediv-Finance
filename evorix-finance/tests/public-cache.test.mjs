import test, { after, before } from "node:test";
import assert from "node:assert/strict";

// Public cache headers on /api/support/information and /api/learning. The app
// runs with the database pool answered in memory: only the limiter and the
// expired-session cleanup queries are allowed, and any other SQL fails the test.
// Nothing opens a connection, and nothing leaves the process.

Object.assign(process.env, {
  NODE_ENV: "development",
  MYSQL_HOST: "db.invalid",
  MYSQL_PORT: "3306",
  MYSQL_USER: "ediv_unit_only",
  MYSQL_PASSWORD: "unit-only-not-a-secret",
  MYSQL_DATABASE: "ediv_unit_only",
  MYSQL_SSL: "false",
  APP_BASE_URL: "http://127.0.0.1:4180",
  APP_ORIGIN: "http://127.0.0.1:4180",
  TRUST_PROXY: "false",
  SMTP_URL: "",
  MAIL_FROM: "",
  BRAPI_API_KEY: "",
  SUPPORT_EMAIL: "suporte@example.test",
  SUPPORT_HOURS: "seg a sex, 9h às 18h",
  PROFESSIONAL_NAME: "Profissional de teste",
  PROFESSIONAL_CATEGORY: "Categoria de teste",
  PROFESSIONAL_REGISTRATION: "REG-TESTE-0000",
});
for (const name of [
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "MYSQL_SSL_CA",
  "MYSQL_SSL_CA_FILE",
  "BRAPI_PLAN",
  "BRAPI_DAILY_BUDGET",
])
  delete process.env[name];

const { pool } = await import("../server/database.js");
const forbidden = [];
pool.execute = async (sql) => {
  const text = sql.replace(/\s+/g, " ").trim();
  if (text.startsWith("DELETE FROM request_limits"))
    return [{ affectedRows: 0 }];
  if (text.startsWith("INSERT INTO request_limits"))
    return [{ affectedRows: 1 }];
  if (text.startsWith("SELECT hits, expires_at FROM request_limits"))
    return [[{ hits: 1, expires_at: "2099-01-01 00:00:00.000" }]];
  if (/^DELETE FROM (user_sessions|email_verification_tokens) WHERE /.test(text))
    return [{ affectedRows: 0 }];
  forbidden.push(text.slice(0, 80));
  throw new Error("Consulta fora da lista permitida no teste de cache");
};
pool.query = pool.execute;
pool.getConnection = async () => {
  throw new Error("Conexão de banco proibida no teste de cache");
};

const { app } = await import("../server/app.js");

const EXPECTED_INFORMATION_CACHE =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
const SESSION_COOKIE = "evorix_session=00000000-0000-4000-8000-000000000000";

let server;
let base;

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});
});

async function get(path, headers = {}) {
  const response = await fetch(`${base}${path}`, { headers });
  return {
    status: response.status,
    cacheControl: response.headers.get("cache-control"),
    setCookie: response.headers.get("set-cookie"),
    rateLimit: response.headers.get("ratelimit"),
    rateLimitPolicy: response.headers.get("ratelimit-policy"),
    body: await response.text(),
  };
}

test("/api/support/information é cacheável na borda com o cabeçalho esperado", async () => {
  const response = await get("/api/support/information");
  assert.equal(response.status, 200);
  assert.equal(response.cacheControl, EXPECTED_INFORMATION_CACHE);
  assert.equal(response.setCookie, null);
  // sharedCache must strip the limiter headers the global apiLimiter set earlier.
  assert.equal(response.rateLimit, null);
  assert.equal(response.rateLimitPolicy, null);
  const data = JSON.parse(response.body);
  assert.equal(data.email, "suporte@example.test");
  assert.equal(data.subscriptionsAvailable, false);
});

test("/api/support/information responde igual com e sem cookie de sessão", async () => {
  const anonymous = await get("/api/support/information");
  const withCookie = await get("/api/support/information", {
    Cookie: SESSION_COOKIE,
  });
  assert.equal(withCookie.status, anonymous.status);
  assert.equal(withCookie.body, anonymous.body);
  assert.equal(withCookie.cacheControl, anonymous.cacheControl);
  assert.equal(withCookie.cacheControl, EXPECTED_INFORMATION_CACHE);
  assert.equal(withCookie.setCookie, null);
});

test("/api/learning continua no-store", async () => {
  const response = await get("/api/learning");
  assert.equal(response.status, 200);
  assert.equal(response.cacheControl, "no-store");
  // Control: without sharedCache the limiter headers stay, so the check above is meaningful.
  assert.notEqual(response.rateLimit, null);
  assert.notEqual(response.rateLimitPolicy, null);
});

test("nenhuma consulta fora da lista permitida foi tentada", () => {
  assert.deepEqual(forbidden, []);
});
