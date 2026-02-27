import { ReasoningTrace } from '../trace/types';
import { BenchmarkProblem } from './problems';

export interface BenchmarkScore {
  depthScore: number;        // How many reasoning levels deep (0-1)
  convergenceScore: number;  // How well the answer stabilized (0-1)
  correctness: number;       // Keyword coverage as proxy for correctness (0-1)
  completeness: number;      // Coverage of all problem aspects (0-1)
  efficiency: number;        // Steps-to-insight ratio (0-1)
  overall: number;           // Weighted average (0-1)
}

export interface ScorerConfig {
  weights: {
    depth: number;
    convergence: number;
    correctness: number;
    completeness: number;
    efficiency: number;
  };
}

const DEFAULT_WEIGHTS: ScorerConfig['weights'] = {
  depth: 0.2,
  convergence: 0.2,
  correctness: 0.25,
  completeness: 0.2,
  efficiency: 0.15,
};

export class BenchmarkScorer {
  private weights: ScorerConfig['weights'];

  constructor(config?: Partial<ScorerConfig>) {
    this.weights = config?.weights || DEFAULT_WEIGHTS;
  }

  score(trace: ReasoningTrace, problem: BenchmarkProblem, answer: string): BenchmarkScore {
    const depthScore = this.scoreDepth(trace, problem);
    const convergenceScore = trace.convergenceScore;
    const correctness = this.scoreCorrectness(answer, problem);
    const completeness = this.scoreCompleteness(trace, answer, problem);
    const efficiency = this.scoreEfficiency(trace, problem);

    const overall =
      depthScore * this.weights.depth +
      convergenceScore * this.weights.convergence +
      correctness * this.weights.correctness +
      completeness * this.weights.completeness +
      efficiency * this.weights.efficiency;

    return {
      depthScore,
      convergenceScore,
      correctness,
      completeness,
      efficiency,
      overall,
    };
  }

  private scoreDepth(trace: ReasoningTrace, problem: BenchmarkProblem): number {
    // Calculate actual depth from step parent-child relationships
    const stepMap = new Map(trace.steps.map(s => [s.id, s]));
    let maxDepth = 0;

    for (const step of trace.steps) {
      let depth = 1;
      let current = step;
      while (current.parentId) {
        const parent = stepMap.get(current.parentId);
        if (!parent) break;
        depth++;
        current = parent;
      }
      maxDepth = Math.max(maxDepth, depth);
    }

    // Score relative to expected depth
    return Math.min(1, maxDepth / (problem.expectedDepth * 2));
  }

  private scoreCorrectness(answer: string, problem: BenchmarkProblem): number {
    const answerLower = answer.toLowerCase();
    let matches = 0;

    for (const keyword of problem.expectedKeywords) {
      if (answerLower.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return problem.expectedKeywords.length > 0
      ? matches / problem.expectedKeywords.length
      : 0;
  }

  private scoreCompleteness(trace: ReasoningTrace, answer: string, problem: BenchmarkProblem): number {
    // Completeness based on: step variety, answer length, and keyword coverage
    const stepTypes = new Set(trace.steps.map(s => s.type));
    const typeVariety = Math.min(1, stepTypes.size / 4); // At least 4 different step types

    const answerLength = answer.length;
    const lengthScore = Math.min(1, answerLength / 500); // Good answers are at least 500 chars

    const keywordScore = this.scoreCorrectness(answer, problem);

    return (typeVariety * 0.3 + lengthScore * 0.3 + keywordScore * 0.4);
  }

  private scoreEfficiency(trace: ReasoningTrace, problem: BenchmarkProblem): number {
    // Fewer steps for same depth = more efficient
    const idealSteps = problem.expectedDepth * 3; // ~3 steps per depth level
    const actualSteps = trace.totalSteps;

    if (actualSteps === 0) return 0;
    if (actualSteps <= idealSteps) return 1;

    // Diminishing returns for extra steps
    return Math.max(0.2, idealSteps / actualSteps);
  }

  static createBaseline(problem: BenchmarkProblem): BenchmarkScore {
    return {
      depthScore: 0.2,
      convergenceScore: 0.3,
      correctness: 0.4,
      completeness: 0.3,
      efficiency: 0.5,
      overall: 0.34,
    };
  }
}
