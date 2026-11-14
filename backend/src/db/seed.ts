import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { db, primarySql } from './index.js';
import { employees, fxRates, salaryRevisions, type NewEmployee, type NewFxRate } from './schema.js';
import { sql } from 'drizzle-orm';

// Static corporate FX planning rates (USD base)
export const CORPORATE_FX_RATES: Record<string, { rateToUsd: number; currency: string; name: string }> = {
  US: { rateToUsd: 1.000000, currency: 'USD', name: 'United States' },
  DE: { rateToUsd: 1.086000, currency: 'EUR', name: 'Germany' },
  GB: { rateToUsd: 1.263000, currency: 'GBP', name: 'United Kingdom' },
  IN: { rateToUsd: 0.011900, currency: 'INR', name: 'India' },
  SG: { rateToUsd: 0.745000, currency: 'SGD', name: 'Singapore' },
  JP: { rateToUsd: 0.006700, currency: 'JPY', name: 'Japan' },
};

// Benchmark L3 base salaries in local currency
const COUNTRY_L3_BENCHMARKS: Record<string, number> = {
  US: 125000,     // USD
  DE: 82000,      // EUR
  GB: 68000,      // GBP
  IN: 2400000,    // INR
  SG: 110000,     // SGD
  JP: 9200000,    // JPY
};

// Career level multipliers relative to L3
const LEVEL_MULTIPLIERS: Record<string, number> = {
  L1: 0.55,
  L2: 0.75,
  L3: 1.00,
  L4: 1.40,
  L5: 1.95,
  L6: 2.75,
};

// Department compensation adjustments
const DEPT_MULTIPLIERS: Record<string, number> = {
  Engineering: 1.10,
  Product: 1.05,
  Design: 0.95,
  Sales: 0.90, // Note: Lower base but higher bonus target
  Operations: 0.85,
  People: 0.85,
};

// Target distribution weights
const COUNTRIES = ['US', 'IN', 'DE', 'GB', 'SG', 'JP'] as const;
const COUNTRY_WEIGHTS = [0.38, 0.27, 0.14, 0.11, 0.05, 0.05];

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Sales', 'Operations', 'People'] as const;
const DEPT_WEIGHTS = [0.35, 0.15, 0.10, 0.20, 0.10, 0.10];

const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;
const LEVEL_WEIGHTS = [0.08, 0.22, 0.32, 0.22, 0.12, 0.04];

const STATUSES = ['active', 'inactive', 'terminated'] as const;
const STATUS_WEIGHTS = [0.93, 0.04, 0.03];

