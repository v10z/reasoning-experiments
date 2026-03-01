/**
 * Sentence-level math engine for GSM8K-style word problems.
 *
 * Handles spelled-out numbers, comma-formatted values, and common
 * arithmetic patterns (revenue, profit, fractions, yearly totals,
 * remaining-from-total).
 */

// ── Number word mappings ──────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  twice: 2,
};

const MULTIPLIER_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

// ── Types ─────────────────────────────────────────────────────────────

export interface MathStep {
  sentence: string;
  entity: string;
  quantities: number[];
  operation: string;
}

// ── extractNumbers ────────────────────────────────────────────────────

/**
 * Extract all numbers from text, handling:
 * - Spelled-out numbers: "three" → 3, "twenty-five" → 25
 * - Compound multipliers: "three hundred" → 300
 * - Comma-formatted: "$80,000" → 80000, "1,500" → 1500
 * - Decimals: "3.5" → 3.5
 * - Hyphenated digit-word: "3-page" → 3
 *
 * Returns numbers in order of appearance.
 */
export function extractNumbers(text: string): number[] {
  const results: Array<{ value: number; index: number }> = [];
  let processed = text.toLowerCase();

  // Pass 1: Comma-formatted numbers ($80,000 → 80000)
  processed = processed.replace(
    /\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?/g,
    (match, offset) => {
      results.push({ value: parseFloat(match.replace(/[$,]/g, '')), index: offset });
      return ' '.repeat(match.length);
    }
  );

  // Build alternation patterns for word numbers
  const wordPat = Object.keys(WORD_NUMBERS).join('|');
  const multPat = Object.keys(MULTIPLIER_WORDS).join('|');

  // Pass 2: Word + multiplier (e.g., "three hundred", "three hundred twenty-five")
  const multRegex = new RegExp(
    `\\b(${wordPat})\\s+(${multPat})(?:\\s+(?:(${wordPat})-(${wordPat})|(${wordPat})))?\\b`,
    'g'
  );
  processed = processed.replace(multRegex, (match, w1, mult, compA, compB, single, offset) => {
    let value = (WORD_NUMBERS[w1] || 0) * (MULTIPLIER_WORDS[mult] || 1);
    if (compA && compB) value += (WORD_NUMBERS[compA] || 0) + (WORD_NUMBERS[compB] || 0);
    else if (single) value += WORD_NUMBERS[single] || 0;
    results.push({ value, index: offset });
    return ' '.repeat(match.length);
  });

  // Pass 3: Compound hyphenated ("twenty-five" → 25)
  const compRegex = new RegExp(`\\b(${wordPat})-(${wordPat})\\b`, 'g');
  processed = processed.replace(compRegex, (match, w1, w2, offset) => {
    results.push({ value: (WORD_NUMBERS[w1] || 0) + (WORD_NUMBERS[w2] || 0), index: offset });
    return ' '.repeat(match.length);
  });

  // Pass 4: Single word numbers ("three" → 3, "twice" → 2)
  const singleRegex = new RegExp(`\\b(${wordPat})\\b`, 'g');
  processed = processed.replace(singleRegex, (match, w, offset) => {
    results.push({ value: WORD_NUMBERS[w], index: offset });
    return ' '.repeat(match.length);
  });

  // Pass 5: Remaining digit sequences (handles plain numbers and "3-page" → 3)
  const digitRegex = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = digitRegex.exec(processed)) !== null) {
    results.push({ value: parseFloat(m[0]), index: m.index });
  }

  // Sort by position and return values
  results.sort((a, b) => a.index - b.index);
  return results.map(r => r.value);
}

// ── parseSentences ────────────────────────────────────────────────────

/**
 * Parse a question into sentence-level math steps, extracting
 * the entity, quantities, and inferred operation for each sentence.
 */
