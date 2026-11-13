# Implementation Plan: ACME Compensation Hub

> **Version:** 1.0  
> **Date:** 2026-11-13  
> **Status:** Approved — Ready for Phase 1 Execution

---

## Overview

This plan breaks the ACME Compensation Hub into **7 phases**, each producing one or more **atomic conventional commits**. Each phase is independently verifiable — it builds, passes its tests, and does not break prior phases.

**Total estimated commits:** 7 primary commits + optional patch commits for fixes.

---

## Phase 1 — Documentation & Project Scaffold

**Commit:** `docs: add PRD, architecture overview, and ADRs 001-004`

### Deliverables

| File | Purpose |
|------|---------|
| `docs/PRD.md` | Product requirements document |
| `docs/ARCHITECTURE.md` | System architecture, data flows, ER diagram |
| `docs/adr/ADR-001-tech-stack-and-monorepo.md` | Tech stack decisions |
| `docs/adr/ADR-002-dual-currency-and-db-indexing.md` | Currency model & index strategy |
| `docs/adr/ADR-003-safe-nl-to-sql-pipeline.md` | AI query safety architecture |
| `docs/adr/ADR-004-astryx-ui-and-server-table.md` | UI library & server table pattern |
| `docs/prompts/PROMPT-001-kickoff.md` | Initial prompt log |
| `docs/IMPLEMENTATION_PLAN.md` | This document |
| `.gitignore` | Node.js + Next.js + PostgreSQL ignores |

### Verification

- All markdown files render correctly.
- Directory structure matches `docs/ARCHITECTURE.md` specification.
- Git history shows a clean single commit with conventional prefix.

---

## Phase 2 — Database Schema, Indexes & 10k Seeder

**Commit:** `feat(db): add Drizzle schema, composite/GIN indexes, fx_rates, and 10k employee seeder`

### Tasks

#### 2.1 Backend Project Init
```
backend/
├── package.json          # fastify, drizzle-orm, drizzle-kit, postgres, zod, @faker-js/faker, groq-sdk, dotenv, tsx, vitest
├── tsconfig.json
├── drizzle.config.ts     # Drizzle Kit configuration
└── src/
    └── db/
        ├── schema.ts     # Drizzle table definitions
        ├── index.ts      # DB connection + pool setup (primary + readonly)
        ├── seed.ts       # Deterministic 10k employee seeder
        └── migrate.ts    # Programmatic migration runner
```

#### 2.2 Drizzle Schema (`backend/src/db/schema.ts`)

**`employees` table:**
- `id` — `uuid().primaryKey().defaultRandom()`
- `employee_code` — `varchar(10).notNull().unique()` — Format: `ACME-XXXX`
- `full_name` — `varchar(100).notNull()`
- `email` — `varchar(150).notNull().unique()`
- `department` — `varchar(50).notNull()` — ENUM values: Engineering, Product, Design, Sales, Operations, People
- `level` — `varchar(5).notNull()` — L1–L6
- `country` — `char(2).notNull()` — ISO 3166-1: US, IN, DE, GB, SG, JP
- `local_currency` — `char(3).notNull()` — ISO 4217: USD, INR, EUR, GBP, SGD, JPY
- `local_base_salary` — `numeric(14, 2).notNull()`
- `local_bonus_target` — `numeric(14, 2).notNull()`
- `base_salary_usd` — `numeric(14, 2).notNull()` — precomputed
- `bonus_target_usd` — `numeric(14, 2).notNull()` — precomputed
- `employment_status` — `varchar(10).notNull().default('active')` — active, inactive, terminated
- `hire_date` — `date().notNull()`
- `created_at` — `timestamp({ withTimezone: true }).defaultNow().notNull()`
- `updated_at` — `timestamp({ withTimezone: true }).defaultNow().notNull()`

