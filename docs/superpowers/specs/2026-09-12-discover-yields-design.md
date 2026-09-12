# `discover_yields` Design

**Date:** 2026-09-12  
**Status:** approved design, pending user review of this written specification

## Goal

Add a sixth AskChing MCP tool that answers “Where can I earn yield on USDC?” using live The Graph data from two distinct opportunity classes:

1. lending supply markets already supported by AskChing; and
2. Ethereum mainnet stablecoin LP pools on Uniswap V3 and Curve.

The tool presents lending and LP opportunities together for discovery but ranks them separately. It must never imply that lending supply APY and LP fee APR have equivalent risk or mechanics.

## First-version scope

- Chain: Ethereum mainnet only.
- Input asset: `USDC` only.
- Other stablecoins: `USDT` and `DAI` only.
- Lending venues: the current verified `LIVE_PROTOCOLS` registry.
- DEX venues: Uniswap V3 and Curve.
- DEX return: base fees only, using the most recent complete UTC daily snapshot.
- Excluded: token incentives, governance rewards, gas, compounding, position-specific Uniswap ranges, wallet actions, deposits, swaps, routing, and financial recommendations.

Curve pools qualify when their token composition includes USDC and at least one of USDT or DAI. A three-asset USDC/USDT/DAI pool therefore qualifies. Uniswap pools qualify when the pair is exactly USDC/USDT or USDC/DAI in either token order; all returned fee tiers are evaluated.

## User-facing tool contract

Tool name: `discover_yields`.

Input:

```ts
{
  asset?: "USDC";                    // default USDC; other values reject in v1
  chain?: "ethereum-mainnet";        // default ethereum-mainnet
  stablecoins?: Array<"USDT" | "DAI">; // default both, deduplicated
  venues?: Array<"lending" | "uniswap-v3" | "curve">; // default all
  minTvlUsd?: number;                 // default 1_000_000; non-negative
  limitPerCategory?: number;          // default 5; integer 1–20
}
```

Output:

```ts
{
  asset: "USDC";
  chain: "ethereum-mainnet";
  window: {
    kind: "latest_complete_utc_day";
    start: string;
    end: string;
  };
  lending: LendingYieldOpportunity[];
  dexLp: DexLpYieldOpportunity[];
  crossDexWinner: DexLpYieldOpportunity | null;
  gaps: YieldDiscoveryGap[];
  methodology: string[];
  asOf: string;
}
```

Every opportunity includes:

- `category`: `lending` or `dex_lp`;
- venue and protocol identity;
- normalized annual percentage value and exact return label;
- numeric inputs used by the calculation;
- a human-readable calculation;
- TVL and the observation window;
- risk flags and caveats;
- source citation containing subgraph id, deployment id when available, block, timestamp, query hash, and pool/market address.

Lending opportunities additionally include current utilization when available. DEX opportunities include pool composition, pool address, fee tier when applicable, daily fees supplied to LPs, daily volume, and `estimatedFeeApr`.

## Architecture

The existing lending data source remains unchanged. New DEX-specific modules sit beside it instead of forcing pools into the lending `MarketObservation` model:

```text
discover_yields handler
  ├── LendingYieldAdapter  ── existing MarketDataSource
  ├── UniswapV3YieldAdapter ─ Graph Gateway
  ├── CurveYieldAdapter     ─ Graph Gateway
  └── normalizeYieldDiscovery
        ├── lending ranking
        ├── DEX LP ranking
        ├── cross-DEX evidence gate
        └── gaps + methodology
```

Adapters implement one small interface:

```ts
interface YieldAdapter {
  readonly venue: "lending" | "uniswap-v3" | "curve";
  getOpportunities(input: ResolvedYieldDiscoveryInput):
    Promise<YieldAdapterResult>;
}
```

`YieldAdapterResult` contains observations and explicit gaps. The pure normalizer owns filtering, ranking, cross-venue claims, and output validation. MCP stdio and HTTP transports continue to share the single registration in `packages/mcp-server/src/register.ts`. The Grok definition derives accepted venues from the same registry used by the handler.

