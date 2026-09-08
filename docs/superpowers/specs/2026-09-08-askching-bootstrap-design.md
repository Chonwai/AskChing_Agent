# AskChing Bootstrap Design

## Goal

Build a Start Fresh TypeScript pnpm monorepo whose first vertical slice compares one market metric across at least two The Graph subgraphs and returns normalized values with source citations and an `asOf` timestamp in fixture and live modes.

## Boundaries

The repository owns three narrow layers: shared schemas and Graph access, an MCP server exposing research verbs, and a Grok CLI that calls those verbs. `skills/askching/SKILL.md` is a usage playbook only. AskChing will not implement subgraph discovery, trading, payments, or a substantial UI.

## Architecture

- `packages/shared` owns public Zod schemas, citation enforcement, source configuration, fixtures, and the Graph gateway client.
- `packages/mcp-server` owns tool inputs and handlers. Handlers receive a data source, allowing deterministic fixture tests and a credential-gated live path.
- `packages/grok-orchestrator` will own the xAI tool-calling loop after the comparison slice is stable.
- Root scripts provide one build, test, and eval surface for the workspace.

The first live metric is selected from two hardcoded public lending subgraphs after endpoint verification. If comparable USDC supply APY fields are not consistently available, the demo uses the closest honest common metric and labels it precisely.

## Data flow

`compare_markets` validates input, fans out to configured sources, normalizes each response, rejects any result without its required citation fields, ranks comparable rows, and returns `{ metric, asOf, rows, caveats, sources }`. `DEMO_LIVE=0` selects checked-in fixtures. `DEMO_LIVE=1` requires `GRAPH_API_KEY` and queries the Studio gateway; missing credentials fail clearly.

## Error handling

Input and output boundaries use Zod. A source failure is represented as an explicit gap only if at least two cited sources remain; otherwise the comparison fails. Values with different definitions or units are never ranked together. Secrets are loaded from environment variables and never logged or committed.

## Verification

Vitest covers normalization, citation rejection, fixture fan-out, and credential failure. The root build type-checks all packages. Fixture evaluation asserts at least two distinct sources and a non-empty `asOf`. A documented live smoke command is separate because it requires user credentials.

## Delivery discipline

Each independently reviewable unit is verified and committed with a conventional message. `HANDOFF.md` records the current commit, verification evidence, open constraints, and the next action so another agent can resume without reconstructing the session.

