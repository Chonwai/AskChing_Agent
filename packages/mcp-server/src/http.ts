import { createMarketDataSource, type AskChingEnvironment } from "@askching/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { registerAskChingTools } from "./register.js";
import { logEvent } from "./observability.js";

const SERVER_NAME = "askching";
const SERVER_VERSION = "0.1.0";

export interface HttpHandlerOptions {
  /**
   * Environment used to build the data source. Defaults to `process.env`, so on
   * a host such as Vercel the platform's environment variables (DEMO_LIVE,
   * GRAPH_API_KEY) are picked up without extra wiring.
   */
  environment?: AskChingEnvironment;
  /** Allowed CORS origin. Defaults to `*` because MCP clients are not browsers. */
  corsOrigin?: string;
}

// This server is stateless and answers with JSON, so POST is the only method
// that can do useful work. GET (standalone SSE stream) and DELETE (session
// termination) are deliberately not offered.
const CORS_METHODS = "POST, OPTIONS";
const ALLOWED_METHODS = "POST, OPTIONS";
const CORS_HEADERS =
  "Content-Type, Accept, Mcp-Protocol-Version, Authorization";

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Access-Control-Max-Age": "86400"
  };
}

/**
 * Create a Web-standard MCP request handler.
 *
 * Returns a `(Request) => Promise<Response>` function, so the same code mounts
 * on Vercel Functions, Cloudflare Workers, Deno, Bun, Hono, Next.js route
 * handlers, or a local `node:http` server (see `serve.ts`).
 *
 * The transport runs **stateless** (`sessionIdGenerator: undefined`): every
 * request gets a fresh server and transport pair. That is what makes the server
 * safe on serverless platforms, where no process is guaranteed to survive
 * between calls.
 */
export function createAskChingHttpHandler(
  options: HttpHandlerOptions = {}
): (request: Request) => Promise<Response> {
  const origin = options.corsOrigin ?? "*";

  return async function handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Only POST is supported. Without this guard the SDK would answer GET with a
    // 200 and an open (then immediately closed) standalone SSE stream, and
    // DELETE with an empty 200 - both meaningless for a stateless, JSON-only
    // server. A 405 is the honest answer.
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: `Method ${request.method} is not supported; use POST.`
          }
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            Allow: ALLOWED_METHODS,
            ...corsHeaders(origin)
          }
        }
      );
    }

    // Request-level observability: log start, wrap response to log end + timing.
    const requestId = crypto.randomUUID();
    const requestStart = Date.now();
    const path = new URL(request.url).pathname;
    logEvent({ type: "request_start", requestId, method: "POST", path });

    const dataSource = createMarketDataSource(
      options.environment ?? (process.env as AskChingEnvironment)
    );
    const server = new McpServer({
      name: SERVER_NAME,
      version: SERVER_VERSION
    });
    registerAskChingTools(server, dataSource, { requestId });

    const transport = new WebStandardStreamableHTTPServerTransport({
      // Stateless: no session id, so no cross-request affinity is required.
      sessionIdGenerator: undefined,
      // JSON responses keep the serverless path simple and client-portable.
      enableJsonResponse: true
    });

    try {
      // connect() lives inside the try so a future SDK change that makes it
      // throw still releases the server.
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      const durationMs = Date.now() - requestStart;
      logEvent({ type: "request_end", requestId, status: response.status, durationMs });
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(origin))) {
        headers.set(key, value);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } finally {
      // The transport is single-use in stateless mode; release it once the
      // response has been produced so repeat calls start from a clean server.
      await server.close().catch(() => undefined);
    }
  };
}

/** A short, credential-free description of the server for humans and smoke tests. */
export interface AskChingServerInfo {
  name: string;
  version: string;
  transport: "streamable-http";
  endpoint: string;
  live: boolean;
}

export function describeAskChingServer(
  environment: AskChingEnvironment = process.env as AskChingEnvironment,
  endpoint = "/api/mcp"
): AskChingServerInfo {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    transport: "streamable-http",
    endpoint,
    live: environment.DEMO_LIVE === "1"
  };
}
