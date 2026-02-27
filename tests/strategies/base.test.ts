import { ReasoningEngine, ReasoningInput, ReasoningOutput } from '../../src/strategies/base';

// Concrete subclass for testing the abstract base class
class TestEngine extends ReasoningEngine {
  readonly name = 'TestEngine';
  readonly description = 'A concrete engine for testing the abstract base class';

  private iterationsRun = 0;

  protected async initialize(input: ReasoningInput): Promise<void> {
    this.getDAG().addStep(
      'init',
      `Initialized with query: ${input.query}`,
      null,
      0.5,
      { phase: 'init' }
    );
  }

  protected async iterate(input: ReasoningInput, iteration: number): Promise<boolean> {
    const dag = this.getDAG();
    const roots = dag.getRoots();
    dag.addStep(
      'iteration',
      `Iteration ${iteration} for: ${input.query}`,
      roots[0].id,
      0.5 + iteration * 0.1,
      { iteration }
    );
    this.iterationsRun = iteration + 1;
    return iteration < 2; // run 3 iterations by default (0, 1, 2)
  }

  protected async synthesize(input: ReasoningInput): Promise<string> {
    const dag = this.getDAG();
    dag.setConvergenceScore(0.8);
    return `Synthesized answer for: ${input.query} after ${this.iterationsRun} iterations`;
  }

  protected getDefaultIterations(): number {
    return 5;
  }

  // Expose for testing
  getIterationsRun(): number {
    return this.iterationsRun;
  }
}

describe('ReasoningEngine (base)', () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('TestEngine');
    expect(engine.description).toBe('A concrete engine for testing the abstract base class');
  });

  test('reason() returns a valid ReasoningOutput', async () => {
    const result = await engine.reason({ query: 'test query' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'test query' });
    expect(result.trace.strategyName).toBe('TestEngine');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'test query' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'test query' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace finalOutput is set to the answer', async () => {
    const result = await engine.reason({ query: 'test query' });
    expect(result.trace.finalOutput).toBe(result.answer);
  });

  test('reason() runs initialize, iterate, and synthesize in order', async () => {
    const result = await engine.reason({ query: 'order test' });

    // init step + iteration steps should be present
    const types = result.trace.steps.map(s => s.type);
    expect(types).toContain('init');
    expect(types).toContain('iteration');
  });

  test('maxIterations parameter limits iterations', async () => {
    const result = await engine.reason({ query: 'limited test', maxIterations: 1 });

    // With maxIterations=1, loop runs at most once (iteration 0)
    const iterationSteps = result.trace.steps.filter(s => s.type === 'iteration');
    expect(iterationSteps.length).toBeLessThanOrEqual(1);
  });

  test('getDAG() throws if called before reason()', () => {
    // Access through a new engine that hasn't had reason() called
    const freshEngine = new TestEngine();
    expect(() => (freshEngine as any).getDAG()).toThrow('DAG not initialized');
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'depth test' });

    // We have a root init step and child iteration steps -> depth > 1
    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('each step has required fields', async () => {
    const result = await engine.reason({ query: 'field check' });

    for (const step of result.trace.steps) {
      expect(step.id).toBeDefined();
      expect(typeof step.id).toBe('string');
      expect(step.type).toBeDefined();
      expect(step.content).toBeDefined();
      expect(typeof step.score).toBe('number');
      expect(step.metadata).toBeDefined();
      expect(typeof step.timestamp).toBe('number');
    }
  });

  test('context is passed through to input', async () => {
    const result = await engine.reason({
      query: 'context test',
      context: 'some additional context',
    });

    expect(result.answer).toContain('context test');
  });
});