## The Graph sources and queries

Implementation must probe and pin an indexed Ethereum mainnet deployment before enabling each DEX adapter. These are the concrete candidates to probe first:

| Venue | Candidate subgraph id | Evidence |
| --- | --- | --- |
| Uniswap V3 Ethereum | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` | [Graph Explorer](https://thegraph.com/explorer/subgraphs/4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6?chain=mainnet&view=Query), [Messari schema repository](https://github.com/messari/subgraphs) |
| Curve Finance Ethereum | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` | [Graph Explorer](https://thegraph.com/explorer/subgraphs/3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF?chain=mainnet&view=Query), [Curve volume-subgraph reference](https://github.com/curvefi/volume-subgraphs) |

A candidate is not marked live merely because its schema parses: the exact production query must return a qualifying pool and complete daily snapshot through the configured Graph Gateway. If a candidate fails, implementation may replace it only with another indexed Graph Explorer deployment that passes the same probe and is recorded with its exact id and verification evidence.

Verification correction (2026-09-12): the Uniswap deployment exposes the Messari DEX schema. The production adapter uses a two-phase query—matching pools first, then fetching each pool's daily snapshots—because the deployment's global snapshot query timed out. Curve daily-snapshot `timestamp` is treated as an observation within its UTC day; the cited window is the containing UTC day, never `timestamp + 24h`.

Required Uniswap fields:

- pool id, token0/token1 address and symbol, fee tier;
- latest complete `PoolDayData`: date, feesUSD, volumeUSD, tvlUSD;
- block/deployment metadata needed by the existing citation boundary.

Required Curve fields:

- pool id and full token composition;
- latest complete daily pool snapshot;
- snapshot TVL, daily volume, and daily supply-side revenue paid to LPs;
- block/deployment metadata needed by the citation boundary.

If the verified Curve schema cannot provide daily supply-side revenue and TVL for the same complete window, the adapter returns an explicit unsupported-schema gap and Curve is not used in a cross-DEX winner claim. It must not substitute an uncited protocol API or combine values from different windows.

## Calculations and ranking

For each qualifying DEX pool:

```text
estimatedFeeApr = dailySupplySideFeesUsd / snapshotTvlUsd × 365 × 100
```

For Uniswap, `PoolDayData.feesUSD` is the daily supply-side fee input. For Curve, the verified daily supply-side revenue field is the fee input. Calculations reject negative values, non-finite values, zero TVL, mismatched windows, and snapshots from the incomplete current UTC day.

The latest complete day is the greatest snapshot day whose end is less than or equal to the current UTC day boundary. Every DEX opportunity in a cross-venue comparison must cover the same UTC day. If venues expose different latest complete days, the normalizer uses the newest common complete day; if there is no common day, it returns venue-local results and a comparison gap.

Filters run before ranking:

1. supported chain and asset;
2. allowed stablecoin composition;
3. active/non-zero pool values;
4. `tvlUsd >= minTvlUsd`;
5. complete and internally consistent citation;
6. valid fee APR calculation.

Lending ranks descending by current `supplyApy`. DEX LP ranks descending by `estimatedFeeApr`, with deterministic tie breaks by venue then pool address. Each category is truncated independently to `limitPerCategory`.

`crossDexWinner` is non-null only when at least one qualifying Uniswap opportunity and one qualifying Curve opportunity exist for the common daily window. Otherwise DEX opportunities may still be returned as venue-local observations, but no cross-DEX “best” claim is made.

## Risk language

All DEX opportunities carry:

- `fee_returns_variable`;
- `stablecoin_depeg`;
- `smart_contract`;
- `impermanent_loss`;
- `excludes_incentives_gas_and_compounding`.

Uniswap V3 also carries `concentrated_liquidity` and `position_range_dependent`: pool-wide historical fee APR is not a promise of the return earned by a particular LP range. Curve multi-asset pools carry `multi_asset_pool`. Lending keeps its existing spot-rate and utilization caveats.

The summary may describe the leading opportunity inside each category. It must not name one combined winner across lending and DEX LP categories, calculate a blended score, or use “safe”, “guaranteed”, “best investment”, or equivalent language.

## Failure and gap behavior

Adapters execute with settled-result semantics so one failure does not erase successful evidence.

- A failed adapter produces a venue-specific gap with a safe error message.
- A pool missing a required field produces a pool-specific gap and is excluded.
- A pool below the TVL floor is filtered and counted in methodology, not presented as an error.
- Lending comparisons keep the existing minimum-two-distinct-subgraph evidence gate.
- A cross-DEX winner requires both Uniswap and Curve cited results for the same complete day.
- With only one DEX venue, return venue-local opportunities, set `crossDexWinner: null`, and state why.
- If no category has a valid opportunity, fail closed with the accumulated gaps.
- Fixture mode is clearly identifiable and cannot be described as live.

Secrets, gateway URLs containing keys, authorization headers, and raw provider errors must never appear in tool output or logs.

## Fixture and live modes

Fixture mode includes deterministic observations for:

- at least two lending protocols;
- at least two Uniswap USDC stablecoin pools across the allowed pairs or fee tiers;
- at least one qualifying Curve pool;
- one sub-$1M pool proving the default TVL filter;
- one missing-source case proving `crossDexWinner: null`.

Live mode uses `GRAPH_API_KEY` and the same Graph Gateway convention as the lending client. DEX source configuration records venue, chain, subgraph id, live flag, and a precise note for every disabled source. A fixture/live consistency test prevents fixtures from claiming a source or pool shape that the pinned live adapter cannot produce.

## Grok behavior

The orchestrator exposes `discover_yields` when the user asks where to earn, deposit, lend, or LP an asset across venue types. It continues to use `compare_markets` for a single lending metric and `analyze_trends` for historical lending trends.

The system guidance tells Grok to:

1. preserve separate lending and LP rankings;
2. show the formula and primary risk difference before discussing rates;
3. carry citations, `asOf`, window, caveats, and gaps into the answer;
4. never infer rewards or position-level Uniswap performance;
5. never propose a transaction.

## Testing

Development follows test-first, small-commit sequencing.

Required coverage:

- input defaults, rejected assets/chains, deduplication, and bounds;
- Uniswap pair matching in both token orders and multiple fee tiers;
- Curve two-token and three-token composition matching;
- complete-day selection and newest-common-day logic;
- fee APR formula, zero TVL, negative/non-finite fields, and stable tie breaks;
- default `$1M` filtering and configurable floor;
- separate category ranking and prohibition on a combined winner;
- cross-DEX evidence gate and partial-adapter gaps;
- citation completeness and secret-safe errors;
- MCP registration over stdio and HTTP;
- Grok routing and preservation of risk language;
- deterministic evals for full success, filtered pool, and one-DEX failure;
- a credentialed live probe for each enabled DEX source before it is documented as live.

## Acceptance criteria

A fixture and credentialed live request equivalent to “Where can I earn yield on USDC across lending, Uniswap, and Curve?” must:

- query the selected lending and DEX adapters;
- return independently ranked lending and DEX LP arrays;
- include at least one qualifying Uniswap and Curve result before naming a cross-DEX winner;
- show every APR formula and its numeric inputs;
- attach a complete The Graph citation to every quantitative opportunity;
- filter pools below the default `$1M` TVL;
- show the complete UTC window and `asOf`;
- preserve all required LP and lending caveats;
- avoid a combined cross-category ranking or financial recommendation;
- pass build, full tests, evals, stdio MCP smoke, HTTP MCP smoke, Vercel probe, and live DEX probes.

## Delivery boundaries

This feature adds discovery and research only. It does not expand to Sui in this batch, auto-discover arbitrary DEX schemas, create a UI, connect wallets, quote swaps, or execute transactions. The adapter boundary is deliberately designed so later work can add another EVM chain or venue without changing the tool contract.
