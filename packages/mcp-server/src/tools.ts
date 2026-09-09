import {
  AssetSymbolSchema,
  compareObservations,
  ComparisonSourceSchema,
  resolveMetricId,
  type Comparison,
  type MarketDataSource,
  ProtocolSchema
} from "@askching/shared";
import { z } from "zod";

// ── Metric / asset field-level validation (H3) ─────────────────────
// MCP registration passes CoreSchema.shape to the SDK, which re-wraps it as a
// plain object. Schema-level superRefine on ZodEffects is NOT reflected there
// (normalizeObjectSchema returns undefined for ZodEffects), so metric/asset
// validation must live on the fields themselves for the exposed schema and the
// runtime MCP argument check to agree.
const MetricFieldSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        resolveMetricId(value);
        return true;
      } catch {
        return false;
      }
    },
    "Unknown metric or legacy alias"
  )
  .describe("MarketMetricId or legacy alias (usdc_supply_apy)");

const AssetFieldSchema = z
  .string()
  .min(1)
  .refine(
    (value) => AssetSymbolSchema.safeParse(value.toUpperCase()).success,
    "Asset symbol must be 2-10 uppercase alphanumerics"
  );

export const CompareMarketsCoreSchema = z.object({
  metric: MetricFieldSchema,
  asset: AssetFieldSchema.optional().default("USDC"),
  protocols: z.array(ProtocolSchema).min(2),
  timeframe: z.string().min(1).optional()
});

export const CompareMarketsInputSchema = CompareMarketsCoreSchema.superRefine(
  (value, ctx) => {
    try {
      resolveMetricId(value.metric);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (error as Error).message,
        path: ["metric"]
      });
    }
    try {
      AssetSymbolSchema.parse(value.asset.toUpperCase());
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (error as Error).message,
        path: ["asset"]
      });
    }
  }
);

export const ResearchBriefCoreSchema = z.object({
  question: z.string().min(1),
  protocols: z.array(ProtocolSchema).optional(),
  metric: MetricFieldSchema.optional().default("supply_apy"),
  asset: AssetFieldSchema.optional().default("USDC")
});

export const ResearchBriefInputSchema = ResearchBriefCoreSchema.superRefine(
  (value, ctx) => {
    try {
      resolveMetricId(value.metric);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (error as Error).message,
        path: ["metric"]
      });
    }
    try {
      AssetSymbolSchema.parse(value.asset.toUpperCase());
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (error as Error).message,
        path: ["asset"]
      });
    }
  }
);

/**
 * Core risk_scan input without transforms — its `.shape` is used for MCP
 * registration while RiskScanInputSchema (below) carries the validation
 * + asset normalization transform.
 */
export const RiskScanCoreSchema = z.object({
  protocols: z.array(ProtocolSchema).min(1),
  assets: z.array(AssetFieldSchema).optional(),
  asset: AssetFieldSchema.optional(),
  metric: MetricFieldSchema.optional().default("supply_apy"),
  window: z.string().min(1)
});

export const RiskScanInputSchema = RiskScanCoreSchema.superRefine(
  (value, ctx) => {
    try {
      resolveMetricId(value.metric);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (error as Error).message,
        path: ["metric"]
      });
    }
  }
).transform((value) => {
  const assets = value.assets ?? (value.asset ? [value.asset] : ["USDC"]);
  return {
    ...value,
    assets: assets.map((asset) => AssetSymbolSchema.parse(asset.toUpperCase()))
  };
});