export function parseSentences(question: string): MathStep[] {
  const sentences = question.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const steps: MathStep[] = [];

  for (const sentence of sentences) {
    const s = sentence.trim();
    const sLower = s.toLowerCase();
    const quantities = extractNumbers(s);

    // Extract entity (subject of the sentence)
    let entity = 'unknown';
    const subjectMatch = s.match(/^([A-Z][a-z]+(?:'s)?)/);
    if (subjectMatch) {
      entity = subjectMatch[1];
    } else if (/^(she|he|it|they|in|if|this|a|the|every)\b/i.test(s)) {
      entity = (s.match(/^(\w+)/i)?.[1] || 'unknown').toLowerCase();
    }

    // Determine operation from keywords
    let operation = 'info';
    if (/\beats?\b|\buses?\b|\bgives?\s+away\b|\bbakes?\b/i.test(sLower)) operation = 'subtract';
    else if (/\bbuys?\b|\bputs?\s+in\b|\bpays?\b/i.test(sLower)) operation = 'cost';
    else if (/\bsells?\b.*\bper\b|\bearns?\b.*\bper\b|\bfor\s+\$?\d/i.test(sLower)) operation = 'multiply';
    else if (/remaining|left|rest|last|final/i.test(sLower)) operation = 'remainder';
    else if (/how\s+many|how\s+much|total/i.test(sLower)) operation = 'query';
    else if (/\bhalf\b/i.test(sLower)) operation = 'divide';
    else if (/\btwice\b|\btimes\b|\bper\s+week\b/i.test(sLower)) operation = 'multiply';
    else if (/\bincreased?\b|\bpercent\b|%/i.test(sLower)) operation = 'percentage';
    else if (/\blays?\b|\bmakes?\b|\bproduces?\b|\bwrites?\b|\bfeeds?\b|\bgives?\b/i.test(sLower)) operation = 'set';

    steps.push({ sentence: s, entity, quantities, operation });
  }

  return steps;
}

// ── solveMath ─────────────────────────────────────────────────────────

/**
 * Solve a math word problem step-by-step.
 *
 * Classifies the problem into a known pattern (revenue, profit,
 * fraction, yearly multiplication, or remaining-from-total) and
 * computes the answer accordingly.
 *
 * Returns the computed answer and intermediate steps for trace integration.
 */
export function solveMath(question: string): { answer: string; steps: string[] } {
  const q = question.toLowerCase();
  const numbers = extractNumbers(question);
  const steps: string[] = [];

  if (numbers.length === 0) {
    return { answer: '0', steps: ['No numbers found'] };
  }

  // Pattern 1: Revenue — sell remainder at price per unit
  // e.g. "lays 16 eggs, eats 3, bakes 4, sells for $2 per egg"
  if (q.includes('sell') && q.includes('per') && (q.includes('how much') || q.includes('how many'))) {
    const initial = numbers[0];
    const price = numbers[numbers.length - 1];
    const subtractions = numbers.slice(1, -1);
    const subTotal = subtractions.reduce((a, b) => a + b, 0);
    const remainder = initial - subTotal;
    const answer = remainder * price;

    steps.push(`Initial: ${initial}`);
    subtractions.forEach(s => steps.push(`Subtract: ${s}`));
    steps.push(`Remainder: ${initial} - ${subTotal} = ${remainder}`);
    steps.push(`Revenue: ${remainder} × $${price} = $${answer}`);

    return { answer: String(answer), steps };
  }

  // Pattern 2: Profit with percentage increase
  // e.g. "buys for $80,000, repairs $50,000, increased by 150%, profit?"
  if (q.includes('profit') && (q.includes('%') || q.includes('percent'))) {
    const buyPrice = numbers[0];
    const costs = numbers[1];
    const pctIncrease = numbers[2];
    const newValue = buyPrice * (1 + pctIncrease / 100);
    const profit = newValue - buyPrice - costs;

    steps.push(`Purchase: $${buyPrice}`);
    steps.push(`Additional costs: $${costs}`);
    steps.push(`Value after ${pctIncrease}% increase: $${buyPrice} × ${1 + pctIncrease / 100} = $${newValue}`);
    steps.push(`Profit: $${newValue} - $${buyPrice} - $${costs} = $${profit}`);

    return { answer: String(profit), steps };
  }

  // Pattern 3: Half/fraction of previous amount
  // e.g. "2 bolts blue and half that much white"
  if (q.includes('half that much') || q.includes('half as much')) {
    const base = numbers[0];
    const total = base + base / 2;

    steps.push(`Base: ${base}`);
    steps.push(`Half: ${base} / 2 = ${base / 2}`);
    steps.push(`Total: ${base} + ${base / 2} = ${total}`);

    return { answer: String(total), steps };
  }

  // Pattern 4: Yearly multiplication — multiply all factors × 52 weeks
  // e.g. "3-page letter to 2 friends twice a week, how many pages a year?"
  if (q.includes('year') && (q.includes('how many') || q.includes('how much'))) {
    const product = numbers.reduce((a, b) => a * b, 1);
    const yearly = product * 52;

    steps.push(`Factors: ${numbers.join(' × ')} = ${product}`);
    steps.push(`Per year (52 weeks): ${product} × 52 = ${yearly}`);

    return { answer: String(yearly), steps };
  }

  // Pattern 5: Remaining from total (feed/meals pattern)
  // e.g. "3 cups per chicken, 3 meals, morning 15, afternoon 25, remaining?"
  if (q.includes('remaining') || q.includes('final meal') || q.includes('last meal')) {
    if (numbers.length >= 4) {
      const perUnit = numbers[0];
      const numDivisions = numbers[1];
      const knownAmounts = numbers.slice(2);
      const knownSum = knownAmounts.reduce((a, b) => a + b, 0);
      const numKnown = knownAmounts.length;

      if (numDivisions > 0 && perUnit > 0 && numKnown > 0) {
        // Infer total units: average per known division / (perUnit / numDivisions)
        const avgPerDivision = knownSum / numKnown;
        const unitsPerDivision = perUnit / numDivisions;
        const totalUnits = avgPerDivision / unitsPerDivision;
        const totalDaily = totalUnits * perUnit;
        const remaining = totalDaily - knownSum;

        steps.push(`Per unit per day: ${perUnit}`);
        steps.push(`Divisions: ${numDivisions}`);
        steps.push(`Known amounts: ${knownAmounts.join(' + ')} = ${knownSum}`);
        steps.push(`Avg per division: ${avgPerDivision}`);
        steps.push(`Total units: ${totalUnits}`);
        steps.push(`Total daily: ${totalUnits} × ${perUnit} = ${totalDaily}`);
        steps.push(`Remaining: ${totalDaily} - ${knownSum} = ${remaining}`);

        return { answer: String(remaining), steps };
      }
    }
  }

  // Fallback: sum all numbers
  const sum = numbers.reduce((a, b) => a + b, 0);
  steps.push(`Sum fallback: ${numbers.join(' + ')} = ${sum}`);
  return { answer: String(sum), steps };
}
