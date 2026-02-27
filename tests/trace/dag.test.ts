import { ReasoningDAG } from '../../src/trace/dag';
import { createStep, createTrace } from '../../src/trace/types';

describe('ReasoningTrace types', () => {
  test('createStep creates a step with defaults', () => {
    const step = createStep('s1', 'thesis', 'Some content');
    expect(step.id).toBe('s1');
    expect(step.type).toBe('thesis');
    expect(step.content).toBe('Some content');
    expect(step.parentId).toBeNull();
    expect(step.childrenIds).toEqual([]);
    expect(step.score).toBe(0);
    expect(step.metadata).toEqual({});
    expect(step.timestamp).toBeGreaterThan(0);
  });

  test('createStep creates a step with all params', () => {
    const step = createStep('s2', 'antithesis', 'Counter', 's1', 0.8, { key: 'val' });
    expect(step.parentId).toBe('s1');
    expect(step.score).toBe(0.8);
    expect(step.metadata).toEqual({ key: 'val' });
  });

  test('createTrace creates an empty trace', () => {
    const trace = createTrace('dialectical');
    expect(trace.strategyName).toBe('dialectical');
    expect(trace.steps).toEqual([]);
    expect(trace.finalOutput).toBe('');
    expect(trace.totalSteps).toBe(0);
    expect(trace.convergenceScore).toBe(0);
  });
});

