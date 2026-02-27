/**
 * Strategy router: auto-selects the best reasoning strategy for a query.
 *
 * Matches query keywords against signal patterns to pick the most
 * relevant strategy. Multi-word keyword matches score higher (2 vs 1).
 * Falls back to FractalRecursion when no keywords match.
 *
 * Also provides access to {@link StrategyComposer} for multi-strategy
 * pipelines via `compose()`.
 */

import { ReasoningEngine, ReasoningInput, ReasoningOutput } from './base';
import { FractalRecursion } from './fractal-recursion';
import { DialecticalSpiral } from './dialectical-spiral';
import { SimulatedAnnealing } from './simulated-annealing';
import { MetaCognitiveLoop } from './metacognitive-loop';
import { AdversarialSelfPlay } from './adversarial-self-play';
import { HippocampalReplay } from './hippocampal-replay';
import { StrategyComposer, CompositionMode, CompositionResult, PresetName } from './composer';

interface SignalPattern {
  keywords: string[];
  strategy: string;
}

const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    keywords: ['build', 'implement', 'create', 'design', 'feature', 'add', 'develop', 'scaffold'],
    strategy: 'FractalRecursion',
  },
  {
    keywords: ['choose', 'compare', 'tradeoff', 'trade-off', 'versus', 'vs', 'decide', 'which', 'better'],
    strategy: 'DialecticalSpiral',
  },
  {
    keywords: ['bug', 'error', 'failing', 'broken', 'debug', 'fix', 'crash', 'exception', 'issue'],
    strategy: 'SimulatedAnnealing',
  },
  {
    keywords: ['not working', 'tried everything', 'stuck', 'confused', 'help', 'unclear', 'lost'],
    strategy: 'MetaCognitiveLoop',
  },
  {
    keywords: ['review', 'secure', 'vulnerability', 'attack', 'audit', 'safety', 'risk', 'threat'],
    strategy: 'AdversarialSelfPlay',
  },
  {
    keywords: ['why did', 'what if', 'last time', 'learned', 'mistake', 'history', 'replay', 'previous'],
    strategy: 'HippocampalReplay',
  },
];

export class StrategyRouter {
  private strategies: Map<string, ReasoningEngine>;
  private composer: StrategyComposer;

  constructor() {
    this.strategies = new Map<string, ReasoningEngine>([
      ['FractalRecursion', new FractalRecursion()],
      ['DialecticalSpiral', new DialecticalSpiral()],
      ['SimulatedAnnealing', new SimulatedAnnealing()],
      ['MetaCognitiveLoop', new MetaCognitiveLoop()],
      ['AdversarialSelfPlay', new AdversarialSelfPlay()],
      ['HippocampalReplay', new HippocampalReplay()],
    ]);
    this.composer = new StrategyComposer(this.strategies);
  }

  selectStrategy(query: string): ReasoningEngine {
    const queryLower = query.toLowerCase();
    let bestMatch: { strategy: string; score: number } = {
      strategy: 'FractalRecursion',
      score: 0,
    };

    for (const pattern of SIGNAL_PATTERNS) {
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (queryLower.includes(keyword)) {
          score += keyword.includes(' ') ? 2 : 1; // Multi-word matches score higher
        }
      }
      if (score > bestMatch.score) {
        bestMatch = { strategy: pattern.strategy, score };
      }
    }

    return this.strategies.get(bestMatch.strategy)!;
  }

  getStrategy(name: string): ReasoningEngine | undefined {
    return this.strategies.get(name);
  }

  listStrategies(): Array<{ name: string; description: string }> {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      description: s.description,
    }));
  }

  async reason(input: ReasoningInput & { strategy?: string }): Promise<ReasoningOutput> {
    let engine: ReasoningEngine;

    if (input.strategy) {
      const specified = this.strategies.get(input.strategy);
      if (!specified) {
        throw new Error(
          `Unknown strategy: ${input.strategy}. Available: ${Array.from(this.strategies.keys()).join(', ')}`
        );
      }
      engine = specified;
    } else {
      engine = this.selectStrategy(input.query);
    }

    return engine.reason(input);
  }

  async compose(
    input: ReasoningInput,
    mode?: CompositionMode,
    strategies?: string[],
    preset?: PresetName,
    maxRounds?: number
  ): Promise<CompositionResult> {
    return this.composer.compose(input, mode, strategies, preset, maxRounds);
  }
}
