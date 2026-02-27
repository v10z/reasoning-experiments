#!/usr/bin/env node
/**
 * CLI script to run public benchmarks comparing vanilla vs strategy-augmented.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx ts-node src/benchmarks/run-public.ts [category]
 *
 * Categories: math, science, logic, code, all (default)
 */

import { PublicBenchmarkRunner } from './public-runner';
import { ProblemCategory } from './public-problems';

async function main() {
  const category = process.argv[2] as ProblemCategory | 'all' | undefined;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-... npx ts-node src/benchmarks/run-public.ts [category]');
    console.error('Categories: math, science, logic, code, all');
    process.exit(1);
  }

  const model = process.env.BENCHMARK_MODEL || 'claude-opus-4-6';
  const runner = new PublicBenchmarkRunner(model);

  console.log(`Running public benchmarks with model: ${model}`);
  console.log(`Category: ${category || 'all'}\n`);

  let summary;
  if (category && category !== 'all') {
    const results = await runner.runCategory(category);
    summary = runner.summarize(results, 0);
  } else {
    summary = await runner.runAll();
  }

  console.log(runner.formatSummary(summary));
}

main().catch((err) => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});
