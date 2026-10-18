import test from "node:test";
import assert from "node:assert/strict";
import { isValidNewPassword, passwordPolicyHint } from "../password-policy.mjs";
import {
  newPasswordSchema,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../server/password-schema.js";

test("nova senha exige mínimo8, maiúscula, número e especial", () => {
  assert.equal(isValidNewPassword("Abcdef1!"), true);
  for (const value of [
    "Abcde1!",
    "abcdef1!",
    "Abcdefg!",
    "Abcdef12",
    "Abcdef1 ",
    "        ",
    "",
    null,
    12345678,
  ]) {
    assert.equal(isValidNewPassword(value), false);
  }
});

test("Unicode: maiúsculas e dígitos decimais aceitos; emoji não infla mínimo", () => {
  assert.equal(isValidNewPassword("Ábcdef٣!"), true);
  assert.equal(isValidNewPassword("Abcdef1😀"), true);
  assert.equal(isValidNewPassword("A1!😀😀😀"), false);
  assert.equal(isValidNewPassword("abcdef1\u0301"), false);
  assert.equal(isValidNewPassword("Abcdef1\u0301"), false);
  assert.equal(isValidNewPassword("AbcdefⅣ!"), false);
});

test("preserva espaços e limite128 sem trim/normalização", () => {
  const value = " Abcde1! ";
  assert.equal(newPasswordSchema.parse(value), value);
  assert.equal(isValidNewPassword("Ab1!" + "a".repeat(124)), true);
  assert.equal(isValidNewPassword("Ab1!" + "a".repeat(125)), false);
  assert.equal(isValidNewPassword("Ab1!" + "😀".repeat(62)), true);
  assert.equal(isValidNewPassword("Ab1!" + "😀".repeat(63)), false);
});

test("schemas reais de cadastro/reset/troca aplicam política idêntica", () => {
  for (const password of ["Abcdef1!", "Ábcdef٣!", " Abcde1! "]) {
    assert.equal(
      registerSchema.safeParse({
        name: "Pessoa Teste",
        email: " Pessoa@EXAMPLE.COM ",
        password,
      }).success,
      true,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: "x".repeat(43), password })
        .success,
      true,
    );
    assert.equal(
      changePasswordSchema.safeParse({ currentPassword: "legada", password })
        .success,
      true,
    );
  }
  for (const password of [
    "abcdefgh",
    "Abcdefgh",
    "Abcdefg1",
    "Abcdefg!",
    "Abcde1!",
    "a".repeat(129),
  ]) {
    assert.equal(
      registerSchema.safeParse({
        name: "Pessoa Teste",
        email: "pessoa@example.com",
        password,
      }).success,
      false,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: "x".repeat(43), password })
        .success,
      false,
    );
    assert.equal(
      changePasswordSchema.safeParse({ currentPassword: "legada", password })
        .success,
      false,
    );
  }
  assert.match(
    newPasswordSchema.safeParse("abcdefgh").error.issues[0].message,
    /maiúscula/,
  );
  assert.match(passwordPolicyHint, /8 a 128/);
});

test("login e senha atual continuam aceitando credenciais legadas", () => {
  for (const password of ["a", "antigasenha", " senha antiga "]) {
    const login = loginSchema.parse({
      email: " PESSOA@EXAMPLE.COM ",
      password,
    });
    assert.equal(login.password, password);
    assert.equal(login.email, "pessoa@example.com");
    assert.equal(
      changePasswordSchema.parse({
        currentPassword: password,
        password: "Abcdef1!",
      }).currentPassword,
      password,
    );
  }
  assert.equal(
    loginSchema.safeParse({ email: "pessoa@example.com", password: "" })
      .success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({
      email: "pessoa@example.com",
      password: "a".repeat(129),
    }).success,
    false,
  );
});
