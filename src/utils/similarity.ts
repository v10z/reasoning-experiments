/**
 * Bag-of-words text similarity functions.
 *
 * Both Jaccard and cosine operate on lowercased, punctuation-stripped
 * word tokens. Jaccard uses set intersection/union; cosine uses term
 * frequency vectors. Neither performs stemming, so "cache" and "caching"
 * are treated as distinct tokens.
 * @module
 */

/** Split text into a set of lowercased word tokens, stripping punctuation. */
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0)
  );
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B| over word token sets. Returns 0-1. */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Cosine similarity over term-frequency vectors. Returns 0-1. */
export function cosineSimilarity(a: string, b: string): number {
  const tokensA = a.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
  const tokensB = b.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  const allTokens = new Set([...freqA.keys(), ...freqB.keys()]);
  for (const token of allTokens) {
    const va = freqA.get(token) || 0;
    const vb = freqB.get(token) || 0;
    dotProduct += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