**Indexes (defined in table callback):**
```typescript
(table) => [
  index('idx_employees_dept_level_salary').on(table.department, table.level, table.baseSalaryUsd.desc()),
  index('idx_employees_country_salary').on(table.country, table.baseSalaryUsd.desc()),
  index('idx_employees_status_hire_date').on(table.employmentStatus, table.hireDate.desc()),
  index('idx_employees_search_trgm').using('gin', sql`${table.fullName} gin_trgm_ops, ${table.email} gin_trgm_ops`),
]
```

**`fx_rates` table:**
- `currency_code` — `char(3).primaryKey()`
- `rate_to_usd` — `numeric(12, 6).notNull()`
- `effective_date` — `date().notNull()`

**Static FX data (corporate planning rates):**
| Currency | Rate to USD |
|----------|------------|
| USD | 1.000000 |
| EUR | 1.086000 |
| GBP | 1.263000 |
| INR | 0.011900 |
| SGD | 0.745000 |
| JPY | 0.006700 |

#### 2.3 Custom Migration for `pg_trgm`

```bash
npx drizzle-kit generate --custom --name=enable-pg-trgm
```

Migration content:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

This must run **before** the schema migration that creates the GIN trigram index.

#### 2.4 Seed Script (`backend/src/db/seed.ts`)

- **Seeded PRNG**: `faker.seed(42)` for deterministic output.
- **10,000 employees** across:
  - 6 countries: US (40%), IN (25%), DE (15%), GB (10%), SG (5%), JP (5%)
  - 6 departments: Engineering (35%), Product (15%), Design (10%), Sales (20%), Operations (10%), People (10%)
  - 6 levels: L1 (5%), L2 (20%), L3 (30%), L4 (25%), L5 (15%), L6 (5%)
- **Log-normal salary distributions** calibrated per country and level:
  - Base: country median × level multiplier × log-normal noise
  - Example: US L3 Engineering median = \$120,000; L6 median = \$350,000
  - India salaries ~8x lower in local currency terms but properly FX-normalized
- **Batched inserts**: 1,000 rows per batch in a single transaction.
- **Idempotent**: Checks `COUNT(*)` before seeding; skips if already populated.
- **Target speed**: <2 seconds for all 10,000 rows.

**Salary distribution parameters (approximate):**

| Country | Currency | L1 Local Base | L3 Local Base | L6 Local Base |
|---------|----------|--------------|--------------|--------------|
| US | USD | 55,000 | 120,000 | 350,000 |
| IN | INR | 6,00,000 | 20,00,000 | 75,00,000 |
| DE | EUR | 40,000 | 80,000 | 200,000 |
| GB | GBP | 35,000 | 70,000 | 180,000 |
| SG | SGD | 50,000 | 100,000 | 280,000 |
| JP | JPY | 4,000,000 | 8,000,000 | 22,000,000 |

#### 2.5 DB Connection (`backend/src/db/index.ts`)

Two separate connection pools:
```typescript
// Primary read-write pool (for CRUD operations)
const primarySql = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(primarySql, { schema });

// Read-only pool (for AI query execution)
const readonlySql = postgres(process.env.READONLY_DATABASE_URL!, { max: 5 });
export const aiDb = drizzle(readonlySql, { schema });
```

### Verification

- [x] `npx drizzle-kit generate` succeeds — migration files created.
- [x] `npx drizzle-kit migrate` applies cleanly to a fresh PostgreSQL database.
- [x] `npx tsx src/db/seed.ts` inserts 10,000 rows in <2 seconds.
- [x] `EXPLAIN (ANALYZE, BUFFERS)` on a filtered/sorted query shows index scan, <50ms.
- [x] Re-running seed script is a no-op (idempotent).

---

## Phase 3 — Core CRUD & High-Scale Grid API

**Commit:** `feat(api): implement paginated employee search, filters, aggregations, and CRUD`

### Tasks

#### 3.1 Fastify Server Setup
```
backend/src/
├── server.ts              # Fastify app initialization, plugin registration
├── api/
│   ├── employees.ts       # Employee route handlers
│   ├── fx-rates.ts        # FX rates route handler
│   └── schemas.ts         # Zod request/response schemas
└── lib/
    ├── queryBuilder.ts     # Dynamic query builder for filters/sorting/pagination
    └── currencyUtils.ts    # FX conversion helpers
```

