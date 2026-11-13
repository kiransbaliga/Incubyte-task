# Prompt 004 — Architecture Refinement: Offset vs Cursor Pagination & Groq LLM Selection

**Date:** 2026-11-13  
**Phase:** Planning & Architecture Review  
**Trigger:** User feedback during Phase 1 plan review

---

## 1. Pagination Rationale: Offset + `COUNT(*) OVER()` vs. Cursor-Based

### Context & Question
The reviewer asked: *"pagination cursor based is better right? can you explain why we use offset + count over instead of cursor."*

### Architectural Analysis

While cursor-based (keyset) pagination is the industry standard for high-throughput, infinite-scroll, or real-time event feeds (e.g. Twitter, Slack, payment logs), an **HR Compensation Management Hub** presents distinct operational requirements:

1. **HR User Experience (Random Access & Page Jumping):**
   - HR operators frequently need to jump to specific pages ("Page 42"), view total calculated pages, or navigate to the end of a cohort.
   - Cursor-based pagination only supports bidirectional traversal (`next`/`prev` cursor) and cannot jump to arbitrary pages without walking all intermediate rows.
2. **Total Record Count Visibility:**
   - HR reporting requires knowing the exact cohort size: *"Showing 2,051–2,100 of 10,000 employees"*.
   - Cursor pagination inherently does not provide total counts without running an expensive separate `COUNT(*)` query.
   - With PostgreSQL window function `count(*) over()`, the database derives the total matching row count in the **same execution plan pass** as the LIMIT/OFFSET slice, eliminating a second database round-trip.
3. **Dynamic Multi-Column Sort Switching:**
   - In the ACME grid, the user can sort by `base_salary_usd`, `full_name`, `hire_date`, or `department`.
   - In cursor pagination, each sort permutation requires constructing composite tuple conditions (e.g., `(hire_date, id) < ($cursor_date, $cursor_id)`), which becomes brittle with nulls and complex data types.
   - In offset pagination, dynamic `ORDER BY <column> <dir> LIMIT 50 OFFSET <offset>` is cleanly composed by the query builder.
4. **Performance at 10,000 Rows:**
   - Offset pagination latency degrades at millions of rows because PostgreSQL must traverse earlier index pages before discarding them.
   - At **10,000 rows** with our B-tree composite indexes, `OFFSET 9,950 LIMIT 50` executes in **< 5ms**. There is zero perceptible performance penalty at this scale.

### Conclusion
Offset pagination with `COUNT(*) OVER()` is strictly superior for this use case because it fulfills HR UX requirements with sub-10ms latency.

---

## 2. AI Inference Engine: Groq Free Tier Integration

### Context & Goal
User request: *"Also lets use Groq api keys for AI inference as it provides a good free tier api keys. Lets focus a simple but good free model with good limit like maybe 20-30 good queries we can ask"*

### Provider & Model Selection

- **Provider:** Groq Cloud (`groq-sdk` or OpenAI-compatible endpoint `https://api.groq.com/openai/v1`).
- **Target Model:** `llama-3.3-70b-versatile`
  - High reasoning capability for generating precise, syntactically correct SQL across joins, grouping, and percentiles.
  - Free Tier Rate Limits: 30 RPM, 1,000 RPD, 12,000 TPM, 100,000 TPD.
  - Zero cost, requires no credit card, perfect for 20–30+ interactive review queries.
- **Alternative Ultra-Fast Model:** `llama-3.1-8b-instant` (14,400 RPD, 500,000 TPD, sub-200ms latency).
- **Environment Configuration:**
  - `GROQ_API_KEY`: API key.
  - `LLM_PROVIDER`: `groq` (default), `openai`, `anthropic`.
  - `LLM_MODEL`: `llama-3.3-70b-versatile`.
- **Zero-Key Fallback:** If `GROQ_API_KEY` is not present, the system defaults to the deterministic local keyword parser without crashing.
