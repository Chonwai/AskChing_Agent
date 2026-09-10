---
title: AskChing handoff
updated: 2026-09-10
checkpoint: bd4d951
status: analyze-markets-plan-ready
---

# AskChing handoff

Updated: 2026-09-10 (Asia/Hong_Kong)

## Current checkpoint

- Branch: `main`, tracking public `origin/main`
- Current work HEAD: `bd4d951` (`docs: plan evidence-first market analysis`)
- Working tree clean except untracked `.edison/state/loop-handoff-update.md` (loop state for this handoff update).
- Previous handoff checkpoint: `86d67aa` (2026-09-09) — this update supersedes it.

## Completed

AskChing now ships the **generalized query system** — any supported metric, asset, and protocol combination, not just the original three-protocol USDC slice.

The next analysis feature has an approved design in `docs/superpowers/specs/2026-09-10-analyze-markets-design.md` and an execution-ready TDD plan in `docs/superpowers/plans/2026-09-10-analyze-markets.md`. It adds a transparent fourth MCP tool for yield opportunity, liquidity stress, and evidence quality without black-box scores or unsupported historical claims. Implementation has not started.

### Generalized capabilities

- **6 live protocols** (all Messari schema 3.1.0): `aave-v3`, `compound-v3`, `spark-lend`, `aave-v2`, `uwu-lend`, `zerolend`.
- **4 deferred protocols** (`live: false`, need field-level verification before enabling): `compound-v2`, `rari-fuse`, `makerdao`, `euler`.
- **4 metrics**: `supply_apy`, `borrow_apy`, `tvl`, `utilization`.
- **4 assets**: `USDC`, `USDT`, `DAI`, `WETH`.
- **Legacy alias**: `usdc_supply_apy` → `supply_apy` + `asset: "USDC"` (still works).
- Architecture: `METRIC_REGISTRY` (`packages/shared/src/metrics.ts`) is the single source of truth for metrics; `PROTOCOL_REGISTRY` (`packages/shared/src/source-config.ts`) for protocols (subgraph IDs live there); `GET_MARKETS` fixed query + code-layer extraction in `graph-client.ts`; cross-asset guard in `compare.ts`; fail-closed citation.
- MCP tools: `compare_markets` / `research_brief` / `risk_scan` — all accept `asset` and `metric`.
- Grok orchestrator: `ASKCHING_TOOLS` generalized (6 live protocol enum + legacy metric).
- `SKILL.md` generalized (4 metrics / 4 assets / 6 protocols / legacy alias hints).

### New commits since `86d67aa` (generalize-query-system batch, 15 total)

Feature (6):

- `e0188fd` feat(shared): generalize schemas + METRIC_REGISTRY
- `e63daf8` feat(shared): expand PROTOCOL_REGISTRY to 6 LIVE
- `ab9675a` feat(shared): generalize graph-client to GET_MARKETS
- `372a818` feat(shared): generalize data-source + expand fixtures
- `bb77c7d` feat(mcp,orchestrator): generalize tools + ASKCHING_TOOLS
- `b596ab7` feat(evals,demo): add generalized eval cases + live smoke

Fix (7):

- `dcd2982` fix(shared): add indexLastUpdatedTimestamp to GET_MARKETS query
- `4869221` fix(skill): generalize SKILL.md for multi-asset/multi-metric
- `008bb69` fix(mcp): reflect full validation in MCP inputSchema
- `25b6001` fix(shared): branch getMarketObservation on MetricDescriptor.extractor
- `23ccd4c` fix(shared): add utilization ranking caveat
- `47ed8b4` fix(demo): extend live-smoke coverage + explicit anchor
- `5e72af4` refactor(shared): remove LegacyComparisonSchema dead code + structure risk gaps

State/plan (2):

- `a2d021b` chore(state): idea completion audit loop complete — VERIFY PASS 93.45
- `da25f8a` chore(state): generalize-query-system loop complete — VERIFY PASS 95

## Verification evidence

Run from the repository root at current work HEAD `da25f8a`:

```text
pnpm test  -> 79/79 passed (12 files)
pnpm eval  -> 16/16 passed
pnpm build -> all 3 workspace packages built successfully
pnpm mcp:smoke -> OK (3 tools)
```

Code review: VERIFY PASS 95/100 (strict 93). Remaining out-of-scope Medium from that review: the `~/.agents` + `~/.claude` SKILL copies were not yet synced — now addressed by the "Skills location" section below.

