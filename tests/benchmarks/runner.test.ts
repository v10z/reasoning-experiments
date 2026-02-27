import { BenchmarkRunner } from '../../src/benchmarks/runner';
import { BenchmarkScorer } from '../../src/benchmarks/scorer';
import { BENCHMARK_PROBLEMS, getProblemsByCategory, getProblemById } from '../../src/benchmarks/problems';

describe('BenchmarkProblems', () => {
  test('has 9 total problems', () => {
    expect(BENCHMARK_PROBLEMS).toHaveLength(9);
  });

  test('has 3 problems per category', () => {
    expect(getProblemsByCategory('multi_step_reasoning')).toHaveLength(3);
    expect(getProblemsByCategory('debugging')).toHaveLength(3);
    expect(getProblemsByCategory('architecture')).toHaveLength(3);
  });

  test('each problem has required fields', () => {
    for (const problem of BENCHMARK_PROBLEMS) {
      expect(problem.id).toBeDefined();
      expect(problem.category).toBeDefined();
      expect(problem.title).toBeDefined();
      expect(problem.query.length).toBeGreaterThan(10);
      expect(problem.expectedKeywords.length).toBeGreaterThan(0);
      expect(problem.expectedDepth).toBeGreaterThanOrEqual(2);
      expect(['easy', 'medium', 'hard']).toContain(problem.difficulty);
    }
  });

  test('getProblemById finds a specific problem', () => {
    const problem = getProblemById('msr-1');
    expect(problem).toBeDefined();
    expect(problem!.title).toBe('Cache Invalidation Strategy');
  });

  test('getProblemById returns undefined for unknown id', () => {
    expect(getProblemById('nonexistent')).toBeUndefined();
  });
});

describe('BenchmarkScorer', () => {
  const scorer = new BenchmarkScorer();

  test('createBaseline returns consistent baseline scores', () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const baseline = BenchmarkScorer.createBaseline(problem);
    expect(baseline.overall).toBeGreaterThan(0);
    expect(baseline.overall).toBeLessThan(1);
    expect(baseline.depthScore).toBeLessThan(0.5);
  });

  test('scores are between 0 and 1', () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const trace = {
      strategyName: 'test',
      steps: [
        { id: 's1', type: 'root', content: 'cache invalidation', parentId: null, childrenIds: ['s2'], score: 0.5, metadata: {}, timestamp: Date.now() },
        { id: 's2', type: 'analysis', content: 'distributed consistency latency', parentId: 's1', childrenIds: [], score: 0.7, metadata: {}, timestamp: Date.now() },
      ],
      finalOutput: 'Cache invalidation in distributed systems with consistency and latency requirements',
      totalSteps: 2,
      convergenceScore: 0.8,
    };

    const score = scorer.score(trace, problem, trace.finalOutput);
    expect(score.depthScore).toBeGreaterThanOrEqual(0);
    expect(score.depthScore).toBeLessThanOrEqual(1);
    expect(score.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(score.convergenceScore).toBeLessThanOrEqual(1);
    expect(score.correctness).toBeGreaterThanOrEqual(0);
    expect(score.correctness).toBeLessThanOrEqual(1);
    expect(score.completeness).toBeGreaterThanOrEqual(0);
    expect(score.completeness).toBeLessThanOrEqual(1);
    expect(score.efficiency).toBeGreaterThanOrEqual(0);
    expect(score.efficiency).toBeLessThanOrEqual(1);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(1);
  });

  test('higher keyword coverage produces higher correctness', () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const trace = {
      strategyName: 'test',
      steps: [{ id: 's1', type: 'root', content: 'test', parentId: null, childrenIds: [], score: 0.5, metadata: {}, timestamp: Date.now() }],
      finalOutput: '',
      totalSteps: 1,
      convergenceScore: 0.5,
    };

    const lowScore = scorer.score(trace, problem, 'nothing relevant');
    const highScore = scorer.score(trace, problem,
      'cache invalidation distributed consistency latency write read');

    expect(highScore.correctness).toBeGreaterThan(lowScore.correctness);
  });
});

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;

  beforeAll(() => {
    runner = new BenchmarkRunner();
  });

  test('runProblem returns a valid result', async () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const result = await runner.runProblem(problem);

    expect(result.problemId).toBe(problem.id);
    expect(result.problemTitle).toBe(problem.title);
    expect(result.category).toBe(problem.category);
    expect(result.strategy).toBeDefined();
    expect(result.score.overall).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.improvement).toBeDefined();
  });

  test('runProblem with explicit strategy', async () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const result = await runner.runProblem(problem, 'DialecticalSpiral');
    expect(result.strategy).toBe('DialecticalSpiral');
  });

  test('runProblem scores higher than baseline', async () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const result = await runner.runProblem(problem);
    // Strategy-guided should improve on at least depth vs baseline
    expect(result.score.depthScore).toBeGreaterThan(result.baseline.depthScore);
  });

  test('runCategory returns results for all problems in category', async () => {
    const results = await runner.runCategory('debugging');
    expect(results).toHaveLength(3);
    expect(results.every(r => r.category === 'debugging')).toBe(true);
  });

  test('runAll returns summary with all problems', async () => {
    const summary = await runner.runAll();

    expect(summary.totalProblems).toBe(9);
    expect(summary.results).toHaveLength(9);
    expect(summary.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(Object.keys(summary.byCategory)).toHaveLength(3);

    // Overall improvement should be positive
    expect(summary.averageImprovement.overall).toBeGreaterThan(0);
  }, 30000);

  test('formatResults produces readable output', async () => {
    const summary = await runner.runAll();
    const formatted = runner.formatResults(summary);

    expect(formatted).toContain('Benchmark Results');
    expect(formatted).toContain('Total problems: 9');
    expect(formatted).toContain('By Category');
    expect(formatted).toContain('Average Improvements');
  }, 30000);

  test('improvement metrics are calculated correctly', async () => {
    const problem = BENCHMARK_PROBLEMS[0];
    const result = await runner.runProblem(problem);

    expect(result.improvement.depth).toBeCloseTo(
      result.score.depthScore - result.baseline.depthScore, 5
    );
    expect(result.improvement.overall).toBeCloseTo(
      result.score.overall - result.baseline.overall, 5
    );
  });
});
