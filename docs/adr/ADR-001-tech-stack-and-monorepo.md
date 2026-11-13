# ADR-001: Tech Stack & Monorepo Structure

**Status:** Accepted  
**Date:** 2026-11-13  
**Deciders:** Engineering Team

## Context

We need to build a full-stack Employee Salary Management System supporting 10,000+ records with sub-50ms query performance, dual-currency display, CRUD operations, and an AI natural-language query engine. The system must be demonstrable via a single `docker compose up --build` command.

## Decision

### Monorepo Structure

```
acme-comp-hub/
├── docs/                    # PRD, ARCHITECTURE, ADRs, prompt logs
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── prompts/
│   └── adr/
├── backend/                 # Node.js + TypeScript + Fastify + Drizzle ORM
│   ├── src/
│   │   ├── db/              # Schema, migrations, seed
│   │   ├── api/             # Route handlers, validation
│   │   └── ai/              # NL-to-SQL engine, SQL validator
│   ├── drizzle/             # Generated migration files
│   └── package.json
├── frontend/                # React 19 + Next.js (App Router) + Astryx
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # UI components
│   │   └── lib/             # API client, utilities
│   └── package.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### Backend: Fastify + TypeScript + Drizzle ORM + PostgreSQL

- **Fastify** over Express: Built-in schema validation, 2–3x faster throughput, native TypeScript support, JSON serialization optimized.
- **Drizzle ORM**: Type-safe SQL query builder with zero ORM overhead, native composite index support with `.desc()`, and `drizzle-kit` migrations. Preferred over Prisma for this use case because Drizzle gives direct SQL control for window functions (`COUNT(*) OVER()`) and custom index types (GIN trigram).
- **PostgreSQL 16**: NUMERIC precision for currency, `pg_trgm` extension for fuzzy text search, composite B-tree indexes, read-only role support for AI query isolation.

### Frontend: Next.js + React 19 + Meta Astryx

- **Meta Astryx** (`@astryxdesign/core`): Production-quality component library from Meta with 150+ components including `Table`, `Drawer`, `Chat`, `PowerSearch`, `AppShell`. Built on React 19 + StyleX. Covers 100% of PRD requirements out of the box, including AI chat components.
- **Next.js App Router**: Server components for initial page loads, client components for interactive grid/filters.

### Containerization: Docker + docker-compose

Three-service stack (postgres, backend, frontend) for single-command setup.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Express | Slower, no built-in schema validation, manual TypeScript setup |
| Prisma ORM | Higher abstraction hides query control; harder to express window functions and custom index types |
| SQLite | Lacks `pg_trgm`, read-only roles, and mature `NUMERIC` type for currency |
| Shadcn UI + Radix | Would require building AI chat components from scratch; Astryx has them built-in |
| Separate repos | Adds deployment complexity for a demo system; monorepo is simpler |

## Consequences

- Team must learn Astryx component API (mitigated by `npx @astryxdesign/cli component --list` and `--compact` docs).
- PostgreSQL dependency means Docker is required for local development (mitigated by docker-compose).
- Drizzle's `numeric` type returns `string` in TypeScript (requires explicit `Number()` conversion for arithmetic in app layer).
