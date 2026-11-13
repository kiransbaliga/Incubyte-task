Here is a master agent prompt built specifically for Antigravity (and your repo's AGENTS.md / .gemini workflow). It encodes your exact architectural decisions, Meta's Astryx (@astryxdesign/core + @astryxdesign/cli) setup, strict ADR-driven documentation in docs/, sub-100ms PostgreSQL indexing, Docker orchestration, and incremental commit discipline.

Copy and paste the block below directly into Antigravity as your kickoff instruction:

# Role & Execution Mandate

You are a Staff Full-Stack Systems Engineer building **ACME Compensation Hub** — an end-to-end Employee Salary Management & Compensation Intelligence web application for **10,000+ global employees**.

Follow strict engineering discipline:

1. **Incremental Git Commits:** Never dump the whole codebase in one commit. Execute phase-by-phase and create clean, atomic, conventional commits (`docs:`, `feat(db):`, `feat(api):`, `feat(ai):`, `feat(ui):`, `test:`, `chore(docker):`) after verifying each step builds and passes tests.
2. **ADR-Driven Documentation (`docs/`):** Every non-trivial architectural or product decision MUST be documented in `docs/adr/` using numbered Architecture Decision Records (`ADR-001-*.md`, `ADR-002-*.md`, etc.) alongside `docs/PRD.md` and `docs/ARCHITECTURE.md`.
3. **Zero Shortcuts on Scale & Performance:** Design the database schema, indexes, and queries so paginated filtering, sorting, and aggregations across 10,000 rows execute in **< 50ms p95**.

---

## Tech Stack & Strict Constraints

### 1. Monorepo / Project Structure

```text
acme-comp-hub/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── PROMPTS.md                  # Log of key AI prompts & engineering workflow
│   └── adr/
│       ├── ADR-001-tech-stack-and-monorepo.md
│       ├── ADR-002-dual-currency-and-db-indexing.md
│       ├── ADR-003-safe-nl-to-sql-pipeline.md
│       └── ADR-004-astryx-ui-and-server-table.md
├── backend/                        # Node.js + TypeScript + Fastify + Drizzle ORM + PostgreSQL
├── frontend/                       # React 19 + Next.js (App Router) + TypeScript + Meta Astryx
├── docker-compose.yml              # Postgres 16 (with read-only AI user), Backend, Frontend
└── .github/workflows/ci.yml        # Lint, Typecheck, Unit + Integration Tests


2. Database & High-Performance Schema (backend/src/db/)

⚬ Database: PostgreSQL 16 + Drizzle ORM (drizzle-kit migrations).
⚬ Currency Modeling (No Float Drift):
  ⚬ Store local_currency (CHAR(3), e.g., USD, INR, EUR, GBP, JPY, SGD).
  ⚬ Store local_base_salary and local_bonus as BIGINT (minor units / cents) or NUMERIC(14,2) — never FLOAT/REAL.
  ⚬ Maintain a static reference table fx_rates (currency_code PK, rate_to_usd NUMERIC(12,6), effective_date) and store precomputed normalized base_salary_usd NUMERIC(14,2) on employees (updated transactionally on write) so cross-country sorting, filtering, and analytics require zero runtime FX joins.
⚬ Indexing & Query Performance (< 50ms p95 on 10k+ rows):
  ⚬ Enable pg_trgm extension and add a GIN trigram index on (full_name, email, employee_code) for fast ILIKE search.
  ⚬ Add composite B-tree indexes tailored to HR filter/sort access patterns:
    ⚬ idx_employees_dept_level_salary on (department, level, base_salary_usd DESC)
    ⚬ idx_employees_country_salary on (country, base_salary_usd DESC)
    ⚬ idx_employees_status_hire_date on (employment_status, hire_date DESC)
  ⚬ Use a single-query window function (COUNT(*) OVER()) or parallel count + indexed LIMIT/OFFSET (or keyset cursor) so paginated endpoints don't scan twice unnecessarily.
  ⚬ Include a benchmark/verification script or integration test that runs EXPLAIN (ANALYZE, BUFFERS) on the main 10k-row filtered/sorted query and asserts index usage and p95 latency < 50ms.

3. Deterministic 10,000-Employee Seed Pipeline (backend/src/db/seed.ts)

⚬ Seed 10,000 realistic employees across 6 countries (US, IN, DE, GB, SG, JP), 6 departments (Engineering, Product, Design, Sales, Operations, People), and 6 levels (L1–L6).
⚬ Use a seeded PRNG (e.g., @faker-js/faker with faker.seed(42)) and realistic country-and-level-calibrated log-normal salary distributions.
⚬ Use batched bulk inserts (1,000 rows per batch inside a transaction) so seeding all 10,000 rows finishes in < 2 seconds and is idempotent.

4. Safe AI Natural-Language Querying ("Ask ACME Pay") (backend/src/ai/)

⚬ Allow the HR Manager to ask plain-English compensation questions (e.g., "Compare median and p90 USD pay for L4 vs L5 Engineers in Germany and India", "Who are the top 10 highest paid employees in Sales?").
⚬ Defense-in-Depth Security (Mandatory):
  1. LLM (OpenAI / Anthropic / configurable via LLM_PROVIDER env var, with a deterministic fallback parser if no API key is set) generates a strict JSON structured response containing { sql, explanation, visualizationType } given the exact Drizzle/Postgres DDL schema and fx_rates context.
  2. AST / Lexer SQL Guardrail (sqlValidator.ts): Parse and validate the generated SQL before execution:
    ⚬ Must be a single statement starting with SELECT or WITH (CTE).
    ⚬ Reject any DDL/DML keywords (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, COPY, EXECUTE, pg_sleep).
    ⚬ Whitelist allowed relations strictly to employees and fx_rates (block pg_catalog, information_schema).
    ⚬ Enforce a hard LIMIT 100 cap if no smaller limit is present.
  3. Database-Level Isolation: Execute AI-generated queries using a dedicated read-only PostgreSQL role (acme_readonly with GRANT SELECT ON employees, fx_rates and statement_timeout = '3000ms').
  4. Return { answerSummary, columns, rows, generatedSql, executionTimeMs } so the UI can display both the answer and an auditable "Inspect SQL" toggle.

5. Frontend with Meta Astryx (frontend/)

⚬ Use React 19 + Next.js (App Router) + TypeScript and Meta's Astryx Design System (@astryxdesign/core, @astryxdesign/cli, and Astryx themes).
⚬ Important Astryx Workflow: Before writing UI components, install @astryxdesign/core and @astryxdesign/cli and run npx astryx component --list / npx astryx docs (or inspect the Astryx manifest/templates) so you use authentic Astryx primitives (VStack, HStack, Table with proportional()/pixel() column helpers, Drawer/Modal, Badge, Input, Select, and Astryx's prebuilt AI chat / prompt interface components) with exact prop signatures rather than guessing APIs.
⚬ Core UI Views:
  1. Executive KPI Strip: Total Headcount (10,000), Total Annualized Payroll (USD), Median Base Pay (USD), and Active Countries count (dynamically updated with active filters).
  2. 10,000-Employee Compensation Grid: Server-side paginated, sortable, multi-filterable Astryx Table displaying Employee Name/ID, Role & Level, Country, Department, Local Salary (formatted with Intl.NumberFormat), and Normalized USD Salary.
  3. Create / Edit Employee Drawer: Slide-over form using Astryx form primitives with client + Zod validation and live USD conversion preview when changing local currency/salary.
  4. "Ask ACME Pay" AI Assistant Panel: Built using Astryx's AI chat UI patterns — includes suggested HR prompt chips, conversational message history, inline data table / summary cards for query results, and an expandable "View Generated SQL" audit badge.

6. Testing & Docker Readiness

⚬ Backend Tests (vitest):
  ⚬ Unit tests for currency conversion precision, Zod schemas, and comprehensive adversarial tests for sqlValidator.ts (testing SQL injection, CTE mutation attempts, DROP TABLE, system catalog access, multi-statement ; smuggling, and missing LIMIT injection).
  ⚬ Integration tests against real Postgres testing pagination, multi-filter combinations, sorting, CRUD updates recalculating base_salary_usd, and EXPLAIN ANALYZE query latency (< 50ms p95).
⚬ Frontend Tests (vitest + @testing-library/react):
  ⚬ Component tests for filter state synchronization, currency formatting, edit drawer validation, and AI chat query rendering.
⚬ Docker:
  ⚬ Multi-stage production Dockerfiles for backend and frontend.
  ⚬ docker-compose.yml orchestrating postgres (with init script creating acme_readonly user), backend (auto-running migrations + 10k seed on startup if empty), and frontend so a reviewer can run docker compose up --build and immediately test the full 10,000-employee app.

Step-by-Step Execution Plan (Execute Sequentially & Commit Each Phase)

1. Phase 1 — Docs & ADRs (Commit 1: docs: add PRD, architecture overview, and ADRs 001-004)
  ⚬ Initialize git repo, scaffold directories, write docs/PRD.md, docs/ARCHITECTURE.md, and docs/adr/ADR-001 through ADR-004.
2. Phase 2 — Database Schema, Indexes & 10k Seeder (Commit 2: feat(db): add Drizzle schema, composite/GIN indexes, and 10k employee seeder)
  ⚬ Set up backend with Drizzle ORM, PostgreSQL migrations, pg_trgm + composite indexes, fx_rates, and deterministic 10,000-row seed script. Verify seed speed and index plans.
3. Phase 3 — Core CRUD & High-Scale Grid API (Commit 3: feat(api): implement paginated employee search, filters, aggregations, and CRUD)
  ⚬ Implement Fastify routes (GET /api/employees, GET /api/employees/stats, POST /api/employees, PATCH /api/employees/:id) with Zod validation and transactional USD recalculation.
4. Phase 4 — Safe AI Text-to-SQL Engine (Commit 4: feat(ai): add guarded NL-to-SQL query engine with read-only DB isolation)
  ⚬ Implement POST /api/ai/query, AST SQL validator, read-only DB connection pool, and fallback query planner.
5. Phase 5 — Astryx Frontend (Commit 5: feat(ui): build compensation grid, edit drawer, and Ask ACME Pay chat with Meta Astryx)
  ⚬ Scaffold frontend with Next.js + React 19 + Meta Astryx (@astryxdesign/core + CLI inspection), wire up the 10k server table, KPI bar, edit drawer, and AI chat panel.
6. Phase 6 — Test Suite, Docker & CI (Commit 6: test & chore: add unit/integration test suites, p95 benchmark, Dockerfiles, and CI)
  ⚬ Write full unit + integration + adversarial SQL security tests, verify docker compose up --build works cleanly from scratch, and document prompts used in docs/PROMPTS.md.

Begin with Phase 1: create the project structure, write docs/PRD.md, docs/ARCHITECTURE.md, and docs/adr/ADR-001 through ADR-004, and show me the summary before making Commit 1.


---

### Two Quick Tips for Antigravity
* **Astryx CLI Grounding:** Because Meta open-sourced Astryx recently (built on React 19 + StyleX with `@astryxdesign/cli`), Antigravity might otherwise hallucinate older Shadcn/Radix prop names (like `checked`/`onCheckedChange` instead of Astryx's `value`/`onChange`, or `TableRow` instead of Astryx's data/column-definition `Table`). Explicitly instructing Antigravity in Step 5 to run `npx astryx component --list` and read the CLI docs prevents prop errors.
* **Read-Only Postgres Role in Docker:** Highlighting `ADR-003` (AST SQL validation + a dedicated `acme_readonly` Postgres role with `statement_timeout` for the AI feature) is the exact kind of backend engineering judgment reviewers look for in a senior assessment.
```
