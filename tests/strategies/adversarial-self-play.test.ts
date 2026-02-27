import { AdversarialSelfPlay } from '../../src/strategies/adversarial-self-play';

describe('AdversarialSelfPlay', () => {
  let engine: AdversarialSelfPlay;

  beforeEach(() => {
    engine = new AdversarialSelfPlay();
  });

  test('has a name and description', () => {
    expect(engine.name).toBe('AdversarialSelfPlay');
    expect(engine.description).toContain('Red/Blue/Judge');
  });

  test('reason() returns a valid ReasoningOutput with non-empty trace and answer', async () => {
    const result = await engine.reason({ query: 'Review this API for security vulnerabilities' });

    expect(result).toBeDefined();
    expect(result.trace).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBeGreaterThan(0);
  });

  test('trace has the correct strategyName', async () => {
    const result = await engine.reason({ query: 'Review this API for security' });
    expect(result.trace.strategyName).toBe('AdversarialSelfPlay');
  });

  test('trace has steps (totalSteps > 0)', async () => {
    const result = await engine.reason({ query: 'Review this API for security' });
    expect(result.trace.totalSteps).toBeGreaterThan(0);
    expect(result.trace.steps.length).toBe(result.trace.totalSteps);
  });

  test('convergence score is between 0 and 1', async () => {
    const result = await engine.reason({ query: 'Review this API for security' });
    expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
    expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
  });

  test('trace depth is > 1 (multi-level reasoning)', async () => {
    const result = await engine.reason({ query: 'Review this API for security' });

    const roots = result.trace.steps.filter(s => s.parentId === null);
    const children = result.trace.steps.filter(s => s.parentId !== null);
    expect(roots.length).toBeGreaterThan(0);
    expect(children.length).toBeGreaterThan(0);
  });

  test('maxIterations parameter limits iterations', async () => {
    const resultSmall = await engine.reason({
      query: 'Review this API for security',
      maxIterations: 1,
    });
    const resultLarge = await engine.reason({
      query: 'Review this API for security',
      maxIterations: 4,
    });

    expect(resultSmall.trace.totalSteps).toBeLessThanOrEqual(resultLarge.trace.totalSteps);
  });

  test('starts with a setup step', async () => {
    const result = await engine.reason({ query: 'Audit this code for vulnerabilities' });

    const setupSteps = result.trace.steps.filter(s => s.type === 'setup');
    expect(setupSteps.length).toBe(1);
    expect(setupSteps[0].content).toContain('Adversarial analysis');
    expect(setupSteps[0].content).toContain('Red Team');
    expect(setupSteps[0].content).toContain('Blue Team');
    expect(setupSteps[0].content).toContain('Judge');
  });

  test('produces red_team, blue_team, and judge steps', async () => {
    const result = await engine.reason({
      query: 'Audit this code for vulnerabilities',
      maxIterations: 2,
    });

    const stepTypes = result.trace.steps.map(s => s.type);
    expect(stepTypes).toContain('red_team');
    expect(stepTypes).toContain('blue_team');
    expect(stepTypes).toContain('judge');
  });

  test('each round has a red-blue-judge triad', async () => {
    const result = await engine.reason({
      query: 'Audit this code',
      maxIterations: 2,
    });

    const reds = result.trace.steps.filter(s => s.type === 'red_team');
    const blues = result.trace.steps.filter(s => s.type === 'blue_team');
    const judges = result.trace.steps.filter(s => s.type === 'judge');

    expect(reds.length).toBeGreaterThanOrEqual(1);
    expect(blues.length).toBeGreaterThanOrEqual(1);
    expect(judges.length).toBeGreaterThanOrEqual(1);
    // Equal number of each per round
    expect(reds.length).toBe(blues.length);
    expect(blues.length).toBe(judges.length);
  });

  test('steps have role metadata', async () => {
    const result = await engine.reason({
      query: 'Audit this code',
      maxIterations: 2,
    });

    const redSteps = result.trace.steps.filter(s => s.type === 'red_team');
    const blueSteps = result.trace.steps.filter(s => s.type === 'blue_team');
    const judgeSteps = result.trace.steps.filter(s => s.type === 'judge');

    for (const step of redSteps) {
      expect(step.metadata.role).toBe('red');
    }
    for (const step of blueSteps) {
      expect(step.metadata.role).toBe('blue');
    }
    for (const step of judgeSteps) {
      expect(step.metadata.role).toBe('judge');
      expect(step.metadata.score).toBeDefined();
    }
  });

  test('judge score increases over rounds', async () => {
    const result = await engine.reason({
      query: 'Audit this code for security',
      maxIterations: 4,
    });

    const judgeSteps = result.trace.steps
      .filter(s => s.type === 'judge')
      .sort((a, b) => (a.metadata.iteration as number) - (b.metadata.iteration as number));

    if (judgeSteps.length >= 2) {
      const firstScore = judgeSteps[0].metadata.score as number;
      const lastScore = judgeSteps[judgeSteps.length - 1].metadata.score as number;
      expect(lastScore).toBeGreaterThanOrEqual(firstScore);
    }
  });

  test('produces a conclusion step', async () => {
    const result = await engine.reason({ query: 'Audit this code' });

    const conclusions = result.trace.steps.filter(s => s.type === 'conclusion');
    expect(conclusions.length).toBe(1);
  });

  test('answer includes red team findings and blue team defenses', async () => {
    const result = await engine.reason({ query: 'Audit this API endpoint' });

    expect(result.answer).toContain('Adversarial analysis');
    expect(result.answer).toContain('Red Team Findings');
    expect(result.answer).toContain('Blue Team Defenses');
    expect(result.answer).toContain('Verdict');
    expect(result.answer).toContain('Security posture score');
  });

  test('convergence matches final judge score', async () => {
    const result = await engine.reason({
      query: 'Audit this code',
      maxIterations: 3,
    });

    const judgeSteps = result.trace.steps.filter(s => s.type === 'judge');
    if (judgeSteps.length > 0) {
      const lastJudge = judgeSteps[judgeSteps.length - 1];
      expect(result.trace.convergenceScore).toBe(lastJudge.metadata.score);
    }
  });
});