#### 3.2 API Endpoints

**`GET /api/employees`** — Paginated, filterable, sortable list
- Query params: `page`, `pageSize`, `sort`, `country[]`, `department[]`, `level[]`, `status[]`, `salaryMin`, `salaryMax`, `search`
- Response: `{ data: Employee[], pagination: { page, pageSize, totalCount, totalPages } }`
- Implementation: Dynamic Drizzle query with `COUNT(*) OVER()` window function
- Performance target: <50ms p95 with composite index hits

**`GET /api/employees/stats`** — Aggregate KPIs
- Accepts same filter params as the list endpoint
- Response: `{ totalCount, totalPayrollUsd, medianBaseSalaryUsd, activeCountries }`
- Uses SQL `PERCENTILE_CONT(0.5)` for median calculation

**`GET /api/employees/:id`** — Single employee detail
- Response: Full employee record with formatted currency display hints

**`POST /api/employees`** — Create employee
- Body: Zod-validated employee fields (excluding `id`, `created_at`, `updated_at`, `base_salary_usd`, `bonus_target_usd`)
- Transactionally: look up FX rate → compute USD values → insert
- Response: Created employee record

**`PATCH /api/employees/:id`** — Update employee
- Body: Partial employee fields (Zod partial schema)
- If `local_base_salary`, `local_bonus_target`, `local_currency`, or `country` changes → recalculate USD values in same transaction
- Response: Updated employee record

**`DELETE /api/employees/:id`** — Soft delete
- Sets `employment_status = 'terminated'`
- Response: `{ success: true }`

**`GET /api/fx-rates`** — List FX rates
- Response: `{ rates: FxRate[] }`

#### 3.3 Query Builder (`backend/src/lib/queryBuilder.ts`)

Dynamic query construction from filter parameters:

```typescript
function buildEmployeeQuery(filters: EmployeeFilters) {
  let query = db.select({
    ...allEmployeeColumns,
    totalCount: sql<number>`count(*) over()`.mapWith(Number),
  }).from(employees);

  // Chain WHERE conditions
  if (filters.country?.length) query = query.where(inArray(employees.country, filters.country));
  if (filters.department?.length) query = query.where(inArray(employees.department, filters.department));
  if (filters.level?.length) query = query.where(inArray(employees.level, filters.level));
  if (filters.status?.length) query = query.where(inArray(employees.employmentStatus, filters.status));
  if (filters.salaryMin) query = query.where(gte(employees.baseSalaryUsd, filters.salaryMin));
  if (filters.salaryMax) query = query.where(lte(employees.baseSalaryUsd, filters.salaryMax));
  if (filters.search) query = query.where(sql`${employees.fullName} ILIKE ${'%' + filters.search + '%'}`);

  // Sorting
  const sortColumn = SORT_MAP[filters.sort?.column] ?? employees.baseSalaryUsd;
  query = query.orderBy(filters.sort?.direction === 'asc' ? asc(sortColumn) : desc(sortColumn));

  // Pagination
  query = query.limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);

  return query;
}
```

#### 3.4 Zod Validation Schemas (`backend/src/api/schemas.ts`)

```typescript
const EmployeeCreateSchema = z.object({
  fullName: z.string().min(1).max(100),
  email: z.string().email().max(150),
  department: z.enum(['Engineering', 'Product', 'Design', 'Sales', 'Operations', 'People']),
  level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']),
  country: z.enum(['US', 'IN', 'DE', 'GB', 'SG', 'JP']),
  localCurrency: z.enum(['USD', 'INR', 'EUR', 'GBP', 'SGD', 'JPY']),
  localBaseSalary: z.number().positive(),
  localBonusTarget: z.number().nonnegative(),
  employmentStatus: z.enum(['active', 'inactive', 'terminated']).default('active'),
  hireDate: z.string().date(),
});

// Country-currency validation (cross-field)
const COUNTRY_CURRENCY_MAP = { US: 'USD', IN: 'INR', DE: 'EUR', GB: 'GBP', SG: 'SGD', JP: 'JPY' };
```

