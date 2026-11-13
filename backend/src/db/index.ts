import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://acme_admin:acme_secret@localhost:5432/acme_compensation';
const readonlyDatabaseUrl = process.env.READONLY_DATABASE_URL || 'postgresql://acme_readonly:readonly_secret@localhost:5432/acme_compensation';

// Primary read-write pool for core CRUD operations
export const primarySql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(primarySql, { schema });

// Dedicated read-only pool for safe AI Text-to-SQL execution
export const readonlySql = postgres(readonlyDatabaseUrl, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 5,
});

export const aiDb = drizzle(readonlySql, { schema });

export async function closeConnections(): Promise<void> {
  await Promise.all([primarySql.end(), readonlySql.end()]);
}
