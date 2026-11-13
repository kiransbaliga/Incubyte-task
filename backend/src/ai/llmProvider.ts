import Groq from 'groq-sdk';
import type { LLMGeneratedPlan, VisualizationType } from './types.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { parseFallbackQuery } from './fallbackParser.js';

/**
 * Strategy Interface for LLM Inference Providers.
 * Allows hot-swapping between Groq, OpenAI, Anthropic, or offline fallback
 * without altering any query orchestration logic.
 */
export interface LLMProviderStrategy {
  readonly name: string;
  isAvailable(): boolean;
  generatePlan(question: string): Promise<LLMGeneratedPlan>;
}

/**
 * Helper to parse and validate structured JSON output from LLM responses
 */
function parseStructuredPlan(rawContent: string): LLMGeneratedPlan {
  const parsed = JSON.parse(rawContent);

  if (!parsed.sql || typeof parsed.sql !== 'string') {
    throw new Error('LLM structured output missing "sql" string field');
  }

  const validVisualizations: VisualizationType[] = ['table', 'metric', 'comparison'];
  const visualizationType: VisualizationType = validVisualizations.includes(parsed.visualizationType)
    ? parsed.visualizationType
    : 'table';

  return {
    sql: parsed.sql.trim(),
    explanation: typeof parsed.explanation === 'string' && parsed.explanation.trim()
      ? parsed.explanation.trim()
      : 'Query generated to answer your compensation inquiry.',
    visualizationType,
  };
}

/**
 * Strategy 1: Groq Cloud Provider (LPU Fast Inference)
 */
export class GroqProviderStrategy implements LLMProviderStrategy {
  public readonly name = 'groq';

  isAvailable(): boolean {
    return Boolean(process.env.GROQ_API_KEY?.trim());
  }

  async generatePlan(question: string): Promise<LLMGeneratedPlan> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const model = process.env.GROQ_MODEL?.trim() || process.env.LLM_MODEL?.trim() || 'llama-3.3-70b-versatile';
    const timeoutMs = parseInt(process.env.GROQ_TIMEOUT_MS || process.env.LLM_TIMEOUT_MS || '6000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const groq = new Groq({ apiKey });

      const completion = await groq.chat.completions.create(
        {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
          ],
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        { signal: controller.signal }
      );

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Received empty response body from Groq inference');
      }

      return parseStructuredPlan(rawContent);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Strategy 2: OpenAI Provider (GPT-4o / GPT-4o-mini)
 * Uses native fetch with standard OpenAI Chat Completions API.
 * Also supports custom OPENAI_BASE_URL (for Ollama, vLLM, DeepSeek, Azure).
 */
export class OpenAIProviderStrategy implements LLMProviderStrategy {
  public readonly name = 'openai';

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  async generatePlan(question: string): Promise<LLMGeneratedPlan> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = process.env.OPENAI_MODEL?.trim() || process.env.LLM_MODEL?.trim() || 'gpt-4o-mini';
    const timeoutMs = parseInt(process.env.OPENAI_TIMEOUT_MS || process.env.LLM_TIMEOUT_MS || '8000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API returned HTTP ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Received empty response body from OpenAI');
      }

      return parseStructuredPlan(rawContent);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Strategy 3: Deterministic Offline Fallback Provider
 */
export class FallbackProviderStrategy implements LLMProviderStrategy {
  public readonly name = 'fallback';

  isAvailable(): boolean {
    return true; // Always available
  }

  async generatePlan(question: string): Promise<LLMGeneratedPlan> {
    return parseFallbackQuery(question);
  }
}

/**
 * Provider Factory: Resolves the active LLM Provider Strategy
 * Based on the LLM_PROVIDER environment variable or explicit argument.
 */
export function getLLMProvider(providerName?: string): LLMProviderStrategy {
  const selected = (providerName || process.env.LLM_PROVIDER || 'groq').toLowerCase().trim();

  switch (selected) {
    case 'openai':
      return new OpenAIProviderStrategy();
    case 'groq':
      return new GroqProviderStrategy();
    case 'fallback':
    case 'offline':
      return new FallbackProviderStrategy();
    default:
      console.warn(`[AI Engine] Unknown LLM_PROVIDER "${selected}", defaulting to Groq`);
      return new GroqProviderStrategy();
  }
}

/**
 * Main entry point: Generates query plan via the selected provider strategy.
 * If the selected provider is not available or encounters a runtime error,
 * automatically falls back to FallbackProviderStrategy to guarantee zero-crash execution.
 */
export async function generateQueryPlan(
  question: string,
  preferredProvider?: string
): Promise<LLMGeneratedPlan> {
  const provider = getLLMProvider(preferredProvider);

  if (!provider.isAvailable()) {
    // If preferred provider has no API key set, use fallback silently
    return parseFallbackQuery(question);
  }

  try {
    return await provider.generatePlan(question);
  } catch (error: any) {
    console.warn(
      `[AI Engine] ${provider.name} provider failed: ${error?.message || error}. Falling back to deterministic parser.`
    );
    return parseFallbackQuery(question);
  }
}
