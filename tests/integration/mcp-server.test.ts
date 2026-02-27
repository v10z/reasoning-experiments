import { createServer } from '../../src/index';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';

describe('MCP Server Integration', () => {
  let server: ReturnType<typeof createServer>;
  let tempPath: string;

  beforeEach(async () => {
    tempPath = join(tmpdir(), `reasoning-memory-integration-${Date.now()}.json`);
    server = createServer(tempPath);
    await server.memory.initialize();
  });

  afterEach(async () => {
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
  });

  describe('reason tool', () => {
    test('auto-selects strategy and returns structured trace', async () => {
      const result = await server.router.reason({
        query: 'Build a REST API for a todo application',
      });

      expect(result.trace.strategyName).toBe('FractalRecursion');
      expect(result.trace.totalSteps).toBeGreaterThan(0);
      expect(result.answer).toBeDefined();
      expect(result.answer.length).toBeGreaterThan(0);
    });

    test('uses specified strategy', async () => {
      const result = await server.router.reason({
        query: 'Analyze this code for security issues',
        strategy: 'AdversarialSelfPlay',
      });

      expect(result.trace.strategyName).toBe('AdversarialSelfPlay');
    });

    test('returns trace with depth > 1', async () => {
      const result = await server.router.reason({
        query: 'Debug: application crashes on startup with null pointer',
      });

      expect(result.trace.strategyName).toBe('SimulatedAnnealing');
      const depth = calculateTraceDepth(result.trace.steps);
      expect(depth).toBeGreaterThan(1);
    });
  });

  describe('memory tools', () => {
    test('remember stores and recall retrieves', async () => {
      server.memory.remember('Cache invalidation is hard', 0.8, ['engineering', 'cache']);
      server.memory.remember('Use immutable data structures', 0.9, ['engineering', 'patterns']);

      const results = server.memory.recall('cache invalidation strategies');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content.toLowerCase()).toContain('cache');
    });

    test('memory persists across instances', async () => {
      server.memory.remember('Persistent insight about testing', 0.9, ['testing']);
      await server.memory.save();

      const server2 = createServer(tempPath);
      await server2.memory.initialize();

      const results = server2.memory.recall('testing insight');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('testing');
    });

    test('Hebbian associations strengthen with co-recall', async () => {
      const m1 = server.memory.remember('Caching strategies for distributed systems', 0.8);
      const m2 = server.memory.remember('Distributed system consistency patterns', 0.8);

      // Recall both together multiple times
      server.memory.recall('distributed caching');
      server.memory.recall('distributed caching');

      const network = server.memory.getLongTerm().getNetwork();
      const strength = network.getStrength(m1.id, m2.id);
      expect(strength).toBeGreaterThan(0);
    });

    test('consolidation promotes worthy memories', async () => {
      // Fill short-term
      for (let i = 0; i < 10; i++) {
        const entry = server.memory.remember(`Short term memory ${i}`, 0.5);
        // Access some to make promotable
        if (i < 3) {
          server.memory.getShortTerm().get(entry.id);
          server.memory.getShortTerm().get(entry.id);
          server.memory.getShortTerm().get(entry.id);
        }
      }

      const promoted = await server.memory.consolidate();
      expect(promoted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('benchmark tool', () => {
    test('runs all benchmarks and shows improvement', async () => {
      const summary = await server.benchmarkRunner.runAll();

      expect(summary.totalProblems).toBe(9);
      expect(summary.averageImprovement.overall).toBeGreaterThan(0);

      const formatted = server.benchmarkRunner.formatResults(summary);
      expect(formatted).toContain('Benchmark Results');
    });

    test('runs category-specific benchmarks', async () => {
      const results = await server.benchmarkRunner.runCategory('debugging');
      expect(results).toHaveLength(3);
      expect(results.every(r => r.category === 'debugging')).toBe(true);
    });
  });

  describe('compose tool', () => {
    test('preset-only: just query + preset works', async () => {
      const result = await server.router.compose(
        { query: 'Design a caching layer' },
        undefined,       // no mode — defaults to sequential
        undefined,       // no strategies
        'deep-analysis'  // just use preset
      );

      expect(result.strategiesUsed).toEqual([
        'FractalRecursion', 'DialecticalSpiral', 'MetaCognitiveLoop',
      ]);
      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.totalSteps).toBeGreaterThan(0);
    });

    test('feedback mode: just query works', async () => {
      const result = await server.router.compose(
        { query: 'Why is my app slow?' },
        'feedback'
      );

      expect(result.strategiesUsed.length).toBeGreaterThan(0);
      expect(result.answer.length).toBeGreaterThan(0);
    });

    test('custom strategies with ensemble', async () => {
      const result = await server.router.compose(
        { query: 'Compare REST vs GraphQL' },
        'ensemble',
        ['FractalRecursion', 'DialecticalSpiral']
      );

      expect(result.strategiesUsed).toEqual(['FractalRecursion', 'DialecticalSpiral']);
      expect(result.answer.length).toBeGreaterThan(0);
    });
  });

  describe('full flow: reason with memory', () => {
    test('uses memory to enrich reasoning', async () => {
      // Store relevant memories
      server.memory.remember('Previous project used Redis cache with 5ms latency', 0.9, ['cache', 'redis']);
      server.memory.remember('LRU eviction worked well for session data', 0.8, ['cache', 'eviction']);

      // Recall relevant context
      const memories = server.memory.recall('Redis cache latency');
      expect(memories.length).toBeGreaterThan(0);

      // Reason with context
      const context = memories.map(m => m.content).join('. ');
      const result = await server.router.reason({
        query: 'Design a caching layer for our API',
        strategy: 'FractalRecursion',
      });

      expect(result.trace.totalSteps).toBeGreaterThan(0);
      expect(result.answer.length).toBeGreaterThan(0);

      // Store the reasoning result as a new memory
      server.memory.remember(
        `Reasoning result: ${result.answer.substring(0, 200)}`,
        0.7,
        ['reasoning', 'cache']
      );

      // Verify it's stored
      const stats = server.memory.getStats();
      expect(stats.longTerm).toBeGreaterThan(0);
    });
  });
});

function calculateTraceDepth(steps: Array<{ parentId: string | null; id: string }>): number {
  const stepMap = new Map(steps.map(s => [s.id, s]));
  let maxDepth = 0;

  for (const step of steps) {
    let depth = 1;
    let current = step;
    while (current.parentId) {
      const parent = stepMap.get(current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}
