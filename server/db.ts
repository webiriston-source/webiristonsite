import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const databaseUrlCandidates = [
  { key: "DATABASE_URL", value: process.env.DATABASE_URL },
  { key: "POSTGRES_URL", value: process.env.POSTGRES_URL },
  { key: "DATABASE_URL_UNPOOLED", value: process.env.DATABASE_URL_UNPOOLED },
  { key: "POSTGRES_URL_NON_POOLING", value: process.env.POSTGRES_URL_NON_POOLING },
  { key: "POSTGRES_URL_NO_SSL", value: process.env.POSTGRES_URL_NO_SSL },
];

const selectedDatabaseUrl = databaseUrlCandidates.find((candidate) => candidate.value);

export const databaseUrl = selectedDatabaseUrl?.value ?? null;
export const databaseUrlSource = selectedDatabaseUrl?.key ?? null;
export const isDatabaseConfigured = Boolean(databaseUrl);

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
