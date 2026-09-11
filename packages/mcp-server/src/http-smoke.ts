import { createServer } from "node:http";

import { ASKCHING_TOOL_NAMES } from "./register.js";
import { createAskChingHttpHandler, describeAskChingServer } from "./http.js";
import { toWebRequest, writeWebResponse } from "./node-adapter.js";

/**
 * End-to-end smoke test for the remote (Streamable HTTP) transport.
 *
 * Boots the real handler on an ephemeral port, then drives the MCP handshake
 * over HTTP: initialize -> notifications/initialized -> tools/list ->
 * tools/call. Proves the remote server is usable by any remote MCP client.
 */

const handler = createAskChingHttpHandler({ environment: { DEMO_LIVE: "0" } });

const server = createServer((req, res) => {
  const base = `http://${req.headers.host ?? "localhost"}`;
  void (async () => {
    try {
      await writeWebResponse(await handler(toWebRequest(req, base)), res);
    } catch (error) {
      res.statusCode = 500;
      res.end((error as Error).message);
    }
  })();
});

const ACCEPT = "application/json, text/event-stream";

function parseJsonRpc(body: string): unknown {
  const trimmed = body.trim();
  // Streamable HTTP may answer with an SSE frame; take the last data line.
  if (trimmed.startsWith("event:") || trimmed.startsWith("data:")) {
    const dataLines = trimmed
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());
    return JSON.parse(dataLines[dataLines.length - 1]!);
  }
  return JSON.parse(trimmed);
}

async function call(url: string, payload: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: ACCEPT },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  return { status: response.status, body: text.length > 0 ? parseJsonRpc(text) : undefined };
}

async function main() {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("could not determine smoke server port");
  }
  const url = `http://127.0.0.1:${address.port}/api/mcp`;

  const initialized = await call(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mcp-http-smoke", version: "0.1.0" }
    }
  });
  if (initialized.status !== 200) {
    throw new Error(`initialize failed with HTTP ${initialized.status}`);
  }
  const serverInfo = (initialized.body as { result?: { serverInfo?: { name?: string } } })
    .result?.serverInfo;
  if (serverInfo?.name !== "askching") {
    throw new Error(`unexpected serverInfo: ${JSON.stringify(serverInfo)}`);
  }

  // Stateless transport: no session id is issued, so nothing to echo back.
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: ACCEPT },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
  });

  const listed = await call(url, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const tools = ((listed.body as { result?: { tools?: Array<{ name: string }> } }).result?.tools ?? [])
    .map((tool) => tool.name)
    .sort();
  const expected = [...ASKCHING_TOOL_NAMES].sort();
  if (JSON.stringify(tools) !== JSON.stringify(expected)) {
    throw new Error(
      `expected tools [${expected.join(", ")}] but got [${tools.join(", ")}]`
    );
  }

  const called = await call(url, {
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
  const structured = (
    called.body as {
      result?: { structuredContent?: { findings?: unknown[]; gaps?: unknown[] } };
    }
  ).result?.structuredContent;
  if (!structured || (structured.findings?.length ?? 0) < 2) {
    throw new Error(`tools/call analyze_trends returned no findings: ${JSON.stringify(called.body)}`);
  }

  const info = describeAskChingServer({ DEMO_LIVE: "0" }, "/api/mcp");
  console.log(
    `mcp-http-smoke OK: askching (${tools.length} tools, transport=${info.transport}, findings=${structured.findings!.length})`
  );
}

main()
  .then(() => {
    server.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error(`mcp-http-smoke FAIL: ${(error as Error).message}`);
    server.close();
    process.exit(1);
  });
