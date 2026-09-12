import { z } from "zod";

// ── Metric ──────────────────────────────────────────────────────────
export const MarketMetricIdSchema = z.enum([
  "supply_apy",
  "borrow_apy",
  "tvl",
  "utilization"
]);
export type MarketMetricId = z.infer<typeof MarketMetricIdSchema>;

/** @deprecated 僅用於 backward-compat 邊界正規化，請用 MarketMetricId + asset */
export const LegacyMetricAliasSchema = z.enum(["usdc_supply_apy"]);
export type LegacyMetricAlias = z.infer<typeof LegacyMetricAliasSchema>;

/**
 * @deprecated 由 MarketMetricIdSchema 取代。僅保留供既有呼叫以舊值 `"usdc_supply_apy"`
 * 編譯/執行；新程式碼一律使用 MarketMetricIdSchema。
 */
export const MarketMetricSchema = LegacyMetricAliasSchema;
/** @deprecated 由 MarketMetricId 取代。 */
export type MarketMetric = LegacyMetricAlias;

// ── Asset ───────────────────────────────────────────────────────────
export const AssetSymbolSchema = z
  .string()
  .regex(/^[A-Z0-9]{2,10}$/, "Asset symbol must be 2-10 uppercase alphanumerics")
  .describe("Normalized asset symbol, e.g. USDC, USDT, DAI, WETH");
export type AssetSymbol = z.infer<typeof AssetSymbolSchema>;

// ── Protocol ────────────────────────────────────────────────────────
// D3: enum → string，驗證由 PROTOCOL_REGISTRY 負責
export const ProtocolSchema = z
  .string()
  .min(1)
  .describe("Protocol slug validated against PROTOCOL_REGISTRY");
export type ProtocolSlug = z.infer<typeof ProtocolSchema>;

// ── Unit ────────────────────────────────────────────────────────────
export const UnitSchema = z.enum(["percent", "usd"]);
export type Unit = z.infer<typeof UnitSchema>;

// ── Rate Type ───────────────────────────────────────────────────────
export const RateTypeSchema = z.enum(["variable", "stable", "fixed"]);
export type RateType = z.infer<typeof RateTypeSchema>;

// ── Citation ────────────────────────────────────────────────────────
export const CitationSchema = z.object({
  value: z.number().finite(),
  unit: UnitSchema,
  protocol: ProtocolSchema,
  asset: AssetSymbolSchema,
  subgraphId: z.string().min(1),
  deploymentId: z.string().min(1).optional(),
  block: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(),
  queryHash: z.string().min(1)
});
export type Citation = z.infer<typeof CitationSchema>;

// ── MarketObservation ───────────────────────────────────────────────
export const MarketObservationSchema = CitationSchema.extend({
  metric: MarketMetricIdSchema,
  // rateType 僅對 supply_apy / borrow_apy 有意義；tvl / utilization 為 undefined
  rateType: RateTypeSchema.optional()
});
export type MarketObservation = z.infer<typeof MarketObservationSchema>;

// ── Comparison ──────────────────────────────────────────────────────
export const ComparisonRowSchema = MarketObservationSchema.extend({
  rank: z.number().int().positive()
});

export const ComparisonSourceSchema = CitationSchema.pick({
  protocol: true,
  asset: true,
  subgraphId: true,
  deploymentId: true,
  block: true,
  timestamp: true,
  queryHash: true
});

export const ComparisonSchema = z.object({
  metric: MarketMetricIdSchema,
  asset: AssetSymbolSchema,
  asOf: z.string().datetime(),
  rows: z.array(ComparisonRowSchema).min(2),
  caveats: z.array(z.string()),
  sources: z.array(ComparisonSourceSchema).min(2)
});
export type Comparison = z.infer<typeof ComparisonSchema>;

// ── Analysis ──────────────────────────────────────────────────────
export const AnalysisObjectiveSchema = z.enum([
  "yield_opportunity",
  "liquidity_stress",
  "evidence_quality"
]);
export type AnalysisObjective = z.infer<typeof AnalysisObjectiveSchema>;

export const AnalysisSeveritySchema = z.enum(["info", "watch", "high"]);
export type AnalysisSeverity = z.infer<typeof AnalysisSeveritySchema>;

