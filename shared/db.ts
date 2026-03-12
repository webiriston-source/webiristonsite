/**
 * On-demand database connection for Vercel Serverless Functions
 * 
 * Creates a PostgreSQL connection only when needed, executes queries,
 * and closes the connection immediately after use to avoid idle connections.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Client } = pg;

/**
 * Get database connection string from environment variables
 */
function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NO_SSL,
  ];

  return candidates.find((url) => url) || null;
}

/**
 * SSL configuration for production/Vercel
 */
function getSslConfig() {
  return process.env.VERCEL || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined;
}

/**
 * Execute a database operation with on-demand connection
 * 
 * Creates a connection, executes the operation, and closes it immediately.
 * This ensures no idle connections are kept open in serverless environments.
 * 
 * @param operation - Async function that receives a Drizzle db instance
 * @returns The result of the operation
 */
export async function withDb<T>(
  operation: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("Database URL not configured. Please set DATABASE_URL or POSTGRES_URL environment variable.");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: getSslConfig(),
  });

  try {
    await client.connect();
    const db = drizzle(client, { schema });
    const result = await operation(db);
    return result;
  } finally {
    await client.end();
  }
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
