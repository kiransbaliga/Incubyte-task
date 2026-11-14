import { and, asc, desc, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { employees } from '../db/schema.js';
import type { EmployeeQueryParams, StatsQueryParams } from '../api/schemas.js';

/**
 * Builds dynamic WHERE conditions for employees based on filter params
 */
export function buildEmployeeWhereConditions(
  filters: Partial<EmployeeQueryParams | StatsQueryParams>
): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (filters.country && filters.country.length > 0) {
    conditions.push(inArray(employees.country, filters.country));
  }

  if (filters.department && filters.department.length > 0) {
    conditions.push(inArray(employees.department, filters.department));
  }

  if (filters.level && filters.level.length > 0) {
    conditions.push(inArray(employees.level, filters.level));
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(inArray(employees.employmentStatus, filters.status));
  }

  if (filters.salaryMin !== undefined) {
    conditions.push(gte(employees.baseSalaryUsd, filters.salaryMin.toFixed(2)));
  }

  if (filters.salaryMax !== undefined) {
    conditions.push(lte(employees.baseSalaryUsd, filters.salaryMax.toFixed(2)));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${employees.fullName} ILIKE ${term}`,
        sql`${employees.email} ILIKE ${term}`,
        sql`${employees.employeeCode} ILIKE ${term}`
      )
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Maps query string sort format ('column:direction') to Drizzle OrderBy expression
 */
export function buildEmployeeOrderBy(sortParam?: string): SQL {
  if (!sortParam) {
    return desc(employees.baseSalaryUsd);
  }

  const [column, direction = 'desc'] = sortParam.split(':');
  const isAsc = direction.toLowerCase() === 'asc';

  switch (column) {
    case 'base_salary_usd':
    case 'baseSalaryUsd':
      return isAsc ? asc(employees.baseSalaryUsd) : desc(employees.baseSalaryUsd);

    case 'full_name':
    case 'fullName':
    case 'name':
      return isAsc ? asc(employees.fullName) : desc(employees.fullName);

    case 'hire_date':
    case 'hireDate':
      return isAsc ? asc(employees.hireDate) : desc(employees.hireDate);

    case 'department':
      return isAsc ? asc(employees.department) : desc(employees.department);

    case 'level':
      return isAsc ? asc(employees.level) : desc(employees.level);

    case 'country':
      return isAsc ? asc(employees.country) : desc(employees.country);

    case 'employee_code':
    case 'employeeCode':
      return isAsc ? asc(employees.employeeCode) : desc(employees.employeeCode);

    default:
      return desc(employees.baseSalaryUsd);
  }
}

/**
 * Keyset cursor structure for O(1) deep pagination
 */
export interface KeysetCursor {
  sortValue: string | number;
  id: string;
}

/**
 * Encodes sort value and employee UUID into a URL-safe Base64 cursor
 */
export function encodeCursor(sortValue: string | number, id: string): string {
  const payload = JSON.stringify({ sortValue, id });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

/**
 * Decodes a URL-safe Base64 cursor back into sort value and employee UUID
 */
export function decodeCursor(cursorStr: string): KeysetCursor | null {
  try {
    const raw = Buffer.from(cursorStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (typeof parsed.sortValue === 'string' || typeof parsed.sortValue === 'number') &&
      typeof parsed.id === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds composite keyset WHERE condition: (sort_column, id) < ($1, $2)
 * Enables PostgreSQL to perform direct index seeks with 0 heap fetches.
 */
export function buildKeysetCondition(cursor: KeysetCursor, sortParam?: string): SQL {
  const [column = 'base_salary_usd', direction = 'desc'] = (sortParam || 'base_salary_usd:desc').split(':');
  const isAsc = direction.toLowerCase() === 'asc';

  switch (column) {
    case 'hire_date':
    case 'hireDate':
      return isAsc
        ? sql`(${employees.hireDate}, ${employees.id}) > (${cursor.sortValue}, ${cursor.id})`
        : sql`(${employees.hireDate}, ${employees.id}) < (${cursor.sortValue}, ${cursor.id})`;

    case 'full_name':
    case 'fullName':
    case 'name':
      return isAsc
        ? sql`(${employees.fullName}, ${employees.id}) > (${cursor.sortValue}, ${cursor.id})`
        : sql`(${employees.fullName}, ${employees.id}) < (${cursor.sortValue}, ${cursor.id})`;

    case 'base_salary_usd':
    case 'baseSalaryUsd':
    default:
      return isAsc
        ? sql`(${employees.baseSalaryUsd}, ${employees.id}) > (${String(cursor.sortValue)}, ${cursor.id})`
        : sql`(${employees.baseSalaryUsd}, ${employees.id}) < (${String(cursor.sortValue)}, ${cursor.id})`;
  }
}

/**
 * Builds deterministic composite OrderBy for keyset queries with secondary tie-breaker
 */
export function buildKeysetOrderBy(sortParam?: string): SQL[] {
  const [column = 'base_salary_usd', direction = 'desc'] = (sortParam || 'base_salary_usd:desc').split(':');
  const isAsc = direction.toLowerCase() === 'asc';
  const dir = isAsc ? asc : desc;

  switch (column) {
    case 'hire_date':
    case 'hireDate':
      return [dir(employees.hireDate), dir(employees.id)];

    case 'full_name':
    case 'fullName':
    case 'name':
      return [dir(employees.fullName), dir(employees.id)];

    case 'base_salary_usd':
    case 'baseSalaryUsd':
    default:
      return [dir(employees.baseSalaryUsd), dir(employees.id)];
  }
}