export const AnalysisConfidenceSchema = z.enum(["high", "medium", "low"]);
export type AnalysisConfidence = z.infer<typeof AnalysisConfidenceSchema>;

export const AnalysisCitationSchema = ComparisonSourceSchema.extend({
  metric: MarketMetricIdSchema
});
export type AnalysisCitation = z.infer<typeof AnalysisCitationSchema>;

export const AnalysisSupportingValueSchema = MarketObservationSchema;
export type AnalysisSupportingValue = z.infer<
  typeof AnalysisSupportingValueSchema
>;

export const AnalysisFindingSchema = z.object({
  severity: AnalysisSeveritySchema,
  claim: z.string().min(1),
  calculation: z.string().min(1),
  supportingValues: z.array(AnalysisSupportingValueSchema),
  citations: z.array(AnalysisCitationSchema).min(2),
  confidence: AnalysisConfidenceSchema,
  caveats: z.array(z.string())
});
export type AnalysisFinding = z.infer<typeof AnalysisFindingSchema>;

export const AnalysisGapSchema = z.object({
  metric: MarketMetricIdSchema.optional(),
  protocol: ProtocolSchema.optional(),
  reason: z.string().min(1)
});
export type AnalysisGap = z.infer<typeof AnalysisGapSchema>;

export const AnalyzeMarketsResultSchema = z.object({
  objective: AnalysisObjectiveSchema,
  asset: AssetSymbolSchema,
  protocols: z.array(ProtocolSchema).min(2),
  metrics: z.array(MarketMetricIdSchema).min(1),
  summary: z.string().min(1),
  findings: z.array(AnalysisFindingSchema).min(1),
  gaps: z.array(AnalysisGapSchema),
  asOf: z.string().datetime()
});
export type AnalyzeMarketsResult = z.infer<typeof AnalyzeMarketsResultSchema>;

// ── Trend Analysis (v1.1) ─────────────────────────────────────────
// Time-series counterpart of the spot-only analysis above: every historical
// point keeps the same citation invariant, and each finding must be backed by
// at least two cited points.
export const TrendWindowSchema = z.enum(["7d", "30d"]);
export type TrendWindow = z.infer<typeof TrendWindowSchema>;

/**
 * Single source of truth for how deep a window looks back. Both the fixture
 * and live data sources slice their history with this value, so the MCP window
 * label and the actual query depth cannot drift apart.
 */
export const TREND_WINDOW_DAYS: Record<TrendWindow, number> = {
  "7d": 7,
  "30d": 30
};

/** A historical point = a full MarketObservation plus its snapshot day index. */
export const TrendPointSchema = MarketObservationSchema.extend({
  days: z.number().int().nonnegative()
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const TrendSeriesSchema = z.object({
  protocol: ProtocolSchema,
  metric: MarketMetricIdSchema,
  unit: UnitSchema,
  points: z.array(TrendPointSchema).min(2)
});
export type TrendSeries = z.infer<typeof TrendSeriesSchema>;

export const TrendDirectionSchema = z.enum(["rising", "falling", "flat"]);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

export const TrendStatsSchema = z.object({
  latest: z.number().finite(),
  earliest: z.number().finite(),
  min: z.number().finite(),
  max: z.number().finite(),
  change: z.number().finite(),
  changePct: z.number().finite(),
  slopePerDay: z.number().finite(),
  direction: TrendDirectionSchema,
  volatility: z.number().finite()
});
export type TrendStats = z.infer<typeof TrendStatsSchema>;

export const TrendFindingSchema = z.object({
  severity: AnalysisSeveritySchema,
  protocol: ProtocolSchema,
  claim: z.string().min(1),
  calculation: z.string().min(1),
  stats: TrendStatsSchema,
  points: z.array(TrendPointSchema).min(2),
  citations: z.array(AnalysisCitationSchema).min(2),
  confidence: AnalysisConfidenceSchema,
  caveats: z.array(z.string())
});
export type TrendFinding = z.infer<typeof TrendFindingSchema>;

export const AnalyzeTrendsResultSchema = z.object({
  metric: MarketMetricIdSchema,
  asset: AssetSymbolSchema,
  protocols: z.array(ProtocolSchema).min(2),
  window: TrendWindowSchema,
  summary: z.string().min(1),
  findings: z.array(TrendFindingSchema).min(1),
  gaps: z.array(AnalysisGapSchema),
  asOf: z.string().datetime()
});
export type AnalyzeTrendsResult = z.infer<typeof AnalyzeTrendsResultSchema>;

// ── Cross-venue yield discovery (v1.2) ───────────────────────────
export const YieldVenueSchema = z.enum([
  "lending",
  "uniswap-v3",
  "curve"
]);
export type YieldVenue = z.infer<typeof YieldVenueSchema>;

export const YieldCategorySchema = z.enum(["lending", "dex_lp"]);
export type YieldCategory = z.infer<typeof YieldCategorySchema>;

export const YieldRiskFlagSchema = z.enum([
  "spot_rate_variable",
  "fee_returns_variable",
  "stablecoin_depeg",
  "smart_contract",
  "impermanent_loss",
  "excludes_incentives_gas_and_compounding",
  "concentrated_liquidity",
  "position_range_dependent",
  "multi_asset_pool"
]);
export type YieldRiskFlag = z.infer<typeof YieldRiskFlagSchema>;

const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-f0-9]{40}$/, "Expected a lower-case Ethereum address");

