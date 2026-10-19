import test from "node:test";
import assert from "node:assert/strict";
import { createAuthCleanup } from "../server/auth-cleanup-policy.js";

test("limpeza usa apenas tabelas/indexes existentes, expiração e lotes100, no máximo1/h", async () => {
  let time = 0;
  const queries = [];
  const cleanup = createAuthCleanup({
    execute: async (sql) => queries.push(sql),
    now: () => time,
  });
  assert.equal(await cleanup(), true);
  assert.equal(queries.length, 2);
  queries.forEach((sql) =>
    assert.match(
      sql,
      /WHERE expires_at <= UTC_TIMESTAMP\(3\) ORDER BY expires_at LIMIT 100$/,
    ),
  );
  assert.equal(await cleanup(), false);
  time = 3600000;
  assert.equal(await cleanup(), true);
  assert.equal(queries.length, 4);
});

test("requests concorrentes compartilham um trabalho e aguardam sua conclusão", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const cleanup = createAuthCleanup({
    execute: async () => {
      calls++;
      if (calls === 1) await pending;
    },
  });
  const a = cleanup(),
    b = cleanup();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.equal(calls, 2);
});

test("falha de limpeza não derruba API nem repete SQL em toda request", async () => {
  let calls = 0;
  const errors = [];
  const cleanup = createAuthCleanup({
    execute: async () => {
      calls++;
      throw Object.assign(Error("sensitive message"), { code: "ER_TEST" });
    },
    onError: (code) => errors.push(code),
  });
  assert.equal(await cleanup(), false);
  assert.equal(await cleanup(), false);
  assert.equal(calls, 1);
  assert.deepEqual(errors, ["ER_TEST"]);
});
