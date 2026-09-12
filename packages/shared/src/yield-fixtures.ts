import { DexYieldObservationSchema } from "./schemas.js";

const base = {
  asset: "USDC",
  windowStart: "2026-09-10T00:00:00.000Z",
  windowEnd: "2026-09-11T00:00:00.000Z",
  timestamp: "2026-09-11T00:05:00.000Z",
  block: 21_200_000
} as const;

export const DEX_YIELD_FIXTURES = [
  { ...base, venue: "uniswap-v3", poolAddress: "0x1111111111111111111111111111111111111111", tokenSymbols: ["USDC", "USDT"], feeTier: 500, dailySupplySideFeesUsd: 8_000, volume24hUsd: 16_000_000, tvlUsd: 40_000_000, estimatedFeeApr: 7.3, subgraphId: "fixture:uniswap-v3", deploymentId: "fixture:uniswap-v3-mainnet", queryHash: "sha256:fixture-uniswap-usdc-usdt-500" },
  { ...base, venue: "uniswap-v3", poolAddress: "0x2222222222222222222222222222222222222222", tokenSymbols: ["DAI", "USDC"], feeTier: 100, dailySupplySideFeesUsd: 1_500, volume24hUsd: 15_000_000, tvlUsd: 20_000_000, estimatedFeeApr: 2.7375, subgraphId: "fixture:uniswap-v3", deploymentId: "fixture:uniswap-v3-mainnet", queryHash: "sha256:fixture-uniswap-dai-usdc-100" },
  { ...base, venue: "curve", poolAddress: "0x3333333333333333333333333333333333333333", tokenSymbols: ["USDC", "USDT", "DAI"], dailySupplySideFeesUsd: 4_000, volume24hUsd: 10_000_000, tvlUsd: 50_000_000, estimatedFeeApr: 2.92, subgraphId: "fixture:curve", deploymentId: "fixture:curve-mainnet", queryHash: "sha256:fixture-curve-3pool" },
  { ...base, venue: "uniswap-v3", poolAddress: "0x4444444444444444444444444444444444444444", tokenSymbols: ["USDC", "DAI"], feeTier: 10000, dailySupplySideFeesUsd: 5_000, volume24hUsd: 500_000, tvlUsd: 500_000, estimatedFeeApr: 365, subgraphId: "fixture:uniswap-v3", deploymentId: "fixture:uniswap-v3-mainnet", queryHash: "sha256:fixture-uniswap-below-floor" }
].map(value => DexYieldObservationSchema.parse(value));
