import {
  AnalysisObjectiveSchema,
  AnalyzeMarketsResultSchema,
  AnalyzeTrendsResultSchema,
  AssetSymbolSchema,
  DiscoverYieldsResultSchema,
  LIVE_PROTOCOLS,
  TrendWindowSchema,
  analyzeMarketObservations,
  analyzeTrendSeries,
  compareObservations,
  ComparisonSourceSchema,
  resolveMetricId,
  normalizeYieldDiscovery,
  type Comparison,
  type AnalysisGap,
  type AnalyzeMarketsResult,
  type AnalyzeTrendsResult,
  type LiveDataSource,
  type MarketMetricId,
  type MarketDataSource,
  type DiscoverYieldsResult,
  type YieldDiscoveryGap,
  ProtocolSchema
} from "@askching/shared";
import { z } from "zod";

const UsdcOnlyFieldSchema = z.string().refine(
  value => value.toUpperCase() === "USDC",
  "discover_yields supports USDC only"
);
const EthereumMainnetFieldSchema = z.string().refine(
  value => value.toLowerCase() === "ethereum-mainnet",
  "discover_yields supports ethereum-mainnet only"
);
const StablecoinFieldSchema = z.string().refine(
  value => ["USDT", "DAI"].includes(value.toUpperCase()),
  "Stablecoin counterpart must be USDT or DAI"
);
const YieldVenueFieldSchema = z.enum(["lending", "uniswap-v3", "curve"]);

export const DiscoverYieldsCoreSchema = z.object({
  asset: UsdcOnlyFieldSchema.optional().default("USDC"),
  chain: EthereumMainnetFieldSchema.optional().default("ethereum-mainnet"),
  stablecoins: z.array(StablecoinFieldSchema).optional().default(["USDT", "DAI"]),
  venues: z.array(YieldVenueFieldSchema).optional().default(["lending", "uniswap-v3", "curve"]),
  minTvlUsd: z.number().finite().nonnegative().optional().default(1_000_000),
  limitPerCategory: z.number().int().min(1).max(20).optional().default(5)
});

export const DiscoverYieldsInputSchema = DiscoverYieldsCoreSchema.transform(value => ({
  asset: value.asset.toUpperCase() as "USDC",
  chain: value.chain.toLowerCase() as "ethereum-mainnet",
  stablecoins: [...new Set(value.stablecoins.map(stablecoin => stablecoin.toUpperCase() as "USDT" | "DAI"))],
  venues: [...new Set(value.venues)],
  minTvlUsd: value.minTvlUsd,
  limitPerCategory: value.limitPerCategory
}));

export async function discoverYields(
  rawInput: unknown,
  dataSource: MarketDataSource
): Promise<DiscoverYieldsResult> {
  const input = DiscoverYieldsInputSchema.parse(rawInput);
  const lendingObservations = [];
  const dexObservations = [];
  const gaps: YieldDiscoveryGap[] = [];

  if (input.venues.includes("lending")) {
    for (const metric of ["supply_apy", "utilization", "tvl"] as const) {
      try {
        lendingObservations.push(...await dataSource.getObservations(
          metric, LIVE_PROTOCOLS, input.asset
        ));
        captureLendingGaps(gaps, metric, dataSource);
      } catch {
        const before = gaps.length;
        captureLendingGaps(gaps, metric, dataSource);
        if (gaps.length === before) {
          gaps.push({ venue: "lending", reason: `Lending ${metric} data is unavailable.` });
        }
      }
    }
  }

  const dexVenues = input.venues.filter(
    (venue): venue is "uniswap-v3" | "curve" => venue !== "lending"
  );
  if (dexVenues.length > 0) {
    const results = await dataSource.getDexYieldOpportunities({
      venues: dexVenues,
      stablecoins: input.stablecoins
    });
    for (const result of results) {
      dexObservations.push(...result.observations);
      gaps.push(...result.gaps);
    }
  }

  return DiscoverYieldsResultSchema.parse(normalizeYieldDiscovery({
    lendingObservations,
    dexObservations,
    gaps,
    minTvlUsd: input.minTvlUsd,
    limitPerCategory: input.limitPerCategory,
    now: new Date()
  }));
}

function captureLendingGaps(
  gaps: YieldDiscoveryGap[],
  metric: MarketMetricId,
  dataSource: MarketDataSource
): void {
  const liveGaps = [...((dataSource as Partial<LiveDataSource>).lastGaps ?? [])];
  for (const entry of liveGaps) {
    const protocol = entry.split(": ", 1)[0];
    gaps.push({
      venue: "lending",
      reason: `${protocol || "A lending source"} did not return ${metric}.`
    });
  }
}

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