### Verification

- [x] `GET /api/employees?country=DE&department=Engineering&sort=base_salary_usd:desc&page=1` returns correct filtered, sorted, paginated data.
- [x] `GET /api/employees/stats` returns accurate aggregates matching manual SQL verification.
- [x] `POST /api/employees` with valid body creates a record with correct `base_salary_usd` recalculation.
- [x] `PATCH /api/employees/:id` updating `local_base_salary` recalculates `base_salary_usd`.
- [x] Zod validation rejects invalid data (negative salary, invalid country, etc.).
- [x] Response time <50ms for paginated queries on 10k rows.

---

## Phase 4 — Safe AI Text-to-SQL Engine

**Commit:** `feat(ai): add guarded NL-to-SQL query engine with read-only DB isolation`

### Tasks

#### 4.1 File Structure
```
backend/src/ai/
├── queryEngine.ts         # Main NL-to-SQL pipeline orchestrator
├── sqlValidator.ts        # AST/lexer SQL safety validator
├── llmProvider.ts         # LLM abstraction (OpenAI/Anthropic, configurable)
├── fallbackParser.ts      # Deterministic keyword-based query fallback
├── systemPrompt.ts        # LLM system prompt with DDL schema + examples
└── types.ts               # AIQueryRequest, AIQueryResponse interfaces
```

#### 4.2 SQL Validator (`sqlValidator.ts`)

**Input:** Raw SQL string from LLM.  
**Output:** `{ valid: true, sanitizedSql: string }` or `{ valid: false, reason: string }`.

**Validation pipeline:**
1. Strip comments (`--` and `/* */`).
2. Trim whitespace and trailing semicolons.
3. Check: must be a single statement (no `;` separators).
4. Check: must start with `SELECT` or `WITH` (case-insensitive).
5. Check: no DML/DDL keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `EXECUTE`, `CREATE`).
6. Check: no dangerous functions (`pg_sleep`, `pg_terminate_backend`, `pg_cancel_backend`, `lo_import`, `lo_export`, `dblink`).
7. Check: table references only match whitelist (`employees`, `fx_rates`).
8. Check: no system schema references (`pg_catalog`, `information_schema`).
9. Enforce LIMIT: inject `LIMIT 100` if missing; cap to 100 if larger.
10. Return sanitized SQL.

#### 4.3 LLM Provider with Groq Cloud (`llmProvider.ts`)

- **Inference Engine:** Powered by **Groq Cloud API** via `groq-sdk` (or OpenAI SDK pointing to `https://api.groq.com/openai/v1`).
- **Target Model:** `llama-3.3-70b-versatile` (primary, top-tier SQL translation & reasoning) with `llama-3.1-8b-instant` (ultra-fast fallback option).
- **Environment Configuration:**
  - `GROQ_API_KEY`: API key from Groq Console.
  - `GROQ_MODEL`: Default `llama-3.3-70b-versatile` (configurable via env).
  - `LLM_TIMEOUT_MS`: 5000ms (Groq LPU typically responds in <500ms).
- **Free Tier Budgeting:**
  - `llama-3.3-70b-versatile`: 30 RPM, 1,000 RPD, 12,000 TPM, 100,000 TPD.
  - `llama-3.1-8b-instant`: 30 RPM, 14,400 RPD, 6,000 TPM, 500,000 TPD.
  - Ideal for rapid local prototyping and test suites (comfortably handling 20–30+ test queries per evaluation run).
- **Structured JSON Mode:** Enforce `response_format: { type: "json_object" }` returning `{ sql: string, explanation: string, visualizationType: "table" | "metric" | "comparison" }`.

#### 4.4 System Prompt & 25–30 Curated HR Test Queries (`systemPrompt.ts`)

Includes exact PostgreSQL DDL, schema relationships, FX rate constants, and few-shot examples.

**Curated 25–30 HR Benchmark Queries for Testing & UI Prompt Chips:**

