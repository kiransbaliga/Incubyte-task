import type { FastifyPluginAsync } from 'fastify';
import { eq, sql, count, desc, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { employees, fxRates, salaryRevisions } from '../db/schema.js';
import {
  EmployeeQuerySchema,
  StatsQuerySchema,
  EmployeeCreateSchema,
  EmployeeUpdateSchema,
  EmployeeIdParamSchema,
} from './schemas.js';
import { buildEmployeeOrderBy, buildEmployeeWhereConditions } from '../lib/queryBuilder.js';
import { convertLocalToUsd, FALLBACK_FX_RATES, type SupportedCurrency } from '../lib/currencyUtils.js';

export const employeeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Helper to retrieve the current FX rate for a given currency code
   */
  async function getFxRate(currency: string): Promise<number> {
    const [rateRow] = await db
      .select({ rateToUsd: fxRates.rateToUsd })
      .from(fxRates)
      .where(eq(fxRates.currencyCode, currency))
      .limit(1);

    if (rateRow && rateRow.rateToUsd) {
      return parseFloat(rateRow.rateToUsd);
    }

    return FALLBACK_FX_RATES[currency as SupportedCurrency] ?? 1.0;
  }

  /**
   * GET /api/employees
   * Paginated, sortable, multi-filterable employee list.
   * Leverages composite B-tree indexes and COUNT(*) OVER() for sub-50ms performance.
   */
  fastify.get('/', async (request, reply) => {
    const parseResult = EmployeeQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const filters = parseResult.data;
    const offset = (filters.page - 1) * filters.pageSize;
    const whereClause = buildEmployeeWhereConditions(filters);
    const orderByClause = buildEmployeeOrderBy(filters.sort);

    const rows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        fullName: employees.fullName,
        email: employees.email,
        department: employees.department,
        level: employees.level,
        country: employees.country,
        localCurrency: employees.localCurrency,
        localBaseSalary: employees.localBaseSalary,
        localBonusTarget: employees.localBonusTarget,
        baseSalaryUsd: employees.baseSalaryUsd,
        bonusTargetUsd: employees.bonusTargetUsd,
        employmentStatus: employees.employmentStatus,
        hireDate: employees.hireDate,
        version: employees.version,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        totalCount: sql<number>`count(*) over()`.mapWith(Number),
      })
      .from(employees)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(filters.pageSize)
      .offset(offset);

    let totalCount = 0;
    if (rows.length > 0) {
      totalCount = rows[0].totalCount;
    } else if (offset > 0) {
      // In case the requested page is out of bounds, compute totalCount directly
      const [countResult] = await db
        .select({ count: count() })
        .from(employees)
        .where(whereClause);
      totalCount = countResult?.count ?? 0;
    }

    // Strip totalCount from individual employee row objects
    const cleanedRows = rows.map(({ totalCount: _, ...employee }) => employee);
    const totalPages = Math.ceil(totalCount / filters.pageSize);

    return reply.send({
      success: true,
      data: cleanedRows,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages,
      },
    });
  });

  /**
   * GET /api/employees/stats
   * Aggregates total headcount, payroll, median base salary, and active countries in a single query.
   */
  fastify.get('/stats', async (request, reply) => {
    const parseResult = StatsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid query parameters for stats',
        details: parseResult.error.flatten(),
      });
    }

    const filters = parseResult.data;
    const whereClause = buildEmployeeWhereConditions(filters);

    const [stats] = await db
      .select({
        totalHeadcount: sql<number>`count(*)`.mapWith(Number),
        totalPayrollUsd: sql<number>`coalesce(sum(${employees.baseSalaryUsd}::numeric), 0)`.mapWith(Number),
        medianBaseSalaryUsd: sql<number>`coalesce(percentile_cont(0.5) within group (order by ${employees.baseSalaryUsd}::numeric), 0)`.mapWith(Number),
        activeCountries: sql<number>`count(distinct ${employees.country})`.mapWith(Number),
      })
      .from(employees)
      .where(whereClause);

    return reply.send({
      success: true,
      stats: {
        totalHeadcount: stats?.totalHeadcount ?? 0,
        totalPayrollUsd: Math.round((stats?.totalPayrollUsd ?? 0) * 100) / 100,
        medianBaseSalaryUsd: Math.round((stats?.medianBaseSalaryUsd ?? 0) * 100) / 100,
        activeCountries: stats?.activeCountries ?? 0,
      },
    });
  });

  /**
   * GET /api/employees/analytics
   * Aggregated distributions across departments, countries, and levels
   */
  fastify.get('/analytics', async (_request, reply) => {
    const [departments, countries, levels] = await Promise.all([
      db
        .select({
          department: employees.department,
          headcount: sql<number>`count(*)`.mapWith(Number),
          totalPayroll: sql<number>`round(coalesce(sum(${employees.baseSalaryUsd}::numeric), 0), 2)`.mapWith(Number),
          avgSalary: sql<number>`round(coalesce(avg(${employees.baseSalaryUsd}::numeric), 0), 2)`.mapWith(Number),
          medianSalary: sql<number>`round(coalesce(percentile_cont(0.5) within group (order by ${employees.baseSalaryUsd}::numeric), 0)::numeric, 2)`.mapWith(Number),
        })
        .from(employees)
        .where(eq(employees.employmentStatus, 'active'))
        .groupBy(employees.department)
        .orderBy(sql`coalesce(sum(${employees.baseSalaryUsd}::numeric), 0) DESC`),
      db
        .select({
          country: employees.country,
          headcount: sql<number>`count(*)`.mapWith(Number),
          totalPayroll: sql<number>`round(coalesce(sum(${employees.baseSalaryUsd}::numeric), 0), 2)`.mapWith(Number),
          avgSalary: sql<number>`round(coalesce(avg(${employees.baseSalaryUsd}::numeric), 0), 2)`.mapWith(Number),
          medianSalary: sql<number>`round(coalesce(percentile_cont(0.5) within group (order by ${employees.baseSalaryUsd}::numeric), 0)::numeric, 2)`.mapWith(Number),
        })
        .from(employees)
        .where(eq(employees.employmentStatus, 'active'))
        .groupBy(employees.country)
        .orderBy(sql`count(*) DESC`),
      db
        .select({
          level: employees.level,
          headcount: sql<number>`count(*)`.mapWith(Number),
          avgSalary: sql<number>`round(coalesce(avg(${employees.baseSalaryUsd}::numeric), 0), 2)`.mapWith(Number),
          medianSalary: sql<number>`round(coalesce(percentile_cont(0.5) within group (order by ${employees.baseSalaryUsd}::numeric), 0)::numeric, 2)`.mapWith(Number),
        })
        .from(employees)
        .where(eq(employees.employmentStatus, 'active'))
        .groupBy(employees.level)
        .orderBy(employees.level),
    ]);

    return reply.send({
      success: true,
      data: {
        departments,
        countries,
        levels,
      },
    });
  });

  /**
   * GET /api/employees/:id
   * Fetch single employee by UUID
   */
  fastify.get('/:id', async (request, reply) => {
    const paramResult = EmployeeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid employee ID format',
        details: paramResult.error.flatten(),
      });
    }

    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, paramResult.data.id))
      .limit(1);

    if (!employee) {
      return reply.status(404).send({
        success: false,
        error: 'Employee not found',
      });
    }

    return reply.send({
      success: true,
      data: employee,
    });
  });

  /**
   * POST /api/employees
   * Create a new employee with transactional USD normalization
   */
  fastify.post('/', async (request, reply) => {
    const bodyResult = EmployeeCreateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: bodyResult.error.flatten(),
      });
    }

    const input = bodyResult.data;
    const fxRate = await getFxRate(input.localCurrency);
    const baseSalaryUsd = convertLocalToUsd(input.localBaseSalary, fxRate);
    const bonusTargetUsd = convertLocalToUsd(input.localBonusTarget, fxRate);

    // Generate unique employee code
    const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
    const employeeCode = `ACME-${uniqueSuffix}`;

    try {
      const newEmployee = await db.transaction(async (tx) => {
        const [emp] = await tx
          .insert(employees)
          .values({
            employeeCode,
            fullName: input.fullName,
            email: input.email.toLowerCase(),
            department: input.department,
            level: input.level,
            country: input.country,
            localCurrency: input.localCurrency,
            localBaseSalary: input.localBaseSalary.toFixed(2),
            localBonusTarget: input.localBonusTarget.toFixed(2),
            baseSalaryUsd,
            bonusTargetUsd,
            employmentStatus: input.employmentStatus,
            hireDate: input.hireDate,
            version: 1,
          })
          .returning();

        // Create initial revision entry in ledger
        await tx.insert(salaryRevisions).values({
          employeeId: emp.id,
          effectiveFrom: new Date(input.hireDate),
          effectiveTo: null,
          localBaseSalary: input.localBaseSalary.toFixed(2),
          localBonusTarget: input.localBonusTarget.toFixed(2),
          localCurrency: input.localCurrency,
          fxRateSnapshot: fxRate.toFixed(6),
          baseSalaryUsd,
          bonusTargetUsd,
          reason: 'Initial Hire Calibration',
          changedBy: 'system',
          createdAt: new Date(),
        });

        return emp;
      });

      return reply.status(201).send({
        success: true,
        data: newEmployee,
      });
    } catch (error: any) {
      request.log.error(error, 'Error creating employee');
      if (error?.code === '23505') {
        return reply.status(409).send({
          success: false,
          error: 'An employee with this email address already exists',
        });
      }
      return reply.status(500).send({
        success: false,
        error: 'Internal server error while creating employee',
      });
    }
  });

  /**
   * PATCH /api/employees/:id
   * Update an employee with:
   * 1. Optimistic Concurrency Control (OCC) via version column & If-Match header / body version.
   * 2. Bi-temporal append-only salary_revisions ledger updates.
   * 3. Automatic USD recalculation on compensation or currency changes.
   */
  fastify.patch('/:id', async (request, reply) => {
    const paramResult = EmployeeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid employee ID format',
        details: paramResult.error.flatten(),
      });
    }

    const bodyResult = EmployeeUpdateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: bodyResult.error.flatten(),
      });
    }

    const { id } = paramResult.data;
    const updates = bodyResult.data;

    // Detect version from body or If-Match header (e.g. If-Match: "2" or 2)
    const ifMatchHeader = request.headers['if-match'];
    let expectedVersion = updates.version;
    if (expectedVersion === undefined && ifMatchHeader) {
      const parsed = parseInt(String(ifMatchHeader).replace(/["']/g, ''), 10);
      if (!isNaN(parsed)) {
        expectedVersion = parsed;
      }
    }

    try {
      const result = await db.transaction(async (tx) => {
        // 1. Fetch current employee state (lock row with FOR UPDATE)
        const [existing] = await tx
          .select()
          .from(employees)
          .where(eq(employees.id, id))
          .for('update');

        if (!existing) {
          return { status: 404, payload: { success: false, error: 'Employee not found' } };
        }

        // 2. Optimistic Concurrency Control Check
        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          return {
            status: 409,
            payload: {
              success: false,
              error: 'CONCURRENT_MODIFICATION',
              message: `Record was modified by another user or session. Current database version is ${existing.version}, but request specified version ${expectedVersion}.`,
              currentVersion: existing.version,
              data: existing,
            },
          };
        }

        // 3. Currency and Compensation normalization
        const targetCurrency = updates.localCurrency || (existing.localCurrency as SupportedCurrency);
        const fxRate = await getFxRate(targetCurrency);

        const newLocalBase = updates.localBaseSalary !== undefined
          ? updates.localBaseSalary
          : parseFloat(existing.localBaseSalary);

        const newLocalBonus = updates.localBonusTarget !== undefined
          ? updates.localBonusTarget
          : parseFloat(existing.localBonusTarget);

        const baseSalaryUsd = convertLocalToUsd(newLocalBase, fxRate);
        const bonusTargetUsd = convertLocalToUsd(newLocalBonus, fxRate);

        // Check if compensation or currency actually changed
        const isCompChanged =
          (updates.localBaseSalary !== undefined && updates.localBaseSalary.toFixed(2) !== existing.localBaseSalary) ||
          (updates.localBonusTarget !== undefined && updates.localBonusTarget.toFixed(2) !== existing.localBonusTarget) ||
          (updates.localCurrency !== undefined && updates.localCurrency !== existing.localCurrency);

        // 4. Bi-Temporal Ledger: Close previous revision and append new revision if compensation changed
        if (isCompChanged) {
          const now = new Date();
          // Close active revision
          await tx
            .update(salaryRevisions)
            .set({ effectiveTo: now })
            .where(and(eq(salaryRevisions.employeeId, id), isNull(salaryRevisions.effectiveTo)));

          // Insert new revision
          await tx.insert(salaryRevisions).values({
            employeeId: id,
            effectiveFrom: now,
            effectiveTo: null,
            localBaseSalary: newLocalBase.toFixed(2),
            localBonusTarget: newLocalBonus.toFixed(2),
            localCurrency: targetCurrency,
            fxRateSnapshot: fxRate.toFixed(6),
            baseSalaryUsd,
            bonusTargetUsd,
            reason: updates.revisionReason ?? 'Compensation adjustment',
            changedBy: updates.changedBy ?? 'HR Operations',
            createdAt: now,
          });
        }

        // 5. Increment version and update employee record
        const nextVersion = existing.version + 1;
        const [updated] = await tx
          .update(employees)
          .set({
            fullName: updates.fullName ?? existing.fullName,
            email: updates.email ? updates.email.toLowerCase() : existing.email,
            department: updates.department ?? existing.department,
            level: updates.level ?? existing.level,
            country: updates.country ?? existing.country,
            localCurrency: targetCurrency,
            localBaseSalary: newLocalBase.toFixed(2),
            localBonusTarget: newLocalBonus.toFixed(2),
            baseSalaryUsd,
            bonusTargetUsd,
            employmentStatus: updates.employmentStatus ?? existing.employmentStatus,
            hireDate: updates.hireDate ?? existing.hireDate,
            version: nextVersion,
            updatedAt: new Date(),
          })
          .where(eq(employees.id, id))
          .returning();

        return { status: 200, payload: { success: true, data: updated } };
      });

      return reply.status(result.status).send(result.payload);
    } catch (error: any) {
      request.log.error(error, 'Error updating employee');
      if (error?.code === '23505') {
        return reply.status(409).send({
          success: false,
          error: 'Email conflict with another employee',
        });
      }
      return reply.status(500).send({
        success: false,
        error: 'Failed to update employee',
      });
    }
  });

  /**
   * GET /api/employees/:id/revisions
   * Fetch complete bi-temporal compensation revision history for an employee
   */
  fastify.get('/:id/revisions', async (request, reply) => {
    const paramResult = EmployeeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid employee ID format',
        details: paramResult.error.flatten(),
      });
    }

    const { id } = paramResult.data;

    const revisions = await db
      .select()
      .from(salaryRevisions)
      .where(eq(salaryRevisions.employeeId, id))
      .orderBy(desc(salaryRevisions.effectiveFrom), desc(salaryRevisions.createdAt));

    return reply.send({
      success: true,
      data: revisions,
    });
  });

  /**
   * DELETE /api/employees/:id
   * Soft delete employee by marking status as 'terminated'
   */
  fastify.delete('/:id', async (request, reply) => {
    const paramResult = EmployeeIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid employee ID format',
        details: paramResult.error.flatten(),
      });
    }

    const { id } = paramResult.data;

    const [existing] = await db
      .select({ id: employees.id, status: employees.employmentStatus })
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: 'Employee not found',
      });
    }

    const [updated] = await db
      .update(employees)
      .set({
        employmentStatus: 'terminated',
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();

    return reply.send({
      success: true,
      message: 'Employee employment status updated to terminated',
      data: updated,
    });
  });
};
