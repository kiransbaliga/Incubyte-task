# ADR-003: Safe Natural-Language to SQL Pipeline

**Status:** Accepted  
**Date:** 2026-11-13  
**Deciders:** Engineering Team

## Context

The "Ask ACME Pay" feature allows HR Managers to type natural-language compensation questions (e.g., "Compare median pay for L4 Engineers in Germany vs. the US") and receive data-driven answers. This requires translating natural language into SQL and executing it against the production database.

**The core tension:** LLMs are powerful at generating SQL but cannot be trusted to generate *safe* SQL. A single prompt injection or hallucinated `DROP TABLE` could destroy production data. The system must provide useful analytical capabilities while maintaining absolute safety guarantees.

## Decision

### Defense-in-Depth: Three Independent Safety Layers

No single layer is trusted alone. Each layer independently prevents harm, so a bypass of any one layer is insufficient for damage.

```
User Question
    │
    ▼
┌─────────────────────────────────┐
│  Layer 1: LLM Prompt Constraints │  ← Soft constraint (can be bypassed)
│  - System prompt: "SELECT only"  │
│  - Structured JSON output        │
│  - Schema-aware (DDL provided)   │
└───────────────┬─────────────────┘
                │ { sql, explanation }
                ▼
┌─────────────────────────────────┐
│  Layer 2: SQL AST/Lexer Validator│  ← Hard constraint (deterministic)
│  - Single statement only         │
│  - SELECT/WITH whitelist         │
│  - Table whitelist enforcement   │
│  - LIMIT cap injection           │
│  - Keyword blocklist             │
└───────────────┬─────────────────┘
                │ Validated SQL
                ▼
┌─────────────────────────────────┐
│  Layer 3: DB Role Isolation      │  ← Infrastructure constraint (OS-level)
│  - acme_readonly PostgreSQL role │
│  - GRANT SELECT ONLY             │
│  - statement_timeout = 3000ms    │
└───────────────┬─────────────────┘
                │ Read-only execution
                ▼
            Result Rows
```

### Layer 1: LLM Prompt Engineering & Provider Selection (Soft Constraint)

**Inference Provider: Groq Cloud API**
- **Hardware & Speed:** Groq's custom LPU (Language Processing Unit) delivers near-instant inference (<500ms time-to-first-token), making natural language queries feel synchronous and responsive in the UI.
- **Model Selection:**
  - Default: `llama-3.3-70b-versatile` (exceptional SQL generation capability, structured reasoning, 30 RPM / 1,000 RPD on free tier).
  - Alternative / Ultra-fast: `llama-3.1-8b-instant` (sub-200ms latency, 30 RPM / 14,400 RPD on free tier).
- **Cost & Quota:** Free tier requires no credit card and comfortably supports 20–30+ test queries per session without quota friction.
- **Client Implementation:** Uses official `groq-sdk` (or OpenAI SDK configured with `baseURL: 'https://api.groq.com/openai/v1'`) with JSON mode (`response_format: { type: "json_object" }`).

The LLM receives:
- **System prompt**: Strict instructions to generate only `SELECT` queries.
- **DDL schema context**: Exact table definitions and column types so the LLM generates valid column references.
- **FX rates context**: Current rate values so the LLM doesn't need to guess.
- **Few-shot examples**: Canonical query patterns for common HR questions.
- **Structured output format**: JSON schema `{ sql: string, explanation: string, visualizationType: "table" | "metric" | "comparison" }`.

**This layer is necessary but insufficient.** LLMs can be prompt-injected, hallucinate, or generate unexpected SQL. It reduces the frequency of unsafe outputs but cannot guarantee safety.

### Layer 2: SQL AST/Lexer Validator (Hard Constraint)

A deterministic `sqlValidator.ts` module that parses the generated SQL string and enforces:

| Rule | Implementation |
|------|----------------|
| Single statement | Reject any SQL containing `;` (after trimming trailing whitespace/semicolons) |
| Statement type whitelist | Must start with `SELECT` or `WITH` (CTE) |
| DML/DDL keyword blocklist | Reject: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `EXECUTE`, `CREATE` |
| Dangerous function blocklist | Reject: `pg_sleep`, `pg_terminate_backend`, `pg_cancel_backend`, `lo_import`, `lo_export`, `dblink` |
| Table/schema whitelist | Only `employees` and `fx_rates` table references allowed; reject `pg_catalog`, `information_schema`, any schema-qualified names not matching whitelist |
| LIMIT enforcement | If no `LIMIT` clause, inject `LIMIT 100`; if `LIMIT > 100`, cap to `LIMIT 100` |
| Comment stripping | Remove `--`, `/* */` comments before analysis (prevent comment-based injection) |

