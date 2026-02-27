# reasoning-memory-claude

Nature-inspired reasoning strategies and persistent memory for Claude Code. Integrates via MCP server to give Claude structured thinking approaches and organic, Hebbian-associative memory across sessions.

## Features

### 6 Reasoning Strategies

| Strategy | Use Case | How It Works |
|----------|----------|-------------|
| **FractalRecursion** | Breaking down features | Multi-scale decomposition into implementable pieces |
| **DialecticalSpiral** | Architecture decisions | Thesis/antithesis/synthesis rounds until convergence |
| **SimulatedAnnealing** | Debugging | Explores hypotheses broadly, then narrows to root cause |
| **MetaCognitiveLoop** | When stuck | Self-reflective reasoning that monitors and pivots |
| **AdversarialSelfPlay** | Code review, security | Red team/blue team/judge tribunal |
| **HippocampalReplay** | Learning from mistakes | Forward/backward replay with counterfactual analysis |

The **Strategy Router** auto-selects the best strategy based on query keywords (e.g., "bug" triggers SimulatedAnnealing, "compare" triggers DialecticalSpiral).

### Strategy Composition

Strategies can be chained together for deeper analysis using the **StrategyComposer**:

| Mode | Description |
|------|-------------|
| **sequential** | Chain strategies one after another, each builds on the prior trace |
| **ensemble** | Run all strategies in parallel, pick the best answer by majority vote or convergence |
| **feedback** | Auto-select strategies iteratively until convergence threshold (0.7) is met |

Three built-in presets for common workflows:

| Preset | Strategies | Best For |
|--------|-----------|----------|
| `deep-analysis` | FractalRecursion → DialecticalSpiral → MetaCognitiveLoop | Complex design questions |
| `debug-verify` | SimulatedAnnealing → AdversarialSelfPlay | Bug investigation |
| `full-review` | FractalRecursion → AdversarialSelfPlay → HippocampalReplay | Code/architecture review |

### 3-Tier Memory System

- **Fleeting** — In-memory scratchpad, cleared each session
- **Short-Term** — Sliding window with relevance scoring and automatic eviction
- **Long-Term** — Persistent JSON store with decay, pruning, and Hebbian associations

Memory entries are automatically routed by importance: high (>=0.7) to long-term, medium (>=0.4) to short-term, low to fleeting.

**Hebbian Network**: Memories recalled together have their association strengthened. Over time, related memories form clusters that surface together during recall.

**Decay Function**: `relevance = importance * (accessCount / (1 + daysSinceAccess))^0.5`

### MCP Tools

| Tool | Description |
|------|-------------|
| `reason` | Reason through a problem with auto-selected or specified strategy |
| `compose` | Chain multiple strategies using presets, custom pipelines, or adaptive feedback |
| `remember` | Store a memory with importance and tags |
| `recall` | Recall relevant memories with associative boosting |
| `benchmark` | Run benchmark suite comparing strategies vs baseline |

## Quick Start

```bash
# Install
npm install

# Run tests (295 tests across 21 suites)
npm test

# Build
npm run build

# Start MCP server
npm start

# Run internal benchmarks
npm run benchmark

# Run offline public benchmarks (no API key needed)
npm run benchmark:offline

# Run public benchmarks with real LLM comparison (requires API key)
ANTHROPIC_API_KEY=sk-ant-... npm run benchmark:public
```

## OpenAI-Compatible Proxy Server

An HTTP proxy server lets external tools (like `lm-evaluation-harness`) run standard benchmarks against the reasoning-augmented framework. The proxy receives OpenAI-format requests, runs the reasoning framework, optionally calls the Anthropic API with the trace-augmented prompt, and returns an OpenAI-format response.

```
lm-eval-harness (Python)         reasoning-memory proxy          Claude API
       |                                  |                          |
       |  POST /v1/chat/completions       |                          |
       |  (OpenAI format)                 |                          |
       |--------------------------------->|                          |
       |                                  |  1. Run StrategyRouter   |
       |                                  |  2. Build reasoning trace|
       |                                  |  3. Augmented prompt     |
       |                                  |------------------------->|
       |                                  |  4. Claude response      |
       |                                  |<-------------------------|
       |  OpenAI-format response          |                          |
       |<---------------------------------|                          |
```

