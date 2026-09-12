# AskChing

AskChing is a Grok-orchestrated research MCP for ETHOnline 2026. It fans out across live The Graph subgraphs, normalizes comparable market metrics, and returns analysis with source citations and an explicit as-of time. It follows the pattern The Graph's own hackathon resources highlight: a **DeFi research agent** that answers natural-language questions about live on-chain markets through multi-subgraph queries.

## Status

The repository was built from scratch for ETHOnline 2026 (first commit after the hackathon start). Its six MCP research tools and Grok tool-calling CLI work in deterministic fixture mode and credential-gated live mode.

## Try it (60 seconds)

**Live remote MCP endpoint**: `https://ask-ching-agent.vercel.app/api/mcp` — connect any MCP client (VS Code, Claude, Cursor, Gemini CLI…) and ask:

> Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time.

Quick health check: `curl https://ask-ching-agent.vercel.app/api/health` → `{"live":true}`.

- **Judge/first-timer guide**: [`docs/try-it.md`](docs/try-it.md) — curl test, VS Code setup, copy-paste demo questions, per-platform cheat sheet.
- **Example prompts (Demo A–G)**: [`demos/prompts.md`](demos/prompts.md).

## Built on The Graph, for the agent economy

The Graph is the load-bearing data layer: AskChing queries live Messari Standardized Subgraphs through the Graph Gateway, then layers on Grok reasoning, metric normalization, cross-protocol ranking, and cited synthesis. Four protocols are live today (Aave V3, Compound V3, Spark Lend, Aave V2) — each verified to serve USDC through the same code path the server uses (`pnpm probe:protocols`). The same tools are exposed as a standard MCP server — over stdio **and** remote Streamable HTTP — so any MCP-compatible agent (Cursor, Claude, VS Code, Codex, Gemini CLI, Grok Bot, ChatGPT connectors) can call them.

AskChing is designed to fit the direction The Graph is investing in for 2026: **AI agents that treat subgraphs as a live, verifiable source of truth** (Agent0/ERC-8004 agent economy, x402 agent payments, and standardized schemas are natural next steps on this foundation).

## Evidence-first by design

AskChing treats provenance as a structural invariant, not a display option:

- Every returned number carries `subgraphId`, `block`, `timestamp`, and `queryHash`.
- A comparison without at least two distinct cited sources **fails closed** — no partial credit.
- `risk_scan` reports peer-relative spot signals and explicitly states it is **not** historical time-series analysis.
- `analyze_markets` exposes every finding's calculation, supporting values, metric-aware citations, confidence, caveats, gaps, and `asOf` instead of hiding them behind a score.
- `analyze_trends` reads cited daily history over a `7d` or `30d` window and reports per-protocol change, change percent, least-squares slope per day, direction, and volatility. Every daily point ships with its own citation, and a window wider than the sources can cover becomes an explicit gap instead of padded data.
- `discover_yields` discovers Ethereum-mainnet USDC opportunities across lending, Uniswap V3, and Curve while keeping lending supply APY and LP fee APR in separate rankings. A cross-DEX winner requires both DEX sources on the same complete UTC day.

This means AskChing refuses to fabricate. When it cannot verify, it says so.

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

Fixture analysis example:

```bash
DEMO_LIVE=0 pnpm askching -- "Analyze current USDC liquidity stress across Aave V3, Compound V3, and Spark Lend"
```

Credentialed live analysis example:

```bash
ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "Analyze the best current USDC supply-yield opportunity across Aave V3, Compound V3, and Spark Lend; cite every source"
```

Trend analysis example (fixture mode):

```bash
DEMO_LIVE=0 pnpm askching -- "Is USDC utilization trending up across Aave V3, Compound V3, and Spark Lend over the last 7 days?"
```

Cross-venue yield discovery example (fixture mode):

```bash
DEMO_LIVE=0 pnpm askching -- "Where can I earn yield on USDC across lending, Uniswap V3, and Curve? Keep the rankings separate and cite every formula."
```

Credentialed live discovery uses the same prompt with `DEMO_LIVE=1`. Uniswap V3 and Curve passed their exact production queries on 2026-09-12; run `pnpm probe:yields` again before a live demo because indexer availability and pool data can change.

> The Grok reasoning layer is currently a CLI. Packaging it as an MCP server is on the roadmap — once there, any MCP-compatible agent can call Grok-driven AskChing reasoning directly. The MCP tool layer is already cross-platform today (see `docs/cross-platform.md`).

## Run the comparison

Fixture smoke test:

```bash
pnpm demo
```

Authenticated live smoke test:

```bash
pnpm live:smoke
```

