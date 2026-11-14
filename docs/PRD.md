# Product Requirements Document (PRD): ACME Compensation Hub

> **Version:** 1.0  
> **Author:** Engineering Team  
> **Date:** 2026-11-13  
> **Status:** Approved for MVP Development

---

## 1. Problem & Goal

### Problem

ACME Corp's HR team currently manages compensation data for **10,000 employees across multiple countries** in disconnected spreadsheets. At this scale, spreadsheets break down:

- **Filtering across regions and levels is slow** — scrolling through 10k rows with manual filters is untenable.
- **Currency differences distort cross-org comparisons** — an ₹24,00,000 INR salary vs. a €85,000 EUR salary cannot be directly compared without FX conversion.
- **Ad-hoc leadership questions require manual pivot tables** — e.g., *"How does median L4 Engineering pay in Germany compare to India?"* takes hours of manual FX conversion and aggregation.

### Goal

Deliver a centralized, **web-based Employee Salary Management System** that enables an HR Manager to:

1. **Inspect** compensation data across all 10,000 global employees with sub-second table responsiveness.
2. **Update** individual employee pay with automatic currency normalization.
3. **Query** compensation data using natural-language analytical questions powered by a safe AI engine.

### Target User Persona

> **HR Manager** — Non-technical or semi-technical operator responsible for reviewing global compensation records, updating individual employee pay, and answering ad-hoc compensation questions for leadership. Does not write SQL. Expects Excel-like filtering speed but with currency-aware global comparisons.

---

## 2. Architecture & Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend Runtime** | Node.js + TypeScript (Fastify) | Type-safe, high-performance HTTP framework with schema-based validation |
| **ORM & Migrations** | Drizzle ORM + drizzle-kit | Type-safe SQL query builder with zero-overhead abstractions and migration tooling |
| **Database** | PostgreSQL 16 | NUMERIC precision for currency, pg_trgm for search, composite indexes for <50ms queries |
| **Frontend Framework** | React 19 + Next.js (App Router) + TypeScript | Server components, streaming, modern React patterns |
| **UI Components** | Meta Astryx (`@astryxdesign/core`) + StyleX | 150+ accessible enterprise primitives including Table, Drawer, and built-in AI Chat |
| **Data Table** | Astryx Table (server-driven) | Multi-column sort, faceted filtering, and offset pagination with `COUNT(*) OVER()` window function |
| **AI Query Engine** | Groq Cloud API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) | Ultra-fast LPU inference (<500ms TTFT), generous free tier, structured JSON mode with deterministic fallback |
| **Validation** | Zod | Runtime schema validation shared between client and server |
| **Testing** | Vitest + @testing-library/react | Fast unit/integration tests with native ESM support |
| **Containerization** | Docker + docker-compose | Single-command reviewer setup: `docker compose up --build` |

---

## 3. In-Scope Features (MVP)

### F1. High-Scale Employee Compensation Grid (10,000+ Records)

**Server-Side Data Operations:**
- Server-driven offset pagination with single-query SQL window function `COUNT(*) OVER()` (chosen over cursor pagination for instant page jumps, exact total record counts, and clean URL bookmarking; sub-50ms p95 on 10k rows with composite B-tree indexes) supporting multi-column sorting (`base_salary_usd`, `name`, `hire_date`).
- Faceted filtering: `country`, `department`, `level`, `employment_status`, salary range slider, and debounced full-text search by name/email/employee code.
- Executive KPI strip above the grid: Total Headcount, Total Annualized Payroll (USD), Median Base Pay (USD), Active Countries — dynamically updated with active filters.

**Dual-Currency Display:**
- Every row displays both **Local Compensation** (e.g., €85,000 EUR, ₹24,00,000 INR — formatted with `Intl.NumberFormat`) and **Normalized USD** ($91,800 USD).
- HR can evaluate individual local offers alongside global apples-to-apples rankings without mental FX math.

### F2. Multi-Country Currency Normalization

