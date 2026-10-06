import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "./database.js";

const tables = [
  "users",
  "user_access",
  "portfolio_transactions",
  "user_preferences",
  "user_favorites",
  "user_financial_summaries",
  "income_ranking_entries",
  "ranking_publications",
  "portfolio_events",
  "portfolio_imports",
  "support_threads",
  "support_messages",
  "admin_audit_events",
  "research_drafts",
  "learning_progress",
  "ranking_changes",
  "notification_reads",
];
const keyText = process.env.BACKUP_KEY || "";
if (!/^[a-f0-9]{64}$/i.test(keyText))
  throw new Error(
    "Configure BACKUP_KEY com 32 bytes em hexadecimal em um arquivo local protegido.",
  );
const key = Buffer.from(keyText, "hex");
const mode = process.argv[2] || "backup";
let connection;
try {
  connection = await pool.getConnection();
  if (mode === "backup") {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    const [present] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()",
    );
    const names = new Set(present.map((row) => row.TABLE_NAME));
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      tables: {},
    };
    for (const table of tables) {
      if (!names.has(table)) continue;
      const [rows] = await connection.query("SELECT * FROM " + table);
      data.tables[table] = rows;
    }
    await connection.commit();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), "utf8"),
      cipher.final(),
    ]);
    const directory = resolve(process.env.BACKUP_DIRECTORY || ".backups");
    const output = resolve(
      directory,
      "ediv-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json.enc",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      output,
      JSON.stringify({
        format: "ediv-backup-v1",
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: encrypted.toString("base64"),
      }),
      { flag: "wx", mode: 0o600 },
    );
    console.info(
      "Backup criptografado salvo no diretório configurado. Guarde a chave separadamente.",
    );
  } else if (mode === "restore") {
    if (!process.argv[3])
      throw new Error(
        "Indique o arquivo criptografado para restaurar em um schema vazio.",
      );
    const envelope = JSON.parse(
      await readFile(resolve(process.argv[3]), "utf8"),
    );
    if (envelope.format !== "ediv-backup-v1")
      throw new Error("Formato de backup inválido.");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const data = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (
      data.version !== 1 ||
      !data.tables ||
      Object.keys(data.tables).some((t) => !tables.includes(t))
    )
      throw new Error("Conteúdo de backup inválido.");
    await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.beginTransaction();
    const [present] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()",
    );
    const names = new Set(present.map((row) => row.TABLE_NAME));
    for (const table of tables) {
      if (!names.has(table)) {
        if (data.tables[table]?.length)
          throw new Error(
            "Aplique as migrações no destino vazio antes de restaurar.",
          );
        continue;
      }
      const [rows] = await connection.query(
        "SELECT * FROM " + table + " FOR UPDATE",
      );
      if (rows.length)
        throw new Error(
          "O destino contém dados. Restauração cancelada sem sobrescrever registros.",
        );
    }
    for (const table of tables) {
      for (const row of data.tables[table] || []) {
        const columns = Object.keys(row);
        if (columns.some((c) => !/^[_a-z0-9]+$/i.test(c)))
          throw new Error("Coluna inválida.");
        await connection.execute(
          "INSERT INTO " +
            table +
            " (" +
            columns.map((c) => "`" + c + "`").join(",") +
            ") VALUES (" +
            columns.map(() => "?").join(",") +
            ")",
          columns.map((c) => row[c]),
        );
      }
    }
    await connection.commit();
    console.info(
      "Dados restaurados no destino vazio. Sessões e tokens não foram restaurados.",
    );
  } else throw new Error("Use backup ou restore.");
} catch (error) {
  if (connection) await connection.rollback().catch(() => {});
  console.error(
    "Operação de backup falhou:",
    error.code ||
      (error.message?.startsWith("O destino")
        ? error.message
        : "Confira chave, arquivo, permissões e configuração."),
  );
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
