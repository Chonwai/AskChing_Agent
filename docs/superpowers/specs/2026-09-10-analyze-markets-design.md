# `analyze_markets` Design

Date: 2026-09-10
Status: Approved design; ready for implementation planning

## Goal

Add a fourth AskChing MCP tool, `analyze_markets`, that turns current cited market observations into transparent yield-opportunity, liquidity-stress, and evidence-quality findings. The tool extends AskChing beyond single-metric ranking without becoming a general-purpose or predictive DeFi analyst.

## Product boundary

`analyze_markets` performs deterministic analysis over AskChing's registered protocols, assets, and spot metrics. Every quantitative claim must expose its supporting values, calculation, citations, confidence, and caveats.

The first version does not:

- predict future yield or recommend a transaction;
- assign a black-box protocol score;
- claim historical trends from spot observations;
- calculate available liquidity from TVL alone;
- answer questions outside the registered data surface.

Unsupported analysis is returned as an explicit gap rather than inferred from model knowledge.

## Architecture

The implementation has two new boundaries:

1. `packages/shared/src/analysis.ts` is a pure analysis engine. It consumes already-normalized observations grouped by metric plus source gaps. It performs no network, MCP, or Grok work.
2. `analyze_markets` in `packages/mcp-server/src/tools.ts` validates input, obtains the required observations through `MarketDataSource`, records per-metric source gaps, invokes the shared engine, and validates the result schema.

The Grok orchestrator exposes the fourth tool and passes its structured result back to the model for explanation. Existing tools and their input/output contracts remain backward compatible.

```text
Natural-language question
  -> Grok selects analyze_markets
  -> MCP handler resolves objective and metrics
  -> MarketDataSource fetches normalized observations
  -> pure shared analysis engine
  -> structured findings, citations, confidence, gaps, asOf
  -> Grok synthesis
```

## Input contract

```ts
type AnalysisObjective =
  | "yield_opportunity"
  | "liquidity_stress"
  | "evidence_quality";

interface AnalyzeMarketsInput {
  protocols: string[]; // minimum 2, registry-validated
  asset: string;       // normalized uppercase symbol
  metrics?: MarketMetricId[];
  objective: AnalysisObjective;
}
```

Objective defaults:

| Objective | Default metrics | Purpose |
| --- | --- | --- |
| `yield_opportunity` | `supply_apy`, `utilization` | Rank current supply yield and disclose utilization context |
| `liquidity_stress` | `utilization`, `tvl` | Detect utilization pressure and show TVL as scale context |
| `evidence_quality` | all four registered metrics | Assess coverage, citation completeness, source gaps, and timestamp skew |

Callers may narrow `metrics`, but an objective's primary metric is mandatory: `supply_apy` for yield opportunity and `utilization` for liquidity stress. Supplying a metric list that omits the primary metric fails validation with a clear error. Evidence quality accepts any non-empty subset.

## Output contract

```ts
type AnalysisSeverity = "info" | "watch" | "high";
type AnalysisConfidence = "high" | "medium" | "low";

interface AnalysisSupportingValue {
  protocol: string;
  asset: string;
  metric: MarketMetricId;
  value: number;
  unit: Unit;
  subgraphId: string;
  deploymentId?: string;
  block?: number;
  timestamp: string;
  queryHash: string;
}

interface AnalysisFinding {
  severity: AnalysisSeverity;
  claim: string;
  calculation: string;
  supportingValues: AnalysisSupportingValue[];
  citations: ComparisonSource[];
  confidence: AnalysisConfidence;
  caveats: string[];
}

interface AnalysisGap {
  metric?: MarketMetricId;
  protocol?: string;
  reason: string;
}

interface AnalyzeMarketsResult {
  objective: AnalysisObjective;
  asset: string;
  protocols: string[];
  metrics: MarketMetricId[];
  summary: string;
  findings: AnalysisFinding[];
  gaps: AnalysisGap[];
  asOf: string;
}
```

`asOf` is the latest observation timestamp used by any finding. Timestamp differences remain visible as caveats and influence confidence.

## Deterministic analysis rules

### Yield opportunity

- Rank only `supply_apy` observations with the same asset, unit, metric definition, and variable rate type.
- The lead finding states the highest current supply APY and the runner-up.
- `calculation` exposes the percentage-point spread as `leader.value - runnerUp.value`, rounded only for display.
- Utilization is context, never part of a hidden combined score. If the winning protocol has a utilization observation, attach it and its threshold caveat to the finding.
- The output explicitly states that spot APY is not a forecast or recommendation.

