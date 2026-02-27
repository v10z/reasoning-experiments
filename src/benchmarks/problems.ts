export interface BenchmarkProblem {
  id: string;
  category: 'multi_step_reasoning' | 'debugging' | 'architecture';
  title: string;
  query: string;
  expectedKeywords: string[];     // Keywords that should appear in a good answer
  expectedDepth: number;          // Minimum reasoning depth expected
  difficulty: 'easy' | 'medium' | 'hard';
}

export const BENCHMARK_PROBLEMS: BenchmarkProblem[] = [
  // Multi-step reasoning problems
  {
    id: 'msr-1',
    category: 'multi_step_reasoning',
    title: 'Cache Invalidation Strategy',
    query: 'Design a cache invalidation strategy for a distributed system with eventual consistency, multiple write nodes, and a requirement for sub-100ms read latency',
    expectedKeywords: ['cache', 'invalidation', 'distributed', 'consistency', 'latency', 'write', 'read'],
    expectedDepth: 3,
    difficulty: 'hard',
  },
  {
    id: 'msr-2',
    category: 'multi_step_reasoning',
    title: 'Database Migration Plan',
    query: 'Create a zero-downtime database migration plan for moving from a monolithic PostgreSQL database to a sharded architecture',
    expectedKeywords: ['migration', 'database', 'downtime', 'shard', 'data'],
    expectedDepth: 3,
    difficulty: 'hard',
  },
  {
    id: 'msr-3',
    category: 'multi_step_reasoning',
    title: 'API Rate Limiting',
    query: 'Implement a rate limiting system that supports per-user, per-endpoint, and global limits with sliding window counters',
    expectedKeywords: ['rate', 'limit', 'user', 'endpoint', 'window'],
    expectedDepth: 2,
    difficulty: 'medium',
  },

  // Debugging problems
  {
    id: 'dbg-1',
    category: 'debugging',
    title: 'Race Condition in User Session',
    query: 'Debug: Users are intermittently seeing other users\' data after login. The error occurs more frequently under high load. The session middleware uses an in-memory store.',
    expectedKeywords: ['race', 'session', 'memory', 'concurrent', 'lock'],
    expectedDepth: 2,
    difficulty: 'medium',
  },
  {
    id: 'dbg-2',
    category: 'debugging',
    title: 'Memory Leak in Event Handler',
    query: 'Debug: The Node.js application crashes with OOM error after running for 24 hours. Memory usage grows linearly. Event listeners are registered in a loop.',
    expectedKeywords: ['memory', 'leak', 'event', 'listener', 'handler'],
    expectedDepth: 2,
    difficulty: 'medium',
  },
  {
    id: 'dbg-3',
    category: 'debugging',
    title: 'Broken CI Pipeline',
    query: 'Debug: Tests pass locally but fail in CI. The error is "connection refused" on database tests. Docker compose is used in CI.',
    expectedKeywords: ['test', 'connection', 'docker', 'CI'],
    expectedDepth: 2,
    difficulty: 'easy',
  },

  // Architecture decision problems
  {
    id: 'arch-1',
    category: 'architecture',
    title: 'Microservices vs Monolith',
    query: 'Compare microservices versus monolith architecture for a startup with 5 developers building an e-commerce platform with 10K daily active users',
    expectedKeywords: ['microservices', 'monolith', 'team', 'complexity', 'deploy'],
    expectedDepth: 2,
    difficulty: 'medium',
  },
  {
    id: 'arch-2',
    category: 'architecture',
    title: 'Real-time Architecture',
    query: 'Choose between WebSockets, Server-Sent Events, and long polling for a collaborative document editing application with up to 50 concurrent editors',
    expectedKeywords: ['websocket', 'real-time', 'concurrent', 'latency'],
    expectedDepth: 2,
    difficulty: 'medium',
  },
  {
    id: 'arch-3',
    category: 'architecture',
    title: 'State Management',
    query: 'Decide on a state management approach for a React application with complex form workflows, real-time updates, and offline support',
    expectedKeywords: ['state', 'react', 'offline', 'update'],
    expectedDepth: 2,
    difficulty: 'medium',
  },
];

export function getProblemsByCategory(category: string): BenchmarkProblem[] {
  return BENCHMARK_PROBLEMS.filter(p => p.category === category);
}

export function getProblemById(id: string): BenchmarkProblem | undefined {
  return BENCHMARK_PROBLEMS.find(p => p.id === id);
}
