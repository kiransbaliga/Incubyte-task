# Implementation Plan: Core System Capabilities (Features 1, 2, and 3)

## Overview
Transform the ACME Compensation Hub from a standard CRUD application into a high-concurrency, scale-resilient, enterprise financial intelligence platform. This plan implements three architectural pillars:
1. **Bi-Temporal Append-Only Salary Ledger + Optimistic Concurrency Control (OCC)**: Prevents lost updates via `version` column and HTTP 409 Conflict, while maintaining an immutable historical revision audit trail with point-in-time querying.
2. **Keyset (Cursor) Pagination + Covering Indexes + Query Telemetry**: Replaces $O(N)$ `OFFSET` degradation with $O(1)$ composite keyset pagination, PostgreSQL `INCLUDE` covering indexes for zero-heap-fetch index-only scans (<4ms), and RFC `Server-Timing` headers.
3. **Deterministic AI Query Pipeline with Pre-Flight `EXPLAIN` Cost Gate & Cache**: Protects the database kernel from computationally unbounded LLM queries using PostgreSQL planner cost estimation circuit-breakers, combined with a normalized query cache.

---

## Architecture Decisions & Data Model Changes

### 1. Bi-Temporal Schema & Concurrency (Feature 1)
- **`employees` Table Modification**:
  - Add `version integer not null default 1`.
- **New `salary_revisions` Table**:
  - `id`: UUID primary key.
  - `employee_id`: UUID foreign key to `employees.id` with `ON DELETE CASCADE`.
  - `effective_from`: `timestamp with time zone not null default now()`.
  - `effective_to`: `timestamp with time zone null` (`null` signifies current active term).
  - `local_base_salary`: `numeric(14, 2) not null`.
  - `local_bonus_target`: `numeric(14, 2) not null default 0`.
  - `local_currency`: `varchar(3) not null`.
  - `fx_rate_snapshot`: `numeric(12, 6) not null`.
  - `base_salary_usd`: `numeric(14, 2) not null`.
  - `bonus_target_usd`: `numeric(14, 2) not null default 0`.
  - `reason`: `varchar(255) not null default 'Merit Adjustment'`.
  - `changed_by`: `varchar(255) not null default 'system'`.
  - `created_at`: `timestamp with time zone not null default now()`.
  - Composite Index: `(employee_id, effective_from, effective_to)`.
- **Concurrency Contract**:
  - `PATCH /api/employees/:id`:
    - Requires `version: number` in request payload.
    - Inside a single PostgreSQL transaction (`tx`):
      1. `SELECT version, ... FROM employees WHERE id = :id FOR UPDATE`.
      2. If `db_version !== input_version`: return `409 Conflict` with `{ error: 'CONCURRENT_MODIFICATION', currentVersion, latestData }`.
      3. Close active revision: `UPDATE salary_revisions SET effective_to = now() WHERE employee_id = :id AND effective_to IS NULL`.
      4. Insert new revision: `INSERT INTO salary_revisions (...) VALUES (...)`.
      5. Update employee: `UPDATE employees SET base_salary_usd = ..., version = version + 1 WHERE id = :id`.

### 2. Database Index-Only Scans & Keyset Pagination (Feature 2)
- **Covering Index (`INCLUDE`)**:
  - `CREATE INDEX idx_employees_covering_grid ON employees (department, level, base_salary_usd DESC, id DESC) INCLUDE (full_name, email, country, local_currency, local_base_salary, local_bonus_target, bonus_target_usd, employment_status, employee_code, version);`
- **Cursor Structure**:
  - Opaque Base64 string encoding `{ v: number /* salary */, id: string, dir: 'next' | 'prev' }`.
  - Query predicate: `WHERE (base_salary_usd, id) < (:cursorVal, :cursorId) ORDER BY base_salary_usd DESC, id DESC LIMIT :pageSize + 1`.
- **Query Telemetry**:
  - Fastify `onResponse` hook sets `Server-Timing: db;dur=3.4;desc="DB Query Execution", total;dur=5.2`.
  - Response JSON returns `meta: { executionMs: number, scanType: 'index-only', nextCursor: string | null, prevCursor: string | null }`.

### 3. AI Safety: Pre-Flight `EXPLAIN` Cost Gate (Feature 3)
- **Circuit Breaker Rule**:
  - Max Total Cost Threshold: `5,000` units.
  - Prohibited Plan Nodes: Unbounded Cartesian `Nested Loop` with 0 join filter conditions.
- **Workflow**:
  - Client sends natural language prompt -> LLM produces SQL -> AST validation passes -> Fastify runs `EXPLAIN (FORMAT JSON) <query>` using `acme_readonly` connection.
  - If `Total Cost > 5000`: Intercept query, block execution, return HTTP `422 Unprocessable Entity` with `{ error: 'QUERY_COST_EXCEEDED', planCost, maxAllowed: 5000 }`.
  - If valid: Execute query, cache normalized result in in-memory LRU cache (`ttl: 10m`).

---

## Task Breakdown & Dependencies

```
[Phase 1: Feature 1] Schema & Seed -> OCC Patch Endpoint -> Timeline Query -> UI Conflict Dialog
       │
[Phase 2: Feature 2] Covering Index -> Keyset Query Builder -> Server-Timing -> UI Perf Badge & Benchmark
       │
[Phase 3: Feature 3] EXPLAIN Cost Evaluator -> LRU Cache -> AI Pipeline Wiring -> UI Audit Badges
```

