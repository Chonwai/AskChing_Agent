import { describe, expect, it } from "vitest";

import {
  CORE_STABLECOIN_ADDRESSES,
  DEX_YIELD_SOURCES,
  LIVE_DEX_YIELD_SOURCES
} from "./yield-sources.js";

describe("DEX yield source registry", () => {
  it("pins the approved Ethereum source candidates as pending probes", () => {
    expect(DEX_YIELD_SOURCES).toEqual([
      expect.objectContaining({
        venue: "uniswap-v3",
        subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
        live: false,
        note: "Pending exact-query credentialed probe."
      }),
      expect.objectContaining({
        venue: "curve",
        subgraphId: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
        live: false,
        note: "Pending exact-query credentialed probe."
      })
    ]);
    expect(LIVE_DEX_YIELD_SOURCES).toEqual([]);
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
