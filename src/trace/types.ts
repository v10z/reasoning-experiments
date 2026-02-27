/** A single node in the reasoning DAG. */
export interface ReasoningStep {
  /** Unique identifier for this step. */
  id: string;
  /** Step type (e.g., "decomposition", "thesis", "attack", "synthesis"). */
  type: string;
  /** The reasoning content produced at this step. */
  content: string;
  /** ID of the parent step, or null for root nodes. */
  parentId: string | null;
  /** IDs of child steps branching from this node. */
  childrenIds: string[];
  /** Quality/confidence score for this step (0-1). */
  score: number;
  /** Strategy-specific metadata (e.g., temperature, sourceStrategy). */
  metadata: Record<string, unknown>;
  /** Unix timestamp when this step was created. */
  timestamp: number;
}

/**
 * Complete reasoning trace from a single strategy run.
 * Contains the DAG of steps plus summary metrics.
 */
export interface ReasoningTrace {
  /** Name of the strategy that produced this trace. */
  strategyName: string;
  /** All reasoning steps in insertion order. */
  steps: ReasoningStep[];
  /** The final synthesized answer. */
  finalOutput: string;
  /** Total number of steps in the trace. */
  totalSteps: number;
  /** Convergence score (0-1): how confident the strategy is in its answer. */
  convergenceScore: number;
}

export function createStep(
  id: string,
  type: string,
  content: string,
  parentId: string | null = null,
  score: number = 0,
  metadata: Record<string, unknown> = {}
): ReasoningStep {
  return {
    id,
    type,
    content,
    parentId,
    childrenIds: [],
    score,
    metadata,
    timestamp: Date.now(),
  };
}

export function createTrace(strategyName: string): ReasoningTrace {
  return {
    strategyName,
    steps: [],
    finalOutput: '',
    totalSteps: 0,
    convergenceScore: 0,
  };
}
