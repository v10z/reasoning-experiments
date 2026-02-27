import * as http from 'http';
import { createProxyServer, ProxyConfig } from '../src/proxy-server';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      reject(new Error('Server not listening'));
      return;
    }

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('ProxyServer', () => {
  let server: http.Server;

  function startServer(overrides?: Partial<ProxyConfig>): Promise<void> {
    const config: ProxyConfig = {
      port: 0, // random available port
      ...overrides,
    };
    server = createProxyServer(config);
    return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
  }

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  // ── Health endpoint ──────────────────────────────────────────────

  test('GET /health returns ok', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'GET', '/health');
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('reasoning-memory-proxy');
  });

  // ── Models endpoint ──────────────────────────────────────────────

  test('GET /v1/models returns model list', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'GET', '/v1/models');
    expect(status).toBe(200);
    expect(data.object).toBe('list');
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe('reasoning-memory');
    expect(data.data[0].object).toBe('model');
  });

  // ── Chat completions (passthrough mode) ──────────────────────────

  test('POST /v1/chat/completions returns reasoning trace in passthrough mode', async () => {
    await startServer(); // no apiKey = passthrough
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'What is 2+2?' }],
    });
    expect(status).toBe(200);
    expect(data.object).toBe('chat.completion');
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0].message.role).toBe('assistant');
    expect(data.choices[0].message.content).toBeTruthy();
    expect(data.choices[0].finish_reason).toBe('stop');
    expect(data.id).toMatch(/^chatcmpl-rm-/);
    expect(data.usage).toBeDefined();
    expect(data.usage.total_tokens).toBeGreaterThan(0);
  });

  test('response includes model name from request', async () => {
    await startServer();
    const { data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      model: 'custom-model',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(data.model).toBe('custom-model');
  });

  test('defaults model to reasoning-memory when not specified', async () => {
    await startServer();
    const { data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(data.model).toBe('reasoning-memory');
  });

  // ── Strategy selection ───────────────────────────────────────────

  test('STRATEGY config forces a specific strategy', async () => {
    await startServer({ strategy: 'DialecticalSpiral' });
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'Design a system' }],
    });
    expect(status).toBe(200);
    expect(data.choices[0].message.content).toBeTruthy();
  });

  // ── Preset mode ──────────────────────────────────────────────────

  test('COMPOSE_PRESET triggers composition', async () => {
    await startServer({ composePreset: 'debug-verify' });
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'Fix the bug in my code' }],
    });
    expect(status).toBe(200);
    expect(data.choices[0].message.content).toBeTruthy();
  });

  test('COMPOSE_MODE triggers composition', async () => {
    await startServer({ composeMode: 'ensemble' });
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'What is the best approach?' }],
    });
    expect(status).toBe(200);
    expect(data.choices[0].message.content).toBeTruthy();
  });

  // ── 404 for unknown routes ───────────────────────────────────────

  test('returns 404 for unknown routes', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'GET', '/v1/unknown');
    expect(status).toBe(404);
    expect(data.error).toBeDefined();
    expect(data.error.message).toContain('Not found');
  });

  test('returns 404 for wrong HTTP method', async () => {
    await startServer();
    const { status } = await makeRequest(server, 'GET', '/v1/chat/completions');
    expect(status).toBe(404);
  });

  // ── Error handling ───────────────────────────────────────────────

  test('returns 400 for malformed JSON', async () => {
    await startServer();
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No address');

    const result = await new Promise<{ status: number; data: any }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: (address as any).port,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
          });
        }
      );
      req.on('error', reject);
      req.write('not valid json{{{');
      req.end();
    });

    expect(result.status).toBe(400);
    expect(result.data.error.message).toContain('Invalid JSON');
  });

  test('returns 400 for missing messages', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {});
    expect(status).toBe(400);
    expect(data.error.message).toContain('messages');
  });

  test('returns 400 for empty messages array', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [],
    });
    expect(status).toBe(400);
    expect(data.error.message).toContain('messages');
  });

  test('returns 400 when no user messages present', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [{ role: 'system', content: 'You are helpful' }],
    });
    expect(status).toBe(400);
    expect(data.error.message).toContain('user message');
  });

  // ── CORS ─────────────────────────────────────────────────────────

  test('OPTIONS returns CORS headers', async () => {
    await startServer();
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No address');

    const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: (address as any).port,
          path: '/v1/chat/completions',
          method: 'OPTIONS',
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            resolve({ status: res.statusCode || 0, headers: res.headers });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });

    expect(result.status).toBe(204);
    expect(result.headers['access-control-allow-origin']).toBe('*');
    expect(result.headers['access-control-allow-methods']).toContain('POST');
  });

  // ── Multiple messages ────────────────────────────────────────────

  test('uses last user message as query', async () => {
    await startServer();
    const { status, data } = await makeRequest(server, 'POST', '/v1/chat/completions', {
      messages: [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Debug this error' },
      ],
    });
    expect(status).toBe(200);
    // The reasoning should have been run on "Debug this error"
    expect(data.choices[0].message.content).toBeTruthy();
  });
});
