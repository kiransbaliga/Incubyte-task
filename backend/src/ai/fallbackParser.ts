import type { LLMGeneratedPlan, VisualizationType } from './types.js';

interface QueryIntent {
  department?: string;
  country?: string;
  level?: string;
  levels?: string[];
  limit?: number;
  isLowest?: boolean;
}

/**
 * Extracts recognized departments from a natural language question.
 */
function extractDepartment(q: string): string | undefined {
  if (/\bengineering\b/i.test(q)) return 'Engineering';
  if (/\bproduct\b/i.test(q)) return 'Product';
  if (/\bdesign\b/i.test(q)) return 'Design';
  if (/\b(sales|marketing)\b/i.test(q)) return 'Sales';
  if (/\b(operations|ops)\b/i.test(q)) return 'Operations';
  if (/\b(people|hr|human resources)\b/i.test(q)) return 'People';
  return undefined;
}

/**
 * Extracts recognized ISO 3166-1 alpha-2 country codes from a natural language question.
 * Distinguishes country codes from common English words/prepositions (e.g. "in", "us").
 */
function extractCountry(q: string, rawQ: string): string | undefined {
  if (/\b(germany|deutschland)\b/i.test(q) || /\bDE\b/.test(rawQ)) return 'DE';
  if (/\b(india)\b/i.test(q) || /\bIN\b/.test(rawQ)) return 'IN';
  if (/\b(united states|america|usa)\b/i.test(q) || /\bUS\b/.test(rawQ) || /\bin the us\b/i.test(q)) return 'US';
  if (/\b(united kingdom|britain|england|uk)\b/i.test(q) || /\bGB\b/.test(rawQ)) return 'GB';
  if (/\b(singapore)\b/i.test(q) || /\bSG\b/.test(rawQ)) return 'SG';
  if (/\b(japan)\b/i.test(q) || /\bJP\b/.test(rawQ)) return 'JP';
  return undefined;
}

/**
 * Extracts job levels (L1 - L6) from a question.
 */
function extractLevels(q: string): string[] {
  const matches = q.match(/\bL[1-6]\b/gi);
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map((l) => l.toUpperCase())));
  return unique;
}

/**
 * Extracts limit count from questions like "top 5", "top 10", etc.
 */
function extractLimit(q: string, defaultLimit = 10): number {
  const match = q.match(/\b(?:top|bottom|first|limit)\s+(\d+)\b/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 100);
    }
  }
  return defaultLimit;
}

/**
 * Deterministic fallback query parser for when GROQ_API_KEY is unset or API is unreachable.
 * Matches common HR compensation inquiry patterns.
 */
