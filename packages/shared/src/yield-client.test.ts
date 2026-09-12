import { describe, expect, it, vi } from "vitest";

import { UniswapV3YieldAdapter } from "./yield-client.js";
import { DEX_YIELD_SOURCES } from "./yield-sources.js";

const day = Date.parse("2026-09-10T00:00:00.000Z") / 1000;

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
