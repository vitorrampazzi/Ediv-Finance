import { app } from './app.js';
import { config } from './config.js';
import { createDatabasePool, pool, runMigrations } from './database.js';

const migrationPool = config.mysqlMigrationUser && config.mysqlMigrationPassword
  ? createDatabasePool({ user: config.mysqlMigrationUser, password: config.mysqlMigrationPassword })
  : pool;

try {
  if (!config.isProduction && !config.skipStartupMigrations) {
    await runMigrations(migrationPool);
    if (migrationPool !== pool) await migrationPool.end();
  }
  else await pool.execute('SELECT id FROM users LIMIT 0');

  const server = app.listen(config.port, config.host, () => {
    console.info(`Ediv Finance API ready on ${config.host}:${config.port}`);
  });

  const cleanupTimer = setInterval(() => {
    pool.execute('DELETE FROM user_sessions WHERE expires_at <= UTC_TIMESTAMP(3)')
      .catch(error => console.error('Expired session cleanup failed:', error.code || 'database error'));
    pool.execute('DELETE FROM email_verification_tokens WHERE expires_at <= UTC_TIMESTAMP(3) OR consumed_at IS NOT NULL')
      .catch(error => console.error('Expired verification cleanup failed:', error.code || 'database error'));
  }, 60 * 60 * 1000);
  cleanupTimer.unref();

  const shutdown = signal => {
    console.info(`Received ${signal}; shutting down.`);
    clearInterval(cleanupTimer);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('API startup failed:', error.code || error.message || 'unknown error');
  if (migrationPool !== pool) await migrationPool.end();
  await pool.end();
  process.exitCode = 1;
}
