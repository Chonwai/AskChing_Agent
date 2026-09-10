---
title: AskChing handoff
updated: 2026-09-11
checkpoint: 9a3f592
status: analyze-markets-complete
---

# AskChing handoff

Updated: 2026-09-11 (Asia/Hong_Kong)

## Current checkpoint

- Branch: `main`, tracking the public `origin/main`.
- Published implementation HEAD: `9a3f592` (`docs: add evidence-first market analysis workflow`).
- `origin/main` matched that implementation HEAD before this handoff-only commit.
- Working tree was clean before editing this file; credentials remain local in `.env`.
- This handoff supersedes the `bd4d951` plan-ready checkpoint.

## What was built in this batch

AskChing now has a fourth MCP tool, `analyze_markets`, and the Grok CLI can select and execute it from natural language. It turns registered spot observations into explainable findings rather than a black-box score.

### Analysis objectives

- `yield_opportunity`: ranks comparable current supply APYs, calculates the leader/runner-up spread, and adds the leader's utilization context.
- `liquidity_stress`: ranks current utilization; below 80% is `info`, 80–90% inclusive is `watch`, and above 90% is `high`. Optional TVL is explicitly scale context, not available liquidity.
- `evidence_quality`: reports requested observation coverage, distinct cited sources, timestamp skew, explicit gaps, and `high`/`medium`/`low` confidence.

### Evidence and safety behavior

- Every quantitative finding contains its calculation, supporting observations, metric-aware citations, confidence, caveats, and `asOf`.
- Quantitative comparisons require at least two distinct cited subgraph sources and reject mixed assets, units, metrics, or APY rate definitions.
- Missing protocol/metric observations and failed live sources become explicit gaps when an analysis can still satisfy its evidence gate.
- Historical intent such as `7d` is preserved as a `spot-only` gap. The tool never presents current observations as a trend, forecast, safety verdict, or financial recommendation.
- The MCP server now advertises four tools: `analyze_markets`, `compare_markets`, `research_brief`, and `risk_scan`.

### Judge-facing additions

- Four deterministic analysis evals: yield opportunity, liquidity stress, evidence quality, and historical-intent gap.
- Two demo prompts for transparent yield and stress analysis.
- Updated README, thin AskChing skill, and OpenAI skill metadata with analysis selection rules and guardrails.

## Commits in the analysis batch

- `cd5453f` docs: design transparent market analysis tool
- `cced6ce` docs(handoff): checkpoint market analysis design
- `e5bdef4` fix(spec): make analysis citations metric-aware
- `cadbfe2` fix(spec): preserve historical analysis intent
- `bd4d951` docs: plan evidence-first market analysis
- `82ca55c` docs(handoff): checkpoint market analysis plan
- `c9e1e99` feat(shared): add market analysis contracts
- `8226275` feat(shared): analyze cited yield opportunities
- `926d562` feat(shared): analyze liquidity stress and evidence quality
- `facb4bd` feat(mcp): expose cited market analysis
- `335a172` feat(orchestrator): route cited market analysis
- `9a3f592` docs: add evidence-first market analysis workflow

All implementation commits above were pushed separately to public `origin/main`; history was not squashed.

## Fresh verification evidence

Run from repository root at `9a3f592` on 2026-09-11:

```text
pnpm test      -> 99/99 passed (13 files)
pnpm build     -> all 3 workspace packages built successfully
pnpm eval      -> 20/20 passed
pnpm mcp:smoke -> OK: askching (4 tools)
git diff --check -> clean
```

Credentialed live analytical smoke also passed:

```text
ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching --
  "Analyze the best current USDC supply-yield opportunity across Aave V3,
   Compound V3, and Spark Lend. Explain utilization context and cite every source."

Selected tool: analyze_markets
Objective: yield_opportunity
Live sources: Aave V3, Compound V3, Spark Lend (3 distinct subgraphs)
Observed leader: Compound V3, 5.556442694112% supply APY
Runner-up: Aave V3, 3.7134735741102136%
Calculated spread: 1.84 percentage points
Leader utilization context: 90.72479433698581%
asOf: 2026-09-10T16:12:11.000Z, block 25948103
Grok output included source IDs, deployment IDs, blocks, timestamps, query hashes,
spot-only caveats, and stated that the result was not a forecast or recommendation.
```

## Existing generalized surface

- 6 live protocols: `aave-v3`, `compound-v3`, `spark-lend`, `aave-v2`, `uwu-lend`, `zerolend`.
- 4 metrics: `supply_apy`, `borrow_apy`, `tvl`, `utilization`.
- 4 fixture/demo assets: `USDC`, `USDT`, `DAI`, `WETH`.
- Legacy alias: `usdc_supply_apy` maps to `supply_apy` plus `USDC`.
- 4 deferred protocols remain disabled pending field-level schema verification: `compound-v2`, `rari-fuse`, `makerdao`, `euler`.

## Open constraints

- Analysis is based on current spot observations; no historical time series is queried yet.
- `tvl` is the largest matching market's USD scale proxy and must not be called available liquidity.
- `utilization` is borrow divided by deposit and skips zero-deposit markets.
- Live coverage depends on what each registered subgraph exposes for the requested asset and metric. Explicit gaps are expected and intentional.
- Grok synthesis is a CLI layer; the MCP tool layer itself is cross-platform.
- AskChing is research software only: no trading, transaction execution, or large UI.
- Do not commit `.env`, expose API keys, or paste secrets into logs.

## Next action

The build batch is complete. The highest-value next step is the manual hackathon recording and submission flow:

1. Run the pre-recording checklist in `docs/superpowers/specs/2026-09-09-pre-recording-checklist.md`.
2. Record the 2–4 minute human-narrated live demo using Demo D or Demo E from `demos/prompts.md`, with `ASKCHING_DEBUG=1 DEMO_LIVE=1` so judges see the selected tool and cited result.
3. Follow `docs/superpowers/plans/2026-09-09-showcase-run-script.md`, upload the video unlisted, and add its URL to the ETHGlobal form.
4. Confirm the GitHub repo is public and the README renders correctly, then submit before the deadline.

Do not claim the video or ETHGlobal submission is complete until John confirms it.

## Source-of-truth files

- `README.md` — setup, usage, analysis examples
- `docs/superpowers/specs/2026-09-10-analyze-markets-design.md` — approved design
- `docs/superpowers/plans/2026-09-10-analyze-markets.md` — implementation checklist
- `packages/shared/src/analysis.ts` — deterministic analysis engine
- `packages/mcp-server/src/tools.ts` — MCP input resolution and data fan-out
- `packages/grok-orchestrator/src/loop.ts` — Grok tool exposure and routing
- `evals/cases.json` — 20 deterministic eval cases
- `demos/prompts.md` — demo questions and expected paths
- `skills/askching/SKILL.md` — thin evidence-preserving agent playbook
