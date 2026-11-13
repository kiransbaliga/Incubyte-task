import { pgTable, uuid, varchar, char, numeric, date, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Currency reference rates table (corporate planning FX rates).
 * Stores conversion multiplier from local_currency to USD.
 */
export const fxRates = pgTable('fx_rates', {
  currencyCode: char('currency_code', { length: 3 }).primaryKey(), // ISO 4217 (e.g. USD, EUR, INR)
  rateToUsd: numeric('rate_to_usd', { precision: 12, scale: 6 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
});

/**
 * Global Employees table supporting 10,000+ records.
 * Optimized with composite B-Tree indexes for sub-50ms filtered & sorted queries,
 * and a GIN trigram index for fast text search.
 */
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeCode: varchar('employee_code', { length: 20 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  department: varchar('department', { length: 50 }).notNull(), // Engineering, Product, Design, Sales, Operations, People
  level: varchar('level', { length: 10 }).notNull(),           // L1, L2, L3, L4, L5, L6
  country: char('country', { length: 2 }).notNull(),          // US, IN, DE, GB, SG, JP
  localCurrency: char('local_currency', { length: 3 }).notNull(), // USD, INR, EUR, GBP, SGD, JPY
  localBaseSalary: numeric('local_base_salary', { precision: 14, scale: 2 }).notNull(),
  localBonusTarget: numeric('local_bonus_target', { precision: 14, scale: 2 }).notNull().default('0.00'),
  baseSalaryUsd: numeric('base_salary_usd', { precision: 14, scale: 2 }).notNull(),
  bonusTargetUsd: numeric('bonus_target_usd', { precision: 14, scale: 2 }).notNull().default('0.00'),
  employmentStatus: varchar('employment_status', { length: 20 }).notNull().default('active'), // active, inactive, terminated
  hireDate: date('hire_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 1. Composite index for department + level filtering with USD salary sorting
  index('idx_employees_dept_level_salary').on(
    table.department,
    table.level,
    table.baseSalaryUsd.desc()
  ),
  // 2. Composite index for country filtering with USD salary sorting
  index('idx_employees_country_salary').on(
    table.country,
    table.baseSalaryUsd.desc()
  ),
  // 3. Composite index for active/status filter with hire date sorting
  index('idx_employees_status_hire_date').on(
    table.employmentStatus,
    table.hireDate.desc()
  ),
  // 4. GIN Trigram index for fuzzy ILIKE name and email searches
  index('idx_employees_search_trgm').using(
    'gin',
    sql`${table.fullName} gin_trgm_ops, ${table.email} gin_trgm_ops`
  ),
]);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;
