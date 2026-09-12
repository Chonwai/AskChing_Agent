import { describe, expect, it } from "vitest";

import {
  DexYieldObservationSchema,
  DiscoverYieldsResultSchema,
  YieldCategorySchema,
  YieldVenueSchema
} from "./schemas.js";

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
