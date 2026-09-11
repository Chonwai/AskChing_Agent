/**
 * Pre-deployment probe for the Vercel entry points.
 *
 * Loads the real serverless files (`api/mcp.ts`, `api/health.ts`) in-process
 * and drives the MCP handshake over real Web `Request`/`Response` objects.
 * If this passes locally, the deployed function behaves the same way, because
 * Vercel uses the same Web-standard signature.
 *
 * Run: pnpm vercel:probe
 */

const ACCEPT = "application/json, text/event-stream";

interface JsonRpcResponse {
  result?: {
    serverInfo?: { name?: string };
    tools?: Array<{ name: string }>;
    structuredContent?: { findings?: unknown[]; gaps?: unknown[]; summary?: string };
  };
  error?: unknown;
}

async function callMcp(
  handler: (request: Request) => Promise<Response>,
  payload: unknown
): Promise<{ status: number; body: JsonRpcResponse }> {
  const response = await handler(
    new Request("http://probe.local/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: ACCEPT },
      body: JSON.stringify(payload)
    })
  );
  const text = await response.text();
  return { status: response.status, body: text.length > 0 ? (JSON.parse(text) as JsonRpcResponse) : {} };
}

async function main() {
  const mcpModule = await import("../api/mcp.js");
  const healthModule = await import("../api/health.js");
  const handler = mcpModule.default;

  const initialized = await callMcp(handler, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "vercel-probe", version: "0.1.0" }
    }
  });
  const serverName = initialized.body.result?.serverInfo?.name;
  if (initialized.status !== 200 || serverName !== "askching") {
    throw new Error(`initialize failed: HTTP ${initialized.status} ${JSON.stringify(initialized.body)}`);
  }
  console.log(`initialize          OK  serverInfo.name=${serverName}`);

  const listed = await callMcp(handler, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const names = (listed.body.result?.tools ?? []).map((tool) => tool.name).sort();
  if (names.length !== 5) {
    throw new Error(`expected 5 tools but got [${names.join(", ")}]`);
  }
  console.log(`tools/list          OK  ${names.join(", ")}`);

  const analysis = await callMcp(handler, {
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
  const findings = analysis.body.result?.structuredContent?.findings ?? [];
  if (findings.length < 2) {
    throw new Error(`analyze_trends returned ${findings.length} findings`);
  }
  console.log(`tools/call          OK  analyze_trends -> ${findings.length} cited findings`);

  const health = healthModule.default();
  const info = (await health.json()) as Record<string, unknown>;
  console.log(`health              OK  ${JSON.stringify(info)}`);

  console.log("\nvercel-probe OK: api/mcp.ts and api/health.ts are deployable");
}

main().catch((error) => {
  console.error(`vercel-probe FAIL: ${(error as Error).message}`);
  process.exit(1);
});
