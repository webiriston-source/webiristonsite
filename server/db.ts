import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.ts";

const { Pool } = pg;

const databaseUrlCandidates = [
  { key: "DATABASE_URL_UNPOOLED", value: process.env.DATABASE_URL_UNPOOLED },
  { key: "POSTGRES_URL_NON_POOLING", value: process.env.POSTGRES_URL_NON_POOLING },
  { key: "DATABASE_URL", value: process.env.DATABASE_URL },
  { key: "POSTGRES_URL", value: process.env.POSTGRES_URL },
  { key: "POSTGRES_URL_NO_SSL", value: process.env.POSTGRES_URL_NO_SSL },
];

const selectedDatabaseUrl = databaseUrlCandidates.find((candidate) => candidate.value);

export const databaseUrl = selectedDatabaseUrl?.value ?? null;
export const databaseUrlSource = selectedDatabaseUrl?.key ?? null;
export const isDatabaseConfigured = Boolean(databaseUrl);

const sslConfig =
  process.env.VERCEL || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(sslConfig ? { ssl: sslConfig } : {}),
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
