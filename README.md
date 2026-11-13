# ACME Compensation Hub

Global Employee Salary Management & Workforce Intelligence Web Application for 10,000+ global personnel across 6 countries (US, DE, GB, IN, SG, JP).

Built with **Fastify**, **TypeScript**, **Drizzle ORM**, **PostgreSQL 16**, **Next.js 15 (React 19)**, and **Meta Astryx Design System**, featuring an **Executive Bento Grid Architecture**, a **Persistent AI Compensation Copilot** ("Ask ACME Pay"), a **Multi-Theme Engine**, and a **5-Step Interactive Guided Tour**.

---

## Architecture & System Design

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Meta Astryx Frontend UI                                   │
│   Next.js 15 (React 19) • TanStack Query • Meta Astryx Ecosystem                       │
│                                                                                        │
│   ┌──────────────────────────────────────────────┐  ┌────────────────────────────────┐ │
│   │ Bento Grid Executive Intelligence            │  │ Persistent AI Copilot Side     │ │
│   │ - Workforce Pulse (10k Pax, $980M Spend)     │  │   Panel (Always Open)          │ │
│   │ - Live FX Normalization Calculator           │  │ - Groq (openai/gpt-oss-120b)   │ │
│   │ - Click-to-Filter Department Spend Matrix    │  │ - Single-Employee Spotlight    │ │
│   │ - Click-to-Filter Regional Benchmarks        │  │ - AST SQL Audit Latency Drawer │ │
│   │                                              │  │ - Quick Prompt Chips           │ │
│   │ 10,000-Record Live Workforce Data Grid       │  └────────────────────────────────┘ │
│   │ - Avatars, Monospace Codes, Country Flags    │                                     │
│   │ - Dual Currency & Target Bonus Columns       │  ┌────────────────────────────────┐ │
│   │ - Slide-Over Edit Drawer with Live USD       │  │ Astryx Multi-Theme System      │ │
│   │ - Guided 5-Step Onboarding Product Tour      │  │ Stone, Neutral, Choc, Matcha   │ │
│   └──────────────────────────────────────────────┘  └────────────────────────────────┘ │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / REST
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                              Fastify Backend API Server                                │
│   TypeScript • Zod Validation • Currency Math • Query Builder Engine                   │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│   "Ask ACME Pay" AI Engine                │   Hot-Swappable LLM Strategy Pattern:      │
│   - Strategy Pattern                      │   - Groq Cloud (openai/gpt-oss-120b)       │
│   - 3-Layer AST SQL Security Guardrail    │   - OpenAI (gpt-4o-mini)                   │
│   - Individual & Aggregation Query Router │   - Offline Rule-Based Matcher             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Drizzle ORM
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                              PostgreSQL 16 Database                                    │
│   - 10,000+ Deterministically Seeded Employees                                         │
│   - Composite B-Tree Indexes on (dept, level, base_salary_usd:desc)                    │
│   - GIN Trigram Index on (full_name, email) for fuzzy search                           │
│   - Precomputed base_salary_usd for sub-20ms sorting & filtering                       │
│   - Dedicated `acme_readonly` Role with 3000ms statement timeout                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Enterprise Left Navigation & Dashboard Layout
* **Left Navigation Sidebar with Tree Structure:** Clean, modern tree navigation featuring expandable sub-filters (`All 10,000 Employees`, `Active Personnel (99.4%)`, `Department Spend`, `Regional Benchmarks`), dedicated routes for `Ask ACME Pay` Copilot, `Executive Analytics`, and `FX Normalization`, plus a permanent indicator confirming PostgreSQL 16 read-only security and Neutral Quiet Grays theme lock.
* **Workforce Pulse & Stat Cards:** Real-time monitoring of 10,000 personnel ($99.4\%$ active rate), $\$980,978,182.55$ normalized USD annualized spend, $\$85,225.50$ median base pay, and active entities ($6/6$) with multi-colored segmented progress bars and status distribution indicators.
* **Period & Status Tabs:** Instant slicing between `All 10,000`, `Active (99.4%)`, `Inactive`, `Terminated`, and `USD Normalized` without full page reload.

### 2. Specialized Dedicated AI Compensation Copilot ("Ask ACME Pay")
* **Dedicated Full-Page Assistant:** Specialized executive AI Assistant view powered by Groq (`openai/gpt-oss-120b`) with hot-swappable LLM strategies and offline rule-based fallback.
* **Single-Employee Spotlight Card:** Queries targeting specific personnel (e.g., *"What is the salary of Magnus Davis?"*) display an executive profile card featuring the employee's initialed avatar, full name, code (`ACME-01964`), department, level, country flag, USD base salary, and local currency amount.
* **Multi-Row Table Mode:** Aggregations and comparative queries render compact Astryx tables with tabular USD currency formatting.
* **AST SQL Audit Drawer:** Collapsible drawer exposing the validated read-only SQL query and execution latency ($11\text{ms}$).
* **3-Layer Defense-in-Depth Safety:**
  1. System prompt constraints (SELECT-only on `employees` and `fx_rates`, LIMIT 100).
  2. AST / Lexer keyword validator blocking mutations (INSERT, UPDATE, DELETE, DROP, ALTER, EXEC), nested comments, and multi-statement injection.
  3. Dedicated `acme_readonly` DB connection role enforcing read-only permissions and a 3-second statement timeout at the database kernel level.

