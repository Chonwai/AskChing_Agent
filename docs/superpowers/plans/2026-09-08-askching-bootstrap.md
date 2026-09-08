# AskChing Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a buildable AskChing monorepo and a test-first `compare_markets` vertical slice with fixture and live data paths.

**Architecture:** Shared contracts and data access sit below dependency-injected MCP handlers. Fixture and live sources produce the same cited normalized record, so tests exercise production comparison logic without network access.

**Tech Stack:** Node.js 20+, TypeScript, pnpm workspaces, Zod, Vitest, Model Context Protocol SDK, native `fetch`.

## Global Constraints

- Use live The Graph Studio gateway / official Graph APIs; do not rebuild subgraph search.
- Do not build trading, a large UI, unrelated legacy framing, or x402 in this slice.
- Commit after every meaningful scaffold, feature, test, and documentation step; never squash incremental history.
- Fixture comparisons contain at least two distinct citations and a non-empty `asOf`.

---

### Task 1: Workspace scaffold

**Files:** Create root workspace files, package manifests, TypeScript configs, environment example, license, README stub, and empty package entry points.

**Interfaces:** Produces root `pnpm build`, `pnpm test`, and `pnpm eval` commands plus `@askching/shared` and `@askching/mcp-server` workspace packages.

- [ ] Create the pnpm workspace and package manifests with Node 20 and strict TypeScript settings.
- [ ] Add `.env.example` containing blank `XAI_API_KEY`, blank `GRAPH_API_KEY`, and `DEMO_LIVE=0`.
- [ ] Add the README stub, including “Why not just official Subgraph MCP?”, and MIT license.
- [ ] Install dependencies, run `pnpm build`, and commit `chore: scaffold AskChing pnpm monorepo`.

### Task 2: Shared comparison contract

**Files:** Create `packages/shared/src/schemas.ts`, `packages/shared/src/compare.ts`, and focused Vitest tests.

**Interfaces:** Produces `CitationSchema`, `MarketObservationSchema`, `ComparisonSchema`, and `compareObservations(observations, metric)`.

- [ ] Write a failing test asserting two cited observations become ranked rows with distinct sources and `asOf`.
- [ ] Run the focused test and confirm the failure is caused by the missing comparison function.
- [ ] Implement the smallest schemas and comparison function that pass.
- [ ] Write and observe a failing test for missing citation fields, then implement fail-closed validation.
- [ ] Run shared tests and build; commit `feat(shared): normalize cited market comparisons`.

### Task 3: Fixture and live Graph data sources

**Files:** Create source configuration, fixtures, a gateway client, source selection, and tests under `packages/shared`.

**Interfaces:** Produces `createMarketDataSource(env)` with `getObservations(metric, protocols)`; live mode requires `GRAPH_API_KEY` and fixture mode performs no network request.

- [ ] Write and observe failing fixture-mode and missing-live-credential tests.
- [ ] Implement fixture selection and explicit live credential validation.
- [ ] Add two verified hardcoded subgraph configurations and a small query adapter for their common metric.
- [ ] Run shared tests and build; commit `feat(shared): add fixture and live Graph market sources`.

### Task 4: `compare_markets` MCP handler

**Files:** Create handler, MCP stdio server, and handler tests under `packages/mcp-server`.

**Interfaces:** Produces `compareMarkets(input, dataSource)` and registers public tool `compare_markets`; skeleton registrations for `research_brief` and `risk_scan` return explicit not-yet-supported gaps in this bootstrap slice.

- [ ] Write and observe a failing handler test for a two-source fixture comparison.
- [ ] Implement validated input, fan-out through the data source, comparison, and MCP response serialization.
- [ ] Run package tests and build; commit `feat(mcp): implement compare_markets vertical slice`.

### Task 5: Evals, playbook, and handoff

**Files:** Create `evals/cases.json`, `evals/run.ts`, `skills/askching/SKILL.md`, `demos/prompts.md`; update README and `HANDOFF.md`.

**Interfaces:** Produces `pnpm eval`, a thin agent playbook, demo/live smoke instructions, and durable continuation state.

- [ ] Add an eval case that asserts at least two distinct sources, citations on every row, and `asOf`.
- [ ] Add the thin skill and demo prompts without embedding comparison logic.
- [ ] Run `pnpm test`, `pnpm build`, and `pnpm eval`; record exact results in `HANDOFF.md`.
- [ ] Commit tests and docs as separate `test:` and `docs:` commits.
