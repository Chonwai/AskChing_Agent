import {
  AnalysisObjectiveSchema,
  AnalyzeMarketsResultSchema,
  AnalyzeTrendsResultSchema,
  AssetSymbolSchema,
  TrendWindowSchema,
  analyzeMarketObservations,
  analyzeTrendSeries,
  compareObservations,
  ComparisonSourceSchema,
  resolveMetricId,
  type Comparison,
  type AnalysisGap,
  type AnalyzeMarketsResult,
  type AnalyzeTrendsResult,
  type LiveDataSource,
  type MarketMetricId,
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

const DEFAULT_ANALYSIS_METRICS = {
  yield_opportunity: ["supply_apy", "utilization"],
  liquidity_stress: ["utilization", "tvl"],
  evidence_quality: ["supply_apy", "borrow_apy", "tvl", "utilization"]
} as const satisfies Record<z.infer<typeof AnalysisObjectiveSchema>, readonly MarketMetricId[]>;

export const AnalyzeMarketsCoreSchema = z.object({
  objective: AnalysisObjectiveSchema,
  protocols: z.array(ProtocolSchema).min(2),
  asset: AssetFieldSchema.optional().default("USDC"),
  metrics: z.array(MetricFieldSchema).min(1).optional(),
  timeframe: z.string().min(1).optional()
});

export const AnalyzeMarketsInputSchema = AnalyzeMarketsCoreSchema
  .transform((value) => ({
    ...value,
    asset: AssetSymbolSchema.parse(value.asset.toUpperCase()),
    metrics: (value.metrics ?? DEFAULT_ANALYSIS_METRICS[value.objective]).map(
      metric => resolveMetricId(metric).metricId
    )
  }))
  .superRefine((value, ctx) => {
    const required = value.objective === "yield_opportunity"
      ? "supply_apy"
      : value.objective === "liquidity_stress"
        ? "utilization"
        : undefined;
    if (required && !value.metrics.includes(required)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metrics"],
        message: `${value.objective} requires ${required}`
      });
    }
  });

