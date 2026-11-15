import type { ValidationResult } from './types.js';

/**
 * Blocklist of forbidden DDL/DML and administrative SQL keywords.
 */
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'COPY',
  'EXECUTE',
  'CREATE',
  'MERGE',
  'CALL',
  'REINDEX',
  'VACUUM',
  'DO',
] as const;

/**
 * Blocklist of dangerous PostgreSQL functions that could lead to DoS, remote execution, or data exfiltration.
 */
const DANGEROUS_FUNCTIONS = [
  'pg_sleep',
  'pg_terminate_backend',
  'pg_cancel_backend',
  'lo_import',
  'lo_export',
  'dblink',
  'pg_read_file',
  'pg_write_file',
  'query_to_xml',
] as const;

/**
 * Whitelisted physical database relations in ACME Compensation Hub.
 */
const ALLOWED_TABLES = new Set(['employees', 'fx_rates', 'salary_revisions']);

/**
 * Safely strips single-line (-- ...) and multi-line (/* ... *\/) comments from SQL.
 * Preserves text inside single and double quotes.
 */
export function stripComments(sql: string): string {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      if (char === '\n' || char === '\r') {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // skip '/'
      }
      continue;
    }

    if (char === "'" && !inDouble) {
      if (inSingle && nextChar === "'") {
        result += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
      result += char;
      continue;
    }

    if (char === '"' && !inSingle) {
      if (inDouble && nextChar === '"') {
        result += '""';
        i++;
        continue;
      }
      inDouble = !inDouble;
      result += char;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    result += char;
  }

  if (inBlockComment) {
    throw new Error('Unterminated block comment detected');
  }

  return result;
}

/**
 * Replaces characters inside single-quoted string literals with spaces.
 * This prevents data constants (e.g. email = 'drop@example.com') from triggering keyword blocklists.
 */
