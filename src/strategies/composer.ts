/**
 * Multi-strategy composition engine.
 *
 * Combines reasoning strategies in three modes:
 * - **sequential**: chains strategies one after another, each building on the prior trace
 * - **ensemble**: runs all strategies in parallel, picks the best by majority vote or convergence
 * - **feedback**: auto-selects strategies iteratively until convergence >= 0.7
 *
 * Provides built-in presets (`deep-analysis`, `debug-verify`, `full-review`)
 * for common workflows.
 */

import { ReasoningEngine, ReasoningInput, ReasoningOutput } from './base';
import { ReasoningDAG } from '../trace/dag';
import { ReasoningTrace } from '../trace/types';

/** How to combine multiple strategies. */
export type CompositionMode = 'sequential' | 'ensemble' | 'feedback';

/** Result of a multi-strategy composition run. */
export interface CompositionResult {
  /** Unified trace spanning all strategies used. */
  trace: ReasoningTrace;
  /** Final synthesized answer. */
  answer: string;
  /** Names of strategies that were executed, in order. */
  strategiesUsed: string[];
  /** Total reasoning steps across all strategies. */
  totalSteps: number;
}

/** Available built-in composition presets. */
export type PresetName = 'deep-analysis' | 'debug-verify' | 'full-review';

interface PresetDef {
  strategies: string[];
  description: string;
}

const PRESETS: Record<PresetName, PresetDef> = {
  'deep-analysis': {
    strategies: ['FractalRecursion', 'DialecticalSpiral', 'MetaCognitiveLoop'],
    description: 'Decompose, explore trade-offs, then self-verify. Best for complex design questions.',
  },
  'debug-verify': {
    strategies: ['SimulatedAnnealing', 'AdversarialSelfPlay'],
    description: 'Find the fix, then stress-test it. Best for bugs and error investigation.',
  },
  'full-review': {
    strategies: ['FractalRecursion', 'AdversarialSelfPlay', 'HippocampalReplay'],
    description: 'Break down, attack, then learn from patterns. Best for code/architecture review.',
  },
};

export class StrategyComposer {
  private strategyMap: Map<string, ReasoningEngine>;

  constructor(strategies: Map<string, ReasoningEngine>) {
    this.strategyMap = strategies;
  }

  async compose(
    input: ReasoningInput,
    mode?: CompositionMode,
    strategyNames?: string[],
    preset?: PresetName,
    maxRounds?: number
  ): Promise<CompositionResult> {
    // Feedback mode: auto-selects strategies, doesn't need names or preset
    if (mode === 'feedback') {
      return this.feedback(input, maxRounds);
    }

    // Resolve which strategies to use
    const names = this.resolveStrategyNames(strategyNames, preset);
    const engines = this.resolveEngines(names);

    // Default mode: sequential (the most common and intuitive)
    const resolvedMode = mode || 'sequential';

    switch (resolvedMode) {
      case 'sequential':
        return this.sequential(input, engines);
      case 'ensemble':
        return this.ensemble(input, engines);
      default:
        throw new Error(
          `Unknown composition mode: "${resolvedMode}". Use "sequential", "ensemble", or "feedback".`
        );
    }
  }

  async sequential(
    input: ReasoningInput,
    strategies: ReasoningEngine[]
  ): Promise<CompositionResult> {
    if (strategies.length === 0) {
      throw new Error('At least one strategy is required for sequential composition');
    }

    const combinedDAG = new ReasoningDAG('sequential-composition');
    const strategiesUsed: string[] = [];
    const priorTraces: ReasoningTrace[] = [];
    let currentAnswer = '';

    for (const strategy of strategies) {
      const strategyInput: ReasoningInput = {
        ...input,
        priorTraces: priorTraces.length > 0 ? [...priorTraces] : undefined,
        priorAnswer: currentAnswer || undefined,
      };

      const result = await strategy.reason(strategyInput);

      priorTraces.push(result.trace);
      currentAnswer = result.answer;
      strategiesUsed.push(strategy.name);

      combinedDAG.mergeFrom(result.trace);
    }

    // Weighted convergence: later strategies weighted higher
    const weightedConvergence = this.weightedAverageConvergence(priorTraces);
    combinedDAG.setConvergenceScore(weightedConvergence);
    combinedDAG.setFinalOutput(currentAnswer);

    return {
      trace: combinedDAG.getTrace(),
      answer: currentAnswer,
      strategiesUsed,
      totalSteps: combinedDAG.getStepCount(),
    };
  }

  async ensemble(
    input: ReasoningInput,
    strategies: ReasoningEngine[]
  ): Promise<CompositionResult> {
    if (strategies.length === 0) {
      throw new Error('At least one strategy is required for ensemble composition');
    }

    // Run all strategies independently
    const results = await Promise.all(
      strategies.map(s => s.reason(input))
    );

    // Find the winner: highest convergence score
    let bestIdx = 0;
    let bestConvergence = 0;
    const answers: string[] = [];

    for (let i = 0; i < results.length; i++) {
      answers.push(results[i].answer);
      const convergence = results[i].trace.convergenceScore;
      if (convergence > bestConvergence) {
        bestConvergence = convergence;
        bestIdx = i;
      }
    }

    // Check for majority vote (if answers match)
    const answerCounts = new Map<string, number>();
    for (const answer of answers) {
      answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1);
    }

