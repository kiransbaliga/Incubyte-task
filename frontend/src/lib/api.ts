import type { Employee, EmployeeFilters, StatsResponse, AIQueryResponse, FxRateItem } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getEmployees(filters: EmployeeFilters): Promise<{
  data: Employee[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}> {
  const query = new URLSearchParams();
  query.set('page', String(filters.page));
  query.set('pageSize', String(filters.pageSize));

  if (filters.sort) query.set('sort', filters.sort);
  if (filters.country && filters.country !== 'all') query.set('country', filters.country);
  if (filters.department && filters.department !== 'all') query.set('department', filters.department);
  if (filters.level && filters.level !== 'all') query.set('level', filters.level);
  if (filters.status && filters.status !== 'all') query.set('status', filters.status);
  if (filters.salaryMin !== undefined) query.set('salaryMin', String(filters.salaryMin));
  if (filters.salaryMax !== undefined) query.set('salaryMax', String(filters.salaryMax));
  if (filters.search && filters.search.trim()) query.set('search', filters.search.trim());

  const res = await fetch(`${API_BASE}/api/employees?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch employees: ${res.statusText}`);
  }
  const json = await res.json();
  return {
    data: json.data || [],
    pagination: json.pagination || { page: 1, pageSize: 50, totalCount: 0, totalPages: 0 },
  };
}

export async function getStats(filters: Partial<EmployeeFilters>): Promise<StatsResponse> {
  const query = new URLSearchParams();
  if (filters.country && filters.country !== 'all') query.set('country', filters.country);
  if (filters.department && filters.department !== 'all') query.set('department', filters.department);
  if (filters.level && filters.level !== 'all') query.set('level', filters.level);
  if (filters.status && filters.status !== 'all') query.set('status', filters.status);
  if (filters.salaryMin !== undefined) query.set('salaryMin', String(filters.salaryMin));
  if (filters.salaryMax !== undefined) query.set('salaryMax', String(filters.salaryMax));
  if (filters.search && filters.search.trim()) query.set('search', filters.search.trim());

  const res = await fetch(`${API_BASE}/api/employees/stats?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }
  const json = await res.json();
  return json.stats;
}

export async function getEmployee(id: string): Promise<Employee> {
  const res = await fetch(`${API_BASE}/api/employees/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch employee: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data;
}

export async function createEmployee(data: Partial<Employee>): Promise<Employee> {
  const res = await fetch(`${API_BASE}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to create employee');
  }
  return json.data;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
  const res = await fetch(`${API_BASE}/api/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update employee');
  }
  return json.data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/employees/${id}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to delete employee');
  }
}

export async function getFxRates(): Promise<FxRateItem[]> {
  const res = await fetch(`${API_BASE}/api/fx-rates`);
  if (!res.ok) {
    throw new Error('Failed to fetch FX rates');
  }
  const json = await res.json();
  return json.rates || [];
}

export async function askAcmePay(question: string): Promise<AIQueryResponse> {
  const res = await fetch(`${API_BASE}/api/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.reason || json.error || 'Failed to process AI query');
  }
  return json.data;
}

// Aliases for compatibility
export const fetchEmployees = getEmployees;
export const fetchStats = getStats;
export const fetchEmployee = getEmployee;
export const fetchFxRates = getFxRates;
