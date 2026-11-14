import { readonlySql } from '../db/index.js';
import type { AIQueryRequest, AIQueryResponse } from './types.js';
import { SqlValidationError, QueryCostExceededError } from './types.js';
import { generateQueryPlan } from './llmProvider.js';
import { validateSql } from './sqlValidator.js';
import { evaluateQueryCost } from './queryCostEvaluator.js';
import { queryCache } from './queryCache.js';

/**
 * Orchestrates the full Safe AI Text-to-SQL execution pipeline:
 *
 * 1. Semantic Cache: Checks normalized query cache to bypass LLM & DB on duplicate questions (<2ms).
 * 2. Plan Generation: Prompts the LLM provider (or fallback keyword parser) to produce an SQL plan and explanation.
 * 3. AST Safety Validation: Deterministically validates generated SQL through AST/lexer safety checks.
 * 4. Pre-Flight EXPLAIN Cost Gate: Runs EXPLAIN (FORMAT JSON) to calculate the PostgreSQL planner's Total Cost.
 *    Rejects queries exceeding the 5,000 cost budget (e.g. Cartesian products) before execution.
 * 5. Read-Only Execution: Executes the sanitized SQL query against the dedicated read-only database pool.
 * 6. Cache Insertion: Stores successful queries in the LRU cache.
 */
export async function executeAIQuery(question: string): Promise<AIQueryResponse> {
  const trimmedQuestion = question?.trim();
  if (!trimmedQuestion) {
    throw new Error('Question must be a non-empty string');
  }

  // Step 1: Check normalized query cache
  const cachedResponse = queryCache.get(trimmedQuestion);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Step 2: Generate SQL plan via Groq or fallback parser
  const plan = await generateQueryPlan(trimmedQuestion);

  // Step 3: Validate generated SQL via deterministic AST/lexer validator
  const validation = validateSql(plan.sql);
  if (!validation.valid) {
    throw new SqlValidationError(validation.reason, plan.sql);
  }

  // Step 4: Pre-flight EXPLAIN Cost Gate circuit breaker
  const costEvaluation = await evaluateQueryCost(validation.sanitizedSql);

  // Step 5: Execute validated SQL against read-only database connection
  const startTime = performance.now();
  let rawRows: any;

  try {
    rawRows = await readonlySql.unsafe(validation.sanitizedSql);
  } catch (dbError: any) {
    throw new Error(`Database query execution failed: ${dbError?.message || dbError}`);
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  // Step 6: Extract columns and format rows
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

  const response: AIQueryResponse = {
    answerSummary,
    columns,
    rows,
    generatedSql: validation.sanitizedSql,
    executionTimeMs,
    visualizationType: plan.visualizationType,
    cached: false,
    planCost: costEvaluation.estimatedCost,
  };

  // Step 7: Store in semantic cache
  queryCache.set(trimmedQuestion, response);

  return response;
}

/**
 * Convenience wrapper accepting an AIQueryRequest payload
 */
export async function processAIQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
  return executeAIQuery(request.question);
}
