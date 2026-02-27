import { FleetingMemory } from '../../src/memory/fleeting';

describe('FleetingMemory', () => {
  let memory: FleetingMemory;

  beforeEach(() => {
    memory = new FleetingMemory();
  });

  test('add creates an entry', () => {
    const entry = memory.add('test content');
    expect(entry.content).toBe('test content');
    expect(entry.source).toBe('fleeting');
    expect(entry.id).toBeDefined();
    expect(memory.size()).toBe(1);
  });

  test('add with importance and tags', () => {
    const entry = memory.add('test', 0.8, ['tag1', 'tag2']);
    expect(entry.importance).toBe(0.8);
    expect(entry.tags).toEqual(['tag1', 'tag2']);
  });

  test('get retrieves an entry and increments access', () => {
    const added = memory.add('test');
    const retrieved = memory.get(added.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.accessCount).toBe(1);
  });

  test('get returns undefined for unknown id', () => {
    expect(memory.get('nonexistent')).toBeUndefined();
  });

  test('search finds entries by content', () => {
    memory.add('hello world');
    memory.add('goodbye world');
    memory.add('foo bar');

    const results = memory.search('hello');
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('hello world');
  });

  test('search finds entries by tag', () => {
    memory.add('content1', 0.5, ['debug']);
    memory.add('content2', 0.5, ['feature']);

    const results = memory.search('debug');
    expect(results).toHaveLength(1);
  });

  test('search is case insensitive', () => {
    memory.add('Hello World');
    const results = memory.search('hello');
    expect(results).toHaveLength(1);
  });

  test('getAll returns all entries', () => {
    memory.add('a');
    memory.add('b');
    expect(memory.getAll()).toHaveLength(2);
  });

  test('remove deletes an entry', () => {
    const entry = memory.add('test');
    expect(memory.remove(entry.id)).toBe(true);
    expect(memory.size()).toBe(0);
    expect(memory.remove('nonexistent')).toBe(false);
  });

  test('clear removes all entries', () => {
    memory.add('a');
    memory.add('b');
    memory.clear();
    expect(memory.size()).toBe(0);
  });
});
