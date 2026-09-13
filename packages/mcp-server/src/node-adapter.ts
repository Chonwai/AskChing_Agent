import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

/**
 * Adapter between Node's `IncomingMessage`/`ServerResponse` and the Web
 * `Request`/`Response` pair that `createAskChingHttpHandler()` speaks.
 *
 * This is the only Node-specific code in the remote path, so it is isolated
 * here and unit tested: header folding, stream bodies, and the `duplex` flag
 * are easy to get subtly wrong and are invisible to tests that construct a
 * `Request` directly.
 */

/** Build a Web `Request` from a Node request, resolving relative URLs against `base`. */
export function toWebRequest(req: IncomingMessage, base: string): Request {
  const url = new URL(req.url ?? '/', base);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init: RequestInit = { method: req.method ?? 'GET', headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream;
    // Node requires an explicit duplex mode when the body is a stream.
    (init as RequestInit & { duplex: 'half' }).duplex = 'half';
  }
  return new Request(url, init);
}

/** Write a Web `Response` back to a Node response. */
export async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    res.end(Buffer.from(await response.arrayBuffer()));
  } else {
    res.end();
  }
}
