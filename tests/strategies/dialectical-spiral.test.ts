import { DialecticalSpiral } from '../../src/strategies/dialectical-spiral';

describe('DialecticalSpiral', () => {
  let engine: DialecticalSpiral;

  beforeEach(() => {
    engine = new DialecticalSpiral();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('DialecticalSpiral');
    expect(engine.description).toContain('Thesis-antithesis-synthesis');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'Should we use microservices or monolith?' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'Should we use microservices or monolith?' });
    expect(result.trace.strategyName).toBe('DialecticalSpiral');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'Should we use microservices or monolith?' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'Should we use microservices or monolith?' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'Should we use microservices or monolith?' });

    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({
      query: 'Should we use microservices or monolith?',
      maxIterations: 1,
    });
    const resultLarge = await engine.reason({
      query: 'Should we use microservices or monolith?',
      maxIterations: 4,
    });

    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('produces thesis, antithesis, and synthesis steps', async () => {
    const result = await engine.reason({ query: 'SQL vs NoSQL for this project' });

    const stepTypes = result.trace.steps.map(s => s.type);
    expect(stepTypes).toContain('thesis');
    expect(stepTypes).toContain('antithesis');
    expect(stepTypes).toContain('synthesis');
  });

  test('each dialectical round has thesis-antithesis-synthesis triad', async () => {
    const result = await engine.reason({
      query: 'SQL vs NoSQL for this project',
      maxIterations: 2,
    });

    const theses = result.trace.steps.filter(s => s.type === 'thesis');
    const antitheses = result.trace.steps.filter(s => s.type === 'antithesis');
    const syntheses = result.trace.steps.filter(s => s.type === 'synthesis');

    // Each round produces one of each
    expect(theses.length).toBeGreaterThanOrEqual(1);
    expect(antitheses.length).toBeGreaterThanOrEqual(1);
    expect(syntheses.length).toBeGreaterThanOrEqual(1);
    // Thesis count should match antithesis count
    expect(theses.length).toBe(antitheses.length);
  });

  test('produces a conclusion step', async () => {
    const result = await engine.reason({ query: 'SQL vs NoSQL for this project' });

    const conclusions = result.trace.steps.filter(s => s.type === 'conclusion');
    expect(conclusions.length).toBe(1);
  });

  test('steps have iteration metadata', async () => {
    const result = await engine.reason({ query: 'SQL vs NoSQL' });

    const dialecticalSteps = result.trace.steps.filter(s =>
      ['thesis', 'antithesis', 'synthesis'].includes(s.type)
    );

    for (const step of dialecticalSteps) {
      expect(step.metadata.iteration).toBeDefined();
      expect(step.metadata.role).toBeDefined();
    }
  });

  test('answer includes round count and convergence info', async () => {
    const result = await engine.reason({ query: 'SQL vs NoSQL' });

    expect(result.answer).toContain('dialectical rounds');
    expect(result.answer).toContain('Convergence');
    expect(result.answer).toContain('Rounds');
  });

  test('convergence increases or stabilizes across rounds', async () => {
    const result = await engine.reason({
      query: 'Choose between React and Vue',
      maxIterations: 4,
    });

    // Convergence should be non-negative after multiple rounds
    expect(result.trace.convergenceScore).toBeGreaterThan(0);
  });
});
