import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

assert.equal(process.env.EDIV_TEST_MYSQL_DISPOSABLE, "true");
assert.ok(["127.0.0.1", "localhost", "::1"].includes(process.env.TARGET_MYSQL_HOST));
const { createFixture } = await import("./fixture.mjs");
const fixture = await createFixture();
const { request, accounts, pool } = fixture;
const { a, b, analyst } = accounts;
const publish = (body, account = analyst) => request(account, "/api/notifications/publish-learning", { method: "POST", body });
const upload = (title) => ({
  method: "POST", raw: "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos\nPETR4;Empresa QA;20;12;12;Tese;Risco",
  headers: { "Content-Type": "text/csv", "X-File-Name": "notifications-qa.csv",
    "X-Publication-Meta": encodeURIComponent(JSON.stringify({ title, authorName: "QA" })) },
});
const totals = async () => {
  const values = [];
  for (const table of ["ranking_publications", "ranking_changes", "research_publication_keys", "notification_events"]) {
    const [[row]] = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
    values.push(Number(row.n));
  }
  return values;
};
const list = async (account, suffix = "") => {
  const response = await request(account, "/api/notifications" + suffix);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.notifications));
  assert.ok(Number.isInteger(response.body.unreadCount));
  assert.ok(Object.hasOwn(response.body, "nextCursor"));
  return response.body;
};

