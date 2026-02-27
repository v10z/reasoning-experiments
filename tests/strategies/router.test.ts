import { StrategyRouter } from '../../src/strategies/router';

describe('StrategyRouter', () => {
  let router: StrategyRouter;

  beforeEach(() => {
    router = new StrategyRouter();
  });

  describe('listStrategies', () => {
    test('returns all 6 strategies', () => {
      const strategies = router.listStrategies();
      expect(strategies.length).toBe(6);
    });

    test('each strategy has name and description', () => {
      const strategies = router.listStrategies();
      for (const s of strategies) {
        expect(s.name).toBeDefined();
        expect(typeof s.name).toBe('string');
        expect(s.name.length).toBeGreaterThan(0);
        expect(s.description).toBeDefined();
        expect(typeof s.description).toBe('string');
        expect(s.description.length).toBeGreaterThan(0);
      }
    });

    test('includes all expected strategy names', () => {
      const strategies = router.listStrategies();
      const names = strategies.map(s => s.name);

      expect(names).toContain('FractalRecursion');
      expect(names).toContain('DialecticalSpiral');
      expect(names).toContain('SimulatedAnnealing');
      expect(names).toContain('MetaCognitiveLoop');
      expect(names).toContain('AdversarialSelfPlay');
      expect(names).toContain('HippocampalReplay');
    });
  });

  describe('getStrategy', () => {
    test('returns engine by name', () => {
      const engine = router.getStrategy('FractalRecursion');
      expect(engine).toBeDefined();
      expect(engine!.name).toBe('FractalRecursion');
    });

    test('returns undefined for unknown name', () => {
      const engine = router.getStrategy('NonExistentStrategy');
      expect(engine).toBeUndefined();
    });

    test('returns correct engine for each strategy name', () => {
      const names = [
        'FractalRecursion',
        'DialecticalSpiral',
        'SimulatedAnnealing',
        'MetaCognitiveLoop',
        'AdversarialSelfPlay',
        'HippocampalReplay',
      ];

      for (const name of names) {
        const engine = router.getStrategy(name);
        expect(engine).toBeDefined();
        expect(engine!.name).toBe(name);
      }
    });
  });

  describe('selectStrategy', () => {
    test('selects FractalRecursion for build/implement keywords', () => {
      const engine = router.selectStrategy('Build a REST API with authentication');
      expect(engine.name).toBe('FractalRecursion');
    });

    test('selects FractalRecursion for design keywords', () => {
      const engine = router.selectStrategy('Design a new feature for the app');
      expect(engine.name).toBe('FractalRecursion');
    });

    test('selects DialecticalSpiral for comparison keywords', () => {
      const engine = router.selectStrategy('Compare React vs Vue for this project');
      expect(engine.name).toBe('DialecticalSpiral');
    });

    test('selects DialecticalSpiral for tradeoff keywords', () => {
      const engine = router.selectStrategy('What are the tradeoff between SQL and NoSQL?');
      expect(engine.name).toBe('DialecticalSpiral');
    });

    test('selects SimulatedAnnealing for bug/debug keywords', () => {
      const engine = router.selectStrategy('Debug this failing test in the auth module');
      expect(engine.name).toBe('SimulatedAnnealing');
    });

    test('selects SimulatedAnnealing for error keywords', () => {
      const engine = router.selectStrategy('Fix the error in the payment processing');
      expect(engine.name).toBe('SimulatedAnnealing');
    });

    test('selects MetaCognitiveLoop for stuck/confused keywords', () => {
      const engine = router.selectStrategy('I am stuck and confused about this approach');
      expect(engine.name).toBe('MetaCognitiveLoop');
    });

    test('selects MetaCognitiveLoop for help keywords', () => {
      const engine = router.selectStrategy('I need help understanding this code');
      expect(engine.name).toBe('MetaCognitiveLoop');
    });

    test('selects AdversarialSelfPlay for security/review keywords', () => {
      const engine = router.selectStrategy('Review this code for security vulnerabilities');
      expect(engine.name).toBe('AdversarialSelfPlay');
    });

    test('selects AdversarialSelfPlay for audit keywords', () => {
      const engine = router.selectStrategy('Audit this system for attack vectors and risk');
      expect(engine.name).toBe('AdversarialSelfPlay');
    });

    test('selects HippocampalReplay for history/replay keywords', () => {
      const engine = router.selectStrategy('Why did the deploy fail last time?');
      expect(engine.name).toBe('HippocampalReplay');
    });

    test('selects HippocampalReplay for what-if keywords', () => {
      const engine = router.selectStrategy('What if we had used a different approach previously?');
      expect(engine.name).toBe('HippocampalReplay');
    });

    test('defaults to FractalRecursion for unrecognized queries', () => {
      const engine = router.selectStrategy('random unrelated query with no keywords');
      expect(engine.name).toBe('FractalRecursion');
    });

    test('multi-word keywords score higher', () => {
      // "not working" is a multi-word keyword for MetaCognitiveLoop
      const engine = router.selectStrategy('This is not working at all');
      expect(engine.name).toBe('MetaCognitiveLoop');
    });
  });

  describe('reason', () => {
    test('works with auto-selection', async () => {
      const result = await router.reason({
        query: 'Build a new authentication system',
      });

      expect(result).toBeDefined();
      expect(result.trace).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.trace.totalSteps).toBeGreaterThan(0);
      // Auto-selected FractalRecursion
      expect(result.trace.strategyName).toBe('FractalRecursion');
    });

    test('works with explicit strategy name', async () => {
      const result = await router.reason({
        query: 'Some generic query',
        strategy: 'DialecticalSpiral',
      });

      expect(result).toBeDefined();
      expect(result.trace).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.trace.strategyName).toBe('DialecticalSpiral');
    });

    test('explicit strategy overrides auto-selection', async () => {
      // "Build" would normally select FractalRecursion, but we force DialecticalSpiral
      const result = await router.reason({
        query: 'Build a new system',
        strategy: 'DialecticalSpiral',
      });

      expect(result.trace.strategyName).toBe('DialecticalSpiral');
    });

    test('throws for unknown strategy name', async () => {
      await expect(
        router.reason({
          query: 'Some query',
          strategy: 'NonExistentStrategy',
        })
      ).rejects.toThrow('Unknown strategy: NonExistentStrategy');
    });

    test('error message includes available strategies', async () => {
      await expect(
        router.reason({
          query: 'Some query',
          strategy: 'BadName',
        })
      ).rejects.toThrow('Available:');
    });

    test('passes maxIterations through to the strategy', async () => {
      const result = await router.reason({
        query: 'Build a feature',
        strategy: 'FractalRecursion',
        maxIterations: 1,
      });

      expect(result.trace.totalSteps).toBeGreaterThan(0);
      // With maxIterations=1, should produce fewer steps than default
    });

    test('reason output has valid convergence score', async () => {
      const result = await router.reason({
        query: 'Debug this error in the code',
      });

      expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0);
      expect(result.trace.convergenceScore).toBeLessThanOrEqual(1);
    });

    test('works with each strategy explicitly', async () => {
      const strategies = [
        'FractalRecursion',
        'DialecticalSpiral',
        'SimulatedAnnealing',
        'MetaCognitiveLoop',
        'AdversarialSelfPlay',
        'HippocampalReplay',
      ];

      for (const strategy of strategies) {
        const result = await router.reason({
          query: 'Test query for ' + strategy,
          strategy,
          maxIterations: 2,
        });

        expect(result.trace.strategyName).toBe(strategy);
        expect(result.trace.totalSteps).toBeGreaterThan(0);
        expect(result.answer.length).toBeGreaterThan(0);
      }
    });
  });
});
