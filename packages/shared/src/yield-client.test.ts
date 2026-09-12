import { describe, expect, it, vi } from "vitest";

import { CurveYieldAdapter, UniswapV3YieldAdapter } from "./yield-client.js";
import { DEX_YIELD_SOURCES } from "./yield-sources.js";

const day = Date.parse("2026-09-10T00:00:00.000Z") / 1000;

interface CurveFixtureSnapshot {
  id: string;
  timestamp: string;
  blockNumber: string;
  dailySupplySideRevenueUSD?: string;
  dailyVolumeUSD?: string;
  totalValueLockedUSD?: string;
  pool: {
    id: string;
    inputTokens: Array<{ id: string; symbol: string }>;
  };
}

interface CurveFixtureEnvelope {
  data: {
    liquidityPoolDailySnapshots: CurveFixtureSnapshot[];
    _meta: {
      deployment: string;
      block: { number: number; timestamp: number };
    };
  };
}

function response() {
  const pools = [
    {
      id: "0x1111111111111111111111111111111111111111",
      token0: { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
      token1: { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" },
      feeTier: "500",
      poolDayData: [
        { date: String(day + 86_400), feesUSD: "999", volumeUSD: "1", tvlUSD: "1" },
        { date: String(day), feesUSD: "1000", volumeUSD: "2000000", tvlUSD: "10000000" }
      ]
    },
    {
      id: "0x2222222222222222222222222222222222222222",
      token0: { id: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI" },
      token1: { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
      feeTier: "100",
      poolDayData: [
        { date: String(day), feesUSD: "500", volumeUSD: "1000000", tvlUSD: "5000000" }
      ]
    },
    {
      id: "0x3333333333333333333333333333333333333333",
      token0: { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
      token1: { id: "0x0000000000000000000000000000000000000001", symbol: "WETH" },
      feeTier: "3000",
      poolDayData: [{ date: String(day), feesUSD: "1", volumeUSD: "1", tvlUSD: "1" }]
    }
  ];
  return { data: { usdcAsToken0: pools.slice(0, 1).concat(pools[2]!), usdcAsToken1: [pools[1]], _meta: { deployment: "QmTest", block: { number: 123, timestamp: day + 86_500 } } } };
}

describe("UniswapV3YieldAdapter", () => {
  it("supports both token orders and uses the latest complete UTC day", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response()), { status: 200 })
    );
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!,
      apiKey: "secret",
      fetchImpl,
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });

    const result = await adapter.getOpportunities({ stablecoins: ["USDT", "DAI"] });

    expect(result.observations).toHaveLength(2);
    expect(result.observations.map(value => value.tokenSymbols)).toEqual([
      ["USDC", "USDT"],
      ["DAI", "USDC"]
    ]);
    expect(result.observations[0]!.estimatedFeeApr).toBeCloseTo(3.65);
    expect(result.observations[0]!.windowEnd).toBe("2026-09-11T00:00:00.000Z");
  });

  it("rejects zero TVL and returns no unsupported pair", async () => {
    const payload = response();
    payload.data.usdcAsToken0[0]!.poolDayData[1]!.tvlUSD = "0";
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!,
      apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 })
      ),
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    const result = await adapter.getOpportunities({ stablecoins: ["USDT"] });
    expect(result.observations).toEqual([]);
    expect(result.gaps[0]?.reason).toMatch(/positive TVL/);
  });

  it("never leaks credentials from provider errors", async () => {
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!,
      apiKey: "top-secret",
      fetchImpl: vi.fn().mockRejectedValue(new Error("top-secret network error")),
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.toThrow("Uniswap V3 Graph request failed");
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.not.toThrow(/top-secret/);
  });
});