// ── get_info (v1.0) ────────────────────────────────────────────────────
// Static self-description tool: tells any client what AskChing is, lists the
// six research tools, and gives a copy-paste example per tool. No data source
// required, so it works even when Graph credentials are absent.

export const GetInfoInputSchema = z
  .object({
    topic: z
      .enum(["overview", "tools", "examples", "all"])
      .optional()
      .default("all")
  })
  .describe("Which part of the AskChing self-description to return.");

export interface AskChingInfo {
  name: string;
  tagline: string;
  description: string;
  evidenceModel: string[];
  tools: Array<{ name: string; purpose: string; example: string }>;
  transports: string[];
  liveSources: string[];
}

export const AskChingInfoSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  evidenceModel: z.array(z.string()),
  tools: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      example: z.string()
    })
  ),
  transports: z.array(z.string()),
  liveSources: z.array(z.string())
});

const ASKCHING_INFO: AskChingInfo = {
  name: "askching",
  tagline: "Cited DeFi research over The Graph — as a remote MCP server.",
  description:
    "AskChing answers natural-language DeFi questions across multiple live The Graph subgraphs and returns every number with its provenance. If it cannot cite at least two sources, it refuses to answer.",
  evidenceModel: [
    "Every observation carries subgraph ID, block, timestamp, and query hash.",
    "Quantitative comparisons require at least two distinct cited subgraph sources.",
    "Fewer than two cited sources fails closed: AskChing refuses rather than hallucinates.",
    "Historical windows requested from spot-only tools surface as explicit gaps."
  ],
  tools: [
    {
      name: "compare_markets",
      purpose: "Ranked cross-protocol comparison of a spot metric (supply_apy, borrow_apy, tvl, utilization).",
      example: "Compare live USDC supply APY across Aave V3, Compound V3, and Spark Lend right now. Rank the results, cite each source, and state the as-of time."
    },
    {
      name: "analyze_markets",
      purpose: "Transparent yield-opportunity, liquidity-stress, or evidence-quality analysis with calculations and confidence.",
      example: "Analyze the best current USDC supply-yield opportunity across Aave V3, Compound V3, and Spark Lend. Show the APY spread calculation, utilization context, and citations."
    },
    {
      name: "analyze_trends",
      purpose: "Cited 7d / 30d daily history: change, least-squares slope, direction, volatility, min/max.",
      example: "How has USDC supply APY trended across Aave V3, Compound V3, and Spark Lend over the last seven days? Cite every data point."
    },
    {
      name: "research_brief",
      purpose: "Structured cited brief: conclusion, key figures with sources, risks, and a suggested follow-up.",
      example: "Prepare a research brief on USDC supply APY across Aave V3, Compound V3, and Spark Lend."
    },
    {
      name: "risk_scan",
      purpose: "Peer-relative spot risk signals and explicit data gaps across protocols.",
      example: "Scan Aave V3, Compound V3, and Spark Lend for unusual USDC risk signals and note any data gaps."
    },
    {
      name: "discover_yields",
      purpose: "Cross-venue USDC yield discovery: separate lending and DEX LP (Uniswap V3, Curve) rankings with formula inputs and risks.",
      example: "Where can I earn yield on USDC across lending, Uniswap V3, and Curve? Keep lending and LP rankings separate and do not propose a transaction."
    }
  ],
  transports: ["stdio", "Streamable HTTP"],
  liveSources: ["aave-v3", "compound-v3", "spark-lend", "aave-v2", "uniswap-v3 (DEX)", "curve (DEX)"]
};

export function getInfo(rawInput: unknown): AskChingInfo {
  const input = GetInfoInputSchema.parse(rawInput);
  if (input.topic === "overview") {
    return {
      ...ASKCHING_INFO,
      tools: [],
      transports: [],
      liveSources: []
    };
  }
  if (input.topic === "tools") {
    return {
      ...ASKCHING_INFO,
      tools: ASKCHING_INFO.tools.map(({ name, purpose }) => ({ name, purpose, example: "" })),
      description: "",
      evidenceModel: [],
      transports: [],
      liveSources: []
    };
  }
  if (input.topic === "examples") {
    return {
      ...ASKCHING_INFO,
      tools: ASKCHING_INFO.tools.map(({ name, example }) => ({ name, purpose: "", example })),
      description: "",
      evidenceModel: [],
      transports: [],
      liveSources: []
    };
  }
  return ASKCHING_INFO;
}