Live mode queries the Ethereum mainnet Messari lending subgraphs listed in `demos/prompts.md`. Four protocols are configured live and verified to return USDC data; a naming of any other registered deployment fails closed and comes back as an explicit gap. Missing credentials surface as a fail-closed evidence error on the MCP surface (`Need at least 2 cited sources ...`) rather than a credential message; the raw data source and the CLI still throw `GRAPH_API_KEY is required when DEMO_LIVE=1`. Failed sources are reported as explicit gaps only when at least two cited sources remain.

For DEX LPs, the reported historical fee estimate is `estimatedFeeApr = dailySupplySideFeesUsd / tvlUsd × 365 × 100`. It uses the latest complete UTC daily snapshot and base trading fees only. It excludes incentives, gas, compounding, price movement, and position-specific Uniswap V3 range performance; it is not a forecast or recommendation.

## MCP client configuration

AskChing runs over **two transports from one shared tool registration**: local stdio, and remote **Streamable HTTP** so cloud agents (Grok Bot, ChatGPT connectors, Claude connectors) can reach it without installing anything.

### Remote (deployed)

**Live at [`https://ask-ching-agent.vercel.app/api/mcp`](https://ask-ching-agent.vercel.app/api/mcp)** — deployed to Vercel **Pro** (team `chonwai-s-team`) with automatic GitHub push-to-deploy. Health check: [`https://ask-ching-agent.vercel.app/api/health`](https://ask-ching-agent.vercel.app/api/health) (reports `live: true` on Production).

```json
{
  "mcpServers": {
    "askching": {
      "url": "https://ask-ching-agent.vercel.app/api/mcp"
    }
  }
}
```

The same URL works in Claude, Cursor, VS Code, Codex, Gemini CLI / Antigravity, Grok Bot, and ChatGPT connectors — per-platform settings are in [`docs/platform-integration.md`](docs/platform-integration.md). `stdio`-only clients can bridge it with `npx -y mcp-remote <url>`.

> ⚠️ **The deployed endpoint ships unauthenticated, with no rate limit, in front of a billed Graph API key.** That is a deliberate hackathon trade-off so judges can connect directly — but it means anyone with the URL can spend your quota. Use a low-quota key for a public deployment, and add a bearer-token check or a Vercel Firewall rate limit before listing the URL publicly. Only `POST` is served; `GET` and `DELETE` return `405`.

### Local (stdio)

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

### Local (HTTP, no deploy)

```bash
pnpm mcp:serve        # http://localhost:8787/api/mcp  (+ GET /health)
pnpm mcp:http:smoke   # end-to-end handshake over real HTTP
pnpm vercel:probe     # validates api/mcp.ts the way Vercel invokes it
```

For live use, set `DEMO_LIVE=1` and pass `GRAPH_API_KEY` through the client's secret environment configuration (or the platform's environment variables). MCP uses stdout for protocol messages on stdio; diagnostics belong on stderr.

## Current scope

`compare_markets`, `research_brief`, `risk_scan`, `analyze_markets`, `analyze_trends`, and `discover_yields` are implemented. Yield discovery v1 is USDC-only on Ethereum mainnet, compares the existing lending sources with eligible USDC/USDT/DAI pools, and never combines lending and LP rankings. The analysis tools support `yield_opportunity`, `liquidity_stress`, and `evidence_quality`; `analyze_markets` reads current observations and marks historical intent as an explicit spot-only gap, while `analyze_trends` reads cited `7d`/`30d` daily history and stays descriptive — it never forecasts. AskChing is research software, not a forecast, trading bot, or transaction executor.

## Why not just official Subgraph MCP?

The official Subgraph MCP helps agents discover schemas and query individual subgraphs. AskChing uses official Graph access as infrastructure, then adds a deliberately smaller research layer: multi-subgraph fan-out, metric normalization, ranking, citation enforcement, explicit gaps, and Grok-driven synthesis. It complements rather than reimplements the official service.

## Hackathon showcase

- [Canonical three-source prompts](demos/prompts.md)
- [2:55 recording runbook](docs/superpowers/plans/2026-09-09-showcase-run-script.md)
- [Multi-platform demo narrative (3 wow moments)](docs/superpowers/plans/2026-09-12-demo-narrative.md)
- [Ready-to-copy ETHGlobal submission text](docs/superpowers/specs/2026-09-09-ethglobal-copy.md)
- [Pre-recording and pre-submission checklist](docs/superpowers/specs/2026-09-09-pre-recording-checklist.md)
- [Deploy as a remote MCP server (Vercel)](docs/deployment-vercel.md)
- [Connect from 7+ AI platforms](docs/platform-integration.md)
- [Improvement blueprint](docs/improvement-blueprint.md)

## License

MIT