try {
  await test("notificações: API e MySQL exclusivamente no schema descartável", async (t) => {
    assert.match(fixture.schema, /^ediv_test_[a-f0-9]{12}$/);
    await t.test("autenticação e validação de leitura", async () => {
      assert.equal((await request(null, "/api/notifications")).status, 401);
      for (const body of [{}, { notificationId: "invalid" }, { publicationId: "invalid" }]) {
        assert.equal((await request(a, "/api/notifications/read", { method: "POST", body })).status, 400);
      }
    });
    const initial = await list(a);
    const created = await request(analyst, "/api/rankings", {
      method: "POST",
      raw: "ticker;empresa;potencial_percentual;preco_alvo;horizonte_meses;tese;riscos\nPETR4;Empresa QA;20;12;12;Tese;Risco",
      headers: {
        "Content-Type": "text/csv", "X-File-Name": "notifications-qa.csv",
        "X-Publication-Meta": encodeURIComponent(JSON.stringify({ title: "Pesquisa QA notificações", authorName: "QA" })),
      },
    });
    assert.equal(created.status, 201);
    let item;
    await t.test("publicação aparece com contrato completo e destino interno", async () => {
      const data = await list(a);
      item = data.notifications.find((entry) => entry.title === "Pesquisa QA notificações");
      assert.ok(item);
      assert.equal(typeof item.type, "string");
      assert.equal(typeof item.description, "string");
      assert.ok(item.sourceId);
      assert.equal(item.read, false);
      assert.match(item.href, /^\/app\/ranking\?publication=\d+$/);
      assert.equal(data.unreadCount, initial.unreadCount + 1);
      assert.equal(data.notifications.filter((entry) => entry.id === item.id).length, 1);
    });
    await t.test("leitura por notificationId é idempotente e isolada por usuário", async () => {
      const beforeA = await list(a);
      const beforeB = await list(b);
      for (let i = 0; i < 2; i++) {
        assert.equal((await request(a, "/api/notifications/read", {
          method: "POST", body: { notificationId: item.id },
        })).status, 200);
      }
      assert.equal((await list(a)).unreadCount, beforeA.unreadCount - 1);
      const afterB = await list(b);
      assert.equal(afterB.unreadCount, beforeB.unreadCount);
      assert.equal(afterB.notifications.find((entry) => entry.id === item.id)?.read, false);
    });
    await t.test("publicationId legado continua aceito", async () => {
      assert.equal((await request(b, "/api/notifications/read", {
        method: "POST", body: { publicationId: String(item.sourceId) },
      })).status, 200);
      assert.equal((await list(b)).notifications.find((entry) => entry.id === item.id)?.read, true);
    });
    await t.test("marcar todas persiste no MySQL sem afetar outra conta", async () => {
      const beforeB = await list(b);
      assert.equal((await request(a, "/api/notifications/read-all", { method: "POST" })).status, 200);
      assert.equal((await list(a)).unreadCount, 0);
      assert.ok((await list(a)).notifications.every((entry) => entry.read));
      assert.equal((await list(b)).unreadCount, beforeB.unreadCount);
    });
    await t.test("banco usado pela fixture é exatamente o schema temporário", async () => {
      const [[row]] = await pool.query("SELECT DATABASE() AS name");
      assert.equal(row.name, fixture.schema);
    });
    await t.test("preview/planilha inválida não publicam nem notificam", async () => {
      const before = await totals();
      assert.equal((await request(analyst, "/api/rankings/preview", upload("Preview QA"))).status, 200);
      assert.equal((await request(analyst, "/api/rankings", { ...upload("Inválida QA"), raw: "invalid" })).status, 400);
      assert.deepEqual(await totals(), before);
    });
    await t.test("pesquisa concorrente deduplica por conteúdo e preserva leitura/data", async () => {
      await fixture.clearLimits();
      const responses = await Promise.all(Array.from({ length: 4 }, () => request(analyst, "/api/rankings", upload("Concorrência QA"))));
      assert.deepEqual(responses.map((entry) => entry.status).sort(), [200, 200, 200, 201]);
      assert.equal(new Set(responses.map((entry) => entry.body.publicationId)).size, 1);
      const publicationId = responses[0].body.publicationId;
      const before = await list(a);
      const event = before.notifications.find((entry) => entry.sourceId === publicationId && entry.type === "research");
      assert.ok(event);
      await request(a, "/api/notifications/read", { method: "POST", body: { notificationId: event.id } });
      await fixture.clearLimits();
      const again = await request(accounts.admin, "/api/rankings", { ...upload("Concorrência QA"), headers: { ...upload("Concorrência QA").headers, "X-File-Name": "outro.csv" } });
      assert.equal(again.status, 200);
      assert.equal(again.body.reused, true);
      const after = (await list(a)).notifications.find((entry) => entry.id === event.id);
      assert.equal(after.read, true);
      assert.equal(after.createdAt, event.createdAt);
    });
    await t.test("curso/aula: permissão, validação, destino, versão e concorrência", async () => {
      assert.equal((await publish({ courseId: "pesquisa", version: "qa-v1" }, a)).status, 403);
      assert.equal((await publish({ courseId: "pesquisa", version: "qa-v1" }, null)).status, 401);
      for (const body of [
        { courseId: "missing", version: "v1" }, { courseId: "pesquisa", lessonId: "carteira", version: "v1" },
        { courseId: "pesquisa", version: "bad version" }, { courseId: "pesquisa" },
        { courseId: "pesquisa", version: "v1", extra: true },
      ]) assert.equal((await publish(body)).status, 400);
      const before = await list(a);
      await request(a, "/api/learning");
      assert.equal((await list(a)).unreadCount, before.unreadCount, "catálogo não anuncia conteúdo");
      const responses = await Promise.all(Array.from({ length: 4 }, () => publish({ courseId: "pesquisa", version: "qa-v1" })));
      assert.ok(responses.every((response) => response.status === 200));
      assert.equal(new Set(responses.map((response) => response.body.notificationId)).size, 1);
      const lesson = await publish({ courseId: "dividendos", lessonId: "carteira", version: "qa-v1" }, accounts.admin);
      assert.equal(lesson.status, 200);
      const data = await list(a);
      const courseEvent = data.notifications.find((entry) => entry.id === responses[0].body.notificationId);
      assert.equal(courseEvent.type, "course");
      assert.equal(courseEvent.sourceId, "pesquisa");
      assert.equal(courseEvent.href, "/app/aprender?aula=ranking#sala-de-aula");
      const lessonEvent = data.notifications.find((entry) => entry.id === lesson.body.notificationId);
      assert.equal(lessonEvent.type, "lesson");
      assert.equal(lessonEvent.href, "/app/aprender?aula=carteira#sala-de-aula");
      const next = await publish({ courseId: "pesquisa", version: "qa-v2" });
      assert.notEqual(next.body.notificationId, courseEvent.id);
    });
    await t.test("rollback real em falha do evento não deixa publicação/chave/mudanças", async () => {
      const before = await totals();
      await pool.query("ALTER TABLE notification_events ADD CONSTRAINT notifications_qa_fail CHECK (title <> 'Rollback QA' AND editorial_version <> 'rollback-qa')");
      try {
        await fixture.clearLimits();
        assert.equal((await request(analyst, "/api/rankings", upload("Rollback QA"))).status, 500);
        assert.equal((await publish({ courseId: "pesquisa", version: "rollback-qa" })).status, 500);
        assert.deepEqual(await totals(), before);
      } finally { await pool.query("ALTER TABLE notification_events DROP CHECK notifications_qa_fail"); }
    });
    await t.test("backfill legado repetido preserva histórico, datas, leituras e fingerprint", async () => {
      await fixture.clearLimits();
      const options = upload("Legado QA");
      const preview = await request(analyst, "/api/rankings/preview", options);
      assert.equal(preview.status, 200);
      const [insert] = await pool.execute("INSERT INTO ranking_publications(title,author_name,source_file_name,entries_json,imported_by,created_at) VALUES(?,?,?,?,?,DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND))", ["Legado QA", "QA", "legacy.csv", JSON.stringify(preview.body.entries), analyst.id]);
      const publicationId = String(insert.insertId);
      // Existing users must predate the imported historic event for eligibility.
      await pool.execute("UPDATE users SET created_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY) WHERE id IN (?,?)", [a.id, b.id]);
      await pool.execute("INSERT INTO notification_reads(user_id,publication_id,read_at) VALUES(?,?, '2026-01-02 03:04:05.123')", [a.id, publicationId]);
      const migration = await readFile(new URL("../server/migrations/008_notifications.sql", import.meta.url), "utf8");
      const apply = async () => { for (const sql of migration.split(";").map((sql) => sql.trim()).filter(Boolean)) await pool.query(sql); };
      await apply();
      const [[snapshot]] = await pool.execute("SELECT e.id,e.created_at,p.created_at AS publication_date,r.read_at FROM notification_events e JOIN ranking_publications p ON p.id=e.publication_id JOIN notification_event_reads r ON r.notification_id=e.id AND r.user_id=? WHERE p.id=?", [a.id, publicationId]);
      assert.equal(snapshot.created_at, snapshot.publication_date);
      assert.equal(snapshot.read_at, "2026-01-02 03:04:05.123");
      const count = await totals();
      await apply();
      assert.deepEqual(await totals(), count);
      const [[after]] = await pool.execute("SELECT read_at FROM notification_event_reads WHERE user_id=? AND notification_id=?", [a.id, snapshot.id]);
      assert.equal(after.read_at, snapshot.read_at);
      await fixture.clearLimits();
      const reused = await request(analyst, "/api/rankings", options);
      assert.equal(reused.status, 200);
      assert.equal(reused.body.publicationId, publicationId);
      assert.equal(reused.body.reused, true);
    });
    await t.test("paginação >20 sem saltos, contagem global, cursor inválido e cadastro", async () => {
      await fixture.clearLimits();
      for (let i = 0; i < 45; i++) {
        if (i % 10 === 0) await fixture.clearLimits();
        assert.equal((await publish({ courseId: "pesquisa", version: "pagination-" + i })).status, 200);
      }
      for (const cursor of ["0", "-1", "1.2", "abc", "18446744073709551616"]) {
        assert.equal((await request(a, "/api/notifications?cursor=" + encodeURIComponent(cursor))).status, 400);
      }
      const ids = [], first = await list(a);
      assert.equal(first.notifications.length, 20);
      let page = first;
      do {
        ids.push(...page.notifications.map((entry) => entry.id));
        assert.equal(page.unreadCount, first.unreadCount);
        if (!page.nextCursor) break;
        page = await list(a, "?cursor=" + page.nextCursor);
      } while (true);
      assert.ok(ids.length > 40);
      assert.equal(ids.length, new Set(ids).size);
      const [[eligible]] = await pool.execute("SELECT COUNT(*) AS n FROM notification_events WHERE created_at >= (SELECT created_at FROM users WHERE id=?)", [a.id]);
      assert.equal(ids.length, Number(eligible.n));
      assert.deepEqual(ids, [...ids].sort((x, y) => BigInt(x) > BigInt(y) ? -1 : 1));
      await request(a, "/api/notifications/read-all", { method: "POST" });
      assert.equal((await list(a)).unreadCount, 0);
      assert.ok((await list(b)).unreadCount > 20);
      await pool.execute("UPDATE users SET created_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 DAY) WHERE id=?", [b.id]);
      const newAccount = await list(b);
      assert.deepEqual(newAccount.notifications, []);
      assert.equal(newAccount.unreadCount, 0);
      await request(b, "/api/notifications/read", { method: "POST", body: { notificationId: first.notifications[0].id } });
      const [[ineligibleRead]] = await pool.execute("SELECT COUNT(*) AS n FROM notification_event_reads WHERE user_id=? AND notification_id=?", [b.id, first.notifications[0].id]);
      assert.equal(Number(ineligibleRead.n), 0);
    });
    await t.test("EXPLAIN count/list no schema temporário, sem alteração de índices", async () => {
      const join = "LEFT JOIN notification_event_reads r ON r.notification_id=e.id AND r.user_id=? LEFT JOIN notification_reads legacy ON legacy.publication_id=e.publication_id AND legacy.user_id=?";
      const [[user]] = await pool.execute("SELECT created_at FROM users WHERE id=?", [a.id]);
      const params = [a.id, a.id, user.created_at];
      const plans = {};
      for (const [key, sql] of Object.entries({
        list: `SELECT CAST(e.id AS CHAR) AS id,e.type,e.source_id,e.title,e.description,e.href,e.created_at,e.changed_tickers,NOT (r.notification_id IS NULL AND legacy.publication_id IS NULL) AS is_read FROM notification_events e ${join} WHERE e.created_at>=? ORDER BY e.id DESC LIMIT 21`,
        count: `SELECT COUNT(*) AS total FROM notification_events e ${join} WHERE e.created_at>=? AND r.notification_id IS NULL AND legacy.publication_id IS NULL`,
      })) [plans[key]] = await pool.execute("EXPLAIN " + sql, params);
      await mkdir(new URL("../.test-artifacts/notifications/", import.meta.url), { recursive: true });
      await writeFile(new URL("../.test-artifacts/notifications/explain.json", import.meta.url), JSON.stringify({ engine: "MySQL local descartável", plans }, null, 2));
      console.log("EXPLAIN salvo em .test-artifacts/notifications/explain.json");
    });
    await t.test("logout invalida sessão e login restaura somente conta atual", async () => {
      const old = { cookie: a.cookie };
      assert.equal((await request(a, "/api/auth/logout", { method: "POST" })).status, 204);
      assert.equal((await request(old, "/api/notifications")).status, 401);
      await fixture.clearLimits();
      assert.equal((await request(a, "/api/auth/login", { method: "POST", body: { email: a.email, password: fixture.password } })).status, 200);
      assert.equal((await list(a)).unreadCount, 0);
    });
  });
} finally {
  await fixture.cleanup();
}
