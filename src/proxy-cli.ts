#!/usr/bin/env node
/**
 * CLI entry point for the reasoning-memory proxy server.
 *
 * Starts the OpenAI-compatible proxy and prints a helpful startup banner.
 */

import { startProxyServer, ProxyConfig } from './proxy-server';
import { PresetName } from './strategies/composer';

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 7) + '...' + key.substring(key.length - 4);
}

function getMode(config: ProxyConfig): string {
  if (config.composePreset) return `preset: ${config.composePreset}`;
  if (config.composeMode) return `compose: ${config.composeMode}`;
  if (config.strategy) return `strategy: ${config.strategy}`;
  return 'auto-select';
}

async function main(): Promise<void> {
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const strategy = process.env.STRATEGY;
  const composePreset = process.env.COMPOSE_PRESET as PresetName | undefined;
  const composeMode = process.env.COMPOSE_MODE as 'sequential' | 'ensemble' | 'feedback' | undefined;

  const config: ProxyConfig = {
    port,
    strategy,
    composePreset,
    composeMode,
    apiKey,
  };

  const server = await startProxyServer(config);

  const mode = getMode(config);
  const keyDisplay = apiKey ? maskKey(apiKey) : '(none — passthrough mode)';

  console.log(`
Reasoning-Memory Proxy Server
  Listening:  http://localhost:${port}
  Mode:       ${mode}
  API key:    ${keyDisplay}

Usage with lm-eval:
  lm_eval --model local-chat-completions \\
    --model_args model=reasoning-memory,base_url=http://localhost:${port}/v1 \\
    --tasks gsm8k,arc_challenge

Usage with curl:
  curl -X POST http://localhost:${port}/v1/chat/completions \\
    -H "Content-Type: application/json" \\
    -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}'
`);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('Failed to start proxy server:', err);
  process.exit(1);
});
