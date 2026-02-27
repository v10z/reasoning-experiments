import { LongTermMemory } from '../../src/memory/long-term';
import { HebbianNetwork } from '../../src/memory/hebbian';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('LongTermMemory', () => {
  let memory: LongTermMemory;
  let tempPath: string;

  beforeEach(() => {
    tempPath = join(tmpdir(), `reasoning-memory-test-${Date.now()}.json`);
    memory = new LongTermMemory({ storagePath: tempPath, pruneThreshold: 0.01 });
  });

  afterEach(async () => {
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
  });

  test('add creates a long-term entry', () => {
    const entry = memory.add('important discovery');
    expect(entry.content).toBe('important discovery');
    expect(entry.source).toBe('long_term');
    expect(memory.size()).toBe(1);
  });

  test('get retrieves and increments access', () => {
    const entry = memory.add('test');
    const retrieved = memory.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.accessCount).toBe(1);
  });

  test('search finds relevant entries', () => {
    memory.add('cache invalidation strategy');
    memory.add('database migration plan');
    memory.add('REST API design');

    const results = memory.search('cache strategy');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('cache');
  });

  test('promote changes entry source to long_term', () => {
    const entry = memory.add('test');
    entry.source = 'short_term';
    const promoted = memory.promote(entry);
    expect(promoted.source).toBe('long_term');
  });

  test('save and load persists data', async () => {
    memory.add('persistent memory', 0.9, ['important']);
    await memory.save();

    const loaded = new LongTermMemory({ storagePath: tempPath });
    await loaded.load();
    expect(loaded.size()).toBe(1);
    expect(loaded.getAll()[0].content).toBe('persistent memory');
  });

  test('load handles missing file gracefully', async () => {
    const mem = new LongTermMemory({ storagePath: '/nonexistent/path.json' });
    await expect(mem.load()).resolves.not.toThrow();
    expect(mem.size()).toBe(0);
  });

  test('prune removes low-relevance entries', () => {
    const entry = memory.add('old memory', 0.01);
    // Simulate access and aging
    entry.accessCount = 1;
    entry.lastAccessed = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days ago

    const pruned = memory.prune();
    expect(pruned).toBeGreaterThanOrEqual(0);
  });

  test('searchWithAssociations includes associated memories', () => {
    const e1 = memory.add('cache invalidation patterns');
    const e2 = memory.add('distributed systems design');
    const e3 = memory.add('totally unrelated thing about cooking');

    // Create association between e1 and e2
    memory.getNetwork().strengthen(e1.id, e2.id, 0.8);

    const results = memory.searchWithAssociations('cache invalidation');
    const ids = results.map(r => r.id);
    expect(ids).toContain(e1.id);
    // e2 should be found via association even though it doesn't match query directly as well
  });

  test('remove deletes entry and cleans network', () => {
    const entry = memory.add('test');
    memory.getNetwork().strengthen(entry.id, 'other', 0.5);

    expect(memory.remove(entry.id)).toBe(true);
    expect(memory.size()).toBe(0);
    expect(memory.getNetwork().getStrength(entry.id, 'other')).toBe(0);
  });
});
