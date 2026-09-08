import { z } from "zod";

export const MarketMetricSchema = z.enum(["usdc_supply_apy"]);
export type MarketMetric = z.infer<typeof MarketMetricSchema>;

export const ProtocolSchema = z.enum(["aave-v3", "compound-v3", "spark-lend"]);
export type ProtocolSlug = z.infer<typeof ProtocolSchema>;

export const RateTypeSchema = z.literal("variable");

export const CitationSchema = z.object({
  value: z.number().finite(),
  unit: z.literal("percent"),
  protocol: ProtocolSchema,
  subgraphId: z.string().min(1),
  deploymentId: z.string().min(1).optional(),
  block: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(),
  queryHash: z.string().min(1)
});
export type Citation = z.infer<typeof CitationSchema>;

export const MarketObservationSchema = CitationSchema.extend({
  metric: MarketMetricSchema,
  rateType: RateTypeSchema
});
export type MarketObservation = z.infer<typeof MarketObservationSchema>;

export const ComparisonRowSchema = MarketObservationSchema.extend({
  rank: z.number().int().positive()
});

export const ComparisonSourceSchema = CitationSchema.pick({
  protocol: true,
  subgraphId: true,
  deploymentId: true,
  block: true,
  timestamp: true,
  queryHash: true
});

export const ComparisonSchema = z.object({
  metric: MarketMetricSchema,
  asOf: z.string().datetime(),
  rows: z.array(ComparisonRowSchema).min(2),
  caveats: z.array(z.string()),
  sources: z.array(ComparisonSourceSchema).min(2)
});
export type Comparison = z.infer<typeof ComparisonSchema>;
