import { HippocampalReplay } from '../../src/strategies/hippocampal-replay';

describe('HippocampalReplay', () => {
  let engine: HippocampalReplay;

  beforeEach(() => {
    engine = new HippocampalReplay();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('HippocampalReplay');
    expect(engine.description).toContain('Forward/backward replay');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail last time?' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail?' });
    expect(result.trace.strategyName).toBe('HippocampalReplay');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail?' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail?' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail?' });

    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 3,
    });
    const resultLarge = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 7,
    });

    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('builds an event timeline during initialization', async () => {
    const result = await engine.reason({ query: 'What happened in the last release?' });

    const eventSteps = result.trace.steps.filter(s => s.type === 'event');
    // Should have a timeline of at least 5 events
    expect(eventSteps.length).toBe(5);
  });

  test('timeline events are chained (each references the previous)', async () => {
    const result = await engine.reason({ query: 'What happened in the last release?' });

    const eventSteps = result.trace.steps.filter(s => s.type === 'event');

    // First event has no parent
    expect(eventSteps[0].parentId).toBeNull();

    // Subsequent events reference the previous event
    for (let i = 1; i < eventSteps.length; i++) {
      expect(eventSteps[i].parentId).toBe(eventSteps[i - 1].id);
    }
  });

  test('performs forward replay', async () => {
    const result = await engine.reason({
      query: 'What happened?',
      maxIterations: 3,
    });

    const forwardReplaySteps = result.trace.steps.filter(s => s.type === 'forward_replay');
    expect(forwardReplaySteps.length).toBe(1);
    expect(forwardReplaySteps[0].content).toContain('Forward replay');
    expect(forwardReplaySteps[0].metadata.phase).toBe('forward_replay');
  });

  test('performs backward replay', async () => {
    const result = await engine.reason({
      query: 'What happened?',
      maxIterations: 3,
    });

    const backwardReplaySteps = result.trace.steps.filter(s => s.type === 'backward_replay');
    expect(backwardReplaySteps.length).toBe(1);
    expect(backwardReplaySteps[0].content).toContain('Backward replay');
    expect(backwardReplaySteps[0].metadata.phase).toBe('backward_replay');
  });

  test('generates counterfactual analysis steps', async () => {
    const result = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 7,
    });

    const counterfactuals = result.trace.steps.filter(s => s.type === 'counterfactual');
    expect(counterfactuals.length).toBeGreaterThan(0);

    for (const cf of counterfactuals) {
      expect(cf.content).toContain('What if');
      expect(cf.metadata.phase).toBe('counterfactual');
      expect(cf.metadata.eventIndex).toBeDefined();
    }
  });

  test('counterfactuals reference timeline events as parents', async () => {
    const result = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 7,
    });

    const events = result.trace.steps.filter(s => s.type === 'event');
    const counterfactuals = result.trace.steps.filter(s => s.type === 'counterfactual');

    const eventIds = new Set(events.map(e => e.id));
    for (const cf of counterfactuals) {
      expect(eventIds.has(cf.parentId!)).toBe(true);
    }
  });

  test('produces a conclusion step', async () => {
    const result = await engine.reason({ query: 'Why did the deploy fail?' });

    const conclusions = result.trace.steps.filter(s => s.type === 'conclusion');
    expect(conclusions.length).toBe(1);
  });

  test('answer includes timeline and counterfactual analysis', async () => {
    const result = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 7,
    });

    expect(result.answer).toContain('Hippocampal replay');
    expect(result.answer).toContain('Timeline');
    expect(result.answer).toContain('Counterfactual Analysis');
    expect(result.answer).toContain('Key Lessons');
  });

  test('convergence score increases with counterfactual analysis', async () => {
    const resultFew = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 2,
    });
    const resultMany = await engine.reason({
      query: 'Why did the deploy fail?',
      maxIterations: 7,
    });

    // More iterations allows counterfactual analysis, which increases convergence
    expect(resultMany.trace.convergenceScore).toBeGreaterThanOrEqual(resultFew.trace.convergenceScore);
  });

  test('event steps have timeline phase metadata', async () => {
    const result = await engine.reason({ query: 'What happened?' });

    const eventSteps = result.trace.steps.filter(s => s.type === 'event');
    for (const event of eventSteps) {
      expect(event.metadata.phase).toBe('timeline');
    }
  });
});
