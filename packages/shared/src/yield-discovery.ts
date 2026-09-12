import {
  DexYieldObservationSchema,
  DiscoverYieldsResultSchema,
  MarketObservationSchema,
  YieldDiscoveryGapSchema,
  type AnalysisCitation,
  type DexLpYieldOpportunity,
  type DexYieldObservation,
  type DiscoverYieldsResult,
  type LendingYieldOpportunity,
  type MarketObservation,
  type YieldDiscoveryGap
} from "./schemas.js";

export interface NormalizeYieldDiscoveryInput {
  lendingObservations: readonly unknown[];
  dexObservations: readonly unknown[];
  gaps: readonly YieldDiscoveryGap[];
  minTvlUsd: number;
  limitPerCategory: number;
  now: Date;
}

const DAY_MS = 86_400_000;

export function normalizeYieldDiscovery(
  input: NormalizeYieldDiscoveryInput
): DiscoverYieldsResult {
  if (!Number.isFinite(input.minTvlUsd) || input.minTvlUsd < 0) {
    throw new Error("minTvlUsd must be a finite non-negative number");
  }
  if (!Number.isInteger(input.limitPerCategory) || input.limitPerCategory < 1) {
    throw new Error("limitPerCategory must be a positive integer");
  }
  const lendingRaw = input.lendingObservations.map(value => MarketObservationSchema.parse(value));
  const dexRaw = input.dexObservations.map(value => DexYieldObservationSchema.parse(value));
  if (lendingRaw.some(value => value.asset !== "USDC") || dexRaw.some(value => value.asset !== "USDC")) {
    throw new Error("Yield discovery accepts USDC observations only");
  }

  const gaps = input.gaps.map(value => YieldDiscoveryGapSchema.parse(value));
  const lending = normalizeLending(lendingRaw, input.minTvlUsd, gaps)
    .slice(0, input.limitPerCategory)
    .map((value, index) => ({ ...value, rank: index + 1 }));
  const validDex = validateDex(dexRaw, input.minTvlUsd, gaps);
  const { observations: windowedDex, commonWindow } = selectDexWindows(validDex, gaps);
  const rankedDex = windowedDex
    .sort((left, right) =>
      right.estimatedFeeApr - left.estimatedFeeApr ||
      left.venue.localeCompare(right.venue) ||
      left.poolAddress.localeCompare(right.poolAddress)
    )
    .map((value, index) => toDexOpportunity(value, index + 1));
  const dexLp = rankedDex.slice(0, input.limitPerCategory);
  const hasBothDexVenues = commonWindow !== undefined &&
    rankedDex.some(value => value.venue === "uniswap-v3") &&
    rankedDex.some(value => value.venue === "curve");
  const crossDexWinner = hasBothDexVenues ? rankedDex[0]! : null;

  if (!hasBothDexVenues && validDex.length > 0 && !gaps.some(value => /cross-DEX|common complete UTC day/.test(value.reason))) {
    gaps.push({ reason: "A cross-DEX winner requires qualifying Uniswap V3 and Curve evidence on a common complete UTC day." });
  }
  if (lending.length === 0 && dexLp.length === 0) {
    throw new Error(`No valid yield opportunities. Gaps: ${formatGaps(gaps)}`);
  }

  const window = resolveResultWindow(windowedDex, input.now);
  const evidenceTimes = [
    ...lendingRaw.map(value => value.timestamp),
    ...windowedDex.map(value => value.timestamp)
  ];
  const asOf = evidenceTimes.sort().at(-1) ?? input.now.toISOString();
  return DiscoverYieldsResultSchema.parse({
    asset: "USDC",
    chain: "ethereum-mainnet",
    window: { kind: "latest_complete_utc_day", ...window },
    lending,
    dexLp,
    crossDexWinner,
    gaps: dedupeGaps(gaps),
    methodology: [
      "Lending supply APY and DEX LP fee APR are filtered and ranked separately.",
      `DEX fee APR = daily supply-side fees / daily TVL × 365 × 100; minimum TVL ${input.minTvlUsd} USD.`,
      "DEX comparisons use the newest common complete UTC day when both venues provide one.",
      "Returns exclude incentives, gas, compounding, and position-specific execution."
    ],
    asOf
  });
}

function normalizeLending(
  observations: MarketObservation[],
  minTvlUsd: number,
  gaps: YieldDiscoveryGap[]
): Array<Omit<LendingYieldOpportunity, "rank">> {
  const supply = observations.filter(value =>
    value.metric === "supply_apy" && value.unit === "percent" && value.rateType === "variable"
  );
  if (new Set(supply.map(value => value.subgraphId)).size < 2) {
    if (supply.length > 0) gaps.push({ venue: "lending", reason: "Lending ranking requires at least two distinct cited subgraph sources." });
    return [];
  }
  return supply.flatMap(rate => {
    const context = observations.filter(value =>
      value.protocol === rate.protocol && ["utilization", "tvl"].includes(value.metric)
    );
    if (context.length === 0) {
      gaps.push({ venue: "lending", reason: `${rate.protocol} lacks a second cited context metric.` });
      return [];
    }
    const utilization = context.find(value => value.metric === "utilization");
    const tvl = context.find(value => value.metric === "tvl");
    if (tvl && tvl.value < minTvlUsd) return [];
    const citations = [rate, ...context].map(toAnalysisCitation);
    return [{
      category: "lending" as const,
      protocol: rate.protocol,
      asset: "USDC" as const,
      supplyApy: rate.value,
      utilization: utilization?.value,
      tvlUsd: tvl?.value,
      calculation: `Current variable supply APY reported by ${rate.protocol}: ${rate.value}%.`,
      citations,
      riskFlags: ["spot_rate_variable" as const, "stablecoin_depeg" as const, "smart_contract" as const],
      caveats: ["Spot supply APY can change and is not a forecast or financial recommendation."]
    }];
  }).sort((left, right) =>
    right.supplyApy - left.supplyApy || left.protocol.localeCompare(right.protocol)
  );
}

