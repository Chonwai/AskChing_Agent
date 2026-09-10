import {
  AnalyzeMarketsResultSchema,
  MarketObservationSchema,
  type AnalysisCitation,
  type AnalysisConfidence,
  type AnalysisGap,
  type AnalysisObjective,
  type AnalyzeMarketsResult,
  type AssetSymbol,
  type MarketMetricId,
  type MarketObservation
} from "./schemas.js";

export interface AnalyzeObservationInput {
  objective: AnalysisObjective;
  asset: AssetSymbol;
  protocols: string[];
  metrics: MarketMetricId[];
  observations: MarketObservation[];
  gaps: AnalysisGap[];
  timeframe?: string;
}

export function analyzeMarketObservations(
  input: AnalyzeObservationInput
): AnalyzeMarketsResult {
  const observations = input.observations.map(item => MarketObservationSchema.parse(item));
  for (const item of observations) {
    if (
      item.asset !== input.asset ||
      !input.protocols.includes(item.protocol) ||
      !input.metrics.includes(item.metric)
    ) {
      throw new Error("Mixed or unexpected observation in analysis input");
    }
  }

  if (input.objective === "liquidity_stress") {
    return analyzeLiquidityStress(input, observations);
  }
  if (input.objective === "evidence_quality") {
    return analyzeEvidenceQuality(input, observations);
  }

  const supply = comparable(
    observations.filter(item => item.metric === "supply_apy"),
    "supply_apy"
  );
  const ranked = [...supply].sort(
    (a, b) => b.value - a.value || a.protocol.localeCompare(b.protocol)
  );
  const leader = ranked[0]!;
  const runnerUp = ranked[1]!;
  const spread = leader.value - runnerUp.value;
  const utilization = observations.find(
    item => item.metric === "utilization" && item.protocol === leader.protocol
  );
  const supportingValues = utilization ? [...ranked, utilization] : ranked;
  const citations = dedupeCitations(supportingValues);
  const latest = latestTimestamp(supportingValues);
  const confidence = determineConfidence(ranked, input.gaps);
  const result: AnalyzeMarketsResult = {
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${leader.protocol} has the highest current ${input.asset} supply APY among the analyzed peers.`,
    findings: [
      {
        severity: "info",
        claim: `${leader.protocol} leads current ${input.asset} supply APY at ${leader.value}%, ahead of ${runnerUp.protocol} at ${runnerUp.value}%.`,
        calculation: `${leader.value} - ${runnerUp.value} = ${spread.toFixed(2)} percentage points`,
        supportingValues,
        citations,
        confidence,
        caveats: [
          "Spot APY is not a forecast or financial recommendation.",
          ...(utilization
            ? [`Leader utilization context: ${utilization.value}%.`]
            : ["No comparable utilization context was available for the leader."])
        ]
      }
    ],
    gaps: withTimeframeGap(input),
    asOf: latest
  };
  return AnalyzeMarketsResultSchema.parse(result);
}

function analyzeLiquidityStress(
  input: AnalyzeObservationInput,
  observations: MarketObservation[]
): AnalyzeMarketsResult {
  const utilization = comparable(
    observations.filter(item => item.metric === "utilization"),
    "utilization"
  ).sort((a, b) => b.value - a.value || a.protocol.localeCompare(b.protocol));
  const context = observations.filter(item => item.metric === "tvl");
  const confidence = determineConfidence(utilization, input.gaps);
  const findings = utilization.map((item, index) => {
    const severity = item.value > 90 ? "high" as const : item.value >= 80 ? "watch" as const : "info" as const;
    const band = severity === "high" ? "above the 90% high threshold" : severity === "watch" ? "within the 80–90% watch band" : "below the 80% watch threshold";
    const tvl = context.find(value => value.protocol === item.protocol);
    const supportingValues = tvl ? [item, tvl] : [item];
    return {
      severity,
      claim: `${item.protocol} is rank ${index + 1} of ${utilization.length} by current ${input.asset} utilization at ${item.value}%.`,
      calculation: `${item.value}% utilization; rank ${index + 1} of ${utilization.length}; ${band}`,
      supportingValues,
      citations: dedupeCitations([...utilization, ...(tvl ? [tvl] : [])]),
      confidence,
      caveats: [
        "Utilization is a spot heuristic signal, not a liquidation or solvency assessment.",
        ...(tvl ? [`TVL of ${tvl.value} USD is scale context, not available liquidity.`] : [])
      ]
    };
  });
  return AnalyzeMarketsResultSchema.parse({
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${utilization[0]!.protocol} has the highest current ${input.asset} utilization among the analyzed peers.`,
    findings,
    gaps: withTimeframeGap(input),
    asOf: latestTimestamp([...utilization, ...context])
  });
}

