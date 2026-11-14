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
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  localBaseSalary: string | number;
  localBonusTarget: string | number;
  localCurrency: string;
  fxRateSnapshot: string | number;
  baseSalaryUsd: string | number;
  bonusTargetUsd: string | number;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export interface EmployeeFilters {
  page: number;
  pageSize: number;
  cursor?: string;
  sort?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
  salaryMin?: number;
  salaryMax?: number;
  search?: string;
}

export interface QueryMeta {
  executionMs: number;
  scanType: string;
  isCoveringIndex: boolean;
  nextCursor?: string | null;
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
  cached?: boolean;
  planCost?: number;
}

export interface FxRateItem {
  currencyCode: string;
  rateToUsd: string;
  effectiveDate: string;
}

export interface DepartmentStat {
  department: string;
  headcount: number;
  totalPayroll: number;
  avgSalary: number;
  medianSalary: number;
}

export interface CountryStat {
  country: string;
  headcount: number;
  totalPayroll: number;
  avgSalary: number;
  medianSalary: number;
}

export interface LevelStat {
  level: string;
  headcount: number;
  avgSalary: number;
  medianSalary: number;
}

export interface AnalyticsResponse {
  departments: DepartmentStat[];
  countries: CountryStat[];
  levels: LevelStat[];
}
