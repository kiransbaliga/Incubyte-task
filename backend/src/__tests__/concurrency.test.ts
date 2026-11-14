import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { db } from '../db/index.js';
import { employees, salaryRevisions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Optimistic Concurrency Control (OCC) & Bi-Temporal Salary Ledger Tests', () => {
  let app: FastifyInstance;
  let testEmployeeId: string;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    // Create a dedicated employee for concurrency & ledger tests
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/employees',
      payload: {
        fullName: 'Concurrency Test Engineer',
        email: `concurrency.test.${Date.now()}@acme.corp`,
        department: 'Engineering',
        level: 'L4',
        country: 'US',
        localCurrency: 'USD',
        localBaseSalary: 150000,
        localBonusTarget: 25000,
        employmentStatus: 'active',
        hireDate: '2023-01-15',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const body = JSON.parse(createRes.payload);
    testEmployeeId = body.data.id;
    expect(body.data.version).toBe(1);
  });

  afterAll(async () => {
    if (testEmployeeId) {
      await db.delete(salaryRevisions).where(eq(salaryRevisions.employeeId, testEmployeeId));
      await db.delete(employees).where(eq(employees.id, testEmployeeId));
    }
    await app.close();
  });

  it('verifies initial salary_revisions entry was created with effective_to = NULL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/employees/${testEmployeeId}/revisions`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);

    const initialRev = body.data[0];
    expect(initialRev.effectiveTo).toBeNull();
    expect(Number(initialRev.baseSalaryUsd)).toBe(150000);
    expect(initialRev.reason).toBe('Initial Hire Calibration');
  });

  it('simulates concurrent conflicting writes (OCC): exactly one succeeds, one gets 409 Conflict', async () => {
    // Both Client A and Client B read version 1
    const currentRes = await app.inject({
      method: 'GET',
      url: `/api/employees/${testEmployeeId}`,
    });
    const current = JSON.parse(currentRes.payload).data;
    expect(current.version).toBe(1);

    // Client A and Client B concurrently send updates with expected version = 1
    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'PATCH',
        url: `/api/employees/${testEmployeeId}`,
        payload: {
          version: 1,
          localBaseSalary: 165000,
          revisionReason: 'Manager Promotion Review',
          changedBy: 'Manager A',
        },
      }),
      app.inject({
        method: 'PATCH',
        url: `/api/employees/${testEmployeeId}`,
        payload: {
          version: 1,
          localBaseSalary: 170000,
          revisionReason: 'HR Compensation Adjustment',
          changedBy: 'HR Partner B',
        },
      }),
    ]);

    const statusCodes = [resA.statusCode, resB.statusCode].sort();
    // One MUST be 200 (Success) and the other MUST be 409 (Conflict)
    expect(statusCodes).toEqual([200, 409]);

    const conflictRes = resA.statusCode === 409 ? resA : resB;
    const successRes = resA.statusCode === 200 ? resA : resB;

    const conflictBody = JSON.parse(conflictRes.payload);
    expect(conflictBody.success).toBe(false);
    expect(conflictBody.error).toBe('CONCURRENT_MODIFICATION');
    expect(conflictBody.currentVersion).toBe(2);

    const successBody = JSON.parse(successRes.payload);
    expect(successBody.data.version).toBe(2);
  });

  it('supports OCC via standard HTTP If-Match header', async () => {
    // Attempt update with stale If-Match header (expecting version 1 when DB is at 2)
    const staleRes = await app.inject({
      method: 'PATCH',
      url: `/api/employees/${testEmployeeId}`,
      headers: {
        'if-match': '"1"',
      },
      payload: {
        fullName: 'Stale Update Name',
      },
    });

    expect(staleRes.statusCode).toBe(409);
    const staleBody = JSON.parse(staleRes.payload);
    expect(staleBody.error).toBe('CONCURRENT_MODIFICATION');
    expect(staleBody.currentVersion).toBe(2);

    // Now update with matching If-Match header
    const validRes = await app.inject({
      method: 'PATCH',
      url: `/api/employees/${testEmployeeId}`,
      headers: {
        'if-match': '"2"',
      },
      payload: {
        localBaseSalary: 180000,
        revisionReason: 'Annual Equity Calibration',
        changedBy: 'Compensation Director',
      },
    });

    expect(validRes.statusCode).toBe(200);
    const validBody = JSON.parse(validRes.payload);
    expect(validBody.data.version).toBe(3);
    expect(Number(validBody.data.baseSalaryUsd)).toBe(180000);
  });

  it('verifies append-only timeline immutability across multiple revisions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/employees/${testEmployeeId}/revisions`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    // We should now have 3 revisions: Initial, First Merit, and Annual Equity
    expect(body.data.length).toBe(3);

    // Latest active revision has effectiveTo === null
    const latestActive = body.data[0];
    expect(latestActive.effectiveTo).toBeNull();
    expect(Number(latestActive.baseSalaryUsd)).toBe(180000);
    expect(latestActive.reason).toBe('Annual Equity Calibration');

    // Historical revisions have non-null effectiveTo (closed point-in-time intervals)
    const previousRev = body.data[1];
    expect(previousRev.effectiveTo).not.toBeNull();
    expect(previousRev.effectiveFrom).toBeDefined();

    const initialRev = body.data[2];
    expect(initialRev.effectiveTo).not.toBeNull();
    expect(initialRev.reason).toBe('Initial Hire Calibration');
  });

  it('increments version for non-compensation updates without appending salary revision', async () => {
    const prevRevCountRes = await app.inject({
      method: 'GET',
      url: `/api/employees/${testEmployeeId}/revisions`,
    });
    const prevRevCount = JSON.parse(prevRevCountRes.payload).data.length;

    // Update non-compensation field (department)
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/employees/${testEmployeeId}`,
      payload: {
        version: 3,
        department: 'Product',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.payload);
    expect(updateBody.data.version).toBe(4);
    expect(updateBody.data.department).toBe('Product');

    // Revision count should NOT have changed
    const postRevCountRes = await app.inject({
      method: 'GET',
      url: `/api/employees/${testEmployeeId}/revisions`,
    });
    const postRevCount = JSON.parse(postRevCountRes.payload).data.length;
    expect(postRevCount).toBe(prevRevCount);
  });
});
