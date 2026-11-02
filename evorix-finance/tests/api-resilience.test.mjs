import test from "node:test";
import assert from "node:assert/strict";
import {
  busyMessage,
  unavailableMessage,
  classifyServiceError,
  createApiErrorHandler,
} from "../server/api-errors.js";

const coded = (code, message = "detalhe interno host.example SELECT x") =>
  Object.assign(new Error(message), { code });
const storeFailure = (cause) =>
  Object.assign(new Error("Rate limit storage unavailable"), {
    code: "RATE_LIMIT_STORE_UNAVAILABLE",
    cause,
  });

function fakeResponse() {
  return {
    headersSent: false,
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test("classifica indisponibilidade do banco separada de sobrecarga real", () => {
  for (const code of [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "PROTOCOL_CONNECTION_LOST",
  ]) {
    assert.equal(classifyServiceError(coded(code)).kind, "unavailable", code);
    const wrapped = classifyServiceError(storeFailure(coded(code)));
    assert.deepEqual(wrapped, {
      kind: "unavailable",
      code: "RATE_LIMIT_STORE_UNAVAILABLE",
      causeCode: code,
    });
  }
  const dualStack = Object.assign(new AggregateError([coded("ECONNREFUSED")]), {
    code: undefined,
  });
  assert.equal(classifyServiceError(dualStack).kind, "unavailable");
  for (const error of [
    coded("PASSWORD_WORK_BUSY"),
    coded("ER_CON_COUNT_ERROR"),
    coded("ER_USER_LIMIT_REACHED"),
    coded("ER_LOCK_WAIT_TIMEOUT"),
    new Error("Queue limit reached."),
    storeFailure(coded("ER_LOCK_WAIT_TIMEOUT")),
  ])
    assert.equal(classifyServiceError(error).kind, "busy");
  // Any other failure of the mandatory limit store is an outage, not "busy".
  assert.equal(
    classifyServiceError(storeFailure(new Error("Invalid rate limit counter")))
      .kind,
    "unavailable",
  );
  assert.equal(classifyServiceError(coded("ER_PARSE_ERROR")), null);
  assert.equal(classifyServiceError(new TypeError("x")), null);
});

test("503 registra só códigos, com throttle, e responde com mensagem honesta", () => {
  const lines = [];
  let time = 1_000;
  const handler = createApiErrorHandler({
    log: (line) => lines.push(line),
    now: () => time,
  });
  const send = (error) => {
    const res = fakeResponse();
    handler(error, { requestId: "req-1" }, res, () => {});
    return res;
  };
  const down = send(storeFailure(coded("ENOTFOUND", "getaddrinfo ENOTFOUND db.secret-host.example")));
  assert.equal(down.statusCode, 503);
  assert.equal(down.body.error, unavailableMessage);
  assert.equal(down.headers["retry-after"], "30");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /RATE_LIMIT_STORE_UNAVAILABLE cause=ENOTFOUND/);
  assert.match(lines[0], /req-1/);
  assert.doesNotMatch(lines[0], /secret-host|getaddrinfo|SELECT/);

  time += 5_000;
  send(storeFailure(coded("ENOTFOUND")));
  assert.equal(lines.length, 1, "Mesma causa em 10 s não repete o log");
  send(storeFailure(coded("ECONNREFUSED")));
  assert.equal(lines.length, 2, "Causa diferente é registrada");
  time += 10_001;
  send(storeFailure(coded("ENOTFOUND")));
  assert.equal(lines.length, 3, "Após o intervalo a causa volta a aparecer");

  const busy = send(coded("PASSWORD_WORK_BUSY"));
  assert.equal(busy.statusCode, 503);
  assert.equal(busy.body.error, busyMessage);
  assert.equal(busy.headers["retry-after"], "2");
  assert.match(lines.at(-1), /busy PASSWORD_WORK_BUSY cause=none/);

  const tooLarge = send(Object.assign(new Error("x"), { type: "entity.too.large" }));
  assert.equal(tooLarge.statusCode, 413);
  const committed = fakeResponse();
  committed.headersSent = true;
  handler(coded("ENOTFOUND"), {}, committed, () => {});
  assert.equal(committed.body, undefined);
});

test("API sem banco alcançável: 503 honesto, limites por IP antes de contas e cache público", async (t) => {
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
  });
  for (const name of ["VERCEL", "VERCEL_ENV", "VERCEL_URL", "MYSQL_SSL_CA", "MYSQL_SSL_CA_FILE"])
    delete process.env[name];

  const { pool } = await import("../server/database.js");
  const { MysqlLimitStore } = await import("../server/limit-store.js");
  // No connection is ever opened: every statement is answered in memory.
  const counters = new Map();
  const state = { mode: "ok", calls: [] };
  pool.execute = async (sql, params = []) => {
    const text = sql.replace(/\s+/g, " ").trim();
    state.calls.push(text.slice(0, 40));
    if (text.startsWith("DELETE FROM request_limits")) {
      if (state.mode === "cleanup-down") throw coded("ENOTFOUND");
      if (state.mode === "cleanup-lock") throw coded("ER_LOCK_WAIT_TIMEOUT");
      return [{ affectedRows: 0 }];
    }
    if (text.startsWith("INSERT INTO request_limits")) {
      if (state.mode === "down") throw coded("ENOTFOUND");
      if (state.mode === "refused") throw coded("ECONNREFUSED");
      counters.set(params[0], (counters.get(params[0]) || 0) + 1);
      return [{ affectedRows: 1 }];
    }
    if (text.startsWith("SELECT hits, expires_at FROM request_limits"))
      return [[{ hits: counters.get(params[0]), expires_at: "2099-01-01 00:00:00.000" }]];
    if (/^DELETE FROM (user_sessions|email_verification_tokens) WHERE expires_at/.test(text))
      return [{ affectedRows: 0 }];
    if (text === "SELECT 1") {
      if (state.mode === "busy") throw coded("ER_CON_COUNT_ERROR");
      if (state.mode === "sql-error") throw coded("ER_PARSE_ERROR");
      return [[{ 1: 1 }]];
    }
    if (text.startsWith("SELECT id,title,created_at,entries_json FROM ranking_publications"))
      return [[]];
    if (text.startsWith("SELECT u.id, u.name, u.email, u.password_hash")) return [[]];
    if (text.startsWith("SELECT id, email FROM users WHERE email")) return [[]];
    throw new Error("SQL inesperado no teste: " + text.slice(0, 60));
  };
  const hits = (prefix, key) =>
    counters.get(new MysqlLimitStore(prefix).bucket(key)) || 0;

  const logs = { error: [], warn: [] };
  const original = { error: console.error, warn: console.warn, info: console.info };
  console.error = (...args) => logs.error.push(args.join(" "));
  console.warn = (...args) => logs.warn.push(args.join(" "));
  console.info = () => {};
  const { app } = await import("../server/app.js");
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  t.after(async () => {
    Object.assign(console, original);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const call = async (path, body) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: body
        ? { Origin: "http://127.0.0.1:4180", "Content-Type": "application/json" }
        : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  };

  // Cleanup that cannot reach the database fails fast, without a second attempt.
  state.mode = "cleanup-down";
  state.calls = [];
  const first = await call("/api/health");
  assert.equal(first.status, 503);
  assert.equal(first.body.error, unavailableMessage);
  assert.ok(!state.calls.some((sql) => sql.startsWith("INSERT INTO request_limits")));
  assert.equal(logs.error.length, 1);
  assert.match(logs.error[0], /status=503 unavailable RATE_LIMIT_STORE_UNAVAILABLE cause=ENOTFOUND/);
  assert.doesNotMatch(logs.error[0], /db\.invalid|detalhe interno|SELECT/);

  state.mode = "down";
  const down = await call("/api/rankings/public");
  assert.equal(down.status, 503);
  assert.equal(down.body.error, unavailableMessage);
  assert.equal(down.headers.get("cache-control"), "no-store");
  assert.equal(logs.error.length, 1, "Mesma causa fica no throttle");
  state.mode = "refused";
  assert.equal((await call("/api/health")).status, 503);
  assert.match(logs.error.at(-1), /cause=ECONNREFUSED/);

  state.mode = "busy";
  const busy = await call("/api/health");
  assert.equal(busy.status, 503);
  assert.equal(busy.body.error, busyMessage);
  state.mode = "sql-error";
  const failed = await call("/api/health");
  assert.equal(failed.status, 500);
  assert.match(logs.error.at(-1), /ER_PARSE_ERROR/);

  // A cleanup lock wait one hour later is only logged; the request succeeds.
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 3_600_000;
  try {
    state.mode = "cleanup-lock";
    assert.equal((await call("/api/health")).status, 200);
  } finally {
    Date.now = realNow;
  }
  assert.match(logs.warn.at(-1), /Rate limit cleanup failed: ER_LOCK_WAIT_TIMEOUT/);

  state.mode = "ok";
  const health = await call("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("cache-control"), "no-store");
  const ranking = await call("/api/rankings/public");
  assert.equal(ranking.status, 200);
  assert.equal(
    ranking.headers.get("cache-control"),
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  assert.equal(ranking.headers.get("set-cookie"), null);

  // Login: the 8-per-IP gate runs before the account counters are touched.
  const victim = "vitima@ediv.test";
  for (let i = 0; i < 8; i++)
    assert.equal(
      (await call("/api/auth/login", { email: victim, password: "Errada-1!" })).status,
      401,
    );
  const blocked = await call("/api/auth/login", { email: victim, password: "Errada-1!" });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, "RATE_LIMITED");
  assert.equal(hits("login-ip", "127.0.0.1"), 9);
  assert.equal(hits("login-account-ip", victim + "|127.0.0.1"), 8);
  assert.equal(hits("login-account-hour", victim), 8);
  assert.equal(hits("login-account-ip", victim), 0, "Sem contador só por e-mail na janela curta");

  // E-mail routes: per-IP gate before the shared project budgets.
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await call("/api/auth/password/forgot", { email: `alvo-${i}@ediv.test` })).status,
      202,
    );
  const gated = await call("/api/auth/password/forgot", { email: "alvo-5@ediv.test" });
  assert.equal(gated.status, 429);
  assert.equal(hits("email-entry", "127.0.0.1"), 6);
  assert.equal(hits("email-project-ten-minutes", "project"), 5);
  assert.equal(hits("email-project-day", "project"), 5);
  // Separate recovery counters: forgot attempts do not consume the reset quota.
  assert.equal(hits("password-recovery", "127.0.0.1"), 5);
  assert.equal(hits("password-reset", "127.0.0.1"), 0);
});