### Liquidity stress

- Rank comparable utilization observations from highest to lowest.
- Apply the approved transparent thresholds:
  - below 80%: `info`;
  - 80% through 90%, inclusive: `watch`;
  - above 90%: `high`.
- Always show the peer-relative utilization rank as well as the fixed threshold.
- TVL may be attached as scale context when available, but the tool must not equate TVL with available liquidity.
- The output describes the result as a spot heuristic signal, not a liquidation or solvency assessment.

### Evidence quality

- Report distinct cited-source count, requested protocol/metric coverage, explicit source gaps, and observation timestamp skew.
- A finding is `high` confidence only when it uses at least three distinct cited sources, has no relevant gaps, and the maximum timestamp skew is no more than ten minutes.
- A finding is `medium` confidence when it has at least two cited sources but has only two sources, a relevant gap, or timestamp skew above ten minutes.
- `low` is reserved for non-comparative evidence-quality findings that describe incomplete coverage. A quantitative comparison never proceeds at low confidence.

## Evidence and failure rules

- Each quantitative finding requires at least two distinct cited subgraph sources. Otherwise that finding is not produced.
- If no objective finding can meet the two-source gate, `analyze_markets` fails with a message containing the collected gaps.
- One source may fail only when at least two valid cited sources remain for the finding. The failure is then preserved in `gaps` and reduces confidence.
- Observations with different assets, metrics, units, or APY rate types are never ranked together.
- Every supporting value must pass `MarketObservationSchema`; every citation must pass `ComparisonSourceSchema`.
- Duplicate citations are deduplicated by protocol, asset, metric, subgraph ID, timestamp, and query hash.
- Historical requests receive an explicit spot-only gap and no trend claim.

## Grok routing

The orchestrator exposes `analyze_markets` alongside the existing three tools. Its description directs Grok to choose it for questions involving:

- best opportunity with an explanation;
- why one market leads another;
- utilization or liquidity stress;
- evidence strength or data quality;
- analysis spanning multiple registered metrics.

Straight single-metric rankings continue to use `compare_markets`. Formatted single-metric summaries may continue to use `research_brief`. `risk_scan` remains backward compatible as a peer-relative spot scan.

## Testing strategy

### Shared engine

- calculates the leader-to-runner-up supply APY spread;
- applies utilization boundaries at values below 80%, exactly 80%, exactly 90%, and above 90%;
- includes peer-relative utilization rank;
- rejects mixed assets, units, metrics, and incompatible APY rate types;
- fails closed when fewer than two cited sources support a comparison;
- preserves partial-source gaps;
- assigns confidence from distinct sources, relevant gaps, and timestamp skew;
- never describes TVL as available liquidity or spot data as history.

### MCP handler

- validates objective, asset, protocol count, metrics, and required primary metric;
- selects objective defaults when metrics are omitted;
- fetches each metric and records its per-source gaps before fetching the next;
- validates the structured result including citations and `asOf`;
- fails when no objective finding clears the evidence gate.

### Grok orchestrator and evals

- advertises and executes the fourth tool;
- returns the tool result to Grok for synthesis;
- covers a best-yield question, a high-utilization warning, an evidence-quality question, and a historical request that must expose a gap;
- preserves all existing comparison, brief, risk, legacy-alias, build, and MCP-smoke checks.

## Documentation and demo

Update `skills/askching/SKILL.md`, `README.md`, the MCP smoke test, demo prompts, and handoff after implementation. The showcase should demonstrate one yield-opportunity analysis and one transparent utilization warning. It must label fixture versus live mode and keep credentials off screen.

## Acceptance criteria

- `analyze_markets` is registered over MCP and available to Grok.
- All three objectives return the documented structured shape in fixture mode.
- Each quantitative finding carries at least two distinct citations and its explicit calculation.
- Utilization threshold boundaries and peer-relative rankings are deterministic and tested.
- Partial failure, timestamp skew, and historical limitations appear as gaps or caveats rather than hidden fallbacks.
- Existing three-tool clients remain compatible.
- `pnpm test`, `pnpm build`, `pnpm eval`, and `pnpm mcp:smoke` pass.
- Git history contains separate conventional commits for schemas/tests, engine, MCP integration, Grok integration, evals/docs, and handoff.
