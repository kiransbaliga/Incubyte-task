# Architecture Document: ACME Compensation Hub

> **Version:** 1.0  
> **Date:** 2026-11-13  
> **Status:** Design Phase

---

## 1. System Overview

ACME Compensation Hub is a full-stack web application providing centralized compensation management for 10,000+ global employees. The system consists of three main layers: a PostgreSQL database with performance-optimized indexes, a Fastify API server with Drizzle ORM, and a Next.js frontend with Meta Astryx UI components.

```mermaid
flowchart TD
    subgraph Frontend["Frontend — Next.js + React 19 + Astryx"]
        UI["Compensation Grid<br/>KPI Strip<br/>Edit Drawer"]
        AI_Chat["Ask ACME Pay<br/>AI Chat Panel"]
    end

    subgraph Backend["Backend — Fastify + TypeScript"]
        API["REST API<br/>CRUD + Search + Aggregations"]
        AI_Engine["AI Query Engine<br/>NL → Structured SQL"]
        Validator["SQL AST Validator<br/>Safety & Trust Layer"]
    end

    subgraph Database["PostgreSQL 16"]
        DB_Main["Main Connection Pool<br/>(read-write)"]
        DB_RO["Read-Only Pool<br/>(acme_readonly role)"]
        Tables["employees | fx_rates"]
        Indexes["B-tree Composites<br/>GIN Trigram"]
    end

    UI -->|"Paginated queries<br/>CRUD operations"| API
    AI_Chat -->|"Natural language question"| AI_Engine
    AI_Engine -->|"Generated SQL"| Validator
    Validator -->|"Validated SELECT"| DB_RO
    API --> DB_Main
    DB_Main --> Tables
    DB_RO --> Tables
    Tables --> Indexes
```

---

## 2. Data Flow Architecture

### 2.1 Employee Grid — Read Path

```mermaid
sequenceDiagram
    participant HR as HR Manager
    participant UI as Next.js Frontend
    participant API as Fastify API
    participant DB as PostgreSQL

    HR->>UI: Apply filters (country, dept, level) or click Page 5
    UI->>API: GET /api/employees?country=DE&dept=Engineering&page=5&sort=base_salary_usd:desc
    API->>DB: SELECT with composite index hit<br/>+ COUNT(*) OVER() in a single query
    DB-->>API: 50 rows + total count in single round-trip (< 50ms)
    API-->>UI: { data, pagination: { page, totalCount, totalPages }, stats }
    UI-->>HR: Rendered grid with dual-currency display & exact pagination
```

### 2.2 Employee Record — Write Path

```mermaid
sequenceDiagram
    participant HR as HR Manager
    participant UI as Next.js Frontend
    participant API as Fastify API
    participant DB as PostgreSQL

    HR->>UI: Edit employee salary (€90,000 EUR)
    UI->>UI: Client-side Zod validation
    UI->>API: PATCH /api/employees/:id { local_base_salary: 90000, local_currency: "EUR" }
    API->>API: Server-side Zod validation
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT rate_to_usd FROM fx_rates WHERE currency_code = 'EUR'
    DB-->>API: rate_to_usd = 1.086000
    API->>DB: UPDATE employees SET local_base_salary = 90000,<br/>base_salary_usd = 90000 * 1.086000
    API->>DB: COMMIT
    DB-->>API: Updated row
    API-->>UI: { success: true, employee: {...} }
    UI-->>HR: Updated grid row + KPI refresh
```

### 2.3 AI Query — Ask ACME Pay

```mermaid
sequenceDiagram
    participant HR as HR Manager
    participant UI as Ask ACME Pay Panel
    participant API as AI Engine
    participant LLM as LLM Provider
    participant Val as SQL Validator
    participant DB as PostgreSQL (readonly)

    HR->>UI: "Average salary for L4 Engineers in DE vs US?"
    UI->>API: POST /api/ai/query { question: "..." }
    API->>LLM: System prompt + DDL schema + question
    LLM-->>API: { sql: "SELECT ...", explanation: "..." }
    API->>Val: Validate SQL AST
    
    alt SQL is safe
        Val-->>API: ✅ Validated (SELECT-only, whitelisted tables, LIMIT ≤ 100)
        API->>DB: Execute via acme_readonly role (3s timeout)
        DB-->>API: Result rows
        API-->>UI: { answer, columns, rows, generatedSql, executionTimeMs }
        UI-->>HR: Summary card + data table + "View SQL" toggle
    else SQL is unsafe
        Val-->>API: ❌ Rejected (mutation/injection detected)
        API-->>UI: { error: "Query rejected for safety" }
        UI-->>HR: Error message with suggestion to rephrase
    end
```

