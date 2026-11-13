# Key Prompts — ACME Compensation Hub

> This file logs the key AI prompts and engineering workflow decisions used during development.

---

## Prompt 001 — Initial Kickoff & PRD Generation

**Date:** 2026-11-13  
**Phase:** Planning  
**Purpose:** Establish project scope, architecture, and constraints before writing any code.

### User Prompt (summarized)

The user provided a detailed starter prompt (`prompt.md`) specifying:

1. **Role**: Staff Full-Stack Systems Engineer building ACME Compensation Hub
2. **Strict constraints**: Incremental git commits, ADR-driven documentation, zero shortcuts on scale/performance
3. **Tech stack**: Node.js + TypeScript + Fastify + Drizzle ORM + PostgreSQL (backend), React 19 + Next.js + TypeScript + UI component library (frontend)
4. **Key features**: 10k-employee compensation grid, dual-currency display, CRUD with auto FX recalculation, AI natural-language query engine
5. **Performance targets**: <50ms p95 paginated queries, <2s seed for 10k rows
6. **Security requirements**: AST-validated read-only SQL, dedicated PostgreSQL readonly role, statement timeout
7. **6-phase execution plan**: Docs → Schema → API → AI → UI → Tests/Docker

### Key Engineering Decisions Made

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Currency storage | NUMERIC(14,2) not FLOAT | Zero floating-point drift for financial data |
| USD normalization | Precomputed on write, not computed on read | Eliminates runtime FX joins for sorting/filtering/aggregation |
| AI SQL safety | 3-layer defense (LLM constraints → AST validator → DB role isolation) | Defense-in-depth; no single layer is trusted alone |
| Pagination | Server-side offset with COUNT(*) OVER() | Simpler than cursor for this use case; window function avoids double scan |
| UI library | Shadcn UI + Radix + TanStack Table (pending Astryx investigation) | Accessible, composable, well-documented |

### Output

- `docs/PRD.md` — Full product requirements document
- `docs/IMPLEMENTATION_PLAN.md` — Phased implementation plan with commit structure
- `docs/ARCHITECTURE.md` — System architecture and data flow diagrams
- `docs/adr/` — Architecture Decision Records 001–004