function curveResponse(): CurveFixtureEnvelope {
  const pool = (
    id: string,
    tokens: Array<{ id: string; symbol: string }>
  ) => ({ id, inputTokens: tokens });
  const usdc = { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" };
  const usdt = { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" };
  const dai = { id: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI" };
  return {
    data: {
      liquidityPoolDailySnapshots: [
        { id: "two-new", timestamp: String(day), blockNumber: "456", dailySupplySideRevenueUSD: "200", dailyVolumeUSD: "400000", totalValueLockedUSD: "2000000", pool: pool("0x5555555555555555555555555555555555555555", [usdc, usdt]) },
        { id: "two-old", timestamp: String(day - 86_400), blockNumber: "400", dailySupplySideRevenueUSD: "999", dailyVolumeUSD: "1", totalValueLockedUSD: "1", pool: pool("0x5555555555555555555555555555555555555555", [usdc, usdt]) },
        { id: "three-current", timestamp: String(day + 86_400), blockNumber: "500", dailySupplySideRevenueUSD: "999", dailyVolumeUSD: "1", totalValueLockedUSD: "1", pool: pool("0x6666666666666666666666666666666666666666", [usdc, usdt, dai]) },
        { id: "three-new", timestamp: String(day), blockNumber: "457", dailySupplySideRevenueUSD: "300", dailyVolumeUSD: "600000", totalValueLockedUSD: "3000000", pool: pool("0x6666666666666666666666666666666666666666", [usdc, usdt, dai]) },
        { id: "no-usdc", timestamp: String(day), blockNumber: "458", dailySupplySideRevenueUSD: "100", dailyVolumeUSD: "1", totalValueLockedUSD: "1000000", pool: pool("0x7777777777777777777777777777777777777777", [usdt, dai]) },
        { id: "zero-tvl", timestamp: String(day), blockNumber: "459", dailySupplySideRevenueUSD: "100", dailyVolumeUSD: "1", totalValueLockedUSD: "0", pool: pool("0x8888888888888888888888888888888888888888", [usdc, usdt]) }
      ],
      _meta: { deployment: "QmCurve", block: { number: 999, timestamp: day + 86_500 } }
    }
  };
}

describe("CurveYieldAdapter", () => {
  it("matches complete two- and three-token pools and calculates same-day fee APR", async () => {
    const adapter = new CurveYieldAdapter({
      source: DEX_YIELD_SOURCES[1]!,
      apiKey: "secret",
      fetchImpl: vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify(curveResponse()), { status: 200 })
      ),
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });

    const result = await adapter.getOpportunities({ stablecoins: ["USDT", "DAI"] });

    expect(result.observations).toHaveLength(2);
    expect(result.observations.map(value => value.tokenSymbols)).toEqual([
      ["USDC", "USDT"],
      ["USDC", "USDT", "DAI"]
    ]);
    expect(result.observations[0]!.estimatedFeeApr).toBeCloseTo(3.65);
    expect(result.observations[1]!.estimatedFeeApr).toBeCloseTo(3.65);
    expect(result.observations.every(value => value.windowStart === "2026-09-10T00:00:00.000Z")).toBe(true);
    expect(result.gaps).toEqual([
      expect.objectContaining({ poolAddress: "0x8888888888888888888888888888888888888888", reason: expect.stringMatching(/positive TVL/) })
    ]);

    const usdtOnly = await adapter.getOpportunities({ stablecoins: ["USDT"] });
    expect(usdtOnly.observations.map(value => value.poolAddress)).toEqual([
      "0x5555555555555555555555555555555555555555",
      "0x6666666666666666666666666666666666666666"
    ]);
  });

  it("does not combine fee revenue and TVL from different daily snapshots", async () => {
    const payload = curveResponse();
    payload.data.liquidityPoolDailySnapshots = [
      { id: "fees-only", timestamp: String(day), blockNumber: "460", dailySupplySideRevenueUSD: "200", dailyVolumeUSD: "1", pool: { id: "0x9999999999999999999999999999999999999999", inputTokens: [
        { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" }
      ] } },
      { id: "tvl-only", timestamp: String(day - 86_400), blockNumber: "430", dailyVolumeUSD: "1", totalValueLockedUSD: "2000000", pool: { id: "0x9999999999999999999999999999999999999999", inputTokens: [
        { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" }
      ] } }
    ];
    const adapter = new CurveYieldAdapter({
      source: DEX_YIELD_SOURCES[1]!, apiKey: "secret",
      fetchImpl: vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 })),
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });

    const result = await adapter.getOpportunities({ stablecoins: ["USDT"] });
    expect(result.observations).toEqual([]);
    expect(result.gaps).toEqual([
      expect.objectContaining({ poolAddress: "0x9999999999999999999999999999999999999999", reason: expect.stringMatching(/same daily snapshot/) })
    ]);
  });

  it("returns a safe provider error without credentials", async () => {
    const adapter = new CurveYieldAdapter({
      source: DEX_YIELD_SOURCES[1]!, apiKey: "curve-secret",
      fetchImpl: vi.fn().mockRejectedValue(new Error("curve-secret leaked"))
    });
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.toThrow("Curve Graph request failed");
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.not.toThrow(/curve-secret/);
  });
});