### 3. High-Scale Workforce Data Grid (10,000+ Records)
* **Sub-20ms P99 Latency:** Composite B-tree indexes and single-pass pagination with `COUNT(*) OVER()`.
* **Enterprise Styling:** Circular user avatars with extracted initials, monospace `ACME-XXXXX` codes, national flag emojis, tiered department/level tags, and status pills.
* **Dual Currency Columns:** Formatted local compensation paired with normalized USD base pay and target bonus.
* **Employee Management:** Slide-over drawer with Zod validation and live USD conversion preview.

### 4. Locked Neutral Quiet Grays Enterprise Theme
* **Locked Theme Engine:** Permanently locked to Meta Astryx **Neutral (Quiet Grays)** in Light Mode (`@astryxdesign/theme-neutral`).
* **Clean & Professional:** Strict, high-contrast monochrome enterprise palette with no user-facing switchers or distractions, adhering strictly to enterprise financial dashboard standards.

### 5. Dynamic Element-Anchored Guided Tour
* **Interactive Spotlight Focus:** 6-step guided tour that dynamically computes DOM bounding rectangles (`getBoundingClientRect`), rendering a glowing spotlight cutout directly over the target element while dimming the surrounding UI.
* **Anchored Action Callouts:** High-contrast callout popovers anchored directly adjacent to target elements with directional indicators, step progress dots, keyboard shortcuts (`ArrowLeft`, `ArrowRight`, `Escape`), and explicit action guidance (`nav-compensation`, `nav-ai-chat`, `period-tabs`, `personnel-card`, `filter-toolbar`, `add-employee-btn`).

---

## Quickstart

### Option 1: Docker Compose (One-Command Setup)

```bash
# Clone and launch all services (PostgreSQL, Backend, Frontend)
docker compose up --build
```
- Frontend: `http://localhost:3002` (or mapped port `3000`)
- Backend API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

### Option 2: Local Development

#### Prerequisites
- Node.js 22+
- PostgreSQL running locally (or via Docker)

#### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

#### 2. Backend Setup & Seeding
```bash
cd backend
npm install
npm run db:migrate   # Applies Drizzle migrations
npm run db:seed      # Seeds 10,000 global employee records deterministically
npm run test         # Runs 126 unit & integration tests
npm run dev          # Starts Fastify dev server on port 3001
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build        # Typechecks and verifies static pages
npm run dev          # Starts Next.js dev server on port 3002
```

---

## Environment Variables

### Backend (`backend/.env`)
```bash
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://acme_admin:acme_secret@localhost:5432/acme_compensation
READONLY_DATABASE_URL=postgresql://acme_readonly:readonly_secret@localhost:5432/acme_compensation

# Hot-Swappable LLM Strategy: "groq" or "openai"
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Test Suite & Verification

The backend test suite covers 126 test cases across 7 test suites:
```bash
cd backend && npm test
```
- `currencyUtils.test.ts` (19 tests): Floating-point drift prevention, corporate planning rate conversions, multi-locale currency formatting.
- `schemas.test.ts` (26 tests): Zod validation for employee CRUD and pagination query bounds.
- `sqlValidator.test.ts` (44 tests): Adversarial test suite asserting rejection of DDL/DML, multi-statement injection, and comment bypasses.
- `queryBuilder.test.ts` (17 tests): SQL AST condition builder with sorting and multi-field filters.
- `api.test.ts` (8 tests): Employee CRUD endpoints, pagination consistency, and stats aggregations.
- `aiApi.test.ts` (3 tests): Safe AI query endpoint with adversarial mutation blocking and schema response verification.
- `queryEngine.test.ts` (9 tests): End-to-end execution of AI queries with database integration and fallback handling.

---

## Project Structure

```
Incubyte/
├── backend/
│   ├── src/
│   │   ├── ai/              # Hot-swappable LLM Strategy, AST SQL Validator, Prompt
│   │   ├── api/             # Fastify REST endpoints (employees, fx-rates, ai)
│   │   ├── db/              # Drizzle schema, composite indexes, 10k seeder
│   │   ├── lib/             # Currency math, query builder
│   │   └── server.ts        # Fastify app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (layout, page, providers)
│   │   ├── components/      # Meta Astryx & Bento components
│   │   │   ├── BentoDashboard.tsx          # 12-col Bento Grid container
│   │   │   ├── BentoExecutivePulse.tsx     # Headcount, spend, median pay tiles
│   │   │   ├── BentoFxConverter.tsx        # Interactive currency converter
│   │   │   ├── BentoDepartmentMatrix.tsx   # Click-to-filter department cards
│   │   │   ├── BentoRegionalBenchmarks.tsx # Click-to-filter regional cards
│   │   │   ├── AskAcmePaySidePanel.tsx     # Always-open AI Copilot panel
│   │   │   ├── OnboardingTour.tsx          # Interactive 5-step walkthrough
│   │   │   ├── EmployeeGrid.tsx            # High-density data table
│   │   │   ├── FilterBar.tsx               # Instant search & filter toolbar
│   │   │   └── EmployeeDrawer.tsx          # Edit drawer with live USD preview
│   │   └── lib/             # API client, formatters, TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker/
│   └── init-db.sql          # DB initialization, pg_trgm extension, acme_readonly role
├── docs/
│   ├── PRD.md               # Product Requirements Document
│   ├── ARCHITECTURE.md      # Architecture overview & diagrams
│   └── adr/                 # Architecture Decision Records (001-005)
│       ├── ADR-001-tech-stack-and-monorepo.md
│       ├── ADR-002-dual-currency-and-db-indexing.md
│       ├── ADR-003-safe-nl-to-sql-pipeline.md
│       ├── ADR-004-astryx-ui-and-server-table.md
│       └── ADR-005-bento-grid-and-always-open-ai-copilot.md
├── docker-compose.yml
└── README.md
```
