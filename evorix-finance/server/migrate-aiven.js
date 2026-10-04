import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSecureContext } from 'node:tls';
import { createDatabasePool, runMigrations } from './database.js';

const host = process.env.TARGET_MYSQL_HOST?.trim();
const port = Number(process.env.TARGET_MYSQL_PORT || 3306);
const database = process.env.TARGET_MYSQL_DATABASE?.trim() || 'evorix_finance';
const user = process.env.TARGET_MYSQL_USER?.trim();
const password = process.env.TARGET_MYSQL_PASSWORD;
const caFile = process.env.TARGET_MYSQL_SSL_CA_FILE?.trim() || '.aiven/ca.pem';

if (!host || !user || !password) throw new Error('Preencha as credenciais administrativas TARGET_MYSQL_* em .env.aiven.');
if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('O nome do schema contém caracteres inválidos.');

const sslCa = await readFile(resolve(caFile), 'utf8');
try {
  createSecureContext({ ca: sslCa });
} catch {
  throw new Error('O certificado CA configurado para Aiven não é válido.');
}

const migrationPool = createDatabasePool({ host, port, database, user, password, ssl: true, sslCa });
try {
  await runMigrations(migrationPool);
  console.info('Aiven database migrations are up to date.');
} catch (error) {
  console.error('Aiven database migration failed:', error.code || 'unknown database error');
  process.exitCode = 1;
} finally {
  await migrationPool.end();
}