Credentialed live checks still valid from the pre-generalization era are superseded; re-run `pnpm live:smoke` (requires `GRAPH_API_KEY`) as part of Phase 4 (item 4.3 below) for the current generalized surface.

## Run the product

```bash
pnpm install
cp .env.example .env
pnpm build
pnpm askching -- "Compare USDC supply APY across Aave, Compound, and Spark"
```

For xAI, set `XAI_API_KEY`. For a local OpenAI-compatible server, set `ASKCHING_LLM_BASE_URL` and `ASKCHING_LLM_MODEL`; local endpoints may omit the key. Set `DEMO_LIVE=1` plus `GRAPH_API_KEY` only when live Graph data is required.

Any metric/asset/protocol combination works, e.g.:

```bash
pnpm askching -- "Compare USDT supply APY across Aave V3 and Compound V3"
pnpm askching -- "What is DAI borrow APY on Spark Lend?"
pnpm askching -- "Scan risk signals for USDC and DAI across all live protocols"
```

## Skills location (agent tooling)

The `askching` skill is a single source of truth in `skills/askching/SKILL.md`, wired into agent tooling through symlinks:

- **In-repo (already committed)**: `.agents/skills/askching` → `../../skills/askching`, `.claude/skills/askching` → `../../skills/askching`. Teammates who clone the repo get the skill automatically.
- **Global (created 2026-09-10)**: `~/.agents/skills/askching` → `<repo>/skills/askching` (cross-tool path for Cursor/Gemini/Copilot); `~/.claude/skills/askching` → `<repo>/skills/askching` (Claude Code personal layer).
- If the repo is moved, the global symlinks break — recreate them with `ln -sfn <repo>/skills/askching ~/.agents/skills/askching` (and the same for `~/.claude/skills/askching`).
- Windows clones need `core.symlinks=true` for in-repo symlinks to resolve (current teammates are all macOS — low risk).
- Codex ignores symlinks: if you drive this repo with Codex, copy the skill instead of relying on the symlink.

## Open constraints

- `risk_scan` is an honest peer-relative spot snapshot, not historical time-series risk analysis.
- `tvl` reports the largest market per asset as a caveated approximation; `utilization` is `borrow / deposit × 100` and skips markets with zero deposit.
- AskChing remains research software: no trading, transaction execution, or large UI is in scope.
- Credentials remain local in `.env` and must never be committed or pasted into logs.

## Next action — `analyze_markets` review, then Phase 4

1. Choose the plan execution mode: subagent-driven task reviews or inline execution in the current session.
2. Execute `docs/superpowers/plans/2026-09-10-analyze-markets.md` with separate commits for schemas/tests, shared engine, MCP, Grok, evals/docs, and handoff.
3. Keep the existing Phase 4 deadline work moving; do not claim the video or submission is complete until John confirms it.

### Phase 4 manual work (deadline 2026-09-13 12:00 PM EDT)

John picks up the remaining Phase 4 work:

1. **4.1 — Demo video**: record the 2–4 min, ≥720p, human-narrated, live-data demo by following `docs/superpowers/plans/2026-09-09-showcase-run-script.md`. Run the pre-recording checklist first: `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md`. Use `ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "<Demo prompt>"` so the tool choice and live cited answer are both visible.
2. **4.2 — Upload**: upload the video to YouTube as unlisted, then paste the URL into the ETHGlobal submission form.
3. **4.3 — Final live smoke**: run `pnpm live:smoke` (requires `GRAPH_API_KEY`) and confirm the generalized surface (6 protocols / 4 metrics / 4 assets) returns live cited data.
4. **4.5 — Repo public + README**: confirm the repo is public and the README renders normally.
5. **4.6 — Update showcase + submit**: refresh the showcase copy if needed (`docs/superpowers/specs/2026-09-09-ethglobal-copy.md`, `demos/prompts.md`) and submit before the deadline.

Do not claim recording or submission is complete until John confirms it.

## Source-of-truth documents

- `README.md` — setup and usage
- `docs/engineering-spec.md` — architecture and contracts
- `docs/product-overview.md` — product and competition narrative
- `demos/prompts.md` — demo prompts
- `packages/shared/src/source-config.ts` — protocol registry (subgraph IDs, live flags)
- `packages/shared/src/metrics.ts` — metric registry (definitions, legacy aliases)
- `skills/askching/SKILL.md` — agent evidence rules
