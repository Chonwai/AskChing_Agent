import { createAskChingHttpHandler } from "../packages/mcp-server/dist/http.js";

/**
 * Vercel entry point for the AskChing remote MCP server.
 *
 * Vercel Node.js Functions accept the Web-standard signature
 * `(request: Request) => Response`, which is exactly what the MCP SDK's
 * Web-standard transport produces, so no adapter is needed here.
 *
 * The handler is created once per cold start and reused across warm
 * invocations. Each request still gets a fresh MCP server + transport pair
 * inside the handler (stateless mode), so no cross-request state leaks.
 *
 * Public URL: https://<deployment>.vercel.app/api/mcp
 * `vercel.json` also rewrites /mcp to this route.
 */
const handler = createAskChingHttpHandler();

export default handler;
