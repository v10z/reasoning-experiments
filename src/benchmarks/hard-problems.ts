/**
 * Hard benchmark problems designed to challenge frontier LLMs.
 * These require multi-step reasoning, constraint tracking, or
 * careful logical deduction where structured thinking helps.
 */

export interface HardProblem {
  id: string;
  category: 'math' | 'logic' | 'code' | 'planning';
  question: string;
  choices?: string[];
  correctAnswer: string;
  why: string; // Why this is hard for LLMs
}

export const HARD_PROBLEMS: HardProblem[] = [
  // ── Multi-step math with distractors ──────────────────────────
  {
    id: 'hard-math-1',
    category: 'math',
    question: `A store has a "buy 3, get the cheapest free" promotion. Alice buys items costing $20, $15, $12, $10, $8, and $5. The promotion applies as many times as possible (items grouped optimally by Alice). How much does Alice pay in total?`,
    correctAnswer: '53',
    why: 'Optimal grouping: {20,15,12} cheapest=12 free, {10,8,5} cheapest=5 free. Total paid: 20+15+10+8 = 53.',
  },
  {
    id: 'hard-math-2',
    category: 'math',
    question: `Three friends split a $180 dinner bill. Alex pays 50% more than Blake. Casey pays twice what Blake pays. Before tip, how much does Blake pay?`,
    correctAnswer: '40',
    why: 'Need to set up equations: B + 1.5B + 2B = 180, so 4.5B = 180, B = 40',
  },
  {
    id: 'hard-math-3',
    category: 'math',
    question: `A clock shows 3:15. What is the exact angle in degrees between the hour hand and the minute hand? (Give the smaller angle.)`,
    correctAnswer: '7.5',
    why: 'Hour hand at 3:15 is at 3*30 + 15*0.5 = 97.5 degrees. Minute hand at 15 is at 90 degrees. Difference = 7.5 degrees. Many LLMs say 0 or 90.',
  },
  {
    id: 'hard-math-4',
    category: 'math',
    question: `You have a 3-gallon jug and a 5-gallon jug. How many steps does it take to measure exactly 4 gallons using the minimum number of pour/fill/empty operations? (Count each fill, empty, or pour as one step.)`,
    correctAnswer: '6',
    why: 'Fill 5, pour into 3 (leaves 2 in 5), empty 3, pour 2 from 5 into 3, fill 5, pour from 5 into 3 (3 has 2, needs 1 more, leaving 4 in 5). Thats 6 steps.',
  },
  {
    id: 'hard-math-5',
    category: 'math',
    question: `A snail climbs a 30-foot wall. Each day it climbs up 3 feet, but each night it slides back 2 feet. On which day does the snail reach the top of the wall?`,
    correctAnswer: '28',
    why: 'Net 1 foot/day, but on the last day it reaches the top without sliding back. After 27 days: 27 feet. Day 28: climbs 3 more = 30. Answer: day 28.',
  },

  // ── Hard logic / constraint satisfaction ──────────────────────
  {
    id: 'hard-logic-1',
    category: 'logic',
    question: `Five houses in a row are painted different colors: red, blue, green, yellow, white. The red house is immediately to the left of the blue house. The green house is somewhere to the left of the white house. The yellow house is not adjacent to the green house. The white house is not at either end. What color is the house in position 3 (middle)?`,
    choices: ['A) red', 'B) blue', 'C) green', 'D) white', 'E) yellow'],
    correctAnswer: 'B',
    why: 'Constraint satisfaction: G(1),R(2),B(3),W(4),Y(5). Red left of blue ✓, green left of white ✓, yellow not adj green ✓, white not at end ✓. Middle = blue.',
  },
  {
    id: 'hard-logic-2',
    category: 'logic',
    question: `A says: "Exactly one of us is lying." B says: "Exactly two of us are lying." C says: "All three of us are lying." How many of A, B, and C are telling the truth?`,
    choices: ['A) 0', 'B) 1', 'C) 2', 'D) 3'],
    correctAnswer: 'B',
    why: 'If A is truthful, exactly 1 lies. Then B and C must have one liar. B says 2 lie (false if only 1 lies), C says 3 lie (false). So B and C both lie = 2 liars, contradicting A. If B is truthful, exactly 2 lie. A and C lie. A says 1 lies (false ✓), C says 3 lie (false ✓). Consistent! So B is truthful, 1 person tells truth. Answer: B (1 person).',
  },
  {
    id: 'hard-logic-3',
    category: 'logic',
    question: `You have 12 coins, one of which is counterfeit and either heavier or lighter than the rest. Using a balance scale, what is the minimum number of weighings needed to guarantee you can identify the counterfeit coin AND determine whether it is heavier or lighter?`,
    correctAnswer: '3',
    why: 'Classic puzzle. 3 weighings can distinguish among 3^3=27 outcomes, and 12 coins × 2 possibilities (heavy/light) = 24 outcomes < 27.',
  },
  {
    id: 'hard-logic-4',
    category: 'logic',
    question: `In a tournament, every player plays every other player exactly once. There are no draws. If there are 7 players, how many total games are played?`,
    correctAnswer: '21',
    why: 'C(7,2) = 7*6/2 = 21. Simple combination but LLMs sometimes compute incorrectly.',
  },
  {
    id: 'hard-logic-5',
    category: 'logic',
    question: `Three boxes are labeled "Apples", "Oranges", and "Mixed". ALL labels are wrong. You can pick one fruit from one box. From which labeled box should you pick to determine the contents of ALL three boxes?`,
    choices: ['A) Apples', 'B) Oranges', 'C) Mixed', 'D) Any box works'],
    correctAnswer: 'C',
    why: 'Pick from "Mixed" (which is mislabeled). If you get an apple, this box is Apples. Then "Apples" box (mislabeled) can only be Oranges or Mixed. Since "Oranges" is also mislabeled and cant be oranges, "Oranges" must be Mixed, and "Apples" must be Oranges.',
  },

  // ── Hard code tracing ─────────────────────────────────────────
  {
    id: 'hard-code-1',
    category: 'code',
    question: `What does this Python code print?\n\ndef f(n, memo={}):\n    if n in memo: return memo[n]\n    if n <= 1: return n\n    memo[n] = f(n-1, memo) + f(n-2, memo)\n    return memo[n]\n\nprint(f(10))`,
    correctAnswer: '55',
    why: 'Fibonacci with memoization. f(10) = 55. Mutable default argument is a red herring.',
  },
  {
    id: 'hard-code-2',
    category: 'code',
    question: `What does this JavaScript code log?\n\nlet x = 1;\nfunction foo() {\n  console.log(x);\n  let x = 2;\n}\nfoo();`,
    correctAnswer: 'ReferenceError',
    why: 'Temporal dead zone: let x in function creates a TDZ, so console.log(x) before the let declaration throws ReferenceError, not undefined.',
  },
  {
    id: 'hard-code-3',
    category: 'code',
    question: `What is the output?\n\ndef foo(x, lst=[]):\n    lst.append(x)\n    return lst\n\na = foo(1)\nb = foo(2)\nprint(len(b))`,
    correctAnswer: '2',
    why: 'Mutable default argument gotcha in Python. The same list is shared across calls. After foo(1) lst=[1], after foo(2) lst=[1,2]. len(b) = 2.',
  },
  {
    id: 'hard-code-4',
    category: 'code',
    question: `What does this code print?\n\nfor i in range(4):\n    print(i, end="")\nelse:\n    print("done", end="")\nprint("!")`,
    correctAnswer: '0123done!',
    why: 'Python for-else: the else block runs when the loop completes normally (no break). Output: 0123done!',
  },
  {
    id: 'hard-code-5',
    category: 'code',
    question: `What is the output of this Python code?\n\nx = [1, 2, 3]\ny = x\nx = x + [4]\nprint(y)`,
    correctAnswer: '[1, 2, 3]',
    why: 'x + [4] creates a NEW list, reassigning x. y still points to the original [1,2,3]. Different from x.append(4) or x += [4].',
  },

  // ── Planning / multi-constraint ───────────────────────────────
  {
    id: 'hard-plan-1',
    category: 'planning',
    question: `You need to schedule 4 tasks: A(2hrs), B(1hr), C(3hrs), D(1hr). Constraints: B must finish before C starts. A and C cannot overlap. D must start after A finishes. What is the minimum total time to complete all tasks?`,
    correctAnswer: '5',
    why: 'Optimal: Start A(2hrs) and B(1hr) at t=0. B finishes t=1, start D at... wait D needs A to finish. A finishes t=2, start C and D at t=2. C takes 3hrs to t=5. D takes 1hr to t=3. B finishes at t=1 < C starts t=2 ✓. Total: 5 hours.',
  },
  {
    id: 'hard-plan-2',
    category: 'planning',
    question: `A farmer needs to cross a river with a fox, a chicken, and a bag of grain. The boat holds the farmer plus one item. If left alone, the fox eats the chicken, and the chicken eats the grain. What is the minimum number of one-way river crossings needed?`,
    correctAnswer: '7',
    why: 'Classic: 1.farmer+chicken across, 2.farmer back, 3.farmer+fox across, 4.farmer+chicken back, 5.farmer+grain across, 6.farmer back, 7.farmer+chicken across. = 7 crossings.',
  },
  {
    id: 'hard-plan-3',
    category: 'planning',
    question: `You have tasks with dependencies: A->B, A->C, B->D, C->D, B->E. Each task takes 1 day. What is the minimum days to complete all tasks, assuming unlimited parallelism?`,
    correctAnswer: '3',
    why: 'Day1:A. Day2:B+C (parallel, both need only A). Day3:D+E (parallel, D needs B+C, E needs B). Total: 3 days.',
  },
  {
    id: 'hard-plan-4',
    category: 'planning',
    question: `You have exactly 8 minutes to get 3 people across a bridge at night with one flashlight. The bridge holds at most 2 people. Person A takes 1 min, B takes 2 min, C takes 5 min. Two people crossing together go at the slower person's speed. Can all three cross in 8 minutes? If yes, what is the minimum time?`,
    correctAnswer: '8',
    why: 'A+B cross (2min), A returns (1min), A+C cross (5min). Total: 2+1+5 = 8 minutes exactly.',
  },
  {
    id: 'hard-plan-5',
    category: 'planning',
    question: `A meeting needs to be scheduled. Available times: Alice(9-12,14-16), Bob(10-13,15-17), Carol(8-11,13-15). What is the latest possible 1-hour time slot where all three can meet?`,
    correctAnswer: '10-11',
    why: 'Find intersection of all available times. Alice:9-12,14-16. Bob:10-13,15-17. Carol:8-11,13-15. Morning overlap: Alice(9-12)∩Bob(10-13)∩Carol(8-11) = 10-11. Afternoon: Alice(14-16)∩Bob(15-17)∩Carol(13-15) = 15-15 = empty (Carol ends at 15, Bob starts at 15, but need a 1-hour slot). So only slot is 10-11.',
  },
];
