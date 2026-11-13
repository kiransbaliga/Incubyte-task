# Prompt 004 — Groq LLM Inference & Pagination Strategy Decisions

**Date:** 2026-11-13  
**Phase:** Planning & Architecture Refinement  
**Trigger:** User questions on cursor vs. offset pagination and decision to adopt Groq Cloud API for AI inference.

---

## 1. Pagination Decision: Offset + `COUNT(*) OVER()` vs. Cursor-Based

### Discussion

**User Inquiry:** *"Can you explain why we use offset + count over instead of cursor? Pagination cursor-based is better right?"*

**Analysis:**
While cursor-based pagination is ideal for endless feeds and multi-million row datasets (O(1) seek regardless of depth), it introduces severe UX limitations for an internal enterprise HR admin portal:

1. **Random Page Navigation:** Cursor pagination cannot support jumping to "Page 15" or "Page 40". A user must sequentially fetch every prior page.
2. **Total Record Count in Single Round-Trip:** Cursor queries cannot compute total matching rows without an additional `COUNT(*)` query. `COUNT(*) OVER()` window function provides both paginated rows and total matching count in a single database query.
3. **URL Bookmarkability:** Offset queries yield intuitive query parameters (`?page=5&pageSize=50`), which are easily shared and bookmarked by HR managers.
4. **Performance Reality at 10,000 Rows:** With composite B-tree indexes, PostgreSQL skips indexed rows with near-zero overhead. An `OFFSET 9950 LIMIT 50` query on an indexed table executes in <5ms.

**Conclusion:** Offset + `COUNT(*) OVER()` is the optimal architectural choice for the HR Compensation Grid. Keyset/cursor pagination remains an option for high-throughput public API streams if the dataset expands past 500k rows.

---

## 2. AI Inference Engine: Groq Cloud API

### Motivation

- **High Speed / Low Latency:** Groq's custom LPU (Language Processing Unit) hardware provides sub-500ms time-to-first-token (TTFT) and token generation rates of 250–750 tokens/sec.
- **Generous Free Tier:** Does not require a credit card and provides generous rate quotas:
  - `llama-3.3-70b-versatile`: 30 RPM, 1,000 RPD, 12,000 TPM.
  - `llama-3.1-8b-instant`: 30 RPM, 14,400 RPD, 6,000 TPM.
- **Structured JSON Mode:** Native support for `response_format: { type: "json_object" }` ensuring strict schema adherence for generated SQL query plans.
- **Evaluation Budget:** A 20–30 query test suite consumes <3% of the daily free tier allocation.

### Implementation Blueprint

- **Backend Package:** `groq-sdk`
- **Environment Variables:** `GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile`
- **Fallback Strategy:** Pattern-based SQL generator if `GROQ_API_KEY` is omitted, ensuring tests and demo runs remain functional offline.

---

## 3. Documents Updated

- `docs/PRD.md`: Updated tech stack table, F1 pagination rationale, and F4 Groq inference.
- `docs/ARCHITECTURE.md`: Updated sequence diagrams, Groq LPU pipeline, and free tier quota management.
- `docs/adr/ADR-002-dual-currency-and-db-indexing.md`: Added detailed comparison of Offset vs. Keyset pagination.
- `docs/adr/ADR-003-safe-nl-to-sql-pipeline.md`: Added Groq provider specifications and model limits.
- `docs/IMPLEMENTATION_PLAN.md`: Integrated `groq-sdk`, rate limit budgeting, and 30 curated test queries.