    let finalAnswer = results[bestIdx].answer;
    let maxVotes = 0;
    for (const [answer, count] of answerCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        finalAnswer = answer;
      }
    }

    // If no majority (all different), use highest convergence
    if (maxVotes === 1) {
      finalAnswer = results[bestIdx].answer;
    }

    // Merge DAGs: create ensemble root, then merge all traces
    const combinedDAG = new ReasoningDAG('ensemble-composition');
    combinedDAG.addStep(
      'ensemble-root',
      `Ensemble of ${strategies.length} strategies: ${strategies.map(s => s.name).join(', ')}`,
      null,
      1.0,
      { mode: 'ensemble', strategyCount: strategies.length }
    );

    for (const result of results) {
      combinedDAG.mergeFrom(result.trace);
    }

    // Add voting/synthesis step
    const strategiesUsed = strategies.map(s => s.name);
    combinedDAG.addStep(
      'voting',
      `Voting result: selected answer from ${maxVotes > 1 ? 'majority vote' : 'highest convergence'}. ` +
        `Strategies: ${strategiesUsed.join(', ')}. ` +
        `Convergence scores: ${results.map((r, i) => `${strategiesUsed[i]}=${r.trace.convergenceScore.toFixed(2)}`).join(', ')}`,
      null,
      bestConvergence,
      {
        mode: 'voting',
        winner: maxVotes > 1 ? 'majority' : 'convergence',
        votes: Object.fromEntries(answerCounts),
      }
    );

    combinedDAG.setConvergenceScore(bestConvergence);
    combinedDAG.setFinalOutput(finalAnswer);

    return {
      trace: combinedDAG.getTrace(),
      answer: finalAnswer,
      strategiesUsed,
      totalSteps: combinedDAG.getStepCount(),
    };
  }

  async feedback(
    input: ReasoningInput,
    maxRounds: number = 3
  ): Promise<CompositionResult> {
    const combinedDAG = new ReasoningDAG('feedback-composition');
    const strategiesUsed: string[] = [];
    const priorTraces: ReasoningTrace[] = [];
    let currentAnswer = '';
    let currentConvergence = 0;
    const convergenceThreshold = 0.7;

    for (let round = 0; round < maxRounds; round++) {
      // Select strategy based on round and convergence
      const strategy = round === 0
        ? this.selectInitialStrategy(input.query)
        : this.selectComplementaryStrategy(currentConvergence, strategiesUsed);

      if (!strategy) break;

      const strategyInput: ReasoningInput = {
        ...input,
        priorTraces: priorTraces.length > 0 ? [...priorTraces] : undefined,
        priorAnswer: currentAnswer || undefined,
      };

      const result = await strategy.reason(strategyInput);

      priorTraces.push(result.trace);
      currentAnswer = result.answer;
      currentConvergence = result.trace.convergenceScore;
      strategiesUsed.push(strategy.name);

      combinedDAG.mergeFrom(result.trace);

      // Stop if convergence threshold met
      if (currentConvergence >= convergenceThreshold) break;
    }

    combinedDAG.setConvergenceScore(currentConvergence);
    combinedDAG.setFinalOutput(currentAnswer);

    return {
      trace: combinedDAG.getTrace(),
      answer: currentAnswer,
      strategiesUsed,
      totalSteps: combinedDAG.getStepCount(),
    };
  }

  getPresetStrategies(preset: PresetName): string[] {
    const def = PRESETS[preset];
    if (!def) {
      throw new Error(
        `Unknown preset: "${preset}". Available presets:\n` +
        Object.entries(PRESETS).map(([name, d]) => `  - ${name}: ${d.description}`).join('\n')
      );
    }
    return def.strategies;
  }

  static getPresetDescriptions(): Record<PresetName, string> {
    const result = {} as Record<PresetName, string>;
    for (const [name, def] of Object.entries(PRESETS)) {
      result[name as PresetName] = def.description;
    }
    return result;
  }

  private resolveStrategyNames(names?: string[], preset?: PresetName): string[] {
    if (preset) {
      return this.getPresetStrategies(preset);
    }
    if (names && names.length > 0) {
      return names;
    }
    throw new Error(
      'Specify either "strategies" (list of strategy names) or "preset" (a built-in recipe).\n\n' +
      'Presets:\n' +
      Object.entries(PRESETS).map(([name, d]) => `  - "${name}": ${d.description}`).join('\n') +
      '\n\nStrategies: ' + Array.from(this.strategyMap.keys()).join(', ')
    );
  }

  private resolveEngines(names: string[]): ReasoningEngine[] {
    return names.map(name => {
      const engine = this.strategyMap.get(name);
      if (!engine) {
        throw new Error(
          `Unknown strategy: "${name}". Available: ${Array.from(this.strategyMap.keys()).join(', ')}`
        );
      }
      return engine;
    });
  }

  private weightedAverageConvergence(traces: ReasoningTrace[]): number {
    if (traces.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < traces.length; i++) {
      const weight = i + 1; // Later strategies weighted higher
      weightedSum += traces[i].convergenceScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private selectInitialStrategy(query: string): ReasoningEngine | null {
    // Use FractalRecursion as default initial strategy for decomposition
    return this.strategyMap.get('FractalRecursion') ||
      this.strategyMap.values().next().value || null;
  }

  private selectComplementaryStrategy(
    convergence: number,
    usedStrategies: string[]
  ): ReasoningEngine | null {
    let targetName: string;

    if (convergence < 0.3) {
      // Very low confidence: try MetaCognitive for self-reflection
      targetName = 'MetaCognitiveLoop';
    } else if (convergence < 0.5) {
      // Low confidence: try dialectical exploration
      targetName = 'DialecticalSpiral';
    } else {
      // Moderate confidence but needs validation: try adversarial
      targetName = 'AdversarialSelfPlay';
    }

    // If already used, find next unused strategy
    if (usedStrategies.includes(targetName)) {
      for (const [name, engine] of this.strategyMap) {
        if (!usedStrategies.includes(name)) {
          return engine;
        }
      }
      return null; // All strategies exhausted
    }

    return this.strategyMap.get(targetName) || null;
  }
}
