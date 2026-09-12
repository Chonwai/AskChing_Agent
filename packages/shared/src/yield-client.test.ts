import { describe, expect, it, vi } from "vitest";

import { CurveYieldAdapter, UniswapV3YieldAdapter } from "./yield-client.js";
import { DEX_YIELD_SOURCES } from "./yield-sources.js";

const day = Date.parse("2026-09-10T00:00:00.000Z") / 1000;
const USDC_ADDR = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT_ADDR = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const DAI_ADDR = "0x6b175474e89094c44da98b954eedeac495271d0f";
const WETH_ADDR = "0x0000000000000000000000000000000000000001";

// ── Two-phase Uniswap fixtures ────────────────────────────────────
interface UniswapPoolFixture {
  id: string;
  inputTokens: Array<{ id: string; symbol: string }>;
}

interface UniswapSnapFixture {
  id: string;
  timestamp: string;
  blockNumber: string;
  dailySupplySideRevenueUSD?: string;
  dailyVolumeUSD?: string;
  totalValueLockedUSD?: string;
  pool: UniswapPoolFixture;
}

interface UniswapPoolsResponse {
  data: {
    usdtPools: UniswapPoolFixture[];
    daiPools: UniswapPoolFixture[];
  };
}

interface UniswapSnapResponse {
  data: {
    liquidityPoolDailySnapshots: UniswapSnapFixture[];
    _meta: {
      deployment: string;
      block: { number: number; timestamp: number };
    };
  };
}

const UNI_POOL_1111: UniswapPoolFixture = {
  id: "0x1111111111111111111111111111111111111111",
  inputTokens: [
    { id: USDC_ADDR, symbol: "USDC" },
    { id: USDT_ADDR, symbol: "USDT" }
  ]
};
const UNI_POOL_2222: UniswapPoolFixture = {
  id: "0x2222222222222222222222222222222222222222",
  inputTokens: [
    { id: DAI_ADDR, symbol: "DAI" },
    { id: USDC_ADDR, symbol: "USDC" }
  ]
};
const UNI_POOL_3333: UniswapPoolFixture = {
  id: "0x3333333333333333333333333333333333333333",
  inputTokens: [
    { id: USDC_ADDR, symbol: "USDC" },
    { id: WETH_ADDR, symbol: "WETH" }
  ]
};
const UNI_POOL_4444: UniswapPoolFixture = {
  id: "0x4444444444444444444444444444444444444444",
  inputTokens: [
    { id: USDC_ADDR, symbol: "USDC" },
    { id: USDT_ADDR, symbol: "USDT" }
  ]
};

const uniswapPoolsResponse: UniswapPoolsResponse = {
  data: {
    usdtPools: [UNI_POOL_1111, UNI_POOL_4444],
    daiPools: [UNI_POOL_2222]
  }
};

function uniswapSnapResponse(poolId: string, overrides: Partial<UniswapSnapFixture>): UniswapSnapResponse {
  const pool = poolId === "0x1111111111111111111111111111111111111111" ? UNI_POOL_1111
    : poolId === "0x2222222222222222222222222222222222222222" ? UNI_POOL_2222
    : UNI_POOL_4444;
  return {
    data: {
      liquidityPoolDailySnapshots: [
        {
          id: `${poolId}-day`,
          timestamp: String(day),
          blockNumber: "111",
          dailySupplySideRevenueUSD: "1000",
          dailyVolumeUSD: "2000000",
          totalValueLockedUSD: "10000000",
          pool,
          ...overrides
        }
      ],
      _meta: { deployment: "QmUniswap", block: { number: 123, timestamp: day + 86_500 } }
    }
  };
}

const uniswapOldSnapResponse: UniswapSnapResponse = {
  data: {
    liquidityPoolDailySnapshots: [
      {
        id: "1111-old",
        timestamp: String(day - 86_400),
        blockNumber: "110",
        dailySupplySideRevenueUSD: "999",
        dailyVolumeUSD: "1",
        totalValueLockedUSD: "1",
        pool: UNI_POOL_1111
      }
    ],
    _meta: { deployment: "QmUniswap", block: { number: 123, timestamp: day + 86_500 } }
  }
};

const uniswapZeroTvlResponse: UniswapSnapResponse = {
  data: {
    liquidityPoolDailySnapshots: [
      {
        id: "4444-zero",
        timestamp: String(day),
        blockNumber: "444",
        dailySupplySideRevenueUSD: "100",
        dailyVolumeUSD: "1",
        totalValueLockedUSD: "0",
        pool: UNI_POOL_4444
      }
    ],
    _meta: { deployment: "QmUniswap", block: { number: 123, timestamp: day + 86_500 } }
  }
};

function isPoolsQuery(body: { query?: string }): boolean {
  return body.query?.includes("usdtPools") === true;
}

function mockTwoPhaseFetch(
  poolsResponse: UniswapPoolsResponse,
  snapMap: Record<string, UniswapSnapResponse>
) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query?: string };
    if (isPoolsQuery(body)) {
      return new Response(JSON.stringify(poolsResponse), { status: 200 });
    }
    // Snapshot query — extract pool id from `where: { pool: "0x..." }`
    const match = body.query?.match(/pool:\s*"(0x[0-9a-f]+)"/i);
    const poolId = match?.[1]?.toLowerCase();
    if (poolId && snapMap[poolId]) {
      return new Response(JSON.stringify(snapMap[poolId]), { status: 200 });
    }
    // Default empty snapshot response
    return new Response(JSON.stringify({
      data: { liquidityPoolDailySnapshots: [], _meta: { deployment: "QmUniswap", block: { number: 123, timestamp: day + 86_500 } } }
    }), { status: 200 });
  });
}

