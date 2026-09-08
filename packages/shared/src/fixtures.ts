import type { MarketObservation } from "./schemas.js";

export const MARKET_FIXTURES: readonly MarketObservation[] = [
  {
    metric: "usdc_supply_apy",
    value: 4.25,
    unit: "percent",
    protocol: "aave-v3",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    deploymentId: "fixture:aave-v3-mainnet",
    block: 21_100_100,
    timestamp: "2026-09-08T00:05:00.000Z",
    queryHash: "sha256:fixture-aave-usdc-supply-apy"
  },
  {
    metric: "usdc_supply_apy",
    value: 3.14,
    unit: "percent",
    protocol: "compound-v3",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    deploymentId: "fixture:compound-v3-mainnet",
    block: 21_100_000,
    timestamp: "2026-09-08T00:00:00.000Z",
    queryHash: "sha256:fixture-compound-usdc-supply-apy"
  }
] as const;

