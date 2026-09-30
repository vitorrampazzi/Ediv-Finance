const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const appBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/$/, '') || 'http://localhost:5173';
const appOrigin = process.env.APP_ORIGIN?.trim() || 'http://localhost:5173';
const parsedAppUrl = new URL(appBaseUrl);

if (new URL(appOrigin).origin !== parsedAppUrl.origin) {
  throw new Error('APP_ORIGIN must match the origin of APP_BASE_URL.');
}

if (isProduction) {
  if (parsedAppUrl.protocol !== 'https:') throw new Error('APP_BASE_URL must use HTTPS in production.');
  if (process.env.MYSQL_SSL !== 'true') throw new Error('Set MYSQL_SSL=true in production.');
  required('SMTP_URL');
  required('MAIL_FROM');
}

export const config = Object.freeze({
  isProduction,
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST?.trim() || (isProduction ? '0.0.0.0' : '127.0.0.1'),
  appBaseUrl,
  appOrigin: parsedAppUrl.origin,
  mysql: {
    host: required('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT || 3306),
    database: required('MYSQL_DATABASE'),
    user: required('MYSQL_USER'),
    password: required('MYSQL_PASSWORD'),
    ssl: process.env.MYSQL_SSL === 'true',
  },
  mysqlMigrationUser: process.env.MYSQL_MIGRATION_USER?.trim() || null,
  mysqlMigrationPassword: process.env.MYSQL_MIGRATION_PASSWORD || null,
  smtpUrl: process.env.SMTP_URL?.trim() || null,
  mailFrom: process.env.MAIL_FROM?.trim() || null,
  trustProxy: process.env.TRUST_PROXY === 'true',
  sessionCookieName: isProduction ? '__Host-evorix_session' : 'evorix_session',
  sessionHours: 8,
});