export async function compareMarkets(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<Comparison> {
  const input = CompareMarketsInputSchema.parse(rawInput);
  const { metricId } = resolveMetricId(input.metric);
  const observations = await dataSource.getObservations(
    metricId,
    input.protocols,
    input.asset
  );
  const comparison = compareObservations(observations, metricId);

  if (!input.timeframe) {
    return comparison;
  }

  return {
    ...comparison,
    caveats: [
      ...comparison.caveats,
      `The bootstrap metric is a current spot value; timeframe '${input.timeframe}' was not applied.`
    ]
  };
}

export interface ResearchBrief {
  conclusion: string;
  keyFigures: Array<{
    protocol: string;
    metric: string;
    value: number;
    unit: string;
    source: string;
  }>;
  asOf: string;
  risks: string[];
  suggestedFollowUp?: string;
}

export interface ResearchBriefResult {
  brief: ResearchBrief;
  sources: Comparison["sources"];
  caveats: string[];
}

export const ResearchBriefResultSchema = z.object({
  brief: z.object({
    conclusion: z.string().min(1),
    keyFigures: z
      .array(
        z.object({
          protocol: z.string(),
          metric: z.string(),
          value: z.number().finite(),
          unit: z.string(),
          source: z.string()
        })
      )
      .min(2),
    asOf: z.string().datetime(),
    risks: z.array(z.string()),
    suggestedFollowUp: z.string().optional()
  }),
  sources: z.array(ComparisonSourceSchema),
  caveats: z.array(z.string())
});

export async function researchBrief(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<ResearchBriefResult> {
  const input = ResearchBriefInputSchema.parse(rawInput);
  if (!input.protocols || input.protocols.length < 2) {
    throw new Error(
      "research_brief requires at least two protocols for a cited comparison"
    );
  }
  const { metricId } = resolveMetricId(input.metric);
  const comparison = await compareMarkets(
    { metric: metricId, asset: input.asset, protocols: input.protocols },
    dataSource
  );

  const metric = comparison.metric;
  const best = comparison.rows[0]!;
  const second = comparison.rows[1]!;
  const conclusion = `${best.protocol} leads ${second.protocol} on ${metric} (${comparison.asset} ${best.value}${best.unit === "usd" ? " USD" : "%"} vs ${second.value}${second.unit === "usd" ? " USD" : "%"}) as of ${comparison.asOf}.`;
  const risks =
    comparison.caveats.length > 0
      ? comparison.caveats
      : ["APY definitions may differ between protocols"];

  return {
    brief: {
      conclusion,
      keyFigures: comparison.rows.map((row) => ({
        protocol: row.protocol,
        metric,
        value: row.value,
        unit: row.unit,
        source: row.subgraphId
      })),
      asOf: comparison.asOf,
      risks,
      suggestedFollowUp: "Check if these rates have changed in the last 24 hours"
    },
    sources: comparison.sources,
    caveats: comparison.caveats
  };
}

export interface RiskFinding {
  protocol: string;
  metric: string;
  asset: string;
  note: string;
  value: number;
}

export interface RiskScanResult {
  findings: RiskFinding[];
  gaps: string[];
  asOf: string;
  sources: Comparison["sources"];
}

const RiskScanResultSchema = z.object({
  findings: z.array(
    z.object({
      protocol: z.string(),
      metric: z.string(),
      asset: z.string(),
      note: z.string(),
      value: z.number().finite()
    })
  ),
  gaps: z.array(z.string()),
  asOf: z.string().datetime(),
  sources: z.array(ComparisonSourceSchema)
});

export async function riskScan(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<RiskScanResult> {
  const input = RiskScanInputSchema.parse(rawInput);
  const protocols = input.protocols;
  if (protocols.length < 2) {
    throw new Error(
      "risk_scan requires at least two protocols for a peer-relative scan"
    );
  }
  const { metricId } = resolveMetricId(input.metric);

  const comparisons: Comparison[] = [];
  const gaps: string[] = [];
  for (const asset of input.assets) {
    try {
      const comparison = await compareMarkets(
        { metric: metricId, asset, protocols },
        dataSource
      );
      comparisons.push(comparison);
    } catch (error) {
      gaps.push(`${asset}: ${(error as Error).message}`);
    }
  }

  if (comparisons.length === 0) {
    throw new Error(
      `risk_scan found no comparable observations. Gaps: ${gaps.join("; ")}`
    );
  }

  const findings: RiskFinding[] = [];
  for (const comparison of comparisons) {
    const best = comparison.rows[0]!;
    const second = comparison.rows[1]!;
    const spread = Math.abs(best.value - second.value);
    findings.push({
      protocol: best.protocol,
      metric: comparison.metric,
      asset: comparison.asset,
      note: `Highest ${comparison.asset} ${comparison.metric} among scanned peers (${spread.toFixed(2)}${comparison.rows[0]!.unit === "usd" ? " USD" : "ppt"} spread over ${second.protocol}).`,
      value: best.value
    });
    findings.push({
      protocol: second.protocol,
      metric: comparison.metric,
      asset: comparison.asset,
      note: `Lower ${comparison.asset} ${comparison.metric} than ${best.protocol} by ${spread.toFixed(2)} ${comparison.rows[0]!.unit === "usd" ? "USD" : "percentage points"}.`,
      value: second.value
    });
  }

  const latest = comparisons.reduce(
    (latest, comparison) =>
      comparison.asOf > latest ? comparison.asOf : latest,
    comparisons[0]!.asOf
  );
  const sources = comparisons.flatMap((comparison) => comparison.sources);

  return {
    findings,
    gaps: [
      ...gaps,
      "No time-series data is available: risk_scan currently reflects a single spot snapshot. Peer-relative change over time is not assessed."
    ],
    asOf: latest,
    sources
  };
}
