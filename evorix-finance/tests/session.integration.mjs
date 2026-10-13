import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createFixture } from "./fixture.mjs";

// The fixture only creates temporary users in its own disposable schema.
const fixture = await createFixture();
const { request, pool, accounts, password } = fixture;
const digest = (cookie) =>
  createHash("sha256").update(cookie.split("=")[1]).digest("hex");
async function login() {
  await fixture.clearLimits();
  const account = { email: accounts.a.email, cookie: "" };
  const result = await request(account, "/api/auth/login", {
    method: "POST",
    body: { email: account.email, password },
  });
  assert.equal(result.status, 200);
  return { account, result };
}
async function sessionRow(account) {
  const [rows] = await pool.execute(
    "SELECT *, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), expires_at) AS remaining FROM user_sessions WHERE token_hash=?",
    [digest(account.cookie)],
  );
  return rows[0];
}

try {
  await test("persistência, renovação e encerramento de sessão na API e MySQL isolados", async (t) => {
    await t.test(
      "login entrega cookie persistente e sessão de 30 dias",
      async () => {
        const { account, result } = await login();
        const cookie = result.headers.get("set-cookie");
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Strict/);
        assert.match(cookie, /Expires=/);
        const seconds = Number(cookie.match(/Max-Age=(\d+)/)?.[1]);
        assert.ok(seconds >= 7_775_990 && seconds <= 7_776_000);
        assert.ok((await sessionRow(account)).remaining > 2_591_990);
        const restored = await request(account, "/api/auth/me");
        assert.equal(restored.body.user.email, account.email);
        assert.equal(restored.headers.get("set-cookie"), null);
      },
    );
    await t.test(
      "sessão antiga válida é renovada sem trocar a senha",
      async () => {
        const { account } = await login();
        await pool.execute(
          "UPDATE user_sessions SET created_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 DAY), expires_at=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 8 HOUR) WHERE token_hash=?",
          [digest(account.cookie)],
        );
        const result = await request(account, "/api/auth/me");
        assert.equal(result.status, 200);
        assert.equal(result.headers.get("set-cookie"), null);
        assert.ok((await sessionRow(account)).remaining > 2_591_990);
        assert.equal(result.body.user.session_expires_at, undefined);
      },
    );
    await t.test("renovação para no limite absoluto de 90 dias", async () => {
      const { account } = await login();
      await pool.execute(
        "UPDATE user_sessions SET created_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 80 DAY), expires_at=DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 1 DAY) WHERE token_hash=?",
        [digest(account.cookie)],
      );
      assert.equal((await request(account, "/api/auth/me")).status, 200);
      const remaining = (await sessionRow(account)).remaining;
      assert.ok(remaining > 863_990 && remaining <= 864_000);
      await pool.execute(
        "UPDATE user_sessions SET created_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 91 DAY) WHERE token_hash=?",
        [digest(account.cookie)],
      );
      assert.equal(
        (await request({ cookie: account.cookie }, "/api/auth/me")).status,
        401,
      );
    });
    await t.test("sessão expirada não é reativada", async () => {
      const { account } = await login();
      const cookie = account.cookie;
      await pool.execute(
        "UPDATE user_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE token_hash=?",
        [digest(cookie)],
      );
      const result = await request({ cookie }, "/api/auth/me");
      assert.equal(result.status, 401);
      assert.equal(result.headers.get("set-cookie"), null);
      assert.ok((await sessionRow({ cookie })).remaining < 0);
    });
    await t.test(
      "sair revoga cookie antigo e permite entrar em outra conta",
      async () => {
        const { account } = await login();
        const oldCookie = account.cookie;
        const result = await request(account, "/api/auth/logout", {
          method: "POST",
        });
        assert.equal(result.status, 204);
        assert.match(
          result.headers.get("set-cookie"),
          /Expires=Thu, 01 Jan 1970/,
        );
        assert.equal(await sessionRow({ cookie: oldCookie }), undefined);
        assert.equal(
          (await request({ cookie: oldCookie }, "/api/auth/me")).status,
          401,
        );
        const next = await request(account, "/api/auth/login", {
          method: "POST",
          body: { email: accounts.b.email, password },
        });
        assert.equal(next.status, 200);
        assert.equal(
          (await request(account, "/api/auth/me")).body.user.id,
          accounts.b.id,
        );
      },
    );
  });
} finally {
  await fixture.cleanup();
}
