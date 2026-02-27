/**
 * Public benchmark runner that compares vanilla LLM responses
 * against strategy-augmented responses.
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 * Uses the Anthropic Messages API directly (zero extra deps).
 */

import { StrategyRouter } from '../strategies/router';
import { PublicBenchmarkProblem, PUBLIC_PROBLEMS, ProblemCategory, getPublicProblemsByCategory } from './public-problems';
import { callClaude } from '../utils/anthropic';

export interface ComparisonResult {
  problemId: string;
  source: string;
  category: ProblemCategory;
  question: string;
  correctAnswer: string;
  vanilla: {
    answer: string;
    correct: boolean;
    timeMs: number;
  };
  augmented: {
    answer: string;
    correct: boolean;
    strategy: string;
    traceSteps: number;
    timeMs: number;
  };
}

export interface ComparisonSummary {
  results: ComparisonResult[];
  vanilla: { correct: number; total: number; accuracy: number };
  augmented: { correct: number; total: number; accuracy: number };
  improvement: number; // percentage points
  byCategory: Record<string, {
    vanillaAccuracy: number;
    augmentedAccuracy: number;
    improvement: number;
    count: number;
  }>;
  totalTimeMs: number;
}

async function callClaudeLocal(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string,
  model: string = 'claude-opus-4-6'
): Promise<string> {
  return callClaude({ messages, systemPrompt, model });
}

function buildVanillaPrompt(problem: PublicBenchmarkProblem): string {
  let prompt = problem.question;
  if (problem.choices) {
    prompt += '\n\nChoices:\n' + problem.choices.join('\n');
  }
  prompt += '\n\nGive ONLY the final answer. For multiple choice, respond with just the letter (e.g. "B"). For math, respond with just the number. For code output, respond with just the output. No explanation.';
  return prompt;
}

function buildAugmentedPrompt(problem: PublicBenchmarkProblem, reasoningTrace: string): string {
  let prompt = `I have a structured reasoning trace for the following problem. Use it to guide your answer.\n\n`;
  prompt += `## Problem\n${problem.question}`;
  if (problem.choices) {
    prompt += '\n\nChoices:\n' + problem.choices.join('\n');
  }
  prompt += `\n\n## Reasoning Trace\n${reasoningTrace}`;
  prompt += '\n\nBased on the reasoning trace above, give ONLY the final answer. For multiple choice, respond with just the letter (e.g. "B"). For math, respond with just the number. For code output, respond with just the output. No explanation.';
  return prompt;
}

function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/^[^a-zA-Z0-9]*/, '')  // strip leading non-alphanum
    .replace(/[^a-zA-Z0-9 ]*$/, '') // strip trailing non-alphanum
    .replace(/^\$/, '')              // strip dollar sign
    .replace(/,/g, '')               // strip commas from numbers
    .trim();
}

function checkCorrect(given: string, expected: string): boolean {
  const normGiven = normalizeAnswer(given).toLowerCase();
  const normExpected = normalizeAnswer(expected).toLowerCase();

  // Direct match
  if (normGiven === normExpected) return true;

  // Check if the answer starts with the correct letter for multiple choice
  if (expected.length === 1 && normGiven.startsWith(expected.toLowerCase())) return true;

  // Check if the expected answer appears in the given answer
  if (normGiven.includes(normExpected)) return true;

  return false;
}

export class PublicBenchmarkRunner {
  private router: StrategyRouter;
  private model: string;

  constructor(model: string = 'claude-opus-4-6') {
    this.router = new StrategyRouter();
    this.model = model;
  }

  async runProblem(problem: PublicBenchmarkProblem): Promise<ComparisonResult> {
    // 1. Vanilla: direct question to Claude
    const vanillaStart = Date.now();
    const vanillaPrompt = buildVanillaPrompt(problem);
    const vanillaAnswer = await callClaudeLocal(
      [{ role: 'user', content: vanillaPrompt }],
      'You are a helpful assistant. Answer questions concisely.',
      this.model
    );
    const vanillaTimeMs = Date.now() - vanillaStart;

    // 2. Augmented: generate reasoning trace, then ask Claude with it
    const augStart = Date.now();

    // Pick the right strategy based on category
    const strategyMap: Record<ProblemCategory, string> = {
      math: 'FractalRecursion',
      science: 'DialecticalSpiral',
      logic: 'MetaCognitiveLoop',
      code: 'SimulatedAnnealing',
    };

    const strategyName = strategyMap[problem.category];
    const reasoningResult = await this.router.reason({
      query: problem.question,
      strategy: strategyName,
      maxIterations: 4,
    });

    // Format trace for the LLM
    const traceText = reasoningResult.trace.steps
      .map((s, i) => `Step ${i + 1} [${s.type}]: ${s.content}`)
      .join('\n');

    const augPrompt = buildAugmentedPrompt(problem, traceText);
    const augAnswer = await callClaudeLocal(
      [{ role: 'user', content: augPrompt }],
      'You are a helpful assistant. Use the provided reasoning trace to guide your answer. Answer concisely.',
      this.model
    );
    const augTimeMs = Date.now() - augStart;

    return {
      problemId: problem.id,
      source: problem.source,
      category: problem.category,
      question: problem.question.substring(0, 100) + (problem.question.length > 100 ? '...' : ''),
      correctAnswer: problem.correctAnswer,
      vanilla: {
        answer: vanillaAnswer.trim(),
        correct: checkCorrect(vanillaAnswer, problem.correctAnswer),
        timeMs: vanillaTimeMs,
      },
      augmented: {
        answer: augAnswer.trim(),
        correct: checkCorrect(augAnswer, problem.correctAnswer),
        strategy: strategyName,
        traceSteps: reasoningResult.trace.totalSteps,
        timeMs: augTimeMs,
      },
    };
  }

