import { generateId, generateDeterministicId, setDeterministicMode } from '../../src/utils/id';

describe('id utilities', () => {
  test('generateId returns a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  test('generateId returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  test('generateDeterministicId returns sequential ids', () => {
    setDeterministicMode('test');
    expect(generateDeterministicId()).toBe('test-0001');
    expect(generateDeterministicId()).toBe('test-0002');
    expect(generateDeterministicId()).toBe('test-0003');
  });

  test('setDeterministicMode resets counter', () => {
    setDeterministicMode('a');
    generateDeterministicId();
    generateDeterministicId();
    setDeterministicMode('b');
    expect(generateDeterministicId()).toBe('b-0001');
  });
});
