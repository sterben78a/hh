import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, "../../.env");

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

process.env.DATABASE_URL ??= "file:./dev.db";
process.env.SESSION_TTL_DAYS ??= "30";
process.env.PORT ??= "4000";

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS),
  port: Number(process.env.PORT),
  isProd: process.env.NODE_ENV === "production",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