### Starting the Proxy

```bash
# Build first
npm run build

# Start in passthrough mode (no API key, returns reasoning trace directly)
npm run proxy

# Start with Claude API augmentation
ANTHROPIC_API_KEY=sk-ant-... npm run proxy

# Dev mode (no build needed)
npm run proxy:dev
```

### Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ANTHROPIC_API_KEY` | _(none)_ | Anthropic API key. If unset, runs in passthrough mode (returns reasoning trace only) |
| `STRATEGY` | _(auto)_ | Force a specific strategy (e.g., `DialecticalSpiral`) |
| `COMPOSE_PRESET` | _(none)_ | Use a composition preset (`deep-analysis`, `debug-verify`, `full-review`) |
| `COMPOSE_MODE` | _(none)_ | Composition mode (`sequential`, `ensemble`, `feedback`) |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |
| `GET` | `/v1/models` | Model list — returns `reasoning-memory` model for eval harness discovery |
| `POST` | `/v1/chat/completions` | Chat completion — accepts OpenAI-format request, returns OpenAI-format response |
| `OPTIONS` | `*` | CORS preflight — enables browser and cross-origin access |

### Usage Examples

```bash
# Health check
curl http://localhost:3000/health

# Chat completion (passthrough mode)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}'

# With a specific strategy
STRATEGY=DialecticalSpiral npm run proxy

# With a composition preset
COMPOSE_PRESET=deep-analysis npm run proxy

# With lm-evaluation-harness
lm_eval --model local-chat-completions \
  --model_args model=reasoning-memory,base_url=http://localhost:3000/v1 \
  --tasks gsm8k,arc_challenge
```

### Passthrough vs Augmented Mode

- **Passthrough** (no `ANTHROPIC_API_KEY`): The proxy runs the reasoning framework and returns its answer directly. Useful for testing the framework without API costs.
- **Augmented** (with `ANTHROPIC_API_KEY`): The proxy runs the reasoning framework, appends the trace to the original query, sends the augmented prompt to Claude, and returns Claude's response.

## Project Structure

```
src/
├── index.ts                    # MCP server entry point
├── proxy-server.ts             # OpenAI-compatible HTTP proxy server
├── proxy-cli.ts                # CLI entry point for proxy server
├── strategies/
│   ├── base.ts                 # ReasoningEngine abstract class (Template Method)
│   ├── fractal-recursion.ts    # Multi-scale decomposition
│   ├── dialectical-spiral.ts   # Thesis/antithesis/synthesis
│   ├── simulated-annealing.ts  # Temperature-based exploration
│   ├── metacognitive-loop.ts   # Self-reflective reasoning
│   ├── adversarial-self-play.ts # Red/blue/judge tribunal
│   ├── hippocampal-replay.ts   # Replay + counterfactuals
│   ├── composer.ts             # Multi-strategy composition (sequential/ensemble/feedback)
│   └── router.ts               # Auto-selects strategy by query keywords
├── memory/
│   ├── types.ts                # MemoryEntry, MemoryTier, decay function
│   ├── fleeting.ts             # In-memory Map scratchpad
│   ├── short-term.ts           # Sliding window with compression
│   ├── long-term.ts            # Persistent JSON store with pruning
│   ├── hebbian.ts              # Associative network (bidirectional strength links)
│   └── manager.ts              # Coordinates all memory tiers + consolidation
├── trace/
│   ├── types.ts                # ReasoningStep, ReasoningTrace interfaces
│   └── dag.ts                  # DAG construction, traversal, and cross-strategy merging
├── benchmarks/
│   ├── problems.ts             # Internal benchmark problems (9)
│   ├── scorer.ts               # Multi-dimensional scoring
│   ├── runner.ts               # Internal benchmark runner
│   ├── public-problems.ts      # Public benchmark problems (20: GSM8K, ARC, LogiQA, Code)
│   ├── public-runner.ts        # LLM comparison runner (requires API key)
│   ├── offline-runner.ts       # Offline comparison runner (no API key)
│   └── run-public.ts           # CLI entry point for public benchmarks
└── utils/
    ├── id.ts                   # UUID generation (crypto.randomUUID)
    ├── similarity.ts           # Jaccard and cosine similarity (bag-of-words)
    └── anthropic.ts            # Shared Anthropic Messages API caller
```

