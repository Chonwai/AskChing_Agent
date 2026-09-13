import { describe, expect, it, vi } from 'vitest';

import { OpenAIChatCompletionClient } from './client.js';

describe('OpenAIChatCompletionClient', () => {
  it('posts an OpenAI-compatible tool completion request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Cited answer',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const client = new OpenAIChatCompletionClient({
      baseUrl: 'https://example.test/v1/',
      model: 'grok-test',
      apiKey: 'secret',
      fetch,
    });

    const message = await client.complete({
      messages: [{ role: 'user', content: 'Compare markets' }],
      tools: [],
      toolChoice: 'auto',
    });

    expect(message.content).toBe('Cited answer');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer secret',
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'grok-test',
      tool_choice: 'auto',
    });
  });

  it('reports the provider response when a completion fails', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('model unavailable', { status: 503 }));
    const client = new OpenAIChatCompletionClient({
      baseUrl: 'http://localhost:11434/v1',
      model: 'local-model',
      fetch,
    });

    await expect(client.complete({ messages: [], tools: [], toolChoice: 'auto' })).rejects.toThrow(
      '503: model unavailable',
    );
  });
});
