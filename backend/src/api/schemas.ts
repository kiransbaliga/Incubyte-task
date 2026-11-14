import { z } from 'zod';
import { SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES } from '../lib/currencyUtils.js';

export const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Sales', 'Operations', 'People'] as const;
export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;
export const EMPLOYMENT_STATUSES = ['active', 'inactive', 'terminated'] as const;

/**
 * Helper to parse comma-separated or repeated query parameter into array
 */
const stringOrArray = z.union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val;
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  });

/**
 * GET /api/employees query parameters schema
 */
export const EmployeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  sort: z.string().default('base_salary_usd:desc'),
  country: stringOrArray,
  department: stringOrArray,
  level: stringOrArray,
  status: stringOrArray,
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  search: z.string().optional().transform((s) => s?.trim() || undefined),
});

export type EmployeeQueryParams = z.infer<typeof EmployeeQuerySchema>;

/**
 * GET /api/employees/stats query parameters schema (identical filters, no pagination)
 */
export const StatsQuerySchema = z.object({
  country: stringOrArray,
  department: stringOrArray,
  level: stringOrArray,
  status: stringOrArray,
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  search: z.string().optional().transform((s) => s?.trim() || undefined),
});

export type StatsQueryParams = z.infer<typeof StatsQuerySchema>;

/**
 * POST /api/employees body schema
 */
export const EmployeeCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(150),
  department: z.enum(DEPARTMENTS, { errorMap: () => ({ message: 'Invalid department' }) }),
  level: z.enum(LEVELS, { errorMap: () => ({ message: 'Invalid level (must be L1-L6)' }) }),
  country: z.enum(SUPPORTED_COUNTRIES, { errorMap: () => ({ message: 'Country must be US, DE, GB, IN, SG, or JP' }) }),
  localCurrency: z.enum(SUPPORTED_CURRENCIES, { errorMap: () => ({ message: 'Currency must be USD, EUR, GBP, INR, SGD, or JPY' }) }),
  localBaseSalary: z.coerce.number().positive('Salary must be greater than zero'),
  localBonusTarget: z.coerce.number().min(0, 'Bonus target cannot be negative').default(0),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).default('active'),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be in YYYY-MM-DD format'),
});

export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>;

/**
 * PATCH /api/employees/:id body schema
 * Supports Optimistic Concurrency Control (OCC) via version column
 * and revision reason for bi-temporal salary ledger.
 */
export const EmployeeUpdateSchema = EmployeeCreateSchema.partial().extend({
  version: z.coerce.number().int().min(1).optional(),
  revisionReason: z.string().trim().max(255).optional(),
  changedBy: z.string().trim().max(255).optional(),
});

export type EmployeeUpdateInput = z.infer<typeof EmployeeUpdateSchema>;

/**
 * Route param schemas
 */
export const EmployeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee ID (must be a valid UUID)'),
});
