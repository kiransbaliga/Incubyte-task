# ADR-002: Dual-Currency Data Model & Database Indexing

**Status:** Accepted  
**Date:** 2026-11-13  
**Deciders:** Engineering Team

## Context

ACME Corp has 10,000 employees across 6 countries (US, IN, DE, GB, SG, JP) paid in 6 different currencies. The HR Manager needs to:

1. View each employee's salary in their **local currency** (for offer-letter accuracy).
2. Compare salaries across countries using a **normalized USD** value (for global benchmarking).
3. Filter, sort, and aggregate compensation data across the full 10,000-row dataset with **<50ms p95 latency**.

Key design tensions:
- **Float vs. exact arithmetic** for currency values.
- **Runtime FX conversion vs. precomputed normalization** for cross-country queries.
- **Which composite indexes** to create for the HR Manager's most common access patterns.

## Decision

### Currency Storage: NUMERIC(14,2) — No Floats

Store all monetary values as `NUMERIC(14,2)` in PostgreSQL (Drizzle's `numeric({ precision: 14, scale: 2 })`).

**Why not FLOAT/REAL:** Floating-point arithmetic produces rounding errors in financial calculations. Example: `0.1 + 0.2 = 0.30000000000000004` in IEEE 754. For salary data, even a \$0.01 rounding error is unacceptable in an HR audit.

**Why not BIGINT in minor units (cents):** While storing cents avoids decimal issues, it complicates:
- Display formatting (dividing by 100 everywhere).
- SQL aggregations (AVG, MEDIAN return cents, need conversion).
- Japanese Yen has zero decimal places — minor-unit logic varies by currency.

`NUMERIC(14,2)` stores up to \$999,999,999,999.99 with exact precision, handles SQL aggregations naturally, and aligns with ISO 4217 for all our target currencies.

### FX Normalization: Precomputed on Write

```
employees.base_salary_usd = employees.local_base_salary × fx_rates.rate_to_usd
```

Computed **within the same database transaction** whenever `local_base_salary` or `local_currency` changes. Stored as a materialized column on the `employees` table.

**Why precomputed, not runtime JOIN:**

| Approach | 10k-row sort by USD salary | Index usable? |
|----------|---------------------------|---------------|
| Runtime: `ORDER BY e.local_base_salary * fx.rate_to_usd` | Full table scan + JOIN + sort | ❌ No index on computed expression |
| Precomputed: `ORDER BY e.base_salary_usd` | Index scan | ✅ Direct B-tree index hit |

The precomputed approach eliminates FX joins from every read query, enables direct composite B-tree indexes on `base_salary_usd`, and keeps all aggregations (AVG, MEDIAN, P90) simple `SELECT` operations.

**Trade-off:** When corporate FX rates change (quarterly), a batch job must recalculate all `base_salary_usd` values. This is acceptable because FX rates change infrequently (quarterly/annual planning rates, not live market).

### FX Rates: Static Reference Table

```sql
CREATE TABLE fx_rates (
    currency_code CHAR(3) PRIMARY KEY,  -- ISO 4217
    rate_to_usd   NUMERIC(12,6),        -- e.g., EUR: 1.086000, INR: 0.011900
    effective_date DATE
);
```

Static corporate planning rates. **Not** live market feeds (see PRD §4 — deliberately out of scope).

### Composite Index Strategy

Based on the HR Manager's primary access patterns:

| Access Pattern | Index | Columns |
|---------------|-------|---------|
| "Show all L4 Engineers sorted by salary" | `idx_employees_dept_level_salary` | `(department, level, base_salary_usd DESC)` |
| "Show all employees in Germany sorted by salary" | `idx_employees_country_salary` | `(country, base_salary_usd DESC)` |
| "Show all active employees by hire date" | `idx_employees_status_hire_date` | `(employment_status, hire_date DESC)` |
| "Search by name or email" | `idx_employees_search_trgm` | `GIN(full_name gin_trgm_ops, email gin_trgm_ops)` |

**Index column ordering rationale:** Equality-filtered columns (department, level, country, status) come first; range/sort columns (salary DESC, hire_date DESC) come last. This maximizes index prefix utilization.

### Drizzle Schema (Preview)

```typescript
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeCode: varchar('employee_code', { length: 10 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  department: varchar('department', { length: 50 }).notNull(),
  level: varchar('level', { length: 5 }).notNull(),
  country: char('country', { length: 2 }).notNull(),
  localCurrency: char('local_currency', { length: 3 }).notNull(),
  localBaseSalary: numeric('local_base_salary', { precision: 14, scale: 2 }).notNull(),
  localBonusTarget: numeric('local_bonus_target', { precision: 14, scale: 2 }).notNull(),
  baseSalaryUsd: numeric('base_salary_usd', { precision: 14, scale: 2 }).notNull(),
  bonusTargetUsd: numeric('bonus_target_usd', { precision: 14, scale: 2 }).notNull(),
  employmentStatus: varchar('employment_status', { length: 10 }).notNull().default('active'),
  hireDate: date('hire_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_employees_dept_level_salary').on(
    table.department, table.level, table.baseSalaryUsd.desc()
  ),
  index('idx_employees_country_salary').on(
    table.country, table.baseSalaryUsd.desc()
  ),
  index('idx_employees_status_hire_date').on(
    table.employmentStatus, table.hireDate.desc()
  ),
  index('idx_employees_search_trgm')
    .using('gin', sql`${table.fullName} gin_trgm_ops, ${table.email} gin_trgm_ops`),
]);
```

### Pagination Strategy: Offset with COUNT(*) OVER() vs. Cursor

For the 10,000-row compensation grid, we evaluated both pagination patterns:

| Criterion | Keyset / Cursor Pagination | Offset + COUNT(*) OVER() (Selected) |
|-----------|----------------------------|-------------------------------------|
| **Random Page Access** | ❌ Impossible: cannot jump directly to "Page 15" without walking prior pages | ✅ Direct jump to any page (`?page=15`) |
| **Total Count / KPI** | ❌ Requires a separate `SELECT COUNT(*)` query | ✅ In-flight total via window function `COUNT(*) OVER()` in a single round-trip |
| **UX Alignment** | Good for infinite scroll / social feeds | Perfect for HR tables (displays "Showing 51–100 of 10,000") |
| **Sort Flexibility** | Complex composite cursors required when user switches multi-column sort | Simple dynamic `ORDER BY col OFFSET n LIMIT m` |
| **Performance at 10k Scale** | O(1) across any depth | O(N) skip, but at 10k rows with B-tree index, `OFFSET 9950` executes in <5ms |

**Decision:** Use **Offset pagination with `COUNT(*) OVER()`** for the HR grid. It delivers essential admin UI capabilities (direct page jumps, accurate total record counts, clean URL synchronization) with sub-50ms query times on 10,000 rows. If the dataset scales to 500,000+ rows in the future, cursor pagination can be introduced for high-throughput public API endpoints.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| FLOAT/REAL for currency | Floating-point rounding errors unacceptable for financial data |
| BIGINT in cents | Complicates display, SQL aggregations, and multi-currency (JPY has 0 decimal places) |
| Runtime FX JOIN on every query | Prevents index usage on sorted salary columns; adds latency |
| PostgreSQL generated columns | Drizzle ORM doesn't fully support `GENERATED ALWAYS AS` with cross-table references (FX join needed) |
| Partial indexes per country | Too many indexes to maintain; composite index covers all patterns |
| Cursor-only pagination | Fails HR requirements: cannot jump to arbitrary pages or get total count without double queries |

## Consequences

- `NUMERIC` columns return as `string` in Drizzle TypeScript — must use explicit `Number()` or `parseFloat()` in application code for arithmetic.
- Batch FX recalculation job needed when corporate rates change — acceptable for quarterly frequency.
- GIN trigram index requires `pg_trgm` extension — must be enabled via a custom migration before the index is created.
- Precomputed `base_salary_usd` creates denormalization — write path is slightly more complex but read path is dramatically faster.
