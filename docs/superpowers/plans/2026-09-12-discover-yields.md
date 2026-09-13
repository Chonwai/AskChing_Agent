# Discover USDC Yields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ([ ]) syntax for tracking.

**Goal:** Add a sixth AskChing MCP tool that discovers cited Ethereum-mainnet USDC lending and stablecoin-LP opportunities across current lending sources, Uniswap V3, and Curve while ranking lending and LP results separately.

**Architecture:** Keep the existing lending data path and add DEX-specific source configuration, Graph clients, observations, fixtures, and a pure normalizer. Extend the existing data-source facade with a separate DEX-yield method so MCP, stdio, HTTP, and Grok keep one injected dependency. Only the normalizer may filter, rank, or claim a cross-DEX winner.

**Tech Stack:** TypeScript 5.9, Zod 3, The Graph Gateway GraphQL, MCP SDK, Vitest 3, pnpm 9.

## Global Constraints

- Ethereum mainnet and USDC only in v1.
- Eligible stablecoin counterparts are USDT and DAI.
- DEX venues are Uniswap V3 and Curve; base trading fees only.
- Use the latest complete common UTC daily snapshot.
- Default minimum TVL is USD 1,000,000; default result limit is 5 per category.
- Lending and LP yields are separate rankings with no blended score or combined winner.
- Cross-DEX winner requires cited qualifying results from both Uniswap and Curve.
- Every quantitative opportunity includes formula inputs and a complete The Graph citation.
- Never expose Graph keys, authorization headers, keyed URLs, or raw provider errors.
- Fixture mode must be identifiable; live claims require credentialed probes.
- No incentives, gas, compounding, wallet actions, transactions, or recommendations.
- Follow TDD and commit/push after every task without squashing.

---

### Task 1: Yield contracts and source registry

**Files:**

- Modify: packages/shared/src/schemas.ts
- Create: packages/shared/src/yield-sources.ts
- Create: packages/shared/src/yield-sources.test.ts
- Create: packages/shared/src/yield-discovery.test.ts
- Modify: packages/shared/src/index.ts

**Interfaces:**

- Produces: YieldVenueSchema, YieldCategorySchema, YieldRiskFlagSchema, YieldCitationSchema, DexYieldObservationSchema, LendingYieldOpportunitySchema, DexLpYieldOpportunitySchema, YieldDiscoveryGapSchema, DiscoverYieldsResultSchema.
- Produces: DEX_YIELD_SOURCES, LIVE_DEX_YIELD_SOURCES, CORE_STABLECOIN_ADDRESSES.

- [ ] **Step 1: Write failing schema tests**

Test exact venue options; reject a DEX observation without poolAddress, complete-day window, TVL, fees, formula inputs, and citation. Parse a result with separate lending and dexLp arrays and crossDexWinner null. Assert asset other than USDC and a citation without queryHash fail.

- [ ] **Step 2: Write failing registry tests**

Assert exact candidates:

    uniswap-v3 -> 4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6
    curve -> 3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF

Assert Ethereum token addresses are lower-case:

    USDC 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    USDT 0xdac17f958d2ee523a2206206994597c13d831ec7
    DAI  0x6b175474e89094c44da98b954eedeac495271d0f

Both candidates begin as live: false with note: "Pending exact-query credentialed probe." Every disabled source requires a non-empty note; every enabled source must have no note. Task 8 is the only task allowed to flip either candidate to live: true.

Execution correction: the candidate exposes the Messari DEX schema rather than the official Uniswap schema. Its global snapshot query timed out, so the exact production path uses a two-phase pool lookup followed by per-pool daily-snapshot queries; the credentialed probe verified this path before activation.

- [ ] **Step 3: Verify RED**

Run:

    pnpm exec vitest run packages/shared/src/yield-sources.test.ts packages/shared/src/yield-discovery.test.ts

Expected: fail because contracts and registry do not exist.

- [ ] **Step 4: Implement minimal contracts and registry**

