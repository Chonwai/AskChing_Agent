import { createAskChingHttpHandler } from "../packages/mcp-server/dist/http.js";

/**
 * Vercel entry point for the AskChing remote MCP server.
 *
 * Vercel requires the documented **`fetch` Web Standard export** for files in
 * `/api` when no framework is detected:
 *
 * ```ts
 * export default { fetch(request: Request) { return new Response(...) } }
 * ```
 *
 * A bare `export default handler` (i.e. a plain `(request) => Response`
 * function) is NOT that shape. Vercel would fall back to treating the file as
 * a Node.js `(req, res)` handler, which calls `res.end()`; our handler only
 * *returns* a `Response`, so the request would hang until the function times
 * out. This wrapper is what makes the file unambiguous.
 *
 * The handler is created once per cold start and reused across warm
 * invocations. Each request still gets a fresh MCP server + transport pair
 * inside the handler (stateless mode), so no cross-request state leaks.
 *
 * Public URL: https://<deployment>.vercel.app/api/mcp
 * `vercel.json` also rewrites /mcp to this route.
 */

/** Node.js runtime with the max duration matching `vercel.json`. */
export const config = { runtime: "nodejs", maxDuration: 60 } as const;

const handler = createAskChingHttpHandler();

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request);
  }
};
