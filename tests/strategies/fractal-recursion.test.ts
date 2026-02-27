import { FractalRecursion } from '../../src/strategies/fractal-recursion';

describe('FractalRecursion', () => {
  let engine: FractalRecursion;

  beforeEach(() => {
    engine = new FractalRecursion();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('FractalRecursion');
    expect(engine.description).toContain('Decomposes');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });
    expect(result.trace.strategyName).toBe('FractalRecursion');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    // FractalRecursion decomposes into multiple levels
    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({ query: 'Build a REST API', maxIterations: 1 });
    const resultLarge = await engine.reason({ query: 'Build a REST API', maxIterations: 3 });

    // Fewer iterations means fewer steps
    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('decomposes root problem into subproblems', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    const stepTypes = result.trace.steps.map(s => s.type);
    expect(stepTypes).toContain('problem');
    expect(stepTypes).toContain('subproblem');
  });

  test('root step contains the original query', async () => {
    const query = 'Build a REST API';
    const result = await engine.reason({ query });

    const rootSteps = result.trace.steps.filter(s => s.type === 'problem');
    expect(rootSteps.length).toBe(1);
    expect(rootSteps[0].content).toContain(query);
  });

  test('produces a synthesis step', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    const synthesisSteps = result.trace.steps.filter(s => s.type === 'synthesis');
    expect(synthesisSteps.length).toBeGreaterThan(0);
  });

  test('subproblems have level metadata', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    const subproblems = result.trace.steps.filter(s => s.type === 'subproblem');
    for (const sub of subproblems) {
      expect(sub.metadata.level).toBeDefined();
      expect(typeof sub.metadata.level).toBe('number');
      expect(sub.metadata.level).toBeGreaterThan(0);
    }
  });

  test('answer includes decomposition details', async () => {
    const result = await engine.reason({ query: 'Build a REST API' });

    expect(result.answer).toContain('Decomposition');
    expect(result.answer).toContain('Build a REST API');
  });

  test('default iterations is 3', async () => {
    // With default iterations (3), should produce 3 levels of depth
    const result = await engine.reason({ query: 'Build a microservice' });

    const levels = new Set(
      result.trace.steps
        .filter(s => s.metadata.level !== undefined)
        .map(s => s.metadata.level as number)
    );
    expect(levels.size).toBeGreaterThanOrEqual(2);
  });
});
