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

## Why not just official Subgraph MCP?

The official Subgraph MCP helps agents discover schemas and query individual subgraphs. AskChing uses official Graph access as infrastructure, then adds a deliberately smaller research layer: multi-subgraph fan-out, metric normalization, ranking, citation enforcement, explicit gaps, and Grok-driven synthesis. It complements rather than reimplements the official service.

## License

MIT

