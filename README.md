# AskChing

AskChing is a Grok-orchestrated research MCP for ETHOnline 2026. It fans out across live The Graph subgraphs, normalizes comparable market metrics, and returns analysis with source citations and an explicit as-of time.

## Status

The repository was built from scratch for ETHOnline 2026. Its three MCP research tools and Grok tool-calling CLI work in deterministic fixture mode and credential-gated live mode.

## Workspace

- `packages/shared`: schemas, normalization, citations, fixtures, and The Graph client
- `packages/mcp-server`: AskChing MCP tools over stdio
- `packages/grok-orchestrator`: Grok tool-calling demo CLI
- `evals`: fixed behavioral checks
- `skills/askching`: thin tool-usage playbook

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm test
pnpm eval
```

Node.js 20 or newer is required. Fixture mode is the default; set `DEMO_LIVE=1` and provide `GRAPH_API_KEY` for live Graph gateway requests.

## Ask Grok

After building, add `XAI_API_KEY` to `.env` and run:

```bash
pnpm askching -- "Compare USDC supply APY across Aave, Compound, and Spark"
```

The CLI sends the natural-language request to Grok, executes any requested AskChing tools in process, and returns Grok's synthesis of the cited tool result. For a local OpenAI-compatible model, set `ASKCHING_LLM_BASE_URL` and `ASKCHING_LLM_MODEL`; a key is not required for local endpoints.

To show Grok's selected tool and arguments during the hackathon demo, enable the safe trace. It does not print credentials or raw tool results:

```bash
ASKCHING_DEBUG=1 pnpm askching -- "Compare USDC supply APY across Aave, Compound, and Spark"
```

## Run the comparison

Fixture smoke test:

```bash
pnpm live:smoke
```

Authenticated live smoke test:

```bash
DEMO_LIVE=1 GRAPH_API_KEY=your_studio_key pnpm live:smoke
```

Live mode queries the Aave V3, Compound V3, and Spark Lend Ethereum subgraphs listed in `demos/prompts.md`. Missing credentials fail with `GRAPH_API_KEY is required when DEMO_LIVE=1`; failed sources are reported as explicit gaps only when at least two cited sources remain.

## MCP client configuration

Build first, then replace the placeholder path in this Cursor/Claude-style configuration:

```json
{
  "mcpServers": {
    "askching": {
      "command": "node",
      "args": [
        "/absolute/path/to/AskChing_Agent/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "DEMO_LIVE": "0"
      }
    }
  }
}
```

For live use, change `DEMO_LIVE` to `1` and pass `GRAPH_API_KEY` through the client’s secret environment configuration. MCP uses stdout for protocol messages; diagnostics belong on stderr.

## Current scope

`compare_markets`, `research_brief`, and `risk_scan` are implemented for comparable USDC supply-market research across Aave V3, Compound V3, and Spark Lend. `risk_scan` is intentionally a peer-relative spot snapshot until historical time-series queries are added. AskChing is research software, not a trading bot or transaction executor.

## Why not just official Subgraph MCP?

The official Subgraph MCP helps agents discover schemas and query individual subgraphs. AskChing uses official Graph access as infrastructure, then adds a deliberately smaller research layer: multi-subgraph fan-out, metric normalization, ranking, citation enforcement, explicit gaps, and Grok-driven synthesis. It complements rather than reimplements the official service.

## License

MIT
