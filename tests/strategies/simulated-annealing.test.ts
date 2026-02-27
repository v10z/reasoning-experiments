import { SimulatedAnnealing } from '../../src/strategies/simulated-annealing';

describe('SimulatedAnnealing', () => {
  let engine: SimulatedAnnealing;

  beforeEach(() => {
    engine = new SimulatedAnnealing();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('SimulatedAnnealing');
    expect(engine.description).toContain('Temperature-based');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error in login flow' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error' });
    expect(result.trace.strategyName).toBe('SimulatedAnnealing');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error' });

    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({
      query: 'Debug the authentication error',
      maxIterations: 2,
    });
    const resultLarge = await engine.reason({
      query: 'Debug the authentication error',
      maxIterations: 8,
    });

    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('generates initial hypotheses during initialization', async () => {
    const result = await engine.reason({ query: 'Debug the authentication error' });

    const hypothesisSteps = result.trace.steps.filter(s => s.type === 'hypothesis');
    // Should have at least the initial hypotheses (4 base + possible keyword matches)
    expect(hypothesisSteps.length).toBeGreaterThanOrEqual(4);
  });

  test('generates extra hypotheses for error-related keywords', async () => {
    const resultWithError = await engine.reason({
      query: 'Fix the broken error in the system',
      maxIterations: 1,
    });
    const resultGeneric = await engine.reason({
      query: 'Analyze the system',
      maxIterations: 1,
    });

    const errorHypotheses = resultWithError.trace.steps.filter(s => s.type === 'hypothesis');
    const genericHypotheses = resultGeneric.trace.steps.filter(s => s.type === 'hypothesis');

    // Error query should generate more initial hypotheses
    expect(errorHypotheses.length).toBeGreaterThanOrEqual(genericHypotheses.length);
  });

  test('produces acceptance or rejection steps', async () => {
    const result = await engine.reason({
      query: 'Debug the authentication error',
      maxIterations: 4,
    });

    const stepTypes = result.trace.steps.map(s => s.type);
    const hasAcceptOrReject = stepTypes.includes('acceptance') || stepTypes.includes('rejection');
    expect(hasAcceptOrReject).toBe(true);
  });

  test('hypothesis steps have temperature metadata', async () => {
    const result = await engine.reason({ query: 'Debug the broken login' });

    const hypothesisSteps = result.trace.steps.filter(s => s.type === 'hypothesis');
    for (const step of hypothesisSteps) {
      expect(step.metadata.temperature).toBeDefined();
      expect(typeof step.metadata.temperature).toBe('number');
    }
  });

  test('temperature decreases over iterations', async () => {
    const result = await engine.reason({
      query: 'Debug the authentication error',
      maxIterations: 6,
    });

    const iteratedHypotheses = result.trace.steps
      .filter(s => s.type === 'hypothesis' && s.metadata.iteration !== undefined)
      .sort((a, b) => (a.metadata.iteration as number) - (b.metadata.iteration as number));

    if (iteratedHypotheses.length >= 2) {
      const firstTemp = iteratedHypotheses[0].metadata.temperature as number;
      const lastTemp = iteratedHypotheses[iteratedHypotheses.length - 1].metadata.temperature as number;
      expect(lastTemp).toBeLessThan(firstTemp);
    }
  });

  test('produces a conclusion step', async () => {
    const result = await engine.reason({ query: 'Debug the error' });

    const conclusions = result.trace.steps.filter(s => s.type === 'conclusion');
    expect(conclusions.length).toBe(1);
  });

  test('answer contains best hypothesis information', async () => {
    const result = await engine.reason({ query: 'Debug the error' });

    expect(result.answer).toContain('Simulated annealing');
    expect(result.answer).toContain('Best hypothesis');
  });

  test('convergence score correlates with final temperature', async () => {
    const result = await engine.reason({
      query: 'Debug the error',
      maxIterations: 8,
    });

    // Convergence = 1 - temperature; after many iterations, should be high
    expect(result.trace.convergenceScore).toBeGreaterThan(0.5);
  });
});