### Phase 1: Bi-Temporal Append-Only Ledger & Optimistic Locking (Feature 1)
- **Task 1.1: Database Schema & Migration for `salary_revisions` and `employees.version`**
  - Define `salary_revisions` table in `backend/src/db/schema.ts`.
  - Add `version: integer('version').notNull().default(1)` to `employees`.
  - Write migration script `backend/src/db/migrations/0002_salary_revisions.sql` and run it.
  - Update `seed.ts` to deterministically insert initial revision rows for all 10,000 employees with `effective_from = '2024-01-01'`.
- **Task 1.2: Atomic Revision Mutation & OCC Handler (`PATCH /api/employees/:id`)**
  - Implement OCC version check in `backend/src/routes/employees.ts`.
  - Wrap revision closeout, new revision insert, and employee update in a single transaction.
  - Return HTTP 409 Conflict when version mismatch occurs.
  - Add unit and integration tests in `backend/src/__tests__/concurrency.test.ts`.
- **Task 1.3: Point-in-Time History Query Endpoint (`GET /api/employees/:id/revisions`)**
  - Implement endpoint returning historical compensation timeline for an employee.
  - Support date range filtering (`asOfDate`).
- **Task 1.4: Frontend UI Integration for OCC & Revision Timeline**
  - Update `frontend/src/lib/types.ts` and `api.ts` to handle `version` and 409 Conflict.
  - In `EmployeeDrawer.tsx`: Include revision history timeline view tab showing previous salaries, FX rates, dates, and reasons.
  - Add concurrent conflict modal allowing the user to reload the latest record if modified concurrently.

### Phase 2: Keyset Pagination, Covering Indexes & Telemetry (Feature 2)
- **Task 2.1: PostgreSQL Covering Indexes with `INCLUDE` Clauses**
  - Add migration creating `idx_employees_covering_grid` and `idx_employees_salary_keyset`.
  - Verify with PostgreSQL `pg_indexes` that indexes are active.
- **Task 2.2: Composite Keyset Cursor Query Builder & Endpoint**
  - Implement cursor encode/decode utility (`cursor.ts`).
  - Add keyset pagination logic to `backend/src/db/queryBuilder.ts`:
    `WHERE (base_salary_usd, id) < (cursorVal, cursorId)` for DESC sorting.
  - Update `GET /api/employees` to support `?cursor=<base64>` alongside standard paging.
- **Task 2.3: Fastify `Server-Timing` Middleware & Telemetry Meta**
  - Measure high-resolution DB query time via `process.hrtime.bigint()`.
  - Inject RFC 7230 `Server-Timing` headers on HTTP responses.
  - Return `{ meta: { executionMs, scanType: 'index-only', count } }` in responses.
- **Task 2.4: Verification Benchmark Script (`npm run bench:keyset`)**
  - Create `backend/scripts/benchmark-keyset.ts` that runs `EXPLAIN (ANALYZE, BUFFERS)` comparing page 1 vs page 200 (OFFSET vs Keyset).
  - Print execution metrics table proving zero heap fetches and sub-4ms execution.
- **Task 2.5: Frontend Keyset Integration & Telemetry Badge**
  - Update `EmployeeGrid.tsx` with subtle live performance pill: `PostgreSQL 16 · 3.2ms (Index-Only)`.
  - Wire smooth cursor navigation.

### Phase 3: AI Pipeline Pre-Flight `EXPLAIN` Cost Gate & Semantic Cache (Feature 3)
- **Task 3.1: Pre-Flight `EXPLAIN (FORMAT JSON)` Cost Evaluator**
  - Create `backend/src/ai/queryCostEvaluator.ts`.
  - Execute `EXPLAIN (FORMAT JSON) <sql>` with 500ms timeout on read-only connection.
  - Parse `Plan['Total Cost']` and detect dangerous unbounded nested loops.
  - Reject queries exceeding cost threshold `5000` with descriptive error.
- **Task 3.2: Normalized SQL LRU Query Cache**
  - Implement `backend/src/ai/queryCache.ts` using an LRU cache with TTL.
  - Cache repeated leadership questions (e.g. "Top 10 highest paid in Engineering").
  - Return `{ cached: true, executionMs: 0.8 }` on cache hits.
- **Task 3.3: AI Pipeline Integration & Safety Unit Tests**
  - Integrate Cost Evaluator and Cache into `backend/src/ai/queryEngine.ts`.
  - Write test suite in `backend/src/__tests__/aiCostGate.test.ts` verifying that malicious/expensive queries (e.g. cartesian products) are rejected before execution.
- **Task 3.4: Frontend Astryx Audit Display & Command Palette (Cmd+K)**
  - In `DedicatedChatView.tsx`, display `Plan Cost: 48.2 (Budget: 5,000)` and `Cached (0.8ms)` badges in the AST Audit drawer.
  - Add quick keyboard shortcut (`Cmd+K`) to trigger instant preset compensation prompts.

---

## Checkpoints & Verification
1. **Checkpoint 1 (After Phase 1)**: Concurrency Vitest tests pass with parallel simulated writes; 409 Conflict triggers reliably; salary revision history is append-only.
2. **Checkpoint 2 (After Phase 2)**: `npm run bench:keyset` verifies `Index Only Scan` with `Heap Fetches: 0` and <5ms response on page 200; `Server-Timing` header verified via curl.
3. **Checkpoint 3 (After Phase 3)**: Expensive queries fail the pre-flight EXPLAIN gate with 422; cached queries return in <2ms; full Vitest suite passing with >140 tests.
