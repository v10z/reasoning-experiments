import { StrategyRouter } from '../strategies/router';
import { BenchmarkScorer, BenchmarkScore } from './scorer';
import { BenchmarkProblem, BENCHMARK_PROBLEMS, getProblemsByCategory } from './problems';

export interface BenchmarkResult {
  problemId: string;
  problemTitle: string;
  category: string;
  strategy: string;
  score: BenchmarkScore;
  baseline: BenchmarkScore;
  improvement: {
    depth: number;
    convergence: number;
    correctness: number;
    completeness: number;
    efficiency: number;
    overall: number;
  };
  executionTimeMs: number;
}

export interface BenchmarkSummary {
  results: BenchmarkResult[];
  averageImprovement: {
    depth: number;
    convergence: number;
    correctness: number;
    completeness: number;
    efficiency: number;
    overall: number;
  };
  byCategory: Record<string, {
    avgScore: number;
    avgImprovement: number;
    problemCount: number;
  }>;
  totalProblems: number;
  totalTimeMs: number;
}

export class BenchmarkRunner {
  private router: StrategyRouter;
  private scorer: BenchmarkScorer;

  constructor() {
    this.router = new StrategyRouter();
    this.scorer = new BenchmarkScorer();
  }

  async runProblem(problem: BenchmarkProblem, strategyName?: string): Promise<BenchmarkResult> {
    const startTime = Date.now();

    const output = await this.router.reason({
      query: problem.query,
      strategy: strategyName,
      maxIterations: 5,
    });

    const executionTimeMs = Date.now() - startTime;
    const score = this.scorer.score(output.trace, problem, output.answer);
    const baseline = BenchmarkScorer.createBaseline(problem);

    return {
      problemId: problem.id,
      problemTitle: problem.title,
      category: problem.category,
      strategy: output.trace.strategyName,
      score,
      baseline,
      improvement: {
        depth: score.depthScore - baseline.depthScore,
        convergence: score.convergenceScore - baseline.convergenceScore,
        correctness: score.correctness - baseline.correctness,
        completeness: score.completeness - baseline.completeness,
        efficiency: score.efficiency - baseline.efficiency,
        overall: score.overall - baseline.overall,
      },
      executionTimeMs,
    };
  }

  async runCategory(category: string): Promise<BenchmarkResult[]> {
    const problems = getProblemsByCategory(category);
    const results: BenchmarkResult[] = [];

    for (const problem of problems) {
      results.push(await this.runProblem(problem));
    }

    return results;
  }

  async runAll(): Promise<BenchmarkSummary> {
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];

    for (const problem of BENCHMARK_PROBLEMS) {
      results.push(await this.runProblem(problem));
    }

    const totalTimeMs = Date.now() - startTime;

    // Calculate average improvements
    const avgImprovement = this.calculateAverageImprovement(results);

    // Group by category
    const byCategory: BenchmarkSummary['byCategory'] = {};
    for (const result of results) {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { avgScore: 0, avgImprovement: 0, problemCount: 0 };
      }
      byCategory[result.category].avgScore += result.score.overall;
      byCategory[result.category].avgImprovement += result.improvement.overall;
      byCategory[result.category].problemCount++;
    }

    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avgScore /= byCategory[cat].problemCount;
      byCategory[cat].avgImprovement /= byCategory[cat].problemCount;
    }

    return {
      results,
      averageImprovement: avgImprovement,
      byCategory,
      totalProblems: results.length,
      totalTimeMs,
    };
  }

  private calculateAverageImprovement(results: BenchmarkResult[]): BenchmarkSummary['averageImprovement'] {
    if (results.length === 0) {
      return { depth: 0, convergence: 0, correctness: 0, completeness: 0, efficiency: 0, overall: 0 };
    }

    const sum = results.reduce(
      (acc, r) => ({
        depth: acc.depth + r.improvement.depth,
        convergence: acc.convergence + r.improvement.convergence,
        correctness: acc.correctness + r.improvement.correctness,
        completeness: acc.completeness + r.improvement.completeness,
        efficiency: acc.efficiency + r.improvement.efficiency,
        overall: acc.overall + r.improvement.overall,
      }),
      { depth: 0, convergence: 0, correctness: 0, completeness: 0, efficiency: 0, overall: 0 }
    );

    const n = results.length;
    return {
      depth: sum.depth / n,
      convergence: sum.convergence / n,
      correctness: sum.correctness / n,
      completeness: sum.completeness / n,
      efficiency: sum.efficiency / n,
      overall: sum.overall / n,
    };
  }

  formatResults(summary: BenchmarkSummary): string {
    const lines: string[] = [];

    lines.push('=== Reasoning-Memory Benchmark Results ===\n');
    lines.push(`Total problems: ${summary.totalProblems}`);
    lines.push(`Total time: ${summary.totalTimeMs}ms\n`);

    lines.push('--- Per-Problem Results ---\n');
    for (const result of summary.results) {
      lines.push(`[${result.problemId}] ${result.problemTitle}`);
      lines.push(`  Strategy: ${result.strategy}`);
      lines.push(`  Score: ${(result.score.overall * 100).toFixed(1)}% (baseline: ${(result.baseline.overall * 100).toFixed(1)}%)`);
      lines.push(`  Improvement: +${(result.improvement.overall * 100).toFixed(1)}%`);
      lines.push(`  Depth: ${(result.score.depthScore * 100).toFixed(0)}% | Conv: ${(result.score.convergenceScore * 100).toFixed(0)}% | Correct: ${(result.score.correctness * 100).toFixed(0)}% | Complete: ${(result.score.completeness * 100).toFixed(0)}% | Efficient: ${(result.score.efficiency * 100).toFixed(0)}%`);
      lines.push('');
    }

    lines.push('--- By Category ---\n');
    for (const [cat, data] of Object.entries(summary.byCategory)) {
      lines.push(`${cat}: avg score ${(data.avgScore * 100).toFixed(1)}%, avg improvement +${(data.avgImprovement * 100).toFixed(1)}% (${data.problemCount} problems)`);
    }

    lines.push('\n--- Average Improvements vs Baseline ---\n');
    const avg = summary.averageImprovement;
    lines.push(`  Depth:       +${(avg.depth * 100).toFixed(1)}%`);
    lines.push(`  Convergence: +${(avg.convergence * 100).toFixed(1)}%`);
    lines.push(`  Correctness: +${(avg.correctness * 100).toFixed(1)}%`);
    lines.push(`  Completeness:+${(avg.completeness * 100).toFixed(1)}%`);
    lines.push(`  Efficiency:  +${(avg.efficiency * 100).toFixed(1)}%`);
    lines.push(`  Overall:     +${(avg.overall * 100).toFixed(1)}%`);

    return lines.join('\n');
  }
}
