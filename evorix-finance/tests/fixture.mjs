import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "mysql2/promise";
import argon2 from "argon2";
export async function createFixture() {
  const schema = "ediv_test_" + randomBytes(6).toString("hex");
  if (!/^ediv_test_[a-f0-9]{12}$/.test(schema))
    throw new Error("Nome do banco de testes inválido.");
  const ca = await readFile(
    process.env.TARGET_MYSQL_SSL_CA_FILE || ".aiven/ca.pem",
    "utf8",
  );
  const credentials = {
    host: process.env.TARGET_MYSQL_HOST,
    port: Number(process.env.TARGET_MYSQL_PORT || 3306),
    user: process.env.TARGET_MYSQL_USER,
    password: process.env.TARGET_MYSQL_PASSWORD,
    ssl: { ca, rejectUnauthorized: true },
    connectTimeout: 10000,
  };
  if (!credentials.host || !credentials.user || !credentials.password)
    throw new Error(
      "Configure .env.aiven para criar o banco isolado de testes.",
    );
  const admin = await createConnection(credentials);
  let created = false;
  let server;
  let pool;
  const nativeFetch = globalThis.fetch;
  const state = { ai: "ok", aiCalls: 0 };
  async function cleanup() {
    globalThis.fetch = nativeFetch;
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    if (pool) await pool.end();
    if (created && /^ediv_test_[a-f0-9]{12}$/.test(schema))
      await admin.query("DROP DATABASE `" + schema + "`");
    await admin.end();
  }
  try {
    await admin.query(
      "CREATE DATABASE `" +
        schema +
        "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    created = true;
    Object.assign(process.env, {
      NODE_ENV: "development",
      MYSQL_HOST: credentials.host,
      MYSQL_PORT: String(credentials.port),
      MYSQL_USER: credentials.user,
      MYSQL_PASSWORD: credentials.password,
      MYSQL_DATABASE: schema,
      MYSQL_SSL: "true",
      MYSQL_SSL_CA: ca,
      MYSQL_CONNECTION_LIMIT: "4",
      APP_BASE_URL: "http://127.0.0.1:4180",
      APP_ORIGIN: "http://127.0.0.1:4180",
      SMTP_URL: "",
      MAIL_FROM: "",
      TRUST_PROXY: "false",
      BRAPI_API_KEY: "",
      AI_ASSISTANT_ENABLED: "true",
      EDIV_ASSISTANT_PREVIEW: "true",
      GEMINI_API_KEY: "ediv-fake-key-for-tests",
      AI_USER_DAILY_LIMIT: "20",
      AI_DAILY_LIMIT: "100",
    });
    delete process.env.VERCEL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
    globalThis.fetch = async (input, options) => {
      const url = new URL(
        typeof input === "string" ? input : input.url || String(input),
      );
      if (url.hostname === "brapi.dev")
        return Response.json({
          stocks: [
            {
              stock: "PETR4",
              name: "Empresa de teste A",
              close: 10,
              change: 1,
              volume: 100,
              type: "stock",
              sector: "Energy",
            },
            {
              stock: "ITUB4",
              name: "Empresa de teste B",
              close: 20,
              change: 2,
              volume: 200,
              type: "stock",
              sector: "Finance",
            },
          ],
          indexes: [],
          availableSectors: ["Energy", "Finance"],
          requestedAt: new Date().toISOString(),
        });
      if (url.hostname === "generativelanguage.googleapis.com") {
        state.aiCalls++;
        if (state.ai === "retry" && state.aiCalls === 1)
          return Response.json({ error: "simulated" }, { status: 503 });
        if (state.ai === "down")
          return Response.json({ error: "simulated" }, { status: 503 });
        if (state.ai === "quota")
          return Response.json({ error: "simulated" }, { status: 429 });
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "Diversificação pode reduzir concentração e não elimina riscos. Resposta simulada de teste.",
                  },
                ],
              },
            },
          ],
        });
      }
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
        throw new Error("Serviço externo não autorizado no teste.");
      return nativeFetch(input, options);
    };
    const database = await import("../server/database.js");
    pool = database.pool;
    await database.runMigrations();
    const { app } = await import("../server/app.js");
    server = await new Promise((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });
    const origin = "http://127.0.0.1:" + server.address().port;
    const password = "Ediv-Test-Only-2026!";
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const accounts = {};
    for (const [key, role] of [
      ["admin", "ADMIN"],
      ["analyst", "ANALYST"],
      ["a", "USER"],
      ["b", "USER"],
    ]) {
      const id = randomUUID();
      const email = "qa-" + key + "@ediv.test";
      await pool.execute(
        "INSERT INTO users(id,name,email,password_hash,email_verified_at) VALUES(?,?,?,?,UTC_TIMESTAMP(3))",
        [id, "Teste " + key, email, hash],
      );
      await pool.execute("INSERT INTO user_access(user_id,role) VALUES(?,?)", [
        id,
        role,
      ]);
      accounts[key] = { id, email, password, cookie: "" };
    }
    async function request(
      account,
      path,
      {
        method = "GET",
        body,
        raw,
        headers = {},
        originHeader = "http://127.0.0.1:4180",
      } = {},
    ) {
      const response = await nativeFetch(origin + path, {
        method,
        headers: {
          Origin: originHeader,
          ...(account?.cookie ? { Cookie: account.cookie } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        ...(raw !== undefined
          ? { body: raw }
          : body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
      });
      const cookie = response.headers.get("set-cookie");
      if (account && cookie) account.cookie = cookie.split(";")[0];
      const text = await response.text();
      let value;
      try {
        value = JSON.parse(text);
      } catch {
        value = text;
      }
      return {
        status: response.status,
        body: value,
        headers: response.headers,
      };
    }
    for (const account of Object.values(accounts))
      await request(account, "/api/auth/login", {
        method: "POST",
        body: { email: account.email, password },
      });
    async function clearLimits() {
      await pool.execute("DELETE FROM request_limits");
    }
    return {
      schema,
      origin,
      accounts,
      state,
      pool,
      password,
      request,
      clearLimits,
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => {});
    throw error;
  }
}