**Data Model:**
- `local_currency` — ISO 4217 code (CHAR(3): USD, INR, EUR, GBP, JPY, SGD).
- `local_base_salary` — NUMERIC(14,2) or BIGINT in minor units to avoid floating-point drift.
- `base_salary_usd` — precomputed via a versioned `fx_rates` reference table, stored on the employee record, updated transactionally on write.

**Consistency Guarantee:**
- All cross-country aggregations, sorting, and AI queries operate against `base_salary_usd` by default.
- Local currency precision is preserved for display and audit.
- FX rates are corporate planning rates (quarterly/annual), not live market ticks.

### F3. Employee Record Management (CRUD + Validation)

**Create & Edit Compensation:**
- HR Manager can add a new employee record or update an existing employee's `base_salary`, `bonus_target`, `job_level`, `department`, or `location` via a slide-over drawer.
- Strict Zod schema validation: non-negative salaries, valid ISO currency per country, required fields enforced.
- Live USD conversion preview when editing local currency or salary amount.

**Automatic Recalculation:**
- Updating `local_base_salary` or `country`/`currency` automatically recalculates `base_salary_usd` within the same database transaction.
- KPI strip and grid reflect changes immediately on successful save.

### F4. AI Natural-Language Compensation Assistant ("Ask ACME Pay")

**Natural Language to Structured Query:**
- HR Manager types plain-English questions powered by Groq's high-speed LPU inference running `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` (<500ms TTFT, comfortably executing 20–30+ test queries within free tier limits), e.g.:
  - *"What is the average and p90 USD salary for Senior Engineers in Germany vs. the US?"*
  - *"List the top 10 highest-paid employees in Marketing."*
  - *"Compare median pay for L3 vs L4 across all departments."*

**Safety & Trust Layer (Defense-in-Depth):**

| Layer | Mechanism |
|-------|-----------|
| **1. LLM Output** | Generates a typed JSON response `{ sql, explanation, visualizationType }` constrained to the exact DDL schema |
| **2. AST/Lexer Validator** | Parses SQL and enforces: single SELECT/WITH statement only; rejects INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/COPY/EXECUTE/pg_sleep; whitelists only `employees` and `fx_rates` tables; injects `LIMIT 100` cap |
| **3. Pre-Flight EXPLAIN Cost Gate** | Runs `EXPLAIN (FORMAT JSON)` prior to query execution to verify planner Total Cost < 5,000 budget; rejects runaway Cartesian joins with HTTP 422 before reading any rows |
| **4. DB-Level Isolation** | Executes on a dedicated `acme_readonly` PostgreSQL role with `GRANT SELECT ON employees, fx_rates, salary_revisions` and `statement_timeout = 3000ms` |
| **5. Auditable UI & Telemetry** | Renders answer summary + tabular results + expandable "View Generated SQL" drawer with live Plan Cost badges and Cached pills |

**Fallback Behavior:**
- If no LLM API key is configured, a deterministic keyword-based fallback parser handles common query patterns (top-N, averages, medians by group).

### F5. Bi-Temporal Append-Only Salary Ledger & Optimistic Concurrency Control (OCC)

**Bi-Temporal Immutability:**
- Every compensation update inserts an append-only revision record into `salary_revisions` containing `effective_from`, `effective_to` (`NULL` for current term), snapshot FX rate, local & USD salary, audit reason, and author.
- Prevents destructive in-place salary overwrites, enabling complete point-in-time historical auditability.
- Exposed via `GET /api/employees/:id/revisions` and rendered in the employee slide-over drawer under the "Salary Ledger History" tab.

**Optimistic Concurrency Control (OCC):**
- Added an integer `version` column to `employees`.
- `PATCH /api/employees/:id` requires either a matching payload `version` or standard HTTP `If-Match` header.
- If concurrent administrators modify the same employee, stale writes fail fast with HTTP `409 Conflict` (`CONCURRENT_MODIFICATION`), preventing silent lost updates.

### F6. High-Scale Keyset (Cursor) Pagination & PostgreSQL Covering Indexes

**Sub-5ms Deep Pagination:**
- Replaces traditional $O(N)$ deep offset scans with $O(1)$ cursor pagination using URL-safe Base64 composite tuples `(base_salary_usd, id) < ($1, $2)`.
- Navigating to deep pages (e.g. Page 190 / Row 9,500) executes in **0.03ms** (**269x faster** than OFFSET).

