import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPool } from 'mysql2/promise';
import { config } from './config.js';

export function createDatabasePool(credentials = config.mysql) {
  const connectionOptions = { ...config.mysql, ...credentials };
  const { sslCa, ...mysqlOptions } = connectionOptions;
  return createPool({
    ...mysqlOptions,
    ssl: connectionOptions.ssl
      ? { ca: sslCa || undefined, rejectUnauthorized: true }
      : undefined,
    waitForConnections: true,
    // Serverless platforms can create multiple function instances; keep the
    // per-instance pool small to avoid exhausting managed MySQL connections.
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || (process.env.VERCEL === '1' ? 3 : 10)),
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    connectTimeout: 10_000,
    enableKeepAlive: true,
  });
}

export const pool = createDatabasePool();

const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url));

export async function runMigrations(migrationPool = pool) {
  await migrationPool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(190) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const files = (await readdir(migrationsDirectory))
    .filter(file => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort();

  for (const file of files) {
    const [applied] = await migrationPool.execute('SELECT name FROM schema_migrations WHERE name = ?', [file]);
    if (applied.length) continue;

    const sql = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
    const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
    for (const statement of statements) await migrationPool.query(statement);

    try {
      await migrationPool.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.info(`Applied database migration: ${file}`);
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }
}