describe('ReasoningDAG', () => {
  let dag: ReasoningDAG;

  beforeEach(() => {
    dag = new ReasoningDAG('test-strategy');
  });

  test('addStep creates a root step', () => {
    const step = dag.addStep('root', 'Root content');
    expect(step.type).toBe('root');
    expect(step.content).toBe('Root content');
    expect(step.parentId).toBeNull();
    expect(dag.getStepCount()).toBe(1);
  });

  test('addStep creates a child step linked to parent', () => {
    const root = dag.addStep('root', 'Root');
    const child = dag.addStep('child', 'Child', root.id);

    expect(child.parentId).toBe(root.id);
    const updatedRoot = dag.getStep(root.id)!;
    expect(updatedRoot.childrenIds).toContain(child.id);
  });

  test('addStep throws for invalid parent', () => {
    expect(() => dag.addStep('child', 'Child', 'nonexistent')).toThrow(
      'Parent step nonexistent not found'
    );
  });

  test('getRoots returns only root steps', () => {
    const r1 = dag.addStep('root', 'Root 1');
    const r2 = dag.addStep('root', 'Root 2');
    dag.addStep('child', 'Child', r1.id);

    const roots = dag.getRoots();
    expect(roots).toHaveLength(2);
    expect(roots.map(r => r.id)).toContain(r1.id);
    expect(roots.map(r => r.id)).toContain(r2.id);
  });

  test('getChildren returns children of a step', () => {
    const root = dag.addStep('root', 'Root');
    const c1 = dag.addStep('child', 'C1', root.id);
    const c2 = dag.addStep('child', 'C2', root.id);

    const children = dag.getChildren(root.id);
    expect(children).toHaveLength(2);
    expect(children.map(c => c.id)).toContain(c1.id);
    expect(children.map(c => c.id)).toContain(c2.id);
  });

  test('getChildren returns empty for unknown id', () => {
    expect(dag.getChildren('nope')).toEqual([]);
  });

  test('getLeaves returns leaf nodes', () => {
    const root = dag.addStep('root', 'Root');
    const c1 = dag.addStep('child', 'C1', root.id);
    const c2 = dag.addStep('child', 'C2', root.id);
    dag.addStep('grandchild', 'GC', c1.id);

    const leaves = dag.getLeaves();
    expect(leaves).toHaveLength(2); // c2 and the grandchild
  });

  test('getDepth returns correct depth', () => {
    expect(dag.getDepth()).toBe(0);

    const root = dag.addStep('root', 'Root');
    expect(dag.getDepth()).toBe(1);

    const child = dag.addStep('child', 'Child', root.id);
    expect(dag.getDepth()).toBe(2);

    dag.addStep('grandchild', 'GC', child.id);
    expect(dag.getDepth()).toBe(3);
  });

  test('getPath finds path between steps', () => {
    const root = dag.addStep('root', 'Root');
    const c1 = dag.addStep('child', 'C1', root.id);
    const c2 = dag.addStep('child', 'C2', root.id);
    const gc = dag.addStep('grandchild', 'GC', c1.id);

    const path = dag.getPath(root.id, gc.id);
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe(root.id);
    expect(path[1].id).toBe(c1.id);
    expect(path[2].id).toBe(gc.id);

    // No path to sibling's child from wrong branch
    const noPath = dag.getPath(c2.id, gc.id);
    expect(noPath).toHaveLength(0);
  });

  test('setFinalOutput and setConvergenceScore update trace', () => {
    dag.setFinalOutput('Final answer');
    dag.setConvergenceScore(0.95);

    const trace = dag.getTrace();
    expect(trace.finalOutput).toBe('Final answer');
    expect(trace.convergenceScore).toBe(0.95);
  });

  test('convergence score is clamped to [0,1]', () => {
    dag.setConvergenceScore(1.5);
    expect(dag.getTrace().convergenceScore).toBe(1);

    dag.setConvergenceScore(-0.5);
    expect(dag.getTrace().convergenceScore).toBe(0);
  });

  test('getTrace returns a copy', () => {
    dag.addStep('root', 'Root');
    const trace1 = dag.getTrace();
    const trace2 = dag.getTrace();
    expect(trace1).toEqual(trace2);
    expect(trace1).not.toBe(trace2);
    expect(trace1.steps).not.toBe(trace2.steps);
  });

  describe('mergeFrom', () => {
    test('imports steps from another trace', () => {
      dag.addStep('root', 'DAG root');

      const otherDAG = new ReasoningDAG('other-strategy');
      otherDAG.addStep('root', 'Other root');
      otherDAG.addStep('child', 'Other child');
      const otherTrace = otherDAG.getTrace();

      dag.mergeFrom(otherTrace);

      expect(dag.getStepCount()).toBe(3); // 1 original + 2 merged
    });

    test('tags imported steps with sourceStrategy', () => {
      dag.addStep('root', 'Main root');

      const otherDAG = new ReasoningDAG('imported-strategy');
      otherDAG.addStep('step', 'Imported step');
      const otherTrace = otherDAG.getTrace();

      dag.mergeFrom(otherTrace);

      const trace = dag.getTrace();
      const importedSteps = trace.steps.filter(
        s => s.metadata.sourceStrategy === 'imported-strategy'
      );
      expect(importedSteps).toHaveLength(1);
      expect(importedSteps[0].content).toBe('Imported step');
    });

    test('links leaves to other trace roots', () => {
      const leaf = dag.addStep('root', 'Leaf node');

      const otherDAG = new ReasoningDAG('other');
      const otherRoot = otherDAG.addStep('root', 'Other root');
      const otherTrace = otherDAG.getTrace();

      dag.mergeFrom(otherTrace);

      // The original leaf should now have the imported root as a child
      const updatedLeaf = dag.getStep(leaf.id);
      expect(updatedLeaf!.childrenIds).toContain(otherRoot.id);
    });

    test('updates totalSteps after merge', () => {
      dag.addStep('a', 'A');
      dag.addStep('b', 'B');

      const otherDAG = new ReasoningDAG('other');
      otherDAG.addStep('c', 'C');
      otherDAG.addStep('d', 'D');
      otherDAG.addStep('e', 'E');

      dag.mergeFrom(otherDAG.getTrace());

      expect(dag.getStepCount()).toBe(5);
    });

    test('handles merging into empty DAG', () => {
      const otherDAG = new ReasoningDAG('other');
      otherDAG.addStep('root', 'Other root');

      dag.mergeFrom(otherDAG.getTrace());

      expect(dag.getStepCount()).toBe(1);
    });

    test('preserves internal parent-child links in merged trace', () => {
      dag.addStep('root', 'Main root');

      const otherDAG = new ReasoningDAG('other');
      const otherRoot = otherDAG.addStep('root', 'Other root');
      const otherChild = otherDAG.addStep('child', 'Other child', otherRoot.id);
      const otherTrace = otherDAG.getTrace();

      dag.mergeFrom(otherTrace);

      // The imported root should have the imported child
      const importedRoot = dag.getStep(otherRoot.id);
      expect(importedRoot!.childrenIds).toContain(otherChild.id);
    });
  });
});
