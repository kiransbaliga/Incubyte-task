import { describe, it, expect } from 'vitest';
import {
  EmployeeCreateSchema,
  EmployeeQuerySchema,
  EmployeeUpdateSchema,
  EmployeeIdParamSchema,
  StatsQuerySchema,
  DEPARTMENTS,
  LEVELS,
  EMPLOYMENT_STATUSES,
} from '../api/schemas.js';

describe('schemas', () => {
  describe('EmployeeCreateSchema', () => {
    const validEmployee = {
      fullName: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      department: 'Engineering',
      level: 'L4',
      country: 'US',
      localCurrency: 'USD',
      localBaseSalary: 145000,
      localBonusTarget: 15000,
      employmentStatus: 'active',
      hireDate: '2023-04-15',
    };

    it('passes for a fully valid employee payload', () => {
      const result = EmployeeCreateSchema.safeParse(validEmployee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('Alice Johnson');
        expect(result.data.email).toBe('alice.johnson@example.com');
        expect(result.data.department).toBe('Engineering');
        expect(result.data.level).toBe('L4');
        expect(result.data.country).toBe('US');
        expect(result.data.localCurrency).toBe('USD');
        expect(result.data.localBaseSalary).toBe(145000);
        expect(result.data.localBonusTarget).toBe(15000);
        expect(result.data.employmentStatus).toBe('active');
        expect(result.data.hireDate).toBe('2023-04-15');
      }
    });

    it('applies default values for optional fields', () => {
      const minimalEmployee = {
        fullName: 'Bob Smith',
        email: 'bob.smith@example.com',
        department: 'Product',
        level: 'L3',
        country: 'DE',
        localCurrency: 'EUR',
        localBaseSalary: 85000,
        hireDate: '2022-09-01',
      };

      const result = EmployeeCreateSchema.safeParse(minimalEmployee);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.localBonusTarget).toBe(0);
        expect(result.data.employmentStatus).toBe('active');
      }
    });

    it('coerces numeric string values for salary and bonus', () => {
      const payload = {
        ...validEmployee,
        localBaseSalary: '120000',
        localBonusTarget: '10000',
      };

      const result = EmployeeCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.localBaseSalary).toBe(120000);
        expect(result.data.localBonusTarget).toBe(10000);
      }
    });

    it('rejects zero or negative salary', () => {
      const zeroSalary = { ...validEmployee, localBaseSalary: 0 };
      const negSalary = { ...validEmployee, localBaseSalary: -50000 };

      const zeroResult = EmployeeCreateSchema.safeParse(zeroSalary);
      expect(zeroResult.success).toBe(false);
      if (!zeroResult.success) {
        expect(zeroResult.error.issues[0].message).toBe('Salary must be greater than zero');
      }

      const negResult = EmployeeCreateSchema.safeParse(negSalary);
      expect(negResult.success).toBe(false);
      if (!negResult.success) {
        expect(negResult.error.issues[0].message).toBe('Salary must be greater than zero');
      }
    });

    it('rejects negative bonus target', () => {
      const negBonus = { ...validEmployee, localBonusTarget: -1000 };
      const result = EmployeeCreateSchema.safeParse(negBonus);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Bonus target cannot be negative');
      }
    });

    it('rejects invalid email formats', () => {
      const badEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain..com'];
      for (const email of badEmails) {
        const result = EmployeeCreateSchema.safeParse({ ...validEmployee, email });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.message.includes('Invalid email'))).toBe(true);
        }
      }
    });

    it('rejects invalid departments and accepts all defined departments', () => {
      for (const dept of DEPARTMENTS) {
        const res = EmployeeCreateSchema.safeParse({ ...validEmployee, department: dept });
        expect(res.success).toBe(true);
      }

      const badDept = EmployeeCreateSchema.safeParse({ ...validEmployee, department: 'Marketing' });
      expect(badDept.success).toBe(false);
      if (!badDept.success) {
        expect(badDept.error.issues[0].message).toBe('Invalid department');
      }
    });

    it('rejects invalid levels and accepts all defined levels (L1-L6)', () => {
      for (const lvl of LEVELS) {
        const res = EmployeeCreateSchema.safeParse({ ...validEmployee, level: lvl });
        expect(res.success).toBe(true);
      }

      const badLevel = EmployeeCreateSchema.safeParse({ ...validEmployee, level: 'L7' });
      expect(badLevel.success).toBe(false);
      if (!badLevel.success) {
        expect(badLevel.error.issues[0].message).toBe('Invalid level (must be L1-L6)');
      }
    });

    it('rejects invalid country codes', () => {
      const badCountry = EmployeeCreateSchema.safeParse({ ...validEmployee, country: 'FR' });
      expect(badCountry.success).toBe(false);
      if (!badCountry.success) {
        expect(badCountry.error.issues[0].message).toContain('Country must be US, DE, GB, IN, SG, or JP');
      }
    });

    it('rejects invalid currency codes', () => {
      const badCurrency = EmployeeCreateSchema.safeParse({ ...validEmployee, localCurrency: 'AUD' });
      expect(badCurrency.success).toBe(false);
      if (!badCurrency.success) {
        expect(badCurrency.error.issues[0].message).toContain('Currency must be USD, EUR, GBP, INR, SGD, or JPY');
      }
    });

    it('rejects invalid employment statuses and accepts active, inactive, terminated', () => {
      for (const status of EMPLOYMENT_STATUSES) {
        const res = EmployeeCreateSchema.safeParse({ ...validEmployee, employmentStatus: status });
        expect(res.success).toBe(true);
      }

      const badStatus = EmployeeCreateSchema.safeParse({ ...validEmployee, employmentStatus: 'contractor' });
      expect(badStatus.success).toBe(false);
    });

    it('enforces fullName length and trims whitespace', () => {
      const shortName = EmployeeCreateSchema.safeParse({ ...validEmployee, fullName: 'A' });
      expect(shortName.success).toBe(false);

      const whitespaceName = EmployeeCreateSchema.safeParse({ ...validEmployee, fullName: '   ' });
      expect(whitespaceName.success).toBe(false);

      const paddedName = EmployeeCreateSchema.safeParse({ ...validEmployee, fullName: '  Jane Doe  ' });
      expect(paddedName.success).toBe(true);
      if (paddedName.success) {
        expect(paddedName.data.fullName).toBe('Jane Doe');
      }

      const tooLongName = EmployeeCreateSchema.safeParse({ ...validEmployee, fullName: 'A'.repeat(101) });
      expect(tooLongName.success).toBe(false);
    });

    it('validates hireDate format to YYYY-MM-DD', () => {
      const validDates = ['2020-01-01', '2025-12-31', '2024-02-29'];
      for (const hireDate of validDates) {
        const res = EmployeeCreateSchema.safeParse({ ...validEmployee, hireDate });
        expect(res.success).toBe(true);
      }

      const invalidDates = ['2024/01/01', '01-01-2024', '2024-1-1', 'not-a-date'];
      for (const hireDate of invalidDates) {
        const res = EmployeeCreateSchema.safeParse({ ...validEmployee, hireDate });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error.issues[0].message).toBe('Hire date must be in YYYY-MM-DD format');
        }
      }
    });
  });

  describe('EmployeeQuerySchema', () => {
    it('applies default query values when parameters are empty', () => {
      const result = EmployeeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(50);
        expect(result.data.sort).toBe('base_salary_usd:desc');
        expect(result.data.country).toBeUndefined();
        expect(result.data.department).toBeUndefined();
        expect(result.data.level).toBeUndefined();
        expect(result.data.status).toBeUndefined();
        expect(result.data.salaryMin).toBeUndefined();
        expect(result.data.salaryMax).toBeUndefined();
        expect(result.data.search).toBeUndefined();
      }
    });

    it('coerces page and pageSize strings to integers', () => {
      const result = EmployeeQuerySchema.safeParse({ page: '3', pageSize: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.pageSize).toBe(25);
      }
    });

    it('rejects invalid page or pageSize boundaries', () => {
      expect(EmployeeQuerySchema.safeParse({ page: '0' }).success).toBe(false);
      expect(EmployeeQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
      expect(EmployeeQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
      expect(EmployeeQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    });

    it('parses comma-separated strings into trimmed arrays for multi-value filters', () => {
      const result = EmployeeQuerySchema.safeParse({
        country: 'US, DE, GB',
        department: 'Engineering, Product',
        level: 'L3, L4, L5',
        status: 'active, inactive',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toEqual(['US', 'DE', 'GB']);
        expect(result.data.department).toEqual(['Engineering', 'Product']);
        expect(result.data.level).toEqual(['L3', 'L4', 'L5']);
        expect(result.data.status).toEqual(['active', 'inactive']);
      }
    });

    it('accepts array parameters directly without mutation', () => {
      const result = EmployeeQuerySchema.safeParse({
        country: ['US', 'IN'],
        department: ['Operations'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toEqual(['US', 'IN']);
        expect(result.data.department).toEqual(['Operations']);
      }
    });

    it('coerces and validates salaryMin and salaryMax', () => {
      const result = EmployeeQuerySchema.safeParse({
        salaryMin: '60000',
        salaryMax: '150000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.salaryMin).toBe(60000);
        expect(result.data.salaryMax).toBe(150000);
      }

      // Negative values should fail min(0)
      expect(EmployeeQuerySchema.safeParse({ salaryMin: '-10' }).success).toBe(false);
      expect(EmployeeQuerySchema.safeParse({ salaryMax: '-1' }).success).toBe(false);
    });

    it('trims search query and transforms whitespace-only to undefined', () => {
      const searchWithSpaces = EmployeeQuerySchema.safeParse({ search: '  Alice Smith  ' });
      expect(searchWithSpaces.success).toBe(true);
      if (searchWithSpaces.success) {
        expect(searchWithSpaces.data.search).toBe('Alice Smith');
      }

      const emptySearch = EmployeeQuerySchema.safeParse({ search: '   ' });
      expect(emptySearch.success).toBe(true);
      if (emptySearch.success) {
        expect(emptySearch.data.search).toBeUndefined();
      }
    });
  });

  describe('EmployeeUpdateSchema', () => {
    it('allows an empty update object', () => {
      const result = EmployeeUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('allows updating partial fields', () => {
      const partialUpdate = {
        fullName: 'Jane Doe',
        localBaseSalary: 160000,
        level: 'L5',
      };

      const result = EmployeeUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('Jane Doe');
        expect(result.data.localBaseSalary).toBe(160000);
        expect(result.data.level).toBe('L5');
        expect(result.data.email).toBeUndefined();
      }
    });

    it('enforces field validation even on partial updates', () => {
      expect(EmployeeUpdateSchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
      expect(EmployeeUpdateSchema.safeParse({ localBaseSalary: -500 }).success).toBe(false);
      expect(EmployeeUpdateSchema.safeParse({ department: 'NonExistent' }).success).toBe(false);
      expect(EmployeeUpdateSchema.safeParse({ level: 'L10' }).success).toBe(false);
    });
  });

  describe('EmployeeIdParamSchema', () => {
    it('passes for valid UUID string', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'c9a646d3-9c61-4cb7-bf7d-b2f6180cf79d',
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const id of validUuids) {
        const result = EmployeeIdParamSchema.safeParse({ id });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(id);
        }
      }
    });

    it('rejects invalid UUID formats', () => {
      const invalidUuids = ['not-a-uuid', '12345', '', '550e8400-e29b-41d4-a716', '123-456-789'];

      for (const id of invalidUuids) {
        const result = EmployeeIdParamSchema.safeParse({ id });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid employee ID (must be a valid UUID)');
        }
      }
    });
  });

  describe('StatsQuerySchema', () => {
    it('correctly parses filters for stats endpoint', () => {
      const result = StatsQuerySchema.safeParse({
        country: 'US,GB',
        department: 'Engineering',
        salaryMin: '70000',
        salaryMax: '140000',
        search: 'lead',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toEqual(['US', 'GB']);
        expect(result.data.department).toEqual(['Engineering']);
        expect(result.data.salaryMin).toBe(70000);
        expect(result.data.salaryMax).toBe(140000);
        expect(result.data.search).toBe('lead');
      }
    });
  });
});
