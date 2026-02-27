/**
 * Base class for all reasoning strategies.
 *
 * Uses the Template Method pattern: subclasses implement `initialize`,
 * `iterate`, and `synthesize` while the base class manages the DAG
 * lifecycle and iteration control.
 */

import { ReasoningDAG } from '../trace/dag';
import { ReasoningTrace } from '../trace/types';

/** Input to a reasoning engine. */
export interface ReasoningInput {
  /** The problem or question to reason about. */
  query: string;
  /** Optional additional context for the query. */
  context?: string;
  /** Maximum reasoning iterations (default: strategy-specific). */
  maxIterations?: number;
  /** Traces from prior strategies, used during composition. */
  priorTraces?: import('../trace/types').ReasoningTrace[];
  /** Answer from a prior strategy in a composition pipeline. */
  priorAnswer?: string;
}

/** Output from a reasoning engine. */
export interface ReasoningOutput {
  /** The full reasoning trace (DAG of steps). */
  trace: ReasoningTrace;
  /** The synthesized final answer. */
  answer: string;
}

/**
 * Abstract base for all reasoning strategies.
 *
 * Lifecycle: `reason()` calls `initialize()` once, then `iterate()` in a
 * loop (up to `maxIterations`), and finally `synthesize()` to produce
 * the answer. Each step is recorded in a {@link ReasoningDAG}.
 */
export abstract class ReasoningEngine {
  abstract readonly name: string;
  abstract readonly description: string;

  protected dag: ReasoningDAG | null = null;

  /** Run the full reasoning pipeline and return the trace + answer. */
  async reason(input: ReasoningInput): Promise<ReasoningOutput> {
    this.dag = new ReasoningDAG(this.name);
    const maxIterations = input.maxIterations || this.getDefaultIterations();

    await this.initialize(input);

    for (let i = 0; i < maxIterations; i++) {
      const shouldContinue = await this.iterate(input, i);
      if (!shouldContinue) break;
    }

    const answer = await this.synthesize(input);
    this.dag.setFinalOutput(answer);

    return {
      trace: this.dag.getTrace(),
      answer,
    };
  }

  /** Set up strategy-specific state before the reasoning loop. */
  protected abstract initialize(input: ReasoningInput): Promise<void>;
  /** Run one reasoning iteration. Return `false` to stop early (convergence). */
  protected abstract iterate(input: ReasoningInput, iteration: number): Promise<boolean>;
  /** Produce the final answer from the accumulated reasoning trace. */
  protected abstract synthesize(input: ReasoningInput): Promise<string>;

  protected getDefaultIterations(): number {
    return 5;
  }

  protected getDAG(): ReasoningDAG {
    if (!this.dag) throw new Error('DAG not initialized. Call reason() first.');
    return this.dag;
  }
}
