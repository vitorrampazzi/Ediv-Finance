import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSecureContext } from 'node:tls';
import { pool as sourcePool, createDatabasePool, runMigrations } from './database.js';

const targetHost = process.env.TARGET_MYSQL_HOST?.trim();
const targetPort = Number(process.env.TARGET_MYSQL_PORT || 3306);
const targetDatabase = process.env.TARGET_MYSQL_DATABASE?.trim() || 'evorix_finance';
const targetUser = process.env.TARGET_MYSQL_USER?.trim();
const targetPassword = process.env.TARGET_MYSQL_PASSWORD;
const targetCaFile = process.env.TARGET_MYSQL_SSL_CA_FILE?.trim();
const targetCa = targetCaFile
  ? await readFile(resolve(process.cwd(), targetCaFile), 'utf8')
  : process.env.TARGET_MYSQL_SSL_CA?.replace(/\\n/g, '\n') || null;

if (!targetHost || !targetUser || !targetPassword) {
  throw new Error('Preencha TARGET_MYSQL_HOST, TARGET_MYSQL_USER e TARGET_MYSQL_PASSWORD em .env.aiven.');
}
if (!/^[A-Za-z0-9_]+$/.test(targetDatabase)) {
  throw new Error('TARGET_MYSQL_DATABASE aceita somente letras, números e underscore.');
}
if (!targetCa) throw new Error('Baixe o CA do Aiven para .aiven/ca.pem antes da transferência.');
try {
  createSecureContext({ ca: targetCa });
} catch {
  throw new Error('O certificado CA indicado não é válido. Baixe novamente o CA do serviço Aiven.');
}

const targetOptions = {
  host: targetHost,
  port: targetPort,
  user: targetUser,
  password: targetPassword,
  ssl: true,
  sslCa: targetCa,
};
const bootstrapPool = createDatabasePool({ ...targetOptions, database: undefined });
let targetPool;
let sourceConnection;
let targetConnection;

// Keep account/profile/portfolio records. Sessions and pending verification
// tokens are intentionally omitted when moving to a new site origin.
const transferableTables = [
  'users',
  'portfolio_transactions',
  'user_preferences',
  'user_favorites',
  'user_financial_summaries',
];

try {
  await bootstrapPool.query(
    `CREATE DATABASE IF NOT EXISTS \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  targetPool = createDatabasePool({ ...targetOptions, database: targetDatabase });
  await runMigrations(targetPool);

  targetConnection = await targetPool.getConnection();
  const targetCounts = {};
  for (const table of transferableTables) {
    const [rows] = await targetConnection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    targetCounts[table] = Number(rows[0].total);
  }
  if (Object.values(targetCounts).some(count => count !== 0)) {
    throw new Error('O destino já contém dados de aplicação. A transferência foi cancelada sem sobrescrever nada.');
  }

  sourceConnection = await sourcePool.getConnection();
  await sourceConnection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await sourceConnection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  await targetConnection.beginTransaction();

  const copied = {};
  for (const table of transferableTables) {
    const [rows] = await sourceConnection.query(`SELECT * FROM \`${table}\``);
    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const columnList = columns.map(column => `\`${column}\``).join(', ');
      const values = rows.map(row => columns.map(column => row[column]));
      await targetConnection.query(`INSERT INTO \`${table}\` (${columnList}) VALUES ?`, [values]);
    }
    copied[table] = rows.length;
  }

  await targetConnection.commit();
  await sourceConnection.commit();
  console.info('Aiven schema ready; record counts copied:', JSON.stringify(copied));
  console.info('Users must sign in again; pending confirmation links must be requested again.');
} catch (error) {
  if (targetConnection) await targetConnection.rollback().catch(() => {});
  if (sourceConnection) await sourceConnection.rollback().catch(() => {});
  console.error('Aiven transfer failed:', error.code || error.message || 'unknown error');
  process.exitCode = 1;
} finally {
  sourceConnection?.release();
  targetConnection?.release();
  await sourcePool.end();
  await targetPool?.end();
  await bootstrapPool.end();
}
