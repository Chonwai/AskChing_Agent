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

// ── Backward-compat helpers ─────────────────────────────────────────
/** 舊 Comparison（無 asset 欄位）的寬鬆解析，用於讀取舊快照 */
export const LegacyComparisonSchema = z.object({
  metric: z.union([MarketMetricIdSchema, LegacyMetricAliasSchema]),
  asOf: z.string().datetime(),
  rows: z
    .array(
      ComparisonRowSchema.omit({ asset: true }).extend({
        asset: AssetSymbolSchema.optional()
      })
    )
    .min(2),
  caveats: z.array(z.string()),
  sources: z
    .array(
      ComparisonSourceSchema.omit({ asset: true }).extend({
        asset: AssetSymbolSchema.optional()
      })
    )
    .min(2)
});
