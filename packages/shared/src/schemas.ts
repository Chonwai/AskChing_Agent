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