export async function analyzeMarkets(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<AnalyzeMarketsResult> {
  const input = AnalyzeMarketsInputSchema.parse(rawInput);
  const observations = [];
  const gaps: AnalysisGap[] = [];

  for (const metric of input.metrics) {
    try {
      const values = await dataSource.getObservations(
        metric,
        input.protocols,
        input.asset
      );
      observations.push(...values);
      addLiveGaps(gaps, metric, dataSource);

      const covered = new Set(values.map(value => value.protocol));
      for (const protocol of input.protocols) {
        const alreadyExplained = gaps.some(
          gap => gap.metric === metric && gap.protocol === protocol
        );
        if (!covered.has(protocol) && !alreadyExplained) {
          gaps.push({
            metric,
            protocol,
            reason: `No ${input.asset} ${metric} observation returned for ${protocol}.`
          });
        }
      }
    } catch (error) {
      const before = gaps.length;
      addLiveGaps(gaps, metric, dataSource);
      if (gaps.length === before) {
        gaps.push({ metric, reason: (error as Error).message });
      }
    }
  }

  return AnalyzeMarketsResultSchema.parse(analyzeMarketObservations({
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    observations,
    gaps: dedupeAnalysisGaps(gaps),
    timeframe: input.timeframe
  }));
}

function addLiveGaps(
  gaps: AnalysisGap[],
  metric: MarketMetricId,
  dataSource: MarketDataSource
): void {
  const liveGaps = [...((dataSource as Partial<LiveDataSource>).lastGaps ?? [])];
  for (const entry of liveGaps) {
    const separator = entry.indexOf(": ");
    gaps.push(separator === -1
      ? { metric, reason: entry }
      : {
          metric,
          protocol: ProtocolSchema.parse(entry.slice(0, separator)),
          reason: entry.slice(separator + 2)
        });
  }
}

function dedupeAnalysisGaps(gaps: AnalysisGap[]): AnalysisGap[] {
  const seen = new Set<string>();
  return gaps.filter(gap => {
    const key = `${gap.metric ?? ""}|${gap.protocol ?? ""}|${gap.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── analyze_trends (v1.1) ──────────────────────────────────────────
export const AnalyzeTrendsCoreSchema = z.object({
  metric: MetricFieldSchema,
  asset: AssetFieldSchema.optional().default("USDC"),
  protocols: z.array(ProtocolSchema).min(2),
  window: TrendWindowSchema
});

export const AnalyzeTrendsInputSchema = AnalyzeTrendsCoreSchema.transform(
  (value) => ({
    ...value,
    asset: AssetSymbolSchema.parse(value.asset.toUpperCase()),
    metric: resolveMetricId(value.metric).metricId
  })
);

/**
 * Time-series counterpart of `analyzeMarkets`: fetch cited history, turn
 * coverage holes into explicit gaps, and let the analysis layer fail closed
 * when fewer than two distinct cited series survive.
 */
export async function analyzeTrends(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<AnalyzeTrendsResult> {
  const input = AnalyzeTrendsInputSchema.parse(rawInput);
  const gaps: AnalysisGap[] = [];

  const series = await dataSource.getHistory(
    input.metric,
    input.window,
    input.protocols,
    input.asset
  );
  addLiveGaps(gaps, input.metric, dataSource);

  const covered = new Set(series.map(item => item.protocol));
  for (const protocol of input.protocols) {
    const alreadyExplained = gaps.some(
      gap => gap.metric === input.metric && gap.protocol === protocol
    );
    if (!covered.has(protocol) && !alreadyExplained) {
      gaps.push({
        metric: input.metric,
        protocol,
        reason: `No ${input.asset} ${input.metric} history returned for ${protocol}.`
      });
    }
  }

  return AnalyzeTrendsResultSchema.parse(analyzeTrendSeries({
    metric: input.metric,
    asset: input.asset,
    protocols: input.protocols,
    window: input.window,
    series,
    gaps: dedupeAnalysisGaps(gaps)
  }));
}

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

export interface RiskGap {
  asset: string;
  protocol: string;
  reason: string;
}

export interface RiskScanResult {
  findings: RiskFinding[];
  gaps: RiskGap[];
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
  gaps: z.array(
    z.object({
      asset: z.string(),
      protocol: z.string(),
      reason: z.string()
    })
  ),
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
  const gaps: RiskGap[] = [];
  for (const asset of input.assets) {
    try {
      const comparison = await compareMarkets(
        { metric: metricId, asset, protocols },
        dataSource
      );
      comparisons.push(comparison);
    } catch (error) {
      const message = (error as Error).message;
      // Attribute the failure per-protocol when the live source recorded
      // individual gaps (e.g. "aave-v3: No USDC market found ...").
      const liveGaps = (dataSource as Partial<LiveDataSource>).lastGaps;
      if (liveGaps && liveGaps.length > 0) {
        for (const entry of liveGaps) {
          const separator = entry.indexOf(": ");
          gaps.push(
            separator === -1
              ? { asset, protocol: "unknown", reason: entry }
              : {
                  asset,
                  protocol: entry.slice(0, separator),
                  reason: entry.slice(separator + 2)
                }
          );
        }
      } else {
        gaps.push({
          asset,
          protocol: protocols.join(","),
          reason: message
        });
      }
    }
  }

  if (comparisons.length === 0) {
    throw new Error(
      `risk_scan found no comparable observations. Gaps: ${gaps.map((gap) => `${gap.asset}/${gap.protocol}: ${gap.reason}`).join("; ")}`
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
      {
        asset: input.assets.join(","),
        protocol: protocols.join(","),
        reason:
          "No time-series data is available: risk_scan currently reflects a single spot snapshot. Peer-relative change over time is not assessed."
      }
    ],
    asOf: latest,
    sources
  };
}
