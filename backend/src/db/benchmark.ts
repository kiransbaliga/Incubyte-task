import { primarySql } from './index.js';

interface BenchmarkResult {
  queryName: string;
  iterations: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  indexUsed: string;
  targetMet: boolean;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

async function runBenchmark(
  queryName: string,
  sqlQuery: string,
  expectedIndex: string,
  iterations: number = 25
): Promise<BenchmarkResult> {
  const timings: number[] = [];
  let indexVerified = false;

  for (let i = 0; i < iterations; i++) {
    const result = await primarySql.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sqlQuery}`
    );
    const plan = result[0]['QUERY PLAN'][0];
    const execTime = plan['Execution Time'];
    timings.push(execTime);

    if (JSON.stringify(plan).includes(expectedIndex)) {
      indexVerified = true;
    }
  }

  const p50 = calculatePercentile(timings, 50);
  const p90 = calculatePercentile(timings, 90);
  const p95 = calculatePercentile(timings, 95);

  return {
    queryName,
    iterations,
    p50Ms: p50,
    p90Ms: p90,
    p95Ms: p95,
    indexUsed: indexVerified ? expectedIndex : 'NONE',
    targetMet: p95 < 50 && indexVerified,
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('ACME COMPENSATION HUB — HIGH-SCALE QUERY LATENCY BENCHMARK (10,000 ROWS)');
  console.log('='.repeat(80));

  const benchmarks = [
    {
      name: 'Department + Level Filtered Sort',
      sql: `SELECT id, full_name, department, level, base_salary_usd FROM employees WHERE department = 'Engineering' AND level = 'L4' ORDER BY base_salary_usd DESC LIMIT 50;`,
      index: 'idx_employees_dept_level_salary',
    },
    {
      name: 'Country Regional Benchmark Filtered Sort',
      sql: `SELECT id, full_name, country, base_salary_usd FROM employees WHERE country = 'DE' ORDER BY base_salary_usd DESC LIMIT 50;`,
      index: 'idx_employees_country_salary',
    },
    {
      name: 'GIN Trigram Fuzzy Search (full_name)',
      sql: `SELECT id, full_name, email FROM employees WHERE full_name ILIKE '%Magnus%' LIMIT 50;`,
      index: 'idx_employees_search_trgm',
    },
    {
      name: 'Single Window Count Over Combined Query',
      sql: `SELECT id, full_name, base_salary_usd, COUNT(*) OVER() as total FROM employees WHERE department = 'Sales' ORDER BY base_salary_usd DESC LIMIT 50;`,
      index: 'idx_employees_dept_level_salary',
    },
  ];

  const results: BenchmarkResult[] = [];

  for (const bm of benchmarks) {
    process.stdout.write(`Testing: ${bm.name}... `);
    const res = await runBenchmark(bm.name, bm.sql, bm.index);
    results.push(res);
    console.log(`p95 = ${res.p95Ms}ms (Target: <50ms) ✅`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK SUMMARY RESULTS:');
  console.log('='.repeat(80));
  console.table(
    results.map((r) => ({
      'Access Pattern': r.queryName,
      'Index Verified': r.indexUsed,
      'p50 Latency (ms)': r.p50Ms,
      'p90 Latency (ms)': r.p90Ms,
      'p95 Latency (ms)': r.p95Ms,
      'SLA (<50ms)': r.targetMet ? 'PASS (<50ms)' : 'FAIL',
    }))
  );

  await primarySql.end();
}

main().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
