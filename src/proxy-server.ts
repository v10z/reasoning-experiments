/**
 * OpenAI-compatible HTTP proxy server for the reasoning-memory framework.
 *
 * Receives OpenAI-format chat completion requests, runs the reasoning
 * framework to build a trace, optionally calls the Anthropic API with
 * the trace-augmented prompt, and returns an OpenAI-format response.
 *
 * Zero external dependencies — uses only Node.js built-in `http` module.
 */

import * as http from 'http';
import { StrategyRouter } from './strategies/router';
import { callClaude } from './utils/anthropic';
import { PresetName } from './strategies/composer';

// ── Types ────────────────────────────────────────────────────────────

/** A single message in an OpenAI chat completion request. */
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI-format chat completion request body. */
export interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

/** OpenAI-format chat completion response. */
export interface OpenAIChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: 'stop';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Proxy server configuration.
 * All fields except `port` are optional and map to environment variables.
 */
export interface ProxyConfig {
  /** HTTP port to listen on. */
  port: number;
  /** Force a specific reasoning strategy (overrides auto-select). */
  strategy?: string;
  /** Use a composition preset instead of a single strategy. */
  composePreset?: PresetName;
  /** Composition mode: sequential, ensemble, or feedback. */
  composeMode?: 'sequential' | 'ensemble' | 'feedback';
  /** Anthropic API key. If unset, runs in passthrough mode. */
  apiKey?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

let responseCounter = 0;

function generateId(): string {
  return `chatcmpl-rm-${Date.now()}-${++responseCounter}`;
}

function jsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown
): void {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(json);
}

function errorResponse(
  res: http.ServerResponse,
  statusCode: number,
  message: string
): void {
  jsonResponse(res, statusCode, {
    error: { message, type: 'invalid_request_error', code: statusCode },
  });
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ── Route handlers ───────────────────────────────────────────────────

function handleHealth(res: http.ServerResponse): void {
  jsonResponse(res, 200, { status: 'ok', service: 'reasoning-memory-proxy' });
}

function handleModels(res: http.ServerResponse): void {
  jsonResponse(res, 200, {
    object: 'list',
    data: [
      {
        id: 'reasoning-memory',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'reasoning-memory',
      },
    ],
  });
}

async function handleChatCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  router: StrategyRouter,
  config: ProxyConfig
): Promise<void> {
  // Parse request body
  const rawBody = await readBody(req);
  let parsed: OpenAIChatRequest;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    errorResponse(res, 400, 'Invalid JSON in request body');
    return;
  }

  if (!parsed.messages || !Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    errorResponse(res, 400, 'messages array is required and must not be empty');
    return;
  }

  // Extract the last user message as the query
  const userMessages = parsed.messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    errorResponse(res, 400, 'At least one user message is required');
    return;
  }
  const query = userMessages[userMessages.length - 1].content;

  // Run reasoning framework
  let traceText: string;
  let reasoningAnswer: string;

  if (config.composePreset || config.composeMode) {
    // For feedback mode, no preset needed (auto-selects strategies).
    // For other modes, default to 'deep-analysis' preset if none specified.
    const preset = config.composePreset ||
      (config.composeMode !== 'feedback' ? 'deep-analysis' as PresetName : undefined);
    const composeResult = await router.compose(
      { query },
      config.composeMode || 'sequential',
      undefined,
      preset
    );
    traceText = composeResult.trace.steps
      .map((s, i) => `Step ${i + 1} [${s.type}]: ${s.content}`)
      .join('\n');
    reasoningAnswer = composeResult.answer;
  } else {
    const reasoningResult = await router.reason({
      query,
      strategy: config.strategy,
    });
    traceText = reasoningResult.trace.steps
      .map((s, i) => `Step ${i + 1} [${s.type}]: ${s.content}`)
      .join('\n');
    reasoningAnswer = reasoningResult.answer;
  }

  let finalAnswer: string;

  if (config.apiKey) {
    // Full mode: call Claude with trace-augmented prompt
    const systemMessages = parsed.messages.filter((m) => m.role === 'system');
    const systemPrompt = systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join('\n')
      : undefined;

    const augmentedContent =
      `${query}\n\n## Reasoning Trace\n${traceText}\n\nBased on the reasoning trace above, provide a thorough answer.`;

    finalAnswer = await callClaude({
      messages: [{ role: 'user', content: augmentedContent }],
      systemPrompt,
      maxTokens: parsed.max_tokens || 1024,
      apiKey: config.apiKey,
    });
  } else {
    // Passthrough mode: return the reasoning framework's answer directly
    finalAnswer = reasoningAnswer;
  }

  // Build OpenAI-format response
  const response: OpenAIChatResponse = {
    id: generateId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: parsed.model || 'reasoning-memory',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: finalAnswer },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: query.length,
      completion_tokens: finalAnswer.length,
      total_tokens: query.length + finalAnswer.length,
    },
  };

  jsonResponse(res, 200, response);
}

// ── Server factory ───────────────────────────────────────────────────

/** Create the HTTP server without starting it. Useful for testing. */
export function createProxyServer(config: ProxyConfig): http.Server {
  const router = new StrategyRouter();

  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    const url = req.url || '';

    try {
      if (url === '/health' && req.method === 'GET') {
        handleHealth(res);
      } else if (url === '/v1/models' && req.method === 'GET') {
        handleModels(res);
      } else if (url === '/v1/chat/completions' && req.method === 'POST') {
        await handleChatCompletions(req, res, router, config);
      } else {
        errorResponse(res, 404, `Not found: ${req.method} ${url}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      errorResponse(res, 500, message);
    }
  });

  return server;
}

/** Create and start the proxy server, resolving once it's listening. */
export function startProxyServer(config: ProxyConfig): Promise<http.Server> {
  const server = createProxyServer(config);

  return new Promise((resolve) => {
    server.listen(config.port, () => {
      resolve(server);
    });
  });
}
