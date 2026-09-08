import type { MarketObservation } from "./schemas.js";

export const MARKET_FIXTURES: readonly MarketObservation[] = [
  {
    metric: "usdc_supply_apy",
    rateType: "variable",
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
    rateType: "variable",
    value: 3.14,
    unit: "percent",
    protocol: "compound-v3",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    deploymentId: "fixture:compound-v3-mainnet",
    block: 21_100_000,
    timestamp: "2026-09-08T00:00:00.000Z",
    queryHash: "sha256:fixture-compound-usdc-supply-apy"
  },
  {
    metric: "usdc_supply_apy",
    rateType: "variable",
    value: 2.95,
    unit: "percent",
    protocol: "spark-lend",
    subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
    deploymentId: "fixture:spark-lend-mainnet",
    block: 21_100_050,
    timestamp: "2026-09-08T00:02:30.000Z",
    queryHash: "sha256:fixture-spark-usdc-supply-apy"
  }
] as const;