// Weighted random helper using Faker PRNG
function weightedChoice<T extends string>(items: readonly T[], weights: number[]): T {
  const r = faker.number.float({ min: 0, max: 1 });
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

// Log-normal noise: Box-Muller transform for normal distribution
function randomNormal(mean = 0, stdev = 0.10): number {
  const u1 = Math.max(1e-7, faker.number.float({ min: 0, max: 1 }));
  const u2 = faker.number.float({ min: 0, max: 1 });
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdev;
}

export async function seedDatabase(targetCount = 10000, force = false): Promise<void> {
  const startTime = performance.now();
  console.log(`\n🌱 Starting deterministic seed pipeline (Target: ${targetCount.toLocaleString()} employees)...`);

  // Ensure deterministic PRNG
  faker.seed(42);

  // Check if data already exists
  const existingCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(employees);
  const existingCount = existingCountResult[0]?.count || 0;

  if (existingCount >= targetCount && !force) {
    // Check if salary_revisions need backfilling for existing employees
    const revCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(salaryRevisions);
    const revCount = revCountResult[0]?.count || 0;
    console.log(`ℹ️ Existing employees: ${existingCount.toLocaleString()}, Revisions: ${revCount.toLocaleString()}`);
    if (revCount === 0 && existingCount > 0) {
      console.log(`📜 Backfilling initial salary revisions for ${existingCount.toLocaleString()} employees...`);
      await db.execute(sql`
        INSERT INTO salary_revisions (
          employee_id,
          effective_from,
          effective_to,
          local_base_salary,
          local_bonus_target,
          local_currency,
          fx_rate_snapshot,
          base_salary_usd,
          bonus_target_usd,
          reason,
          changed_by,
          created_at
        )
        SELECT 
          e.id,
          (e.hire_date::timestamp with time zone),
          NULL,
          e.local_base_salary,
          e.local_bonus_target,
          e.local_currency,
          fx.rate_to_usd,
          e.base_salary_usd,
          e.bonus_target_usd,
          'Initial Calibration',
          'system',
          NOW()
        FROM employees e
        JOIN fx_rates fx ON e.local_currency = fx.currency_code;
      `);
      console.log(`✅ Backfilled initial salary revisions.`);
    }
    console.log(`ℹ️ Database already seeded with ${existingCount.toLocaleString()} employees. Skipping.`);
    return;
  }

  if (force && existingCount > 0) {
    console.log(`🧹 Clearing existing data (--force enabled)...`);
    await db.delete(salaryRevisions);
    await db.delete(employees);
    await db.delete(fxRates);
  }

  // 1. Seed FX Rates
  console.log(`💱 Seeding corporate FX planning rates...`);
  const fxRows: NewFxRate[] = Object.entries(CORPORATE_FX_RATES).map(([_, data]) => ({
    currencyCode: data.currency,
    rateToUsd: data.rateToUsd.toFixed(6),
    effectiveDate: '2026-01-01',
  }));

  // Upsert FX rates
  for (const row of fxRows) {
    await db.insert(fxRates).values(row).onConflictDoUpdate({
      target: fxRates.currencyCode,
      set: { rateToUsd: row.rateToUsd, effectiveDate: row.effectiveDate },
    });
  }

  // 2. Generate 10,000 Employees in Memory
  console.log(`👥 Generating ${targetCount.toLocaleString()} realistic employee profiles with log-normal salary calibration...`);
  const batchSize = 1000;
  const totalBatches = Math.ceil(targetCount / batchSize);

  let insertedCount = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const currentBatchSize = Math.min(batchSize, targetCount - insertedCount);
    const batchRows: NewEmployee[] = [];

    for (let i = 0; i < currentBatchSize; i++) {
      const empNumber = insertedCount + i + 1;
      const employeeCode = `ACME-${empNumber.toString().padStart(5, '0')}`;
      
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const fullName = `${firstName} ${lastName}`;
      // Clean unique email
      const email = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}.${empNumber}@acmepay.corp`;

      const country = weightedChoice(COUNTRIES, COUNTRY_WEIGHTS);
      const department = weightedChoice(DEPARTMENTS, DEPT_WEIGHTS);
      const level = weightedChoice(LEVELS, LEVEL_WEIGHTS);
      const status = weightedChoice(STATUSES, STATUS_WEIGHTS);

      const countryFx = CORPORATE_FX_RATES[country];
      const localCurrency = countryFx.currency;
      const fxRate = countryFx.rateToUsd;

      // Base salary calculation
      const benchmark = COUNTRY_L3_BENCHMARKS[country];
      const levelMult = LEVEL_MULTIPLIERS[level];
      const deptMult = DEPT_MULTIPLIERS[department];
      const noise = Math.exp(randomNormal(0, 0.08)); // Log-normal variation

      let rawLocalSalary = benchmark * levelMult * deptMult * noise;
      // Round to clean integer/minor values (JPY rounded to nearest 1,000, others rounded to nearest 100)
      if (country === 'JP') {
        rawLocalSalary = Math.round(rawLocalSalary / 1000) * 1000;
      } else {
        rawLocalSalary = Math.round(rawLocalSalary / 100) * 100;
      }

      // Bonus target percentage
      let bonusPct = 0.15;
      if (department === 'Sales') {
        bonusPct = faker.number.float({ min: 0.30, max: 0.60 });
      } else if (level === 'L5' || level === 'L6') {
        bonusPct = faker.number.float({ min: 0.20, max: 0.35 });
      } else if (level === 'L1' || level === 'L2') {
        bonusPct = faker.number.float({ min: 0.08, max: 0.15 });
      } else {
        bonusPct = faker.number.float({ min: 0.12, max: 0.20 });
      }

      const rawLocalBonus = Math.round(rawLocalSalary * bonusPct);

      // Precomputed USD normalizations (transactional write-time guarantee)
      const baseSalaryUsd = Number((rawLocalSalary * fxRate).toFixed(2));
      const bonusTargetUsd = Number((rawLocalBonus * fxRate).toFixed(2));

      // Realistic hire dates within the past 6 years
      const hireDate = faker.date.between({
        from: '2020-01-01',
        to: '2026-10-01',
      }).toISOString().split('T')[0];

      batchRows.push({
        employeeCode,
        fullName,
        email,
        department,
        level,
        country,
        localCurrency,
        localBaseSalary: rawLocalSalary.toFixed(2),
        localBonusTarget: rawLocalBonus.toFixed(2),
        baseSalaryUsd: baseSalaryUsd.toFixed(2),
        bonusTargetUsd: bonusTargetUsd.toFixed(2),
        employmentStatus: status,
        hireDate,
      });
    }

    // Insert batch in transaction
    await db.transaction(async (tx) => {
      await tx.insert(employees).values(batchRows);
    });

    insertedCount += currentBatchSize;
    process.stdout.write(`\r  ⚡ Inserted ${insertedCount.toLocaleString()} / ${targetCount.toLocaleString()} rows...`);
  }

  // Populate initial revision ledger entries for all inserted employees
  console.log(`\n📜 Populating initial salary revisions for ${targetCount.toLocaleString()} employees...`);
  await db.execute(sql`
    INSERT INTO salary_revisions (
      employee_id,
      effective_from,
      effective_to,
      local_base_salary,
      local_bonus_target,
      local_currency,
      fx_rate_snapshot,
      base_salary_usd,
      bonus_target_usd,
      reason,
      changed_by,
      created_at
    )
    SELECT 
      e.id,
      (e.hire_date::timestamp with time zone),
      NULL,
      e.local_base_salary,
      e.local_bonus_target,
      e.local_currency,
      fx.rate_to_usd,
      e.base_salary_usd,
      e.bonus_target_usd,
      'Initial Calibration',
      'system',
      NOW()
    FROM employees e
    JOIN fx_rates fx ON e.local_currency = fx.currency_code;
  `);

  const durationSec = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Seeding completed! Inserted ${insertedCount.toLocaleString()} employees and revisions in ${durationSec}s.`);
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  const force = process.argv.includes('--force');
  seedDatabase(10000, force)
    .then(async () => {
      await primarySql.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seeding failed:', err);
      await primarySql.end();
      process.exit(1);
    });
}
