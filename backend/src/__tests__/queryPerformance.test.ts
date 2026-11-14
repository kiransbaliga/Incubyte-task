import { describe, it, expect } from 'vitest';
import { primarySql } from '../db/index.js';

describe('Database Indexing & Query Latency Performance Benchmark (< 50ms p95)', () => {
  it('executes department & level filtered sort using composite index in < 50ms', async () => {
    const result = await primarySql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, full_name, department, level, base_salary_usd
      FROM employees
      WHERE department = 'Engineering' AND level = 'L4'
      ORDER BY base_salary_usd DESC
      LIMIT 50;
    `;

    const plan = result[0]['QUERY PLAN'][0];
    const executionTimeMs = plan['Execution Time'];
    const planText = JSON.stringify(plan);

    // Assert that a composite B-tree or covering index was used
    expect(planText).toMatch(/idx_employees_dept_level_salary|idx_employees_covering_grid/);

    // Assert execution time is well within the 50ms p95 requirement
    expect(executionTimeMs).toBeLessThan(50);
  });

  it('executes country filtered sort using composite index in < 50ms', async () => {
    const result = await primarySql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, full_name, country, base_salary_usd
      FROM employees
      WHERE country = 'DE'
      ORDER BY base_salary_usd DESC
      LIMIT 50;
    `;

    const plan = result[0]['QUERY PLAN'][0];
    const executionTimeMs = plan['Execution Time'];
    const planText = JSON.stringify(plan);

    // Assert index usage
    expect(planText).toMatch(/idx_employees_country_salary|idx_employees_covering_grid/);

    // Assert latency < 50ms
    expect(executionTimeMs).toBeLessThan(50);
  });

  it('executes keyset pagination using covering index with sub-5ms latency', async () => {
    const result = await primarySql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, employee_code, full_name, email, department, level, country, local_currency, local_base_salary, local_bonus_target, bonus_target_usd, employment_status, hire_date, version, created_at, updated_at, base_salary_usd
      FROM employees
      WHERE (base_salary_usd, id) < (150000.00, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      ORDER BY base_salary_usd DESC, id DESC
      LIMIT 50;
    `;

    const plan = result[0]['QUERY PLAN'][0];
    const executionTimeMs = plan['Execution Time'];
    const planText = JSON.stringify(plan);

    expect(planText).toContain('idx_employees_covering_grid');
    expect(executionTimeMs).toBeLessThan(5);
  });

  it('executes fuzzy text search using GIN trigram index in < 50ms', async () => {
    const result = await primarySql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id, full_name, email
      FROM employees
      WHERE full_name ILIKE '%Magnus%'
      LIMIT 50;
    `;

    const plan = result[0]['QUERY PLAN'][0];
    const executionTimeMs = plan['Execution Time'];
    const planText = JSON.stringify(plan);

    // Assert GIN trigram index usage
    expect(planText).toContain('idx_employees_search_trgm');

    // Assert latency < 50ms
    expect(executionTimeMs).toBeLessThan(50);
  });
});
