# `analyze_markets` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth AskChing tool that produces transparent, cited yield-opportunity, liquidity-stress, and evidence-quality findings from registered spot market data.

**Architecture:** Add Zod contracts and a pure `analyzeMarketObservations` engine to `@askching/shared`. The MCP handler fetches each required metric, converts missing coverage into explicit gaps, and delegates all calculations to the engine. The Grok loop exposes and executes the fourth tool; evals and docs lock its evidence-first behavior.

**Tech Stack:** TypeScript 5.9, Zod 3, MCP SDK, Vitest 3, pnpm 9.

## Global Constraints

- Existing `compare_markets`, `research_brief`, and `risk_scan` contracts remain backward compatible.
- Quantitative findings require at least two distinct cited subgraph sources.
- Never rank mixed assets, metrics, units, or incompatible APY rate types.
- Utilization below 80% is `info`, 80–90% inclusive is `watch`, and above 90% is `high`.
- TVL is scale context and must never be described as available liquidity.
- APY and utilization are spot observations, not forecasts or historical trends.
- `timeframe` preserves historical intent as an explicit spot-only gap.
- No black-box score, transaction execution, or financial recommendation.
- Commit after every task and push each safe batch without squashing.

---

### Task 1: Analysis contracts and fixture coverage

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/fixtures.ts`
- Create: `packages/shared/src/analysis.test.ts`

**Interfaces:**
- Produces: `AnalysisObjectiveSchema`, `AnalysisSeveritySchema`, `AnalysisConfidenceSchema`, `AnalysisCitationSchema`, `AnalysisSupportingValueSchema`, `AnalysisFindingSchema`, `AnalysisGapSchema`, `AnalyzeMarketsResultSchema` and inferred TypeScript types.
- Produces: at least three cited USDC utilization fixtures spanning `info`, `watch`, and `high`.

- [ ] **Step 1: Write failing schema and boundary tests**

In `analysis.test.ts`, import the new schemas and assert:

```ts
expect(AnalysisObjectiveSchema.options).toEqual([
  "yield_opportunity",
  "liquidity_stress",
  "evidence_quality"
]);
expect(AnalysisSeveritySchema.parse("watch")).toBe("watch");
expect(() => AnalysisConfidenceSchema.parse("certain")).toThrow();
```

Create an `AnalyzeMarketsResultSchema.parse` example containing one finding with two metric-aware citations. Assert a citation without `metric` fails.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts`

Expected: FAIL because the analysis schemas do not exist.

- [ ] **Step 3: Implement the Zod contracts**

Add the exact enums from the approved design. Define `AnalysisCitationSchema` as `ComparisonSourceSchema.extend({ metric: MarketMetricIdSchema })`. Define `AnalysisSupportingValueSchema` from `MarketObservationSchema`. Define result fields exactly as the design: `objective`, `asset`, `protocols`, `metrics`, `summary`, `findings`, `gaps`, and `asOf`.

- [ ] **Step 4: Add utilization fixtures**

Keep Aave V3 at 78.4%. Add cited USDC utilization observations for Compound V3 at 86.2% and Spark Lend at 92.5%, reusing each protocol's fixture source identity and timestamp conventions. Update the fixture coverage comment and total.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts packages/shared/src/data-source.test.ts`

Expected: all focused tests pass.

```bash
git add packages/shared/src/schemas.ts packages/shared/src/fixtures.ts packages/shared/src/analysis.test.ts
git commit -m "feat(shared): add market analysis contracts"
```

### Task 2: Yield-opportunity analysis engine

**Files:**
- Create: `packages/shared/src/analysis.ts`
- Modify: `packages/shared/src/analysis.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: normalized `MarketObservation[]`, `AnalysisGap[]`, objective, asset, protocols, metrics, and optional timeframe.
- Produces:

```ts
export interface AnalyzeObservationInput {
  objective: AnalysisObjective;
  asset: AssetSymbol;
  protocols: string[];
  metrics: MarketMetricId[];
  observations: MarketObservation[];
  gaps: AnalysisGap[];
  timeframe?: string;
}

export function analyzeMarketObservations(
  input: AnalyzeObservationInput
): AnalyzeMarketsResult;
```

- [ ] **Step 1: Write failing yield tests**

Use real fixture observations for Aave V3, Compound V3, and Spark Lend. Assert the yield finding:

```ts
expect(result.objective).toBe("yield_opportunity");
expect(result.findings[0]?.claim).toContain("aave-v3");
expect(result.findings[0]?.calculation).toContain("1.11 percentage points");
expect(result.findings[0]?.supportingValues).toHaveLength(3);
expect(new Set(result.findings[0]?.citations.map(c => c.subgraphId)).size).toBe(3);
expect(result.findings[0]?.confidence).toBe("high");
```

Also assert mixed assets, units, metrics, and APY rate types throw before ranking; fewer than two cited sources throws with `Need at least 2 cited sources`.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts`

