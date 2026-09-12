import { describe, expect, it } from "vitest";

import {
  CORE_STABLECOIN_ADDRESSES,
  DEX_YIELD_SOURCES,
  LIVE_DEX_YIELD_SOURCES
} from "./yield-sources.js";

describe("DEX yield source registry", () => {
  it("pins the approved Ethereum DEX sources as live after credentialed probes", () => {
    expect(DEX_YIELD_SOURCES).toEqual([
      expect.objectContaining({
        venue: "uniswap-v3",
        subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
        live: true
      }),
      expect.objectContaining({
        venue: "curve",
        subgraphId: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
        live: true
      })
    ]);
    expect(LIVE_DEX_YIELD_SOURCES).toHaveLength(2);
    // Enabled sources carry no pending probe note.
    for (const source of LIVE_DEX_YIELD_SOURCES) {
      expect(source.note).toBeUndefined();
    }
  });

  it("uses canonical lower-case token addresses", () => {
    expect(CORE_STABLECOIN_ADDRESSES).toEqual({
      USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      DAI: "0x6b175474e89094c44da98b954eedeac495271d0f"
    });
    expect(
      Object.values(CORE_STABLECOIN_ADDRESSES).every(
        address => address === address.toLowerCase()
      )
    ).toBe(true);
  });

  it("requires notes only for disabled sources", () => {
    for (const source of DEX_YIELD_SOURCES) {
      if (source.live) {
        expect(source.note).toBeUndefined();
      } else {
        expect(source.note?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