export function parseFallbackQuery(question: string): LLMGeneratedPlan {
  const cleanQ = question.trim().toLowerCase();

  // If the question is an explicit or adversarial raw SQL statement (e.g., DROP TABLE, DELETE, ALTER),
  // pass it directly to the validator pipeline so Layer 2 deterministic security blocks it.
  if (/^\s*(drop|delete|update|insert|alter|truncate|grant|revoke|create)\b/i.test(cleanQ)) {
    return {
      sql: question.trim(),
      explanation: 'Raw SQL statement submitted',
      visualizationType: 'table',
    };
  }

  const department = extractDepartment(cleanQ);
  const country = extractCountry(cleanQ, question);
  const levels = extractLevels(question);
  const isLowest = /\b(lowest|least|bottom|cheapest|smallest)\b/i.test(cleanQ);

  // Build filter conditions
  const whereClauses: string[] = ["employment_status = 'active'"];
  if (department) {
    whereClauses.push(`department = '${department}'`);
  }
  if (country) {
    whereClauses.push(`country = '${country}'`);
  }
  if (levels.length === 1) {
    whereClauses.push(`level = '${levels[0]}'`);
  } else if (levels.length > 1) {
    whereClauses.push(`level IN (${levels.map((l) => `'${l}'`).join(', ')})`);
  }
  const whereSql = whereClauses.join(' AND ');

  // 1. TOP N / LOWEST N EARNERS
  if (
    /\b(top|highest|lowest|bottom|most|least|best)\b/i.test(cleanQ) &&
    /\b(paid|earner|earners|salary|salaries|compensation|employees?)\b/i.test(cleanQ)
  ) {
    const limit = extractLimit(cleanQ, 10);
    const direction = isLowest ? 'ASC' : 'DESC';
    const descriptor = isLowest ? 'lowest' : 'highest';
    const scopeDesc = [
      department ? `in ${department}` : '',
      country ? `in ${country}` : '',
      levels.length ? `at level ${levels.join('/')}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const sql = `SELECT full_name, department, level, country, base_salary_usd, local_currency, local_base_salary FROM employees WHERE ${whereSql} ORDER BY base_salary_usd ${direction} LIMIT ${limit}`;
    const explanation = `Top ${limit} ${descriptor}-paid active employees ${scopeDesc ? scopeDesc + ' ' : ''}sorted by USD base salary.`;

    return {
      sql,
      explanation,
      visualizationType: 'table',
    };
  }

  // 2. MEDIAN / P50 SALARY
  if (/\b(median|p50|50th percentile)\b/i.test(cleanQ)) {
    if (/\b(by|across|per)\s+department\b/i.test(cleanQ)) {
      return {
        sql: `SELECT department, ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY base_salary_usd)::numeric, 2) AS median_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY department ORDER BY median_salary_usd DESC LIMIT 100`,
        explanation: 'Median USD base salary and headcount broken down by department.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+country\b/i.test(cleanQ)) {
      return {
        sql: `SELECT country, ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY base_salary_usd)::numeric, 2) AS median_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY country ORDER BY median_salary_usd DESC LIMIT 100`,
        explanation: 'Median USD base salary and headcount broken down by country.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+level\b/i.test(cleanQ)) {
      return {
        sql: `SELECT level, ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY base_salary_usd)::numeric, 2) AS median_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY level ORDER BY level ASC LIMIT 100`,
        explanation: 'Median USD base salary and headcount broken down by job level.',
        visualizationType: 'comparison',
      };
    }

    // Scalar or filtered median
    const scopeDesc = [
      department ? `for ${department}` : '',
      country ? `in ${country}` : '',
      levels.length ? `at level ${levels.join('/')}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      sql: `SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY base_salary_usd)::numeric, 2) AS median_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} LIMIT 1`,
      explanation: `Overall median USD base salary ${scopeDesc ? scopeDesc + ' ' : ''}for active employees.`,
      visualizationType: 'metric',
    };
  }

  // 3. AVERAGE / MEAN SALARY
  if (/\b(average|avg|mean)\b/i.test(cleanQ)) {
    if (/\b(by|across|per)\s+department\b/i.test(cleanQ)) {
      return {
        sql: `SELECT department, ROUND(AVG(base_salary_usd), 2) AS avg_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY department ORDER BY avg_salary_usd DESC LIMIT 100`,
        explanation: 'Average USD base salary and headcount broken down by department.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+country\b/i.test(cleanQ)) {
      return {
        sql: `SELECT country, ROUND(AVG(base_salary_usd), 2) AS avg_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY country ORDER BY avg_salary_usd DESC LIMIT 100`,
        explanation: 'Average USD base salary and headcount broken down by country.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+level\b/i.test(cleanQ)) {
      return {
        sql: `SELECT level, ROUND(AVG(base_salary_usd), 2) AS avg_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} GROUP BY level ORDER BY level ASC LIMIT 100`,
        explanation: 'Average USD base salary and headcount broken down by job level.',
        visualizationType: 'comparison',
      };
    }

    // Scalar or filtered average
    const scopeDesc = [
      department ? `for ${department}` : '',
      country ? `in ${country}` : '',
      levels.length ? `at level ${levels.join('/')}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      sql: `SELECT ROUND(AVG(base_salary_usd), 2) AS avg_salary_usd, COUNT(*) AS employee_count FROM employees WHERE ${whereSql} LIMIT 1`,
      explanation: `Average USD base salary ${scopeDesc ? scopeDesc + ' ' : ''}for active employees.`,
      visualizationType: 'metric',
    };
  }

  // 4. HEADCOUNT / EMPLOYEE COUNT
  if (/\b(headcount|count|how many employees|number of employees)\b/i.test(cleanQ)) {
    if (/\b(by|across|per)\s+department\b/i.test(cleanQ)) {
      return {
        sql: `SELECT department, COUNT(*) AS headcount FROM employees WHERE ${whereSql} GROUP BY department ORDER BY headcount DESC LIMIT 100`,
        explanation: 'Active employee headcount broken down by department.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+country\b/i.test(cleanQ)) {
      return {
        sql: `SELECT country, COUNT(*) AS headcount FROM employees WHERE ${whereSql} GROUP BY country ORDER BY headcount DESC LIMIT 100`,
        explanation: 'Active employee headcount broken down by country.',
        visualizationType: 'comparison',
      };
    }
    if (/\b(by|across|per)\s+level\b/i.test(cleanQ)) {
      return {
        sql: `SELECT level, COUNT(*) AS headcount FROM employees WHERE ${whereSql} GROUP BY level ORDER BY level ASC LIMIT 100`,
        explanation: 'Active employee headcount broken down by level.',
        visualizationType: 'comparison',
      };
    }

    return {
      sql: `SELECT COUNT(*) AS headcount FROM employees WHERE ${whereSql} LIMIT 1`,
      explanation: 'Total active employee headcount.',
      visualizationType: 'metric',
    };
  }

  // 5. TOTAL PAYROLL
  if (/\b(payroll|total pay|total salary|total compensation)\b/i.test(cleanQ)) {
    return {
      sql: `SELECT ROUND(SUM(base_salary_usd), 2) AS total_payroll_usd, COUNT(*) AS active_headcount FROM employees WHERE ${whereSql} LIMIT 1`,
      explanation: 'Total annual USD payroll and headcount for active employees.',
      visualizationType: 'metric',
    };
  }

  // 6. DEFAULT GENERAL FALLBACK QUERY
  return {
    sql: `SELECT full_name, department, level, country, base_salary_usd, local_currency, local_base_salary FROM employees WHERE ${whereSql} ORDER BY base_salary_usd DESC LIMIT 25`,
    explanation: 'Displaying active employees sorted by USD base salary (default deterministic offline pattern).',
    visualizationType: 'table',
  };
}
