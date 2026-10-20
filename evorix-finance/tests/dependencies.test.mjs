import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hash, verify, argon2id } from "argon2";

test("instalação bloqueia scripts automáticos e lockfile mantém origem e integridade", async () => {
  const config = await readFile(new URL("../.npmrc", import.meta.url), "utf8");
  assert.match(config, /^ignore-scripts=true$/m);
  const lock = JSON.parse(
    await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  for (const [name, pkg] of Object.entries(lock.packages)) {
    if (!name) continue;
    assert.equal(
      new URL(pkg.resolved).origin,
      "https://registry.npmjs.org",
      name,
    );
    assert.match(pkg.integrity, /^sha512-/, name);
  }
});

test("argon2 pré-compilado gera e verifica hashes sem scripts de instalação", async () => {
  const password = "Senha-sintetica-teste-2026!";
  const encoded = await hash(password, { type: argon2id });
  assert.match(encoded, /^\$argon2id\$/);
  assert.equal(await verify(encoded, password), true);
  assert.equal(await verify(encoded, "Senha-incorreta!"), false);
});
