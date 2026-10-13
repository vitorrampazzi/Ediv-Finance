import test from "node:test";
import assert from "node:assert/strict";
import {
  sessionExpiresAt,
  sessionCookieExpiresAt,
  sessionRenewalExpiry,
} from "../server/session-policy.js";

const day = 86_400_000;
const now = Date.parse("2026-10-13T12:00:00Z");
const row = (created, expires) => ({
  session_created_at: new Date(created)
    .toISOString()
    .replace("T", " ")
    .replace("Z", ""),
  session_expires_at: new Date(expires)
    .toISOString()
    .replace("T", " ")
    .replace("Z", ""),
});

test("sessão nova dura 30 dias, com horários UTC", () => {
  assert.equal(sessionExpiresAt(now).getTime(), now + 30 * day);
});
test("cookie é persistente até o limite fixo de 90 dias", () => {
  assert.equal(sessionCookieExpiresAt(now).getTime(), now + 90 * day);
});
test("atividade renova a sessão após um dia", () => {
  assert.equal(
    sessionRenewalExpiry(row(now - 2 * day, now + 28 * day), now)?.getTime(),
    now + 30 * day,
  );
});
test("recarregar não escreve uma renovação a cada requisição", () => {
  assert.equal(
    sessionRenewalExpiry(row(now, now + 30 * day), now + 1000),
    null,
  );
});
test("sessões antigas de oito horas ainda válidas recebem duração persistente", () => {
  assert.equal(
    sessionRenewalExpiry(row(now - day, now + 8 * 3_600_000), now)?.getTime(),
    now + 30 * day,
  );
});
test("renovação respeita limite absoluto de 90 dias", () => {
  assert.equal(
    sessionRenewalExpiry(row(now - 80 * day, now + day), now)?.getTime(),
    now + 10 * day,
  );
  assert.equal(
    sessionRenewalExpiry(row(now - 80 * day, now + 10 * day), now),
    null,
  );
});
test("sessões expiradas ou com datas inválidas não são reativadas", () => {
  assert.equal(sessionRenewalExpiry(row(now - day, now - 1), now), null);
  assert.equal(sessionRenewalExpiry(row(now - 91 * day, now + day), now), null);
  assert.equal(
    sessionRenewalExpiry(
      { session_created_at: "invalid", session_expires_at: "invalid" },
      now,
    ),
    null,
  );
});
