import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const existing = globalForDb.__arenaNextJsPostgresqlPool;
  if (existing) return existing;
  const created = new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = created;
  }
  return created;
}

export function getDb(): NodePgDatabase {
  return drizzle(getPool());
}

export const pool = process.env.DATABASE_URL ? getPool() : null;
export const db = pool ? drizzle(pool) : null;
