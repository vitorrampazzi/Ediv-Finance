import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assistantFeatureEnabled } from "../deployment-policy.mjs";

const isProduction = process.env.NODE_ENV === "production";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const projectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
const isQaDeployment =
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "QA";
const qaHostname =
  process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
const appBaseUrl =
  (isQaDeployment && qaHostname ? `https://${qaHostname}` : null) ||
  process.env.APP_BASE_URL?.trim().replace(/\/$/, "") ||
  (projectProductionUrl
    ? `https://${projectProductionUrl}`
    : "http://localhost:5173");
const appOriginValues = (
  (isQaDeployment
    ? new URL(appBaseUrl).origin
    : process.env.APP_ORIGIN?.trim()) || new URL(appBaseUrl).origin
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const parsedAppUrl = new URL(appBaseUrl);
const appOrigins = [
  ...new Set(appOriginValues.map((value) => new URL(value).origin)),
];
const vercelDeploymentOrigin = process.env.VERCEL_URL?.trim()
  ? `https://${process.env.VERCEL_URL.trim()}`
  : null;
const mysqlSslCa =
  process.env.MYSQL_SSL_CA?.replace(/\\n/g, "\n") ||
  (process.env.MYSQL_SSL_CA_FILE?.trim()
    ? readFileSync(resolve(process.env.MYSQL_SSL_CA_FILE.trim()), "utf8")
    : null);

if (!appOrigins.includes(parsedAppUrl.origin)) {
  throw new Error("APP_ORIGIN must include the origin of APP_BASE_URL.");
}

if (
  isQaDeployment &&
  process.env.MYSQL_DATABASE?.trim() !== "ediv_finance_qa"
) {
  throw new Error("QA requires the isolated ediv_finance_qa database.");
}

if (isProduction) {
  if (parsedAppUrl.protocol !== "https:")
    throw new Error("APP_BASE_URL must use HTTPS in production.");
  if (process.env.MYSQL_SSL !== "true")
    throw new Error("Set MYSQL_SSL=true in production.");
  if (!isQaDeployment) {
    required("SMTP_URL");
    required("MAIL_FROM");
  }
}

export const config = Object.freeze({
  isProduction,
  isQaDeployment,
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST?.trim() || (isProduction ? "0.0.0.0" : "127.0.0.1"),
  appBaseUrl,
  appOrigins: [
    ...new Set([
      ...appOrigins,
      ...(vercelDeploymentOrigin
        ? [new URL(vercelDeploymentOrigin).origin]
        : []),
    ]),
  ],
  mysql: {
    host: required("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT || 3306),
    database: required("MYSQL_DATABASE"),
    user: required("MYSQL_USER"),
    password: required("MYSQL_PASSWORD"),
    ssl: process.env.MYSQL_SSL === "true",
    sslCa: mysqlSslCa,
  },
  mysqlMigrationUser: process.env.MYSQL_MIGRATION_USER?.trim() || null,
  mysqlMigrationPassword: process.env.MYSQL_MIGRATION_PASSWORD || null,
  skipStartupMigrations: process.env.SKIP_STARTUP_MIGRATIONS === "true",
  smtpUrl: process.env.SMTP_URL?.trim() || null,
  mailFrom: process.env.MAIL_FROM?.trim() || null,
  trustProxy: process.env.TRUST_PROXY === "true" || process.env.VERCEL === "1",
  brapiApiKey: process.env.BRAPI_API_KEY?.trim() || null,
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
  aiDailyLimit: Math.min(
    1000,
    Math.max(1, Number(process.env.AI_DAILY_LIMIT || 100) || 100),
  ),
  assistantFeatureEnabled: assistantFeatureEnabled(),
  aiAssistantEnabled:
    assistantFeatureEnabled() && process.env.AI_ASSISTANT_ENABLED === "true",
  aiUserDailyLimit: Math.min(
    100,
    Math.max(
      1,
      Math.floor(Number(process.env.AI_USER_DAILY_LIMIT || 20) || 20),
    ),
  ),
  supportEmail: process.env.SUPPORT_EMAIL?.trim() || null,
  supportHours: process.env.SUPPORT_HOURS?.trim() || null,
  professionalName: process.env.PROFESSIONAL_NAME?.trim() || null,
  professionalCategory: process.env.PROFESSIONAL_CATEGORY?.trim() || null,
  professionalRegistration:
    process.env.PROFESSIONAL_REGISTRATION?.trim() || null,
  rankingAdminEmails: (process.env.RANKING_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  sessionCookieName: isProduction ? "__Host-evorix_session" : "evorix_session",
  sessionHours: 8,
});
