import Groq from 'groq-sdk';
import type { LLMGeneratedPlan, VisualizationType } from './types.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { parseFallbackQuery } from './fallbackParser.js';

/**
 * Generates an analytical SQL query plan using Groq Cloud API with LPU inference.
 * Falls back transparently to the deterministic keyword parser if:
 * 1. GROQ_API_KEY environment variable is not configured.
 * 2. Groq API request fails (rate-limit, timeout, network error, or invalid JSON).
 */
export async function generateQueryPlan(question: string): Promise<LLMGeneratedPlan> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  // If no Groq API key is present, use deterministic offline fallback immediately
  if (!apiKey) {
    return parseFallbackQuery(question);
  }

  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  const controller = new AbortController();
  const timeoutMs = parseInt(process.env.GROQ_TIMEOUT_MS || '6000', 10);
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
  } catch (error: any) {
    console.warn(`[AI Engine] Groq API call failed or timed out: ${error?.message || error}. Falling back to deterministic parser.`);
    return parseFallbackQuery(question);
  } finally {
    clearTimeout(timeoutId);
  }
}
