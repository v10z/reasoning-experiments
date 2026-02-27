import { ShortTermMemory } from '../../src/memory/short-term';

describe('ShortTermMemory', () => {
  let memory: ShortTermMemory;

  beforeEach(() => {
    memory = new ShortTermMemory({ maxSize: 5, compressionThreshold: 0.8 });
  });

  test('add creates an entry', () => {
    const entry = memory.add('test content');
    expect(entry.content).toBe('test content');
    expect(entry.source).toBe('short_term');
    expect(memory.size()).toBe(1);
  });

  test('evicts lowest relevance when exceeding maxSize', () => {
    for (let i = 0; i < 7; i++) {
      memory.add(`entry ${i}`, i * 0.1);
    }
    expect(memory.size()).toBe(5);
  });

  test('get retrieves and increments access count', () => {
    const entry = memory.add('test');
    const retrieved = memory.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.accessCount).toBe(1);
  });

  test('get returns undefined for unknown id', () => {
    expect(memory.get('nonexistent')).toBeUndefined();
  });

  test('search finds relevant entries', () => {
    memory.add('implementing a cache system');
    memory.add('debugging the API error');
    memory.add('reviewing pull request');

    const results = memory.search('cache system implementation');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('cache');
  });

  test('search returns empty for no matches', () => {
    memory.add('hello world');
    const results = memory.search('zzzzz');
    expect(results).toHaveLength(0);
  });

  test('compress promotes frequently accessed entries', () => {
    // Fill to compression threshold
    for (let i = 0; i < 5; i++) {
      const entry = memory.add(`entry ${i}`, 0.5);
      // Access entry 0 multiple times to make it promotable
      if (i === 0) {
        memory.get(entry.id);
        memory.get(entry.id);
        memory.get(entry.id);
      }
    }

    const promoted = memory.compress();
    expect(promoted.length).toBeGreaterThan(0);
    expect(memory.size()).toBeLessThan(5);
  });

  test('compress promotes high importance entries', () => {
    for (let i = 0; i < 5; i++) {
      memory.add(`entry ${i}`, i === 0 ? 0.9 : 0.3);
    }

    const promoted = memory.compress();
    expect(promoted.some(e => e.importance >= 0.7)).toBe(true);
  });

  test('compress returns empty if below threshold', () => {
    memory.add('single entry');
    const promoted = memory.compress();
    expect(promoted).toHaveLength(0);
  });

  test('remove deletes an entry', () => {
    const entry = memory.add('test');
    expect(memory.remove(entry.id)).toBe(true);
    expect(memory.size()).toBe(0);
  });

  test('clear removes all entries', () => {
    memory.add('a');
    memory.add('b');
    memory.clear();
    expect(memory.size()).toBe(0);
  });
});