function analyzeEvidenceQuality(
  input: AnalyzeObservationInput,
  observations: MarketObservation[]
): AnalyzeMarketsResult {
  const citations = dedupeCitations(observations);
  const sourceCount = new Set(observations.map(item => item.subgraphId)).size;
  if (sourceCount < 2) {
    throw new Error("Need at least 2 cited sources for evidence_quality");
  }
  const expected = input.protocols.length * input.metrics.length;
  const covered = new Set(
    observations.map(item => `${item.protocol}|${item.metric}`)
  ).size;
  const timestamps = observations.map(item => Date.parse(item.timestamp));
  const skewMs = Math.max(...timestamps) - Math.min(...timestamps);
  const confidence: AnalysisConfidence =
    sourceCount >= 3 && input.gaps.length === 0 && skewMs <= 10 * 60 * 1000
      ? "high"
      : covered / expected < 0.5
        ? "low"
        : "medium";
  return AnalyzeMarketsResultSchema.parse({
    objective: input.objective,
    asset: input.asset,
    protocols: input.protocols,
    metrics: input.metrics,
    summary: `${covered} of ${expected} requested protocol-metric observations are supported by ${sourceCount} cited sources.`,
    findings: [
      {
        severity: confidence === "low" ? "watch" : "info",
        claim: `Evidence coverage is ${covered}/${expected} across ${sourceCount} distinct cited sources.`,
        calculation: `${covered}/${expected} protocol-metric observations; ${sourceCount} distinct sources; ${Math.round(skewMs / 1000)} seconds timestamp skew`,
        supportingValues: observations,
        citations,
        confidence,
        caveats: [
          "Evidence quality describes coverage and recency, not protocol safety."
        ]
      }
    ],
    gaps: withTimeframeGap(input),
    asOf: latestTimestamp(observations)
  });
}

function comparable(
  observations: MarketObservation[],
  metric: MarketMetricId
): MarketObservation[] {
  const valid = observations.filter(item => item.metric === metric);
  const sources = new Set(valid.map(item => item.subgraphId));
  if (valid.length < 2 || sources.size < 2) {
    throw new Error(`Need at least 2 cited sources for ${metric}`);
  }
  const first = valid[0]!;
  if (
    valid.some(
      item =>
        item.asset !== first.asset ||
        item.unit !== first.unit ||
        item.rateType !== first.rateType
    )
  ) {
    throw new Error(`Cannot compare mixed definitions for ${metric}`);
  }
  return valid;
}

function dedupeCitations(values: MarketObservation[]): AnalysisCitation[] {
  const seen = new Set<string>();
  return values.flatMap(item => {
    const key = [item.metric, item.protocol, item.asset, item.subgraphId, item.timestamp, item.queryHash].join("|");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      metric: item.metric,
      protocol: item.protocol,
      asset: item.asset,
      subgraphId: item.subgraphId,
      deploymentId: item.deploymentId,
      block: item.block,
      timestamp: item.timestamp,
      queryHash: item.queryHash
    }];
  });
}

function latestTimestamp(values: MarketObservation[]): string {
  return values.reduce(
    (latest, item) => item.timestamp > latest ? item.timestamp : latest,
    values[0]!.timestamp
  );
}

function determineConfidence(
  values: MarketObservation[],
  gaps: AnalysisGap[]
): AnalysisConfidence {
  const timestamps = values.map(item => Date.parse(item.timestamp));
  const skew = Math.max(...timestamps) - Math.min(...timestamps);
  return new Set(values.map(item => item.subgraphId)).size >= 3 &&
    gaps.length === 0 &&
    skew <= 10 * 60 * 1000
    ? "high"
    : "medium";
}

function withTimeframeGap(input: AnalyzeObservationInput): AnalysisGap[] {
  return input.timeframe
    ? [
        ...input.gaps,
        {
          reason: `Requested timeframe '${input.timeframe}' was not applied; analysis is spot-only.`
        }
      ]
    : [...input.gaps];
}
