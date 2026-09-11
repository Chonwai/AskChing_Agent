import { describeAskChingServer } from "../packages/mcp-server/dist/http.js";

/**
 * Credential-free health/metadata endpoint.
 *
 * Returns the transport, canonical endpoint, and whether the deployment runs
 * in live or fixture mode. Safe to expose publicly: it never echoes secrets.
 *
 * Uses the documented `fetch` Web Standard export (see `api/mcp.ts` for why a
 * bare `export default function` is not safe on Vercel).
 */

export const config = { runtime: "nodejs" } as const;

export default {
  fetch(): Response {
    return Response.json(describeAskChingServer(process.env, "/api/mcp"), {
      headers: { "Cache-Control": "no-store" }
    });
  }
};
