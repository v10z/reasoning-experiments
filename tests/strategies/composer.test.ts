import { StrategyComposer, PresetName } from '../../src/strategies/composer';
import { ReasoningEngine, ReasoningInput, ReasoningOutput } from '../../src/strategies/base';
import { ReasoningDAG } from '../../src/trace/dag';
import { ReasoningTrace } from '../../src/trace/types';

// Helper to create a mock strategy with predictable behavior
function createMockStrategy(
  name: string,
  convergence: number,
  answerText?: string
): ReasoningEngine {
  const strategy = {
    name,
    description: `Mock ${name} strategy`,
    reason: jest.fn(async (input: ReasoningInput): Promise<ReasoningOutput> => {
      const dag = new ReasoningDAG(name);
      dag.addStep('root', `${name} root: ${input.query}`, null, convergence, {});
      dag.addStep(
        'analysis',
        `${name} analysis${input.priorAnswer ? ` (prior: ${input.priorAnswer.substring(0, 50)})` : ''}`,
        null,
        convergence,
        {}
      );
      dag.setConvergenceScore(convergence);
      const answer = answerText || `${name} answer for: ${input.query}`;
      dag.setFinalOutput(answer);
      return { trace: dag.getTrace(), answer };
    }),
  } as unknown as ReasoningEngine;
  return strategy;
}

function createStrategyMap(...strategies: ReasoningEngine[]): Map<string, ReasoningEngine> {
  return new Map(strategies.map(s => [s.name, s]));
}