**PostgreSQL Covering Index (`INCLUDE` Clause):**
- Created `idx_employees_covering_grid` on `(base_salary_usd DESC, id DESC)` including all projection columns (`employee_code`, `full_name`, `email`, `department`, `level`, `country`, `local_currency`, `local_base_salary`, etc.).
- Satisfies grid queries directly from the index tree via **Index-Only Scans with 0 heap fetches**.

**Live Query Observability:**
- Backend emits standard RFC 7230 `Server-Timing: db;dur=X.XX;desc="Database", total;dur=Y.YY;desc="Total Roundtrip"` headers.
- UI table footer displays live query telemetry badge (`PostgreSQL 16 · 0.03ms (Index-Only)`).
- Benchmark test script `npm run bench:keyset` programmatically verifies sub-5ms P99 and zero heap fetches.

### F7. Executive Command Palette (`Cmd+K` / `Ctrl+K`) & Semantic Query Cache

**Pre-Flight Cost Guardrails:**
- Enforces a 5,000 cost unit safety budget on all AI Text-to-SQL queries via PostgreSQL `EXPLAIN (FORMAT JSON)`.

**Normalized Semantic LRU Query Cache:**
- Normalizes question strings (lowercasing, whitespace collapse, punctuation removal).
- Caches query plans and results in-memory with a 5-minute TTL, returning repeated leadership questions in **<2ms** with zero LLM token burn and zero database load.

**Keyboard-Driven Command Palette:**
- Accessible globally via `Cmd+K` or `Ctrl+K` (and via sidebar search shortcut).
- Instant execution of top executive compensation queries, filter presets, and section navigation.

---

## 4. Deliberately Out of Scope (and Why)

| Excluded Capability | Reasoning |
|---------------------|-----------|
| **Payroll Execution & Tax Withholding** | Requires country-specific statutory tax engines, banking rails, and compliance certifications. ACME needs compensation *visibility*, not payroll disbursement. |
| **Live Real-Time FX Rate Feeds** | Compensation benchmarking relies on periodic corporate FX planning rates. Intraday market ticks would cause salary metrics to fluctuate daily, undermining deterministic reporting. |
| **RBAC / Multi-Tenant SSO Auth** | The prompt scopes to a single HR Manager role. Full OAuth/RBAC middleware adds boilerplate without demonstrating core compensation modeling or query performance. |
| **Full HRIS Lifecycle (ATS, PTO, Performance Reviews)** | Scope is strictly salary management and pay intelligence. Bundling unrelated HR modules dilutes focus from data scale (10k rows) and analytical querying. |
| **Bulk CSV/Excel Import-Export** | Replaced by a deterministic 10,000-employee seed pipeline so reviewers can immediately test scale and query performance without preparing upload files. |

---

## 5. Non-Functional Requirements & Success Criteria

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Query Latency** | Paginated grid queries (10k rows) return in **<50ms p95** | `EXPLAIN (ANALYZE, BUFFERS)` integration tests assert index usage and timing |
| **Correctness** | Zero floating-point currency rounding bugs | Unit tests with known FX edge cases (JPY zero-decimal, sub-cent conversions) |
| **AI Safety** | 100% rejection of mutating SQL | Adversarial test suite: SQL injection, CTE mutation, DROP TABLE, system catalog access, multi-statement smuggling, missing LIMIT |
| **Seed Determinism** | Identical data across runs with same seed | Seeded PRNG (`faker.seed(42)`), idempotent inserts |
| **Seed Speed** | 10,000 rows in **<2 seconds** | Batched inserts (1,000/batch) in a single transaction |
| **Docker "Just Works"** | `docker compose up --build` → full working app | CI validates clean build from scratch |
| **Test Coverage** | Currency math, filter/pagination builders, SQL validator, CRUD endpoints | Vitest unit + integration suites |
| **Commit Hygiene** | Incremental, atomic, conventional commits | PRD → Schema → Seed → API → UI → AI → Tests → Docker |

