import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
if (root.status !== 0) throw new Error("Não foi possível localizar a raiz do repositório.");
const list = spawnSync("git", ["-C", root.stdout.trim(), "ls-files"], { encoding: "utf8" });
if (list.status !== 0)
  throw new Error("Não foi possível listar os arquivos versionados.");
const allowed = new Set([
  ".env.example",
  ".env.aiven.example",
  ".env.domain.example",
]);
const unsafe = list.stdout
  .split(/\r?\n/)
  .filter(
    (path) =>
      path &&
      ((path.split("/").at(-1).startsWith(".env") &&
        !allowed.has(path.split("/").at(-1))) ||
        /(^|\/)(\.aiven|\.backups|\.test-artifacts|node_modules|\.vercel)(\/|$)/.test(
          path,
        ) ||
        /\.(enc|pem|key)$/i.test(path)),
  );
if (unsafe.length)
  throw new Error(
    "Há arquivos privados versionados. Exportação recusada; revise git ls-files.",
  );
await mkdir(".test-artifacts", { recursive: true });
const output = resolve(".test-artifacts/ediv-source.zip");
const result = spawnSync(
  "git",
  ["archive", "--format=zip", "--output=" + output, "HEAD"],
  { stdio: "inherit" },
);
if (result.status !== 0) throw new Error("Falha ao criar o ZIP.");
console.info(
  "ZIP criado somente com o último commit, sem arquivos locais ignorados:",
  output,
);
