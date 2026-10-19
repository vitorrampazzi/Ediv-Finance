import assert from "node:assert/strict";
import test from "node:test";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

assert.equal(process.env.EDIV_TEST_MYSQL_DISPOSABLE, "true");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(process.env.TARGET_MYSQL_HOST));
const { createFixture } = await import("./fixture.mjs");
const fixture = await createFixture();
const { createDatabasePool, runMigrations } = await import("../server/database.js");
const bootstrap = createDatabasePool({ database: undefined });
const directory = fileURLToPath(new URL("../.test-artifacts/notifications/backup-" + randomBytes(6).toString("hex") + "/", import.meta.url));
const key = randomBytes(32);
const env = { ...process.env, BACKUP_DIRECTORY: directory, BACKUP_KEY: key.toString("hex") };
const newTables = ["notification_events", "notification_event_reads", "research_publication_keys"];
const destinations = [];
function command(mode, file, database = fixture.schema, overrides = {}) {
  assert.match(database, /^ediv_test_[a-f0-9]{12}$/);
  const result = spawnSync(process.execPath, ["server/backup.js", mode, ...(file ? [file] : [])], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...env, MYSQL_DATABASE: database, ...overrides },
    windowsHide: true, encoding: "utf8", timeout: 30_000,
  });
  return result;
}
try {
  await mkdir(directory, { recursive: true });
  await test("backup/restore real de notificações novas e legado", async (t) => {
    const { accounts, pool, request } = fixture;
    const publication = await request(accounts.analyst, "/api/rankings", {
      method: "POST", raw: "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos\nPETR4;Empresa QA;20;12;12;Tese;Risco",
      headers: { "Content-Type": "text/csv", "X-File-Name": "backup.csv", "X-Publication-Meta": encodeURIComponent(JSON.stringify({ title: "Backup QA", authorName: "QA" })) },
    });
    assert.equal(publication.status, 201);
    const educational = await request(accounts.analyst, "/api/notifications/publish-learning", {
      method: "POST", body: { courseId: "pesquisa", version: "backup-v1" },
    });
    assert.equal(educational.status, 200);
    assert.equal((await request(accounts.a, "/api/notifications/read-all", { method: "POST" })).status, 200);
    const [[oldRead]] = await pool.execute("SELECT read_at FROM notification_reads WHERE user_id=?", [accounts.a.id]);
    const [[eventRead]] = await pool.execute("SELECT r.read_at FROM notification_event_reads r JOIN notification_events e ON e.id=r.notification_id WHERE r.user_id=? AND e.type='research'", [accounts.a.id]);
    assert.equal(command("backup").status, 0);
    const file = directory + (await readdir(directory)).find((name) => name.endsWith(".json.enc"));
    const envelope = JSON.parse(await readFile(file, "utf8"));
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8"));
    assert.ok(newTables.every((table) => data.tables[table].length > 0));
    assert.equal(Object.hasOwn(data.tables, "user_sessions"), false);

    for (const legacy of [false, true]) {
      await t.test(legacy ? "snapshot antigo reconstrói pesquisa/leitura sem anúncio educativo" : "snapshot novo restaura eventos, chaves e leituras", async () => {
        const schema = "ediv_test_" + randomBytes(6).toString("hex");
        assert.match(schema, /^ediv_test_[a-f0-9]{12}$/);
        await bootstrap.query("CREATE DATABASE `" + schema + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        const restored = createDatabasePool({ database: schema });
        destinations.push({ schema, pool: restored });
        await runMigrations(restored);
        let source = file;
        if (legacy) {
          const oldData = structuredClone(data);
          for (const table of newTables) delete oldData.tables[table];
          const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
          const encrypted = Buffer.concat([cipher.update(JSON.stringify(oldData), "utf8"), cipher.final()]);
          source = directory + "legacy.json.enc";
          await writeFile(source, JSON.stringify({ format: "ediv-backup-v1", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: encrypted.toString("base64") }));
        }
        assert.equal(command("restore", source, schema, { BACKUP_KEY: randomBytes(32).toString("hex") }).status, 1);
        const result = command("restore", source, schema);
        assert.equal(result.status, 0, result.stderr);
        const [[counts]] = await restored.query("SELECT (SELECT COUNT(*) FROM notification_events) AS events,(SELECT COUNT(*) FROM notification_event_reads) AS read_count,(SELECT COUNT(*) FROM research_publication_keys) AS fingerprints,(SELECT COUNT(*) FROM user_sessions) AS sessions");
        assert.equal(Number(counts.events), legacy ? 1 : 2);
        assert.equal(Number(counts.read_count), legacy ? 1 : 2);
        assert.equal(Number(counts.fingerprints), 1);
        assert.equal(Number(counts.sessions), 0);
        const [[read]] = await restored.execute("SELECT r.read_at,e.created_at,p.created_at AS original_date FROM notification_event_reads r JOIN notification_events e ON e.id=r.notification_id JOIN ranking_publications p ON p.id=e.publication_id WHERE r.user_id=?", [accounts.a.id]);
        assert.equal(read.read_at, legacy ? oldRead.read_at : eventRead.read_at);
        assert.equal(read.created_at, read.original_date);
        assert.equal(command("restore", source, schema).status, 1, "destino preenchido deve ser recusado");
        const [[after]] = await restored.query("SELECT COUNT(*) AS n FROM notification_events");
        assert.equal(Number(after.n), legacy ? 1 : 2);
      });
    }
  });
} finally {
  for (const destination of destinations) {
    await destination.pool.end();
    assert.match(destination.schema, /^ediv_test_[a-f0-9]{12}$/);
    await bootstrap.query("DROP DATABASE `" + destination.schema + "`");
  }
  await bootstrap.end();
  await fixture.cleanup();
}