Use these internal observation fields:

    venue, poolAddress, tokenSymbols, feeTier?
    dailySupplySideFeesUsd, volume24hUsd, tvlUsd
    estimatedFeeApr, windowStart, windowEnd, timestamp
    subgraphId, deploymentId?, block?, queryHash

YieldCitation adds venue, poolAddress, windowStart, and windowEnd to the existing provenance fields. DiscoverYieldsResult fixes asset to USDC and chain to ethereum-mainnet.

- [ ] **Step 5: Export and verify GREEN**

Export the new modules from packages/shared/src/index.ts. Run the two focused tests and pnpm --filter @askching/shared build. Expected: all pass.

- [ ] **Step 6: Commit and push**

  git add packages/shared/src/schemas.ts packages/shared/src/yield-sources.ts packages/shared/src/yield-sources.test.ts packages/shared/src/yield-discovery.test.ts packages/shared/src/index.ts
  git commit -m "feat(shared): add yield discovery contracts"
  git push origin main

---

### Task 2: Deterministic DEX fixtures and Uniswap adapter

**Files:**

- Create: packages/shared/src/yield-fixtures.ts
- Create: packages/shared/src/yield-client.ts
- Create: packages/shared/src/yield-client.test.ts
- Modify: packages/shared/src/index.ts

**Interfaces:**

- Produces: DEX_YIELD_FIXTURES.
- Produces: UniswapV3YieldAdapter.getOpportunities(input): Promise of YieldAdapterResult.
- Consumes: DexYieldObservationSchema and DEX_YIELD_SOURCES from Task 1.

- [ ] **Step 1: Add fixtures**

Create two eligible Uniswap observations across USDC/USDT and USDC/DAI, one Curve USDC/USDT/DAI observation, and one Uniswap observation below USD 1M TVL. Use a complete fixed UTC day and distinct query hashes.

- [ ] **Step 2: Write failing Uniswap tests**

Mock one Graph response containing pools in both token orders, multiple fee tiers, a disallowed token, a current incomplete day, and two completed days. Assert:

    estimatedFeeApr = feesUSD / tvlUSD * 365 * 100

Assert latest complete day selection, both token orders, stablecoin filtering, zero-TVL rejection, deterministic pool ordering, and a redacted safe error.

- [ ] **Step 3: Verify RED**

Run:

    pnpm exec vitest run packages/shared/src/yield-client.test.ts

Expected: fail because UniswapV3YieldAdapter is absent.

- [ ] **Step 4: Implement Uniswap adapter**

Use the pinned source and query pool identity plus PoolDayData date, feesUSD, volumeUSD, and tvlUSD. The adapter accepts an injected fetch and clock. Hash the canonical GraphQL query using the existing SHA-256 convention. Select the latest snapshot whose end is not later than the current UTC-day boundary.

- [ ] **Step 5: Verify GREEN**

Run the focused test and shared build. Expected: all pass.

- [ ] **Step 6: Commit and push**

  git add packages/shared/src/yield-fixtures.ts packages/shared/src/yield-client.ts packages/shared/src/yield-client.test.ts packages/shared/src/index.ts
  git commit -m "feat(shared): query Uniswap stablecoin fee yields"
  git push origin main

---

### Task 3: Curve adapter and common-window behavior

**Files:**

- Modify: packages/shared/src/yield-client.ts
- Modify: packages/shared/src/yield-client.test.ts

**Interfaces:**

- Produces: CurveYieldAdapter.getOpportunities(input): Promise of YieldAdapterResult.
- Consumes: exact Curve daily fields dailySupplySideRevenueUSD, dailyVolumeUSD, totalValueLockedUSD, timestamp, blockNumber, pool input tokens.

- [ ] **Step 1: Write failing Curve tests**

Mock a Messari DEX response containing a two-token pool, a USDC/USDT/DAI pool, a pool without USDC, a zero-TVL snapshot, and mismatched days. Assert full composition matching, fee formula, exclusion behavior, and safe unsupported-schema gaps when fee revenue or TVL is absent.

- [ ] **Step 2: Verify RED**

Run the yield-client test. Expected: Curve tests fail because the adapter is absent.

- [ ] **Step 3: Implement Curve adapter**

