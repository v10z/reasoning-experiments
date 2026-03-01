import { extractNumbers, parseSentences, solveMath } from '../../src/benchmarks/math-solver';
import { getPublicProblemsByCategory } from '../../src/benchmarks/public-problems';

// ── extractNumbers ────────────────────────────────────────────────────

describe('extractNumbers', () => {
  test('extracts plain digits', () => {
    expect(extractNumbers('She has 16 eggs')).toEqual([16]);
  });

  test('extracts spelled-out numbers', () => {
    expect(extractNumbers('three cats and four dogs')).toEqual([3, 4]);
  });

  test('extracts comma-formatted numbers', () => {
    expect(extractNumbers('costs $80,000 plus $50,000')).toEqual([80000, 50000]);
  });

  test('extracts decimals', () => {
    expect(extractNumbers('weighs 3.5 kg')).toEqual([3.5]);
  });

  test('extracts compound spelled-out numbers', () => {
    expect(extractNumbers('twenty-five dollars')).toEqual([25]);
  });

  test('extracts "twice"', () => {
    expect(extractNumbers('twice a week')).toEqual([2]);
  });

  test('extracts multiplier words', () => {
    expect(extractNumbers('three hundred cats')).toEqual([300]);
  });

  test('extracts multiplier with compound', () => {
    expect(extractNumbers('three hundred twenty-five')).toEqual([325]);
  });

  test('extracts hyphenated digit-word ("3-page")', () => {
    expect(extractNumbers('a 3-page letter')).toEqual([3]);
  });

  test('preserves order of appearance', () => {
    expect(extractNumbers('16 eggs, eats three, bakes four, for $2')).toEqual([16, 3, 4, 2]);
  });

  test('handles mixed formats in gsm8k-1', () => {
    const q = "Janet's ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four. She sells the remainder at the farmers' market daily for $2 per fresh duck egg. How much in dollars does she make every day at the farmers' market?";
    expect(extractNumbers(q)).toEqual([16, 3, 4, 2]);
  });

  test('handles comma-formatted in gsm8k-3', () => {
    const q = 'Josh decides to try flipping a house. He buys a house for $80,000 and then puts in $50,000 in repairs. This increased the value of the house by 150%. How much profit did he make?';
    expect(extractNumbers(q)).toEqual([80000, 50000, 150]);
  });

  test('handles "twice" in gsm8k-4', () => {
    const q = 'James writes a 3-page letter to 2 different friends twice a week. How many pages does he write a year?';
    expect(extractNumbers(q)).toEqual([3, 2, 2]);
  });

  test('handles multiple spelled-out in gsm8k-5', () => {
    const q = 'Every day, Wendi feeds each of her chickens three cups of mixed chicken feed, containing seeds, mealworms and vegetables to help keep them healthy. She gives the chickens their feed in three separate meals. In the morning, she gives her flock of chickens 15 cups of feed. In the afternoon, she gives her chickens another 25 cups of feed. If she fetches all the remaining feed for them in the final meal of the day, how many cups of feed does she need to give her chickens in the last meal?';
    expect(extractNumbers(q)).toEqual([3, 3, 15, 25]);
  });

  test('returns empty array for no numbers', () => {
    expect(extractNumbers('hello world')).toEqual([]);
  });
});

// ── parseSentences ────────────────────────────────────────────────────

describe('parseSentences', () => {
  test('splits into sentences and extracts operations', () => {
    const q = "Janet's ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four.";
    const steps = parseSentences(q);

    expect(steps.length).toBe(2);
    expect(steps[0].quantities).toEqual([16]);
    expect(steps[0].operation).toBe('set'); // "lay" → set
    expect(steps[1].quantities).toEqual([3, 4]);
    expect(steps[1].operation).toBe('subtract'); // "eats" → subtract
  });

  test('detects sell/multiply operation', () => {
    const steps = parseSentences("She sells the remainder at the farmers' market daily for $2 per fresh duck egg.");
    expect(steps[0].operation).toBe('multiply');
    expect(steps[0].quantities).toEqual([2]);
  });

  test('detects query operation', () => {
    const steps = parseSentences('How much in dollars does she make every day?');
    expect(steps[0].operation).toBe('query');
  });

  test('detects cost operation', () => {
    const steps = parseSentences('He buys a house for $80,000 and then puts in $50,000 in repairs.');
    expect(steps[0].operation).toBe('cost');
    expect(steps[0].quantities).toEqual([80000, 50000]);
  });

  test('detects percentage operation', () => {
    const steps = parseSentences('This increased the value of the house by 150%.');
    expect(steps[0].operation).toBe('percentage');
    expect(steps[0].quantities).toEqual([150]);
  });

  test('detects remainder operation', () => {
    const steps = parseSentences('If she fetches all the remaining feed for them in the final meal of the day, how many cups?');
    expect(steps[0].operation).toBe('remainder');
  });
});

// ── solveMath (end-to-end on GSM8K problems) ──────────────────────────

describe('solveMath', () => {
  const mathProblems = getPublicProblemsByCategory('math');

  test('gsm8k-1: egg selling → 18', () => {
    const p = mathProblems.find(p => p.id === 'gsm8k-1')!;
    const result = solveMath(p.question);
    expect(result.answer).toBe('18');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  test('gsm8k-2: bolts of fiber → 3', () => {
    const p = mathProblems.find(p => p.id === 'gsm8k-2')!;
    const result = solveMath(p.question);
    expect(result.answer).toBe('3');
  });

  test('gsm8k-3: house flipping profit → 70000', () => {
    const p = mathProblems.find(p => p.id === 'gsm8k-3')!;
    const result = solveMath(p.question);
    expect(result.answer).toBe('70000');
  });

  test('gsm8k-4: pages per year → 624', () => {
    const p = mathProblems.find(p => p.id === 'gsm8k-4')!;
    const result = solveMath(p.question);
    expect(result.answer).toBe('624');
  });

  test('gsm8k-5: remaining chicken feed → 20', () => {
    const p = mathProblems.find(p => p.id === 'gsm8k-5')!;
    const result = solveMath(p.question);
    expect(result.answer).toBe('20');
  });

  test('all GSM8K problems produce correct answers', () => {
    for (const p of mathProblems) {
      const result = solveMath(p.question);
      expect(result.answer).toBe(p.correctAnswer);
    }
  });

  test('returns steps for trace integration', () => {
    const result = solveMath("Janet's ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four. She sells the remainder at the farmers' market daily for $2 per fresh duck egg. How much in dollars does she make every day at the farmers' market?");
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
    expect(result.steps.some(s => s.includes('Remainder'))).toBe(true);
    expect(result.steps.some(s => s.includes('Revenue'))).toBe(true);
  });

  test('handles no numbers gracefully', () => {
    const result = solveMath('What is the meaning of life?');
    expect(result.answer).toBe('0');
  });
});

// ── Integration: augmented solver beats baseline on math ──────────────

describe('augmented solver vs baseline (math)', () => {
  test('math-solver answers match all GSM8K expected answers', () => {
    const mathProblems = getPublicProblemsByCategory('math');
    let correct = 0;
    for (const p of mathProblems) {
      const result = solveMath(p.question);
      if (result.answer === p.correctAnswer) correct++;
    }
    expect(correct).toBe(mathProblems.length);
  });
});
