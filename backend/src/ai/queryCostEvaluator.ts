import { readonlySql } from '../db/index.js';
import { QueryCostExceededError } from './types.js';

export const DEFAULT_MAX_COST_BUDGET = 5000;

export interface CostEvaluationResult {
  allowed: boolean;
  estimatedCost: number;
  planRows: number;
  rootNodeType: string;
}

/**
 * Pre-flight PostgreSQL EXPLAIN cost evaluator.
 * Acts as an SDE-2 database circuit breaker:
 * Before letting any LLM-generated SQL touch the database engine,
 * runs EXPLAIN (FORMAT JSON) to calculate the PostgreSQL planner's Total Cost.
 * If the estimated cost exceeds the safety budget (e.g., unbounded Cartesian products or full table cross joins),
 * it rejects execution immediately without scanning a single row.
 */
export async function evaluateQueryCost(
  sanitizedSql: string,
  maxBudget: number = DEFAULT_MAX_COST_BUDGET
): Promise<CostEvaluationResult> {
  const explainSql = `EXPLAIN (FORMAT JSON) ${sanitizedSql}`;

  let explainResult: any;
  try {
    explainResult = await readonlySql.unsafe(explainSql);
  } catch (err: any) {
    throw new Error(`Failed to evaluate query cost via EXPLAIN: ${err?.message || err}`);
  }

  const queryPlan = explainResult?.[0]?.['QUERY PLAN']?.[0]?.['Plan'];
  if (!queryPlan) {
    throw new Error('PostgreSQL planner returned empty or unrecognized EXPLAIN plan');
  }

  const estimatedCost = Number(queryPlan['Total Cost'] ?? 0);
  const planRows = Number(queryPlan['Plan Rows'] ?? 0);
  const rootNodeType = String(queryPlan['Node Type'] ?? 'Unknown');

  if (estimatedCost > maxBudget) {
    throw new QueryCostExceededError(estimatedCost, maxBudget);
  }

  return {
    allowed: true,
    estimatedCost,
    planRows,
    rootNodeType,
  };
}
