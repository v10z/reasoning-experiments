import { MetaCognitiveLoop } from '../../src/strategies/metacognitive-loop';

describe('MetaCognitiveLoop', () => {
  let engine: MetaCognitiveLoop;

  beforeEach(() => {
    engine = new MetaCognitiveLoop();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('MetaCognitiveLoop');
    expect(engine.description).toContain('Self-reflective');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'I am stuck on this problem and need help' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'I am stuck on this problem' });
    expect(result.trace.strategyName).toBe('MetaCognitiveLoop');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'I am stuck on this problem' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'I am stuck on this problem' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'I am stuck on this problem' });

    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({
      query: 'I am stuck on this problem',
      maxIterations: 1,
    });
    const resultLarge = await engine.reason({
      query: 'I am stuck on this problem',
      maxIterations: 5,
    });

    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('produces execution, monitoring, and reflection steps', async () => {
    const result = await engine.reason({
      query: 'How do I solve this complex problem?',
      maxIterations: 3,
    });

    const stepTypes = result.trace.steps.map(s => s.type);
    expect(stepTypes).toContain('execution');
    expect(stepTypes).toContain('monitoring');
    expect(stepTypes).toContain('reflection');
  });

  test('starts with an approach step', async () => {
    const result = await engine.reason({ query: 'Solve this problem' });

    const approachSteps = result.trace.steps.filter(s => s.type === 'approach');
    expect(approachSteps.length).toBe(1);
    expect(approachSteps[0].parentId).toBeNull();
    expect(approachSteps[0].content).toContain('Initial approach');
  });

  test('reflection steps have confidence metadata', async () => {
    const result = await engine.reason({
      query: 'How to solve this?',
      maxIterations: 3,
    });

    const reflections = result.trace.steps.filter(s => s.type === 'reflection');
    expect(reflections.length).toBeGreaterThan(0);
    for (const r of reflections) {
      expect(r.metadata.confidence).toBeDefined();
      expect(typeof r.metadata.confidence).toBe('number');
    }
  });

  test('may produce pivot steps when confidence is low', async () => {
    // With maxIterations=1, the first iteration has low confidence (0.3 + 0*0.15 = 0.3)
    // which should trigger a pivot
    const result = await engine.reason({
      query: 'I am totally lost',
      maxIterations: 2,
    });

    const stepTypes = result.trace.steps.map(s => s.type);
    // First iteration at i=0: confidence = 0.3 < 0.4, should pivot
    expect(stepTypes).toContain('pivot');
  });

  test('produces either refinement or pivot steps based on confidence', async () => {
    const result = await engine.reason({
      query: 'How to solve this?',
      maxIterations: 5,
    });

    const stepTypes = result.trace.steps.map(s => s.type);
    // The engine adapts by either refining (high confidence) or pivoting (low confidence)
    const hasRefinement = stepTypes.includes('refinement');
    const hasPivot = stepTypes.includes('pivot');
    expect(hasRefinement || hasPivot).toBe(true);
  });

  test('produces a conclusion step', async () => {
    const result = await engine.reason({ query: 'Solve this problem' });

    const conclusions = result.trace.steps.filter(s => s.type === 'conclusion');
    expect(conclusions.length).toBe(1);
  });

  test('answer includes reflection count and pivot info', async () => {
    const result = await engine.reason({ query: 'Solve this complex problem' });

    expect(result.answer).toContain('Meta-cognitive analysis');
    expect(result.answer).toContain('reflection cycles');
    expect(result.answer).toContain('strategy pivots');
    expect(result.answer).toContain('Final confidence');
  });

  test('steps have phase metadata', async () => {
    const result = await engine.reason({
      query: 'Solve this',
      maxIterations: 2,
    });

    const stepsWithPhase = result.trace.steps.filter(s => s.metadata.phase !== undefined);
    expect(stepsWithPhase.length).toBeGreaterThan(0);

    const phases = stepsWithPhase.map(s => s.metadata.phase);
    expect(phases).toContain('initial');
    expect(phases).toContain('execution');
    expect(phases).toContain('monitoring');
    expect(phases).toContain('reflection');
  });
});