export const YieldCitationSchema = z.object({
  venue: YieldVenueSchema.exclude(["lending"]),
  poolAddress: EthereumAddressSchema,
  subgraphId: z.string().min(1),
  deploymentId: z.string().min(1).optional(),
  block: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(),
  queryHash: z.string().min(1),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime()
});
export type YieldCitation = z.infer<typeof YieldCitationSchema>;

export const DexYieldObservationSchema = YieldCitationSchema.extend({
  asset: z.literal("USDC"),
  tokenSymbols: z.array(z.enum(["USDC", "USDT", "DAI"])).min(2),
  feeTier: z.number().int().positive().optional(),
  dailySupplySideFeesUsd: z.number().finite().nonnegative(),
  volume24hUsd: z.number().finite().nonnegative(),
  tvlUsd: z.number().finite().positive(),
  estimatedFeeApr: z.number().finite().nonnegative()
});
export type DexYieldObservation = z.infer<typeof DexYieldObservationSchema>;

export const LendingYieldOpportunitySchema = z.object({
  category: z.literal("lending"),
  rank: z.number().int().positive(),
  protocol: ProtocolSchema,
  asset: z.literal("USDC"),
  supplyApy: z.number().finite().nonnegative(),
  utilization: z.number().finite().nonnegative().optional(),
  tvlUsd: z.number().finite().nonnegative().optional(),
  calculation: z.string().min(1),
  citations: z.array(AnalysisCitationSchema).min(2),
  riskFlags: z.array(YieldRiskFlagSchema),
  caveats: z.array(z.string())
});
export type LendingYieldOpportunity = z.infer<
  typeof LendingYieldOpportunitySchema
>;

export const DexLpYieldOpportunitySchema = DexYieldObservationSchema.extend({
  category: z.literal("dex_lp"),
  rank: z.number().int().positive(),
  calculation: z.string().min(1),
  riskFlags: z.array(YieldRiskFlagSchema),
  caveats: z.array(z.string())
});
export type DexLpYieldOpportunity = z.infer<
  typeof DexLpYieldOpportunitySchema
>;

export const YieldDiscoveryGapSchema = z.object({
  venue: YieldVenueSchema.optional(),
  poolAddress: EthereumAddressSchema.optional(),
  reason: z.string().min(1)
});
export type YieldDiscoveryGap = z.infer<typeof YieldDiscoveryGapSchema>;

export const YieldDiscoveryWindowSchema = z.object({
  kind: z.literal("latest_complete_utc_day"),
  start: z.string().datetime(),
  end: z.string().datetime()
});

export const DiscoverYieldsResultSchema = z.object({
  asset: z.literal("USDC"),
  chain: z.literal("ethereum-mainnet"),
  window: YieldDiscoveryWindowSchema,
  lending: z.array(LendingYieldOpportunitySchema),
  dexLp: z.array(DexLpYieldOpportunitySchema),
  crossDexWinner: DexLpYieldOpportunitySchema.nullable(),
  gaps: z.array(YieldDiscoveryGapSchema),
  methodology: z.array(z.string().min(1)),
  asOf: z.string().datetime()
});
export type DiscoverYieldsResult = z.infer<
  typeof DiscoverYieldsResultSchema
>;