describe("UniswapV3YieldAdapter", () => {
  it("two-phase: queries pools then per-pool snapshots", async () => {
    const snapMap: Record<string, UniswapSnapResponse> = {
      "0x1111111111111111111111111111111111111111": uniswapSnapResponse("0x1111111111111111111111111111111111111111", {}),
      "0x2222222222222222222222222222222222222222": uniswapSnapResponse("0x2222222222222222222222222222222222222222", {}),
      "0x4444444444444444444444444444444444444444": uniswapZeroTvlResponse
    };
    const fetchImpl = mockTwoPhaseFetch(uniswapPoolsResponse, snapMap);
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!,
      apiKey: "secret",
      fetchImpl,
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });

    const result = await adapter.getOpportunities({ stablecoins: ["USDT", "DAI"] });

    expect(fetchImpl).toHaveBeenCalledTimes(4); // 1 pools + 3 per-pool snapshots
    expect(result.observations).toHaveLength(2);
    expect(result.observations.map(v => v.poolAddress).sort()).toEqual([
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222"
    ]);
    expect(result.observations[0]!.estimatedFeeApr).toBeCloseTo(3.65);
    expect(result.observations[0]!.windowEnd).toBe("2026-09-11T00:00:00.000Z");
    expect(result.gaps.map(g => g.poolAddress)).toContain("0x4444444444444444444444444444444444444444");
  });

  it("excludes non-stablecoin pool (WETH) from gap list", async () => {
    // pools response includes 0x3333 (USDC/WETH) but snapshots won't match filter
    const snapMap: Record<string, UniswapSnapResponse> = {
      "0x2222222222222222222222222222222222222222": uniswapSnapResponse("0x2222222222222222222222222222222222222222", {})
    };
    const poolsResp: UniswapPoolsResponse = {
      data: {
        usdtPools: [],
        daiPools: [UNI_POOL_2222]
      }
    };
    const fetchImpl = mockTwoPhaseFetch(poolsResp, snapMap);
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!, apiKey: "secret",
      fetchImpl,
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    const result = await adapter.getOpportunities({ stablecoins: ["USDT"] });
    expect(result.gaps.map(g => g.poolAddress)).not.toContain("0x3333333333333333333333333333333333333333");
  });

  it("generates gap when snapshot lacks TVL, fees, or volume", async () => {
    const partialSnap: UniswapSnapResponse = {
      data: {
        liquidityPoolDailySnapshots: [
          {
            id: "1111-partial",
            timestamp: String(day),
            blockNumber: "555",
            dailySupplySideRevenueUSD: "1000",
            dailyVolumeUSD: "1",
            // no totalValueLockedUSD
            pool: UNI_POOL_1111
          }
        ],
        _meta: { deployment: "QmUniswap", block: { number: 123, timestamp: day + 86_500 } }
      }
    };
    const poolsResp: UniswapPoolsResponse = {
      data: { usdtPools: [UNI_POOL_1111], daiPools: [] }
    };
    const fetchImpl = mockTwoPhaseFetch(poolsResp, {
      "0x1111111111111111111111111111111111111111": partialSnap
    });
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!, apiKey: "secret",
      fetchImpl,
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    const result = await adapter.getOpportunities({ stablecoins: ["USDT"] });
    expect(result.observations).toEqual([]);
    expect(result.gaps[0]?.reason).toMatch(/same daily snapshot/);
  });

  it("single-pool snapshot failure does not crash other pools", async () => {
    const poolsResp: UniswapPoolsResponse = {
      data: { usdtPools: [UNI_POOL_1111], daiPools: [UNI_POOL_2222] }
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query?: string };
      if (isPoolsQuery(body)) {
        return new Response(JSON.stringify(poolsResp), { status: 200 });
      }
      const match = body.query?.match(/pool:\s*"(0x[0-9a-f]+)"/i);
      const poolId = match?.[1]?.toLowerCase();
      if (poolId === "0x1111111111111111111111111111111111111111") {
        throw new Error("network timeout");
      }
      // 2222 returns valid data
      return new Response(JSON.stringify(uniswapSnapResponse("0x2222222222222222222222222222222222222222", {})), { status: 200 });
    });
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!, apiKey: "secret",
      fetchImpl,
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    const result = await adapter.getOpportunities({ stablecoins: ["USDT", "DAI"] });
    // Pool 2222 should succeed even though 1111 failed
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.poolAddress).toBe("0x2222222222222222222222222222222222222222");
    // 1111 should be a gap
    expect(result.gaps.some(g => g.poolAddress === "0x1111111111111111111111111111111111111111")).toBe(true);
  });

  it("pools query failure throws without leaking credentials", async () => {
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

  it("does not leak credentials from HTTP errors", async () => {
    const adapter = new UniswapV3YieldAdapter({
      source: DEX_YIELD_SOURCES[0]!,
      apiKey: "my-secret-key",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      ),
      now: () => new Date("2026-09-11T12:00:00.000Z")
    });
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.toThrow("Uniswap V3 Graph request failed with HTTP 401");
    await expect(adapter.getOpportunities({ stablecoins: ["USDT"] }))
      .rejects.not.toThrow(/my-secret-key/);
  });
});

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
