import { PublicBenchmarkRunner } from '../../src/benchmarks/public-runner';
import {
  PUBLIC_PROBLEMS,
  getPublicProblemsByCategory,
  getPublicProblemsBySource,
} from '../../src/benchmarks/public-problems';

describe('PublicBenchmarkProblems', () => {
  test('has 20 total problems', () => {
    expect(PUBLIC_PROBLEMS).toHaveLength(20);
  });

  test('has 5 problems per category', () => {
    expect(getPublicProblemsByCategory('math')).toHaveLength(5);
    expect(getPublicProblemsByCategory('science')).toHaveLength(5);
    expect(getPublicProblemsByCategory('logic')).toHaveLength(5);
    expect(getPublicProblemsByCategory('code')).toHaveLength(5);
  });

  test('problems by source', () => {
    expect(getPublicProblemsBySource('GSM8K')).toHaveLength(5);
    expect(getPublicProblemsBySource('ARC-Challenge')).toHaveLength(5);
    expect(getPublicProblemsBySource('LogiQA')).toHaveLength(5);
    expect(getPublicProblemsBySource('CodeReasoning')).toHaveLength(5);
  });

  test('all problems have required fields', () => {
    for (const p of PUBLIC_PROBLEMS) {
      expect(p.id).toBeDefined();
      expect(p.source).toBeDefined();
      expect(p.category).toBeDefined();
      expect(p.question.length).toBeGreaterThan(10);
      expect(p.correctAnswer).toBeDefined();
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
    }
  });

  test('multiple choice problems have choices', () => {
    const mc = PUBLIC_PROBLEMS.filter(p => p.choices);
    expect(mc.length).toBeGreaterThan(0);
    for (const p of mc) {
      expect(p.choices!.length).toBeGreaterThanOrEqual(2);
      expect(p.correctAnswer).toMatch(/^[A-D]$/);
    }
  });

  test('math problems have numeric answers', () => {
    const math = getPublicProblemsByCategory('math');
    for (const p of math) {
      expect(p.correctAnswer).toMatch(/^[\d ]+$/);
    }
  });
});

describe('PublicBenchmarkRunner (offline)', () => {
  let runner: PublicBenchmarkRunner;

  beforeAll(() => {
    runner = new PublicBenchmarkRunner();
  });

  test('summarize computes correct accuracy', () => {
    const results = [
      {
        problemId: 'test-1', source: 'test', category: 'math' as const,
        question: 'q1', correctAnswer: '5',
        vanilla: { answer: '5', correct: true, timeMs: 100 },
        augmented: { answer: '5', correct: true, strategy: 'FractalRecursion', traceSteps: 10, timeMs: 200 },
      },
      {
        problemId: 'test-2', source: 'test', category: 'math' as const,
        question: 'q2', correctAnswer: '10',
        vanilla: { answer: '7', correct: false, timeMs: 100 },
        augmented: { answer: '10', correct: true, strategy: 'FractalRecursion', traceSteps: 10, timeMs: 200 },
      },
    ];

    const summary = runner.summarize(results, 1000);

    expect(summary.vanilla.correct).toBe(1);
    expect(summary.vanilla.total).toBe(2);
    expect(summary.vanilla.accuracy).toBeCloseTo(0.5);

    expect(summary.augmented.correct).toBe(2);
    expect(summary.augmented.accuracy).toBeCloseTo(1.0);

    expect(summary.improvement).toBeCloseTo(50); // 50 percentage points
  });

  test('summarize groups by category correctly', () => {
    const results = [
      {
        problemId: 'test-1', source: 'test', category: 'math' as const,
        question: 'q1', correctAnswer: '5',
        vanilla: { answer: '5', correct: true, timeMs: 100 },
        augmented: { answer: '5', correct: true, strategy: 'X', traceSteps: 5, timeMs: 200 },
      },
      {
        problemId: 'test-2', source: 'test', category: 'logic' as const,
        question: 'q2', correctAnswer: 'B',
        vanilla: { answer: 'A', correct: false, timeMs: 100 },
        augmented: { answer: 'B', correct: true, strategy: 'Y', traceSteps: 5, timeMs: 200 },
      },
    ];

    const summary = runner.summarize(results, 500);
    expect(summary.byCategory.math.vanillaAccuracy).toBeCloseTo(1.0);
    expect(summary.byCategory.logic.vanillaAccuracy).toBeCloseTo(0);
    expect(summary.byCategory.logic.augmentedAccuracy).toBeCloseTo(1.0);
  });

  test('formatSummary produces readable output', () => {
    const results = [
      {
        problemId: 'gsm8k-1', source: 'GSM8K', category: 'math' as const,
        question: 'Test question...', correctAnswer: '18',
        vanilla: { answer: '18', correct: true, timeMs: 500 },
        augmented: { answer: '18', correct: true, strategy: 'FractalRecursion', traceSteps: 15, timeMs: 800 },
      },
    ];

    const summary = runner.summarize(results, 1300);
    const formatted = runner.formatSummary(summary);

    expect(formatted).toContain('PUBLIC BENCHMARK');
    expect(formatted).toContain('Vanilla');
    expect(formatted).toContain('Augmented');
    expect(formatted).toContain('By Category');
  });

  test('summarize handles empty results', () => {
    const summary = runner.summarize([], 0);
    expect(summary.vanilla.accuracy).toBe(0);
    expect(summary.augmented.accuracy).toBe(0);
    expect(summary.improvement).toBe(0);
  });
});