Query liquidityPools and liquidityPoolDailySnapshots from source 3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF. Use dailySupplySideRevenueUSD as daily fees. Never combine a revenue value and TVL from different snapshot days.

- [ ] **Step 4: Verify GREEN**

Run the focused test and shared build. Expected: all pass.

- [ ] **Step 5: Commit and push**

  git add packages/shared/src/yield-client.ts packages/shared/src/yield-client.test.ts
  git commit -m "feat(shared): query Curve stablecoin fee yields"
  git push origin main

---

### Task 4: Pure discovery normalizer

**Files:**

- Create: packages/shared/src/yield-discovery.ts
- Modify: packages/shared/src/yield-discovery.test.ts
- Modify: packages/shared/src/index.ts

**Interfaces:**

- Produces: normalizeYieldDiscovery(input): DiscoverYieldsResult.
- Input contains lending observations, DEX observations, gaps, minTvlUsd, limitPerCategory, and current time.

- [ ] **Step 1: Write failing ranking tests**

Assert lending ranks by supply APY and DEX ranks by estimatedFeeApr. Assert categories never share a rank, stable tie breaks are venue then pool address, TVL below USD 1M is filtered, limits apply independently, and no combined winner field exists.

- [ ] **Step 2: Write failing evidence tests**

Assert crossDexWinner is present only with one cited Uniswap and one cited Curve result on the newest common complete day. One venue, mismatched days, incomplete citations, mixed asset, invalid fee values, and no valid category must yield the exact gaps or fail-closed behavior from the spec.

- [ ] **Step 3: Verify RED**

Run:

    pnpm exec vitest run packages/shared/src/yield-discovery.test.ts

Expected: fail because normalizeYieldDiscovery is absent.

- [ ] **Step 4: Implement the normalizer**

Perform validation, common-day intersection, filters, per-category sorting, risk-flag attachment, citation projection, truncation, methodology counts, and result-schema parsing. Deduplicate gaps by venue, pool, and reason.

- [ ] **Step 5: Verify GREEN**

Run yield-discovery, compare, analysis, and trend tests plus shared build. Expected: all pass with legacy behavior unchanged.

- [ ] **Step 6: Commit and push**

  git add packages/shared/src/yield-discovery.ts packages/shared/src/yield-discovery.test.ts packages/shared/src/index.ts
  git commit -m "feat(shared): rank cited yield opportunities"
  git push origin main

---

### Task 5: Fixture/live DEX data-source facade

**Files:**

- Create: packages/shared/src/yield-data-source.ts
- Create: packages/shared/src/yield-data-source.test.ts
- Modify: packages/shared/src/data-source.ts
- Modify: packages/shared/src/data-source.test.ts
- Modify: packages/shared/src/index.ts
- Modify: packages/shared/src/fixture-live-consistency.test.ts

**Interfaces:**

- Adds to MarketDataSource:

  getDexYieldOpportunities(input: DexYieldRequest): Promise of YieldAdapterResult array

- Produces createDexYieldDataSource(environment, fetchImpl).

- [ ] **Step 1: Write failing fixture tests**

Assert DEMO_LIVE=0 returns deterministic selected venues, respects stablecoins, and does not silently label fixtures live.

- [ ] **Step 2: Write failing live settled-result tests**

Mock Uniswap success plus Curve failure, then the reverse. Assert Promise.allSettled semantics retain successful observations, add a safe venue gap, and never leak API keys embedded in thrown messages.

- [ ] **Step 3: Verify RED**

Run yield-data-source and data-source tests. Expected: fail because the facade method is absent.

- [ ] **Step 4: Implement the facade**

Construct only requested adapters. In live mode require GRAPH_API_KEY, execute selected adapters concurrently with Promise.allSettled, snapshot each result, sanitize errors, and return accumulated observations/gaps without deciding rankings.

- [ ] **Step 5: Add fixture/live invariants**

Assert every DEX fixture venue is registered, every live DEX source has at least one eligible fixture, source ids match, and disabled sources carry notes.

- [ ] **Step 6: Verify GREEN**

