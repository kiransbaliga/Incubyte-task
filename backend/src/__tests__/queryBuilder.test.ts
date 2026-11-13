import { describe, it, expect } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { buildEmployeeWhereConditions, buildEmployeeOrderBy } from '../lib/queryBuilder.js';

const dialect = new PgDialect();

describe('queryBuilder', () => {
  describe('buildEmployeeWhereConditions', () => {
    it('returns undefined when no filters are provided', () => {
      expect(buildEmployeeWhereConditions({})).toBeUndefined();
    });

    it('returns undefined when filter arrays are empty or undefined', () => {
      const conditions = buildEmployeeWhereConditions({
        country: [],
        department: [],
        level: [],
        status: [],
        salaryMin: undefined,
        salaryMax: undefined,
        search: undefined,
      });
      expect(conditions).toBeUndefined();
    });

    it('builds a single condition for country filter', () => {
      const sqlCond = buildEmployeeWhereConditions({ country: ['US', 'DE'] });
      expect(sqlCond).toBeDefined();

      const query = dialect.sqlToQuery(sqlCond!);
      expect(query.sql).toBe('"employees"."country" in ($1, $2)');
      expect(query.params).toEqual(['US', 'DE']);
    });

    it('builds conditions for department and level filters', () => {
      const sqlCond = buildEmployeeWhereConditions({
        department: ['Engineering', 'Product'],
        level: ['L4', 'L5'],
      });
      expect(sqlCond).toBeDefined();

      const query = dialect.sqlToQuery(sqlCond!);
      expect(query.sql).toContain('"employees"."department" in ($1, $2)');
      expect(query.sql).toContain('"employees"."level" in ($3, $4)');
      expect(query.params).toEqual(['Engineering', 'Product', 'L4', 'L5']);
    });

    it('builds condition for employment status filter', () => {
      const sqlCond = buildEmployeeWhereConditions({ status: ['active', 'inactive'] });
      expect(sqlCond).toBeDefined();

      const query = dialect.sqlToQuery(sqlCond!);
      expect(query.sql).toBe('"employees"."employment_status" in ($1, $2)');
      expect(query.params).toEqual(['active', 'inactive']);
    });

    it('builds conditions for salaryMin and salaryMax range with exact 2-decimal formatting', () => {
      const sqlCondMin = buildEmployeeWhereConditions({ salaryMin: 80000 });
      expect(sqlCondMin).toBeDefined();
      const queryMin = dialect.sqlToQuery(sqlCondMin!);
      expect(queryMin.sql).toBe('"employees"."base_salary_usd" >= $1');
      expect(queryMin.params).toEqual(['80000.00']);

      const sqlCondMax = buildEmployeeWhereConditions({ salaryMax: 150000.5 });
      expect(sqlCondMax).toBeDefined();
      const queryMax = dialect.sqlToQuery(sqlCondMax!);
      expect(queryMax.sql).toBe('"employees"."base_salary_usd" <= $1');
      expect(queryMax.params).toEqual(['150000.50']);

      const sqlCondBoth = buildEmployeeWhereConditions({ salaryMin: 50000, salaryMax: 120000 });
      expect(sqlCondBoth).toBeDefined();
      const queryBoth = dialect.sqlToQuery(sqlCondBoth!);
      expect(queryBoth.sql).toContain('"employees"."base_salary_usd" >= $1');
      expect(queryBoth.sql).toContain('"employees"."base_salary_usd" <= $2');
      expect(queryBoth.params).toEqual(['50000.00', '120000.00']);
    });

    it('builds fuzzy search condition using ILIKE on fullName, email, and employeeCode', () => {
      const sqlCond = buildEmployeeWhereConditions({ search: 'alice' });
      expect(sqlCond).toBeDefined();

      const query = dialect.sqlToQuery(sqlCond!);
      expect(query.sql).toBe(
        '("employees"."full_name" ILIKE $1 or "employees"."email" ILIKE $2 or "employees"."employee_code" ILIKE $3)'
      );
      expect(query.params).toEqual(['%alice%', '%alice%', '%alice%']);
    });

    it('combines multiple filters (country, department, level, status, salary range, search) with AND', () => {
      const sqlCond = buildEmployeeWhereConditions({
        country: ['US', 'IN'],
        department: ['Engineering'],
        level: ['L3'],
        status: ['active'],
        salaryMin: 90000,
        salaryMax: 180000,
        search: 'smith',
      });
      expect(sqlCond).toBeDefined();

      const query = dialect.sqlToQuery(sqlCond!);
      expect(query.sql).toContain('"employees"."country" in ($1, $2)');
      expect(query.sql).toContain('"employees"."department" in ($3)');
      expect(query.sql).toContain('"employees"."level" in ($4)');
      expect(query.sql).toContain('"employees"."employment_status" in ($5)');
      expect(query.sql).toContain('"employees"."base_salary_usd" >= $6');
      expect(query.sql).toContain('"employees"."base_salary_usd" <= $7');
      expect(query.sql).toContain('"employees"."full_name" ILIKE $8');

      expect(query.params).toEqual([
        'US',
        'IN',
        'Engineering',
        'L3',
        'active',
        '90000.00',
        '180000.00',
        '%smith%',
        '%smith%',
        '%smith%',
      ]);
    });
  });

  describe('buildEmployeeOrderBy', () => {
    it('defaults to base_salary_usd DESC when no sort parameter is provided', () => {
      const defaultOrder = buildEmployeeOrderBy();
      const query = dialect.sqlToQuery(defaultOrder);
      expect(query.sql).toBe('"employees"."base_salary_usd" desc');
    });

    it('defaults to base_salary_usd DESC when given an empty string or unknown column', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('')).sql).toBe('"employees"."base_salary_usd" desc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('unknown_column:asc')).sql).toBe(
        '"employees"."base_salary_usd" desc'
      );
    });

    it('handles base_salary_usd ascending and descending', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('base_salary_usd:asc')).sql).toBe(
        '"employees"."base_salary_usd" asc'
      );
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('base_salary_usd:desc')).sql).toBe(
        '"employees"."base_salary_usd" desc'
      );
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('baseSalaryUsd:asc')).sql).toBe(
        '"employees"."base_salary_usd" asc'
      );
    });

    it('handles full_name / fullName / name column variants', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('full_name:asc')).sql).toBe('"employees"."full_name" asc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('full_name:desc')).sql).toBe('"employees"."full_name" desc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('fullName:asc')).sql).toBe('"employees"."full_name" asc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('name:desc')).sql).toBe('"employees"."full_name" desc');
    });

    it('handles hire_date and hireDate column variants', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('hire_date:asc')).sql).toBe('"employees"."hire_date" asc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('hireDate:desc')).sql).toBe('"employees"."hire_date" desc');
    });

    it('handles department, level, and country sorting', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('department:asc')).sql).toBe('"employees"."department" asc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('level:desc')).sql).toBe('"employees"."level" desc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('country:asc')).sql).toBe('"employees"."country" asc');
    });

    it('handles employee_code and employeeCode column variants', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('employee_code:asc')).sql).toBe(
        '"employees"."employee_code" asc'
      );
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('employeeCode:desc')).sql).toBe(
        '"employees"."employee_code" desc'
      );
    });

    it('defaults direction to desc when direction token is omitted', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('department')).sql).toBe('"employees"."department" desc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('country')).sql).toBe('"employees"."country" desc');
    });

    it('handles case-insensitive direction values (ASC / DESC)', () => {
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('full_name:ASC')).sql).toBe('"employees"."full_name" asc');
      expect(dialect.sqlToQuery(buildEmployeeOrderBy('level:DESC')).sql).toBe('"employees"."level" desc');
    });
  });
});
