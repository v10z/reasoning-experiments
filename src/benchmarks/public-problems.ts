/**
 * Public benchmark problems embedded directly for offline evaluation.
 * Sources: GSM8K, ARC-Challenge, LogiQA, and code-reasoning problems.
 *
 * Each problem has a definitive correct answer that can be verified automatically.
 */

export type ProblemCategory = 'math' | 'science' | 'logic' | 'code';

export interface PublicBenchmarkProblem {
  id: string;
  source: string;          // e.g. "GSM8K", "ARC-Challenge", "LogiQA"
  category: ProblemCategory;
  question: string;
  choices?: string[];       // For multiple-choice (A/B/C/D)
  correctAnswer: string;    // The ground truth
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── GSM8K-style: Multi-step math reasoning ─────────────────────────────
const MATH_PROBLEMS: PublicBenchmarkProblem[] = [
  {
    id: 'gsm8k-1',
    source: 'GSM8K',
    category: 'math',
    question: 'Janet\'s ducks lay 16 eggs per day. She eats three for breakfast every morning and bakes muffins for her friends every day with four. She sells the remainder at the farmers\' market daily for $2 per fresh duck egg. How much in dollars does she make every day at the farmers\' market?',
    correctAnswer: '18',
    difficulty: 'easy',
  },
  {
    id: 'gsm8k-2',
    source: 'GSM8K',
    category: 'math',
    question: 'A robe takes 2 bolts of blue fiber and half that much white fiber. How many bolts in total does it take?',
    correctAnswer: '3',
    difficulty: 'easy',
  },
  {
    id: 'gsm8k-3',
    source: 'GSM8K',
    category: 'math',
    question: 'Josh decides to try flipping a house. He buys a house for $80,000 and then puts in $50,000 in repairs. This increased the value of the house by 150%. How much profit did he make?',
    correctAnswer: '70000',
    difficulty: 'medium',
  },
  {
    id: 'gsm8k-4',
    source: 'GSM8K',
    category: 'math',
    question: 'James writes a 3-page letter to 2 different friends twice a week. How many pages does he write a year?',
    correctAnswer: '624',
    difficulty: 'medium',
  },
  {
    id: 'gsm8k-5',
    source: 'GSM8K',
    category: 'math',
    question: 'Every day, Wendi feeds each of her chickens three cups of mixed chicken feed, containing seeds, mealworms and vegetables to help keep them healthy. She gives the chickens their feed in three separate meals. In the morning, she gives her flock of chickens 15 cups of feed. In the afternoon, she gives her chickens another 25 cups of feed. If she fetches all the remaining feed for them in the final meal of the day, how many cups of feed does she need to give her chickens in the last meal?',
    correctAnswer: '20',
    difficulty: 'hard',
  },
];

// ── ARC-Challenge-style: Science reasoning ─────────────────────────────
const SCIENCE_PROBLEMS: PublicBenchmarkProblem[] = [
  {
    id: 'arc-1',
    source: 'ARC-Challenge',
    category: 'science',
    question: 'Which of the following is the best conductor of electricity?',
    choices: ['A) rubber', 'B) wood', 'C) copper', 'D) glass'],
    correctAnswer: 'C',
    difficulty: 'easy',
  },
  {
    id: 'arc-2',
    source: 'ARC-Challenge',
    category: 'science',
    question: 'A student is investigating the effect of sunlight on plant growth. Which variable should the student keep the same in each trial?',
    choices: ['A) the type of plant', 'B) the amount of sunlight', 'C) the height of the plant', 'D) the color of the leaves'],
    correctAnswer: 'A',
    difficulty: 'medium',
  },
  {
    id: 'arc-3',
    source: 'ARC-Challenge',
    category: 'science',
    question: 'When a candle burns, the wax disappears. Where does most of the mass of the wax go?',
    choices: ['A) into the wick', 'B) into the air as gases', 'C) into the flame as light', 'D) into the holder as heat'],
    correctAnswer: 'B',
    difficulty: 'medium',
  },
  {
    id: 'arc-4',
    source: 'ARC-Challenge',
    category: 'science',
    question: 'An astronaut orbiting Earth notices that an ice cube left on the dashboard floats instead of sitting in place. This is best explained by:',
    choices: ['A) the ice is less dense than air', 'B) microgravity conditions in orbit', 'C) temperature differences in the cabin', 'D) magnetic fields from Earth'],
    correctAnswer: 'B',
    difficulty: 'medium',
  },
  {
    id: 'arc-5',
    source: 'ARC-Challenge',
    category: 'science',
    question: 'Which process is primarily responsible for the formation of sedimentary rock?',
    choices: ['A) melting and cooling', 'B) heat and pressure', 'C) weathering, erosion, and deposition', 'D) volcanic eruption'],
    correctAnswer: 'C',
    difficulty: 'easy',
  },
];

// ── LogiQA-style: Logical deduction ─────────────────────────────────────
const LOGIC_PROBLEMS: PublicBenchmarkProblem[] = [
  {
    id: 'logic-1',
    source: 'LogiQA',
    category: 'logic',
    question: 'All roses are flowers. Some flowers fade quickly. Therefore:',
    choices: [
      'A) All roses fade quickly',
      'B) Some roses fade quickly',
      'C) No roses fade quickly',
      'D) None of the above can be concluded with certainty',
    ],
    correctAnswer: 'D',
    difficulty: 'medium',
  },
  {
    id: 'logic-2',
    source: 'LogiQA',
    category: 'logic',
    question: 'If it rains, the ground gets wet. The ground is wet. What can we conclude?',
    choices: [
      'A) It rained',
      'B) It might have rained, or the ground got wet for another reason',
      'C) It did not rain',
      'D) The ground is always wet',
    ],
    correctAnswer: 'B',
    difficulty: 'medium',
  },
  {
    id: 'logic-3',
    source: 'LogiQA',
    category: 'logic',
    question: 'In a group of 5 people (A, B, C, D, E), exactly 2 are engineers. A says "I am not an engineer." B says "Exactly one of A and C is an engineer." If both statements are true, and B is an engineer, which of the following must also be an engineer?',
    choices: ['A) A', 'B) C', 'C) D', 'D) E'],
    correctAnswer: 'B',
    difficulty: 'hard',
  },
  {
    id: 'logic-4',
    source: 'LogiQA',
    category: 'logic',
    question: 'No mammals are cold-blooded. All reptiles are cold-blooded. Therefore:',
    choices: [
      'A) Some mammals are reptiles',
      'B) No reptiles are mammals',
      'C) All cold-blooded animals are reptiles',
      'D) Some reptiles are mammals',
    ],
    correctAnswer: 'B',
    difficulty: 'easy',
  },
  {
    id: 'logic-5',
    source: 'LogiQA',
    category: 'logic',
    question: 'A says: "B is lying." B says: "C is lying." C says: "Both A and B are lying." If exactly one person is telling the truth, who is it?',
    choices: ['A) A', 'B) B', 'C) C', 'D) None of them'],
    correctAnswer: 'B',
    difficulty: 'hard',
  },
];

// ── Code reasoning: What does this code output? ────────────────────────
const CODE_PROBLEMS: PublicBenchmarkProblem[] = [
  {
    id: 'code-1',
    source: 'CodeReasoning',
    category: 'code',
    question: 'What is the output of the following Python code?\n\nx = [1, 2, 3, 4, 5]\ny = x[1:4]\ny[0] = 10\nprint(x[1])',
    correctAnswer: '2',
    difficulty: 'medium',
  },
  {
    id: 'code-2',
    source: 'CodeReasoning',
    category: 'code',
    question: 'What is the output of the following JavaScript code?\n\nlet a = [1, 2, 3];\nlet b = a;\nb.push(4);\nconsole.log(a.length);',
    correctAnswer: '4',
    difficulty: 'easy',
  },
  {
    id: 'code-3',
    source: 'CodeReasoning',
    category: 'code',
    question: 'What does this function return when called with f(5)?\n\nfunction f(n) {\n  if (n <= 1) return n;\n  return f(n-1) + f(n-2);\n}',
    correctAnswer: '5',
    difficulty: 'medium',
  },
  {
    id: 'code-4',
    source: 'CodeReasoning',
    category: 'code',
    question: 'What is the output of this Python code?\n\ndef mystery(lst):\n    return lst[::-1]\n\nresult = mystery([1, 2, 3])\nprint(result[0])',
    correctAnswer: '3',
    difficulty: 'easy',
  },
  {
    id: 'code-5',
    source: 'CodeReasoning',
    category: 'code',
    question: 'What is printed by this code?\n\nfor i in range(3):\n    for j in range(i):\n        pass\n    print(i, end=" ")',
    correctAnswer: '0 1 2',
    difficulty: 'medium',
  },
];

export const PUBLIC_PROBLEMS: PublicBenchmarkProblem[] = [
  ...MATH_PROBLEMS,
  ...SCIENCE_PROBLEMS,
  ...LOGIC_PROBLEMS,
  ...CODE_PROBLEMS,
];

export function getPublicProblemsByCategory(category: ProblemCategory): PublicBenchmarkProblem[] {
  return PUBLIC_PROBLEMS.filter(p => p.category === category);
}

export function getPublicProblemsBySource(source: string): PublicBenchmarkProblem[] {
  return PUBLIC_PROBLEMS.filter(p => p.source === source);
}