---

## 3. Database Schema Design

### 3.1 Entity-Relationship Diagram

```mermaid
erDiagram
    employees {
        uuid id PK
        varchar employee_code UK
        varchar full_name
        varchar email UK
        varchar department
        varchar level
        char country
        char local_currency
        numeric local_base_salary
        numeric local_bonus_target
        numeric base_salary_usd
        numeric bonus_target_usd
        varchar employment_status
        date hire_date
        timestamptz created_at
        timestamptz updated_at
    }
    
    fx_rates {
        char currency_code PK
        numeric rate_to_usd
        date effective_date
    }
    
    fx_rates ||--o{ employees : "normalizes salary via"
```

### 3.2 Index Strategy

| Index Name | Type | Columns | Purpose |
|-----------|------|---------|---------|
| `idx_employees_dept_level_salary` | B-tree | `(department, level, base_salary_usd DESC)` | Filter by dept+level, sort by salary |
| `idx_employees_country_salary` | B-tree | `(country, base_salary_usd DESC)` | Filter by country, sort by salary |
| `idx_employees_status_hire_date` | B-tree | `(employment_status, hire_date DESC)` | Filter active employees, sort by tenure |
| `idx_employees_search_trgm` | GIN | `(full_name gin_trgm_ops, email gin_trgm_ops)` | Fast ILIKE fuzzy search on name/email |
| `idx_employees_code` | B-tree UNIQUE | `(employee_code)` | Unique constraint + fast lookup |
| `idx_employees_email` | B-tree UNIQUE | `(email)` | Unique constraint + fast lookup |

### 3.3 Currency Normalization Strategy

- **On Write**: When `local_base_salary` or `local_currency` changes, look up `fx_rates.rate_to_usd` and compute `base_salary_usd = local_base_salary * rate_to_usd` within the same transaction.
- **On Read**: All cross-country queries (sort, filter, aggregate, AI) use the precomputed `base_salary_usd`. Zero runtime FX joins needed.
- **FX Rate Updates**: When corporate FX rates change (quarterly), a batch job recalculates all `base_salary_usd` values. This is an admin operation, not part of the MVP UI.

---

## 4. API Design

### 4.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/employees` | Paginated, filterable, sortable employee list |
| `GET` | `/api/employees/stats` | Aggregate KPIs (headcount, payroll, median, countries) |
| `GET` | `/api/employees/:id` | Single employee detail |
| `POST` | `/api/employees` | Create new employee record |
| `PATCH` | `/api/employees/:id` | Update employee record (with USD recalculation) |
| `DELETE` | `/api/employees/:id` | Soft-delete (set status to terminated) |
| `GET` | `/api/fx-rates` | List current FX rates |
| `POST` | `/api/ai/query` | Natural-language compensation query |

### 4.2 Query Parameters — `GET /api/employees`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (1-indexed) |
| `pageSize` | number | Rows per page (default 50, max 100) |
| `sort` | string | Column:direction (e.g., `base_salary_usd:desc`) |
| `country` | string[] | Filter by country codes |
| `department` | string[] | Filter by department names |
| `level` | string[] | Filter by job levels |
| `status` | string[] | Filter by employment status |
| `salaryMin` | number | Minimum base_salary_usd |
| `salaryMax` | number | Maximum base_salary_usd |
| `search` | string | Debounced fuzzy search (name, email, employee code) |

---

## 5. Frontend Architecture

### 5.1 Page Structure

```mermaid
flowchart TD
    subgraph AppShell["AppShell (Astryx)"]
        Nav["TopNav — ACME Compensation Hub"]
        
        subgraph MainContent["Main Content Area"]
            KPI["KPI Strip<br/>Headcount | Payroll | Median Pay | Countries"]
            Filters["Filter Bar<br/>Country | Department | Level | Status | Salary Range | Search"]
            Grid["Compensation Grid (Astryx Table)<br/>10,000 rows — server-paginated"]
            Pagination["Pagination Controls"]
        end
        
        subgraph SidePanel["Side Panels"]
            EditDrawer["Edit Employee Drawer<br/>Zod-validated form + live USD preview"]
            AIChat["Ask ACME Pay Panel<br/>AI chat + result cards + SQL audit"]
        end
    end
    
    KPI --> Filters
    Filters --> Grid
    Grid --> Pagination
    Grid -->|"Click row"| EditDrawer
    Nav -->|"Ask ACME Pay button"| AIChat
```

