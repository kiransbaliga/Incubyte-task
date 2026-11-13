import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';

describe('Fastify HTTP Server & API Route Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health check endpoint', () => {
    it('GET /health returns 200 and status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.status).toBe('ok');
      expect(json.service).toBe('acme-compensation-backend');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('404 Route handling', () => {
    it('returns 404 with structured JSON for nonexistent route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Route GET:/api/nonexistent not found');
    });
  });

  describe('Validation & Safety Guards on Employee Routes', () => {
    it('GET /api/employees rejects invalid pageSize (>100) with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/employees?pageSize=500',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid query parameters');
    });

    it('GET /api/employees rejects negative page (<1) with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/employees?page=0',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
    });

    it('GET /api/employees/:id rejects malformed non-UUID with 400', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/employees/123-not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid employee ID format');
    });

    it('POST /api/employees rejects missing required fields with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/employees',
        payload: {
          fullName: 'John Doe',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
    });

    it('POST /api/employees rejects negative salary with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/employees',
        payload: {
          fullName: 'Jane Doe',
          email: 'jane.doe@acme.com',
          department: 'Engineering',
          level: 'L3',
          country: 'US',
          localCurrency: 'USD',
          localBaseSalary: -50000,
          hireDate: '2024-01-15',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
    });

    it('PATCH /api/employees/:id rejects non-UUID id with 400', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/employees/bad-id',
        payload: { localBaseSalary: 95000 },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.success).toBe(false);
    });
  });
});