describe('StrategyComposer', () => {
  describe('sequential', () => {
    test('chains two strategies, answer from last', async () => {
      const s1 = createMockStrategy('Strategy1', 0.6, 'answer-1');
      const s2 = createMockStrategy('Strategy2', 0.9, 'answer-2');
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      const result = await composer.sequential(
        { query: 'test problem' },
        [s1, s2]
      );

      expect(result.answer).toBe('answer-2');
      expect(result.strategiesUsed).toEqual(['Strategy1', 'Strategy2']);
      expect(result.totalSteps).toBeGreaterThan(0);
    });

    test('passes priorAnswer and priorTraces to subsequent strategies', async () => {
      const s1 = createMockStrategy('First', 0.5, 'first-answer');
      const s2 = createMockStrategy('Second', 0.8, 'second-answer');
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      await composer.sequential({ query: 'test' }, [s1, s2]);

      // First strategy should NOT receive priorAnswer
      const firstCall = (s1.reason as jest.Mock).mock.calls[0][0];
      expect(firstCall.priorAnswer).toBeUndefined();
      expect(firstCall.priorTraces).toBeUndefined();

      // Second strategy should receive priorAnswer from first
      const secondCall = (s2.reason as jest.Mock).mock.calls[0][0];
      expect(secondCall.priorAnswer).toBe('first-answer');
      expect(secondCall.priorTraces).toHaveLength(1);
    });

    test('chains three strategies', async () => {
      const s1 = createMockStrategy('A', 0.4);
      const s2 = createMockStrategy('B', 0.6);
      const s3 = createMockStrategy('C', 0.9);
      const composer = new StrategyComposer(createStrategyMap(s1, s2, s3));

      const result = await composer.sequential({ query: 'test' }, [s1, s2, s3]);

      expect(result.strategiesUsed).toEqual(['A', 'B', 'C']);
      expect(result.answer).toContain('C answer');
    });

    test('traces merge correctly with sourceStrategy metadata', async () => {
      const s1 = createMockStrategy('First', 0.5);
      const s2 = createMockStrategy('Second', 0.8);
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      const result = await composer.sequential({ query: 'test' }, [s1, s2]);

      const firstSteps = result.trace.steps.filter(
        s => s.metadata.sourceStrategy === 'First'
      );
      const secondSteps = result.trace.steps.filter(
        s => s.metadata.sourceStrategy === 'Second'
      );

      expect(firstSteps.length).toBeGreaterThan(0);
      expect(secondSteps.length).toBeGreaterThan(0);
    });

    test('weighted convergence favors later strategies', async () => {
      const s1 = createMockStrategy('First', 0.3);
      const s2 = createMockStrategy('Second', 0.9);
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      const result = await composer.sequential({ query: 'test' }, [s1, s2]);

      // Weighted average: (0.3*1 + 0.9*2) / (1+2) = 2.1/3 = 0.7
      expect(result.trace.convergenceScore).toBeCloseTo(0.7, 1);
    });

    test('throws for empty strategy list', async () => {
      const composer = new StrategyComposer(new Map());

      await expect(
        composer.sequential({ query: 'test' }, [])
      ).rejects.toThrow('At least one strategy');
    });
  });

  describe('ensemble', () => {
    test('runs strategies in parallel and selects by convergence', async () => {
      const s1 = createMockStrategy('Low', 0.3, 'low-answer');
      const s2 = createMockStrategy('High', 0.9, 'high-answer');
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      const result = await composer.ensemble({ query: 'test' }, [s1, s2]);

      expect(result.answer).toBe('high-answer');
      expect(result.strategiesUsed).toEqual(['Low', 'High']);
    });

    test('majority vote wins over convergence', async () => {
      const s1 = createMockStrategy('A', 0.5, 'common-answer');
      const s2 = createMockStrategy('B', 0.6, 'common-answer');
      const s3 = createMockStrategy('C', 0.9, 'unique-answer');
      const composer = new StrategyComposer(createStrategyMap(s1, s2, s3));

      const result = await composer.ensemble({ query: 'test' }, [s1, s2, s3]);

      expect(result.answer).toBe('common-answer');
    });

    test('all traces merged under ensemble', async () => {
      const s1 = createMockStrategy('A', 0.5);
      const s2 = createMockStrategy('B', 0.7);
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      const result = await composer.ensemble({ query: 'test' }, [s1, s2]);

      const ensembleRoot = result.trace.steps.find(s => s.type === 'ensemble-root');
      const votingStep = result.trace.steps.find(s => s.type === 'voting');
      expect(ensembleRoot).toBeDefined();
      expect(votingStep).toBeDefined();
    });

    test('throws for empty strategy list', async () => {
      const composer = new StrategyComposer(new Map());

      await expect(
        composer.ensemble({ query: 'test' }, [])
      ).rejects.toThrow('At least one strategy');
    });
  });

  describe('feedback', () => {
    test('stops when convergence threshold met', async () => {
      const s1 = createMockStrategy('FractalRecursion', 0.9);
      const map = createStrategyMap(s1);
      const composer = new StrategyComposer(map);

      const result = await composer.feedback({ query: 'test' }, 3);

      expect(result.strategiesUsed).toHaveLength(1);
      expect(result.trace.convergenceScore).toBeGreaterThanOrEqual(0.7);
    });

    test('adapts strategy when convergence is low', async () => {
      const fractal = createMockStrategy('FractalRecursion', 0.2);
      const meta = createMockStrategy('MetaCognitiveLoop', 0.8);
      const dialectical = createMockStrategy('DialecticalSpiral', 0.6);
      const adversarial = createMockStrategy('AdversarialSelfPlay', 0.7);
      const map = createStrategyMap(fractal, meta, dialectical, adversarial);
      const composer = new StrategyComposer(map);

      const result = await composer.feedback({ query: 'test' }, 5);

      expect(result.strategiesUsed.length).toBeGreaterThan(1);
      expect(result.strategiesUsed[0]).toBe('FractalRecursion');
    });

    test('respects maxRounds limit', async () => {
      const fractal = createMockStrategy('FractalRecursion', 0.1);
      const meta = createMockStrategy('MetaCognitiveLoop', 0.2);
      const dialectical = createMockStrategy('DialecticalSpiral', 0.15);
      const map = createStrategyMap(fractal, meta, dialectical);
      const composer = new StrategyComposer(map);

      const result = await composer.feedback({ query: 'test' }, 2);

      expect(result.strategiesUsed.length).toBeLessThanOrEqual(2);
    });
  });

  describe('presets', () => {
    test('deep-analysis uses correct strategies', () => {
      const composer = new StrategyComposer(new Map());
      const strategies = composer.getPresetStrategies('deep-analysis');
      expect(strategies).toEqual(['FractalRecursion', 'DialecticalSpiral', 'MetaCognitiveLoop']);
    });

    test('debug-verify uses correct strategies', () => {
      const composer = new StrategyComposer(new Map());
      const strategies = composer.getPresetStrategies('debug-verify');
      expect(strategies).toEqual(['SimulatedAnnealing', 'AdversarialSelfPlay']);
    });

    test('full-review uses correct strategies', () => {
      const composer = new StrategyComposer(new Map());
      const strategies = composer.getPresetStrategies('full-review');
      expect(strategies).toEqual(['FractalRecursion', 'AdversarialSelfPlay', 'HippocampalReplay']);
    });

    test('throws for unknown preset with helpful message listing available presets', () => {
      const composer = new StrategyComposer(new Map());
      expect(() => composer.getPresetStrategies('unknown' as PresetName)).toThrow('Available presets');
    });

    test('compose with preset runs sequential pipeline', async () => {
      const s1 = createMockStrategy('SimulatedAnnealing', 0.6);
      const s2 = createMockStrategy('AdversarialSelfPlay', 0.8);
      const map = createStrategyMap(s1, s2);
      const composer = new StrategyComposer(map);

      const result = await composer.compose(
        { query: 'debug this' },
        'sequential',
        undefined,
        'debug-verify'
      );

      expect(result.strategiesUsed).toEqual(['SimulatedAnnealing', 'AdversarialSelfPlay']);
      expect(result.answer).toBeTruthy();
    });
  });

  describe('compose dispatcher', () => {
    test('defaults to sequential mode when mode is omitted', async () => {
      const s1 = createMockStrategy('SimulatedAnnealing', 0.6, 'sa-answer');
      const s2 = createMockStrategy('AdversarialSelfPlay', 0.8, 'asp-answer');
      const composer = new StrategyComposer(createStrategyMap(s1, s2));

      // No mode — should default to sequential
      const result = await composer.compose(
        { query: 'test' },
        undefined,
        undefined,
        'debug-verify'
      );

      expect(result.strategiesUsed).toEqual(['SimulatedAnnealing', 'AdversarialSelfPlay']);
      expect(result.answer).toBe('asp-answer'); // Last strategy's answer (sequential)
    });

    test('feedback mode works without strategies or preset', async () => {
      const fractal = createMockStrategy('FractalRecursion', 0.9);
      const composer = new StrategyComposer(createStrategyMap(fractal));

      // feedback mode — no strategies or preset needed
      const result = await composer.compose(
        { query: 'test' },
        'feedback'
      );

      expect(result.strategiesUsed.length).toBeGreaterThan(0);
      expect(result.answer).toBeTruthy();
    });

    test('feedback mode accepts maxRounds', async () => {
      const fractal = createMockStrategy('FractalRecursion', 0.1);
      const meta = createMockStrategy('MetaCognitiveLoop', 0.2);
      const composer = new StrategyComposer(createStrategyMap(fractal, meta));

      const result = await composer.compose(
        { query: 'test' },
        'feedback',
        undefined,
        undefined,
        1 // maxRounds = 1
      );

      expect(result.strategiesUsed).toHaveLength(1);
    });

    test('throws helpful error when no strategies and no preset given for sequential', async () => {
      const s1 = createMockStrategy('FractalRecursion', 0.5);
      const composer = new StrategyComposer(createStrategyMap(s1));

      await expect(
        composer.compose({ query: 'test' }, 'sequential')
      ).rejects.toThrow('Presets');
    });

    test('throws for unknown strategy name', async () => {
      const composer = new StrategyComposer(new Map());

      await expect(
        composer.compose({ query: 'test' }, 'sequential', ['NonExistent'])
      ).rejects.toThrow('Unknown strategy: "NonExistent"');
    });

    test('getPresetDescriptions returns all presets', () => {
      const descriptions = StrategyComposer.getPresetDescriptions();
      expect(Object.keys(descriptions)).toEqual(['deep-analysis', 'debug-verify', 'full-review']);
      expect(descriptions['deep-analysis']).toContain('design');
      expect(descriptions['debug-verify']).toContain('bug');
      expect(descriptions['full-review']).toContain('review');
    });
  });
});
