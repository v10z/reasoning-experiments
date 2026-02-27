import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StrategyRouter } from './strategies/router';
import { MemoryManager } from './memory/manager';
import { BenchmarkRunner } from './benchmarks/runner';
import { join } from 'path';
import { homedir } from 'os';

const DEFAULT_MEMORY_PATH = join(homedir(), '.claude', 'reasoning-memory', 'memory.json');

export function createServer(memoryPath?: string): {
  server: Server;
  router: StrategyRouter;
  memory: MemoryManager;
  benchmarkRunner: BenchmarkRunner;
} {
  const server = new Server(
    {
      name: 'reasoning-memory',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const router = new StrategyRouter();
  const memory = new MemoryManager({
    storagePath: memoryPath || DEFAULT_MEMORY_PATH,
  });
  const benchmarkRunner = new BenchmarkRunner();

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'reason',
        description:
          'Reason through a problem using structured strategies (FractalRecursion, DialecticalSpiral, SimulatedAnnealing, MetaCognitiveLoop, AdversarialSelfPlay, HippocampalReplay). Auto-selects the best strategy based on query if none specified.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'The problem or question to reason about' },
            strategy: {
              type: 'string',
              description: 'Optional: specific strategy name to use',
              enum: [
                'FractalRecursion',
                'DialecticalSpiral',
                'SimulatedAnnealing',
                'MetaCognitiveLoop',
                'AdversarialSelfPlay',
                'HippocampalReplay',
              ],
            },
            maxIterations: {
              type: 'number',
              description: 'Maximum reasoning iterations (default: strategy-specific)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'remember',
        description: 'Store a memory with importance level. High importance (>=0.7) goes to long-term, medium (>=0.4) to short-term, low to fleeting.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            content: { type: 'string', description: 'The content to remember' },
            importance: {
              type: 'number',
              description: 'Importance level 0-1 (default: 0.5)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'recall',
        description:
          'Recall relevant memories using associative search. Searches across all memory tiers with Hebbian association boosting.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'What to search for' },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'compose',
        description:
          'Chain multiple reasoning strategies for deeper analysis. ' +
          'Easiest: pick a preset. ' +
          'Presets: "deep-analysis" (decompose + debate + verify — best for design), ' +
          '"debug-verify" (find fix + stress-test — best for bugs), ' +
          '"full-review" (decompose + attack + learn — best for code review). ' +
          'Modes: "sequential" (default, chains strategies one after another), ' +
          '"ensemble" (runs all in parallel, picks best answer by vote), ' +
          '"feedback" (auto-picks strategies until confident, no strategies/preset needed).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'The problem or question to reason about' },
            preset: {
              type: 'string',
              description:
                'Pick a built-in recipe (easiest way to use compose). ' +
                '"deep-analysis": FractalRecursion -> DialecticalSpiral -> MetaCognitiveLoop. ' +
                '"debug-verify": SimulatedAnnealing -> AdversarialSelfPlay. ' +
                '"full-review": FractalRecursion -> AdversarialSelfPlay -> HippocampalReplay.',
              enum: ['deep-analysis', 'debug-verify', 'full-review'],
            },
            mode: {
              type: 'string',
              description:
                'How to combine strategies. Default: "sequential". ' +
                '"sequential": run one after another, each builds on the last. ' +
                '"ensemble": run all in parallel, majority vote picks the answer. ' +
                '"feedback": auto-select strategies until convergence >= 0.7 (ignores strategies/preset).',
              enum: ['sequential', 'ensemble', 'feedback'],
            },
            strategies: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'FractalRecursion',
                  'DialecticalSpiral',
                  'SimulatedAnnealing',
                  'MetaCognitiveLoop',
                  'AdversarialSelfPlay',
                  'HippocampalReplay',
                ],
              },
              description:
                'Custom list of strategies (use instead of preset for full control). ' +
                'Not needed for feedback mode.',
            },
            maxRounds: {
              type: 'number',
              description: 'Max rounds for feedback mode (default: 3). Ignored for other modes.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'benchmark',
        description:
          'Run reasoning benchmarks comparing structured strategies vs baseline on multi-step reasoning, debugging, and architecture problems.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            category: {
              type: 'string',
              description: 'Problem category to benchmark',
              enum: ['multi_step_reasoning', 'debugging', 'architecture'],
            },
          },
        },
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'reason': {
        const query = args?.query as string;
        const strategy = args?.strategy as string | undefined;
        const maxIterations = args?.maxIterations as number | undefined;

        const result = await router.reason({ query, strategy, maxIterations });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  strategy: result.trace.strategyName,
                  totalSteps: result.trace.totalSteps,
                  convergenceScore: result.trace.convergenceScore,
                  depth: result.trace.steps.length,
                  answer: result.answer,
                  trace: result.trace.steps.map((s) => ({
                    type: s.type,
                    content: s.content.substring(0, 200),
                    score: s.score,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'remember': {
        const content = args?.content as string;
        const importance = (args?.importance as number) || 0.5;
        const tags = (args?.tags as string[]) || [];

        await memory.initialize();
        const entry = memory.remember(content, importance, tags);
        await memory.save();

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: entry.id,
                tier: entry.source,
                importance: entry.importance,
                tags: entry.tags,
              }),
            },
          ],
        };
      }

      case 'recall': {
        const query = args?.query as string;
        const limit = (args?.limit as number) || 10;

        await memory.initialize();
        const memories = memory.recall(query, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                memories.map((m) => ({
                  id: m.id,
                  content: m.content,
                  importance: m.importance,
                  tier: m.source,
                  accessCount: m.accessCount,
                  tags: m.tags,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'compose': {
        const query = args?.query as string;
        const mode = args?.mode as 'sequential' | 'ensemble' | 'feedback' | undefined;
        const strategies = args?.strategies as string[] | undefined;
        const preset = args?.preset as 'deep-analysis' | 'debug-verify' | 'full-review' | undefined;
        const maxRounds = args?.maxRounds as number | undefined;

        const composeResult = await router.compose(
          { query },
          mode,
          strategies,
          preset,
          maxRounds
        );

        // Build a human-readable summary
        const pipeline = composeResult.strategiesUsed.join(' -> ');
        const confidence = (composeResult.trace.convergenceScore * 100).toFixed(0);
        const summary =
          `Ran ${composeResult.strategiesUsed.length} strategies: ${pipeline}\n` +
          `Total reasoning steps: ${composeResult.totalSteps} | Confidence: ${confidence}%`;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  summary,
                  answer: composeResult.answer,
                  strategiesUsed: composeResult.strategiesUsed,
                  totalSteps: composeResult.totalSteps,
                  convergenceScore: composeResult.trace.convergenceScore,
                  trace: composeResult.trace.steps.map((s) => ({
                    type: s.type,
                    content: s.content.substring(0, 200),
                    score: s.score,
                    sourceStrategy: s.metadata.sourceStrategy,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'benchmark': {
        const category = args?.category as string | undefined;

        let summary;
        if (category) {
          const results = await benchmarkRunner.runCategory(category);
          summary = {
            results,
            totalProblems: results.length,
            averageScore:
              results.reduce((sum, r) => sum + r.score.overall, 0) / results.length,
            averageImprovement:
              results.reduce((sum, r) => sum + r.improvement.overall, 0) / results.length,
          };
        } else {
          const fullSummary = await benchmarkRunner.runAll();
          summary = {
            formatted: benchmarkRunner.formatResults(fullSummary),
            ...fullSummary,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return { server, router, memory, benchmarkRunner };
}

// Main entry point
async function main(): Promise<void> {
  const { server, memory } = createServer();
  await memory.initialize();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