  async runCategory(category: ProblemCategory): Promise<ComparisonResult[]> {
    const problems = getPublicProblemsByCategory(category);
    const results: ComparisonResult[] = [];
    for (const problem of problems) {
      results.push(await this.runProblem(problem));
    }
    return results;
  }

  async runAll(): Promise<ComparisonSummary> {
    const startTime = Date.now();
    const results: ComparisonResult[] = [];

    for (const problem of PUBLIC_PROBLEMS) {
      try {
        results.push(await this.runProblem(problem));
      } catch (err) {
        console.error(`Failed on ${problem.id}: ${err}`);
      }
    }

    return this.summarize(results, Date.now() - startTime);
  }

  summarize(results: ComparisonResult[], totalTimeMs: number): ComparisonSummary {
    const vanillaCorrect = results.filter(r => r.vanilla.correct).length;
    const augCorrect = results.filter(r => r.augmented.correct).length;
    const total = results.length;

    const vanillaAccuracy = total > 0 ? vanillaCorrect / total : 0;
    const augAccuracy = total > 0 ? augCorrect / total : 0;

    // By category
    const byCategory: ComparisonSummary['byCategory'] = {};
    for (const r of results) {
      if (!byCategory[r.category]) {
        byCategory[r.category] = { vanillaAccuracy: 0, augmentedAccuracy: 0, improvement: 0, count: 0 };
      }
      byCategory[r.category].count++;
      if (r.vanilla.correct) byCategory[r.category].vanillaAccuracy++;
      if (r.augmented.correct) byCategory[r.category].augmentedAccuracy++;
    }
    for (const cat of Object.keys(byCategory)) {
      const c = byCategory[cat];
      c.vanillaAccuracy = c.vanillaAccuracy / c.count;
      c.augmentedAccuracy = c.augmentedAccuracy / c.count;
      c.improvement = (c.augmentedAccuracy - c.vanillaAccuracy) * 100;
    }

    return {
      results,
      vanilla: { correct: vanillaCorrect, total, accuracy: vanillaAccuracy },
      augmented: { correct: augCorrect, total, accuracy: augAccuracy },
      improvement: (augAccuracy - vanillaAccuracy) * 100,
      byCategory,
      totalTimeMs,
    };
  }

  formatSummary(summary: ComparisonSummary): string {
    const lines: string[] = [];
    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║     PUBLIC BENCHMARK: Vanilla vs Strategy-Augmented        ║');
    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    lines.push(`Model: ${this.model}`);
    lines.push(`Problems: ${summary.vanilla.total}`);
    lines.push(`Time: ${(summary.totalTimeMs / 1000).toFixed(1)}s\n`);

    // Per-problem results
    lines.push('┌──────────┬────────────┬─────────────────┬─────────────────┐');
    lines.push('│ Problem  │ Category   │ Vanilla         │ Augmented       │');
    lines.push('├──────────┼────────────┼─────────────────┼─────────────────┤');
    for (const r of summary.results) {
      const vMark = r.vanilla.correct ? '✓' : '✗';
      const aMark = r.augmented.correct ? '✓' : '✗';
      const pid = r.problemId.padEnd(8);
      const cat = r.category.padEnd(10);
      const vCol = `${vMark} ${r.vanilla.answer.substring(0, 12)}`.padEnd(15);
      const aCol = `${aMark} ${r.augmented.answer.substring(0, 12)}`.padEnd(15);
      lines.push(`│ ${pid} │ ${cat} │ ${vCol} │ ${aCol} │`);
    }
    lines.push('└──────────┴────────────┴─────────────────┴─────────────────┘\n');

    // Summary
    lines.push('── Overall Accuracy ──────────────────────────────────');
    lines.push(`  Vanilla:    ${summary.vanilla.correct}/${summary.vanilla.total} (${(summary.vanilla.accuracy * 100).toFixed(1)}%)`);
    lines.push(`  Augmented:  ${summary.augmented.correct}/${summary.augmented.total} (${(summary.augmented.accuracy * 100).toFixed(1)}%)`);
    lines.push(`  Improvement: ${summary.improvement >= 0 ? '+' : ''}${summary.improvement.toFixed(1)} percentage points\n`);

    // By category
    lines.push('── By Category ───────────────────────────────────────');
    for (const [cat, data] of Object.entries(summary.byCategory)) {
      lines.push(`  ${cat}: vanilla ${(data.vanillaAccuracy * 100).toFixed(0)}% → augmented ${(data.augmentedAccuracy * 100).toFixed(0)}% (${data.improvement >= 0 ? '+' : ''}${data.improvement.toFixed(0)}pp)`);
    }

    return lines.join('\n');
  }
}
