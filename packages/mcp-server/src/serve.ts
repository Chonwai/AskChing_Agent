import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

import { createAskChingHttpHandler, describeAskChingServer } from "./http.js";

const port = Number(process.env.PORT ?? 8787);
const endpoint = "/api/mcp";
const handler = createAskChingHttpHandler();

function toRequest(req: IncomingMessage, base: string): Request {
  const url = new URL(req.url ?? "/", base);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init: RequestInit = { method: req.method ?? "GET", headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req) as ReadableStream;
    // Required by Node when a request body is a stream.
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }
  return new Request(url, init);
}

async function writeResponse(response: Response, res: ServerResponse) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } else {
    res.end();
  }
}

const server = createServer((req, res) => {
  const base = `http://${req.headers.host ?? `localhost:${port}`}`;
  const path = new URL(req.url ?? "/", base).pathname;

  void (async () => {
    try {
      if (path === "/health") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(describeAskChingServer(process.env, endpoint)));
        return;
      }
      if (path !== endpoint) {
        res.statusCode = 404;
        res.end("Not found. MCP endpoint is " + endpoint);
        return;
      }
      await writeResponse(await handler(toRequest(req, base)), res);
    } catch (error) {
      res.statusCode = 500;
      res.end((error as Error).message);
    }
  })();
});

server.listen(port, () => {
  const info = describeAskChingServer(process.env, endpoint);
  console.error(
    `askching-mcp http listening on http://localhost:${port}${endpoint} (live=${info.live})`
  );
});
