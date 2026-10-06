import { randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createFixture } from "./fixture.mjs";
const fixture = await createFixture();
const { createDatabasePool, runMigrations } =
  await import("../server/database.js");
const bootstrap = createDatabasePool({ database: undefined });
const restored = "ediv_test_" + randomBytes(6).toString("hex");
let restoredPool;
let created = false;
const env = {
  ...process.env,
  BACKUP_DIRECTORY: resolve(".test-artifacts", "backups"),
  BACKUP_KEY: randomBytes(32).toString("hex"),
};
function command(mode, file, overrides = {}) {
  return spawnSync(
    process.execPath,
    ["server/backup.js", mode, ...(file ? [file] : [])],
    {
      env: { ...env, ...overrides },
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
    },
  );
}
try {
  const draftId = randomUUID();
  const savedPayload = {
    note: "Pesquisa fictícia privada para testar restauração",
  };
  await fixture.pool.execute(
    "INSERT INTO research_drafts(id,user_id,title,payload) VALUES(?,?,?,?)",
    [
      draftId,
      fixture.accounts.analyst.id,
      "Rascunho de teste",
      JSON.stringify(savedPayload),
    ],
  );
  await fixture.pool.execute(
    "INSERT INTO learning_progress(user_id,lesson_id) VALUES(?,?)",
    [fixture.accounts.a.id, "ranking"],
  );
  const [publication] = await fixture.pool.execute(
    "INSERT INTO ranking_publications(title,source_file_name,entries_json,imported_by) VALUES(?,?,?,?)",
    ["Publicação fictícia", "teste.csv", "[]", fixture.accounts.analyst.id],
  );
  await fixture.pool.execute(
    "INSERT INTO ranking_changes(publication_id,changed_tickers) VALUES(?,?)",
    [publication.insertId, JSON.stringify(["PETR4"])],
  );
  await fixture.pool.execute(
    "INSERT INTO notification_reads(user_id,publication_id) VALUES(?,?)",
    [fixture.accounts.a.id, publication.insertId],
  );
  assert.equal(command("backup").status, 0, "Backup do schema isolado falhou.");
  const files = (await readdir(env.BACKUP_DIRECTORY)).sort();
  const file = resolve(env.BACKUP_DIRECTORY, files.at(-1));
  const encrypted = await readFile(file, "utf8");
  assert.ok(!encrypted.includes("qa-admin@ediv.test"));
  assert.equal(JSON.parse(encrypted).format, "ediv-backup-v1");
  assert.equal(
    command("restore", file).status,
    1,
    "Restauração em banco preenchido deve ser recusada.",
  );
  if (!/^ediv_test_[a-f0-9]{12}$/.test(restored) || restored === fixture.schema)
    throw new Error("Destino de restauração inválido.");
  await bootstrap.query(
    "CREATE DATABASE `" +
      restored +
      "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
  );
  created = true;
  restoredPool = createDatabasePool({ database: restored });
  await runMigrations(restoredPool);
  assert.equal(
    command("restore", file, {
      MYSQL_DATABASE: restored,
      BACKUP_KEY: randomBytes(32).toString("hex"),
    }).status,
    1,
    "Chave errada deve ser rejeitada antes de inserir.",
  );
  assert.equal(
    command("restore", file, { MYSQL_DATABASE: restored }).status,
    0,
    "Restauração no schema vazio falhou.",
  );
  const [users] = await restoredPool.execute(
    "SELECT COUNT(*) AS total FROM users",
  );
  const [roles] = await restoredPool.execute(
    "SELECT COUNT(*) AS total FROM user_access",
  );
  const [sessions] = await restoredPool.execute(
    "SELECT COUNT(*) AS total FROM user_sessions",
  );
  assert.equal(Number(users[0].total), 4);
  assert.equal(Number(roles[0].total), 4);
  assert.equal(Number(sessions[0].total), 0);
  const [drafts] = await restoredPool.execute(
    "SELECT user_id,payload FROM research_drafts WHERE id=?",
    [draftId],
  );
  assert.equal(drafts[0].user_id, fixture.accounts.analyst.id);
  assert.deepEqual(
    typeof drafts[0].payload === "string"
      ? JSON.parse(drafts[0].payload)
      : drafts[0].payload,
    savedPayload,
  );
  const [progress] = await restoredPool.execute(
    "SELECT user_id,lesson_id FROM learning_progress",
  );
  assert.deepEqual(
    progress.map((row) => ({ ...row })),
    [{ user_id: fixture.accounts.a.id, lesson_id: "ranking" }],
  );
  const [changes] = await restoredPool.execute(
    "SELECT changed_tickers FROM ranking_changes",
  );
  assert.deepEqual(
    typeof changes[0].changed_tickers === "string"
      ? JSON.parse(changes[0].changed_tickers)
      : changes[0].changed_tickers,
    ["PETR4"],
  );
  const [reads] = await restoredPool.execute(
    "SELECT user_id,publication_id FROM notification_reads",
  );
  assert.equal(reads[0].user_id, fixture.accounts.a.id);
  assert.equal(Number(reads[0].publication_id), Number(publication.insertId));
  console.info(
    "PASS: backup criptografado, recusa de destino preenchido, autenticação da chave, restauração de contas/perfis/rascunhos/progresso/notificações e exclusão de sessões.",
  );
} finally {
  if (restoredPool) await restoredPool.end();
  if (created && /^ediv_test_[a-f0-9]{12}$/.test(restored))
    await bootstrap.query("DROP DATABASE `" + restored + "`");
  await bootstrap.end();
  await fixture.cleanup();
}
