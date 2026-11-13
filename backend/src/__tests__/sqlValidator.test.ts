import { describe, it, expect } from 'vitest';
import { validateSql, stripComments, maskStringLiterals, enforceLimit } from '../ai/sqlValidator.js';
import { parseFallbackQuery } from '../ai/fallbackParser.js';

describe('SQL AST / Lexer Validator (Adversarial Security Suite)', () => {
  describe('LIMIT Enforcement', () => {
    it('injects LIMIT 100 when LIMIT is omitted', () => {
      const sql = 'SELECT * FROM employees WHERE department = \'Engineering\'';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe(
          'SELECT * FROM employees WHERE department = \'Engineering\' LIMIT 100'
        );
      }
    });

    it('caps LIMIT to 100 when specified limit > 100', () => {
      const sql = 'SELECT full_name, base_salary_usd FROM employees LIMIT 500';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe(
          'SELECT full_name, base_salary_usd FROM employees LIMIT 100'
        );
      }
    });

    it('preserves LIMIT when specified limit <= 100', () => {
      const sql = 'SELECT * FROM employees ORDER BY base_salary_usd DESC LIMIT 10';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe(
          'SELECT * FROM employees ORDER BY base_salary_usd DESC LIMIT 10'
        );
      }
    });

    it('preserves exactly LIMIT 100', () => {
      const sql = 'SELECT * FROM employees LIMIT 100';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe('SELECT * FROM employees LIMIT 100');
      }
    });

    it('correctly places LIMIT before OFFSET when OFFSET is specified without LIMIT', () => {
      const sql = 'SELECT * FROM employees OFFSET 50';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe('SELECT * FROM employees LIMIT 100 OFFSET 50');
      }
    });

    it('caps LIMIT when followed by OFFSET', () => {
      const sql = 'SELECT * FROM employees LIMIT 250 OFFSET 20';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe('SELECT * FROM employees LIMIT 100 OFFSET 20');
      }
    });
  });

  describe('Common Table Expressions (WITH / CTE)', () => {
    it('permits valid CTE queries using employees table', () => {
      const sql = `
        WITH dept_summary AS (
          SELECT department, AVG(base_salary_usd) AS avg_sal
          FROM employees
          GROUP BY department
        )
        SELECT * FROM dept_summary
      `;
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toContain('WITH dept_summary AS');
        expect(result.sanitizedSql).toContain('LIMIT 100');
      }
    });

    it('caps inner and outer LIMITs in CTEs', () => {
      const sql = `
        WITH high_earners AS (
          SELECT * FROM employees ORDER BY base_salary_usd DESC LIMIT 300
        )
        SELECT * FROM high_earners LIMIT 500
      `;
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).not.toContain('LIMIT 300');
        expect(result.sanitizedSql).not.toContain('LIMIT 500');
        expect(result.sanitizedSql).toContain('LIMIT 100');
      }
    });

    it('rejects CTE queries attempting data modification (DELETE in CTE)', () => {
      const sql = `
        WITH deleted_rows AS (
          DELETE FROM employees RETURNING *
        )
        SELECT * FROM deleted_rows
      `;
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Forbidden SQL keyword detected: DELETE/i);
      }
    });
  });

  describe('Rejection of DDL and DML Keywords', () => {
    it('rejects DROP TABLE statements', () => {
      const sql = 'DROP TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Query must start with SELECT or WITH|Forbidden SQL keyword detected: DROP/i);
      }
    });

    it('rejects DELETE statements', () => {
      const sql = 'DELETE FROM employees WHERE country = \'US\'';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Query must start with SELECT or WITH|Forbidden SQL keyword detected: DELETE/i);
      }
    });

    it('rejects UPDATE statements', () => {
      const sql = 'UPDATE employees SET base_salary_usd = 999999';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Query must start with SELECT or WITH|Forbidden SQL keyword detected: UPDATE/i);
      }
    });

    it('rejects INSERT statements', () => {
      const sql = 'INSERT INTO employees (full_name) VALUES (\'Hacker\')';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Query must start with SELECT or WITH|Forbidden SQL keyword detected: INSERT/i);
      }
    });

    it('rejects ALTER statements', () => {
      const sql = 'ALTER TABLE employees DROP COLUMN base_salary_usd';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Query must start with SELECT or WITH|Forbidden SQL keyword detected: ALTER/i);
      }
    });

    it('rejects TRUNCATE statements', () => {
      const sql = 'TRUNCATE TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
    });

    it('rejects GRANT and REVOKE statements', () => {
      expect(validateSql('GRANT ALL ON employees TO public').valid).toBe(false);
      expect(validateSql('REVOKE ALL ON employees FROM public').valid).toBe(false);
    });
  });

  describe('Stacked Query Rejection (Semicolon Smuggling)', () => {
    it('rejects stacked queries with DROP TABLE', () => {
      const sql = 'SELECT 1; DROP TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/semicolon detected|Multiple SQL statements/i);
      }
    });

    it('rejects stacked queries even with harmless second statement', () => {
      const sql = 'SELECT * FROM employees; SELECT * FROM fx_rates';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/semicolon detected|Multiple SQL statements/i);
      }
    });

    it('allows trailing semicolons if only a single statement is present', () => {
      const sql = 'SELECT * FROM employees;';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toBe('SELECT * FROM employees LIMIT 100');
      }
    });

    it('permits semicolons inside string literals', () => {
      const sql = "SELECT * FROM employees WHERE full_name = 'O;Connor; John'";
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toContain("WHERE full_name = 'O;Connor; John'");
      }
    });
  });

  describe('Dangerous Functions Rejection', () => {
    it('rejects pg_sleep function call', () => {
      const sql = 'SELECT pg_sleep(5)';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Forbidden function detected: pg_sleep/i);
      }
    });

    it('rejects pg_sleep hidden in a WHERE clause', () => {
      const sql = 'SELECT * FROM employees WHERE pg_sleep(2) IS NULL';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Forbidden function detected: pg_sleep/i);
      }
    });

    it('rejects pg_terminate_backend and pg_cancel_backend', () => {
      expect(validateSql('SELECT pg_terminate_backend(1234)').valid).toBe(false);
      expect(validateSql('SELECT pg_cancel_backend(1234)').valid).toBe(false);
    });

    it('rejects dblink and lo_import / lo_export', () => {
      expect(validateSql("SELECT dblink('host=evil.com', 'SELECT 1')").valid).toBe(false);
      expect(validateSql("SELECT lo_import('/etc/passwd')").valid).toBe(false);
      expect(validateSql("SELECT lo_export(1, '/tmp/evil')").valid).toBe(false);
    });
  });

  describe('System Catalogs & Schemas Rejection', () => {
    it('rejects queries against pg_catalog', () => {
      const sql = 'SELECT * FROM pg_catalog.pg_tables';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Access to system catalog|Access to pg_\*|forbidden/i);
      }
    });

    it('rejects queries against information_schema', () => {
      const sql = 'SELECT table_name FROM information_schema.tables';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Access to system catalog|forbidden/i);
      }
    });

    it('rejects queries referencing pg_shadow or pg_roles', () => {
      const sql = 'SELECT * FROM pg_shadow';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
    });
  });

  describe('Comment Bypass Neutralization', () => {
    it('strips block comments and detects stacked DROP TABLE', () => {
      const sql = 'SELECT 1 /* innocent comment */ ; DROP TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
    });

    it('strips line comments and detects injection', () => {
      const sql = 'SELECT * FROM employees -- harmless comment\n; DROP TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
    });

    it('rejects queries starting with comments that conceal forbidden statements', () => {
      const sql = '/* bypass prefix */ DROP TABLE employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
    });

    it('correctly preserves valid queries with comments', () => {
      const sql = '/* HR query */ SELECT full_name FROM employees -- fetch names\nWHERE country = \'US\'';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.sanitizedSql).toContain('SELECT full_name FROM employees');
        expect(result.sanitizedSql).toContain('LIMIT 100');
      }
    });
  });

  describe('Relation Whitelisting', () => {
    it('permits queries against employees and fx_rates', () => {
      const sql = 'SELECT e.full_name, fx.rate_to_usd FROM employees e JOIN fx_rates fx ON e.local_currency = fx.currency_code';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
    });

    it('permits public-qualified table names', () => {
      const sql = 'SELECT * FROM public.employees';
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
    });

    it('rejects queries referencing unauthorized tables', () => {
      const sql = 'SELECT * FROM users';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Unauthorized table reference: "users"/i);
      }
    });

    it('rejects queries joining unauthorized tables', () => {
      const sql = 'SELECT * FROM employees JOIN secret_payroll ON employees.id = secret_payroll.id';
      const result = validateSql(sql);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/Unauthorized table reference: "secret_payroll"/i);
      }
    });
  });

  describe('String Literal Keyword Isolation', () => {
    it('allows blocked keywords inside string literals without false positives', () => {
      const sql = "SELECT * FROM employees WHERE email = 'drop.table@acme.com'";
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
    });

    it('handles escaped quotes inside string literals', () => {
      const sql = "SELECT * FROM employees WHERE full_name = 'O''Connor'";
      const result = validateSql(sql);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Deterministic Fallback Parser', () => {
  it('parses top highest earners query', () => {
    const plan = parseFallbackQuery('Show me the top 5 highest paid employees in Engineering');
    expect(plan.sql).toContain('SELECT full_name');
    expect(plan.sql).toContain("department = 'Engineering'");
    expect(plan.sql).toContain('ORDER BY base_salary_usd DESC');
    expect(plan.sql).toContain('LIMIT 5');
    expect(plan.visualizationType).toBe('table');
  });

  it('parses lowest earners query', () => {
    const plan = parseFallbackQuery('Who are the 10 lowest paid employees in Germany?');
    expect(plan.sql).toContain("country = 'DE'");
    expect(plan.sql).toContain('ORDER BY base_salary_usd ASC');
    expect(plan.sql).toContain('LIMIT 10');
    expect(plan.visualizationType).toBe('table');
  });

  it('parses average salary by department query', () => {
    const plan = parseFallbackQuery('What is the average salary by department?');
    expect(plan.sql).toContain('AVG(base_salary_usd)');
    expect(plan.sql).toContain('GROUP BY department');
    expect(plan.visualizationType).toBe('comparison');
  });

  it('parses median salary by country query', () => {
    const plan = parseFallbackQuery('Show median salary by country');
    expect(plan.sql).toContain('PERCENTILE_CONT(0.5)');
    expect(plan.sql).toContain('GROUP BY country');
    expect(plan.visualizationType).toBe('comparison');
  });

  it('parses total payroll query', () => {
    const plan = parseFallbackQuery('What is the total annual payroll?');
    expect(plan.sql).toContain('SUM(base_salary_usd)');
    expect(plan.visualizationType).toBe('metric');
  });

  it('parses headcount by level query', () => {
    const plan = parseFallbackQuery('How many employees by level?');
    expect(plan.sql).toContain('COUNT(*) AS headcount');
    expect(plan.sql).toContain('GROUP BY level');
    expect(plan.visualizationType).toBe('comparison');
  });

  it('fallback generated SQL passes SQL validator cleanly', () => {
    const questions = [
      'Top 10 highest earners in Sales',
      'Average salary by department',
      'Median salary by country',
      'Headcount by level',
      'What is total company payroll?',
    ];

    for (const q of questions) {
      const plan = parseFallbackQuery(q);
      const validation = validateSql(plan.sql);
      expect(validation.valid).toBe(true);
    }
  });
});
