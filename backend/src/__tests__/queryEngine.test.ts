import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateQueryPlan,
  getLLMProvider,
  GroqProviderStrategy,
  OpenAIProviderStrategy,
  FallbackProviderStrategy,
} from '../ai/llmProvider.js';
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

  describe('LLM Provider Strategy Pattern', () => {
    it('resolves GroqProviderStrategy when provider is "groq" or default', () => {
      delete process.env.LLM_PROVIDER;
      const defaultProvider = getLLMProvider();
      expect(defaultProvider).toBeInstanceOf(GroqProviderStrategy);
      expect(defaultProvider.name).toBe('groq');

      const explicitGroq = getLLMProvider('groq');
      expect(explicitGroq).toBeInstanceOf(GroqProviderStrategy);
    });

    it('resolves OpenAIProviderStrategy when provider is "openai"', () => {
      const openAiProvider = getLLMProvider('openai');
      expect(openAiProvider).toBeInstanceOf(OpenAIProviderStrategy);
      expect(openAiProvider.name).toBe('openai');
    });

    it('resolves FallbackProviderStrategy when provider is "fallback" or "offline"', () => {
      const fallbackProvider = getLLMProvider('fallback');
      expect(fallbackProvider).toBeInstanceOf(FallbackProviderStrategy);
      expect(fallbackProvider.name).toBe('fallback');
      expect(fallbackProvider.isAvailable()).toBe(true);
    });

    it('switches strategy seamlessly via LLM_PROVIDER environment variable', () => {
      process.env.LLM_PROVIDER = 'openai';
      const provider = getLLMProvider();
      expect(provider).toBeInstanceOf(OpenAIProviderStrategy);
      expect(provider.name).toBe('openai');
    });

    it('OpenAIProviderStrategy correctly calls API and parses plan', async () => {
      const openAi = new OpenAIProviderStrategy();
      process.env.OPENAI_API_KEY = 'sk-test-mock-key';

      // Mock global fetch for OpenAI API
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sql: 'SELECT department, AVG(base_salary_usd) FROM employees GROUP BY department LIMIT 100',
                  explanation: 'Department average base salary comparison.',
                  visualizationType: 'comparison',
                }),
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const plan = await openAi.generatePlan('Average salary by department');
      expect(mockFetch).toHaveBeenCalled();
      expect(plan.sql).toContain('AVG(base_salary_usd)');
      expect(plan.visualizationType).toBe('comparison');
    });
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

    it('correctly resolves individual employee salary query for named person in fallback parser', async () => {
      delete process.env.GROQ_API_KEY;

      const plan1 = await generateQueryPlan('salary of Magnus Davis');
      expect(plan1.sql).toContain('full_name ILIKE \'%Magnus Davis%\'');
      expect(plan1.sql).toContain('LIMIT 5');
      expect(plan1.explanation).toContain('Magnus Davis');

      const plan2 = await generateQueryPlan('What is the salary of Magnus Davis?');
      expect(plan2.sql).toContain('full_name ILIKE \'%Magnus Davis%\'');

      const plan3 = await generateQueryPlan('ACME-01964 salary');
      expect(plan3.sql).toContain("employee_code = 'ACME-01964'");
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
