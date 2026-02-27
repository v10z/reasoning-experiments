/**
 * Directed acyclic graph for reasoning traces.
 *
 * Each reasoning session builds a DAG of {@link ReasoningStep} nodes.
 * Steps link parent→children to form a tree from problem decomposition
 * to final synthesis. Supports cross-strategy merging via `mergeFrom()`
 * so composition pipelines produce a single unified graph.
 */

import { ReasoningStep, ReasoningTrace, createStep, createTrace } from './types';
import { generateId } from '../utils/id';

export class ReasoningDAG {
  private trace: ReasoningTrace;
  private stepMap: Map<string, ReasoningStep>;

  constructor(strategyName: string) {
    this.trace = createTrace(strategyName);
    this.stepMap = new Map();
  }

  addStep(
    type: string,
    content: string,
    parentId: string | null = null,
    score: number = 0,
    metadata: Record<string, unknown> = {}
  ): ReasoningStep {
    const id = generateId();
    const step = createStep(id, type, content, parentId, score, metadata);

    if (parentId !== null) {
      const parent = this.stepMap.get(parentId);
      if (!parent) {
        throw new Error(`Parent step ${parentId} not found`);
      }
      parent.childrenIds.push(id);
    }

    this.stepMap.set(id, step);
    this.trace.steps.push(step);
    this.trace.totalSteps = this.trace.steps.length;

    return step;
  }

  getStep(id: string): ReasoningStep | undefined {
    return this.stepMap.get(id);
  }

  getRoots(): ReasoningStep[] {
    return this.trace.steps.filter(s => s.parentId === null);
  }

  getChildren(id: string): ReasoningStep[] {
    const step = this.stepMap.get(id);
    if (!step) return [];
    return step.childrenIds
      .map(cid => this.stepMap.get(cid))
      .filter((s): s is ReasoningStep => s !== undefined);
  }

  getPath(fromId: string, toId: string): ReasoningStep[] {
    const path: ReasoningStep[] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string): boolean => {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const step = this.stepMap.get(currentId);
      if (!step) return false;

      path.push(step);

      if (currentId === toId) return true;

      for (const childId of step.childrenIds) {
        if (dfs(childId)) return true;
      }

      path.pop();
      return false;
    };

    dfs(fromId);
    return path;
  }

  getLeaves(): ReasoningStep[] {
    return this.trace.steps.filter(s => s.childrenIds.length === 0);
  }

  getDepth(): number {
    const roots = this.getRoots();
    if (roots.length === 0) return 0;

    const maxDepth = (step: ReasoningStep, depth: number): number => {
      if (step.childrenIds.length === 0) return depth;
      return Math.max(
        ...step.childrenIds.map(cid => {
          const child = this.stepMap.get(cid);
          return child ? maxDepth(child, depth + 1) : depth;
        })
      );
    };

    return Math.max(...roots.map(r => maxDepth(r, 1)));
  }

  setFinalOutput(output: string): void {
    this.trace.finalOutput = output;
  }

  setConvergenceScore(score: number): void {
    this.trace.convergenceScore = Math.max(0, Math.min(1, score));
  }

  getTrace(): ReasoningTrace {
    return { ...this.trace, steps: [...this.trace.steps] };
  }

  /**
   * Graft another trace's DAG onto the leaves of this one.
   * Used by StrategyComposer to link sequential strategy traces into
   * a single graph. Each imported step is tagged with `sourceStrategy`.
   */
  mergeFrom(otherTrace: ReasoningTrace): void {
    const leaves = this.getLeaves();

    // Find roots in the other trace (steps whose parentId is null or not in otherTrace)
    const otherStepIds = new Set(otherTrace.steps.map(s => s.id));
    const otherRoots = otherTrace.steps.filter(
      s => s.parentId === null || !otherStepIds.has(s.parentId)
    );

    // Import all steps from the other trace, tagging each with sourceStrategy
    for (const step of otherTrace.steps) {
      const taggedStep: ReasoningStep = {
        ...step,
        childrenIds: [...step.childrenIds],
        metadata: { ...step.metadata, sourceStrategy: otherTrace.strategyName },
      };
      this.stepMap.set(taggedStep.id, taggedStep);
      this.trace.steps.push(taggedStep);
    }

    // Link current DAG's leaves to the other trace's roots
    for (const leaf of leaves) {
      for (const root of otherRoots) {
        leaf.childrenIds.push(root.id);
        // Update parentId for roots that had null parent
        if (root.parentId === null) {
          const imported = this.stepMap.get(root.id);
          if (imported) {
            imported.parentId = leaf.id;
          }
        }
      }
    }

    this.trace.totalSteps = this.trace.steps.length;
  }

  getStepCount(): number {
    return this.trace.totalSteps;
  }
}