## Benchmarks

### Internal Benchmarks (9 problems)

Tests reasoning strategies on multi-step reasoning, debugging, and architecture problems. Measures depth, convergence, correctness, completeness, and efficiency vs a flat baseline.

**Average improvement: +47.4% overall** across all metrics.

### Public Benchmarks (20 problems)

Problems drawn from established benchmarks:

| Source | Category | Problems |
|--------|----------|----------|
| GSM8K | Multi-step math | 5 |
| ARC-Challenge | Science reasoning | 5 |
| LogiQA | Logical deduction | 5 |
| CodeReasoning | Code output prediction | 5 |

**Offline mode**: Compares a naive rule-based solver with and without strategy augmentation.

**Online mode**: Compares vanilla Claude responses against strategy-augmented Claude responses (requires `ANTHROPIC_API_KEY`).

### Leaderboard Benchmarking

Use the proxy server with [`lm-evaluation-harness`](https://github.com/EleutherAI/lm-evaluation-harness) to run standard eval suites:

```bash
# Start the proxy
ANTHROPIC_API_KEY=sk-ant-... npm run proxy

# In another terminal, run evals
lm_eval --model local-chat-completions \
  --model_args model=reasoning-memory,base_url=http://localhost:3000/v1 \
  --tasks gsm8k,arc_challenge,mmlu
```

## MCP Configuration

Add to your Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "reasoning-memory": {
      "command": "node",
      "args": ["/path/to/reasoning-memory/dist/index.js"]
    }
  }
}
```

## Zero Dependencies

Only `@modelcontextprotocol/sdk` for MCP protocol. Everything else uses Node.js stdlib:
- IDs: `crypto.randomUUID()`
- File I/O: `fs/promises`
- Similarity: custom Jaccard/cosine (tokenize on whitespace)
- JSON storage: `JSON.stringify/parse`
- HTTP: `http` (proxy server), `https` (Anthropic API calls)

## Architecture

### Reasoning Engine (Template Method Pattern)

All six strategies extend the abstract `ReasoningEngine` base class, which implements the [Template Method](https://refactoring.guru/design-patterns/template-method) pattern:

```
reason(input)
  ├── initialize(input)        # Strategy-specific setup
  ├── iterate(input, i)        # Core reasoning loop (up to maxIterations)
  │     └── returns false to stop early (convergence)
  └── synthesize(input)        # Produce final answer from accumulated trace
```

Each strategy fills in `initialize`, `iterate`, and `synthesize` with its own logic while the base class manages the DAG lifecycle and iteration control.

### Reasoning Trace (DAG)

Each reasoning session produces a directed acyclic graph of `ReasoningStep` nodes:

```
ReasoningStep {
  id, type, content, parentId, childrenIds, score, metadata, timestamp
}
```

Steps link to parents/children forming a tree of reasoning from problem statement to conclusion. The `ReasoningTrace` captures the strategy name, all steps, final output, total step count, and convergence score (0-1).

The DAG supports **cross-strategy merging** via `mergeFrom()`: when composing strategies, each subsequent strategy's trace is grafted onto the leaves of the prior trace, creating a unified reasoning graph that spans multiple approaches.

### Strategy Router

The router maps query keywords to strategies using signal patterns:

| Keywords | Strategy |
|----------|----------|
| build, implement, create, design, feature | FractalRecursion |
| choose, compare, tradeoff, versus, decide | DialecticalSpiral |
| bug, error, failing, debug, fix, crash | SimulatedAnnealing |
| not working, stuck, confused, help | MetaCognitiveLoop |
| review, secure, vulnerability, attack, audit | AdversarialSelfPlay |
| why did, what if, last time, learned, mistake | HippocampalReplay |

Multi-word keywords score 2 points (vs 1 for single words). Falls back to FractalRecursion when no keywords match.

### Memory Consolidation

End-of-session consolidation:
1. Short-term memories with high access count or importance get promoted to long-term
2. Hebbian network decays all association strengths
3. Long-term memories below relevance threshold get pruned
4. Fleeting memory is cleared
5. Long-term store is persisted to disk

## License

MIT
