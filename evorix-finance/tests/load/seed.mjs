// Fills a disposable MySQL with accounts, sessions and a research publication
// for the load test. Every value is a fixture; it refuses any non-local host.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import argon2 from "argon2";
import { dividendColumns } from "../../dividend-analysis.mjs";

if (
  process.env.EDIV_LOAD_TEST_DISPOSABLE !== "true" ||
  !["127.0.0.1", "localhost"].includes(process.env.MYSQL_HOST)
)
  throw new Error("O teste de carga só usa um MySQL descartável local.");

const { pool, runMigrations } = await import("../../server/database.js");
const totalUsers = Number(process.env.LOAD_USERS || 10_000);
const totalSessions = Number(process.env.LOAD_SESSIONS || 2_000);
const output = process.argv[2] || "tests/load/out/sessions.json";
const utc = (date) => date.toISOString().slice(0, 23).replace("T", " ");

await runMigrations(pool);
const [[existing]] = await pool.query("SELECT COUNT(*) AS total FROM users");
if (Number(existing.total))
  throw new Error("O banco de carga precisa começar vazio.");

// Nobody signs in during the test; one unusable hash serves every fixture account.
const passwordHash = await argon2.hash(randomBytes(32));
const now = new Date();
const ids = [];
for (let start = 0; start < totalUsers; start += 500) {
  const rows = [];
  for (let index = start; index < Math.min(start + 500, totalUsers); index++) {
    const id = randomUUID();
    ids.push(id);
    rows.push([
      id,
      `Pessoa de teste ${index}`,
      `carga-${index}@ediv.test`,
      passwordHash,
      utc(now),
    ]);
  }
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, email_verified_at) VALUES ?",
    [rows],
  );
}

// Sessions expire in 30 days, so no request renews them during the run.
const tokens = [];
const expires = utc(new Date(now.getTime() + 30 * 86_400_000));
for (let start = 0; start < totalSessions; start += 500) {
  const rows = [];
  for (
    let index = start;
    index < Math.min(start + 500, totalSessions);
    index++
  ) {
    const token = randomBytes(32).toString("base64url");
    tokens.push(token);
    rows.push([
      randomUUID(),
      ids[index % ids.length],
      createHash("sha256").update(token).digest("hex"),
      expires,
      utc(now),
    ]);
  }
  await pool.query(
    "INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at) VALUES ?",
    [rows],
  );
}

// Same shape and size as a real import: 90 companies, every published column.
const entries = Array.from({ length: 90 }, (_, index) => ({
  rank: index + 1,
  ticker: `TEST${index + 1}`,
  companyName: `Empresa de teste ${index + 1}`,
  sector: "Setor de teste",
  thesis: "Tese de teste ".repeat(20),
  risks: "Risco de teste ".repeat(12),
  dividendAnalysis: Object.fromEntries(
    dividendColumns
      .filter((column) => column.format !== "text")
      .map((column, position) => [
        column.key,
        String((index + position) / 100),
      ]),
  ),
}));
for (const version of [1, 2, 3]) {
  const [publication] = await pool.query(
    "INSERT INTO ranking_publications (title, author_name, source_file_name, entries_json) VALUES (?, ?, ?, ?)",
    [
      `Pesquisa de teste ${version}`,
      "Equipe de teste",
      "carga.xlsx",
      JSON.stringify(entries),
    ],
  );
  await pool.query(
    "INSERT INTO notification_events (type, source_id, editorial_version, publication_id, title, description, href, changed_tickers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "research",
      `carga-${version}`,
      `v${version}`,
      publication.insertId,
      `Pesquisa de teste ${version}`,
      "Atualização de teste",
      "/app/ranking",
      JSON.stringify(["TEST1"]),
    ],
  );
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(tokens));
await pool.end();
console.info(
  `Banco de carga: ${totalUsers} contas, ${tokens.length} sessões, 3 publicações.`,
);
