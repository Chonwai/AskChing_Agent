import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, "../dist/index.js");

const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, DEMO_LIVE: "0" }
});

const rl = createInterface({ input: child.stdout });

let nextId = 0;
const pending = new Map<number, (message: any) => void>();

function request(method: string, params: Record<string, unknown> = {}) {
  const id = ++nextId;
  const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  child.stdin.write(payload + "\n");
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => {
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    });
  });
}

rl.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message);
    pending.delete(message.id);
  }
});

const timeout = setTimeout(() => {
  console.error("mcp-smoke FAIL: timed out waiting for MCP handshake");
  child.kill();
  process.exit(1);
}, 10_000);

async function main() {
  await request("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "mcp-smoke", version: "0.1.0" }
  });

  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) +
      "\n"
  );

  const result = await request("tools/list", {});
  const tools = (result as { tools: Array<{ name: string }> }).tools;
  const names = tools.map((tool) => tool.name).sort();
  const expected = [
    "analyze_markets",
    "analyze_trends",
    "compare_markets",
    "research_brief",
    "risk_scan"
  ];

  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(
      `expected tools [${expected.join(", ")}] but got [${names.join(", ")}]`
    );
  }

  clearTimeout(timeout);
  console.log(`mcp-smoke OK: askching (${names.length} tools)`);
  child.kill();
  process.exit(0);
}

main().catch((error) => {
  clearTimeout(timeout);
  console.error("mcp-smoke FAIL:", error);
  child.kill();
  process.exit(1);
});
