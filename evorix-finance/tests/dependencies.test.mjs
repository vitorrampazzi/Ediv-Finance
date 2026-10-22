import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hash, verify, argon2id } from "argon2";

function assertPackageSource(packages, name) {
  const pkg = packages[name];
  if (pkg.inBundle === true) {
    const separator = name.lastIndexOf("/node_modules/");
    assert.ok(separator > 0, name);
    const parent = packages[name.slice(0, separator)];
    assert.ok(
      Array.isArray(parent?.bundleDependencies) &&
        parent.bundleDependencies.includes(
          name.slice(separator + "/node_modules/".length),
        ),
      name,
    );
    assert.equal(new URL(parent.resolved).origin, "https://registry.npmjs.org", name);
    assert.match(parent.integrity, /^sha512-/, name);
    return;
  }
  assert.equal(new URL(pkg.resolved).origin, "https://registry.npmjs.org", name);
  assert.match(pkg.integrity, /^sha512-/, name);
}

test("instalação bloqueia scripts automáticos e lockfile mantém origem e integridade", async () => {
  const config = await readFile(new URL("../.npmrc", import.meta.url), "utf8");
  assert.match(config, /^ignore-scripts=true$/m);
  const lock = JSON.parse(
    await readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  for (const name of Object.keys(lock.packages)) {
    if (!name) continue;
    assertPackageSource(lock.packages, name);
  }
});

test("pacote embutido exige declaração e integridade do pacote que o contém", () => {
  const parent = "node_modules/example";
  const child = parent + "/node_modules/embedded";
  const packages = {
    [parent]: { resolved: "https://registry.npmjs.org/example/-/example-1.0.0.tgz", integrity: "sha512-example", bundleDependencies: ["embedded"] },
    [child]: { inBundle: true },
  };
  assert.doesNotThrow(() => assertPackageSource(packages, child));
  assert.throws(() => assertPackageSource({ [parent]: { inBundle: true } }, parent));
  packages[parent].bundleDependencies = [];
  assert.throws(() => assertPackageSource(packages, child));
  packages[parent].bundleDependencies = "embedded";
  assert.throws(() => assertPackageSource(packages, child));
  packages[parent].bundleDependencies = ["embedded"];
  packages[parent].resolved = "https://example.com/package.tgz";
  assert.throws(() => assertPackageSource(packages, child));
  packages[parent].resolved = "https://registry.npmjs.org/example/-/example-1.0.0.tgz";
  packages[parent].integrity = "sha1-invalid";
  assert.throws(() => assertPackageSource(packages, child));
});

test("argon2 pré-compilado gera e verifica hashes sem scripts de instalação", async () => {
  const password = "Senha-sintetica-teste-2026!";
  const encoded = await hash(password, { type: argon2id });
  assert.match(encoded, /^\$argon2id\$/);
  assert.equal(await verify(encoded, password), true);
  assert.equal(await verify(encoded, "Senha-incorreta!"), false);
});
