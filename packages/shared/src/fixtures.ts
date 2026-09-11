import type { MarketObservation, TrendPoint } from "./schemas.js";
import { TrendPointSchema } from "./schemas.js";

/**
 * Fixture coverage matrix (see plan §8.3):
 *   USDC: supply_apy × 6 live protocols; borrow_apy × 2; tvl × 2; utilization × 3
 *   USDT: supply_apy × 2; tvl × 1
 *   DAI:  supply_apy × 2
 *   WETH: supply_apy × 2; borrow_apy × 1; tvl × 1
 * 21 spot observations total.
 *
 * Historical coverage (`MARKET_HISTORY_FIXTURES` below) adds the time dimension
 * for the same USDC markets: supply_apy × 3 protocols × 7 days and
 * utilization × 3 protocols × 7 days = 42 cited trend points.
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

  // NOTE: uwu-lend and zerolend fixtures were removed on 2026-09-12.
  // Both claimed USDC observations that the live deployments cannot serve:
  // uwu-lend's mainnet markets list sifu/sDAI/sSPELL/USDT (no USDC), and every
  // zerolend mainnet market is isActive=false with TVL 0. Keeping fixture rows
  // that live mode can never reproduce made the fixture set a false promise.
  // `pnpm probe:protocols` records the evidence.

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

// ── Market history fixtures (v1.1 `analyze_trends`) ────────────────
// days 0..6 cover 2026-09-02 → 2026-09-08 (UTC). The final day of every series
// deliberately equals the matching MARKET_FIXTURES spot value, so a trend read
// and a spot read of the same fixture set agree on the latest observation.
const HISTORY_START_UTC = Date.UTC(2026, 8, 2); // 2026-09-02T00:00:00.000Z
const MS_PER_DAY = 86_400_000;
const BLOCKS_PER_DAY = 7_200; // 12s blocks on mainnet

interface HistorySeriesSpec {
  metric: "supply_apy" | "utilization";
  protocol: string;
  subgraphId: string;
  deploymentId: string;
  /** Query-hash prefix, matching the spot fixture naming for this protocol. */
  queryPrefix: string;
  /** Snapshot offset within the day, aligned with the spot fixture timestamp. */
  timeOffsetSeconds: number;
  /** Block number of the newest snapshot (days = 6); earlier days step back. */
  latestBlock: number;
  /** Seven values, oldest first (days 0 → 6). */
  values: readonly number[];
}

const USDC_HISTORY_SERIES: readonly HistorySeriesSpec[] = [
  {
    metric: "supply_apy",
    protocol: "aave-v3",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    deploymentId: "fixture:aave-v3-mainnet",
    queryPrefix: "aave",
    timeOffsetSeconds: 300,
    latestBlock: 21_100_100,
    values: [3.80, 3.86, 3.95, 4.02, 4.10, 4.18, 4.25]
  },
  {
    metric: "supply_apy",
    protocol: "compound-v3",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    deploymentId: "fixture:compound-v3-mainnet",
    queryPrefix: "compound",
    timeOffsetSeconds: 0,
    latestBlock: 21_100_000,
    values: [3.30, 3.26, 3.24, 3.20, 3.18, 3.16, 3.14]
  },
  {
    metric: "supply_apy",
    protocol: "spark-lend",
    subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
    deploymentId: "fixture:spark-lend-mainnet",
    queryPrefix: "spark",
    timeOffsetSeconds: 150,
    latestBlock: 21_100_050,
    values: [2.90, 2.91, 2.92, 2.93, 2.94, 2.95, 2.95]
  },
  {
    metric: "utilization",
    protocol: "aave-v3",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
    deploymentId: "fixture:aave-v3-mainnet",
    queryPrefix: "aave",
    timeOffsetSeconds: 300,
    latestBlock: 21_100_100,
    values: [77.9, 78.0, 78.2, 78.1, 78.3, 78.4, 78.4]
  },
  {
    metric: "utilization",
    protocol: "compound-v3",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
    deploymentId: "fixture:compound-v3-mainnet",
    queryPrefix: "compound",
    timeOffsetSeconds: 0,
    latestBlock: 21_100_000,
    values: [84.6, 84.9, 85.2, 85.5, 85.8, 86.0, 86.2]
  },
  {
    metric: "utilization",
    protocol: "spark-lend",
    subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si",
    deploymentId: "fixture:spark-lend-mainnet",
    queryPrefix: "spark",
    timeOffsetSeconds: 150,
    latestBlock: 21_100_050,
    values: [78.0, 80.0, 82.5, 85.0, 88.0, 90.5, 92.5]
  }
] as const;

function buildHistoryPoints(spec: HistorySeriesSpec): TrendPoint[] {
  const lastDay = spec.values.length - 1;
  const metricSlug = spec.metric.replace(/_/g, "-");
  return spec.values.map((value, days) =>
    // Parsed through TrendPointSchema so a malformed citation spine fails at
    // import time rather than leaking into an MCP response.
    TrendPointSchema.parse({
      metric: spec.metric,
      asset: "USDC",
      rateType: spec.metric === "supply_apy" ? "variable" : undefined,
      value,
      unit: "percent",
      protocol: spec.protocol,
      subgraphId: spec.subgraphId,
      deploymentId: spec.deploymentId,
      block: spec.latestBlock - (lastDay - days) * BLOCKS_PER_DAY,
      timestamp: new Date(
        HISTORY_START_UTC + days * MS_PER_DAY + spec.timeOffsetSeconds * 1000
      ).toISOString(),
      queryHash: `sha256:fixture-${spec.queryPrefix}-usdc-${metricSlug}-d${days}`,
      days
    })
  );
}

export const MARKET_HISTORY_FIXTURES: readonly TrendPoint[] =
  USDC_HISTORY_SERIES.flatMap(buildHistoryPoints);
