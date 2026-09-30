import { config } from './config.js';
import { createDatabasePool, runMigrations } from './database.js';

if (config.isProduction && (!config.mysqlMigrationUser || !config.mysqlMigrationPassword)) {
  throw new Error('Production migrations require MYSQL_MIGRATION_USER and MYSQL_MIGRATION_PASSWORD.');
}

const migrationPool = createDatabasePool(config.mysqlMigrationUser
  ? { user: config.mysqlMigrationUser, password: config.mysqlMigrationPassword }
  : config.mysql);

try {
  await runMigrations(migrationPool);
  console.info('Database migrations are up to date.');
} catch (error) {
  console.error('Database migration failed:', error.code || error.message || 'unknown error');
  process.exitCode = 1;
} finally {
  await migrationPool.end();
}