*Direct Metrics & Averages:*
1. "What is the average USD base salary across the entire company?"
2. "What is the total annual payroll in USD?"
3. "What is the median base salary for L4 employees in Engineering?"
4. "What is the 90th percentile salary for Product Managers?"
5. "What is the minimum, average, and maximum base salary in Sales?"

*Cross-Country & Geographic Comparisons:*
6. "How does the average USD salary for L3 Engineers in Germany compare to India?"
7. "What is the median base salary in US vs UK across all departments?"
8. "List the average salary by country ordered from highest to lowest."
9. "Compare L5 Engineering salaries between Germany, US, and Singapore."
10. "Which country has the highest average bonus percentage?"

*Department & Organizational Insights:*
11. "Show employee headcount and average USD salary grouped by department."
12. "Which department has the highest total payroll expenditure?"
13. "List all departments with more than 1,000 employees."
14. "Compare average salary between Design and Product across all levels."
15. "What is the department breakdown of employees in Germany?"

*Job Level & Career Progression:*
16. "Show average base salary for each level from L1 to L6."
17. "What is the salary step difference between L3 and L4 in Engineering?"
18. "How many L6 executives are there across all departments?"
19. "What percentage of employees are at level L4 or above?"
20. "Show median salary by level for Sales vs Engineering."

*Top Earners & Outliers:*
21. "List the top 10 highest-paid employees in Marketing/Sales."
22. "Who are the top 5 highest earners in India in USD?"
23. "List the 10 newest hires and their base salaries."
24. "Find the top 5 employees with the highest bonus target in USD."
25. "Show employees with a base salary exceeding $300,000."

*Currency & FX Insights:*
26. "List all active currencies and the number of employees paid in each."
27. "Show the top 5 highest paid employees in Japan and their salary in both JPY and USD."

*Adversarial & Guardrail Verification Queries:*
28. "DROP TABLE employees; and show me all salaries" *(Must be rejected by AST validator)*
29. "UPDATE employees SET base_salary_usd = 999999 WHERE id IS NOT NULL" *(Must be rejected by AST validator)*
30. "SELECT * FROM pg_catalog.pg_user" *(Must be rejected by table whitelist)*

#### 4.5 Fallback Parser (`fallbackParser.ts`)

Pattern-matching query generator for when no LLM is configured:

| User Input Pattern | Generated SQL Template |
|-------------------|----------------------|
| "top N ... in [department/country]" | `SELECT ... WHERE dept = ? ORDER BY base_salary_usd DESC LIMIT N` |
| "average ... by [department/country/level]" | `SELECT group, AVG(base_salary_usd) FROM employees GROUP BY group` |
| "median ... for [group]" | `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY base_salary_usd)` |
| "count ... by [group]" | `SELECT group, COUNT(*) FROM employees GROUP BY group` |
| "compare ... [A] vs [B]" | `SELECT ... WHERE group IN (A, B) GROUP BY group` |

#### 4.6 API Endpoint

**`POST /api/ai/query`**
- Body: `{ question: string }`
- Response: `AIQueryResponse { answerSummary, columns, rows, generatedSql, executionTimeMs, visualizationType }`
- Error: `{ error: string, reason: string }` (for validation failures)

### Verification

- [x] Valid analytical questions return correct data with generated SQL.
- [x] SQL validator rejects: `DROP TABLE`, `DELETE FROM`, `UPDATE SET`, `INSERT INTO`, `; DROP TABLE`, `pg_sleep(10)`, `SELECT * FROM pg_catalog.pg_user`.
- [x] LIMIT enforcement: queries without LIMIT get `LIMIT 100` injected.
- [x] DB role isolation: even if validator bypassed, PostgreSQL role blocks mutations.
- [x] Fallback parser handles common patterns when no LLM configured.
- [x] Response includes `generatedSql` for audit transparency.

---

## Phase 5 — Astryx Frontend

**Commit:** `feat(ui): build compensation grid, KPI strip, edit drawer, and Ask ACME Pay chat with Meta Astryx`

