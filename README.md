# ACME Compensation Hub

Global Employee Salary Management & Workforce Intelligence Web Application for 10,000+ global employees across 6 countries (US, DE, GB, IN, SG, JP).

Built with **Fastify**, **TypeScript**, **Drizzle ORM**, **PostgreSQL**, **Next.js 15 (React 19)**, and **Meta Astryx Design System**, featuring a **Safe AI Natural Language to SQL Assistant** ("Ask ACME Pay") with hot-swappable Groq and OpenAI providers.

---

## Architecture & System Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Meta Astryx Frontend UI                         │
│   Next.js 15 (React 19) • TanStack Query • Astryx Design System        │
│   KPI Strip • Filter Bar • Dual-Currency Grid • Live USD Drawer Card  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Fastify Backend API Server                      │
│   TypeScript • Zod Validation • Currency Math • Query Builder Engine   │
├───────────────────────────────────┬────────────────────────────────────┤
│   "Ask ACME Pay" AI Engine        │   Hot-Swappable LLM Strategy:      │
│   - Strategy Pattern              │   - Groq (llama-3.3-70b-versatile) │
│   - 3-Layer SQL Security Guard    │   - OpenAI (gpt-4o-mini)           │
│   - Deterministic Fallback Parser │   - Offline Rule-Based Matcher     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Drizzle ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                        PostgreSQL 16 Database                          │
│   - 10,000+ Deterministically Seeded Employees                         │
│   - Composite B-Tree Indexes on (dept, level, base_salary_usd:desc)    │
│   - GIN Trigram Index on (full_name, email) for fuzzy search           │
│   - Precomputed base_salary_usd for sub-50ms sorting                   │
│   - Dedicated `acme_readonly` Role with 3000ms statement timeout       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features

1. **High-Scale Employee Compensation Grid (10,000+ Records):**
   - Sub-50ms p95 response time using composite B-Tree indexes and offset pagination with `COUNT(*) OVER()`.
   - Dual-currency display: Local Compensation (e.g., €85,000 EUR, ₹24,00,000 INR) alongside Normalized USD ($91,800 USD).
   - Faceted filtering across Country, Department, Level (L1–L6), Employment Status, and debounced text search.

2. **Employee Record Management (CRUD + Live USD Conversion Preview):**
   - Slide-over drawer with strict Zod validation.
   - Live USD preview card recalculates normalized USD compensation in real-time as local currency or salary changes.

3. **"Ask ACME Pay" AI Assistant (Natural Language to SQL):**
   - Translates questions like *"Compare median pay for L4 in DE vs US"* or *"Top 10 highest paid in Engineering"* into read-only SQL queries.
   - **Hot-Swappable Strategy Pattern:** Switch seamlessly between Groq Cloud (`llama-3.3-70b-versatile`) and OpenAI (`gpt-4o-mini`) via `LLM_PROVIDER=groq` or `LLM_PROVIDER=openai`.
   - **3-Layer Defense-in-Depth Safety:**
     1. Prompt system constraints (SELECT-only on `employees` and `fx_rates`, LIMIT 100).
     2. AST / Lexer keyword validator blocking mutations (INSERT, UPDATE, DELETE, DROP, ALTER, EXEC), nested comments, and multi-statement queries.
     3. Dedicated `acme_readonly` DB connection role enforcing read-only permissions and a 3-second statement timeout at the database kernel level.
   - Full auditability: HR users can expand the "View Generated SQL" card to inspect the derived query and execution latency.

---

## Quickstart

### Option 1: Docker Compose (One-Command Setup)

```bash
# Clone and launch all services (PostgreSQL, Backend, Frontend)
docker compose up --build
```
- Frontend: `http://localhost:3000`
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
npm run test         # Runs 125 unit & integration tests
npm run dev          # Starts Fastify dev server on port 3001
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build        # Typechecks and verifies static pages
npm run dev          # Starts Next.js dev server on port 3000
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

The backend test suite covers 125 test cases across 7 test suites:
```bash
cd backend && npm test
```
- `currencyUtils.test.ts`: Floating-point drift prevention, corporate planning rate conversions, multi-locale currency formatting.
- `schemas.test.ts`: Zod validation for employee CRUD and pagination query bounds.
- `sqlValidator.test.ts`: Adversarial test suite asserting rejection of DDL/DML, multi-statement injection, and comment bypasses.
- `queryBuilder.test.ts`: SQL AST condition builder with sorting and multi-field filters.
- `api.test.ts`: Employee CRUD endpoints, pagination consistency, and stats aggregations.
- `aiApi.test.ts`: Safe AI query endpoint with adversarial mutation blocking and schema response verification.
- `queryEngine.test.ts`: End-to-end execution of AI queries with database integration.

---

## Project Structure

```
Incubyte/
├── backend/
│   ├── src/
│   │   ├── ai/              # Hot-swappable LLM Strategy, SQL Validator, Prompt
│   │   ├── api/             # Fastify REST endpoints (employees, fx-rates, ai)
│   │   ├── db/              # Drizzle schema, composite indexes, 10k seeder
│   │   ├── lib/             # Currency math, query builder
│   │   └── server.ts        # Fastify app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (layout, page, providers)
│   │   ├── components/      # Meta Astryx components (KpiStrip, FilterBar, EmployeeGrid, EmployeeDrawer, AskAcmePay)
│   │   └── lib/             # API client, formatters, TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker/
│   └── init-db.sql          # DB initialization, pg_trgm extension, acme_readonly role
├── docs/
│   ├── PRD.md               # Product Requirements Document
│   ├── ARCHITECTURE.md      # Architecture overview & diagrams
│   └── adr/                 # Architecture Decision Records (001-004)
├── docker-compose.yml
└── README.md
```
