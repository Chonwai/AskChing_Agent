import { describe, expect, it } from "vitest";

import { createAskChingHttpHandler, describeAskChingServer } from "./http.js";
import { ASKCHING_TOOL_NAMES } from "./register.js";

const ACCEPT = "application/json, text/event-stream";

function createHandler() {
  return createAskChingHttpHandler({ environment: { DEMO_LIVE: "0" } });
}

async function rpc(
  handler: (request: Request) => Promise<Response>,
  payload: unknown,
  init: RequestInit = {}
): Promise<{ response: Response; body: any }> {
  const response = await handler(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: ACCEPT },
      body: JSON.stringify(payload),
      ...init
    })
  );
  const text = await response.text();
  return { response, body: text.length > 0 ? JSON.parse(text) : undefined };
}

describe("remote MCP transport (streamable HTTP)", () => {
  it("completes the MCP handshake and identifies itself", async () => {
    const { response, body } = await rpc(createHandler(), {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "http-test", version: "0.1.0" }
      }
    });

    expect(response.status).toBe(200);
    expect(body.result.serverInfo.name).toBe("askching");
    expect(body.result.protocolVersion).toBeTruthy();
  });

  it("exposes the same tool surface as the stdio server", async () => {
    const { response, body } = await rpc(createHandler(), {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    });

    expect(response.status).toBe(200);
    const names = (body.result.tools as Array<{ name: string }>).map((tool) => tool.name).sort();
    expect(names).toEqual([...ASKCHING_TOOL_NAMES].sort());
    expect(names).toHaveLength(5);
  });

  it("is stateless: no session id is issued between requests", async () => {
    const handler = createHandler();
    const first = await rpc(handler, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "http-test", version: "0.1.0" }
      }
    });

    expect(first.response.headers.get("mcp-session-id")).toBeNull();

    // A later call on a brand-new request still works without a session.
    const second = await rpc(handler, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    });
    expect(second.response.status).toBe(200);
  });

  it("executes a research tool and returns cited structured content", async () => {
    const { response, body } = await rpc(createHandler(), {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "analyze_trends",
        arguments: {
          metric: "supply_apy",
          asset: "USDC",
          protocols: ["aave-v3", "compound-v3", "spark-lend"],
          window: "7d"
        }
      }
    });

    expect(response.status).toBe(200);
    const structured = body.result.structuredContent;
    expect(structured.window).toBe("7d");
    expect(structured.findings.length).toBeGreaterThanOrEqual(2);
    for (const finding of structured.findings) {
      expect(finding.citations.length).toBeGreaterThanOrEqual(2);
      expect(finding.points.length).toBeGreaterThanOrEqual(2);
      expect(finding.caveats.join(" ")).toContain("not a forecast");
    }
  });

  it("keeps evidence enforcement on the remote surface", async () => {
    const { body } = await rpc(createHandler(), {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "compare_markets",
        arguments: { metric: "supply_apy", asset: "USDC", protocols: ["aave-v3"] }
      }
    });

    // Fewer than two protocols must fail closed rather than return a partial row set.
    const serialized = JSON.stringify(body);
    expect(body.error !== undefined || body.result?.isError === true).toBe(true);
    expect(serialized).not.toContain('"rows"');
  });

  it("answers CORS preflight so browser-based clients can connect", async () => {
    const response = await createHandler()(
      new Request("http://localhost/api/mcp", { method: "OPTIONS" })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("rejects methods it cannot serve with 405 instead of an empty 200", async () => {
    // GET would otherwise open a standalone SSE stream (a 200 with an empty
    // body once the stateless transport closes) and DELETE is meaningless
    // without sessions. Both must be refused explicitly.
    for (const method of ["GET", "DELETE", "PUT"]) {
      const response = await createHandler()(
        new Request("http://localhost/api/mcp", {
          method,
          headers: { Accept: ACCEPT }
        })
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST, OPTIONS");
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      await expect(response.json()).resolves.toMatchObject({
        error: { code: -32000 }
      });
    }
  });

  it("does not advertise or issue a session id, and narrows CORS methods", async () => {
    const response = await createHandler()(
      new Request("http://localhost/api/mcp", { method: "OPTIONS" })
    );

    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(response.headers.get("access-control-expose-headers")).toBeNull();
  });
});

describe("server metadata", () => {
  it("reports transport and live mode without leaking credentials", () => {
    const info = describeAskChingServer({ DEMO_LIVE: "1", GRAPH_API_KEY: "secret" }, "/api/mcp");

    expect(info).toEqual({
      name: "askching",
      version: "0.1.0",
      transport: "streamable-http",
      endpoint: "/api/mcp",
      live: true
    });
    expect(JSON.stringify(info)).not.toContain("secret");
  });
});
