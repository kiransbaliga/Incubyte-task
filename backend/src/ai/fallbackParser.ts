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
 * Extracts employee codes like ACME-01964 or EMP-00104.
 */
function extractEmployeeCode(q: string): string | undefined {
  const match = q.match(/\b(ACME-\d{4,5}|EMP-\d{4,5})\b/i);
  return match ? match[1].toUpperCase() : undefined;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'what', 'is', 'are', 'how', 'much', 'does', 'do', 'show', 'me', 'find',
  'get', 'tell', 'lookup', 'who', 'all', 'each', 'every', 'our', 'top', 'bottom', 'highest',
  'lowest', 'average', 'avg', 'mean', 'median', 'p50', 'p90', 'total', 'annual', 'base',
  'salary', 'salaries', 'pay', 'compensation', 'bonus', 'department', 'country', 'level',
  'active', 'inactive', 'terminated', 'employee', 'employees', 'in', 'by', 'for', 'of', 'to',
  'engineering', 'product', 'design', 'sales', 'operations', 'people', 'marketing'
]);

/**
 * Extracts individual person names from compensation inquiries
 * (e.g. "salary of Magnus Davis", "how much does Magnus Davis make", "Magnus Davis salary").
 */
function extractPersonName(q: string): string | undefined {
  if (/\b(average|avg|median|p50|p90|percentile|total payroll|headcount|by department|by country|by level|across departments|across countries)\b/i.test(q)) {
    return undefined;
  }
  if (/\b(top|bottom|highest|lowest|most|least)\s+\d+\b/i.test(q)) {
    return undefined;
  }

  // 1. "salary of Magnus Davis", "pay for Magnus Davis", "compensation of Magnus Davis"
  const nameAfterKeyword = q.match(/\b(?:salary|pay|compensation)\s+(?:of|for)\s+([A-Za-z]+(?:\s+[A-Za-z'-]+)+)/i);
  if (nameAfterKeyword) {
    const candidate = nameAfterKeyword[1].trim().replace(/\?+$/, '').replace(/'s$/, '');
    const words = candidate.split(/\s+/);
    if (!words.some((w) => STOP_WORDS.has(w.toLowerCase()))) {
      return candidate;
    }
  }

  // 2. "how much does Magnus Davis make"
  const howMuch = q.match(/\bhow much does\s+([A-Za-z]+(?:\s+[A-Za-z'-]+)+?)(?:\s+(?:make|earn|get|receive|get paid))?(?:\?|$)/i);
  if (howMuch) {
    const candidate = howMuch[1].trim().replace(/\?+$/, '').replace(/'s$/, '');
    const words = candidate.split(/\s+/);
    if (!words.some((w) => STOP_WORDS.has(w.toLowerCase()))) {
      return candidate;
    }
  }

  // 3. "Magnus Davis's salary" or "Magnus Davis salary"
  const nameBeforeKeyword = q.match(/\b([A-Za-z]+(?:\s+[A-Za-z'-]+)+?)(?:'s)?\s+(?:salary|pay|compensation)\b/i);
  if (nameBeforeKeyword) {
    const candidate = nameBeforeKeyword[1].trim().replace(/'s$/, '');
    const words = candidate.split(/\s+/);
    if (!words.some((w) => STOP_WORDS.has(w.toLowerCase()))) {
      return candidate;
    }
  }

  // 4. "who is Magnus Davis", "employee Magnus Davis"
  const directAction = q.match(/\b(?:who is|employee)\s+([A-Za-z]+(?:\s+[A-Za-z'-]+)+)\b/i);
  if (directAction) {
    const candidate = directAction[1].trim().replace(/\?+$/, '');
    const words = candidate.split(/\s+/);
    if (!words.some((w) => STOP_WORDS.has(w.toLowerCase()))) {
      return candidate;
    }
  }

  return undefined;
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

  // 0. HIGH-COST INTENT: Pairwise disparity across all employee pairs (triggers pre-flight EXPLAIN cost gate)
  if (/\b(pairwise|cartesian|disparity across all|all employee pairs|cross join|disparity.*all)\b/i.test(cleanQ)) {
    return {
      sql: 'SELECT e1.full_name AS employee_1, e2.full_name AS employee_2, ABS(e1.base_salary_usd - e2.base_salary_usd) AS disparity_usd FROM employees e1 CROSS JOIN employees e2 ORDER BY disparity_usd DESC LIMIT 50',
      explanation: 'Computes pairwise salary disparity matrix across all employee pairs (Unbounded Cartesian comparison).',
      visualizationType: 'table',
    };
  }

  // 0. INDIVIDUAL EMPLOYEE LOOKUP BY CODE OR NAME
  const employeeCode = extractEmployeeCode(question);
  if (employeeCode) {
    return {
      sql: `SELECT full_name, employee_code, department, level, country, base_salary_usd, local_currency, local_base_salary FROM employees WHERE employee_code = '${employeeCode}' LIMIT 1`,
      explanation: `Retrieves compensation details for employee ${employeeCode}.`,
      visualizationType: 'table',
    };
  }

  const personName = extractPersonName(question);
  if (personName) {
    const sanitized = personName.replace(/'/g, "''").replace(/[%_\\]/g, '\\$&');
    return {
      sql: `SELECT full_name, employee_code, department, level, country, base_salary_usd, local_currency, local_base_salary FROM employees WHERE full_name ILIKE '%${sanitized}%' LIMIT 5`,
      explanation: `Retrieves compensation details and salary for ${personName}.`,
      visualizationType: 'table',
    };
  }

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
