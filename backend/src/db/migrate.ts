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

    // Ensure covering index with INCLUDE clause is created for zero-heap-fetch keyset pagination
    await migrationClient`
      CREATE INDEX IF NOT EXISTS idx_employees_covering_grid 
      ON employees (base_salary_usd DESC, id DESC) 
      INCLUDE (employee_code, full_name, email, department, level, country, local_currency, local_base_salary, local_bonus_target, bonus_target_usd, employment_status, hire_date, version, created_at, updated_at);
    `;

    console.log('✅ Migrations and covering indexes completed successfully.');
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
