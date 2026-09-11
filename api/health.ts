import { describeAskChingServer } from "../packages/mcp-server/dist/http.js";

/**
 * Credential-free health/metadata endpoint.
 *
 * Returns the transport, canonical endpoint, and whether the deployment runs
 * in live or fixture mode. Safe to expose publicly: it never echoes secrets.
 */
export default function handler(): Response {
  return Response.json(describeAskChingServer(process.env, "/api/mcp"), {
    headers: { "Cache-Control": "no-store" }
  });
}