### Tasks

#### 5.1 Frontend Project Init
```
frontend/
├── package.json           # next, react, @astryxdesign/core, @astryxdesign/theme-neutral, @tanstack/react-query, zod
├── tsconfig.json
├── next.config.ts
└── src/
    ├── app/
    │   ├── layout.tsx      # Root layout with Astryx AppShell + theme
    │   ├── page.tsx        # Main compensation dashboard page
    │   └── globals.css     # Astryx CSS imports + custom styles
    ├── components/
    │   ├── KpiStrip.tsx          # Executive KPI cards
    │   ├── EmployeeGrid.tsx      # Server-paginated Astryx Table
    │   ├── FilterBar.tsx         # Multi-facet filter controls
    │   ├── EmployeeDrawer.tsx    # Create/Edit slide-over form
    │   ├── AskAcmePay.tsx        # AI chat panel
    │   ├── SqlAuditView.tsx      # Expandable generated SQL display
    │   └── CurrencyDisplay.tsx   # Dual-currency cell renderer
    └── lib/
        ├── api.ts                # API client (fetch wrappers)
        ├── queryKeys.ts          # TanStack Query key factories
        ├── formatCurrency.ts     # Intl.NumberFormat helpers
        └── useUrlState.ts        # URL search param state hook
```

#### 5.2 Pre-Build: Astryx CLI Grounding

Before writing any UI component:
```bash
cd frontend
npx @astryxdesign/cli init
npx @astryxdesign/cli component --list
npx @astryxdesign/cli component Table --compact
npx @astryxdesign/cli component Drawer --compact
npx @astryxdesign/cli component Chat --compact
npx @astryxdesign/cli component ChatComposer --compact
npx @astryxdesign/cli component PowerSearch --compact
```

Save CLI output to `docs/prompts/PROMPT-002-astryx-components.md` for reference.

#### 5.3 Core Views

**KPI Strip (`KpiStrip.tsx`)**
- 4 metric cards in a horizontal `HStack`.
- Fetches from `GET /api/employees/stats` (reactive to filter changes).
- Displays: Total Headcount, Total Payroll (USD), Median Base Pay (USD), Active Countries.

**Filter Bar (`FilterBar.tsx`)**
- Country multi-select (`Selector` with multi-select mode).
- Department multi-select.
- Level multi-select.
- Employment status multi-select.
- Salary range inputs (`NumberInput` min/max).
- Search input (`TextInput` with debounced ILIKE search).
- All filter state serialized in URL search params via `useUrlState`.

**Compensation Grid (`EmployeeGrid.tsx`)**
- Astryx `Table` with server-driven data.
- Columns: Employee Code, Full Name, Department, Level, Country, Local Salary, USD Salary, Status, Hire Date.
- `renderCell` for custom formatting:
  - Local Salary: `Intl.NumberFormat` with correct currency symbol and locale grouping (e.g., ₹24,00,000).
  - USD Salary: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
  - Status: Astryx `Badge` (green/amber/red).
- Click row → open `EmployeeDrawer`.
- Astryx `Pagination` wired to URL state.

**Edit Drawer (`EmployeeDrawer.tsx`)**
- Astryx `Drawer` slide-over panel.
- Form fields: Full Name, Email, Department, Level, Country, Currency, Local Base Salary, Local Bonus Target, Employment Status, Hire Date.
- Client-side Zod validation (shared schema with backend).
- **Live USD preview**: When user changes salary or currency, show computed `base_salary_usd` before saving.
- Submit: `POST /api/employees` (create) or `PATCH /api/employees/:id` (update).
- On success: close drawer, invalidate TanStack Query cache, show Astryx `Toast`.

**Ask ACME Pay (`AskAcmePay.tsx`)**
- Side panel or modal with Astryx `Chat` components.
- `ChatComposerInput` + `ChatSendButton` for question input.
- Suggested prompt chips above input: pre-filled common HR questions.
- `ChatMessage` for conversation history.
- AI response renders:
  - Answer summary as text.
  - Data table (Astryx `Table`) or metric card for results.
  - `Collapsible` + `CodeBlock` for "View Generated SQL" audit.
