import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { toWebRequest, writeWebResponse } from './node-adapter.js';

interface FakeRequestInit {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  body?: string;
}

/**
 * Minimal stand-in for an `IncomingMessage`: a real Readable so
 * `Readable.toWeb()` works, plus the three properties the adapter reads.
 */
function fakeRequest(init: FakeRequestInit = {}): IncomingMessage {
  const stream = Readable.from(init.body === undefined ? [] : [Buffer.from(init.body)]);
  Object.assign(stream, {
    method: init.method ?? 'POST',
    url: init.url ?? '/api/mcp?x=1',
    headers: init.headers ?? {},
  });
  return stream as unknown as IncomingMessage;
}

interface CapturedResponse {
  res: ServerResponse;
  status?: number;
  headers: Record<string, string>;
  body: string;
}

function fakeResponse(): CapturedResponse {
  const captured: CapturedResponse = {
    headers: {},
    body: '',
    res: undefined as unknown as ServerResponse,
  };
  captured.res = {
    set statusCode(value: number) {
      captured.status = value;
    },
    get statusCode() {
      return captured.status ?? 200;
    },
    setHeader(key: string, value: string) {
      captured.headers[key.toLowerCase()] = value;
    },
    end(chunk?: Buffer | string) {
      captured.body = chunk === undefined ? '' : chunk.toString();
    },
  } as unknown as ServerResponse;
  return captured;
}

describe('node http adapter', () => {
  it('resolves the request URL against the provided base', () => {
    const request = toWebRequest(fakeRequest({ url: '/api/mcp?a=1' }), 'http://localhost:8787');

    expect(request.url).toBe('http://localhost:8787/api/mcp?a=1');
    expect(request.method).toBe('POST');
  });

  it('folds repeated header values instead of dropping them', () => {
    const request = toWebRequest(
      fakeRequest({ headers: { accept: ['application/json', 'text/event-stream'], host: 'x' } }),
      'http://localhost',
    );

    expect(request.headers.get('accept')).toBe('application/json, text/event-stream');
    expect(request.headers.get('host')).toBe('x');
  });

  it('streams a POST body and marks it duplex half', () => {
    const request = toWebRequest(fakeRequest({ body: '{"jsonrpc":"2.0"}' }), 'http://localhost');

    expect(request.body).not.toBeNull();
    expect(request.headers.get('content-type')).toBeNull();
  });

  it('omits the body for GET and HEAD so no duplex flag is needed', () => {
    for (const method of ['GET', 'HEAD']) {
      const request = toWebRequest(fakeRequest({ method }), 'http://localhost');

      expect(request.method).toBe(method);
      expect(request.body).toBeNull();
    }
  });

  it('writes status, headers, and body back to the node response', async () => {
    const captured = fakeResponse();
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST, OPTIONS' },
    });

    await writeWebResponse(response, captured.res);

    expect(captured.status).toBe(405);
    expect(captured.headers['content-type']).toBe('application/json');
    expect(captured.headers['allow']).toBe('POST, OPTIONS');
    expect(JSON.parse(captured.body)).toEqual({ ok: true });
  });

  it('ends the response without a body when the response has none', async () => {
    const captured = fakeResponse();
    await writeWebResponse(new Response(null, { status: 204 }), captured.res);

    expect(captured.status).toBe(204);
    expect(captured.body).toBe('');
  });

  it('round-trips a request through the adapter into a real JSON body', async () => {
    const payload = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
    const request = toWebRequest(
      fakeRequest({ body: JSON.stringify(payload) }),
      'http://localhost',
    );

    await expect(request.json()).resolves.toEqual(payload);
  });
});