Expected: FAIL because `analyzeMarketObservations` is absent.

- [ ] **Step 3: Implement the yield path**

Validate every observation with `MarketObservationSchema`. Filter to the requested uppercase asset and requested metrics. For yield, require comparable variable `supply_apy` observations, sort descending with protocol as deterministic tie-breaker, calculate leader minus runner-up, and attach matching utilization context when available. Deduplicate citations by metric, protocol, asset, subgraph ID, timestamp, and query hash.

Confidence is `high` for three or more distinct cited sources with no relevant gap and at most ten minutes timestamp skew; otherwise it is `medium`. Add the caveat `Spot APY is not a forecast or financial recommendation.`

- [ ] **Step 4: Export and verify GREEN**

Export `analysis.ts` from `packages/shared/src/index.ts`.

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts`

Expected: yield and guard tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/analysis.ts packages/shared/src/analysis.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): analyze cited yield opportunities"
```

### Task 3: Liquidity-stress and evidence-quality paths

**Files:**
- Modify: `packages/shared/src/analysis.ts`
- Modify: `packages/shared/src/analysis.test.ts`

**Interfaces:**
- Extends `analyzeMarketObservations` without changing its signature.

- [ ] **Step 1: Write failing utilization tests**

Table-test 79.9, 80, 90, and 90.1 and expect `info`, `watch`, `watch`, and `high`. Assert findings rank utilization descending, disclose the threshold calculation, and only describe TVL as scale context.

- [ ] **Step 2: Write failing evidence tests**

Assert three complete sources within ten minutes yield `high`; two sources, any relevant gap, or timestamp skew above ten minutes yields `medium`. Assert incomplete non-comparative coverage may yield `low`, and `timeframe: "7d"` creates a gap containing `spot-only` and `7d`.

- [ ] **Step 3: Verify RED**

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts`

Expected: new stress and evidence assertions fail.

- [ ] **Step 4: Implement both paths**

Use the exact threshold inclusivity from Global Constraints. Include peer rank in every utilization claim. Evidence quality reports cited source count, protocol/metric coverage, gaps, and maximum timestamp skew. Never emit a quantitative comparison with `low` confidence. Validate the completed result with `AnalyzeMarketsResultSchema.parse` before returning.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run packages/shared/src/analysis.test.ts packages/shared/src/compare.test.ts`

Expected: all focused tests pass.

```bash
git add packages/shared/src/analysis.ts packages/shared/src/analysis.test.ts
git commit -m "feat(shared): analyze liquidity stress and evidence quality"
```

### Task 4: MCP handler and server registration

**Files:**
- Modify: `packages/mcp-server/src/tools.ts`
- Modify: `packages/mcp-server/src/tools.test.ts`
- Modify: `packages/mcp-server/src/index.ts`
- Modify: `packages/mcp-server/src/mcp-smoke.ts`

**Interfaces:**
- Produces: `AnalyzeMarketsCoreSchema`, `AnalyzeMarketsInputSchema`, `analyzeMarkets(rawInput, dataSource): Promise<AnalyzeMarketsResult>`.
- Registers MCP tool name `analyze_markets` with structured output schema.

- [ ] **Step 1: Write failing handler tests**

Test all three objectives in fixture mode. Test uppercase asset normalization, minimum two protocols, objective metric defaults, rejection when yield omits `supply_apy`, rejection when stress omits `utilization`, per-metric missing-observation gaps, and a `7d` spot-only gap.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run packages/mcp-server/src/tools.test.ts`

Expected: FAIL because the fourth handler and schemas are absent.

- [ ] **Step 3: Implement input resolution and fetching**

Use these defaults:

```ts
const DEFAULT_ANALYSIS_METRICS = {
  yield_opportunity: ["supply_apy", "utilization"],
  liquidity_stress: ["utilization", "tvl"],
  evidence_quality: ["supply_apy", "borrow_apy", "tvl", "utilization"]
} as const;
```

For each metric, call `dataSource.getObservations(metric, protocols, asset)`, immediately copy `LiveDataSource.lastGaps`, and add a gap for each requested protocol absent from the returned observations. Continue across metrics; only the shared evidence gate decides whether an objective finding is possible.

- [ ] **Step 4: Register and smoke-test four tools**

Register `analyze_markets` with `AnalyzeMarketsCoreSchema.shape` and `AnalyzeMarketsResultSchema.shape`. Change MCP smoke expected names to include `analyze_markets` and expect `askching (4 tools)`.

Run: `pnpm exec vitest run packages/mcp-server/src/tools.test.ts && pnpm build && pnpm mcp:smoke`

Expected: handler tests pass, build passes, MCP smoke reports 4 tools.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/tools.ts packages/mcp-server/src/tools.test.ts packages/mcp-server/src/index.ts packages/mcp-server/src/mcp-smoke.ts
git commit -m "feat(mcp): expose transparent market analysis"
```