---

## 6. Data Model Summary

### `employees` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key |
| `employee_code` | VARCHAR(10) | Human-readable ID (e.g., `ACME-0001`) |
| `full_name` | VARCHAR(100) | Employee full name |
| `email` | VARCHAR(150) | Corporate email |
| `department` | VARCHAR(50) | Engineering, Product, Design, Sales, Operations, People |
| `level` | VARCHAR(5) | L1–L6 |
| `country` | CHAR(2) | ISO 3166-1 alpha-2 (US, IN, DE, GB, SG, JP) |
| `local_currency` | CHAR(3) | ISO 4217 (USD, INR, EUR, GBP, SGD, JPY) |
| `local_base_salary` | NUMERIC(14,2) | Base salary in local currency |
| `local_bonus_target` | NUMERIC(14,2) | Bonus target in local currency |
| `base_salary_usd` | NUMERIC(14,2) | Precomputed normalized USD salary |
| `bonus_target_usd` | NUMERIC(14,2) | Precomputed normalized USD bonus |
| `employment_status` | VARCHAR(10) | active, inactive, terminated |
| `hire_date` | DATE | Employee start date |
| `version` | INTEGER | Optimistic Concurrency Control (OCC) counter |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

### `salary_revisions` Table (Bi-Temporal Ledger)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key |
| `employee_id` | UUID (FK) | Reference to `employees.id` (ON DELETE CASCADE) |
| `effective_from` | TIMESTAMPTZ | Revision validity period start |
| `effective_to` | TIMESTAMPTZ | Revision validity period end (NULL = currently active) |
| `local_base_salary` | NUMERIC(14,2) | Local currency base salary |
| `local_bonus_target` | NUMERIC(14,2) | Local currency bonus target |
| `local_currency` | CHAR(3) | ISO 4217 currency code |
| `fx_rate_snapshot` | NUMERIC(12,6) | Point-in-time FX conversion rate |
| `base_salary_usd` | NUMERIC(14,2) | Normalized USD base salary |
| `bonus_target_usd` | NUMERIC(14,2) | Normalized USD bonus target |
| `reason` | VARCHAR(255) | Change reason (e.g. Merit Review, Promotion) |
| `changed_by` | VARCHAR(255) | Modifying user or system |
| `created_at` | TIMESTAMPTZ | Timestamp of record creation |

### `fx_rates` Table

| Column | Type | Description |
|--------|------|-------------|
| `currency_code` | CHAR(3) (PK) | ISO 4217 code |
| `rate_to_usd` | NUMERIC(12,6) | Conversion multiplier to USD |
| `effective_date` | DATE | Rate effective date |

### Key Indexes

```
idx_employees_covering_grid        ON (base_salary_usd DESC, id DESC) INCLUDE (all projection columns)
idx_employees_dept_level_salary    ON (department, level, base_salary_usd DESC)
idx_employees_country_salary       ON (country, base_salary_usd DESC)
idx_employees_status_hire_date     ON (employment_status, hire_date DESC)
idx_employees_search_trgm          GIN(full_name gin_trgm_ops, email gin_trgm_ops)
idx_salary_revisions_emp_dates     ON (employee_id, effective_from, effective_to)
idx_salary_revisions_timeline      ON (effective_from, effective_to)
```

---

## 7. Suggested Commit Progression

| Commit | Conventional Prefix | Scope |
|--------|---------------------|-------|
| 1 | `docs:` | PRD, ARCHITECTURE.md, ADRs 001–004, directory scaffold |
| 2 | `feat(db):` | Drizzle schema, composite/GIN indexes, 10k employee seeder |
| 3 | `feat(api):` | Paginated employee search, filters, aggregations, CRUD endpoints |
| 4 | `feat(ai):` | Guarded NL-to-SQL query engine with read-only DB isolation |
| 5 | `feat(ui):` | Compensation grid, edit drawer, KPI strip, Ask ACME Pay chat |
| 6 | `test:` | Unit/integration test suites, p95 benchmark, adversarial SQL tests |
| 7 | `chore(docker):` | Dockerfiles, docker-compose, CI workflow |