### 5.2 State Management

- **Server State**: TanStack Query (React Query) for data fetching, caching, and cache invalidation on mutations.
- **URL State**: Filter and pagination state serialized in URL search params for shareability and browser history.
- **Local UI State**: React `useState` / `useReducer` for drawer open/close, form editing state.

---

## 6. AI Query Engine Architecture

### 6.1 Pipeline with Groq LPU Inference

```
User Question (HR Natural Language)
    ↓
[Prompt Engineering] — System prompt with DDL schema, FX rates context, few-shot examples
    ↓
[Groq Cloud API Call] — LPU high-speed inference (<500ms TTFT)
    - Default Model: llama-3.3-70b-versatile (JSON mode)
    - Fallback Model: llama-3.1-8b-instant
    - Structured output: { sql, explanation, visualizationType }
    ↓
[SQL AST Validator] — Parse → enforce SELECT-only, whitelist tables, inject LIMIT 100
    ↓
[Read-Only DB Execution] — acme_readonly role, 3s statement_timeout
    ↓
[Response Formatting] — { answerSummary, columns, rows, generatedSql, executionTimeMs }
```

### 6.2 Groq Free Tier & Rate Budgeting

- **Throughput:** Groq LPU delivers 250–750 tokens/sec, reducing response latency from typical 3–5 seconds to <800ms end-to-end.
- **Quota Management:**
  - `llama-3.3-70b-versatile`: 30 Requests/Min (RPM) and 1,000 Requests/Day (RPD).
  - `llama-3.1-8b-instant`: 30 Requests/Min (RPM) and 14,400 Requests/Day (RPD).
  - The application easily accommodates continuous evaluation sessions (20–30+ test queries) with zero cost.
- **Deterministic Offline Fallback:** If `GROQ_API_KEY` is not provided, the engine automatically routes to a pattern-based SQL generator so all core compensation inquiries work out of the box.

### 6.2 SQL Validator Rules

1. Must be a single SQL statement (no `;` separators after trimming).
2. Must start with `SELECT` or `WITH` (CTE allowed).
3. Reject keywords: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `EXECUTE`, `pg_sleep`, `pg_terminate_backend`.
4. Whitelist table references: only `employees` and `fx_rates`.
5. Block system schemas: `pg_catalog`, `information_schema`, `pg_*` functions.
6. Enforce `LIMIT ≤ 100` — inject if missing, cap if larger.
7. No subqueries that modify data (enforce recursively).

---

## 7. Deployment Architecture

```mermaid
flowchart LR
    subgraph Docker["docker-compose.yml"]
        PG["postgres:16<br/>Port 5432<br/>Init: create acme_readonly role"]
        BE["backend<br/>Node.js + Fastify<br/>Port 3001<br/>Auto-migrate + seed on startup"]
        FE["frontend<br/>Next.js<br/>Port 3000"]
    end
    
    FE -->|"API calls"| BE
    BE -->|"Read-Write pool"| PG
    BE -->|"Read-Only pool<br/>(AI queries)"| PG
```

### Docker Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `postgres` | `postgres:16-alpine` | 5432 | Init script creates `acme_readonly` role with `GRANT SELECT ON employees, fx_rates` |
| `backend` | Multi-stage Node.js | 3001 | Runs migrations, seeds 10k rows if empty, starts Fastify |
| `frontend` | Multi-stage Next.js | 3000 | Connects to backend API |

---

## 8. Technology Decision Records

See [`docs/adr/`](file:///Users/narix/Code/interview/Incubyte/docs/adr/) for detailed Architecture Decision Records:

- [ADR-001](file:///Users/narix/Code/interview/Incubyte/docs/adr/ADR-001-tech-stack-and-monorepo.md): Tech Stack & Monorepo Structure
- [ADR-002](file:///Users/narix/Code/interview/Incubyte/docs/adr/ADR-002-dual-currency-and-db-indexing.md): Dual-Currency Data Model & Database Indexing
- [ADR-003](file:///Users/narix/Code/interview/Incubyte/docs/adr/ADR-003-safe-nl-to-sql-pipeline.md): Safe Natural-Language to SQL Pipeline
- [ADR-004](file:///Users/narix/Code/interview/Incubyte/docs/adr/ADR-004-astryx-ui-and-server-table.md): Astryx UI & Server-Driven Table
