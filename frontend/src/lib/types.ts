export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  level: string;
  country: string;
  localCurrency: string;
  localBaseSalary: string | number;
  localBonusTarget: string | number;
  baseSalaryUsd: string | number;
  bonusTargetUsd: string | number;
  employmentStatus: 'active' | 'inactive' | 'terminated' | string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  page: number;
  pageSize: number;
  sort?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
  salaryMin?: number;
  salaryMax?: number;
  search?: string;
}

export interface StatsResponse {
  totalHeadcount: number;
  totalPayrollUsd: number;
  medianBaseSalaryUsd: number;
  activeCountries: number;
}

export interface AIQueryResponse {
  answerSummary: string;
  columns: string[];
  rows: Record<string, any>[];
  generatedSql: string;
  executionTimeMs: number;
  visualizationType: 'table' | 'metric' | 'comparison';
}

export interface FxRateItem {
  currencyCode: string;
  rateToUsd: string;
  effectiveDate: string;
}
