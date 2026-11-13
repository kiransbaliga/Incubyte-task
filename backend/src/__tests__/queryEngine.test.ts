import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQueryPlan } from '../ai/llmProvider.js';
import { executeAIQuery } from '../ai/queryEngine.js';
import { SqlValidationError } from '../ai/types.js';

describe('AI Query Engine & LLM Provider Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateQueryPlan Offline Fallback', () => {
    it('gracefully uses fallback parser when GROQ_API_KEY is not set', async () => {
      delete process.env.GROQ_API_KEY;

      const plan = await generateQueryPlan('Top 5 highest earners in Engineering');
      expect(plan).toBeDefined();
      expect(plan.sql).toContain('SELECT full_name');
      expect(plan.sql).toContain('Engineering');
      expect(plan.visualizationType).toBe('table');
      expect(plan.explanation).toBeDefined();
    });

    it('gracefully uses fallback parser when Groq SDK call fails', async () => {
      process.env.GROQ_API_KEY = 'invalid-dummy-key';

      // Will attempt and fail/timeout, then gracefully fall back without throwing
      const plan = await generateQueryPlan('Average salary by department');
      expect(plan).toBeDefined();
      expect(plan.sql).toContain('AVG(base_salary_usd)');
      expect(plan.visualizationType).toBe('comparison');
    });
  });

  describe('executeAIQuery Validation Gate', () => {
    it('throws error for empty question', async () => {
      await expect(executeAIQuery('')).rejects.toThrow('Question must be a non-empty string');
      await expect(executeAIQuery('   ')).rejects.toThrow('Question must be a non-empty string');
    });
  });
});
