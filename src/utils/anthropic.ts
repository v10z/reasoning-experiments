/**
 * Shared Anthropic API caller using Node.js built-in https module (zero deps).
 */

import { request } from 'https';

/** A message in the Anthropic Messages API format. */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Options for {@link callClaude}. */
export interface CallClaudeOptions {
  /** Conversation messages to send. */
  messages: AnthropicMessage[];
  /** System prompt (maps to Anthropic's `system` field). */
  systemPrompt?: string;
  /** Model ID (default: `claude-opus-4-6`). */
  model?: string;
  /** Maximum response tokens (default: 1024). */
  maxTokens?: number;
  /** API key. Falls back to `ANTHROPIC_API_KEY` env var if unset. */
  apiKey?: string;
}

/**
 * Call the Anthropic Messages API and return the text response.
 * Uses Node.js built-in `https` module — no external HTTP libraries.
 * @throws {Error} If no API key is available or the API returns an error.
 */
export async function callClaude(options: CallClaudeOptions): Promise<string> {
  const {
    messages,
    systemPrompt,
    model = 'claude-opus-4-6',
    maxTokens = 1024,
    apiKey = process.env.ANTHROPIC_API_KEY,
  } = options;

  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable required');

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system: systemPrompt || '',
    messages,
  });

  return new Promise<string>((resolve, reject) => {
    const req = request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(parsed.error.message));
              return;
            }
            const text = parsed.content?.[0]?.text || '';
            resolve(text);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data.substring(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
