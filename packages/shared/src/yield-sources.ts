import type { YieldVenue } from "./schemas.js";

export const CORE_STABLECOIN_ADDRESSES = {
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  DAI: "0x6b175474e89094c44da98b954eedeac495271d0f"
} as const;

export interface DexYieldSource {
  venue: Exclude<YieldVenue, "lending">;
  chain: "ethereum-mainnet";
  network: "mainnet";
  subgraphId: string;
  explorerUrl: string;
  live: boolean;
  note?: string;
}

export const DEX_YIELD_SOURCES: readonly DexYieldSource[] = [
  {
    venue: "uniswap-v3",
    chain: "ethereum-mainnet",
    network: "mainnet",
    subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
    explorerUrl:
      "https://thegraph.com/explorer/subgraphs/4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
    live: true
  },
  {
    venue: "curve",
    chain: "ethereum-mainnet",
    network: "mainnet",
    subgraphId: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
    explorerUrl:
      "https://thegraph.com/explorer/subgraphs/3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF",
    live: true
  }
];

export const LIVE_DEX_YIELD_SOURCES = DEX_YIELD_SOURCES.filter(
  source => source.live
);