Run focused tests and shared build. Expected: all pass.

- [ ] **Step 7: Commit and push**

  git add packages/shared/src/yield-data-source.ts packages/shared/src/yield-data-source.test.ts packages/shared/src/data-source.ts packages/shared/src/data-source.test.ts packages/shared/src/index.ts packages/shared/src/fixture-live-consistency.test.ts
  git commit -m "feat(shared): add settled DEX yield data source"
  git push origin main

---

### Task 6: MCP handler and both transports

**Files:**

- Modify: packages/mcp-server/src/tools.ts
- Modify: packages/mcp-server/src/tools.test.ts
- Modify: packages/mcp-server/src/register.ts
- Modify: packages/mcp-server/src/mcp-smoke.ts
- Modify: packages/mcp-server/src/http-smoke.ts
- Modify: packages/mcp-server/src/http.test.ts
- Modify: demos/vercel-probe.ts

**Interfaces:**

- Produces DiscoverYieldsCoreSchema and DiscoverYieldsInputSchema.
- Produces discoverYields(rawInput, dataSource): Promise of DiscoverYieldsResult.
- Registers canonical tool name discover_yields.

- [ ] **Step 1: Write failing handler tests**

Test all defaults, lowercase normalization, rejected non-USDC asset, rejected chain, venue deduplication, TVL/limit bounds, separate rankings, partial DEX gaps, and crossDexWinner gate.

- [ ] **Step 2: Verify RED**

Run tools tests. Expected: fail because schemas and handler are absent.

- [ ] **Step 3: Implement handler**

Fetch lending supply APY, utilization, and TVL through existing methods when lending is selected. Fetch requested DEX venues through getDexYieldOpportunities. Convert lastGaps immediately, pass all observations to normalizeYieldDiscovery, and schema-parse the result.

- [ ] **Step 4: Register sixth tool**

Add discover_yields to registerAskChingTools and ASKCHING_TOOL_NAMES. Supply DiscoverYieldsResultSchema.shape as output schema. Update stdio, HTTP, and Vercel smoke expectations from five to six.

- [ ] **Step 5: Verify GREEN**

Run:

    pnpm exec vitest run packages/mcp-server/src/tools.test.ts packages/mcp-server/src/http.test.ts
    pnpm build
    pnpm mcp:smoke
    pnpm mcp:http:smoke
    pnpm vercel:probe

Expected: handler tests pass and every transport/probe reports six tools.

- [ ] **Step 6: Commit and push**

  git add packages/mcp-server/src/tools.ts packages/mcp-server/src/tools.test.ts packages/mcp-server/src/register.ts packages/mcp-server/src/mcp-smoke.ts packages/mcp-server/src/http-smoke.ts packages/mcp-server/src/http.test.ts demos/vercel-probe.ts
  git commit -m "feat(mcp): expose cross-venue yield discovery"
  git push origin main

---

### Task 7: Grok routing

**Files:**

- Modify: packages/grok-orchestrator/src/loop.ts
- Modify: packages/grok-orchestrator/src/loop.test.ts

**Interfaces:**

- Adds discover_yields to ASKCHING_TOOLS and executeTool.

- [ ] **Step 1: Write failing orchestration tests**

Mock Grok selecting discover_yields for “Where can I earn yield on USDC across lending and stablecoin LPs?” Assert tool arguments, six-tool exposure, execution, and returned result. Assert the tool description instructs separate category rankings and no transaction.

- [ ] **Step 2: Verify RED**

Run loop tests. Expected: fail because discover_yields is unsupported.

- [ ] **Step 3: Implement tool definition and routing**

Expose exact input enums/defaults from the spec. Add the executeTool switch case. Update system guidance so where-to-earn prompts select discovery, single lending comparisons retain compare_markets, and historical prompts retain analyze_trends.

- [ ] **Step 4: Verify GREEN**

Run loop tests and Grok package build. Expected: all pass.

- [ ] **Step 5: Commit and push**

  git add packages/grok-orchestrator/src/loop.ts packages/grok-orchestrator/src/loop.test.ts
  git commit -m "feat(orchestrator): route USDC yield discovery"
  git push origin main

