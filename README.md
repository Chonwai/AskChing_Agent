# AskChing

AskChing is a Grok-orchestrated research MCP for ETHOnline 2026. It fans out across live The Graph subgraphs, normalizes comparable market metrics, and returns analysis with source citations and an explicit as-of time.

## Status

The repository is being built from scratch. The first vertical slice is `compare_markets` for a comparable USDC lending metric in deterministic fixture mode and credential-gated live mode.

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

## Run the comparison

Fixture smoke test:

```bash
pnpm live:smoke
```

Authenticated live smoke test:

```bash
DEMO_LIVE=1 GRAPH_API_KEY=your_studio_key pnpm live:smoke
```

Live mode queries the Aave V3 and Compound V3 Ethereum subgraphs listed in `demos/prompts.md`. Missing credentials fail with `GRAPH_API_KEY is required when DEMO_LIVE=1`; source errors and missing lender rates also fail rather than falling back to fixtures.

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

## Bootstrap limitations

`compare_markets` is implemented for USDC supply APY across Aave V3 and Compound V3. The server registers `research_brief` and `risk_scan`, but they currently return explicit not-implemented errors. The Grok orchestrator package is scaffolded; its tool-calling loop is the next product slice.

## Why not just official Subgraph MCP?

The official Subgraph MCP helps agents discover schemas and query individual subgraphs. AskChing uses official Graph access as infrastructure, then adds a deliberately smaller research layer: multi-subgraph fan-out, metric normalization, ranking, citation enforcement, explicit gaps, and Grok-driven synthesis. It complements rather than reimplements the official service.

## License

MIT
