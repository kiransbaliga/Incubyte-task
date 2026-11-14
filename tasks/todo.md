# SDE-2 Upgrades: Tasks & Verification Checklist

## Phase 1: Bi-Temporal Append-Only Ledger & Optimistic Concurrency Control (Feature 1)
- [x] **Task 1.1**: Add `salary_revisions` schema, `employees.version` column, and database migration.
- [x] **Task 1.2**: Update `seed.ts` to populate initial revision history for all 10,000 employees.
- [x] **Task 1.3**: Implement atomic `PATCH /api/employees/:id` with OCC version validation, revision insertion, and 409 Conflict handling.
- [x] **Task 1.4**: Add concurrency unit & integration tests (`backend/src/__tests__/concurrency.test.ts`) simulating parallel conflicting writes.
- [x] **Task 1.5**: Implement `GET /api/employees/:id/revisions` timeline history endpoint.
- [x] **Task 1.6**: Update Frontend `EmployeeDrawer.tsx` with Revision History tab and 409 Conflict retry modal.

### Checkpoint: Phase 1 Verification
- [x] Concurrency tests pass (`npm test`) proving lost-update protection via 409 Conflict.
- [x] Salary history verified immutable and point-in-time queryable.

---

## Phase 2: Keyset Pagination, Covering Indexes & Telemetry (Feature 2)
- [x] **Task 2.1**: Create PostgreSQL covering index (`idx_employees_covering_grid`) with `INCLUDE (...)` clause.
- [x] **Task 2.2**: Implement base64 keyset cursor encoding/decoding and composite predicate `WHERE (base_salary_usd, id) < ($1, $2)` in queryBuilder.
- [x] **Task 2.3**: Update `GET /api/employees` to support cursor navigation (`?cursor=<base64>`).
- [x] **Task 2.4**: Implement Fastify `Server-Timing` header hook and return `meta.executionMs` in API responses.
- [x] **Task 2.5**: Create benchmark script `backend/scripts/benchmark-keyset.ts` (`npm run bench:keyset`) proving Index-Only Scans with 0 heap fetches.
- [x] **Task 2.6**: Update Frontend `EmployeeGrid.tsx` with live query telemetry badge (`PostgreSQL 16 · X.Xms (Index-Only)`).

### Checkpoint: Phase 2 Verification
- [x] `npm run bench:keyset` runs `EXPLAIN (ANALYZE, BUFFERS)` showing sub-5ms P99 on page 200 with 0 heap fetches.
- [x] `Server-Timing` headers confirmed via `curl -I http://localhost:3001/api/employees`.

---

## Phase 3: AI Safety: Pre-Flight EXPLAIN Cost Gate & Semantic Cache (Feature 3)
- [ ] **Task 3.1**: Implement `backend/src/ai/queryCostEvaluator.ts` using `EXPLAIN (FORMAT JSON)` with 5,000 cost budget.
- [ ] **Task 3.2**: Implement in-memory LRU query cache in `backend/src/ai/queryCache.ts` with TTL.
- [ ] **Task 3.3**: Wire Cost Gate and Cache into `backend/src/ai/queryEngine.ts` and write tests for costly cartesian queries.
- [ ] **Task 3.4**: Update Frontend `DedicatedChatView.tsx` with live `Plan Cost` and `Cached` badges in AST Audit drawer.
- [ ] **Task 3.5**: Add `Cmd+K` keyboard shortcut for instant executive compensation queries and filter presets.

### Checkpoint: Phase 3 Verification
- [ ] Dangerous/expensive queries intercepted before DB execution with 422 error.
- [ ] Repeated queries return in <2ms with `Cached` status.
- [ ] Full backend test suite passing with 100% green tests.
