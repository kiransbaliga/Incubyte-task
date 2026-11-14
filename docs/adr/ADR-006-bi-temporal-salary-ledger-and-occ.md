# ADR-006: Bi-Temporal Append-Only Salary Ledger & Optimistic Concurrency Control (OCC)

## Context & Problem Statement
In human resources and enterprise payroll management, compensation data is heavily audited, subject to regulatory compliance, and modified by multiple concurrent actors (HR business partners, compensation committees, department managers).

A naive junior implementation performs in-place mutations:
```sql
UPDATE employees SET local_base_salary = 160000 WHERE id = :id;
```
This pattern presents two fatal enterprise flaws:
1. **Destructive Auditing**: In-place updates permanently overwrite previous compensation history. It becomes impossible to determine what an employee made on a specific historical date (e.g., for quarterly financial reconciliations or pay-equity audits).
2. **Lost Update Anomaly**: If Manager A and HR Partner B simultaneously edit an employee's salary or department from two separate tabs, the slower write silently clobbers the faster write without notice.

## Decision
We implement a **Bi-Temporal Append-Only Salary Ledger** paired with **Optimistic Concurrency Control (OCC)**:

### 1. Bi-Temporal Schema (`salary_revisions`)
- Stores immutable revisions of employee compensation with validity intervals:
  - `effective_from`: Start timestamp of the revision term (defaults to hire date or promotion timestamp).
  - `effective_to`: End timestamp of the revision term. `NULL` designates the currently active compensation revision.
  - `local_base_salary`, `local_bonus_target`, `local_currency`.
  - `fx_rate_snapshot`: Exact corporate FX conversion rate active at revision time.
  - `base_salary_usd`, `bonus_target_usd`.
  - `reason`: Audit reason for compensation change (e.g., "Annual Merit Calibration", "Promotion to L4").
  - `changed_by`: Operator identifier.

### 2. Optimistic Concurrency Control (`version` column & HTTP 409 Conflict)
- Added an integer `version` column (default `1`) to the `employees` table.
- Mutations via `PATCH /api/employees/:id` validate either the request body `version` integer or the standard HTTP `If-Match` header.
- The update executes within a transactional row lock (`FOR UPDATE`):
  ```typescript
  if (expectedVersion !== undefined && existing.version !== expectedVersion) {
    return reply.status(409).send({
      success: false,
      error: 'CONCURRENT_MODIFICATION',
      message: `Record was modified by another user. Current database version is ${existing.version}, but request specified version ${expectedVersion}.`,
      currentVersion: existing.version,
      data: existing,
    });
  }
  ```
- If compensation changed:
  1. Closes the currently active revision (`UPDATE salary_revisions SET effective_to = NOW() WHERE employee_id = :id AND effective_to IS NULL`).
  2. Inserts a new revision record (`INSERT INTO salary_revisions (...)`).
  3. Increments `version` (`existing.version + 1`) and updates the materialized employee record.

### 3. Point-in-Time Queryability
- Provides `GET /api/employees/:id/revisions` returning the full ordered chronological compensation history.
- Front-end `EmployeeDrawer` includes a dedicated "Salary Ledger History" tab and displays an actionable conflict resolution prompt on HTTP 409.

## Consequences
- **Positive**: Complete audit compliance with zero loss of compensation history.
- **Positive**: Guaranteed protection against lost updates during concurrent edits.
- **Positive**: Point-in-time timeline inspection available both in the UI and via analytical queries.
- **Negative**: Requires multi-table transactional writes on compensation mutations (negligible latency impact, <2ms in PostgreSQL).
