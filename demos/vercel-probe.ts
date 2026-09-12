/**
 * Pre-deployment probe for the Vercel entry points.
 *
 * Loads the real serverless files (`api/mcp.ts`, `api/health.ts`) in-process
 * and drives the MCP handshake over real Web `Request`/`Response` objects.
 *
 * Verified here: the handler signature and logic, which matter because Vercel
 * invokes these files with the same Web-standard signature.
 * NOT verified here: the deployment target's module resolution and bundling.
 * This runs through tsx, which remaps `.js` to `.ts` and resolves workspace
 * symlinks; Vercel builds a bundle instead. Treat `/api/health` and
 * `tools/list` against the deployed URL as the authoritative post-deploy check.
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

/**
 * Assert a module uses Vercel's documented `fetch` Web Standard export.
 *
 * A bare `export default function` is NOT that shape, and Vercel would then
 * treat the file as a Node.js `(req, res)` handler that never calls `res.end()`.
 * Checking it here keeps the failure local and obvious instead of showing up as
 * a hung request in production.
 */
function requireFetchExport(module: unknown, label: string): (request: Request) => Promise<Response> {
  const exported = (module as { default?: unknown }).default;
  if (typeof exported !== "object" || exported === null) {
    throw new Error(
      `${label} must default-export an object with a fetch method; got ${typeof exported}. ` +
        "Vercel only recognises `export default { fetch(request) { ... } }`."
    );
  }
  const fetchFn = (exported as { fetch?: unknown }).fetch;
  if (typeof fetchFn !== "function") {
    throw new Error(`${label} default export has no fetch method`);
  }
  return fetchFn as (request: Request) => Promise<Response>;
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

  const handler = requireFetchExport(mcpModule, "api/mcp.ts");
  requireFetchExport(healthModule, "api/health.ts");
  console.log("export shape        OK  api/mcp.ts + api/health.ts use export default { fetch }");

  // The MCP function must declare the Node.js runtime, and its max duration
  // must not exceed what `vercel.json` gives it.
  const mcpConfig = (mcpModule as { config?: { runtime?: string; maxDuration?: number } }).config;
  if (mcpConfig?.runtime !== "nodejs") {
    throw new Error(`api/mcp.ts config.runtime must be 'nodejs', got ${String(mcpConfig?.runtime)}`);
  }
  const vercelJson = JSON.parse(
    await (await import("node:fs/promises")).readFile(
      new URL("../vercel.json", import.meta.url),
      "utf8"
    )
  ) as { functions?: Record<string, { maxDuration?: number }>; outputDirectory?: string };
  const declaredMax = Object.values(vercelJson.functions ?? {})[0]?.maxDuration;
  if (declaredMax !== undefined && (mcpConfig?.maxDuration ?? 0) > declaredMax) {
    throw new Error(
      `api/mcp.ts maxDuration (${String(mcpConfig?.maxDuration)}) exceeds vercel.json (${declaredMax})`
    );
  }
  console.log(`config              OK  runtime=nodejs maxDuration=${String(mcpConfig?.maxDuration)}`);

  // The "Other" framework preset sets the output directory to `public` if it
  // exists, otherwise to the repository root. Without a public/ directory the
  // whole repo would be served as static files, so assert both the setting and
  // the directory.
  const fs = await import("node:fs/promises");
  if (vercelJson.outputDirectory !== "public") {
    throw new Error("vercel.json must set outputDirectory to 'public'");
  }
  const publicIndex = await fs
    .stat(new URL("../public/index.html", import.meta.url))
    .then(() => true)
    .catch(() => false);
  if (!publicIndex) {
    throw new Error("public/index.html must exist so the output directory never falls back to the repo root");
  }
  console.log("output directory    OK  vercel.json -> public/, public/index.html present");

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
  if (names.length !== 6) {
    throw new Error(`expected 6 tools but got [${names.join(", ")}]`);
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

  const info = (await (healthModule as { default: { fetch: () => Response } }).default.fetch().json()) as Record<
    string,
    unknown
  >;
  console.log(`health              OK  ${JSON.stringify(info)}`);

  console.log("\nvercel-probe OK: api/mcp.ts and api/health.ts are deployable");
}

main().catch((error) => {
  console.error(`vercel-probe FAIL: ${(error as Error).message}`);
  process.exit(1);
});