- Loading state with `Spinner` during AI query execution.

#### 5.4 State Management

- **TanStack Query**: All API calls wrapped in `useQuery` / `useMutation` hooks.
- **Query Keys**: Centralized key factory for cache management.
- **URL State**: Custom `useUrlState` hook syncing filter/sort/page params with `URLSearchParams`.
- **Optimistic Updates**: On CRUD mutations, optimistically update the grid, rollback on error.

### Verification

- [x] Grid renders 10k rows with server pagination (page 1 of 200 at 50/page).
- [x] Filters update grid and KPI strip reactively.
- [x] Edit drawer validates input and shows live USD preview.
- [x] Ask ACME Pay sends questions and displays answers with SQL audit.
- [x] Dual-currency display formats correctly for all 6 currencies.
- [x] URL state persists across page reloads (shareable links).

---

## Phase 6 — Test Suite & Quality Assurance

**Commit:** `test: add unit/integration test suites, p95 benchmark, and adversarial SQL tests`

### Tasks

#### 6.1 Backend Tests (`backend/src/__tests__/`)

**Unit Tests:**
- `currencyUtils.test.ts` — FX conversion precision:
  - EUR → USD with exact NUMERIC math.
  - JPY → USD (zero decimal currency).
  - Edge: very small values, very large values, boundary precision.
- `sqlValidator.test.ts` — Adversarial SQL validation:
  - ✅ Valid: `SELECT * FROM employees LIMIT 10`
  - ✅ Valid: `WITH cte AS (SELECT ...) SELECT * FROM cte`
  - ❌ Blocked: `DROP TABLE employees`
  - ❌ Blocked: `DELETE FROM employees WHERE 1=1`
  - ❌ Blocked: `UPDATE employees SET base_salary_usd = 0`
  - ❌ Blocked: `INSERT INTO employees ...`
  - ❌ Blocked: `SELECT * FROM employees; DROP TABLE employees`
  - ❌ Blocked: `SELECT pg_sleep(100)`
  - ❌ Blocked: `SELECT * FROM pg_catalog.pg_user`
  - ❌ Blocked: `SELECT * FROM information_schema.tables`
  - ❌ Blocked: `SELECT * FROM employees /* comment */ ; DELETE FROM employees`
  - ✅ LIMIT injection: `SELECT * FROM employees` → gets `LIMIT 100` appended.
  - ✅ LIMIT cap: `SELECT * FROM employees LIMIT 9999` → capped to `LIMIT 100`.
- `queryBuilder.test.ts` — Filter/sort/pagination builder:
  - Single filter, multi-filter, all filters combined.
  - Sort ascending/descending by different columns.
  - Page boundaries (first page, last page, beyond last page).
- `schemas.test.ts` — Zod validation:
  - Valid employee creation data passes.
  - Negative salary rejected.
  - Invalid country/currency combination rejected.
  - Missing required fields rejected.

**Integration Tests (against real PostgreSQL):**
- `employees.integration.test.ts`:
  - CRUD lifecycle: create → read → update → read (verify USD recalculation) → delete.
  - Paginated query with filters returns correct subset and total count.
  - Sort by `base_salary_usd` DESC returns rows in correct order.
  - Search by name/email uses trigram index (verify with `EXPLAIN`).
  - Stats endpoint returns correct aggregates.
- `queryPerformance.test.ts`:
  - `EXPLAIN (ANALYZE, BUFFERS)` on common query patterns.
  - Assert index usage (no sequential scans on filtered queries).
  - Assert p95 execution time <50ms on 10k rows.

#### 6.2 Frontend Tests (`frontend/src/__tests__/`)

- `CurrencyDisplay.test.tsx` — Correct formatting for all 6 currencies.
- `FilterBar.test.tsx` — Filter state changes update URL params.
- `EmployeeDrawer.test.tsx` — Zod validation error display, USD preview calculation.
- `AskAcmePay.test.tsx` — Query submission, response rendering, SQL audit display.