---

### Task 8: Evals, documentation, live probes, and handoff

**Files:**

- Modify: evals/cases.json
- Modify: evals/run.ts
- Modify: evals/skill-contract.test.ts
- Modify: evals/showcase-contract.test.ts
- Modify: skills/askching/SKILL.md
- Modify: skills/askching/agents/openai.yaml
- Modify: README.md
- Modify: demos/prompts.md
- Create: demos/probe-yield-sources.ts
- Modify: package.json
- Modify: HANDOFF.md

**Interfaces:**

- Adds eval kind discover_yields and script probe:yields.

- [ ] **Step 1: Add failing eval and documentation contracts**

Add deterministic cases for full discovery, default TVL filtering, one-DEX failure, and category separation. Assert every opportunity has formula inputs and citation; historical window is complete; crossDexWinner obeys its gate. Require discover_yields and all LP risk language in the skill and demo prompt.

- [ ] **Step 2: Verify RED**

Run pnpm eval and the two documentation contract tests. Expected: unsupported eval kind and missing documentation fail.

- [ ] **Step 3: Implement eval dispatch and docs**

Document fixture and live examples, exact formulas, separate rankings, source ids, eligibility, limitations, and a 20–30 second demo beat. Keep SKILL.md thin and add discover_yields to allowed-tools.

- [ ] **Step 4: Add credentialed source probe and enable proven sources**

probe:yields executes the exact Uniswap and Curve production queries, requires at least one eligible complete snapshot per enabled venue, prints only venue/pool/day/TVL/APR/subgraph id, and exits non-zero for a live source that cannot deliver. It never prints a key or keyed URL.

Run the probe against both pending candidate ids. Only after both exact production queries pass, change both registry entries to live: true and remove their pending notes. Re-run yield-sources and fixture/live consistency tests. If either candidate fails, leave it disabled and stop under the plan's source-feasibility condition; do not weaken the two-DEX acceptance criterion.

- [ ] **Step 5: Commit docs/evals and push**

  git add evals/cases.json evals/run.ts evals/skill-contract.test.ts evals/showcase-contract.test.ts skills/askching/SKILL.md skills/askching/agents/openai.yaml README.md demos/prompts.md demos/probe-yield-sources.ts package.json packages/shared/src/yield-sources.ts packages/shared/src/yield-sources.test.ts
  git commit -m "docs: add cited USDC yield discovery workflow"
  git push origin main

- [ ] **Step 6: Run the full release gate**

  pnpm test
  pnpm build
  pnpm eval
  pnpm mcp:smoke
  pnpm mcp:http:smoke
  pnpm vercel:probe
  pnpm probe:yields
  git diff --check

Expected: all tests and evals pass; both MCP transports and Vercel probe report six tools; both DEX venues produce eligible cited live observations.

- [ ] **Step 7: Run one credentialed Grok smoke**

  ASKCHING_DEBUG=1 DEMO_LIVE=1 pnpm askching -- "Where can I earn yield on USDC across lending, Uniswap V3, and Curve? Keep lending and LP rankings separate, show every formula and citation, and explain the risks."

Expected: Grok selects discover_yields; output includes separate rankings, complete common day, citations, formulas, risk flags, and no transaction or combined winner.

- [ ] **Step 8: Refresh handoff, commit, and push**

Record exact totals, enabled/disabled DEX source evidence, current implementation checkpoint, live output summary, open constraints, and next manual demo action.

    git add HANDOFF.md
    git commit -m "docs(handoff): record USDC yield discovery"
    git push origin main

## Execution order and stop conditions

Tasks run sequentially because later contracts consume earlier types. Stop and revise the written design rather than improvising when:

- the pinned Uniswap source lacks a qualifying completed snapshot;
- the pinned Curve source lacks same-window TVL and daily LP fee revenue;
- a required field has incompatible meaning across venues;
- a live source cannot attach complete citation metadata;
- implementing the feature would require a protocol API, transaction path, or hidden yield estimate.

Do not mark a DEX source live until probe:yields passes against the exact query used by the server.
