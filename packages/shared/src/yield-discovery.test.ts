import { describe, expect, it } from "vitest";

import {
  DexYieldObservationSchema,
  DiscoverYieldsResultSchema,
  YieldCategorySchema,
  YieldVenueSchema
} from "./schemas.js";
import { MARKET_FIXTURES } from "./fixtures.js";
import { DEX_YIELD_FIXTURES } from "./yield-fixtures.js";
import { normalizeYieldDiscovery } from "./yield-discovery.js";

const dexObservation = {
  venue: "uniswap-v3",
  poolAddress: "0x1111111111111111111111111111111111111111",
  asset: "USDC",
  tokenSymbols: ["USDC", "USDT"],
  feeTier: 500,
  dailySupplySideFeesUsd: 1000,
  volume24hUsd: 2_000_000,
  tvlUsd: 10_000_000,
  estimatedFeeApr: 3.65,
  windowStart: "2026-09-10T00:00:00.000Z",
  windowEnd: "2026-09-11T00:00:00.000Z",
  subgraphId: "subgraph-uniswap",
  deploymentId: "deployment-uniswap",
  block: 123,
  timestamp: "2026-09-11T00:00:00.000Z",
  queryHash: "sha256:test"
} as const;

describe("yield discovery contracts", () => {
  it("locks venue and category vocabulary", () => {
    expect(YieldVenueSchema.options).toEqual(["lending", "uniswap-v3", "curve"]);
    expect(YieldCategorySchema.options).toEqual(["lending", "dex_lp"]);
  });

  it("requires complete DEX calculation and citation fields", () => {
    expect(DexYieldObservationSchema.parse(dexObservation)).toMatchObject({
      asset: "USDC",
      estimatedFeeApr: 3.65
    });
    const { poolAddress: _pool, ...withoutPool } = dexObservation;
    const { queryHash: _hash, ...withoutHash } = dexObservation;
    expect(() => DexYieldObservationSchema.parse(withoutPool)).toThrow();
    expect(() => DexYieldObservationSchema.parse(withoutHash)).toThrow();
    expect(() =>
      DexYieldObservationSchema.parse({ ...dexObservation, asset: "WETH" })
    ).toThrow();
  });

  it("parses a result with separate categories and no cross-DEX winner", () => {
    expect(
      DiscoverYieldsResultSchema.parse({
        asset: "USDC",
        chain: "ethereum-mainnet",
        window: {
          kind: "latest_complete_utc_day",
          start: dexObservation.windowStart,
          end: dexObservation.windowEnd
        },
        lending: [],
        dexLp: [],
        crossDexWinner: null,
        gaps: [{ venue: "curve", reason: "Pending live probe." }],
        methodology: ["Lending and LP results are ranked separately."],
        asOf: dexObservation.timestamp
      })
    ).toMatchObject({ crossDexWinner: null });
  });
});

const lendingObservations = MARKET_FIXTURES.filter(
  observation =>
    observation.asset === "USDC" &&
    ["aave-v3", "compound-v3"].includes(observation.protocol) &&
    ["supply_apy", "utilization", "tvl"].includes(observation.metric)
);

function normalize(overrides: Partial<Parameters<typeof normalizeYieldDiscovery>[0]> = {}) {
  return normalizeYieldDiscovery({
    lendingObservations,
    dexObservations: DEX_YIELD_FIXTURES,
    gaps: [],
    minTvlUsd: 1_000_000,
    limitPerCategory: 5,
    now: new Date("2026-09-12T12:00:00.000Z"),
    ...overrides
  });
}

describe("normalizeYieldDiscovery", () => {
  it("ranks lending and DEX LP opportunities independently", () => {
    const result = normalize();

    expect(result.lending.map(value => [value.rank, value.protocol])).toEqual([
      [1, "aave-v3"],
      [2, "compound-v3"]
    ]);
    expect(result.dexLp.map(value => [value.rank, value.venue])).toEqual([
      [1, "uniswap-v3"],
      [2, "curve"],
      [3, "uniswap-v3"]
    ]);
    expect(result.dexLp.some(value => value.tvlUsd < 1_000_000)).toBe(false);
    expect(result.crossDexWinner?.venue).toBe("uniswap-v3");
    expect(result.lending[0]?.riskFlags).toContain("spot_rate_variable");
    expect(result.dexLp[0]?.riskFlags).toContain("impermanent_loss");
    expect("winner" in result).toBe(false);
  });

  it("uses stable venue and pool tie breaks and independent limits", () => {
    const tied = DEX_YIELD_FIXTURES.slice(0, 3).map(value => ({
      ...value,
      estimatedFeeApr: 5,
      dailySupplySideFeesUsd: value.tvlUsd * 5 / 365 / 100
    }));
    const result = normalize({ dexObservations: tied, limitPerCategory: 1 });
    expect(result.lending).toHaveLength(1);
    expect(result.dexLp).toHaveLength(1);
    expect(result.dexLp[0]?.venue).toBe("curve");
  });

  it("withholds a cross-DEX winner without same-day evidence from both venues", () => {
    const curve = DEX_YIELD_FIXTURES.find(value => value.venue === "curve")!;
    const previousCurve = {
      ...curve,
      windowStart: "2026-09-09T00:00:00.000Z",
      windowEnd: "2026-09-10T00:00:00.000Z"
    };
    const uniswap = DEX_YIELD_FIXTURES.filter(value => value.venue === "uniswap-v3");
    const result = normalize({ dexObservations: [...uniswap, previousCurve] });
    expect(result.dexLp.map(value => value.venue)).toContain("uniswap-v3");
    expect(result.dexLp.map(value => value.venue)).toContain("curve");
    expect(result.crossDexWinner).toBeNull();
    expect(result.gaps.some(value => /common complete UTC day/.test(value.reason))).toBe(true);
  });

  it("rejects mixed assets and fails closed when no category survives", () => {
    const invalidAsset = { ...DEX_YIELD_FIXTURES[0]!, asset: "DAI" };
    expect(() => normalize({ dexObservations: [invalidAsset] })).toThrow();
    expect(() => normalize({
      lendingObservations: [],
      dexObservations: DEX_YIELD_FIXTURES.filter(value => value.tvlUsd < 1_000_000)
    })).toThrow(/No valid yield opportunities/);
  });
});