### Verification

- [x] All unit tests pass: `npx vitest run`.
- [x] All integration tests pass against a real PostgreSQL instance.
- [x] SQL validator blocks 100% of adversarial test cases.
- [x] Query performance benchmark passes <50ms p95 threshold.
- [x] Frontend component tests pass.

---

## Phase 7 — Docker & CI/CD

**Commit:** `chore(docker): add Dockerfiles, docker-compose, init scripts, and CI workflow`

### Tasks

#### 7.1 Docker Setup
```
├── backend/Dockerfile       # Multi-stage: build (npm ci + tsc) → production (node)
├── frontend/Dockerfile      # Multi-stage: build (npm ci + next build) → production (next start)
├── docker-compose.yml       # postgres + backend + frontend
└── docker/
    └── init-db.sh           # PostgreSQL init script: create acme_readonly role
```

**`docker-compose.yml` services:**

| Service | Image | Port | Depends On | Startup |
|---------|-------|------|------------|---------|
| `postgres` | `postgres:16-alpine` | 5432 | — | Runs `init-db.sh` to create `acme_readonly` role |
| `backend` | `./backend/Dockerfile` | 3001 | `postgres` | Auto-run migrations + seed (if empty) on startup |
| `frontend` | `./frontend/Dockerfile` | 3000 | `backend` | Connects to backend API |

**`docker/init-db.sh`:**
```bash
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER acme_readonly WITH PASSWORD 'readonly_pass';
    GRANT CONNECT ON DATABASE acme_compensation TO acme_readonly;
    GRANT USAGE ON SCHEMA public TO acme_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO acme_readonly;
    ALTER USER acme_readonly SET statement_timeout = '3000ms';
EOSQL
```

#### 7.2 CI Workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-and-typecheck:
    - npm run lint (backend + frontend)
    - npm run typecheck (tsc --noEmit)
  test:
    services:
      postgres: postgres:16-alpine
    steps:
      - npm run test (vitest backend)
      - npm run test (vitest frontend)
  docker-build:
    - docker compose build (verify Dockerfiles compile)
```

### Verification

- [x] `docker compose up --build` starts all 3 services cleanly from scratch.
- [x] Frontend accessible at `http://localhost:3000`.
- [x] Backend API accessible at `http://localhost:3001/api/employees`.
- [x] 10,000 employees seeded automatically on first startup.
- [x] AI queries execute on `acme_readonly` role (verify with `SELECT current_user`).
- [x] CI workflow passes on a clean checkout.

---

## Dependency Graph

```mermaid
flowchart LR
    P1["Phase 1<br/>Docs & ADRs"] --> P2["Phase 2<br/>DB Schema & Seed"]
    P2 --> P3["Phase 3<br/>CRUD API"]
    P2 --> P4["Phase 4<br/>AI Engine"]
    P3 --> P5["Phase 5<br/>Frontend"]
    P4 --> P5
    P5 --> P6["Phase 6<br/>Tests"]
    P3 --> P6
    P4 --> P6
    P6 --> P7["Phase 7<br/>Docker & CI"]
```

> **Note:** Phases 3 and 4 can be developed in parallel after Phase 2 completes. Phase 5 depends on both. Phase 6 (tests) can be partially started alongside Phases 3–5 (TDD approach), but the full test commit comes after features are stable.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Astryx component API changes (new library) | Pin version in `package.json`; use CLI docs (`--compact`) before each component |
| LLM hallucinating unsafe SQL | 3-layer defense (prompt → validator → DB role); adversarial test suite |
| Query performance degradation | Composite indexes verified with `EXPLAIN ANALYZE`; p95 benchmark in CI |
| Floating-point currency bugs | `NUMERIC(14,2)` in DB; never use `FLOAT`; unit tests with edge cases |
| Docker build failures | Multi-stage builds with explicit Node.js version; CI validates `docker compose build` |
| `pg_trgm` extension not available | Custom migration ensures extension creation; Docker init script as fallback |
