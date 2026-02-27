import { tokenize, jaccardSimilarity, cosineSimilarity } from '../../src/utils/similarity';

describe('tokenize', () => {
  test('splits text into lowercase tokens', () => {
    const tokens = tokenize('Hello World');
    expect(tokens).toEqual(new Set(['hello', 'world']));
  });

  test('removes punctuation', () => {
    const tokens = tokenize('Hello, World! How are you?');
    expect(tokens).toEqual(new Set(['hello', 'world', 'how', 'are', 'you']));
  });

  test('handles empty string', () => {
    expect(tokenize('')).toEqual(new Set());
  });

  test('deduplicates tokens', () => {
    const tokens = tokenize('the the the');
    expect(tokens).toEqual(new Set(['the']));
  });
});

describe('jaccardSimilarity', () => {
  test('identical strings return 1', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  test('completely different strings return 0', () => {
    expect(jaccardSimilarity('hello world', 'foo bar')).toBe(0);
  });

  test('partial overlap returns correct score', () => {
    const sim = jaccardSimilarity('hello world foo', 'hello world bar');
    // intersection: {hello, world} = 2, union: {hello, world, foo, bar} = 4
    expect(sim).toBeCloseTo(0.5, 5);
  });

  test('both empty strings return 1', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });

  test('one empty string returns 0', () => {
    expect(jaccardSimilarity('hello', '')).toBe(0);
    expect(jaccardSimilarity('', 'hello')).toBe(0);
  });

  test('is case insensitive', () => {
    expect(jaccardSimilarity('Hello World', 'hello world')).toBe(1);
  });
});

describe('cosineSimilarity', () => {
  test('identical strings return 1', () => {
    expect(cosineSimilarity('hello world', 'hello world')).toBeCloseTo(1, 5);
  });

  test('completely different strings return 0', () => {
    expect(cosineSimilarity('hello world', 'foo bar')).toBe(0);
  });

  test('partial overlap returns score between 0 and 1', () => {
    const sim = cosineSimilarity('hello world foo', 'hello world bar');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  test('both empty returns 0', () => {
    expect(cosineSimilarity('', '')).toBe(0);
  });
});
