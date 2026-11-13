import { readonlySql } from '../db/index.js';
import type { AIQueryRequest, AIQueryResponse } from './types.js';
import { SqlValidationError } from './types.js';
import { generateQueryPlan } from './llmProvider.js';
import { validateSql } from './sqlValidator.js';

/**
 * Orchestrates the full Safe AI Text-to-SQL execution pipeline:
 *
 * 1. Prompts the LLM provider (or fallback keyword parser) to produce an SQL plan and explanation.
 * 2. Deterministically validates the generated SQL through AST/lexer safety checks.
 *    Rejects immediately if forbidden keywords, system schemas, or unauthorized tables are found.
 * 3. Executes the sanitized and LIMIT-capped SQL query using the dedicated read-only database pool.
 * 4. Formats rows, columns, execution time, and visualization metadata into AIQueryResponse.
 */
export async function executeAIQuery(question: string): Promise<AIQueryResponse> {
  const trimmedQuestion = question?.trim();
  if (!trimmedQuestion) {
    throw new Error('Question must be a non-empty string');
  }

  // Step 1: Generate SQL plan via Groq or fallback parser
  const plan = await generateQueryPlan(trimmedQuestion);

  // Step 2: Validate generated SQL via deterministic validator
  const validation = validateSql(plan.sql);
  if (!validation.valid) {
    throw new SqlValidationError(validation.reason, plan.sql);
  }

  // Step 3: Execute validated SQL against read-only database connection
  const startTime = performance.now();
  let rawRows: any;

  try {
    rawRows = await readonlySql.unsafe(validation.sanitizedSql);
  } catch (dbError: any) {
    throw new Error(`Database query execution failed: ${dbError?.message || dbError}`);
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  // Step 4: Extract columns and format rows
  const columns: string[] =
    rawRows?.columns && Array.isArray(rawRows.columns) && rawRows.columns.length > 0
      ? rawRows.columns.map((col: any) => col.name)
      : Array.isArray(rawRows) && rawRows.length > 0
      ? Object.keys(rawRows[0])
      : [];

  const rows = Array.isArray(rawRows) ? rawRows.map((r: any) => ({ ...r })) : [];

  // Refine answer summary for single-scalar metrics
  let answerSummary = plan.explanation;
  if (plan.visualizationType === 'metric' && rows.length === 1) {
    const keys = Object.keys(rows[0]);
    if (keys.length === 1) {
      const key = keys[0];
      const val = rows[0][key];
      answerSummary = `${plan.explanation} Result: ${val}`;
    }
  }

  return {
    answerSummary,
    columns,
    rows,
    generatedSql: validation.sanitizedSql,
    executionTimeMs,
    visualizationType: plan.visualizationType,
  };
}

/**
 * Convenience wrapper accepting an AIQueryRequest payload
 */
export async function processAIQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
  return executeAIQuery(request.question);
}