**Implementation approach:** Lexer/regex-based validation (not a full SQL parser). Rationale:
- A full SQL parser (e.g., `pgsql-ast-parser`) adds a heavy dependency and may have its own bugs.
- For a whitelist-based approach (we only need to confirm "is this safe?" not "parse the full AST"), keyword/regex scanning combined with Layer 3's DB-level enforcement is sufficient.
- The validator is conservative — it may reject some valid queries (false positives) but must never accept an unsafe query (no false negatives).

### Layer 3: Database Role Isolation (Infrastructure Constraint)

A dedicated PostgreSQL role `acme_readonly` used exclusively for AI query execution:

```sql
CREATE USER acme_readonly WITH PASSWORD '...';
GRANT CONNECT ON DATABASE acme_compensation TO acme_readonly;
GRANT USAGE ON SCHEMA public TO acme_readonly;
GRANT SELECT ON employees, fx_rates TO acme_readonly;
ALTER USER acme_readonly SET statement_timeout = '3000ms';
```

**Even if Layers 1 and 2 both fail**, this role cannot:
- Execute `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE` (PostgreSQL returns `ERROR: permission denied`).
- Access tables outside `employees` and `fx_rates`.
- Run queries longer than 3 seconds (prevents resource exhaustion / crypto mining via SQL).

A separate Drizzle connection pool (`aiDb`) is configured with this role's credentials.

### Fallback: Deterministic Query Parser

If no LLM API key is configured (`LLM_PROVIDER` env var unset), a deterministic keyword-based parser handles common query patterns:

| Pattern | Generated Query |
|---------|----------------|
| "top N [highest/lowest] paid in [department]" | `SELECT ... ORDER BY base_salary_usd DESC LIMIT N WHERE department = ?` |
| "average salary [by department/country/level]" | `SELECT department, AVG(base_salary_usd) ... GROUP BY department` |
| "compare [metric] for [group A] vs [group B]" | `SELECT ... WHERE ... IN (A, B) GROUP BY ...` |

This ensures the AI feature is functional (if limited) without requiring an API key.

### Response Format

```typescript
interface AIQueryResponse {
  answerSummary: string;      // Human-readable answer text
  columns: string[];           // Column headers for tabular display
  rows: Record<string, any>[]; // Result data
  generatedSql: string;        // The SQL that was executed (for audit)
  executionTimeMs: number;     // Query execution time
  visualizationType: 'table' | 'metric' | 'comparison';
}
```

The UI renders:
1. **Answer summary** as a chat message.
2. **Data table or metric card** with the result.
3. **Expandable "View Generated SQL"** drawer for HR audit and trust.

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| No LLM — pure keyword parser only | Too limited for ad-hoc analytical questions; defeats the purpose of AI querying |
| Trust LLM output directly (no validator) | Unacceptable security risk; prompt injection can produce destructive SQL |
| Full SQL AST parser (pgsql-ast-parser) | Heavy dependency with its own bug surface; overkill for whitelist validation when combined with DB role isolation |
| ORM-only queries (no raw SQL) | LLM would need to generate Drizzle code, not SQL — harder to validate, less flexible for analytical queries |
| Read replica database | Over-engineering for a demo; read-only role on the same DB achieves equivalent safety |

## Consequences

- AI queries are limited to `employees` and `fx_rates` tables only — extending to new tables requires updating the validator whitelist.
- LIMIT 100 cap means some queries ("list all employees in Engineering") will be truncated — acceptable for analytical use, and the summary should note truncation.
- The deterministic fallback parser has limited coverage — users without an LLM API key get a degraded but functional experience.
- The validator may false-positive on edge cases (e.g., column names containing blocked keywords) — conservative rejection is preferred over false negatives.
- `statement_timeout = 3000ms` means complex analytical queries (e.g., percentile calculations on 10k rows) must complete quickly — our indexed schema should handle this.
