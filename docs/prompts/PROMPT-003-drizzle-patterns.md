# Prompt 003 — Drizzle ORM Schema Patterns Research

**Date:** 2026-11-13  
**Phase:** Planning (Pre-Build Investigation)  
**Purpose:** Research concrete Drizzle ORM patterns for currency types, composite indexes, GIN trigram indexes, pagination, and read-only DB roles.

## Research Questions

1. How to define NUMERIC(14,2) and BIGINT columns for currency?
2. How to define composite B-tree indexes with DESC ordering?
3. Can Drizzle define GIN trigram indexes, or do they need raw SQL?
4. Efficient pagination with COUNT(*) OVER() window function?
5. Read-only PostgreSQL roles with separate connection pools?
6. Drizzle-kit migration workflow?

## Key Findings

### Currency Types

**Chosen: `numeric({ precision: 14, scale: 2 })`** for dollar amounts.

```typescript
localBaseSalary: numeric('local_base_salary', { precision: 14, scale: 2 }).notNull(),
baseSalaryUsd: numeric('base_salary_usd', { precision: 14, scale: 2 }).notNull(),
```

⚠️ **Important**: Drizzle returns `numeric` columns as `string` in TypeScript (intentional — prevents floating-point rounding). Must use `Number()` or `parseFloat()` in app layer for arithmetic.

### Composite Indexes with DESC

**Fully native** in Drizzle (since v0.31.0):

```typescript
(table) => [
  index('idx_dept_level_salary').on(
    table.department,
    table.level,
    table.baseSalaryUsd.desc()
  ),
]
```

### GIN Trigram Indexes

**Schema definition works natively**, but `pg_trgm` extension needs a custom migration:

```typescript
index('idx_search_trgm').using('gin', sql`${table.fullName} gin_trgm_ops, ${table.email} gin_trgm_ops`),
```

Extension migration:
```bash
npx drizzle-kit generate --custom --name=enable-pg-trgm
# Then write: CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Pagination with COUNT(*) OVER()

```typescript
const result = await db.select({
  ...allColumns,
  totalCount: sql<number>`count(*) over()`.mapWith(Number),
}).from(employees).limit(pageSize).offset(offset);

const totalCount = result.length > 0 ? result[0].totalCount : 0;
```

### Read-Only DB Pool

Two separate `drizzle()` instances pointing to the same database with different PostgreSQL roles:

```typescript
const primarySql = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(primarySql, { schema });

const readonlySql = postgres(process.env.READONLY_DATABASE_URL!, { max: 5 });
export const aiDb = drizzle(readonlySql, { schema });
```

### Migration Workflow

- **Dev**: `npx drizzle-kit push` (no migration files).
- **Production**: `npx drizzle-kit generate` → review SQL → `npx drizzle-kit migrate`.
- **Programmatic**: `migrate(db, { migrationsFolder: './drizzle' })` at app startup.

## Impact on Implementation Plan

All patterns are confirmed feasible with Drizzle ORM. No workarounds needed. Key callout: the `numeric` → `string` TypeScript mapping requires careful handling in the API response serialization layer.
