import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || 'postgresql://acme_admin:acme_secret@localhost:5432/acme_compensation';

export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const migrationDb = drizzle(migrationClient);

  const migrationsFolder = path.resolve(__dirname, '../../drizzle');

  try {
    await migrate(migrationDb, { migrationsFolder });
    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
