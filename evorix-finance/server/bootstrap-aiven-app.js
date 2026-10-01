import { randomBytes } from 'node:crypto';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createConnection } from 'mysql2/promise';

const host = process.env.TARGET_MYSQL_HOST?.trim();
const port = Number(process.env.TARGET_MYSQL_PORT || 3306);
const database = process.env.TARGET_MYSQL_DATABASE?.trim() || 'evorix_finance';
const adminUser = process.env.TARGET_MYSQL_USER?.trim();
const adminPassword = process.env.TARGET_MYSQL_PASSWORD;
const caFile = process.env.TARGET_MYSQL_SSL_CA_FILE?.trim() || '.aiven/ca.pem';
const runtimeEnvPath = resolve('.env.aiven.runtime');

if (!host || !adminUser || !adminPassword) {
  throw new Error('Preencha os dados de conexão em .env.aiven antes de criar o usuário da API.');
}
if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('O nome do schema contém caracteres inválidos.');
}
try {
  await access(runtimeEnvPath);
  throw new Error('O arquivo .env.aiven.runtime já existe; nada foi alterado.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const ca = await readFile(resolve(caFile), 'utf8');
const username = `evorix_app_${randomBytes(5).toString('hex')}`;
const password = randomBytes(32).toString('base64url');
const account = `'${username}'@'%'`;
const connection = await createConnection({
  host,
  port,
  user: adminUser,
  password: adminPassword,
  ssl: { ca, rejectUnauthorized: true },
  connectTimeout: 10_000,
});
let accountCreated = false;

try {
  await connection.query(`CREATE USER ${account} IDENTIFIED BY '${password}'`);
  accountCreated = true;
  await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO ${account}`);
  await connection.query(`SHOW GRANTS FOR ${account}`);

  const runtimeConnection = await createConnection({
    host,
    port,
    database,
    user: username,
    password,
    ssl: { ca, rejectUnauthorized: true },
    connectTimeout: 10_000,
  });
  await runtimeConnection.query('SELECT 1');
  await runtimeConnection.end();

  const runtimeEnv = [
    'NODE_ENV=development',
    'HOST=127.0.0.1',
    'PORT=3001',
    `MYSQL_HOST=${host}`,
    `MYSQL_PORT=${port}`,
    `MYSQL_DATABASE=${database}`,
    `MYSQL_USER=${username}`,
    `MYSQL_PASSWORD=${password}`,
    'MYSQL_SSL=true',
    `MYSQL_SSL_CA_FILE=${caFile.replace(/\\/g, '/')}`,
    'MYSQL_CONNECTION_LIMIT=3',
    'SKIP_STARTUP_MIGRATIONS=true',
    'APP_ORIGIN=http://localhost:5173',
    'APP_BASE_URL=http://localhost:5173',
    'TRUST_PROXY=false',
    'SMTP_URL=',
    'MAIL_FROM=',
    '',
  ].join('\n');
  await writeFile(runtimeEnvPath, runtimeEnv, { flag: 'wx', mode: 0o600 });
  console.info('Created a restricted Aiven API user and saved its local credentials to the Git-ignored .env.aiven.runtime.');
} catch (error) {
  if (accountCreated) await connection.query(`DROP USER IF EXISTS ${account}`).catch(() => {});
  await rm(runtimeEnvPath, { force: true }).catch(() => {});
  console.error('Could not prepare the restricted Aiven API user:', error.code || error.message || 'unknown error');
  process.exitCode = 1;
} finally {
  await connection.end();
}
