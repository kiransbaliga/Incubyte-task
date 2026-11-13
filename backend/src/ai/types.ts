/**
 * Types and interfaces for the Safe AI Text-to-SQL Query Engine
 */

export type VisualizationType = 'table' | 'metric' | 'comparison';

export interface AIQueryRequest {
  question: string;
}

export interface AIQueryResponse {
  answerSummary: string;
  columns: string[];
  rows: Record<string, any>[];
  generatedSql: string;
  executionTimeMs: number;
  visualizationType: VisualizationType;
}

export interface LLMGeneratedPlan {
  sql: string;
  explanation: string;
  visualizationType: VisualizationType;
}

export type ValidationResult =
  | { valid: true; sanitizedSql: string }
  | { valid: false; reason: string };

export class SqlValidationError extends Error {
  public readonly reason: string;
  public readonly rawSql?: string;

  constructor(reason: string, rawSql?: string) {
    super(`SQL Validation Error: ${reason}`);
    this.name = 'SqlValidationError';
    this.reason = reason;
    this.rawSql = rawSql;
  }
}