### Task 5: Grok routing and tool execution

**Files:**
- Modify: `packages/grok-orchestrator/src/loop.ts`
- Modify: `packages/grok-orchestrator/src/loop.test.ts`

**Interfaces:**
- Adds `analyze_markets` to `ASKCHING_TOOLS` and the internal `executeTool` switch.

- [ ] **Step 1: Write the failing Grok-loop test**

Have the mock model request `analyze_markets` with `yield_opportunity`, three protocols, USDC, and supply APY plus utilization. Assert the tool message has findings, two or more citations per quantitative finding, and an `asOf`; assert all four tool names are advertised.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run packages/grok-orchestrator/src/loop.test.ts`

Expected: FAIL because the fourth tool is neither advertised nor executed.

- [ ] **Step 3: Implement the tool definition and switch case**

The description tells Grok to use `analyze_markets` for best opportunity with explanation, cross-metric reasoning, liquidity stress, or evidence quality. Include objective, protocols, asset, metrics, and timeframe in the JSON schema. Import and call `analyzeMarkets` for the new switch case.

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run packages/grok-orchestrator/src/loop.test.ts packages/grok-orchestrator/src/output.test.ts`

Expected: all orchestrator tests pass.

```bash
git add packages/grok-orchestrator/src/loop.ts packages/grok-orchestrator/src/loop.test.ts
git commit -m "feat(grok): route analytical market questions"
```

### Task 6: Evals, skill, and product documentation

**Files:**
- Modify: `evals/cases.json`
- Modify: `evals/run.ts`
- Modify: `skills/askching/SKILL.md`
- Modify: `skills/askching/agents/openai.yaml`
- Modify: `README.md`
- Modify: `demos/prompts.md`

**Interfaces:**
- Adds eval kind `analyze_markets` and four deterministic cases.

- [ ] **Step 1: Add failing eval dispatch**

Extend `EvalKind` and `EvalCase.input` for objective, metrics, and timeframe. Add cases for USDC yield opportunity, utilization stress, evidence quality, and a seven-day request. Before implementing dispatch, run `pnpm eval` and expect failure for unsupported kind `analyze_markets`.

- [ ] **Step 2: Implement eval assertions**

Call `analyzeMarkets`. Assert non-empty summary and findings, valid `asOf`, at least two citations on every quantitative finding, explicit calculations, and a `spot-only` gap for the historical case.

- [ ] **Step 3: Update skill and docs**

Document when to choose the fourth tool, its three objectives, utilization thresholds, evidence gate, and research-only caveats. Add one fixture and one live CLI example. Update the skill metadata so agent clients see analysis capability. Update demo prompts with one yield-opportunity and one liquidity-stress question.

- [ ] **Step 4: Verify and commit**

Run: `pnpm eval && pnpm exec vitest run evals/skill-contract.test.ts evals/showcase-contract.test.ts`

Expected: all eval and documentation contracts pass.

```bash
git add evals/cases.json evals/run.ts skills/askching/SKILL.md skills/askching/agents/openai.yaml README.md demos/prompts.md
git commit -m "docs: add evidence-first market analysis workflow"
```

### Task 7: Final verification and durable handoff

**Files:**
- Modify: `HANDOFF.md`

- [ ] **Step 1: Run the full gate**

```bash
pnpm test
pnpm build
pnpm eval
pnpm mcp:smoke
git diff --check
```

Expected: all tests and evals pass, three packages build, smoke reports 4 tools, and no whitespace errors occur.

- [ ] **Step 2: Run one credentialed analytical smoke**

```bash
ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "Analyze the best current USDC supply-yield opportunity across Aave V3, Compound V3, and Spark Lend. Explain utilization context and cite every source."
```

Expected: Grok selects `analyze_markets`; every quantitative finding has two or more live citations; output states spot limitations and an `asOf`.

- [ ] **Step 3: Update handoff and commit**

Record exact verification totals, current implementation commit, credentialed smoke evidence, open constraints, and Phase 4 next action.

```bash
git add HANDOFF.md
git commit -m "docs(handoff): record market analysis delivery"
git push origin main
```

- [ ] **Step 4: Confirm synchronization**

Run: `git status --short && git log -8 --oneline`

Expected: clean status and separate commits for every implementation slice plus handoff.
