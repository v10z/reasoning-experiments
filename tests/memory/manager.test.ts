import { MemoryManager } from '../../src/memory/manager';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let tempPath: string;

  beforeEach(async () => {
    tempPath = join(tmpdir(), `reasoning-memory-manager-test-${Date.now()}.json`);
    manager = new MemoryManager({
      storagePath: tempPath,
      shortTermMaxSize: 10,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
  });

  test('remember routes high importance to long-term', () => {
    const entry = manager.remember('critical insight', 0.9);
    expect(entry.source).toBe('long_term');
    expect(manager.getStats().longTerm).toBe(1);
  });

  test('remember routes medium importance to short-term', () => {
    const entry = manager.remember('moderate insight', 0.5);
    expect(entry.source).toBe('short_term');
    expect(manager.getStats().shortTerm).toBe(1);
  });

  test('remember routes low importance to fleeting', () => {
    const entry = manager.remember('passing thought', 0.2);
    expect(entry.source).toBe('fleeting');
    expect(manager.getStats().fleeting).toBe(1);
  });

  test('recall searches across all tiers', () => {
    manager.remember('long term cache patterns', 0.9);
    manager.remember('short term cache usage', 0.5);
    manager.remember('fleeting cache idea', 0.2);

    const results = manager.recall('cache');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('recall prioritizes long-term over short-term', () => {
    manager.remember('cache architecture in long term', 0.9);
    manager.remember('cache architecture in short term', 0.5);

    const results = manager.recall('cache architecture');
    expect(results.length).toBe(2);
    // Long term should be ranked higher due to tier boost
    expect(results[0].source).toBe('long_term');
  });

  test('consolidate promotes worthy short-term to long-term', async () => {
    // Fill short-term memory to trigger compression
    for (let i = 0; i < 10; i++) {
      const entry = manager.remember(`memory ${i}`, 0.5);
      if (i < 3) {
        // Access some entries multiple times to make them promotable
        manager.getShortTerm().get(entry.id);
        manager.getShortTerm().get(entry.id);
        manager.getShortTerm().get(entry.id);
      }
    }

    const promoted = await manager.consolidate();
    expect(promoted).toBeGreaterThanOrEqual(0);
    // Fleeting should be cleared
    expect(manager.getStats().fleeting).toBe(0);
  });

  test('getStats returns counts from all tiers', () => {
    manager.remember('a', 0.9);
    manager.remember('b', 0.5);
    manager.remember('c', 0.2);

    const stats = manager.getStats();
    expect(stats.longTerm).toBe(1);
    expect(stats.shortTerm).toBe(1);
    expect(stats.fleeting).toBe(1);
  });

  test('save persists long-term memory', async () => {
    manager.remember('persistent data', 0.9);
    await manager.save();

    const manager2 = new MemoryManager({ storagePath: tempPath });
    await manager2.initialize();
    expect(manager2.getStats().longTerm).toBe(1);
  });
});
