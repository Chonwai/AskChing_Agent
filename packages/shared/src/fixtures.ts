import type { MarketObservation } from "./schemas.js";

/**
 * Fixture coverage matrix (see plan §8.3):
 *   USDC: supply_apy × 6 live protocols; borrow_apy × 2; tvl × 2; utilization × 3
 *   USDT: supply_apy × 2; tvl × 1
 *   DAI:  supply_apy × 2
 *   WETH: supply_apy × 2; borrow_apy × 1; tvl × 1
 * 21 observations total.
 */
export const MARKET_FIXTURES: readonly MarketObservation[] = [
  // ── USDC ────────────────────────────────────────────────────────
  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 4.25, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_100, timestamp: "2026-09-08T00:05:00.000Z", queryHash: "sha256:fixture-aave-usdc-supply-apy" },
  { metric: "borrow_apy", asset: "USDC", rateType: "variable", value: 6.80, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_100, timestamp: "2026-09-08T00:05:00.000Z", queryHash: "sha256:fixture-aave-usdc-borrow-apy" },
  { metric: "tvl", asset: "USDC", value: 1_250_000_000, unit: "usd", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_100, timestamp: "2026-09-08T00:05:00.000Z", queryHash: "sha256:fixture-aave-usdc-tvl" },
  { metric: "utilization", asset: "USDC", value: 78.4, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_100, timestamp: "2026-09-08T00:05:00.000Z", queryHash: "sha256:fixture-aave-usdc-utilization" },

  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 3.14, unit: "percent", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_000, timestamp: "2026-09-08T00:00:00.000Z", queryHash: "sha256:fixture-compound-usdc-supply-apy" },
  { metric: "borrow_apy", asset: "USDC", rateType: "variable", value: 5.20, unit: "percent", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_000, timestamp: "2026-09-08T00:00:00.000Z", queryHash: "sha256:fixture-compound-usdc-borrow-apy" },
  { metric: "tvl", asset: "USDC", value: 890_000_000, unit: "usd", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_000, timestamp: "2026-09-08T00:00:00.000Z", queryHash: "sha256:fixture-compound-usdc-tvl" },
  { metric: "utilization", asset: "USDC", value: 86.2, unit: "percent", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_000, timestamp: "2026-09-08T00:00:00.000Z", queryHash: "sha256:fixture-compound-usdc-utilization" },

  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 2.95, unit: "percent", protocol: "spark-lend", subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", deploymentId: "fixture:spark-lend-mainnet", block: 21_100_050, timestamp: "2026-09-08T00:02:30.000Z", queryHash: "sha256:fixture-spark-usdc-supply-apy" },
  { metric: "utilization", asset: "USDC", value: 92.5, unit: "percent", protocol: "spark-lend", subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", deploymentId: "fixture:spark-lend-mainnet", block: 21_100_050, timestamp: "2026-09-08T00:02:30.000Z", queryHash: "sha256:fixture-spark-usdc-utilization" },

  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 3.55, unit: "percent", protocol: "aave-v2", subgraphId: "C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j", deploymentId: "fixture:aave-v2-mainnet", block: 21_100_070, timestamp: "2026-09-08T00:03:30.000Z", queryHash: "sha256:fixture-aave-v2-usdc-supply-apy" },

  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 4.10, unit: "percent", protocol: "uwu-lend", subgraphId: "CZBD7e8VGvNa6WkBHZAaC688bsZ35UvAM1AuDdVng2aE", deploymentId: "fixture:uwu-lend-mainnet", block: 21_100_080, timestamp: "2026-09-08T00:04:00.000Z", queryHash: "sha256:fixture-uwu-usdc-supply-apy" },

  { metric: "supply_apy", asset: "USDC", rateType: "variable", value: 3.72, unit: "percent", protocol: "zerolend", subgraphId: "4Zf4doH54RDit9KVsfCp3MkjrP3szhJZwvw2z5PHczx9", deploymentId: "fixture:zerolend-mainnet", block: 21_100_090, timestamp: "2026-09-08T00:04:30.000Z", queryHash: "sha256:fixture-zerolend-usdc-supply-apy" },

  // ── USDT ────────────────────────────────────────────────────────
  { metric: "supply_apy", asset: "USDT", rateType: "variable", value: 4.05, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_110, timestamp: "2026-09-08T00:06:00.000Z", queryHash: "sha256:fixture-aave-usdt-supply-apy" },
  { metric: "supply_apy", asset: "USDT", rateType: "variable", value: 3.02, unit: "percent", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_010, timestamp: "2026-09-08T00:01:00.000Z", queryHash: "sha256:fixture-compound-usdt-supply-apy" },
  { metric: "tvl", asset: "USDT", value: 980_000_000, unit: "usd", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_110, timestamp: "2026-09-08T00:06:00.000Z", queryHash: "sha256:fixture-aave-usdt-tvl" },

  // ── DAI ─────────────────────────────────────────────────────────
  { metric: "supply_apy", asset: "DAI", rateType: "variable", value: 3.80, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_120, timestamp: "2026-09-08T00:07:00.000Z", queryHash: "sha256:fixture-aave-dai-supply-apy" },
  { metric: "supply_apy", asset: "DAI", rateType: "variable", value: 2.88, unit: "percent", protocol: "spark-lend", subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", deploymentId: "fixture:spark-lend-mainnet", block: 21_100_060, timestamp: "2026-09-08T00:03:00.000Z", queryHash: "sha256:fixture-spark-dai-supply-apy" },

  // ── WETH ────────────────────────────────────────────────────────
  { metric: "supply_apy", asset: "WETH", rateType: "variable", value: 1.20, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_130, timestamp: "2026-09-08T00:08:00.000Z", queryHash: "sha256:fixture-aave-weth-supply-apy" },
  { metric: "supply_apy", asset: "WETH", rateType: "variable", value: 0.95, unit: "percent", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_020, timestamp: "2026-09-08T00:01:30.000Z", queryHash: "sha256:fixture-compound-weth-supply-apy" },
  { metric: "borrow_apy", asset: "WETH", rateType: "variable", value: 2.10, unit: "percent", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_130, timestamp: "2026-09-08T00:08:00.000Z", queryHash: "sha256:fixture-aave-weth-borrow-apy" },
  { metric: "tvl", asset: "WETH", value: 2_100_000_000, unit: "usd", protocol: "aave-v3", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", deploymentId: "fixture:aave-v3-mainnet", block: 21_100_130, timestamp: "2026-09-08T00:08:00.000Z", queryHash: "sha256:fixture-aave-weth-tvl" },
  { metric: "tvl", asset: "WETH", value: 1_650_000_000, unit: "usd", protocol: "compound-v3", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", deploymentId: "fixture:compound-v3-mainnet", block: 21_100_020, timestamp: "2026-09-08T00:01:30.000Z", queryHash: "sha256:fixture-compound-weth-tvl" }
] as const;