function toAnalysisCitation(value: MarketObservation): AnalysisCitation {
  return {
    metric: value.metric,
    protocol: value.protocol,
    asset: value.asset,
    subgraphId: value.subgraphId,
    deploymentId: value.deploymentId,
    block: value.block,
    timestamp: value.timestamp,
    queryHash: value.queryHash
  };
}

function validateDex(
  observations: DexYieldObservation[],
  minTvlUsd: number,
  gaps: YieldDiscoveryGap[]
): DexYieldObservation[] {
  return observations.filter(value => {
    if (value.tvlUsd < minTvlUsd) return false;
    const expectedApr = value.dailySupplySideFeesUsd / value.tvlUsd * 365 * 100;
    const tolerance = Math.max(1e-9, Math.abs(expectedApr) * 1e-9);
    if (Math.abs(value.estimatedFeeApr - expectedApr) > tolerance) {
      gaps.push({ venue: value.venue, poolAddress: value.poolAddress, reason: "Reported fee APR does not match its cited daily fee and TVL inputs." });
      return false;
    }
    if (Date.parse(value.windowEnd) - Date.parse(value.windowStart) !== DAY_MS) {
      gaps.push({ venue: value.venue, poolAddress: value.poolAddress, reason: "DEX evidence must cover exactly one complete UTC day." });
      return false;
    }
    return true;
  });
}

function selectDexWindows(
  observations: DexYieldObservation[],
  gaps: YieldDiscoveryGap[]
): { observations: DexYieldObservation[]; commonWindow?: string } {
  const venues = ["uniswap-v3", "curve"] as const;
  const windows = new Map(venues.map(venue => [
    venue,
    new Set(observations.filter(value => value.venue === venue).map(windowKey))
  ]));
  const common = [...windows.get("uniswap-v3")!]
    .filter(key => windows.get("curve")!.has(key))
    .sort()
    .at(-1);
  if (common) {
    return { observations: observations.filter(value => windowKey(value) === common), commonWindow: common };
  }
  const presentVenues = venues.filter(venue => windows.get(venue)!.size > 0);
  if (presentVenues.length === 2) {
    gaps.push({ reason: "Uniswap V3 and Curve have no common complete UTC day; venue-local results are not a cross-DEX comparison." });
  }
  const latestByVenue = new Map(presentVenues.map(venue => [venue, [...windows.get(venue)!].sort().at(-1)!]));
  return {
    observations: observations.filter(value => latestByVenue.get(value.venue) === windowKey(value))
  };
}

function toDexOpportunity(
  value: DexYieldObservation,
  rank: number
): DexLpYieldOpportunity {
  return {
    ...value,
    category: "dex_lp",
    rank,
    calculation: `${value.dailySupplySideFeesUsd} / ${value.tvlUsd} × 365 × 100 = ${value.estimatedFeeApr}% estimated fee APR.`,
    riskFlags: [
      "fee_returns_variable",
      "stablecoin_depeg",
      "smart_contract",
      "impermanent_loss",
      "excludes_incentives_gas_and_compounding",
      ...(value.venue === "uniswap-v3" ? ["concentrated_liquidity" as const, "position_range_dependent" as const] : []),
      ...(value.venue === "curve" && value.tokenSymbols.length > 2 ? ["multi_asset_pool" as const] : [])
    ],
    caveats: value.venue === "uniswap-v3"
      ? ["Pool-wide historical fee APR does not predict the return of a particular liquidity range."]
      : ["Historical pool fee APR is variable and excludes incentives." ]
  };
}

function windowKey(value: DexYieldObservation): string {
  // Bucket by UTC day of the window start so venues whose snapshots land at
  // slightly offset timestamps (e.g. 23:59:59 vs 23:52:59) still share a
  // common complete day. Fail-closed semantics are preserved: no shared
  // bucket still yields no cross-DEX winner.
  return String(Math.floor(Date.parse(value.windowStart) / DAY_MS));
}

function resolveResultWindow(
  observations: DexYieldObservation[],
  now: Date
): { start: string; end: string } {
  const latest = [...observations].sort((left, right) => left.windowEnd.localeCompare(right.windowEnd)).at(-1);
  if (latest) return { start: latest.windowStart, end: latest.windowEnd };
  const boundary = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    start: new Date(boundary - DAY_MS).toISOString(),
    end: new Date(boundary).toISOString()
  };
}

function dedupeGaps(gaps: YieldDiscoveryGap[]): YieldDiscoveryGap[] {
  const seen = new Set<string>();
  return gaps.filter(value => {
    const key = `${value.venue ?? ""}|${value.poolAddress ?? ""}|${value.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatGaps(gaps: YieldDiscoveryGap[]): string {
  return gaps.length === 0 ? "none reported" : gaps.map(value => value.reason).join("; ");
}
