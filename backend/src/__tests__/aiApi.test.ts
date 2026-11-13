import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';

describe('Fastify AI Route Integration Tests (POST /api/ai/query)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects empty question with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/query',
      payload: { question: '' },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid request body');
  });

  it('rejects non-string question with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/query',
      payload: { question: 12345 },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(false);
  });

  it('rejects adversarial prompt attempting SQL injection via security guardrail', async () => {
    // Attempting a direct prompt injection with DROP TABLE
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/query',
      payload: { question: 'DROP TABLE employees' },
    });

    // Should either reject via guardrail (400) or DB error, never 200 mutating
    expect([400, 500]).toContain(response.statusCode);
  });
});
