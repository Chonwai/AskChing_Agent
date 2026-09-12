import { describe, expect, it, vi } from "vitest";

import { createDexYieldDataSource } from "./yield-data-source.js";

const day = Date.parse("2026-09-10T00:00:00.000Z") / 1000;

function uniswapPayload() {
  return { data: {
    liquidityPoolDailySnapshots: [{
      id: "uni-day", timestamp: String(day), blockNumber: "123",
      dailySupplySideRevenueUSD: "200", dailyVolumeUSD: "400000", totalValueLockedUSD: "2000000",
      pool: { id: "0x1111111111111111111111111111111111111111", inputTokens: [
        { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" }
      ] }
    }],
    _meta: { deployment: "QmUni", block: { number: 123, timestamp: day + 86_500 } }
  } };
}

function curvePayload() {
  return { data: {
    liquidityPoolDailySnapshots: [{
      id: "curve-day", timestamp: String(day), blockNumber: "456",
      dailySupplySideRevenueUSD: "300", dailyVolumeUSD: "600000", totalValueLockedUSD: "3000000",
      pool: { id: "0x3333333333333333333333333333333333333333", inputTokens: [
        { id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        { id: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" }
      ] }
    }],
    _meta: { deployment: "QmCurve", block: { number: 999, timestamp: day + 86_500 } }
  } };
}

describe("createDexYieldDataSource", () => {
  it("returns deterministic requested fixtures without fetching or claiming live data", async () => {
    const fetchImpl = vi.fn(() => { throw new Error("fixtures must not fetch"); });
    const source = createDexYieldDataSource(
      { DEMO_LIVE: "0" }, fetchImpl as unknown as typeof fetch,
      () => new Date("2026-09-11T12:00:00.000Z")
    );
    const results = await source.getDexYieldOpportunities({
      venues: ["curve"], stablecoins: ["USDT"]
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]?.venue).toBe("curve");
    expect(results[0]?.observations).toHaveLength(1);
    expect(results[0]?.observations[0]?.deploymentId).toMatch(/^fixture:/);
  });

  it.each([
    ["uniswap-v3", "curve"],
    ["curve", "uniswap-v3"]
  ] as const)("keeps %s evidence when %s fails and redacts the key", async (success, failure) => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { operationName: string };
      const venue = body.operationName.includes("Uniswap") ? "uniswap-v3" : "curve";
      if (venue === failure) throw new Error("graph-key leaked by provider");
      return new Response(JSON.stringify(venue === "uniswap-v3" ? uniswapPayload() : curvePayload()), { status: 200 });
    });
    const source = createDexYieldDataSource(
      { DEMO_LIVE: "1", GRAPH_API_KEY: "graph-key" },
      fetchImpl as unknown as typeof fetch,
      () => new Date("2026-09-11T12:00:00.000Z")
    );
    const results = await source.getDexYieldOpportunities({
      venues: ["uniswap-v3", "curve"], stablecoins: ["USDT"]
    });

    expect(results.find(value => value.venue === success)?.observations).toHaveLength(1);
    const failed = results.find(value => value.venue === failure);
    expect(failed?.observations).toEqual([]);
    expect(JSON.stringify(failed?.gaps)).not.toContain("graph-key");
    expect(failed?.gaps[0]?.reason).toMatch(/unavailable/);
  });

  it("requires a Graph key only in live mode", async () => {
    const source = createDexYieldDataSource({ DEMO_LIVE: "1" });
    await expect(source.getDexYieldOpportunities({ venues: ["curve"], stablecoins: ["DAI"] }))
      .rejects.toThrow("GRAPH_API_KEY is required when DEMO_LIVE=1");
  });
});