export function maskStringLiterals(sql: string): string {
  let result = '';
  let inSingle = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (char === "'") {
      if (inSingle && nextChar === "'") {
        result += '  ';
        i++;
        continue;
      }
      inSingle = !inSingle;
      result += ' ';
      continue;
    }

    if (inSingle) {
      result += ' ';
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Checks whether an unquoted semicolon exists in the SQL string.
 */
function hasUnquotedSemicolon(sql: string): boolean {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (char === "'" && !inDouble) {
      if (inSingle && nextChar === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      if (inDouble && nextChar === '"') {
        i++;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }

    if (char === ';' && !inSingle && !inDouble) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts CTE names from WITH clauses.
 */
function extractCteNames(noStringsSql: string): string[] {
  const ctes: string[] = [];
  const cteRegex = /(?:WITH\s+(?:RECURSIVE\s+)?|,\s*)([a-zA-Z0-9_"]+)\s+AS\s*\(/gi;
  let match;
  while ((match = cteRegex.exec(noStringsSql)) !== null) {
    if (match[1]) {
      const cleanName = match[1].replace(/"/g, '').toLowerCase();
      ctes.push(cleanName);
    }
  }
  return ctes;
}

/**
 * Cleans an identifier by removing double quotes and public schema qualification.
 */
function normalizeIdentifier(raw: string): string {
  let cleaned = raw.trim();
  // Strip quotes: "public"."employees" -> public.employees
  cleaned = cleaned.replace(/^"|"$/g, '');
  cleaned = cleaned.replace(/^public\./i, '');
  cleaned = cleaned.replace(/^"public"\./i, '');
  cleaned = cleaned.replace(/^"|"$/g, '');
  return cleaned.toLowerCase();
}

/**
 * Extracts all table/relation references in FROM and JOIN clauses.
 */
function extractReferencedTables(noStringsSql: string): string[] {
  const tables: string[] = [];

  // Match JOIN <table_name>
  const joinRegex = /\b(?:JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|CROSS\s+JOIN|FULL\s+JOIN|OUTER\s+JOIN)\s+([a-zA-Z0-9_".]+)/gi;
  let match;
  while ((match = joinRegex.exec(noStringsSql)) !== null) {
    if (match[1] && !match[1].startsWith('(')) {
      tables.push(normalizeIdentifier(match[1]));
    }
  }

  // Match FROM clauses
  const fromRegex = /\bFROM\s+([^()]+?)(?=\bWHERE\b|\bGROUP\b|\bHAVING\b|\bORDER\b|\bLIMIT\b|\bJOIN\b|\bWINDOW\b|\bUNION\b|\)|$)/gi;
  while ((match = fromRegex.exec(noStringsSql)) !== null) {
    const fromClause = match[1].trim();
    const items = fromClause.split(',');
    for (const item of items) {
      const trimmedItem = item.trim();
      if (!trimmedItem || trimmedItem.startsWith('(')) continue;
      const token = trimmedItem.split(/\s+/)[0];
      if (token && !token.startsWith('(')) {
        tables.push(normalizeIdentifier(token));
      }
    }
  }

  // Direct FROM match for simple cases
  const directFromRegex = /\bFROM\s+([a-zA-Z0-9_".]+)/gi;
  while ((match = directFromRegex.exec(noStringsSql)) !== null) {
    if (match[1] && !match[1].startsWith('(')) {
      const normalized = normalizeIdentifier(match[1]);
      if (!tables.includes(normalized)) {
        tables.push(normalized);
      }
    }
  }

  return tables;
}

/**
 * Enforces LIMIT <= 100:
 * - Caps any LIMIT > 100 to LIMIT 100.
 * - Injects LIMIT 100 at the outer statement level if missing.
 */
export function enforceLimit(sql: string): string {
  // 1. Cap all LIMIT clauses > 100 to 100 (only outside single quotes)
  let cappedSql = '';
  let inSingle = false;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    if (char === "'") {
      if (inSingle && sql[i + 1] === "'") {
        cappedSql += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      cappedSql += char;
      i++;
      continue;
    }

    if (!inSingle) {
      const sub = sql.slice(i);
      const limitMatch = sub.match(/^LIMIT\s+(\d+|ALL|NULL)\b/i);
      if (limitMatch && (i === 0 || /\s|\)/.test(sql[i - 1]))) {
        const fullMatch = limitMatch[0];
        const val = limitMatch[1];
        const num = parseInt(val, 10);
        if (isNaN(num) || num > 100) {
          cappedSql += 'LIMIT 100';
        } else {
          cappedSql += fullMatch;
        }
        i += fullMatch.length;
        continue;
      }
    }

    cappedSql += char;
    i++;
  }

  // 2. Check if outermost statement (depth 0 of parentheses) has a LIMIT
  let hasOuterLimit = false;
  let depth = 0;
  inSingle = false;

  for (let j = 0; j < cappedSql.length; j++) {
    const char = cappedSql[j];
    if (char === "'") {
      if (inSingle && cappedSql[j + 1] === "'") {
        j++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle) {
      if (char === '(') depth++;
      else if (char === ')') depth = Math.max(0, depth - 1);
      else if (depth === 0) {
        const sub = cappedSql.slice(j);
        if (/^LIMIT\s+(\d+|ALL|NULL)\b/i.test(sub) && (j === 0 || /\s|\)/.test(cappedSql[j - 1]))) {
          hasOuterLimit = true;
          break;
        }
      }
    }
  }

  if (hasOuterLimit) {
    return cappedSql;
  }

  // Outer statement lacks LIMIT. Inject LIMIT 100.
  // If outer statement ends with OFFSET \d+, insert LIMIT 100 before OFFSET.
  const offsetMatch = cappedSql.match(/(.*?)\b(OFFSET\s+\d+)\s*$/i);
  if (offsetMatch) {
    return `${offsetMatch[1].trim()} LIMIT 100 ${offsetMatch[2]}`.trim();
  }

  return `${cappedSql.trim()} LIMIT 100`;
}

/**
 * Validates and sanitizes a raw SQL string generated by an LLM or fallback parser.
 *
 * Rules:
 * 1. Single statement (rejects multiple statements or internal semicolons).
 * 2. Must start with SELECT or WITH.
 * 3. Rejects all DDL/DML keywords (INSERT, UPDATE, DELETE, DROP, etc.).
 * 4. Rejects dangerous PostgreSQL functions (pg_sleep, pg_terminate_backend, etc.).
 * 5. Rejects system schemas and catalogs (pg_catalog, information_schema, pg_*).
 * 6. Whitelists relations strictly to 'employees' and 'fx_rates' (+ defined CTEs).
 * 7. Enforces LIMIT 100 (injects if missing, caps if > 100).
 * 8. Strips SQL comments before parsing.
 */
export function validateSql(rawSql: string): ValidationResult {
  if (!rawSql || typeof rawSql !== 'string') {
    return { valid: false, reason: 'SQL query must be a non-empty string' };
  }

  // Step 1: Strip SQL comments to prevent comment smuggling
  let uncommented: string;
  try {
    uncommented = stripComments(rawSql).trim();
  } catch (err: any) {
    return { valid: false, reason: err?.message || 'Failed to strip SQL comments' };
  }

  if (uncommented.length === 0) {
    return { valid: false, reason: 'SQL query cannot be empty' };
  }

  // Step 2: Trim trailing semicolons
  let trimmed = uncommented;
  while (trimmed.endsWith(';')) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }

  if (trimmed.length === 0) {
    return { valid: false, reason: 'SQL query cannot be empty' };
  }

  // Step 3: Check for multiple statements / internal semicolons
  if (hasUnquotedSemicolon(trimmed)) {
    return {
      valid: false,
      reason: 'Multiple SQL statements or stacked queries are not permitted (semicolon detected)',
    };
  }

  // Step 4: Mask string literals for safe lexical inspection
  const maskedSql = maskStringLiterals(trimmed);

  // Step 5: Statement must start with SELECT or WITH
  if (!/^(SELECT|WITH)\b/i.test(maskedSql.trim())) {
    return { valid: false, reason: 'Query must start with SELECT or WITH' };
  }

  // Step 6: Reject forbidden DDL/DML keywords
  for (const kw of FORBIDDEN_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(maskedSql)) {
      return { valid: false, reason: `Forbidden SQL keyword detected: ${kw}` };
    }
  }

  // Step 7: Reject dangerous functions
  for (const fn of DANGEROUS_FUNCTIONS) {
    const fnRegex = new RegExp(`\\b${fn}\\b`, 'i');
    if (fnRegex.test(maskedSql)) {
      return { valid: false, reason: `Forbidden function detected: ${fn}` };
    }
  }

  // Step 8: Reject access to system catalogs or schemas
  if (/\b(pg_catalog|information_schema)\b/i.test(maskedSql)) {
    return {
      valid: false,
      reason: 'Access to system catalogs (pg_catalog, information_schema) is forbidden',
    };
  }
  if (/\bpg_[a-zA-Z0-9_]+\b/i.test(maskedSql)) {
    return {
      valid: false,
      reason: 'Access to pg_* system catalogs or functions is forbidden',
    };
  }

  // Step 9: Whitelist relations strictly to employees, fx_rates, and declared CTEs
  const cteNames = extractCteNames(maskedSql);
  const allowedRelations = new Set([...ALLOWED_TABLES, ...cteNames]);
  const referencedTables = extractReferencedTables(maskedSql);

  for (const table of referencedTables) {
    if (!allowedRelations.has(table)) {
      return {
        valid: false,
        reason: `Unauthorized table reference: "${table}". Only "employees" and "fx_rates" tables are permitted.`,
      };
    }
  }

  // Step 10: Enforce LIMIT <= 100
  const sanitizedSql = enforceLimit(trimmed);

  return {
    valid: true,
    sanitizedSql,
  };
}
